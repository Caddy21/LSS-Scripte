// ==UserScript==
// @name         [LSS] 43 – Gebäudefilter
// @namespace    www.Leitstellenspiel.de
// @version      1.0
// @description  Filter Wachen nach ihrem Typen in der Gebäudeliste und nach Normal- und Kleinwachen
// @match        https://www.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const BUILDINGS_API = "/api/buildings";
    const FILTERS = {
        leitstelle:     { name: "LST",           types: [7] },
        schule:         { name: "Schulen",       types: [1, 3, 8, 10, 27] },
        fw_normal:      { name: "FW",            types: [0], small: false },
        fw_klein:       { name: "FFw",           types: [0], small: true },
        rd_normal:      { name: "RD",            types: [2], small: false },
        rd_klein:       { name: "RD (Klein)",    types: [2], small: true },
        pol_normal:     { name: "POL",           types: [6], small: false },
        pol_klein:      { name: "POL (Klein)",   types: [6], small: true },
        thw:            { name: "THW",           types: [9] },
        seg:            { name: "SEG",           types: [12] },
        bpol:           { name: "B-POL",         types: [11] },
        rth:            { name: "RTH",           types: [5] },
        wasser:         { name: "WR",            types: [15] },
        seenot:         { name: "SNR",           types: [26, 28] },
        berg:           { name: "BR",            types: [25] },
        ph:             { name: "RTH/PH",        types: [13] },
        komplex:        { name: "Komplexe",       types: [22, 23] },
    };

    let apiBuildings = {};

    const initInterval = setInterval(() => {
        if (document.querySelector("#btn-group-building-select") &&
            document.querySelector("#buildings")) {
            clearInterval(initInterval);
            start();
            observeBuildingsReload();
        }
    }, 300);

    function observeBuildingsReload() {
        const target = document.querySelector("#buildings");
        if (!target) return;

        const observer = new MutationObserver(() => {
            const container = document.querySelector("#btn-group-building-select");

            if (container && !container.querySelector(".lss-filter-patched")) {
                start(true);
            }
        });

        observer.observe(target, {
            childList: true,
            subtree: false
        });
    }

    async function start(isReload = false) {
        if (!isReload) await loadApi();

        const oldBar = document.querySelector("#btn-group-building-select");
        if (!oldBar) return;

        oldBar.innerHTML = '<span class="lss-filter-patched" style="display:none"></span>';

        const buttons = createButtonPanel(oldBar);

        const allBtn = document.createElement("a");
        allBtn.className = "btn btn-xs btn-default";
        allBtn.style.margin = "2px";
        allBtn.textContent = "Alle Anzeigen";
        allBtn.href = "#";
        allBtn.addEventListener("click", e => {
            e.preventDefault();
            updateView(null, buttons);
        });
        oldBar.appendChild(allBtn);
        updateView(null, buttons);
    }

    async function loadApi() {
        const r = await fetch(BUILDINGS_API);
        const data = await r.json();

        apiBuildings = {};
        data.forEach(b => {
            apiBuildings[b.id] = {
                small: !!b.small_building,
                type: b.building_type
            };
        });
    }

    function createButtonPanel(container) {
        const buttons = {};

        Object.keys(FILTERS).forEach(id => {
            const f = FILTERS[id];

            const btn = document.createElement("a");
            btn.className = "btn btn-xs btn-danger";
            btn.style.margin = "2px";
            btn.textContent = `${f.name} (${countBuildingsForFilter(id)})`;
            btn.href = "#";

            btn.addEventListener("click", e => {
                e.preventDefault();
                updateView(id, buttons);
            });

            container.appendChild(btn);
            buttons[id] = btn;
        });

        return buttons;
    }

    // WICHTIG: activeFilterId === null => "Alle anzeigen" (alle Buttons grün)
    function updateView(activeFilterId, buttons) {
        const showingAll = activeFilterId === null;

        // Zähler auf Buttons aktualisieren
        Object.keys(buttons).forEach(id => {
            const f = FILTERS[id];
            buttons[id].textContent = `${f.name} (${countBuildingsForFilter(id)})`;
        });

        // Button-Farben setzen — besonderer Fall: "Alle anzeigen"
        if (showingAll) {
            // alle grün
            Object.values(buttons).forEach(btn => {
                btn.classList.remove("btn-danger");
                btn.classList.add("btn-success");
            });
        } else {
            // normal: ausgewählter grün, andere rot
            Object.keys(buttons).forEach(id => {
                const btn = buttons[id];
                if (id === activeFilterId) {
                    btn.classList.remove("btn-danger");
                    btn.classList.add("btn-success");
                } else {
                    btn.classList.remove("btn-success");
                    btn.classList.add("btn-danger");
                }
            });
        }

        // Gebäudeliste anzeigen / ausblenden
        const buildings = document.querySelectorAll("#buildings_outer .building_list_li");

        buildings.forEach(el => {
            if (showingAll) {
                el.style.display = "";
                return;
            }

            const f = FILTERS[activeFilterId];
            const typeIdAttr = el.getAttribute("building_type_id");

            if (!typeIdAttr) {
                el.style.display = "none";
                return;
            }

            const typeId = Number(typeIdAttr);

            const idAttr = el.querySelector('ul[data-building_id]')?.getAttribute('data-building_id');
            const id = idAttr ? Number(idAttr) : null;

            const apiEntry = id && apiBuildings[id] ? apiBuildings[id] : { small: false, type: typeId };

            let match = f.types.includes(typeId);

            if (match && f.small !== undefined) {
                match = apiEntry.small === f.small;
            }

            el.style.display = match ? "" : "none";
        });
    }

    function countBuildingsForFilter(filterId) {
        const f = FILTERS[filterId];
        let count = 0;

        for (const id in apiBuildings) {
            const b = apiBuildings[id];

            if (!f.types.includes(b.type)) continue;

            if (f.small !== undefined && b.small !== f.small) continue;

            count++;
        }
        return count;
    }
})();
