
let text1 = document.querySelector("#text1");
let text2 = document.querySelector("#text2");
let text3 = document.querySelector("#text3");
let text4 = document.querySelector("#text4");
text2.style.display = "none";
text3.style.display = "none";
text4.style.display = "none";

setTimeout(() => {
    text1.style.borderRight = "none";
    text2.style.display = "block";
    // Refresh text2
    let h = text2.innerHTML;
    text2.innerHTML = "";
    text2.innerHTML = h;
}, 3000);

setTimeout(() => {
    text2.style.borderRight = "none";
    text3.style.display = "block";
    let h = text3.innerHTML;
    text3.innerHTML = "";
    text3.innerHTML = h;
}, 6000);

setTimeout(() => {
    text3.style.borderRight = "none";
    text4.style.display = "block";
    let h = text4.innerHTML;
    text4.innerHTML = "";
    text4.innerHTML = h;
}, 9000);