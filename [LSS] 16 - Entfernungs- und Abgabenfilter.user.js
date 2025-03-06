// ==UserScript==
// @name         [LSS] Entfernungs- und Abgabenfilter mit Fachabteilung
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Blendet Krankenhäuser und Zwischenstationen aus, die weiter als XX km entfernt sind, eine Abgabe über YY% haben oder keine passende Fachabteilung haben. Gefängnisse über ZZ km werden ebenfalls ausgeblendet.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const maxDistanceHospital = 50; // Maximale Krankenhausentfernung in km
    const maxDistanceIntermediate = 30; // Maximale Entfernung für Übergabeorte in km
    const maxDistancePrison = 5; // Maximale Gefängnisentfernung in km
    let requiredDepartment = "Ja"; // Mögliche Werte: "Ja", "Nein", "Beides"
    let maxFeeHospital = 0; // Maximale Abgabe in %
    let maxFeePrison = 0; // Maximale Abgabe in % für Gefängnisse

    // Dynamisches Eingabefeld für den max. Abgabewert in %
    let feeInputContainer = document.createElement('div');
    feeInputContainer.style.position = 'fixed';
    feeInputContainer.style.top = '10px';
    feeInputContainer.style.left = '10px';
    feeInputContainer.style.padding = '10px';
    feeInputContainer.style.backgroundColor = '#fff';
    feeInputContainer.style.border = '1px solid #ccc';
    feeInputContainer.style.zIndex = '9999';

    let feeLabel = document.createElement('label');
    feeLabel.innerText = 'Maximale Abgabe für Krankenhäuser in %: ';
    feeInputContainer.appendChild(feeLabel);

    let feeInput = document.createElement('input');
    feeInput.type = 'number';
    feeInput.value = 0;
    feeInput.min = 0;
    feeInput.max = 100;
    feeInput.style.width = '50px';
    feeInput.addEventListener('input', function() {
        maxFeeHospital = parseInt(feeInput.value);
        filterAll();
    });
    feeInputContainer.appendChild(feeInput);

    let feeLabelPrison = document.createElement('label');
    feeLabelPrison.innerText = 'Maximale Abgabe für Gefängnisse in %: ';
    feeInputContainer.appendChild(feeLabelPrison);

    let feeInputPrison = document.createElement('input');
    feeInputPrison.type = 'number';
    feeInputPrison.value = 0;
    feeInputPrison.min = 0;
    feeInputPrison.max = 100;
    feeInputPrison.style.width = '50px';
    feeInputPrison.addEventListener('input', function() {
        maxFeePrison = parseInt(feeInputPrison.value);
        filterAll();
    });
    feeInputContainer.appendChild(feeInputPrison);

    document.body.appendChild(feeInputContainer);

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
            let feeMatch = button.innerText.match(/Abgabe:\s*(\d+)\s*%/);
            if (feeMatch) {
                let fee = parseInt(feeMatch[1]);
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
