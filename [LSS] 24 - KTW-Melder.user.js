// ==UserScript==
// @name         [LSS] 24 - KTW/ITW-Einsatzmelder
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Meldet wenn der Bereich von KTW Einsätzen genau 10 erreicht hat
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let warned = false;

    function checkKTWMissions() {
        const list = document.getElementById('mission_list_krankentransporte');
        if (!list) return;

        const einsaetze = list.querySelectorAll('.missionSideBarEntry').length;

        if (einsaetze === 10 && !warned) {
            alert('🔔 Es sind genau 10 Krankentransport-Einsätze vorhanden!');
            warned = true;
        } else if (einsaetze < 10) {
            warned = false;
        }
    }

    // Alle 100 Sekunden prüfen (100.000 ms)
    setInterval(checkKTWMissions, 100000);
})();
