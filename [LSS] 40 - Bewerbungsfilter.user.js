// ==UserScript==
// @name         [LSS] Bewerbungsfilter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Blendet alle Gebäude aus, bei denen in der Bewerbungsphase kein "Automatisch"-Button vorhanden ist
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Warten, bis DOM fertig geladen ist
    function waitForTable() {
        const table = document.querySelector('#tab_buildings #building_table tbody');
        if (!table) {
            setTimeout(waitForTable, 500);
            return;
        }

        // Funktion zum Ausblenden von Zeilen ohne "Automatisch"-Button
        function hideRows() {
            const rows = table.querySelectorAll('tr');
            let hiddenCount = 0;

            rows.forEach(row => {
                const bewerbungsphaseCell = row.querySelector('td:nth-child(4)'); // 4. Spalte = Bewerbungsphase
                if (!bewerbungsphaseCell) return;

                // Prüfen, ob irgendwo in der Zelle "Automatisch" vorkommt
                const hasAutomatic = bewerbungsphaseCell.innerText.includes('Automatisch');

                if (!hasAutomatic) {
                    row.style.display = 'none';
                    hiddenCount++;
                }
            });

            console.log(`[LSS Script] ${hiddenCount} Gebäude ohne "Automatisch"-Button ausgeblendet.`);
        }

        hideRows();

        // Optional: Wenn sich der Inhalt dynamisch ändert (z. B. nach Tabs wechseln)
        const observer = new MutationObserver(() => hideRows());
        observer.observe(table, { childList: true, subtree: true });
    }

    waitForTable();
})();
