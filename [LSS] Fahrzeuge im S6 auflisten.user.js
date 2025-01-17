// ==UserScript==
// @name         [LSS] Fahrzeuge im S6 auflisten
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Listet alle Fahrzeuge im S6 auf
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      www.leitstellenspiel.de
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// ==/UserScript==

(function () {
    'use strict';

    // Funktion zum Einfügen des Buttons
    function insertButton() {
        const buildingPanelBody = document.querySelector('#building_panel_body');
        if (buildingPanelBody) {
            const button = document.createElement('button');
            button.textContent = 'Fahrzeuge im S6 anzeigen';
            button.style.padding = '10px 20px';
            button.style.backgroundColor = '#007bff';
            button.style.color = '#ffffff';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.style.cursor = 'pointer';

            // Event-Listener für den Button
            button.addEventListener('click', openOverlay);

            buildingPanelBody.appendChild(button);
        } else {
            console.error('#building_panel_body nicht gefunden.');
        }
    }

    // Funktion zum Erstellen und Anzeigen des Overlays
    function openOverlay() {
        // Overlay-Container erstellen
        const overlay = document.createElement('div');
        overlay.id = 'vehicle-status-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.color = '#ffffff';
        overlay.style.zIndex = '10000';
        overlay.style.overflowY = 'auto';
        overlay.style.padding = '20px';

        // Tabelle und Schließen-Button erstellen
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Schließen';
        closeButton.style.padding = '10px 20px';
        closeButton.style.marginBottom = '20px';
        closeButton.style.backgroundColor = '#ff4d4d';
        closeButton.style.color = '#ffffff';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '4px';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => overlay.remove());

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="border: 1px solid #ccc; padding: 8px;">Name</th>
                    <th style="border: 1px solid #ccc; padding: 8px;">Status</th>
                    <th style="border: 1px solid #ccc; padding: 8px;">Aktion</th>
                </tr>
            </thead>
            <tbody id="vehicle-table-body"></tbody>
        `;

        overlay.appendChild(closeButton);
        overlay.appendChild(table);
        document.body.appendChild(overlay);

        // Fahrzeugdaten laden
        loadVehicles();
    }

    // Funktion zum Laden der Fahrzeugdaten
    function loadVehicles() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://www.leitstellenspiel.de/api/vehicles',
            onload: function (response) {
                if (response.status === 200) {
                    const vehicles = JSON.parse(response.responseText);
                    const tableBody = document.querySelector('#vehicle-table-body');

                    vehicles.forEach(vehicle => {
                        if (vehicle.fms_real === 6) {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td style="border: 1px solid #ccc; padding: 8px;">${vehicle.caption}</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">${vehicle.fms_real}</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">
                                    <button style="padding: 5px 10px; background-color: #28a745; color: #ffffff; border: none; border-radius: 4px; cursor: pointer;" data-id="${vehicle.id}">
                                        Auf Status 2 setzen
                                    </button>
                                </td>
                            `;

                            // Event-Listener für den Status-Änderungs-Button
                            row.querySelector('button').addEventListener('click', (event) => {
                                event.preventDefault(); // Verhindert die Standardaktion
                                const vehicleId = event.target.getAttribute('data-id');
                                changeVehicleStatus(vehicleId, vehicle.caption); // Fahrzeugbeschreibung wird jetzt übergeben
                            });

                            tableBody.appendChild(row);
                        }
                    });
                } else {
                    console.error('Fehler beim Laden der Fahrzeugdaten:', response.status, response.responseText);
                }
            },
            onerror: function (error) {
                console.error('Fehler bei der Fahrzeugdaten-Anfrage:', error);
            }
        });
    }

    // Funktion zum Ändern des Fahrzeugstatus ohne Seitenumleitung
    function changeVehicleStatus(vehicleId, vehicleCaption) {
        const url = `https://www.leitstellenspiel.de/vehicles/${vehicleId}/set_fms/2`;

        console.log(`Statusänderung für Fahrzeug ${vehicleId} auf Status 2 wird durchgeführt...`);

        // Sende eine Fetch-Anfrage, die den Status ändert, aber ohne Weiterleitung
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function (response) {
                if (response.status === 200) {
                    // Statusänderung erfolgreich
                    alert(`Fahrzeug ${vehicleCaption} erfolgreich auf Status 2 gesetzt!`); // Fahrzeugname im Alert anzeigen
                    const button = document.querySelector(`#vehicle-table-body button[data-id='${vehicleId}']`);
                    if (button) {
                        button.disabled = true;
                        button.textContent = `Status geändert (${vehicleCaption})`;
                        button.style.backgroundColor = '#6c757d';
                        button.style.cursor = 'not-allowed';
                    }
                } else {
                    console.warn(`Fehler bei der Statusänderung für Fahrzeug ${vehicleId}.`);
                }
            },
            onerror: function (error) {
                console.error('Fehler bei der Anfrage:', error);
            }
        });
    }

    // Warte auf das Laden der Seite und füge dann den Button ein
    window.addEventListener('load', insertButton);
})();
