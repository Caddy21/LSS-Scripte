// ==UserScript==
// @name         [LSS] Zeitentracker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Zeigt unter dem Einsatztitel Erstell- und Freigabezeit nur bei Verbandseinsätzen an
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function addAllianceMissionTimes() {
        const alliancePanel = document.getElementById("mission_list_alliance");
        if (!alliancePanel) return;

        alliancePanel.querySelectorAll(".panel-heading[id^='mission_panel_heading_']").forEach(header => {
            if (header.dataset.timeAdded) return;

            const missionId = header.id.replace("mission_panel_heading_", "");
            const missionEntry = document.querySelector(`#mission_${missionId}`);
            if (!missionEntry) return;

            const sortable = missionEntry.getAttribute("data-sortable-by");
            if (!sortable) return;

            try {
                const data = JSON.parse(sortable.replace(/&quot;/g,'"'));
                if (!data.created_at) return;

                const createdDate = new Date(data.created_at * 1000);
                const createdFormatted =
                    createdDate.toLocaleDateString("de-DE") + " " +
                    createdDate.toLocaleTimeString("de-DE", {hour:'2-digit', minute:'2-digit'});

                let ageFormatted = "";
                if (data.age) {
                    const ageDate = new Date(data.age * 1000);
                    ageFormatted =
                        ageDate.toLocaleDateString("de-DE") + " " +
                        ageDate.toLocaleTimeString("de-DE", {hour:'2-digit', minute:'2-digit'});
                }

                // Neue Zeile unter dem Header
                const infoDiv = document.createElement("div");
                infoDiv.style.fontWeight = "normal";
                infoDiv.style.fontSize = "12px";
                infoDiv.style.opacity = "0.8";
                infoDiv.style.marginTop = "2px";

                if (ageFormatted) {
                    infoDiv.textContent = `📅 erstellt: ${createdFormatted} | freigegeben: ${ageFormatted}`;
                } else {
                    infoDiv.textContent = `📅 erstellt: ${createdFormatted}`;
                }

                header.appendChild(infoDiv);
                header.dataset.timeAdded = "true";

            } catch(e) {
                console.log("Zeit konnte nicht gelesen werden", e);
            }
        });
    }

    setInterval(addAllianceMissionTimes, 2000);

})();
