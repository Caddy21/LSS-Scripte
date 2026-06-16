// ==UserScript==
// @name         [LSS] 71 - Schulauslastung
// @namespace    https://www.leitstellenspiel.de/
// @version      1.1
// @description  Markiert Schulen anhand freier Klassenräume
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const SCHOOL_TYPES = [
        1,   // Feuerwehrschule
        3,   // Rettungsschule
        8,   // Polizeischule
        10,  // THW Bundesschule
        27,  // Seenotrettungsschule
    ];

    async function updateSchoolColors() {
        try {
            const response = await fetch('/api/v2/buildings');
            const data = await response.json();

            const schools = Array.isArray(data.result)
            ? data.result.filter(building =>
                                 SCHOOL_TYPES.includes(building.building_type)
                                )
            : [];

            schools.forEach(building => {

                // Grundsätzlich 1 Klassenraum vorhanden
                let classrooms = 1;

                // Nur verfügbare Klassenräume zählen
                if (Array.isArray(building.extensions)) {
                    classrooms += building.extensions.filter(ext =>
                                                             ext.enabled &&
                                                             ext.available &&
                                                             ext.caption === 'Weiterer Klassenraum'
                                                            ).length;
                }

                const occupied = Array.isArray(building.schoolings)
                ? building.schoolings.length
                : 0;

                const free = classrooms - occupied;

                const element = document.getElementById(
                    `building_list_${building.id}`
                );

                if (!element) return;

                // Vorherige Markierungen entfernen
                element.style.backgroundColor = '';
                element.style.borderLeft = '';

                // 🟢 Alle Räume frei
                if (occupied === 0) {
                    element.style.backgroundColor = '#dff0d8';
                    element.style.borderLeft = '5px solid #5cb85c';
                }

                // 🔴 Voll belegt
                else if (free <= 0) {
                    element.style.backgroundColor = '#f2dede';
                    element.style.borderLeft = '5px solid #d9534f';
                }

                // 🟡 Noch 1–3 Räume frei
                else if (free <= 3) {
                    element.style.backgroundColor = '#fcf8e3';
                    element.style.borderLeft = '5px solid #f0ad4e';
                }

                // Mehr als 3 frei → keine Hervorhebung
            });

        } catch (error) {
            console.error('[LSS] Schulauslastung:', error);
        }
    }

    // Beim Spielstart mehrfach versuchen
    let startupChecks = 0;
    const startupInterval = setInterval(() => {
        startupChecks++;

        if (document.querySelector('[id^="building_list_"]')) {
            updateSchoolColors();
            clearInterval(startupInterval);
        }

        if (startupChecks >= 20) {
            clearInterval(startupInterval);
        }
    }, 1000);

    // Sofortiger erster Versuch
    updateSchoolColors();

    // Danach jede Minute aktualisieren
    setInterval(updateSchoolColors, 60000);

})();
