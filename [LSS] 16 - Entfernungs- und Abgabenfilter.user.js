// ==UserScript==
// @name         [LSS] Entfernungs- und Abgabenfilter mit Fachabteilung
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Blendet Krankenhäuser und Übergabeorte aus, die weiter als XX km entfernt sind, eine Abgabe über YY% haben oder keine passende Fachabteilung haben. Gefängnisse über ZZ km werden ebenfalls ausgeblendet.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Hier könnt Ihr die Zahlen anpassen wie Ihr wollt
    const maxDistanceHospital = 30; // Maximale Krankenhausentfernung in km
    const maxFeeHospital = 0; // Maximale Abgabe in %
    const maxDistanceIntermediate = 10; // Maximale Entfernung für Zwischenstationen in km
    const maxDistancePrison = 5; // Maximale Gefängnisentfernung in km
    let requiredDepartment = "Ja"; // Mögliche Werte: "Ja", "Nein", "Beides"
    
    // Funktion um die Krankenhäuser zu filtern
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
                let fee = feeMatch ? parseInt(feeMatch[1]) : 0;

                let hideByDepartment = (requiredDepartment === "Ja" && department !== "Ja") || (requiredDepartment === "Nein" && department !== "Nein");
                if (distance > maxDistanceHospital || fee > maxFeeHospital || hideByDepartment) {
                    row.style.display = "none";
                }
            });
        });
    }

    // Funktion um die Übergabeorte zu filtern
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
                console.log(`Intermediate Station Distance: ${distance} km`);

                if (distance > maxDistanceIntermediate) {
                    console.log(`Hiding intermediate station at ${distance} km`);
                    row.style.display = "none";
                }
            });
        });
    }

    // Funktion um die Zellen zu filtern
    function filterPrisons() {
        let prisonBox = document.querySelector('[data-transport-request="true"][data-transport-request-type="prisoner"]');
        if (!prisonBox) return;

        let buttons = prisonBox.querySelectorAll('.btn.btn-success');
        buttons.forEach(button => {
            let match = button.innerText.match(/Entfernung:\s*(\d+[\.,]?\d*)\s*km/);
            if (match && parseFloat(match[1].replace(",", ".")) > maxDistancePrison) {
                button.style.display = "none";
            }
        });
    }

    // Hauptfunktion um die Filter auszuführen
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
