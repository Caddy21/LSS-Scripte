// ==UserScript==
// @name         [LSS] Alliance Credit Filter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Zeigt nur Einsätze über einer gewählten Mindest-Credit-Grenze in der Verbandsfreigabe an
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.info("LSS Missions Filter Button startet...");

    let minCredits = 5000;
    const values = [3000,4000,5000,6000,7000,8000,9000,10000];
    let observerStarted = false;

    function filterMissions() {
        const missionList = document.getElementById("mission_list_alliance");
        if (!missionList) return;

        const missions = missionList.querySelectorAll("div[id^='mission_']");
        missions.forEach(mission => {
            const sortable = mission.getAttribute("data-sortable-by");
            if (!sortable) return;

            try {
                const data = JSON.parse(sortable.replace(/&quot;/g,'"'));
                mission.style.display = data.average_credits < minCredits ? "none" : "";
            } catch(e) {
                console.error("Fehler beim Parsen von data-sortable-by:", e);
            }
        });

        console.info("Filter angewendet, Mindest-Credits:", minCredits);
    }

    function addButton() {
        const ref = document.getElementById("mission_select_sicherheitswache");
        if (!ref) {
            console.log("mission_select_sicherheitswache noch nicht gefunden, retry in 500ms...");
            return false;
        }

        if (document.getElementById("creditsFilterButton")) return true; // schon erstellt

        const btn = document.createElement("button");
        btn.id = "creditsFilterButton";
        btn.className = "btn btn-xs btn-primary";
        btn.style.marginLeft = "5px";
        btn.textContent = `Freigaben ab ${minCredits}`;

        btn.addEventListener("click", () => {
            const index = values.indexOf(minCredits);
            minCredits = values[(index+1) % values.length];
            btn.textContent = `Freigaben ab ${minCredits}`;
            filterMissions();
        });

        ref.insertAdjacentElement("afterend", btn);
        console.info("Filter-Button hinzugefügt rechts neben Sicherheitswache");
        return true;
    }

    function initObserver() {
        if (observerStarted) return;

        const missionList = document.getElementById("mission_list_alliance");
        if (!missionList) return;

        const observer = new MutationObserver(() => filterMissions());
        observer.observe(missionList, { childList: true, subtree: true });
        observerStarted = true;
        console.info("MutationObserver für neue Einsätze gestartet");
    }

    // Polling bis Button eingefügt werden kann
    const interval = setInterval(() => {
        if (addButton()) {
            filterMissions();
            initObserver();
            clearInterval(interval);
            console.info("Initialisierung abgeschlossen");
        }
    }, 500);

})();
