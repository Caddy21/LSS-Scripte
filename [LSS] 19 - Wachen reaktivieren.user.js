// ==UserScript==
// @name         [LSS] Wachen reaktivieren
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Zeigt deaktivierte Wachen an und erlaubt das Umschalten dieser
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @connect      www.leitstellenspiel.de
// ==/UserScript==

(function () {
    'use strict';

    function insertButtons() {
        const buildingPanelBody = document.querySelector('#building_panel_body');
        if (!buildingPanelBody) return;

        const buttons = buildingPanelBody.querySelectorAll('button');
        const s6Button = Array.from(buttons).find(btn => btn.textContent.includes('Fahrzeuge im S6'));

        const disabledButton = document.createElement('button');
        disabledButton.textContent = 'Inaktive Wachen anzeigen';
        disabledButton.classList.add('btn', 'btn-danger');
        disabledButton.style.marginLeft = '10px';

        disabledButton.addEventListener('click', openDisabledBuildingsOverlay);

        if (s6Button && s6Button.parentNode) {
            s6Button.parentNode.insertBefore(disabledButton, s6Button.nextSibling);
        } else {
            buildingPanelBody.appendChild(disabledButton);
        }
    }

    function openDisabledBuildingsOverlay() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://www.leitstellenspiel.de/api/buildings',
            onload: function (response) {
                const buildings = JSON.parse(response.responseText);
                const disabled = buildings.filter(b => b.enabled === false);

                // Alphabetische Sortierung der deaktivierten Wachen nach ihrem Namen (caption)
                disabled.sort((a, b) => a.caption.localeCompare(b.caption));

                // Overlay erstellen
                const overlay = document.createElement('div');
                overlay.style = `
                    position: fixed;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background-color: rgba(0, 0, 0, 0.85);
                    color: white;
                    z-index: 10000;
                    overflow: auto;
                    padding: 20px;
                `;

                // Schließen-Button
                const closeButton = document.createElement('button');
                closeButton.textContent = 'Schließen';
                closeButton.classList.add('btn', 'btn-danger');
                closeButton.style.marginBottom = '20px';
                closeButton.addEventListener('click', () => overlay.remove());

                // Tabelle
                const table = document.createElement('table');
                table.classList.add('table', 'table-striped', 'table-bordered');
                table.style.color = 'white';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Aktion</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;

                const tbody = table.querySelector('tbody');

                // Jede deaktivierte Wache zur Tabelle hinzufügen
                disabled.forEach(building => {
                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${building.caption}</td>
                        <td>
                            <button class="btn btn-default btn-xs" data-id="${building.id}">
                                Umschalten
                            </button>
                        </td>
                    `;

                    const toggleButton = row.querySelector('button');
                    toggleButton.addEventListener('click', () => {
                        const id = toggleButton.getAttribute('data-id');
                        toggleButton.disabled = true;
                        toggleButton.textContent = 'Aktiviere...';

                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: `https://www.leitstellenspiel.de/buildings/${id}/active`,
                            onload: () => {
                                toggleButton.textContent = 'Aktiviert';
                                toggleButton.classList.remove('btn-default');
                                toggleButton.classList.add('btn-success');
                                row.style.opacity = 0.5;
                            },
                            onerror: () => {
                                toggleButton.textContent = 'Fehler!';
                                toggleButton.classList.add('btn-danger');
                            }
                        });
                    });

                    tbody.appendChild(row);
                });

                overlay.appendChild(closeButton);
                overlay.appendChild(table);
                document.body.appendChild(overlay);
            }
        });
    }

    window.addEventListener('load', insertButtons);
})();
