// ==UserScript==
// @name         [LSS] Entfernungs- und Abgabenfilter mit Fachabteilung
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Blendet Krankenhäuser, Zellen und mögliche Übergabeorte nach Kriterien aus.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const maxDistanceHospital = 50; // Maximale Krankenhausentfernung in km
    const maxFeeHospital = 0; // Maximale Abgabe für Krankenhäuser in %
    let requiredDepartment = "Ja"; // Mögliche Fachabteilungen: "Ja", "Nein", "Beides"

    const maxDistancePrison = 5; // Maximale Zellenentfernung in km
    const maxFeePrison = 0; // Maximale Abgabe für Gefängnisse in %

    const maxDistanceIntermediate = 30; // Maximale Entfernung für Übergabeorte in km

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
                let feeCell = Array.from(row.querySelectorAll('.hidden-xs')).find(cell => cell.innerText.includes("%"));
                let departmentCell = row.querySelector('.label-success');

                let distanceMatch = distanceCell ? distanceCell.innerText.match(/(\d+[\.,]?\d*)\s*km/) : null;
                let feeMatch = feeCell ? feeCell.innerText.match(/(\d+)\s*%/) : null;
                let department = departmentCell ? departmentCell.innerText.trim() : "Nein";

                let distance = distanceMatch ? parseFloat(distanceMatch[1].replace(",", ".")) : 0;
                let fee = feeMatch ? parseInt(feeMatch[1].replace(/\D/g, "")) : 0; // Entferne nicht-digitale Zeichen

                let hideByDepartment = (requiredDepartment === "Ja" && department !== "Ja") || (requiredDepartment === "Nein" && department !== "Nein");
                if (distance > maxDistanceHospital || fee > maxFeeHospital || hideByDepartment) {
                    row.style.display = "none";
                }
            });
        });
    }

    function filterIntermediateStations() {
        let transportBox = document.querySelector('[data-transport-request="true"][data-transport-request-type="patient-intermediate"]');
        if (!transportBox) return;

        let tables = ["own-intermediate-stations", "alliance-intermediate-stations"];
        tables.forEach(tableID => {
            let table = transportBox.querySelector(`#${tableID}`);
            if (!table) return;

            let rows = table.querySelectorAll("tbody tr");
            rows.forEach(row => {
                let distanceCell = row.querySelector("td:nth-child(2)"); // Annahme: Entfernung ist in der 2. Spalte
                if (!distanceCell) return;

                let distanceMatch = distanceCell.innerText.match(/(\d+[\.,]?\d*)\s*km/);
                if (!distanceMatch) return;

                let distance = parseFloat(distanceMatch[1].replace(",", "."));

                if (distance > maxDistanceIntermediate) {
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
            if (match && parseFloat(match[1].replace(",", ".")) > maxDistancePrison) {
                button.style.display = "none";
            }

            // Gefängnis Abgabe-Filterung (wenn Prozent vorhanden)
            let feeMatch = button.innerText.match(/Abgabe an Besitzer:\s*(\d+)\s*%/);
            if (feeMatch) {
                let fee = parseInt(feeMatch[1].replace(/\D/g, "")); // Entferne nicht-digitale Zeichen
                if (fee > maxFeePrison) {
                    button.style.display = "none";
                }
            }
        });
    }

    function filterAll() {
        filterHospitals();
        filterIntermediateStations();
        filterPrisons();
    }

    // MutationObserver für dynamisch geladene Inhalte
    const observer = new MutationObserver(() => {
        filterAll();
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
