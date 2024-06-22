function showLoading() {
    document.getElementsByClassName("loader")[0].style.display = "flex"; 
    document.getElementById("genTitle").innerHTML = 'Generating your perfect itinerary ...<img src="https://media.tenor.com/n5VEFKn3qbcAAAAi/discord.gif">';
    
 
    
    let err = document.getElementsByClassName('error')[0];
    if (err) err.style.display = "none";
    return true; 
}

var currentDayIndex = 0; 


var dayDivs = document.querySelectorAll('[class^="day"]');
for (var i = 1; i < dayDivs.length; i++) {
    dayDivs[i].style.display = "none";
}


function showPreviousDay() {
    console.log(currentDayIndex, dayDivs.length)
    dayDivs[currentDayIndex].style.display = "none";
    currentDayIndex = (currentDayIndex - 1 + dayDivs.length) % dayDivs.length; 
    dayDivs[currentDayIndex].style.display = "block";
}


function showNextDay() {
    console.log(currentDayIndex, dayDivs.length)
    dayDivs[currentDayIndex].style.display = "none";
    currentDayIndex = (currentDayIndex + 1) % dayDivs.length;
    dayDivs[currentDayIndex].style.display = "block";
}


var containerDivs = document.querySelectorAll('[class^="container"]');
for (var i = 0; i < containerDivs.length; i++) {
    if (containerDivs[i].id.includes("restaraunt")) {
        containerDivs[i].style.display = "block";
    } else {
        containerDivs[i].style.display = "none";
    }
}


function showRestaraunt(day) {
    
    document.getElementById("restaraunt_day_" + day).style.display = "block";
    
    document.getElementById("activity_day_" + day).style.display = "none";
    document.getElementById("acomm_day_" + day).style.display = "none";
    document.getElementById("weather_day_" + day).style.display = "none";
}


function showActivites(day) {
    
    document.getElementById("activity_day_" + day).style.display = "block";
    
    document.getElementById("restaraunt_day_" + day).style.display = "none";
    document.getElementById("acomm_day_" + day).style.display = "none";
    document.getElementById("weather_day_" + day).style.display = "none";
}


function showAccom(day) {
    
    document.getElementById("acomm_day_" + day).style.display = "block";
    
    document.getElementById("restaraunt_day_" + day).style.display = "none";
    document.getElementById("activity_day_" + day).style.display = "none";
    document.getElementById("weather_day_" + day).style.display = "none";
}


function showWeather(day) {
    
    document.getElementById("restaraunt_day_" + day).style.display = "none";
    document.getElementById("activity_day_" + day).style.display = "none";
    document.getElementById("acomm_day_" + day).style.display = "none";
    
    document.getElementById("weather_day_" + day).style.display = "block";
}


function booking(type, query) {
   
    window.open(url, "_blank");
}


function imgError(image) {
    image.onerror = "";
    image.src = "https://www.thermaxglobal.com/wp-content/uploads/2020/05/image-not-found.jpg";
    return true;
}