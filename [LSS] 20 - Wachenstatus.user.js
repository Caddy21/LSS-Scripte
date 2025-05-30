// ==UserScript==
// @name         [LSS] Wachenstatus
// @namespace    https://www.leitstellenspiel.de/
// @version      1.1
// @description  Zeigt in der Gebäudeübersicht der LST den Status der Wachen an.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/buildings/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    
    const SORT_BY_ACTIVE_STATUS = true; // true = nach aktiv/inaktiv sortieren, false = keine automatische Sortierung

    const buildingStatusMap = new Map();

    function updateButtonStyle(button, enabled) {
        button.style.backgroundColor = enabled ? '#4CAF50' : '#f44336';
        button.style.borderColor = enabled ? '#4CAF50' : '#f44336';
    }

    const observer = new MutationObserver(() => {
        const table = document.querySelector('#lightbox_iframe_1, #lightbox_iframe_2, #lightbox_iframe_3')?.contentDocument?.querySelector('#building_table') ||
                      document.querySelector('#building_table');

        if (!table) return;
        observer.disconnect();

        let checkCount = 0;
        const interval = setInterval(() => {
            const bodyRows = table.querySelectorAll('tbody tr');
            if (bodyRows.length === 0 || bodyRows[0].children.length < 3) {
                checkCount++;
                if (checkCount > 10) clearInterval(interval);
                return;
            }

            clearInterval(interval);
            fetch('/api/buildings')
                .then(response => response.json())
                .then(data => {
                    data.forEach(b => buildingStatusMap.set(b.id.toString(), b.enabled));
                    injectButtons(table);
                });
        }, 300);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    function injectButtons(table) {
        const theadRow = table.querySelector('thead tr.tablesorter-headerRow');
        if (!theadRow) return console.warn('[Umschalten-Skript] Kein Tabellenkopf gefunden.');

        const newTh = document.createElement('th');
        newTh.innerHTML = '<div class="tablesorter-header-inner">Status</div>';
        newTh.setAttribute('scope', 'col');
        newTh.style.whiteSpace = 'nowrap';

        const ths = theadRow.querySelectorAll('th');
        let insertBeforeTh = null;
        ths.forEach(th => {
            if (th.textContent.trim() === 'Ausbaustufe') {
                insertBeforeTh = th;
            }
        });

        theadRow.insertBefore(newTh, insertBeforeTh);
        const allThs = theadRow.querySelectorAll('th');
        const newColumnIndex = Array.from(allThs).indexOf(newTh);

        const bodyRows = table.querySelectorAll('tbody tr');
        bodyRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const nameLink = row.querySelector('td a[href^="/buildings/"]');
            if (!nameLink) return;

            const buildingId = nameLink.getAttribute('href')?.split('/')[2];
            const enabled = buildingStatusMap.get(buildingId);

            const newTd = document.createElement('td');
            newTd.setAttribute('data-sort-value', enabled ? '1' : '0');

            const button = document.createElement('a');
            button.href = '#';
            button.textContent = enabled ? 'Deaktivieren' : 'Aktivieren';
            button.className = 'btn btn-xs';
            button.style.minWidth = '90px';
            button.style.color = '#fff';
            updateButtonStyle(button, enabled);

            button.addEventListener('click', e => {
                e.preventDefault();
                fetch(`/buildings/${buildingId}/active`, {
                    method: 'GET',
                    credentials: 'include'
                }).then(() => {
                    const newStatus = !buildingStatusMap.get(buildingId);
                    buildingStatusMap.set(buildingId, newStatus);
                    updateButtonStyle(button, newStatus);
                    button.textContent = newStatus ? 'Deaktivieren' : 'Aktivieren';
                    newTd.setAttribute('data-sort-value', newStatus ? '1' : '0');
                    $(table).trigger('update');
                }).catch(err => {
                    console.warn(`[Umschalten-Skript] Fehler beim Umschalten von Gebäude ${buildingId}:`, err);
                });
            });

            newTd.appendChild(button);
            row.insertBefore(newTd, cells[2]);
        });

        $(table).trigger('update');
        $(table).tablesorter(); // Tabelle neu initialisieren

        // Sortierung auslösen nur wenn gewünscht
        if (SORT_BY_ACTIVE_STATUS) {
            $(table).trigger("sorton", [[[newColumnIndex, 0]]]); // 0 = aufsteigend (z.B. zuerst deaktivierte Wachen)
        }
    }

})();
