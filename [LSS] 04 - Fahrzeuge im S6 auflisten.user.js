// ==UserScript==
// @name         [LSS] Fahrzeuge im S6 auflisten
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Listet alle Fahrzeuge im S6 auf, unterstützt Dark/Light Mode und speichert Farbauswahlen
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      www.leitstellenspiel.de
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// ==/UserScript==

(function () {
    'use strict';

    // Funktion zur Erkennung des Modus (Dark oder Light)
    function getCurrentMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Farben im LocalStorage speichern und laden
    const defaultColors = {
        vehicleLink: getCurrentMode() === 'dark' ? '#007bff' : '#0056b3',
        buildingLink: getCurrentMode() === 'dark' ? '#007bff' : '#0056b3',
    };

    function saveColorsToLocalStorage(colors) {
        localStorage.setItem('customColors', JSON.stringify(colors));
    }

    function getColorsFromLocalStorage() {
        const savedColors = localStorage.getItem('customColors');
        return savedColors ? JSON.parse(savedColors) : { ...defaultColors };
    }

    const colors = getColorsFromLocalStorage();

    // Funktion zum Einfügen des Buttons
    function insertButton() {
        const buildingPanelBody = document.querySelector('#building_panel_body');
        if (buildingPanelBody) {
            const button = document.createElement('button');
            button.textContent = 'Fahrzeuge im S6 anzeigen';
            button.classList.add('btn', 'btn-primary'); // Standard Bootstrap-Button-Klasse

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
        overlay.style.backgroundColor = getCurrentMode() === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
        overlay.style.color = getCurrentMode() === 'dark' ? '#ffffff' : '#000000';
        overlay.style.zIndex = '10000';
        overlay.style.overflowY = 'auto';
        overlay.style.padding = '20px';

        // Schließen-Button erstellen
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Schließen';
        closeButton.classList.add('btn', 'btn-danger'); // Standard Bootstrap-Button-Klasse
        closeButton.style.marginBottom = '20px';
        closeButton.addEventListener('click', () => overlay.remove());

        // Button zum Ein- und Ausblenden der Farbauswahl
        const toggleColorsButton = document.createElement('button');
        toggleColorsButton.textContent = 'Farbauswahl einblenden';
        toggleColorsButton.classList.add('btn', 'btn-info');
        toggleColorsButton.style.marginBottom = '20px';

        const colorPickerContainer = document.createElement('div');
        colorPickerContainer.style.display = 'none';
        colorPickerContainer.style.marginBottom = '20px';

        toggleColorsButton.addEventListener('click', () => {
            if (colorPickerContainer.style.display === 'none') {
                colorPickerContainer.style.display = 'block';
                toggleColorsButton.textContent = 'Farbauswahl ausblenden';
            } else {
                colorPickerContainer.style.display = 'none';
                toggleColorsButton.textContent = 'Farbauswahl einblenden';
            }
        });

        // Farbauswahl hinzufügen
        const vehicleColorPicker = document.createElement('input');
        vehicleColorPicker.type = 'color';
        vehicleColorPicker.value = colors.vehicleLink;
        vehicleColorPicker.addEventListener('input', (event) => {
            colors.vehicleLink = event.target.value;
            saveColorsToLocalStorage(colors);
            updateTableColors();
        });

        const buildingColorPicker = document.createElement('input');
        buildingColorPicker.type = 'color';
        buildingColorPicker.value = colors.buildingLink;
        buildingColorPicker.addEventListener('input', (event) => {
            colors.buildingLink = event.target.value;
            saveColorsToLocalStorage(colors);
            updateTableColors();
        });

        const vehicleColorLabel = document.createElement('label');
        vehicleColorLabel.textContent = 'Farbe für Fahrzeuge:';
        vehicleColorLabel.style.marginRight = '10px';

        const buildingColorLabel = document.createElement('label');
        buildingColorLabel.textContent = 'Farbe für Wachen:';
        buildingColorLabel.style.marginRight = '10px';

        colorPickerContainer.appendChild(vehicleColorLabel);
        colorPickerContainer.appendChild(vehicleColorPicker);
        colorPickerContainer.appendChild(document.createElement('br'));
        colorPickerContainer.appendChild(buildingColorLabel);
        colorPickerContainer.appendChild(buildingColorPicker);

        // Fahrzeuganzahl (Status 6) anzeigen
        const vehicleCountText = document.createElement('div');
        vehicleCountText.style.fontSize = '20px';
        vehicleCountText.style.fontWeight = 'bold';
        vehicleCountText.style.marginBottom = '20px';
        vehicleCountText.textContent = 'Gesamtzahl der Fahrzeuge im Status 6: 0'; // Initialwert

        // Tabelle erstellen
        const table = document.createElement('table');
        table.classList.add('table', 'table-striped'); // Standard Bootstrap-Tabelle
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.tableLayout = 'fixed'; // Stellt sicher, dass die Spalten gleichmäßig verteilt sind
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Wache</th>
                    <th>Status</th>
                    <th>Aktion</th>
                </tr>
            </thead>
            <tbody id="vehicle-table-body"></tbody>
        `;

        // Elemente zum Overlay hinzufügen
        overlay.appendChild(closeButton);
        overlay.appendChild(toggleColorsButton);
        overlay.appendChild(colorPickerContainer);
        overlay.appendChild(vehicleCountText);
        overlay.appendChild(table);
        document.body.appendChild(overlay);

        // Ladeanzeige einfügen
        const loadingMessage = document.createElement('div');
        loadingMessage.id = 'loading-message';
        loadingMessage.textContent = 'Lade Fahrzeuge & Wachen...';
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
        loadBuildingsAndVehicles(loadingMessage, vehicleCountText);
    }

    // Funktion zum Aktualisieren der Farben in der Tabelle
    function updateTableColors() {
        const rows = document.querySelectorAll('#vehicle-table-body tr');
        rows.forEach(row => {
            const vehicleLink = row.querySelector('td a');
            const buildingLink = row.querySelectorAll('td a')[1];
            if (vehicleLink) vehicleLink.style.color = colors.vehicleLink;
            if (buildingLink) buildingLink.style.color = colors.buildingLink;
        });
    }

    // Funktion zum Laden der Wachen- und Fahrzeugdaten
    function loadBuildingsAndVehicles(loadingMessage, vehicleCountText) {
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
                    loadVehicles(buildingMap, loadingMessage, vehicleCountText);
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
    function loadVehicles(buildingMap, loadingMessage, vehicleCountText) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://www.leitstellenspiel.de/api/vehicles',
            onload: function (response) {
                if (response.status === 200) {
                    const vehicles = JSON.parse(response.responseText);
                    const tableBody = document.querySelector('#vehicle-table-body');
                    const status6Vehicles = vehicles.filter(vehicle => vehicle.fms_real === 6); // Fahrzeuge im Status 6 filtern

                    // Ladeanzeige entfernen
                    loadingMessage.remove();

                    // Fahrzeuganzahl im Status 6 anzeigen
                    vehicleCountText.textContent = `Gesamtzahl der Fahrzeuge im Status 6: ${status6Vehicles.length}`;

                    // Fahrzeuge alphabetisch nach Name (caption) sortieren
                    status6Vehicles.sort((a, b) => a.caption.localeCompare(b.caption));

                    // Fahrzeugdaten in der Tabelle einfügen
                    status6Vehicles.forEach(vehicle => {
                        const row = document.createElement('tr');
                        const buildingName = buildingMap[vehicle.building_id] || 'Unbekannt';
                        const buildingLink = `https://www.leitstellenspiel.de/buildings/${vehicle.building_id}`; // Link zur Wache
                        const vehicleLink = `https://www.leitstellenspiel.de/vehicles/${vehicle.id}`; // Link zum Fahrzeug

                        row.innerHTML = `
                            <td>
                                <a href="${vehicleLink}" target="_blank" style="color: ${colors.vehicleLink}; text-decoration: none;">
                                    ${vehicle.caption}
                                </a>
                            </td>
                            <td>
                                <a href="${buildingLink}" target="_blank" style="color: ${colors.buildingLink}; text-decoration: none;">
                                    ${buildingName}
                                </a>
                            </td>
                            <td>${vehicle.fms_real}</td>
                            <td>
                                <button class="btn btn-success" data-id="${vehicle.id}">
                                    In S2 versetzen
                                </button>
                            </td>
                        `;
                        tableBody.appendChild(row);

                        // Event-Listener für den Status-Änderungs-Button
                        const button = row.querySelector('button');
                        button.addEventListener('click', function (event) {
                            event.preventDefault(); // Verhindert die Standardaktion
                            const vehicleId = event.target.getAttribute('data-id');
                            changeVehicleStatus(vehicleId, vehicle.caption); // Fahrzeugbeschreibung wird jetzt übergeben
                        });
                    });

                    updateTableColors();
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

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function (response) {
                if (response.status === 200) {

                    // Button aktualisieren
                    const button = document.querySelector(`#vehicle-table-body button[data-id='${vehicleId}']`);
                    if (button) {
                        button.disabled = true;
                        button.textContent = `Status geändert (${vehicleCaption})`;
                        button.classList.remove('btn-success');
                        button.classList.add('btn-secondary');
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
