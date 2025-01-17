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
                    <th style="border: 1px solid #ccc; padding: 8px;">Wache</th>
                    <th style="border: 1px solid #ccc; padding: 8px;">Status</th>
                    <th style="border: 1px solid #ccc; padding: 8px;">Aktion</th>
                </tr>
            </thead>
            <tbody id="vehicle-table-body"></tbody>
        `;

        overlay.appendChild(closeButton);
        overlay.appendChild(table);
        document.body.appendChild(overlay);

        // Ladeanzeige einfügen
        const loadingMessage = document.createElement('div');
        loadingMessage.id = 'loading-message';
        loadingMessage.textContent = 'Lade Fahrzeuge...';
        loadingMessage.style.position = 'absolute';
        loadingMessage.style.top = '50%';
        loadingMessage.style.left = '50%';
        loadingMessage.style.transform = 'translate(-50%, -50%)';
        loadingMessage.style.fontSize = '24px';
        loadingMessage.style.color = '#ffffff';
        loadingMessage.style.fontWeight = 'bold';
        loadingMessage.style.zIndex = '10001';
        document.body.appendChild(loadingMessage);

        // Fahrzeug- und Wachendaten laden
        loadBuildingsAndVehicles(loadingMessage);
    }

    // Funktion zum Laden der Wachen- und Fahrzeugdaten
    function loadBuildingsAndVehicles(loadingMessage) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://www.leitstellenspiel.de/api/buildings',
            onload: function (response) {
                if (response.status === 200) {
                    const buildings = JSON.parse(response.responseText);
                    const buildingMap = {};
                    buildings.forEach(building => {
                        buildingMap[building.id] = building.caption; // Zuordnung von Wachen-ID zu Wachenname
                    });

                    // Fahrzeugdaten laden
                    loadVehicles(buildingMap, loadingMessage);
                } else {
                    console.error('Fehler beim Laden der Wachen:', response.status, response.responseText);
                    loadingMessage.textContent = 'Fehler beim Laden der Wachen!';
                }
            },
            onerror: function (error) {
                console.error('Fehler bei der Wachen-Anfrage:', error);
                loadingMessage.textContent = 'Fehler beim Laden der Wachen!';
            }
        });
    }

    // Funktion zum Laden der Fahrzeugdaten
    function loadVehicles(buildingMap, loadingMessage) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://www.leitstellenspiel.de/api/vehicles',
            onload: function (response) {
                if (response.status === 200) {
                    const vehicles = JSON.parse(response.responseText);
                    const tableBody = document.querySelector('#vehicle-table-body');

                    // Ladeanzeige entfernen
                    loadingMessage.remove();

                    // Fahrzeuge alphabetisch nach Name (caption) sortieren
                    vehicles.sort((a, b) => a.caption.localeCompare(b.caption));

                    vehicles.forEach(vehicle => {
                        if (vehicle.fms_real === 6) {
                            const row = document.createElement('tr');
                            const buildingName = buildingMap[vehicle.building_id] || 'Unbekannt';
                            row.innerHTML = `
                                <td style="border: 1px solid #ccc; padding: 8px;">${vehicle.caption}</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">${buildingName}</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">${vehicle.fms_real}</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">
                                    <button style="padding: 5px 10px; background-color: #28a745; color: #ffffff; border: none; border-radius: 4px; cursor: pointer;" data-id="${vehicle.id}">
                                        In S2 versetzen
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
                    loadingMessage.textContent = 'Fehler beim Laden der Daten!';
                }
            },
            onerror: function (error) {
                console.error('Fehler bei der Fahrzeugdaten-Anfrage:', error);
                loadingMessage.textContent = 'Fehler beim Laden der Daten!';
            }
        });
    }

    // Funktion zum Ändern des Fahrzeugstatus ohne Seitenumleitung
    function changeVehicleStatus(vehicleId, vehicleCaption) {
        const url = `https://www.leitstellenspiel.de/vehicles/${vehicleId}/set_fms/2`;

        console.log(`Statusänderung für Fahrzeug ${vehicleId} auf Status 2 wird durchgeführt...`);

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function (response) {
                if (response.status === 200) {
                    alert(`Fahrzeug ${vehicleCaption} erfolgreich auf Status 2 gesetzt!`);

                    // Button aktualisieren
                    const button = document.querySelector(`#vehicle-table-body button[data-id='${vehicleId}']`);
                    if (button) {
                        button.disabled = true;
                        button.textContent = `Status geändert (${vehicleCaption})`;
                        button.style.backgroundColor = '#6c757d';
                        button.style.cursor = 'not-allowed';
                    }

                    // Tabellenzeile aktualisieren
                    const statusCell = button.parentElement.previousElementSibling; // Status-Zelle
                    if (statusCell) {
                        statusCell.textContent = "2"; // Status ändern
                        statusCell.style.backgroundColor = '#28a745'; // Hintergrundfarbe auf Grün setzen
                        statusCell.style.color = '#ffffff'; // Textfarbe auf Weiß setzen (für besseren Kontrast)
                        statusCell.style.fontWeight = 'bold'; // Text hervorheben
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
