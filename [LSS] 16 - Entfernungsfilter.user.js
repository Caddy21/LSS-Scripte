// ==UserScript==
// @name         [LSS] Entfernungsfilter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Blendet Krankenhäuser & Gefängnisse aus, die weiter als XX Kilometer entfernt sind.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
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

                if (distanceCell) {
                    let match = distanceCell.innerText.match(/(\d+[\.,]?\d*)\s*km/);
                    if (match && parseFloat(match[1].replace(",", ".")) > 50) {
                        row.style.display = "none";
                    }
                }
            });
        });
    }

    function filterPrisons() {
        let prisonBox = document.querySelector('[data-transport-request="true"][data-transport-request-type="prisoner"]');
        if (!prisonBox) return;

        let buttons = prisonBox.querySelectorAll('.btn.btn-success'); // Alle Buttons holen
        buttons.forEach(button => {
            let match = button.innerText.match(/Entfernung:\s*(\d+[\.,]?\d*)\s*km/); // Entfernung extrahieren

            if (match && parseFloat(match[1].replace(",", ".")) > 10) {
                button.style.display = "none"; // Button ausblenden
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
