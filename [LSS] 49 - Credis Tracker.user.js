// ==UserScript==
// @name         [LSS] - Credits Tracker
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Zeigt den echten Verdienst für Sicherheitswachen (eigene + Verband) direkt in der Einsatzliste an und löscht abgeschlossene Einsätze automatisch aus dem LocalStorage.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const SCAN_INTERVAL = 60_000; // 1 Minute
    const STORAGE_KEY = 'lss_verdienst_map';

    // 🔹 Map aus LocalStorage laden
    const creditMap = new Map(
        JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    );

    const lists = [
        { id: 'mission_list_sicherheitswache', label: 'Eigene' },
        { id: 'mission_list_sicherheitswache_alliance', label: 'Verband' }
    ];

    function saveMap() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...creditMap]));
    }

    function applyLabel(missionRow, creditsNumber) {
        if (missionRow.querySelector('.real-credit-label')) return;

        const alarmBtn = missionRow.querySelector('.mission-alarm-button');
        if (!alarmBtn) return;

        const label = document.createElement('span');
        label.className = 'label real-credit-label';
        label.style.marginLeft = '6px';
        label.textContent = `${creditsNumber.toLocaleString('de-DE')} Cr`;

        // 🎨 Zahl einfärben nach Wert
        if (creditsNumber >= 10000) {
            label.style.color = '#FF0000'; // Rot
        } else if (creditsNumber >= 2000) {
            label.style.color = '#FFA500'; // Orange
        } else {
            label.style.color = '#00FF00'; // Grün
        }

        alarmBtn.after(label);
    }

    function setupList(listConfig) {
        const container = document.querySelector(`#${listConfig.id}`);
        if (!container) {
            return;
        }

        let lastScan = 0;

        function loadCredits(missionId, missionRow) {
            if (creditMap.has(missionId)) {
                applyLabel(missionRow, creditMap.get(missionId));
                return;
            }

            fetch(`/missions/${missionId}`)
                .then(r => r.text())
                .then(html => {
                    const match = html.match(/Verdienst:\s*([\d\.]+)\s*Credits/i);
                    if (!match) return;

                    const creditsNumber = parseInt(match[1].replace(/\./g, ''), 10);

                    creditMap.set(missionId, creditsNumber);
                    saveMap();

                    applyLabel(missionRow, creditsNumber);
                });
        }

        function scan(force = false) {
            const now = Date.now();
            if (!force && now - lastScan < SCAN_INTERVAL) return;
            lastScan = now;

            const missions = container.querySelectorAll('[id^="mission_"]');

            missions.forEach(row => {
                const missionId = row.getAttribute('mission_id');
                if (!missionId) return;
                loadCredits(missionId, row);
            });
        }

        // Initial Scan
        scan(true);

        // Observer für neue Einsätze + Throttle
        const observer = new MutationObserver(() => scan());
        observer.observe(container, { childList: true, subtree: true });

        // 🔹 Observer für entfernte Einsätze → Map bereinigen
        const removalObserver = new MutationObserver(mutations => {
            mutations.forEach(m => {
                m.removedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.id && node.id.startsWith('mission_')) {
                        const missionId = node.getAttribute('mission_id');
                        if (missionId && creditMap.has(missionId)) {
                            creditMap.delete(missionId);
                            saveMap();
                        }
                    }
                });
            });
        });
        removalObserver.observe(container, { childList: true, subtree: true });
    }

    // Setup für alle Listen
    lists.forEach(setupList);

})();
