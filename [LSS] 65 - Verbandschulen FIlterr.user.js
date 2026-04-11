// ==UserScript==
// @name         [LSS] Verbandschulen Filter
// @namespace    tampermonkey.net
// @description  Filtert Eure Wachen per Leitstellenzugehörigkeit oder per Suche in den Verbandsschulen
// @version      1.0
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/buildings/*
// @match        https://polizei.leitstellenspiel.de/buildings/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_xmlhttpRequest
// @connect      leitstellenspiel.de
// ==/UserScript==

(function () {
    'use strict';

    const API_URL = "/api/buildings";
    let buildingsCache = null;
    let activeFilter = null;
    let searchQuery = "";

    // The Darkside of Scriptworld
    function isDarkMode() {
        return document.body.classList.contains("dark");
    }
    function styleSelect(select) {
    const dark = isDarkMode();

    // 🔥 Standard LSS Button (kein XS mehr)
    select.className = "btn btn-default";

    // Layout bleibt stabil im Inline Flow
    select.style.marginLeft = "10px";
    select.style.width = "auto";
    select.style.display = "inline-block";

    // etwas angenehmer für Selects im Button-Look
    select.style.height = "30px";
    select.style.padding = "4px 8px";

    if (dark) {
        // nur sanftes Dark-Mode tuning (nicht überschreiben!)
        select.style.backgroundColor = "#2c2c2c";
        select.style.color = "#ffffff";
        select.style.border = "1px solid #555";
    } else {
        // reset für Light Mode
        select.style.backgroundColor = "";
        select.style.color = "";
        select.style.border = "";
    }
}

    // Gebäude beziehen (Möbel rein und so)
    function fetchBuildings() {
        if (buildingsCache) return Promise.resolve(buildingsCache);

        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: API_URL,
                onload: (res) => {
                    buildingsCache = JSON.parse(res.responseText);
                    resolve(buildingsCache);
                }
            });
        });
    }

    // Hier steckt Hirnschmalz drinne
    function applyFilter() {
        document.querySelectorAll(".panel-heading.personal-select-heading").forEach(h => {

            const id = h.getAttribute("building_id");
            const panel = h.closest(".panel");
            if (!panel) return;

            const b = buildingsCache.find(x => x.id == id);
            const lsId = b?.leitstelle_building_id || null;

            const caption = (b?.caption || "").toLowerCase();

            const matchLeitstelle =
                !activeFilter || lsId == activeFilter;

            const matchSearch =
                !searchQuery || caption.includes(searchQuery);

            panel.style.display =
                (matchLeitstelle && matchSearch) ? "" : "none";
        });
    }

    // Hier wird der Hirnschmalz angewendet
    function createSelect(items) {
        const select = document.createElement("select");

        styleSelect(select);

        const all = document.createElement("option");
        all.value = "";
        all.textContent = "Alle Leitstellen";
        select.appendChild(all);

        items.forEach(i => {
            const opt = document.createElement("option");
            opt.value = i.id;
            opt.textContent = i.name;
            select.appendChild(opt);
        });

        select.addEventListener("change", () => {
            activeFilter = select.value ? parseInt(select.value) : null;
            applyFilter();
        });

        return select;
    }

    // Feini Feini Suche
    function createSearchInput() {
        const input = document.createElement("input");

        input.type = "text";
        input.placeholder = "Wache suchen...";
        input.className = "form-control input-sm";

        input.style.display = "inline-block";
        input.style.width = "180px";
        input.style.marginLeft = "10px";

        input.addEventListener("input", () => {
            searchQuery = input.value.toLowerCase().trim();
            applyFilter();
        });

        return input;
    }

    // Initialzündung
    async function init() {
        await fetchBuildings();

        const h3 = [...document.querySelectorAll("h3")]
            .find(h => h.textContent.includes("Personal auswählen"));

        if (!h3) return false;

        if (document.querySelector("#lss-toolbar")) return true;

        const leitstellen = buildingsCache
            .filter(b => b.building_type === 7)
            .map(b => ({
                id: b.id,
                name: b.caption
            }));

        const wrapper = document.createElement("div");
        wrapper.id = "lss-toolbar";
        wrapper.style.display = "inline-block";

        // 🔥 Reihenfolge: SELECT → SEARCH
        const select = createSelect(leitstellen);
        const search = createSearchInput();

        wrapper.appendChild(select);
        wrapper.appendChild(search);

        h3.appendChild(wrapper);

        return true;
    }

    // Saferstart
    function start() {
        const timer = setInterval(async () => {
            const ok = await init();
            if (ok) clearInterval(timer);
        }, 500);
    }
    start();
})();
