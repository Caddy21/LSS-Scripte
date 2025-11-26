// ==UserScript==
// @name         [LSS] 42 - Wachenfilter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @author       Caddy21
// @description  Verbesserte Filterfunktion für Schulen im Leitstellenspiel
// @match        https://www.leitstellenspiel.de/buildings/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    const pageBuildingId = Number(location.pathname.split("/")[2]);
    if (!pageBuildingId) return;

    async function init() {
        const raw = await fetch("/api/buildings");
        const all = await raw.json();

        const school = all.find(b => b.id === pageBuildingId);
        if (!school) return;

        // Mapping building_id → API Datensatz (inkl small_building)
        const apiById = {};
        all.forEach(b => apiById[b.id] = b);

        addFilters(school.building_type, apiById);
    }

    // ---------------------------------------------------------
    // DEFINIERE FILTER JE SCHUL-TYP
    // ---------------------------------------------------------
    function addFilters(type, apiById) {
        let filters = [];

        if (type === 1) { // Feuerwehrschule
            filters = [
                { label: "FW Normal", fn: el => is(el, apiById, 0, false) },
                { label: "FW Klein",  fn: el => is(el, apiById, 0, true) }
            ];
        }

        else if (type === 8) { // Polizeischule
            filters = [
                { label: "Pol Normal", fn: el => is(el, apiById, 6, false) },
                { label: "Pol Klein",  fn: el => is(el, apiById, 6, true) },
                { label: "Be-Pol", fn: el => typeIs(el, 11) },
                { label: "Pol-Hubbi", fn: el => typeIs(el, 13) }
            ];
        }

        else if (type === 3) { // Rettungsschule
            filters = [
                // Normal / Klein korrekt getrennt
                { label: "RW Normal", fn: el => is(el, apiById, 2, false) },
                { label: "RW Klein",  fn: el => is(el, apiById, 2, true) },
                { label: "RTH", fn: el => typeIs(el, 5) },
                { label: "SEG", fn: el => typeIs(el, 12) },
                { label: "Wasserrettung", fn: el => typeIs(el, 15) },
                { label: "Bergrettung", fn: el => typeIs(el, 25) }
            ];
        }

        createButtons(filters);
    }

    // Hilfsfunktionen
    function typeIs(el, type) {
        return Number(el.getAttribute("building_type_id")) === type;
    }

    function is(el, apiById, type, small) {
        const id = Number(el.getAttribute("building_id"));
        const api = apiById[id];
        if (!api) return false;

        return api.building_type === type && api.small_building === small;
    }

    // ---------------------------------------------------------
    // BUTTON-UI
    // ---------------------------------------------------------
    function createButtons(filters) {
        const target = document.querySelector("#building-filters");
        if (!target) return;

        const bar = document.createElement("div");
        bar.style.display = "flex";
        bar.style.flexWrap = "wrap";
        bar.style.gap = "4px";
        bar.style.marginTop = "10px";

        filters.forEach(f => {
            const b = document.createElement("button");
            b.textContent = f.label;
            b.type = "button";         // verhindert Seitenreload!!
            b.className = "btn btn-xs btn-primary"; // kleine Buttons
            b.style.padding = "3px 6px";

            b.addEventListener("click", () => applyFilter(f.fn));
            bar.appendChild(b);
        });

        const reset = document.createElement("button");
        reset.textContent = "Alle";
        reset.type = "button";
        reset.className = "btn btn-xs btn-default";
        reset.addEventListener("click", resetFilter);
        bar.appendChild(reset);

        target.insertAdjacentElement("afterend", bar);
    }

    function applyFilter(fn) {
        document.querySelectorAll(".building_list")
            .forEach(el => el.style.display = fn(el) ? "" : "none");
    }

    function resetFilter() {
        document.querySelectorAll(".building_list")
            .forEach(el => el.style.display = "");
    }

    init();
})();
