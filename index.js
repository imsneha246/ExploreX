const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const app = express();
const config = require('./config.json');
const port = config.port;
const { QuickDB } = require('quick.db');
const db = new QuickDB({ filePath: './database.sqlite' });
const nodemailer = require('nodemailer');
const searchImage = require('g-i-s');
const fs = require('fs');
const Weather = require("@tinoschroeter/weather-js");
const weather = new Weather();
const { G4F } = require('g4f');
const g4f = new G4F();


let transporter2 = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: config.emailUser,
        pass: config.emailPass
    },
    tls: {
        rejectUnauthorized: false
    }
});


app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: config.session_secret,
    resave: true,
    saveUninitialized: true
}));
app.set('view engine', 'ejs');
app.set('views', './views');
app.setMaxListeners(0);


app.use((req, res, next) => {
    if (req.session.loggedIn) {
        res.locals.name = req.session.name;
        res.locals.loggedIn = req.session.loggedIn;
    }
    next();
});


app.get('/', (req, res) => {
    res.redirect('/home');
});

app.get('/home', (req, res) => {
    res.render('home', { req: req, error: false });
});


app.get('/about', (req, res) => {
    res.render('aboutus', { req: req, error: false });
})


app.get('/contact', (req, res) => {
    res.render('contact', { req: req, error: false });
})


app.get('/auth', (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect('/');
    }
    res.render('login-signup', { req: req, error: false });
});


app.get('/me', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/');
    }
    let email = req.session.email;
    email = email.replace(/\./g, '_');
    let saved = await db.get(`saved.${email}`) || [];
    res.render('account', { req: req, error: false, saved: saved });
});


app.post('/me/verifymail', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/');
    }
    let email = req.session.email;
    let code = req.body.code;
    email = email.replace(/\./g, '_');
    let saved = await db.get(`saved.${email}`) || [];
  
    let emailChk = db.get(`accounts.${email}`);
    if (!emailChk) {
        return res.render('account', { req: req, error: "Email does not exist! Please Signup Instead", saved: saved });
    }
    
    let emailVerified = await db.get(`accounts.${email}.verified`);
    if (emailVerified) {
        return res.render('account', { req: req, error: "Email is already verified!", saved: saved });
    }
  
    let emailCode = await db.get(`verification.${code}`);
    if (!emailCode) {
        return res.render('account', { req: req, error: "Invalid Code!", saved: saved });
    }

    email = email.replace(/\_/g, '.')
    if (emailCode !== email) {
        return res.render('account', { req: req, error: "Code Email Mismatch!", saved: saved });
    }
    email = email.replace(/\./g, '_')
   
    await db.set(`accounts.${email}.verified`, true);
    await db.delete(`verification.${code}`);
   
    req.session.verifiedMail = true;
    res.render('account', { req: req, error: "Email Verified Successfully!", saved: saved });
});


app.post('/auth/verify_email', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/auth');
    }
    let email = req.session.email;
    email = email.replace(/\./g, '_');
    let saved = await db.get(`saved.${email}`) || [];

    let emailChk = await db.get(`accounts.${email}`);
    if (!emailChk) {
        return res.render('account', { req: req, error: "Email does not exist! Please Signup Instead", saved: saved });
    }
    
    let emailVerified = await db.get(`accounts.${email}.verified`);
    if (emailVerified) {
        return res.render('account', { req: req, error: "Email is already verified!", saved: saved });
    }
   
    let oldCodes = await db.get(`verification`);
    email = email.replace(/\_/g, '.')
    for (let code in oldCodes) {
        if (oldCodes[code] === email) {
            await db.delete(`verification.${code}`);
        }
    }
  
    let code = await generateCode();
    
    await sendVerificationEmail(email, code);
    await db.set(`verification.${code}`, email);
    res.render('account', { req: req, error: "Verification Email Sent!", saved: saved });
});


app.post('/auth/login', async (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect('/');
    }
    let email = req.body.email;
    let password = req.body.pass;
  
    email = email.toLowerCase();
    email = email.replace(/\./g, '_');
  
    let emailChk = await db.get(`accounts.${email}`);
    if (!emailChk) {
        return res.render('login-signup', { req: req, error: "Email does not exist! Please Signup Instead" });
    }
 
    let emailPass = Buffer.from(emailChk.password, 'base64').toString();
 
    if (emailPass !== password) {
        return res.render('login-signup', { req: req, error: "Invalid Password" });
    }
 
    let firstName = emailChk.fullName.split(' ')[0];
    req.session.email = email.replace(/\_/g, '.');
    req.session.name = firstName;
    req.session.loggedIn = true;
    req.session.verifiedMail = emailChk.verified;
  
    res.redirect('/');
});


