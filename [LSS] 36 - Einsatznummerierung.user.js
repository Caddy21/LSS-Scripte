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

    // 🔧 Einstellungen
    const ZAHLEN_FARBE  = "#ff8000";   // Orange
    const ZAHLEN_GROESSE = "x-large";  // z. B. "large", "x-large", "24px", "120%"

    // alle relevanten Container-IDs
    const LIST_IDS = [
        "mission_list",
        "mission_list_sicherheitswache",
        "mission_list_sicherheitswache_alliance",
        "mission_list_alliance",
        "mission_list_alliance_event"
    ];

    function nummeriereEinsaetze(container) {
        const einsaetze = Array.from(container.querySelectorAll('.missionSideBarEntry'));

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
            nummer.style.fontSize = ZAHLEN_GROESSE;
            nummer.style.color = ZAHLEN_FARBE;

            heading.insertBefore(nummer, alarmButton);
        });
    }

    function beobachteListe(container) {
        if (!container) return;
        const observer = new MutationObserver(() => nummeriereEinsaetze(container));
        observer.observe(container, { childList: true, subtree: true });
        nummeriereEinsaetze(container);
    }

    // alle definierten Container überwachen
    LIST_IDS.forEach(id => {
        const container = document.getElementById(id);
        if (container) beobachteListe(container);
    });

})();

