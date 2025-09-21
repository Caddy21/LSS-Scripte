// ==UserScript==
// @name         [LSS] 36 - Einsatznummerierung
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Nummeriert alle Einsätze im mission_list nach Erstellungszeitpunkt und fügt die Zahl vor dem Alarmbutton ein, in Orange hervorgehoben
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function nummeriereEinsaetze() {
        const einsaetze = Array.from(document.querySelectorAll('#mission_list .missionSideBarEntry'));

        // Nach Erstellungszeitpunkt sortieren (created_at aus data-sortable-by)
        einsaetze.sort((a, b) => {
            const dataA = JSON.parse(a.getAttribute("data-sortable-by"));
            const dataB = JSON.parse(b.getAttribute("data-sortable-by"));
            return dataA.created_at - dataB.created_at;
        });

        // Nummerierung einfügen
        einsaetze.forEach((einsatz, index) => {
            const heading = einsatz.querySelector(".panel-heading");
            const alarmButton = heading?.querySelector(".mission-alarm-button");

            if (!heading || !alarmButton) return;

            // Verhindern, dass doppelt eingefügt wird
            if (heading.querySelector(".einsatz-nummer")) return;

            const nummer = document.createElement("span");
            nummer.textContent = (index + 1) + " ";
            nummer.classList.add("einsatz-nummer");
            nummer.style.fontWeight = "bold";
            nummer.style.marginRight = "6px";
            nummer.style.fontSize = "medium";
            nummer.style.color = "#ff8000"; // kräftiges Orange

            heading.insertBefore(nummer, alarmButton);
        });
    }

    // Beim Laden und bei Änderungen der Einsatzliste ausführen
    const missionList = document.getElementById("mission_list");
    if (missionList) {
        const observer = new MutationObserver(nummeriereEinsaetze);
        observer.observe(missionList, { childList: true, subtree: true });
    }

    // Initial
    nummeriereEinsaetze();

})();
