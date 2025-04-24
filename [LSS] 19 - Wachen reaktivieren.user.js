// ==UserScript==
// @name         [LSS] Wachen reaktivieren 
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Zeigt deaktivierte Wachen an und erlaubt das Umschalten dieser.
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

                if (disabled.length === 0) {
                    alert('Alle Wachen sind aktiv. Es gibt keine inaktiven Wachen.');
                    return;
                }

                disabled.sort((a, b) => a.caption.localeCompare(b.caption));

                const overlay = document.createElement('div');
                overlay.classList.add('lss-darkmode-overlay');

                const closeButton = document.createElement('button');
                closeButton.textContent = 'Schließen';
                closeButton.classList.add('btn', 'btn-danger');
                closeButton.style.marginBottom = '20px';
                closeButton.addEventListener('click', () => overlay.remove());

                const table = document.createElement('table');
                table.classList.add('table', 'table-striped', 'table-bordered');
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

    // Überprüfen, ob die Seite im Darkmode oder Whitemode ist
    function getCurrentMode() {
        const bodyClass = document.body.classList;

        if (bodyClass.contains('dark')) {
            return 'dark';
        } else {
            return 'light';
        }
    }

    // Funktion, um das Styling entsprechend dem Modus anzupassen
    function applyStyles(mode) {
        GM_addStyle(`
            .lss-darkmode-overlay {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                z-index: 10000;
                overflow: auto;
                padding: 20px;
            }

            .lss-darkmode-overlay .table {
                width: 100%;
                border-collapse: collapse;
            }

            .lss-darkmode-overlay th, .lss-darkmode-overlay td {
                padding: 8px;
                border: 1px solid #ccc;
            }

            .lss-darkmode-overlay button {
                margin: 5px;
            }

            ${mode === 'dark' ? `
                .lss-darkmode-overlay {
                    background-color: rgba(0, 0, 0, 0.85);
                    color: white;
                }

                .lss-darkmode-overlay tbody tr:nth-child(odd) {
                    background-color: #2a2a2a;
                }

                .lss-darkmode-overlay tbody tr:nth-child(even) {
                    background-color: #1e1e1e;
                }

                .lss-darkmode-overlay .btn.btn-danger {
                    background-color: #dc3545;
                    color: white;
                }

                .lss-darkmode-overlay .btn.btn-default {
                    background-color: #f8f9fa;
                    color: black;
                }

                .lss-darkmode-overlay .btn.btn-success {
                    background-color: #28a745;
                    color: white;
                }
            ` : `
                .lss-darkmode-overlay {
                    background-color: rgba(255, 255, 255, 0.95);
                    color: black;
                }

                .lss-darkmode-overlay tbody tr:nth-child(odd) {
                    background-color: #f9f9f9;
                }

                .lss-darkmode-overlay tbody tr:nth-child(even) {
                    background-color: #ffffff;
                }

                .lss-darkmode-overlay .btn.btn-danger {
                    background-color: #dc3545;
                    color: white;
                }

                .lss-darkmode-overlay .btn.btn-default {
                    background-color: #f8f9fa;
                    color: black;
                }

                .lss-darkmode-overlay .btn.btn-success {
                    background-color: #28a745;
                    color: white;
                }
            `}
        `);
    }

    // Anwendung starten
    window.addEventListener('load', () => {
        const mode = getCurrentMode();
        applyStyles(mode);
        insertButtons();
    });

})();
