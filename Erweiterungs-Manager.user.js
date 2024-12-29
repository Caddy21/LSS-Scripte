// ==UserScript==
// @name         LSS Erweiterungshelfer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Listet Wachen auf, bei denen bestimmte Erweiterungen fehlen und ermöglicht das Hinzufügen dieser Erweiterungen.
// @author       Du
// @match        https://www.leitstellenspiel.de/*
// @grant        GM_xmlhttpRequest
// @connect      api.lss-manager.de
// @connect      leitstellenspiel.de
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log('Script gestartet');

    // Funktion zum Formatieren der Zahl
    function formatNumber(number) {
        return new Intl.NumberFormat('de-DE').format(number);
    }

    // Funktion zum Abrufen des CSRF-Tokens
    function getCSRFToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    // Manuelle Konfiguration der Erweiterungen
    const manualExtensions = {
        0: [ // Feuerwache (normal)
            { id: 16, name: 'Großlüfter', cost: 75000, coins: 25 },
            { id: 25, name: 'Bahnrettung', cost: 125000, coins: 30 }
        ],
        9: [ // THW
            { id: 3, name: 'Fachgruppe Wassergefahren', cost: 20000, coins: 15 }
        ]
        // Weitere Gebäudetypen und Erweiterungen hier hinzufügen
    };

    // Stile für das Interface
    const styles = `
    #extension-lightbox {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    }
    #extension-lightbox-content {
        background: var(--background-color, white);
        color: var(--text-color, black);
        border: 1px solid var(--border-color, black);
        padding: 20px;
        width: 80%;
        max-width: 1200px;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    }
    #extension-lightbox-content.dark {
        background: #2c2f33;
        color: #ffffff;
        border-color: #23272a;
    }
    #extension-lightbox-content.light {
        background: #ffffff;
        color: #000000;
        border-color: #dddddd;
    }
    #close-extension-helper {
        position: absolute;
        top: 10px;
        right: 10px;
        background: red;
        color: white;
        border: none;
        padding: 5px;
        cursor: pointer;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        font-size: 16px;
    }
    table th, table td {
        background-color: var(--background-color, #f2f2f2);
        color: var(--text-color, #000);
        border: 1px solid var(--border-color, black);
        padding: 8px;
        text-align: left;
    }
    table th {
        font-weight: bold;
    }
    .extension-button {
        background-color: var(--button-background-color, #007bff);
        color: var(--button-text-color, #ffffff);
        border: none;
        padding: 5px 10px;
        cursor: pointer;
        border-radius: 4px;
    }
    .extension-button:disabled {
        background-color: gray;
        cursor: not-allowed;
    }
    .extension-button:hover:enabled {
        background-color: var(--button-hover-background-color, #0056b3);
    }
    .build-all-button {
        background-color: var(--button-background-color, #28a745);
        color: var(--button-text-color, #ffffff);
        border: none;
        padding: 10px 20px;
        cursor: pointer;
        border-radius: 4px;
        margin-top: 10px;
    }
    .build-all-button:disabled {
        background-color: gray;
        cursor: not-allowed;
    }
    .build-all-button:hover:enabled {
        background-color: var(--button-hover-background-color, #218838);
    }
    .spoiler-button {
        background-color: red;
        color: #ffffff;
        border: none;
        padding: 10px 20px;
        cursor: pointer;
        border-radius: 4px;
        margin-top: 10px;
    }
    .spoiler-content {
        display: none;
    }
    .currency-selection {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid black;
        padding: 20px;
        z-index: 10001;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .currency-button {
        padding: 10px 20px;
        cursor: pointer;
        border-radius: 4px;
        border: none;
        color: #ffffff;
    }
    .credits-button {
        background-color: #28a745;
    }
    .coins-button {
        background-color: #dc3545;
    }
    .cancel-button {
        background-color: #6c757d;
        color: #ffffff;
        border: none;
        padding: 10px 20px;
        cursor: pointer;
        border-radius: 4px;
    }
    `;

    // Fügt die Stile hinzu
    const styleElement = document.createElement('style');
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);

    // Erstellt das Lightbox-Interface
    const lightbox = document.createElement('div');
    lightbox.id = 'extension-lightbox';
    lightbox.style.display = 'none';
    lightbox.innerHTML = `
        <div id="extension-lightbox-content">
            <button id="close-extension-helper">Schließen</button>
            <h2>Erweiterungshelfer</h2>
            <div id="extension-list">Lade Daten...</div>
        </div>
    `;
    document.body.appendChild(lightbox);

    const lightboxContent = lightbox.querySelector('#extension-lightbox-content');

    // Darkmode oder Whitemode anwenden
    function applyTheme() {
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        lightboxContent.classList.toggle('dark', isDarkMode);
        lightboxContent.classList.toggle('light', !isDarkMode);
    }

    // Event-Listener für Theme-Änderungen
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

    // Theme initial anwenden
    applyTheme();

    // Button im Profilmenü hinzufügen
    function addMenuButton() {
        const profileMenu = document.querySelector('#menu_profile + .dropdown-menu');
        if (profileMenu) {
            let menuButton = document.querySelector('#menu_profile + .dropdown-menu #open-extension-helper');
            if (!menuButton) {
                const divider = profileMenu.querySelector('li.divider');
                menuButton = document.createElement('li');
                menuButton.setAttribute('role', 'presentation');
                menuButton.innerHTML = '<a href="#" id="open-extension-helper">Erweiterungshelfer</a>';
                if (divider) {
                    profileMenu.insertBefore(menuButton, divider);
                } else {
                    profileMenu.appendChild(menuButton);
                }

                menuButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    lightbox.style.display = 'flex';
                    fetchBuildingsAndRender();
                });
            }
        } else {
            console.error('Profilmenü (#menu_profile + .dropdown-menu) nicht gefunden. Der Button konnte nicht hinzugefügt werden.');
        }
    }

    // Button regelmäßig überprüfen und hinzufügen
    const menuObserver = new MutationObserver(() => {
        addMenuButton();
    });
    menuObserver.observe(document.body, { childList: true, subtree: true });

    // Schließen-Button-Funktionalität
    document.getElementById('close-extension-helper').addEventListener('click', () => {
        lightbox.style.display = 'none';
    });

    // Funktion, um alle Gebäude und deren fehlenden Erweiterungen anzuzeigen
    function renderMissingExtensions(buildings) {
        const list = document.getElementById('extension-list');
        list.innerHTML = '';

        // Sortiere die Gebäude nach Typ
        buildings.sort((a, b) => a.building_type - b.building_type);

        const buildingGroups = {};

        buildings.forEach(building => {
            // Überspringe kleine Feuerwachen
            if (building.small_building) return;

            const extensions = manualExtensions[building.building_type];
            if (!extensions) return;

            // Liste der vorhandenen Erweiterungen im Gebäude
            const existingExtensions = new Set(building.extensions.map(e => e.type_id));

            const missingExtensions = extensions.filter(extension => !existingExtensions.has(extension.id));

            if (missingExtensions.length > 0) {
                if (!buildingGroups[building.building_type]) {
                    buildingGroups[building.building_type] = [];
                }
                buildingGroups[building.building_type].push({ building, missingExtensions });
            }
        });

        Object.keys(buildingGroups).forEach(buildingType => {
            const group = buildingGroups[buildingType];
            const sampleBuilding = group[0].building;

            const buildingHeader = document.createElement('h3');
            buildingHeader.textContent = `Typ: ${sampleBuilding.building_type === 0 ? 'Feuerwache' : sampleBuilding.building_type}`;
            list.appendChild(buildingHeader);

            const buildAllButton = document.createElement('button');
            buildAllButton.textContent = 'Erweiterung bei allen Wachen bauen';
            buildAllButton.classList.add('build-all-button');
            buildAllButton.onclick = () => confirmAndBuildAllExtensions(buildingType, group);
            list.appendChild(buildAllButton);

            const spoilerButton = document.createElement('button');
            spoilerButton.textContent = 'Details anzeigen';
            spoilerButton.classList.add('spoiler-button');
            spoilerButton.onclick = () => {
                const content = spoilerButton.nextElementSibling;
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
                spoilerButton.textContent = content.style.display === 'none' ? 'Details anzeigen' : 'Details ausblenden';
            };
            list.appendChild(spoilerButton);

            const tableWrapper = document.createElement('div');
            tableWrapper.className = 'spoiler-content';

            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Wache</th>
                        <th>Fehlende Erweiterung</th>
                        <th>Kosten</th>
                        <th>Coins</th>
                        <th>Aktion</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');

            group.forEach(({ building, missingExtensions }) => {
                missingExtensions.forEach(extension => {
                    const row = document.createElement('tr');

                    const nameCell = document.createElement('td');
                    nameCell.textContent = building.caption;
                    row.appendChild(nameCell);

                    const extensionCell = document.createElement('td');
                    extensionCell.textContent = extension.name;
                    row.appendChild(extensionCell);

                    const costCell = document.createElement('td');
                    costCell.textContent = `${formatNumber(extension.cost)} Credits`;
                    row.appendChild(costCell);

                    const coinsCell = document.createElement('td');
                    coinsCell.textContent = `${extension.coins} Coins`;
                    row.appendChild(coinsCell);

                    const actionCell = document.createElement('td');
                    const buildButton = document.createElement('button');
                    buildButton.textContent = 'Bauen';
                    buildButton.classList.add('extension-button');
                    buildButton.disabled = !missingExtensions.includes(extension);
                    buildButton.onclick = () => {
                        if (!buildButton.disabled) {
                            showCurrencySelection(building.id, extension.id, extension.cost, extension.coins);
                        }
                    };
                    actionCell.appendChild(buildButton);
                    row.appendChild(actionCell);

                    tbody.appendChild(row);
                });
            });

            tableWrapper.appendChild(table);
            list.appendChild(tableWrapper);
        });
    }

    // Funktion, um die Auswahl der Zahlungsmethode anzuzeigen
    function showCurrencySelection(buildingId, extensionId, cost, coins) {
        const selectionDiv = document.createElement('div');
        selectionDiv.className = 'currency-selection';

        const creditsButton = document.createElement('button');
        creditsButton.className = 'currency-button credits-button';
        creditsButton.textContent = `Credits: ${formatNumber(cost)}`;
        creditsButton.onclick = () => {
            confirmAndBuildExtension(buildingId, extensionId, cost, 'credits');
            document.body.removeChild(selectionDiv);
        };

        const coinsButton = document.createElement('button');
        coinsButton.className = 'currency-button coins-button';
        coinsButton.textContent = `Coins: ${coins}`;
        coinsButton.onclick = () => {
            confirmAndBuildExtension(buildingId, extensionId, coins);
            document.body.removeChild(selectionDiv);
        };

        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-button';
        cancelButton.textContent = 'Abbrechen';
        cancelButton.onclick = () => {
            document.body.removeChild(selectionDiv);
        };

        selectionDiv.appendChild(creditsButton);
        selectionDiv.appendChild(coinsButton);
        selectionDiv.appendChild(cancelButton);

        document.body.appendChild(selectionDiv);
    }

    // Funktion, um eine Erweiterung in einem Gebäude zu bauen nach Bestätigung
    function confirmAndBuildExtension(buildingId, extensionId, amount, currency) {
        const currencyText = currency === 'credits' ? 'Credits' : 'Coins';
        if (confirm(`Möchten Sie wirklich ${formatNumber(amount)} ${currencyText} für diese Erweiterung ausgeben?`)) {
            buildExtension(buildingId, extensionId, currency);
        }
    }

    // Funktion, um eine Erweiterung in einem Gebäude zu bauen
    function buildExtension(buildingId, extensionId, currency) {
        const csrfToken = getCSRFToken();
        console.log(`CSRF Token: ${csrfToken}`);
        console.log(`Building Extension: Building ID=${buildingId}, Extension ID=${extensionId}, Currency=${currency}`);

        const buildUrl = `/buildings/${buildingId}/extension/${currency}/${extensionId}`;
        GM_xmlhttpRequest({
            method: 'POST',
            url: buildUrl,
            headers: {
                'X-CSRF-Token': csrfToken,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            onload: function(response) {
                console.log(`Erweiterung in Gebäude ${buildingId} gebaut. Response:`, response);
                alert(`Erweiterung in Gebäude ${buildingId} gebaut.`);
                fetchBuildingsAndRender(); // Aktualisiert die Liste nach dem Bauen
            },
            onerror: function(error) {
                console.error(`Fehler beim Bauen der Erweiterung in Gebäude ${buildingId}.`, error);
                alert(`Fehler beim Bauen der Erweiterung in Gebäude ${buildingId}.`);
            }
        });
    }

    // Funktion, um eine Erweiterung in allen Gebäuden eines Typs zu bauen nach Bestätigung
    function confirmAndBuildAllExtensions(buildingType, group) {
        const totalCost = group.reduce((sum, { missingExtensions }) => {
            return sum + missingExtensions.reduce((extSum, ext) => extSum + ext.cost, 0);
        }, 0);

        const totalCoins = group.reduce((sum, { missingExtensions }) => {
            return sum + missingExtensions.reduce((extSum, ext) => extSum + ext.coins, 0);
        }, 0);

        const selectionDiv = document.createElement('div');
        selectionDiv.className = 'currency-selection';

        const creditsButton = document.createElement('button');
        creditsButton.className = 'currency-button credits-button';
        creditsButton.textContent = `Credits: ${formatNumber(totalCost)}`;
        creditsButton.onclick = () => {
            if (confirm(`Möchten Sie wirklich ${formatNumber(totalCost)} Credits für alle Erweiterungen ausgeben?`)) {
                buildAllExtensions(buildingType, group, 'credits');
                document.body.removeChild(selectionDiv);
            }
        };

        const coinsButton = document.createElement('button');
        coinsButton.className = 'currency-button coins-button';
        coinsButton.textContent = `Coins: ${totalCoins}`;
        coinsButton.onclick = () => {
            if (confirm(`Möchten Sie wirklich ${totalCoins} Coins für alle Erweiterungen ausgeben?`)) {
                buildAllExtensions(buildingType, group, 'coins');
                document.body.removeChild(selectionDiv);
            }
        };

        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-button';
        cancelButton.textContent = 'Abbrechen';
        cancelButton.onclick = () => {
            document.body.removeChild(selectionDiv);
        };

        selectionDiv.appendChild(creditsButton);
        selectionDiv.appendChild(coinsButton);
        selectionDiv.appendChild(cancelButton);

        document.body.appendChild(selectionDiv);
    }

    // Funktion, um eine Erweiterung in allen Gebäuden eines Typs zu bauen
    function buildAllExtensions(buildingType, group, currency) {
        group.forEach(({ building, missingExtensions }, index) => {
            missingExtensions.forEach((extension, extIndex) => {
                setTimeout(() => {
                    buildExtension(building.id, extension.id, currency);
                }, (index * missingExtensions.length + extIndex) * 100); // 100ms Verzögerung
            });
        });
    }

    // Daten von der API abrufen und fehlende Erweiterungen anzeigen
    function fetchBuildingsAndRender() {
        fetch('https://www.leitstellenspiel.de/api/buildings')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Fehler beim Abrufen der Daten');
                }
                return response.json();
            })
            .then(data => {
                console.log('Gebäudedaten abgerufen:', data);
                renderMissingExtensions(data);
            })
            .catch(error => {
                console.error('Es ist ein Fehler aufgetreten:', error);
                const list = document.getElementById('extension-list');
                list.innerHTML = 'Fehler beim Laden der Gebäudedaten.';
            });
    }

    // Initial den Button hinzufügen
    addMenuButton();

    // Daten von der API abrufen und fehlende Erweiterungen anzeigen
    fetchBuildingsAndRender();
})();