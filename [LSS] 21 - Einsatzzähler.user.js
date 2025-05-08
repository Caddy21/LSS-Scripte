// ==UserScript==
// @name         [LSS] - Einsatzzähler
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Zählt alle eigene angefahrenen Einsätze in einer Tabelle an.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let sortMethod = 'count';

    const einsatzCounterKey = 'einsatzCounter';
    const einsatzNameMapKey = 'einsatzNameMap';
    const countedMissionsKey = 'countedMissions';

    let einsatzCounter = JSON.parse(localStorage.getItem(einsatzCounterKey)) || {};
    let einsatzNameMap = {};
    let countedMissions = new Set(JSON.parse(localStorage.getItem(countedMissionsKey)) || []); // Initialisiere aus localStorage


    // Einsatznamen + Typen laden
    fetch("https://www.leitstellenspiel.de/einsaetze.json")
        .then(res => res.json())
        .then(data => {
        data.forEach(einsatz => {
            einsatzNameMap[einsatz.id] = einsatz.name;
            if (!(einsatz.name in einsatzCounter)) {
                einsatzCounter[einsatz.name] = 0;
            }
        });
        localStorage.setItem(einsatzNameMapKey, JSON.stringify(einsatzNameMap));
        console.log(`[Einsatzzähler] ${data.length} Einsatznamen geladen.`);

        // Bestehende eigene Einsätze beim Seitenstart zählen
        countExistingMissions();
    });

    // Menüpunkt einfügen
    const navUl = document.querySelector('.nav.navbar-nav.navbar-right');
    if (navUl) {
        const newItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = 'Einsatzzähler';
        link.addEventListener('click', toggleCounterUI);
        newItem.appendChild(link);
        navUl.appendChild(newItem);
        console.log('[Einsatzzähler] Menüpunkt hinzugefügt.');
    }

    let counterUI;

    function toggleCounterUI() {
        if (counterUI) {
            counterUI.remove();
            counterUI = null;
            console.log('[Einsatzzähler] UI geschlossen.');
            return;
        }

        console.log('[Einsatzzähler] UI wird geöffnet.');

        const isDarkMode = document.body.classList.contains('dark') ||
              getComputedStyle(document.body).backgroundColor === 'rgb(34, 34, 34)';

        const bgColor = isDarkMode ? '#2c2c2c' : '#fff';
        const textColor = isDarkMode ? '#f0f0f0' : '#000';
        const borderColor = isDarkMode ? '#555' : '#ccc';

        counterUI = document.createElement('div');
        counterUI.id = 'einsatzCounterUI';
        counterUI.style.position = 'fixed';
        counterUI.style.top = '60px';
        counterUI.style.right = '20px';
        counterUI.style.backgroundColor = bgColor;
        counterUI.style.color = textColor;
        counterUI.style.border = `1px solid ${borderColor}`;
        counterUI.style.padding = '10px';
        counterUI.style.zIndex = 9999;
        counterUI.style.maxHeight = '600px';
        counterUI.style.width = '400px';
        counterUI.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        counterUI.style.borderRadius = '6px';

        const style = document.createElement('style');
        style.innerHTML = `
        #einsatzCounterUI .scrollbar {
            scrollbar-width: none;
        }

        #einsatzCounterUI .scrollbar::-webkit-scrollbar {
            width: 0px;
        }
    `;
        document.head.appendChild(style);

        const headerContainer = document.createElement('div');
        headerContainer.style.position = 'sticky';
        headerContainer.style.top = '0';
        headerContainer.style.backgroundColor = bgColor;
        headerContainer.style.zIndex = '10';
        headerContainer.style.paddingBottom = '6px';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.float = 'right';
        closeBtn.style.background = 'transparent';
        closeBtn.style.border = 'none';
        closeBtn.style.color = textColor;
        closeBtn.style.fontSize = '16px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', () => {
            counterUI.remove();
            counterUI = null;
            console.log('[Einsatzzähler] UI geschlossen.');
        });

        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Zähler zurücksetzen';
        resetBtn.style.marginBottom = '6px';
        resetBtn.style.width = '100%';
        resetBtn.style.background = '#c00';
        resetBtn.style.color = '#fff';
        resetBtn.style.border = 'none';
        resetBtn.style.padding = '4px';
        resetBtn.style.borderRadius = '4px';
        resetBtn.style.cursor = 'pointer';
        resetBtn.addEventListener('click', () => {
            if (confirm('Alle Zähler zurücksetzen?')) {
                for (let key in einsatzCounter) einsatzCounter[key] = 0;
                localStorage.setItem(einsatzCounterKey, JSON.stringify(einsatzCounter));
                updateCounterTable();
            }
        });

        const title = document.createElement('h4');
        title.textContent = 'Einsatzzähler';
        title.style.marginTop = '0';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Suchen...';
        searchInput.style.width = '100%';
        searchInput.style.margin = '6px 0';
        searchInput.style.padding = '4px';
        searchInput.style.border = `1px solid ${borderColor}`;
        searchInput.style.borderRadius = '4px';
        searchInput.style.backgroundColor = isDarkMode ? '#444' : '#f9f9f9';
        searchInput.style.color = textColor;
        searchInput.addEventListener('input', () => {
            filterTable(searchInput.value.trim().toLowerCase());
        });

        // Sortierbuttons hinzufügen
        const sortByNameBtn = document.createElement('button');
        sortByNameBtn.textContent = 'Sortiere nach Namen';
        sortByNameBtn.style.width = '100%';
        sortByNameBtn.style.marginBottom = '6px';
        sortByNameBtn.style.background = '#007bff';
        sortByNameBtn.style.color = '#fff';
        sortByNameBtn.style.border = 'none';
        sortByNameBtn.style.padding = '6px';
        sortByNameBtn.style.borderRadius = '4px';
        sortByNameBtn.style.cursor = 'pointer';
        sortByNameBtn.addEventListener('click', () => {
            sortCounterData('name');
        });

        const sortByCountBtn = document.createElement('button');
        sortByCountBtn.textContent = 'Sortiere nach Anzahl';
        sortByCountBtn.style.width = '100%';
        sortByCountBtn.style.marginBottom = '6px';
        sortByCountBtn.style.background = '#28a745';
        sortByCountBtn.style.color = '#fff';
        sortByCountBtn.style.border = 'none';
        sortByCountBtn.style.padding = '6px';
        sortByCountBtn.style.borderRadius = '4px';
        sortByCountBtn.style.cursor = 'pointer';
        sortByCountBtn.addEventListener('click', () => {
            sortCounterData('count');
        });

        const tableWrapper = document.createElement('div');
        tableWrapper.classList.add('scrollbar');
        tableWrapper.style.overflowY = 'auto';
        tableWrapper.style.maxHeight = '400px';
        tableWrapper.style.marginTop = '10px';

        const table = document.createElement('table');
        table.id = 'einsatzCounterTable';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';

        const thead = document.createElement('thead');
        thead.innerHTML = `
        <tr>
            <th style="text-align:left; position:sticky; top:0; background-color:${bgColor}; z-index:5; border-bottom:1px solid ${borderColor}; white-space: nowrap;">Einsatz</th>
            <th style="text-align:right; position:sticky; top:0; background-color:${bgColor}; z-index:5; border-bottom:1px solid ${borderColor}; white-space: nowrap;">Anzahl</th>
        </tr>
    `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        table.appendChild(tbody);

        tableWrapper.appendChild(table);

        headerContainer.appendChild(closeBtn);
        headerContainer.appendChild(title);
        counterUI.appendChild(headerContainer);
        counterUI.appendChild(resetBtn);
        counterUI.appendChild(searchInput);

        const sortButtonContainer = document.createElement('div');
        sortButtonContainer.style.display = 'flex';
        sortButtonContainer.style.gap = '6px';
        sortButtonContainer.style.marginBottom = '6px';

        sortByNameBtn.style.flex = '1';
        sortByCountBtn.style.flex = '1';

        sortButtonContainer.appendChild(sortByNameBtn);
        sortButtonContainer.appendChild(sortByCountBtn);

        counterUI.appendChild(sortButtonContainer);
        counterUI.appendChild(tableWrapper);
        document.body.appendChild(counterUI);

        updateCounterTable();
        console.log('[Einsatzzähler] UI angezeigt.');
    }

    function sortCounterData(method) {
        sortMethod = method;
        updateCounterTable();
    }

    function updateCounterTable() {
        const table = document.getElementById('einsatzCounterTable');
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        // Sortieren nach der gewählten Methode (Name oder Anzahl)
        let sortedEntries;
        if (sortMethod === 'count') {
            sortedEntries = Object.entries(einsatzCounter).sort((a, b) => b[1] - a[1]);
        } else {
            sortedEntries = Object.entries(einsatzCounter).sort((a, b) => a[0].localeCompare(b[0]));
        }

        sortedEntries.forEach(([name, count]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td style="padding: 4px 0;">${name}</td>
            <td style="text-align:right;" id="counter-${CSS.escape(name)}">${count}</td>`;
            tbody.appendChild(row);
        });
    }

    function filterTable(query) {
        const rows = document.querySelectorAll('#einsatzCounterTable tbody tr');
        rows.forEach(row => {
            const name = row.children[0].textContent.toLowerCase();
            row.style.display = name.includes(query) ? '' : 'none';
        });
    }

    function countExistingMissions() {
        const selectors = ['#mission_list', '#mission_list_krankentransporte', '#mission_list_sicherheitswache'];
        selectors.forEach(sel => {
            const existingMissions = document.querySelectorAll(`${sel} .missionSideBarEntry`);
            existingMissions.forEach(node => {
                if (!(node instanceof HTMLElement)) return;

                const missionId = node.getAttribute('mission_id');
                const missionTypeId = node.getAttribute('mission_type_id');
                if (!missionId || !missionTypeId || countedMissions.has(missionId)) return;

                const isAssigned = node.querySelector('.glyphicon-user:not(.hidden)');
                const isNotAssigned = node.querySelector('.glyphicon-asterisk:not(.hidden)');

                if (isAssigned && !isNotAssigned) {
                    const einsatzName = einsatzNameMap[missionTypeId];
                    if (!einsatzName) {
                        console.warn(`[Einsatzzähler] Kein Name gefunden für mission_type_id=${missionTypeId}`);
                        return;
                    }

                    einsatzCounter[einsatzName] = (einsatzCounter[einsatzName] || 0) + 1;
                    countedMissions.add(missionId);
                    console.log(`[Einsatzzähler] Bestehender eigener Einsatz gezählt: ${einsatzName} (ID ${missionId}) => ${einsatzCounter[einsatzName]}`);
                    localStorage.setItem(einsatzCounterKey, JSON.stringify(einsatzCounter));
                    localStorage.setItem(countedMissionsKey, JSON.stringify(Array.from(countedMissions)));

                    const td = document.getElementById(`counter-${CSS.escape(einsatzName)}`);
                    if (td) td.textContent = einsatzCounter[einsatzName];
                }
            });
        });
    }

    // Der Observer bleibt unverändert, aber stellt sicher, dass nur neue Einsätze gezählt werden
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(node => {
                if (!(node instanceof HTMLElement)) return;
                if (!node.querySelector('.glyphicon-user')) return;

                const missionId = node.getAttribute('mission_id');
                const missionTypeId = node.getAttribute('mission_type_id');
                if (!missionId || !missionTypeId || countedMissions.has(missionId)) return;

                const einsatzName = einsatzNameMap[missionTypeId];
                if (!einsatzName) {
                    console.warn(`[Einsatzzähler] Kein Name gefunden für mission_type_id=${missionTypeId}`);
                    return;
                }

                einsatzCounter[einsatzName] = (einsatzCounter[einsatzName] || 0) + 1;
                countedMissions.add(missionId);
                console.log(`[Einsatzzähler] Eigener Einsatz erkannt: ${einsatzName} (ID ${missionId}) => ${einsatzCounter[einsatzName]}`);
                localStorage.setItem(einsatzCounterKey, JSON.stringify(einsatzCounter));
                localStorage.setItem(countedMissionsKey, JSON.stringify(Array.from(countedMissions))); // Speichern der gezählten Einsätze

                const td = document.getElementById(`counter-${CSS.escape(einsatzName)}`);
                if (td) td.textContent = einsatzCounter[einsatzName];
            });
        }
    });

    const missionLists = [
        document.getElementById('mission_list'),
        document.getElementById('mission_list_krankentransporte'),
        document.getElementById('mission_list_sicherheitswache')
    ];

    missionLists.forEach(list => {
        if (list) {
            observer.observe(list, { childList: true, subtree: true });
            console.log(`[Einsatzzähler] Beobachter für ${list.id} gestartet.`);
        }
    });

})();