app.get('/itinerary', (req, res) => {
    let loggedIn = req.session.loggedIn;
    if (!loggedIn) {
        return res.redirect('/auth');
    }
    let old = false;
    res.render('itinerary', { itinerary: false, req: req, error: false, generated: false, weather: false, old: old });
});

app.post('/itinerary', async (req, res) => {
    let body = req.body;
    let regen = req.body.regenerated || false;
    let old = regen ? req.body.itinerary : false;
    if (regen) {
        body = body.oldBody;
        body = `${body.replace(/&#34;/g, '"')}`;
        body = JSON.parse(body);
    
        if (old) {
            old = `${old.replace(/&amp;#34;/g, '"')}`;
            old = JSON.parse(old);
            old = old.itinerary;
        }
        console.log(old);
    }
    let days = body.days;
    let city = body.city;
    let country = body.country;
    let currency = body.currency;
    let place = `${city}, ${country}.`;
    let members = body.members;
    let budget = body.budget;
    let detailed = body.detailed || false;
   
    if (members < 1) {
        return res.render('itinerary', { itinerary: false, req: req, error: "Invalid Number of Members", generated: false, weather: false, old: old });
    } else if (days < 1) {
        return res.render('itinerary', { itinerary: false, req: req, error: "Invalid Number of Days", generated: false, weather: false, old: old });
    } else if (budget < 1) {
        return res.render('itinerary', { itinerary: false, req: req, error: "Invalid Budget", generated: false, weather: false, old: old });
    } else if (!city || !country || !currency) {
        return res.render('itinerary', { itinerary: false, req: req, error: "Invalid Place", generated: false, weather: false, old: old });
    }

    let validCurrency = await checkCurrency(currency);
    if (!validCurrency) {
        return res.render('itinerary', { itinerary: false, req: req, error: "Invalid Currency", generated: false, weather: false, old: old });
    }
  
    let cost = `${budget} ${currency}`;
    let generated = await generateItinerary(days, place, members, cost);
    if (generated === "Error") {
        return res.render('itinerary', { itinerary: false, req: req, error: "There was an error generating the itinerary, please try again later", generated: false, weather: false, old: old });
    } else if (generated === "Rate limit exceeded") {
        return res.render('itinerary', { itinerary: false, req: req, error: "Server Busy! Please Try Again in a Few Minutes", generated: false, weather: false, old: old });
    } else if (!generated) {
        return res.render('itinerary', { itinerary: false, req: req, error: "Error Generating Itinerary...", generated: false, weather: false, old: old });
    }
 
    try {
        generated = JSON.parse(generated);
    } catch (err) {
        console.log(generated);
        return res.render('itinerary', { itinerary: false, req: req, error: "Error Generating Itinerary", generated: false, weather: false, old: old });
    }
    let itinerary = generated.itinerary;
   
    for (let i = 0; i < itinerary.length; i++) {
        let activities = itinerary[i].activities;
        let accomodations = itinerary[i].accommodations;
        let restaurants = itinerary[i].restaurants;
        for (let j = 0; j < accomodations.length; j++) {
            let name = accomodations[j].name;
            let image = await searchImageByQuery(name);
            itinerary[i].accommodations[j].image = image;
        }
        for (let k = 0; k < restaurants.length; k++) {
            let name = restaurants[k].name;
            let image = await searchImageByQuery(name);
            itinerary[i].restaurants[k].image = image;
        }
        for (let l = 0; l < activities.length; l++) {
            let name = activities[l];
            let image = await searchImageByQuery(name);
            itinerary[i].activities[l] = { name, image };
        }
    }

    let w = await getWeatherData(city, country);
    let weather_return = false;
    if (w === "Error") {
        weather_return = false;
    } else if (!w) {
        weather_return = false;
    } else {
        weather_return = w;
    }
 
    if (detailed) {
        res.render('itinerary', { old: old, itinerary: itinerary, req: req, error: false, weather: weather_return, generated: true });
    } else {
        req.body.city = city;
        req.body.country = country;
        res.render('compactview', { old: old, itinerary: itinerary, req: req, error: false, weather: weather_return, generated: true });
    }
});


