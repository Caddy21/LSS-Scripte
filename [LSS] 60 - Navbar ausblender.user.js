// ==UserScript==
// @name         [LSS] Navbar ausblender
// @version      1.0
// @description  Blendet die Navbar aus
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @author       Caddy21
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    const style = document.createElement('style');
    style.innerHTML = "#col_navbar_holder { display: none !important; }";
    document.head.appendChild(style);
})();

