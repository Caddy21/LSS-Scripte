// ==UserScript==
// @name         [LSS] Krankenhausfilter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Blendet Krankenhäuser aus, die weiter als XX km entfernt sind.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function filterHospitals() {
        let transportBox = document.querySelector('[data-transport-request="true"][data-transport-request-type="patient"]');
        if (!transportBox) return; // Falls der Bereich nicht existiert, abbrechen

        let tables = ["own-hospitals", "alliance-hospitals"]; // Tabellen-IDs
        tables.forEach(tableID => {
            let table = transportBox.querySelector(`#${tableID}`); // Tabelle innerhalb des Transportbereichs suchen
            if (!table) return;

            let rows = table.querySelectorAll("tbody tr"); // Alle Zeilen holen
            rows.forEach(row => {
                let distanceCell = Array.from(row.querySelectorAll('.hidden-xs')).find(cell => cell.innerText.includes("km"));

                if (distanceCell) {
                    let match = distanceCell.innerText.match(/(\d+[\.,]?\d*)\s*km/); // KM-Zahl extrahieren (inkl. Dezimalwerte)
                    if (match && parseFloat(match[1].replace(",", ".")) > 50) { // Falls Entfernung > 50 km, ausblenden
                        row.style.display = "none";
                    }
                }
            });
        });
    }

    // MutationObserver für dynamisch geladene Inhalte
    const observer = new MutationObserver(() => {
        filterHospitals();
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
