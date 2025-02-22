// ==UserScript==
// @name         [LSS] Entfernungs- und Abgabenfilter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Blendet Krankenhäuser aus, die weiter als XX km entfernt sind oder eine Abgabe über 0% haben. Gefängnisse über XX km werden ebenfalls ausgeblendet.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function filterHospitals() {
        let transportBox = document.querySelector('[data-transport-request="true"][data-transport-request-type="patient"]');
        if (!transportBox) return;

        let tables = ["own-hospitals", "alliance-hospitals"];
        tables.forEach(tableID => {
            let table = transportBox.querySelector(`#${tableID}`);
            if (!table) return;

            let rows = table.querySelectorAll("tbody tr");
            rows.forEach(row => {
                let distanceCell = Array.from(row.querySelectorAll('.hidden-xs')).find(cell => cell.innerText.includes("km"));
                let feeCell = Array.from(row.querySelectorAll('.hidden-xs')).find(cell => cell.innerText.includes("%")); // Abgabenzelle suchen

                let distanceMatch = distanceCell ? distanceCell.innerText.match(/(\d+[\.,]?\d*)\s*km/) : null;
                let feeMatch = feeCell ? feeCell.innerText.match(/(\d+)\s*%/) : null;

                let distance = distanceMatch ? parseFloat(distanceMatch[1].replace(",", ".")) : 0;
                let fee = feeMatch ? parseInt(feeMatch[1]) : 0; // Abgabe als Zahl umwandeln

                if (distance > 30 || fee > 0) { // Krankenhaus ausblenden, wenn Entfernung > 50 km oder Abgabe > 0%
                    row.style.display = "none";
                }
            });
        });
    }

    function filterPrisons() {
        let prisonBox = document.querySelector('[data-transport-request="true"][data-transport-request-type="prisoner"]');
        if (!prisonBox) return;

        let buttons = prisonBox.querySelectorAll('.btn.btn-success');
        buttons.forEach(button => {
            let match = button.innerText.match(/Entfernung:\s*(\d+[\.,]?\d*)\s*km/);

            if (match && parseFloat(match[1].replace(",", ".")) > 10) {
                button.style.display = "none";
            }
        });
    }

    function filterAll() {
        filterHospitals();
        filterPrisons();
    }

    // MutationObserver für dynamisch geladene Inhalte
    const observer = new MutationObserver(() => {
        filterAll();
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