app.post('/itinerary/details', async (req, res) => {
    let itinerary = req.body.itinerary;
    itinerary = `${itinerary.replace(/&#34;/g, '"')}`;
    itinerary = JSON.parse(itinerary);
    let old = req.body.old || false;
    if (old) {
        old = `${old.replace(/&#34;/g, '"')}`;
        old = JSON.parse(old);
    }
 
    let city = req.body.city;
    let country = req.body.country;
    let w = await getWeatherData(city, country);
    let weather_return = false;
    if (w === "Error") {
        weather_return = false;
    } else if (!w) {
        weather_return = false;
    } else {
        weather_return = w;
    }

    res.render('itinerary', { old: old, itinerary: itinerary, req: req, error: false, weather: weather_return, generated: true });
});


app.post('/itinerary/save', async (req, res) => {
    let itinerary = req.body.itinerary;
    let name = req.body.itineraryName;
    let old = req.body.old || false;
    if (!name || !itinerary || name.length > 20) {
        return res.status(400).send("Invalid Request");
    }
    let email = req.session.email;
    let loggedIn = req.session.loggedIn;
    if (!loggedIn) {
        return res.render('itinerary', { itinerary: false, req: req, error: "Please Login to Save an Itinerary", generated: false, weather: false, old: old })
    }
   
    email = email.replace(/\./g, '_');
    let emailChk = await db.get(`accounts.${email}`);
    if (!emailChk.verified) {
        return res.render('itinerary', { itinerary: false, req: req, error: "Please Verify Your Email to Save an Itinerary", generated: false, weather: false, old: old });
    }
    let saved = await db.get(`saved.${email}`) || [];
    let count = saved.length;
   
    for (let i = 0; i < saved.length; i++) {
        if (saved[i].name === name) {
            return res.render('itinerary', { itinerary: false, req: req, error: "Itinerary Name Already Exists", generated: false, weather: false, old: old });
        }
    }
   
    let file = `./storage/${email}_${count}.txt`;
    fs.writeFileSync(file, itinerary, 'utf8');
    saved.push({ name, file });
    await db.set(`saved.${email}`, saved);
    res.render('account', { req: req, error: "Itinerary Saved Succesfully!", saved: saved });
});


app.get('/itinerary/load', async (req, res) => {
    let name = req.query.name;
    let email = req.session.email;
    let loggedIn = req.session.loggedIn;
    let old = req.body.old || false;
    if (!loggedIn) {
        return res.redirect('/auth');
    }
    email = email.replace(/\./g, '_');
    let saved = await db.get(`saved.${email}`) || [];
    let file = false;
    for (let i = 0; i < saved.length; i++) {
        if (saved[i].name === name) {
            file = saved[i].file;
            break;
        }
    }
    if (!file) {
        return res.render('itinerary', { itinerary: false, req: req, error: "Itinerary Not Found", generated: false, weather: false, old: old });
    }
 
    let itinerary
    try {
        itinerary = fs.readFileSync(file, 'utf8');
    } catch (err) {
        console.log(err);
        return res.render('itinerary', { itinerary: false, req: req, error: "Error Loading Itinerary", generated: false, weather: false, old: old });
    }
    let decodedString = itinerary.replace(/&#39;/g, "'");
    itinerary = JSON.parse(decodedString);
   
    itinerary = itinerary.itinerary;
    res.render('itinerary', { itinerary: itinerary, req: req, error: false, weather: false, generated: false, old: old });
});


app.post('/itinerary/delete', async (req, res) => {
    let name = req.body.name;
    let email = req.session.email;
    let loggedIn = req.session.loggedIn;
    if (!loggedIn) {
        return res.redirect('/auth');
    }
    email = email.replace(/\./g, '_');
    let saved = await db.get(`saved.${email}`) || [];
    let file = false;
    for (let i = 0; i < saved.length; i++) {
        if (saved[i].name === name) {
            file = saved[i].file;
            saved.splice(i, 1);
            break;
        }
    }
    if (!file) {
        return res.sendStatus(403).send("Itinerary Not Found");
    }
   
    fs.unlinkSync(file)
    await db.set(`saved.${email}`, saved);
    res.redirect('/me');
});


app.post('/auth/signup', async (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect('/');
    }
    let email = req.body.email;
    let fullName = req.body.name;
    let password = req.body.pass;
    let confirmPassword = req.body.confirmPass;
    if (password !== confirmPassword) {
        return res.render('login-signup', { req: req, error: "Passwords do not match" });
    }
   
    email = email.toLowerCase();
    email = email.replace(/\./g, '_');
  
    let emailChk = await db.get(email);
    if (emailChk) {
        return res.render('login-signup', { req: req, error: "Email already exists! Please Login Instead" });
    }
   
    password = Buffer.from(password).toString('base64');
    let verified = false;
  
    await db.set(`accounts.${email}`, { fullName, password, verified });
 
    let code = await generateCode();
    email = email.replace(/\_/g, '.')
 
    await sendVerificationEmail(email, code);
    await db.set(`verification.${code}`, email);

    res.render('login-signup', { req: req, error: "Account Created Successfully! Please Login" });
});


