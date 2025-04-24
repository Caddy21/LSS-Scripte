// ==UserScript==
// @name         [LSS] Fahrzeuge im S6 auflisten
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Listet alle Fahrzeuge im S6 auf.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      www.leitstellenspiel.de
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// ==/UserScript==

(function () {
    'use strict';

    function getCurrentMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

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

    function insertButton() {
        const buildingPanelBody = document.querySelector('#building_panel_body');
        if (buildingPanelBody) {
            const button = document.createElement('button');
            button.textContent = 'Fahrzeuge im S6 anzeigen';
            button.classList.add('btn', 'btn-primary');

            button.addEventListener('click', () => {
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

                loadBuildingsAndVehiclesFiltered(loadingMessage);
            });

            buildingPanelBody.appendChild(button);
        } else {
            console.error('#building_panel_body nicht gefunden.');
        }
    }

    function loadBuildingsAndVehiclesFiltered(loadingMessage) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://www.leitstellenspiel.de/api/buildings',
            onload: function (response) {
                if (response.status === 200) {
                    const buildings = JSON.parse(response.responseText);
                    const buildingMap = {};
                    buildings.forEach(building => {
                        buildingMap[building.id] = building.caption;
                    });

                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: 'https://www.leitstellenspiel.de/api/vehicles',
                        onload: function (vehicleResponse) {
                            if (vehicleResponse.status === 200) {
                                const vehicles = JSON.parse(vehicleResponse.responseText);
                                const status6Vehicles = vehicles.filter(v => v.fms_real === 6);

                                loadingMessage.remove();

                                if (status6Vehicles.length === 0) {
                                    alert('Keine Fahrzeuge im Status 6 vorhanden.');
                                    return;
                                }

                                openOverlay(status6Vehicles, buildingMap);
                            } else {
                                loadingMessage.textContent = 'Fehler beim Laden der Fahrzeugdaten!';
                            }
                        },
                        onerror: () => {
                            loadingMessage.textContent = 'Fehler beim Laden der Fahrzeugdaten!';
                        }
                    });
                } else {
                    loadingMessage.textContent = 'Fehler beim Laden der Wachen!';
                }
            },
            onerror: () => {
                loadingMessage.textContent = 'Fehler beim Laden der Wachen!';
            }
        });
    }

    function openOverlay(status6Vehicles, buildingMap) {
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

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Schließen';
        closeButton.classList.add('btn', 'btn-danger');
        closeButton.style.marginBottom = '20px';
        closeButton.addEventListener('click', () => overlay.remove());

        const toggleColorsButton = document.createElement('button');
        toggleColorsButton.textContent = 'Farbauswahl einblenden';
        toggleColorsButton.classList.add('btn', 'btn-info');
        toggleColorsButton.style.marginBottom = '20px';

        const colorPickerContainer = document.createElement('div');
        colorPickerContainer.style.display = 'none';
        colorPickerContainer.style.marginBottom = '20px';

        toggleColorsButton.addEventListener('click', () => {
            colorPickerContainer.style.display = colorPickerContainer.style.display === 'none' ? 'block' : 'none';
            toggleColorsButton.textContent = colorPickerContainer.style.display === 'none' ? 'Farbauswahl einblenden' : 'Farbauswahl ausblenden';
        });

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

        const vehicleCountText = document.createElement('div');
        vehicleCountText.style.fontSize = '20px';
        vehicleCountText.style.fontWeight = 'bold';
        vehicleCountText.style.marginBottom = '20px';
        vehicleCountText.textContent = `Gesamtzahl der Fahrzeuge im Status 6: ${status6Vehicles.length}`;

        const table = document.createElement('table');
        table.classList.add('table', 'table-striped');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.tableLayout = 'fixed';
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

        overlay.appendChild(closeButton);
        overlay.appendChild(toggleColorsButton);
        overlay.appendChild(colorPickerContainer);
        overlay.appendChild(vehicleCountText);
        overlay.appendChild(table);
        document.body.appendChild(overlay);

        const tableBody = document.querySelector('#vehicle-table-body');

        status6Vehicles.sort((a, b) => a.caption.localeCompare(b.caption));

        status6Vehicles.forEach(vehicle => {
            const row = document.createElement('tr');
            const buildingName = buildingMap[vehicle.building_id] || 'Unbekannt';
            const buildingLink = `https://www.leitstellenspiel.de/buildings/${vehicle.building_id}`;
            const vehicleLink = `https://www.leitstellenspiel.de/vehicles/${vehicle.id}`;

            row.innerHTML = `
                <td><a href="${vehicleLink}" target="_blank" style="color: ${colors.vehicleLink}; text-decoration: none;">${vehicle.caption}</a></td>
                <td><a href="${buildingLink}" target="_blank" style="color: ${colors.buildingLink}; text-decoration: none;">${buildingName}</a></td>
                <td>${vehicle.fms_real}</td>
                <td><button class="btn btn-success" data-id="${vehicle.id}">In S2 versetzen</button></td>
            `;

            tableBody.appendChild(row);

            const button = row.querySelector('button');
            button.addEventListener('click', function (event) {
                event.preventDefault();
                const vehicleId = event.target.getAttribute('data-id');
                changeVehicleStatus(vehicleId, vehicle.caption);
            });
        });

        updateTableColors();
    }

    function updateTableColors() {
        const rows = document.querySelectorAll('#vehicle-table-body tr');
        rows.forEach(row => {
            const vehicleLink = row.querySelector('td a');
            const buildingLink = row.querySelectorAll('td a')[1];
            if (vehicleLink) vehicleLink.style.color = colors.vehicleLink;
            if (buildingLink) buildingLink.style.color = colors.buildingLink;
        });
    }

    function changeVehicleStatus(vehicleId, vehicleCaption) {
        const url = `https://www.leitstellenspiel.de/vehicles/${vehicleId}/set_fms/2`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function (response) {
                if (response.status === 200) {
                    const button = document.querySelector(`#vehicle-table-body button[data-id='${vehicleId}']`);
                    if (button) {
                        button.disabled = true;
                        button.textContent = `Status geändert (${vehicleCaption})`;
                        button.classList.remove('btn-success');
                        button.classList.add('btn-secondary');

                        const statusCell = button.parentElement.previousElementSibling;
                        if (statusCell) {
                            statusCell.textContent = "2";
                            statusCell.style.backgroundColor = '#28a745';
                            statusCell.style.color = '#ffffff';
                            statusCell.style.fontWeight = 'bold';
                        }
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

    window.addEventListener('load', insertButton);
})();
