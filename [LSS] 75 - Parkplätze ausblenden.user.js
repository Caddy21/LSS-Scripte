// ==UserScript==
// @name         [LSS] Parkplätze ausblenden
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Blendet die Parkplatzanzeige auf Wachenseiten aus.
// @match        https://www.leitstellenspiel.de/buildings/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function hideParkingIndicator() {
        document.querySelectorAll('.parking-slot-indicator').forEach(el => el.remove());
    }

    // Beim Laden ausführen
    hideParkingIndicator();

    // Falls die Seite Inhalte dynamisch nachlädt
    new MutationObserver(hideParkingIndicator).observe(document.body, {
        childList: true,
        subtree: true
    });
})();
