// ==UserScript==
// @name         [LSS] 60 - Navbar ausblender
// @version      1.0
// @author       Caddy21
// @description  Blendet Navbar und Map-Menü-Elemente ein oder aus
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    const HIDE_NAVBAR = false;
    const HIDE_MISSION_BUTTON = false;
    const HIDE_BUILDING_BUTTON = false;
    const HIDE_CHAT_BUTTON = false;
    const HIDE_RADIO_BUTTON = false;

    const style = document.createElement('style');
    style.textContent = `
        ${HIDE_NAVBAR ? '#col_navbar_holder { display: none !important; }' : ''}
        ${HIDE_MISSION_BUTTON ? '#bigMapMenuMissionButton { display: none !important; }' : ''}
        ${HIDE_BUILDING_BUTTON ? '#bigMapMenuBuildingButton { display: none !important; }' : ''}
        ${HIDE_CHAT_BUTTON ? '#bigMapMenuChatButton { display: none !important; }' : ''}
        ${HIDE_RADIO_BUTTON ? '#bigMapMenuRadioButton { display: none !important; }' : ''}
    `;
    document.head.appendChild(style);
})();