app.get('/auth/logout', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/');
    }
    req.session.destroy();
    res.redirect('/');
});


app.use((req, res) => {
    res.status(404).sendFile(__dirname + '/public/404.html');
});


app.listen(port, () => {
    let host = config.domain;
    console.log(`Server started on ${host}:${port}`);
});


async function sendVerificationEmail(email, code) {
    let mailOptions = {
        from: config.emailSender,
        to: email,
        subject: "Email Verification",
      
        html: `
        <style>
            .container {
                width: 100%;
                text-align: center;
            }
            .button {
                background-color: #4CAF50;
                border: none;
                color: white;
                padding: 15px 32px;
                text-align: center;
                text-decoration: none;
                display: inline-block;
                font-size: 16px;
                margin: 4px 2px;
                cursor: pointer;
            }
            .code {
                font-size: 20px;
            }
            .codeblock {
                background-color: #f2f2f2;
                padding: 10px;
                border-radius: 5px;
            }
        </style>
        <div class="container">
            <h1>Email Verification</h1>
            <p class="code"> Your verification code is: <b class="codeblock">${code}</b></p>
            <p>Please click the button below to verify your email</p>
            <a href="${config.domain}/me" class="button">Verify Email</a>
        </div>
        `
    };
    try {
        await transporter2.sendMail(mailOptions);
    } catch (err) {
        console.log(err);
    }
}


async function generateCode() {
 
    let code = Math.random().toString(36).substring(2, 8);
   
    code = code.toUpperCase();
    
    let check = await db.get(`verification.${code}`);
    if (check) {
        let newCode = await generateCode();
        return newCode;
    } else {
        return code;
    }
}


async function searchImageByQuery(query) {
    let si = false;
    si = await new Promise((resolve, reject) => {
        searchImage(query, async (err, results) => {
            if (err) {
                reject(err);
            } else {
                if (results.length < 1 || !results[0].url) {
                    resolve("https://www.thermaxglobal.com/wp-content/uploads/2020/05/image-not-found.jpg");
                }
                try {
                    resolve(results[0].url);
                } catch (err) {
                    resolve("https://www.thermaxglobal.com/wp-content/uploads/2020/05/image-not-found.jpg");
                }
            }
        });
    });
    return si;
}


async function getWeatherData(city, country) {
    let place = `${city}, ${country}`;
    let www = false;
    let weatherData;
    try {
        weatherData = await weather.find({
            search: place,
            degreeType: "C",
        });
    } catch (err) {
        console.log(err);
        return "Error";
    }
    www = {
        temp: weatherData[0].current.temperature,
        desc: weatherData[0].current.skytext,
        humidity: weatherData[0].current.humidity,
        wind: weatherData[0].current.winddisplay,
        image: weatherData[0].current.imageUrl,
        forecast: []
    }
    await new Promise((resolve, reject) => {
        for (let i = 0; i < weatherData[0].forecast.length; i++) {
            let forecast = {
                day: weatherData[0].forecast[i].day,
                low: weatherData[0].forecast[i].low,
                high: weatherData[0].forecast[i].high,
                desc: weatherData[0].forecast[i].skytextday
            }
            www.forecast.push(forecast);
        }
        resolve();
    });
    return www;
}


async function generateItinerary(days, place, members, budget) {
    let prompt = fs.readFileSync('prompt.txt', 'utf8');
    prompt = prompt.replace("AAAA", days);
    prompt = prompt.replace("BBBB", place);
    prompt = prompt.replace("CCCC", budget);
    prompt = prompt.replace("DDDD", members);
    let response;
    try {
        const messages = [
            {
                role: "system",
                content: prompt
            }
        ];
        response = await g4f.chatCompletion(messages);
    } catch (err) {
        console.log(err);
        return "Error";
    }
 
    return response;
}


async function checkCurrency(currency) {
    let valid = false;
    let currencies = config.currencyCodes
    if (currencies.includes(currency.toUpperCase())) {
        valid = true;
    }
    return valid;
}