// ==UserScript==
// @name         [LSS] 57 - Personalfilter
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

    function isInEducation(row) {
        return row.querySelector('[data-education-key]');
    }

    function isInVehicle(row) {
        const labels = row.querySelectorAll('span.label');

        return Array.from(labels).some(label => {
            return label.textContent.trim().startsWith('Im Fahrzeug:');
        });
    }

    function filterPersonal() {
        const table = document.querySelector("#personal_table");
        if (!table) return;

        const rows = table.querySelectorAll("tbody tr");

        if (!rows.length) return;

        const highlightRows = table.querySelectorAll("tbody tr.highlight-row");

        rows.forEach(row => {
            // Personal im Unterricht grundsätzlich ausblenden
            if (isInEducation(row)) {
                row.style.display = "none";
                return;
            }

            // Personal, das bereits auf einem anderen Fahrzeug sitzt, ausblenden
            if (isInVehicle(row)) {
                row.style.display = "none";
                return;
            }

            // FALL 1: Highlight Rows vorhanden → nur diese anzeigen
            if (highlightRows.length > 0) {
                if (!row.classList.contains("highlight-row")) {
                    row.style.display = "none";
                } else {
                    row.style.display = "";
                }

                return;
            }

            // FALL 2: Keine Highlight Rows → Ausbildung prüfen
            const btn = row.querySelector("a.btn");

            // Nur grüne Buttons (= Fahrzeug kann zugewiesen werden)
            if (!btn || !btn.classList.contains("btn-success")) {
                row.style.display = "none";
            } else {
                row.style.display = "";
            }
        });
    }

    function resetPersonalFilter() {
        document.querySelectorAll("#personal_table tbody tr").forEach(row => {
            row.style.display = "";
        });
    }

    function addResetButton() {
        if (document.getElementById("personalFilterReset")) return;

        const filterBox = document.querySelector(".vehicles-education-filter-box");
        if (!filterBox) return;

        const button = document.createElement("button");
        button.id = "personalFilterReset";
        button.className = "btn btn-warning";
        button.style.marginLeft = "10px";
        button.style.marginTop = "5px";
        button.textContent = "Filter zurücksetzen";

        button.addEventListener("click", resetPersonalFilter);

        filterBox.appendChild(button);
    }

    function waitForTable() {
        const observer = new MutationObserver(() => {
            if (document.querySelector("#personal_table tbody tr")) {
                addResetButton();
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
