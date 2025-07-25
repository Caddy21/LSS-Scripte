// ==UserScript==
// @name         [LSS] Einsatzgruppierer
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Gruppiert gleichartige Einsätze in der Übersicht und ermöglicht das Ein-/Ausblenden ähnlicher Varianten über einen Button – für mehr Übersicht und weniger Scrollen.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/einsaetze*
// @grant        none
// ==/UserScript==

   (function () {
    'use strict';

    function debugLog(...args) {
        console.log('[LSS-Einsatz-Gruppierung]', ...args);
    }

    function normalizeName(name) {
        return name
            .toLowerCase()
            .replace(/–.*$/, '')
            .replace(/-.*$/, '')
            .replace(/\(.*?\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function createButton(label, onClick) {
        const btn = document.createElement('a');
        btn.href = 'javascript:void(0)';
        btn.className = 'btn btn-default';
        btn.textContent = label;
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', onClick);
        return btn;
    }

    function handleTableLayout() {
        debugLog('Versuche Tabelle zu gruppieren...');
        const tbody = document.querySelector('tbody');
        if (!tbody) {
            debugLog('Kein tbody gefunden!');
            return;
        }

        const rows = Array.from(tbody.querySelectorAll('tr'));
        if (!rows.length) {
            debugLog('Keine Tabellenzeilen gefunden!');
            return;
        }

        const groups = {};

        rows.forEach(row => {
            const link = row.querySelector('a[href^="/einsaetze/"]');
            if (!link) return;

            const name = link.textContent.trim();
            const key = normalizeName(name);

            if (!groups[key]) groups[key] = [];
            groups[key].push(row);
        });

        tbody.innerHTML = '';

        Object.values(groups).forEach(group => {
            const baseRow = group[0];
            const variants = group.slice(1);
            let variantRow = null;

            if (variants.length > 0) {
                const lastCell = baseRow.querySelector('td:last-child');
                if (!lastCell) {
                    debugLog('Kein letztes td gefunden für:', baseRow);
                    tbody.appendChild(baseRow);
                    return;
                }

                const toggleBtn = createButton('Overlays', () => {
                    if (variantRow.style.display === 'none') {
                        variantRow.style.display = '';
                        toggleBtn.textContent = 'Overlays';
                    } else {
                        variantRow.style.display = 'none';
                        toggleBtn.textContent = 'Overlays';
                    }
                });

                lastCell.appendChild(document.createTextNode(' '));
                lastCell.appendChild(toggleBtn);

                variantRow = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = baseRow.children.length;

                const innerTable = document.createElement('table');
                innerTable.style.width = '100%';

                variants.forEach(v => {
                    const clone = v.cloneNode(true);
                    innerTable.appendChild(clone);
                });

                td.appendChild(innerTable);
                variantRow.appendChild(td);
                variantRow.style.display = 'none';

                tbody.appendChild(baseRow);
                tbody.appendChild(variantRow);
            } else {
                tbody.appendChild(baseRow);
            }
        });
        debugLog('Tabelle gruppiert.');
    }

    function handleBoxLayout() {
    debugLog('Versuche Boxenlayout zu gruppieren...');
    const panels = Array.from(document.querySelectorAll('.panel.mission_type_index_searchable'));
    if (panels.length === 0) {
        debugLog('Keine Panels gefunden!');
        return;
    }

    const groups = {};

    panels.forEach(panel => {
        const nameLink = panel.querySelector('a.sort-by-name');
        if (!nameLink) return;
        const name = nameLink.textContent.trim();
        const key = normalizeName(name);
        if (!groups[key]) groups[key] = [];
        groups[key].push(panel);
    });

    const container = panels[0].parentNode;
    container.innerHTML = '';

    Object.values(groups).forEach(group => {
        const base = group[0];
        const variants = group.slice(1);
        let variantBox = null;

        container.appendChild(base);

        if (variants.length > 0) {
            // Suche den "Details"-Button-Link
            const detailsLink = base.querySelector('.col-xs-1 > a.btn.btn-default[href^="/einsaetze/"]');
            if (!detailsLink) {
                debugLog('Kein Details-Button gefunden in:', base);
                return;
            }
            // Eltern-Container (.col-xs-1) vom Details-Link
            const btnContainer = detailsLink.parentElement;

            // Flexbox damit Buttons nebeneinander stehen
            btnContainer.style.display = 'flex';
            btnContainer.style.alignItems = 'center';
            btnContainer.style.gap = '5px';

            const toggleBtn = createButton('Varianten anzeigen', () => {
                const visible = variantBox.style.display !== 'none';
                variantBox.style.display = visible ? 'none' : '';
                toggleBtn.textContent = visible ? 'Varianten anzeigen' : 'Varianten ausblenden';
            });

            btnContainer.appendChild(toggleBtn);

            variantBox = document.createElement('div');
            variantBox.style.display = 'none';
            variantBox.style.margin = '10px 0';

            variants.forEach(v => {
                const clone = v.cloneNode(true);
                variantBox.appendChild(clone);
            });

            container.appendChild(variantBox);
        }
    });
    debugLog('Boxenlayout gruppiert.');
}

    // Warte auf DOM fertig und ggf. weitere Ladezeiten
    function waitForContentAndRun() {
        const maxTries = 30;
        let tries = 0;

        const intervalId = setInterval(() => {
            tries++;
            if (document.readyState === 'complete' && (document.querySelector('tbody') || document.querySelector('.panel.mission_type_index_searchable'))) {
                clearInterval(intervalId);
                debugLog('Seite geladen, starte Gruppierung...');
                if (document.querySelector('tbody')) {
                    handleTableLayout();
                } else if (document.querySelector('.panel.mission_type_index_searchable')) {
                    handleBoxLayout();
                }
            }
            if (tries >= maxTries) {
                clearInterval(intervalId);
                debugLog('Timeout beim Warten auf Elemente.');
            }
        }, 500);
    }

    waitForContentAndRun();
})();
