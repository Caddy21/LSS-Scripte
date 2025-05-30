// ==UserScript==
// @name         [LSS] Einsatzzähler
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Zählt eigene angefahrene Einsätze, archiviert monatlich (nur gezählte), übersichtliches Archiv nach Jahr/Monat, modernes UI-Schema.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- Monatsarchiv Hilfsfunktionen ---
    function getCurrentMonthKey() {
        const now = new Date();
        return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    }

    const einsatzCounterKey = 'einsatzCounter';
    const einsatzArchiveKey = 'einsatzCounterArchive';
    const einsatzNameMapKey = 'einsatzNameMap';
    const countedMissionsKey = 'countedMissions';

    function loadArchive() {
        return JSON.parse(localStorage.getItem(einsatzArchiveKey)) || {};
    }

    function saveArchive(archive) {
        localStorage.setItem(einsatzArchiveKey, JSON.stringify(archive));
    }

    // --- Monatswechsel prüfen und ggf. archivieren ---
    let einsatzCounter = JSON.parse(localStorage.getItem(einsatzCounterKey)) || {};
    let einsatzNameMap = {};
    let countedMissions = new Set(JSON.parse(localStorage.getItem(countedMissionsKey)) || []);

    const lastSavedMonth = localStorage.getItem('einsatzCounterLastMonth');
    const currentMonth = getCurrentMonthKey();

    if (lastSavedMonth !== currentMonth) {
        // Nur gezählte Einsätze ins Archiv
        if (lastSavedMonth && Object.keys(einsatzCounter).length > 0) {
            const filtered = {};
            Object.entries(einsatzCounter).forEach(([name, count]) => {
                if (count >= 1) filtered[name] = count;
            });
            if (Object.keys(filtered).length > 0) {
                const archive = loadArchive();
                archive[lastSavedMonth] = filtered;
                saveArchive(archive);
            }
        }
        // Zähler für neuen Monat zurücksetzen
        einsatzCounter = {};
        localStorage.setItem(einsatzCounterKey, JSON.stringify(einsatzCounter));
        localStorage.setItem('einsatzCounterLastMonth', currentMonth);
        countedMissions = new Set();
        localStorage.setItem(countedMissionsKey, JSON.stringify(Array.from(countedMissions)));
    }

    // --- Einsatznamen + Typen laden ---
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
        countExistingMissions();
    });

    // --- Menüpunkt einfügen ---
    const navUl = document.querySelector('.nav.navbar-nav.navbar-right');
    if (navUl) {
        const newItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = 'Einsatzzähler';
        link.addEventListener('click', toggleCounterUI);
        newItem.appendChild(link);
        navUl.appendChild(newItem);
    }

    let counterUI;
    let sortMethod = 'count';

    // --- UI-Funktionen ---
    function toggleCounterUI() {
        if (counterUI) {
            counterUI.remove();
            counterUI = null;
            return;
        }

        const isDarkMode = document.body.classList.contains('dark') ||
              getComputedStyle(document.body).backgroundColor === 'rgb(34, 34, 34)';

        const bgColor = isDarkMode ? '#2c2c2c' : '#fff';
        const textColor = isDarkMode ? '#f0f0f0' : '#000';
        const borderColor = isDarkMode ? '#555' : '#ccc';

        const style = document.createElement('style');
        style.innerHTML = `
            #einsatzCounterUI .scrollbar {
                scrollbar-width: none;
            }
            #einsatzCounterUI .scrollbar::-webkit-scrollbar {
                width: 0px;
            }
            #einsatzCounterArchiveModal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: ${bgColor};
                color: ${textColor};
                border: 2px solid ${borderColor};
                border-radius: 8px;
                box-shadow: 0 0 20px rgba(0,0,0,0.6);
                z-index: 20000;
                max-width: 90vw;
                max-height: 80vh;
                padding: 24px 16px 16px 16px;
                overflow: auto;
                font-size: 15px;
                min-width: 300px;
                min-height: 120px;
            }
            #einsatzCounterArchiveModalClose {
                position: absolute;
                top: 8px;
                right: 12px;
                background: transparent;
                color: ${textColor};
                border: none;
                font-size: 22px;
                font-weight: bold;
                cursor: pointer;
            }
            #einsatzCounterArchiveModal h3 {
                margin-top: 0;
                margin-bottom: 10px;
                color: ${textColor};
            }
            #einsatzCounterArchiveModal h4 {
                margin: 0 0 8px 0;
                font-size: 16px;
                color: ${textColor};
            }
            .einsatzSpoilerEntry {
                margin-left: 18px;
            }
        `;
        document.head.appendChild(style);

        counterUI = document.createElement('div');
        counterUI.id = 'einsatzCounterUI';
        Object.assign(counterUI.style, {
            position: 'fixed',
            top: '60px',
            right: '20px',
            backgroundColor: bgColor,
            color: textColor,
            border: `1px solid ${borderColor}`,
            padding: '10px',
            zIndex: 9999,
            maxHeight: '600px',
            width: '400px',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column'
        });

        const headerContainer = document.createElement('div');
        Object.assign(headerContainer.style, {
            position: 'sticky',
            top: '0',
            backgroundColor: bgColor,
            zIndex: '10',
            paddingBottom: '6px'
        });

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        Object.assign(closeBtn.style, {
            float: 'right',
            background: 'transparent',
            border: 'none',
            color: textColor,
            fontSize: '16px',
            cursor: 'pointer'
        });
        closeBtn.addEventListener('click', () => {
            counterUI.remove();
            counterUI = null;
        });

        const title = document.createElement('h4');
        title.textContent = 'Einsatzzähler';
        title.style.marginTop = '0';

        const searchInput = document.createElement('input');
        Object.assign(searchInput, {
            type: 'text',
            placeholder: 'Suchen...'
        });
        Object.assign(searchInput.style, {
            width: '100%',
            margin: '6px 0',
            padding: '4px',
            border: `1px solid ${borderColor}`,
            borderRadius: '4px',
            backgroundColor: isDarkMode ? '#444' : '#f9f9f9',
            color: textColor
        });
        searchInput.addEventListener('input', () => {
            filterTable(searchInput.value.trim().toLowerCase());
        });

        const sortByNameBtn = document.createElement('button');
        sortByNameBtn.textContent = 'Sortiere nach Namen';
        Object.assign(sortByNameBtn.style, {
            width: '100%',
            background: '#007bff',
            color: '#fff',
            border: 'none',
            padding: '6px',
            borderRadius: '4px',
            cursor: 'pointer',
            flex: '1'
        });
        sortByNameBtn.addEventListener('click', () => {
            sortCounterData('name');
        });

        const sortByCountBtn = document.createElement('button');
        sortByCountBtn.textContent = 'Sortiere nach Anzahl';
        Object.assign(sortByCountBtn.style, {
            width: '100%',
            background: '#28a745',
            color: '#fff',
            border: 'none',
            padding: '6px',
            borderRadius: '4px',
            cursor: 'pointer',
            flex: '1'
        });
        sortByCountBtn.addEventListener('click', () => {
            sortCounterData('count');
        });

        const sortButtonContainer = document.createElement('div');
        Object.assign(sortButtonContainer.style, {
            display: 'flex',
            gap: '6px',
            marginBottom: '6px'
        });
        sortButtonContainer.appendChild(sortByNameBtn);
        sortButtonContainer.appendChild(sortByCountBtn);

        const tableWrapper = document.createElement('div');
        tableWrapper.classList.add('scrollbar');
        Object.assign(tableWrapper.style, {
            overflowY: 'auto',
            maxHeight: '400px',
            marginTop: '10px'
        });

        const table = document.createElement('table');
        table.id = 'einsatzCounterTable';
        Object.assign(table.style, {
            width: '100%',
            borderCollapse: 'collapse'
        });

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th style="text-align:left; position:sticky; top:0; background-color:${bgColor}; z-index:5; border-bottom:1px solid ${borderColor}; white-space: nowrap;">Einsatz</th>
                <th style="text-align:right; position:sticky; top:0; background-color:${bgColor}; z-index:5; border-bottom:1px solid ${borderColor}; white-space: nowrap;">Anzahl</th>
            </tr>
        `;

        const tbody = document.createElement('tbody');
        table.appendChild(thead);
        table.appendChild(tbody);
        tableWrapper.appendChild(table);

        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Zähler zurücksetzen';
        Object.assign(resetBtn.style, {
            width: '100%',
            background: '#c00',
            color: '#fff',
            border: 'none',
            padding: '6px',
            borderRadius: '4px',
            cursor: 'pointer'
        });
        resetBtn.addEventListener('click', () => {
            if (confirm('Alle Zähler zurücksetzen?')) {
                for (let key in einsatzCounter) einsatzCounter[key] = 0;
                localStorage.setItem(einsatzCounterKey, JSON.stringify(einsatzCounter));
                updateCounterTable();
            }
        });

        // Archiv-Button (Grau, keine fette Schrift)
        const archiveBtn = document.createElement('button');
        archiveBtn.textContent = 'Archiv anzeigen';
        Object.assign(archiveBtn.style, {
            width: '100%',
            background: '#aaa',
            color: '#000',
            border: 'none',
            padding: '6px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '6px'
        });
        archiveBtn.addEventListener('click', showArchiveModal);

        const resetBtnContainer = document.createElement('div');
        Object.assign(resetBtnContainer.style, {
            position: 'sticky',
            bottom: '0',
            backgroundColor: bgColor,
            paddingTop: '10px',
            marginTop: '10px',
            zIndex: '10'
        });
        resetBtnContainer.appendChild(resetBtn);
        resetBtnContainer.appendChild(archiveBtn);

        // UI Struktur aufbauen
        headerContainer.appendChild(closeBtn);
        headerContainer.appendChild(title);
        counterUI.appendChild(headerContainer);
        counterUI.appendChild(searchInput);
        counterUI.appendChild(sortButtonContainer);
        counterUI.appendChild(tableWrapper);
        counterUI.appendChild(resetBtnContainer);

        document.body.appendChild(counterUI);
        updateCounterTable();
    }

    function showArchiveModal() {
        // Vorheriges Archiv-Modal entfernen
        const oldModal = document.getElementById('einsatzCounterArchiveModal');
        if (oldModal) oldModal.remove();

        // Modal erstellen
        const modal = document.createElement('div');
        modal.id = 'einsatzCounterArchiveModal';

        // Schließen-Button
        const closeBtn = document.createElement('button');
        closeBtn.id = 'einsatzCounterArchiveModalClose';
        closeBtn.textContent = '✕';
        closeBtn.onclick = () => modal.remove();
        modal.appendChild(closeBtn);

        // Überschrift
        const heading = document.createElement('h3');
        heading.textContent = 'Einsatz-Archiv';
        modal.appendChild(heading);

        // Archivdaten aufbereiten: Jahr → Monat → [Einsätze]
        const monateNamen = [
            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ];
        const archive = loadArchive();
        // Gruppieren nach Jahr und Monat
        const years = {};
        Object.entries(archive).forEach(([monthKey, data]) => {
            const [year, monthNum] = monthKey.split('-');
            if (!year || !monthNum || isNaN(monthNum) || !/^\d{4}$/.test(year)) return;
            const monthIndex = parseInt(monthNum, 10) - 1;
            if (monthIndex < 0 || monthIndex > 11) return;
            // Nur gezählte Einsätze
            const einsaetze = Object.entries(data).filter(([, count]) => count >= 1);
            if (einsaetze.length === 0) return;
            if (!years[year]) years[year] = {};
            years[year][monthIndex] = einsaetze;
        });

        // Sortiert nach Jahr absteigend, Monate aufsteigend
        const yearEntries = Object.entries(years).sort((a, b) => b[0] - a[0]);
        if (yearEntries.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = 'Keine archivierten Monate.';
            modal.appendChild(empty);
        } else {
            yearEntries.forEach(([year, months]) => {
                const yearHeader = document.createElement('h4');
                yearHeader.textContent = year;
                yearHeader.style.marginBottom = '8px';
                yearHeader.style.marginTop = '18px';
                yearHeader.style.color = 'inherit';
                modal.appendChild(yearHeader);

                // Monate sortiert aufsteigend (Januar bis Dezember)
                Object.entries(months).sort((a, b) => a[0] - b[0]).forEach(([monthIndex, einsaetze]) => {
                    const details = document.createElement('details');
                    const summary = document.createElement('summary');
                    summary.textContent = monateNamen[monthIndex];
                    details.appendChild(summary);

                    einsaetze.sort((a, b) => b[1] - a[1]).forEach(([einsatz, count]) => {
                        const entry = document.createElement('div');
                        entry.textContent = `${einsatz}: ${count}`;
                        entry.className = 'einsatzSpoilerEntry';
                        details.appendChild(entry);
                    });

                    modal.appendChild(details);
                });
            });
        }

        document.body.appendChild(modal);
    }

    function sortCounterData(method) {
        sortMethod = method;
        updateCounterTable();
    }

    function updateCounterTable() {
        const table = document.getElementById('einsatzCounterTable');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

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

    // --- Zählfunktionen ---
    function countExistingMissions() {
        const selectors = [
            '#mission_list',
            '#mission_list_krankentransporte',
            '#mission_list_alliance',
            '#mission_list_alliance_event',
            '#mission_list_sicherheitswache',
            '#mission_list_sicherheitswache_alliance'
        ];

        selectors.forEach(sel => {
            const existingMissions = document.querySelectorAll(`${sel} .missionSideBarEntry`);
            existingMissions.forEach(node => {
                if (!(node instanceof HTMLElement)) return;

                const missionId = node.getAttribute('mission_id');
                const missionTypeId = node.getAttribute('mission_type_id');
                if (!missionId || !missionTypeId || countedMissions.has(missionId)) return;

                const isAssigned = node.querySelector('.glyphicon-user:not(.hidden)');
                if (!isAssigned) return;

                const einsatzName = einsatzNameMap[missionTypeId];
                if (!einsatzName) {
                    console.warn(`[Einsatzzähler] Kein Name gefunden für mission_type_id=${missionTypeId}`);
                    return;
                }

                einsatzCounter[einsatzName] = (einsatzCounter[einsatzName] || 0) + 1;
                countedMissions.add(missionId);
                localStorage.setItem(einsatzCounterKey, JSON.stringify(einsatzCounter));
                localStorage.setItem(countedMissionsKey, JSON.stringify(Array.from(countedMissions)));

                const td = document.getElementById(`counter-${CSS.escape(einsatzName)}`);
                if (td) td.textContent = einsatzCounter[einsatzName];
            });
        });
    }

    function checkAndCountMission(node) {
        const isAssigned = node.querySelector('.glyphicon-user:not(.hidden)');
        if (!isAssigned) return;

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
        localStorage.setItem(einsatzCounterKey, JSON.stringify(einsatzCounter));
        localStorage.setItem(countedMissionsKey, JSON.stringify(Array.from(countedMissions)));

        const td = document.getElementById(`counter-${CSS.escape(einsatzName)}`);
        if (td) td.textContent = einsatzCounter[einsatzName];
    }

    // --- MutationObserver ---
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (!(node instanceof HTMLElement)) return;
                    checkAndCountMission(node);
                });
            }
            if (mutation.type === 'attributes') {
                const node = mutation.target;
                if (!(node instanceof HTMLElement)) continue;

                const missionEntry = node.closest('.missionSideBarEntry');
                if (missionEntry) checkAndCountMission(missionEntry);
            }
        }
    });

    const missionLists = [
        document.getElementById('mission_list'),
        document.getElementById('mission_list_krankentransporte'),
        document.getElementById('mission_list_alliance'),
        document.getElementById('mission_list_alliance_event'),
        document.getElementById('mission_list_sicherheitswache'),
        document.getElementById('mission_list_sicherheitswache_alliance')
    ];

    missionLists.forEach(list => {
        if (list) {
            observer.observe(list, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }
    });

})();
