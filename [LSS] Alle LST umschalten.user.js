// ==UserScript==
// @name         Leitstellen umschalten
// @namespace    https://www.leitstellenspiel.de/
// @version      1.2
// @description  Schaltet alle Leitstellen ins Gegenteil um und zeigt den Fortschritt an (Dark/Light Mode Unterstützung)
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Wartezeit zwischen den Requests (in Millisekunden)
    const delay = 100;

    // Funktion zum Umschalten einer Leitstelle
    function toggleBuilding(buildingId) {
        const url = `https://www.leitstellenspiel.de/buildings/${buildingId}/active`;
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'active=true', // oder 'active=false', je nach Bedarf
        })
            .then((response) => {
                if (response.ok) {
                    console.log(`Leitstelle ${buildingId} erfolgreich umgeschaltet.`);
                } else {
                    console.error(`Fehler beim Umschalten von Leitstelle ${buildingId}.`);
                }
            })
            .catch((error) => console.error(error));
    }

    // Funktion zum Umschalten aller Leitstellen
    async function toggleAllCommandCenters() {
        // Suche nach allen Leitstellen anhand von building_type_id="7"
        const buildings = Array.from(
            document.querySelectorAll('.building_list_li.buildings_searchable[building_type_id="7"]')
        );

        // Extrahiere die Gebäude-IDs
        const commandCenterIds = buildings
            .map((building) => {
                const link = building.querySelector('a[href*="/buildings/"]');
                const match = link ? link.href.match(/\/buildings\/(\d+)/) : null;
                return match ? match[1] : null;
            })
            .filter((id) => id !== null);

        console.log(`Gefundene Leitstellen: ${commandCenterIds.join(', ')}`);

        // Erkennen des Farbschemas (Dark Mode oder Light Mode)
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Anpassung der Styles je nach Modus
        const progressContainer = document.createElement('div');
        progressContainer.id = 'progress-container';
        progressContainer.style.position = 'fixed';
        progressContainer.style.top = '10px';
        progressContainer.style.left = '50%';
        progressContainer.style.transform = 'translateX(-50%)';
        progressContainer.style.padding = '15px';
        progressContainer.style.zIndex = '9999';
        progressContainer.style.fontFamily = '"Arial", sans-serif';

        // Dark Mode Styles
        if (isDarkMode) {
            progressContainer.style.backgroundColor = '#333';
            progressContainer.style.color = '#fff';
            progressContainer.style.border = '1px solid #555';
            progressContainer.style.borderRadius = '8px';
            progressContainer.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
        } else {
            // Light Mode Styles
            progressContainer.style.backgroundColor = '#fff';
            progressContainer.style.color = '#333';
            progressContainer.style.border = '1px solid #ccc';
            progressContainer.style.borderRadius = '8px';
            progressContainer.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        }

        const progressText = document.createElement('p');
        progressText.id = 'progress-text';
        progressText.style.margin = '0';
        progressText.style.fontSize = '14px';
        progressText.textContent = `0 von ${commandCenterIds.length} Leitstellen umgeschaltet.`;
        progressContainer.appendChild(progressText);

        const progressBar = document.createElement('progress');
        progressBar.id = 'progress-bar';
        progressBar.max = commandCenterIds.length;
        progressBar.value = 0;
        progressBar.style.width = '100%';
        progressBar.style.height = '20px';
        progressContainer.appendChild(progressBar);

        document.body.appendChild(progressContainer);

        // Alle Leitstellen nacheinander umschalten
        for (let i = 0; i < commandCenterIds.length; i++) {
            await toggleBuilding(commandCenterIds[i]);
            await new Promise((resolve) => setTimeout(resolve, delay));

            // Fortschritt aktualisieren
            progressBar.value = i + 1;
            progressText.textContent = `${i + 1} von ${commandCenterIds.length} Leitstellen umgeschaltet.`;
        }

        // Info ausgeben, wenn alle Leitstellen umgeschaltet wurden
        alert('Alle Leitstellen wurden erfolgreich umgeschaltet.');
        console.log('Alle Leitstellen wurden umgeschaltet.');

        // Fortschrittsanzeige entfernen
        setTimeout(() => {
            progressContainer.remove();
        }, 2000);
    }

    // Funktion zum Hinzufügen des Buttons
    function addButton() {
        // Überprüfe, ob das Ziel-Element existiert
        const targetDiv = document.getElementById('building-list-header-buttons');
        if (targetDiv) {
            // Lösche den alten Button, falls vorhanden
            const oldButton = document.getElementById('new_button');
            if (oldButton) {
                oldButton.remove();
            }

            // Erstelle das neue Button-Element
            const newButton = document.createElement('a');
            newButton.href = '#';
            newButton.className = 'btn btn-xs btn-default';
            newButton.id = 'new_button';
            newButton.textContent = 'Leitstellen umschalten';

            // Füge Event-Listener hinzu
            newButton.addEventListener('click', (event) => {
                event.preventDefault();
                toggleAllCommandCenters();
            });

            // Füge den neuen Button zum Ziel-Div hinzu
            targetDiv.appendChild(newButton);
        }
    }

    // Warte, bis die Seite vollständig geladen ist, und rufe dann die addButton-Funktion auf
    window.addEventListener('load', addButton);

    // Fallback, falls der Load-Event nicht richtig ausgelöst wird
    setTimeout(addButton, 3000);
})();
