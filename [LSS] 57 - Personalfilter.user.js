// ==UserScript==
// @name         [LSS] Personalfilter
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Blendet unpassendes Personal auf der Zuweisungsseite aus
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/vehicles/*/zuweisung
// @match        https://polizei.leitstellenspiel.de/vehicles/*/zuweisung
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function filterPersonal() {
        const table = document.querySelector("#personal_table");
        if (!table) return;

        const rows = table.querySelectorAll("tbody tr");

        if (!rows.length) return;
        let highlightRows = table.querySelectorAll("tbody tr.highlight-row");

        // FALL 1: Highlight Rows vorhanden → nur diese anzeigen
        if (highlightRows.length > 0) {
            rows.forEach(row => {
                if (!row.classList.contains("highlight-row")) {
                    row.style.display = "none";
                }
            });
        }

        // FALL 2: Keine Highlight Rows → Ausbildung prüfen
        else {
            rows.forEach(row => {
                const ausbildungCell = row.children[1];
                if (!ausbildungCell) return;
                const ausbildung = ausbildungCell.textContent.trim();
                if (ausbildung !== "") {
                    row.style.display = "none";
                }
           });
        }
    }

    function waitForTable() {
        const observer = new MutationObserver(() => {
            if (document.querySelector("#personal_table tbody tr")) {
                filterPersonal();
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    waitForTable();
})();
