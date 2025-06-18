// ==UserScript==
// @name         [LSS] Personal-Soll-Checker
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
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

            // Alten Indikator entfernen, falls vorhanden
            let oldIndicator = wrapper.querySelector(".personnel-missing-indicator");
            if (oldIndicator) oldIndicator.remove();

            if (target > 0 && current < target) {
                const span = document.createElement("span");
                span.className = "personnel-missing-indicator";
                span.textContent = ` Personal (Aktuell ${current} / Soll ${target})`;
                span.style.marginLeft = "4px";
                span.style.fontWeight = "bold";

                link.after(span);
            }
        });
    }

    // Initial ausführen
    await highlightUnderstaffedBuildings();

    // Wiederholung z. B. alle 60 Sekunden
    setInterval(highlightUnderstaffedBuildings, 60000);

    // MutationObserver für Gebäudeliste (wenn vorhanden)
    const buildingListContainer = document.querySelector("#building_list");

    if (buildingListContainer) {
        const observer = new MutationObserver(() => {
            highlightUnderstaffedBuildings();
        });

        observer.observe(buildingListContainer, { childList: true, subtree: true });
    } else {
        console.warn("[LSS Personal-Soll-Checker] Gebäudeliste nicht gefunden - MutationObserver nicht gestartet.");
    }
})();
