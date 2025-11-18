// ==UserScript==
// @name         [LSS] 27 - Personal-Soll-Checker
// @namespace    https://www.leitstellenspiel.de/
// @version      1.1
// @description  Zeigt Personalstatus neben Gebäudenamen in der Gebäudeliste an
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    async function fetchBuildings() {
        try {
            const response = await fetch("https://www.leitstellenspiel.de/api/buildings");
            return await response.json();
        } catch (e) {
            console.error("[LSS Personal-Soll-Checker] Fehler beim Laden der Gebäude:", e);
            return [];
        }
    }

    async function highlightUnderstaffedBuildings() {
        const buildings = await fetchBuildings();

        buildings.forEach(building => {
            const id = building.id;
            const current = building.personal_count || 0;
            const target = building.personal_count_target || 0;

            const wrapper = document.querySelector(`#building_list_caption_${id}`);
            if (!wrapper) return;

            const link = wrapper.querySelector("a.map_position_mover");
            if (!link) return;

            // Alten Indikator entfernen
            let oldIndicator = wrapper.querySelector(".personnel-missing-indicator");
            if (oldIndicator) oldIndicator.remove();

            // Neuen Indikator einbauen
            if (target > 0 && current < target) {
                const span = document.createElement("span");
                span.className = "personnel-missing-indicator";
                span.innerHTML = `<br>Personal (Aktuell ${current} / Soll ${target})`;
                span.style.marginLeft = "4px";
                span.style.fontWeight = "bold";
                span.style.color = "darkorange";

                link.after(span);
            }
        });
    }

    // Einmalig beim Laden ausführen
    await highlightUnderstaffedBuildings();

})();
