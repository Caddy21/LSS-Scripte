// ==UserScript==
// @name         [LSS] Besatzungsanzeige
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Zeigt in der Gebäudeübersicht die aktuelle Besatzung farbig an
// @match        https://www.leitstellenspiel.de/buildings*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_xmlhttpRequest
// @connect      www.leitstellenspiel.de
// @connect      api.lss-manager.de
// ==/UserScript==

(function() {
    'use strict';

    const VEHICLE_API = "https://www.leitstellenspiel.de/api/vehicles";
    const MAX_API = "https://api.lss-manager.de/de_DE/vehicles";

    let vehicleData = {};
    let maxData = {};

    function request(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url,
                onload: r => resolve(JSON.parse(r.responseText)),
                onerror: reject
            });
        });
    }

    async function loadData() {
        const [current, max] = await Promise.all([
            request(VEHICLE_API),
            request(MAX_API)
        ]);

        current.forEach(v => {
            vehicleData[v.id] = {
                assigned: v.assigned_personnel_count,
                type: v.vehicle_type
            };
        });

        Object.keys(max).forEach(type => {
            maxData[type] = max[type].maxPersonnel;
        });
    }

    function addStyles() {
        const css = `
            .pers-red { color: #d9534f !important; font-weight:bold; }
            .pers-yellow { color: #f0ad4e !important; font-weight:bold; }
            .pers-green { color: #5cb85c !important; font-weight:bold; }
            .pers-original-green { color:#5cb85c !important; font-weight:bold; }
        `;
        const style = document.createElement("style");
        style.textContent = css;
        document.head.appendChild(style);
    }

    function updateHeader() {
        const headerCell = document.querySelector(
            "#vehicle_table thead tr th:nth-child(6) .tablesorter-header-inner"
        );

        if (headerCell) {
            headerCell.textContent = "Aktuelle / Maximale Besatzung";
        }
    }

    function processTable() {
        const rows = document.querySelectorAll("#vehicle_table tbody tr");

        rows.forEach(row => {

            const link = row.querySelector("td:nth-child(2) a[href^='/vehicles/']");
            if (!link) return;

            const id = link.href.split("/").pop();
            const v = vehicleData[id];
            if (!v) return;

            const max = maxData[v.type] ?? 0;
            const assigned = v.assigned ?? 0;

            const personnelCell = row.querySelector("td:nth-child(6)");
            if (!personnelCell) return;

            const originalText = personnelCell.textContent.trim();
            personnelCell.innerHTML = "";

            let cls = "pers-yellow";
            if (assigned === 0) cls = "pers-red";
            else if (assigned === max) cls = "pers-green";

            const colored = document.createElement("span");
            colored.className = cls;
            colored.textContent = assigned;

            const original = document.createElement("span");
            original.className = "pers-original-green";
            original.textContent = originalText;

            personnelCell.appendChild(colored);
            personnelCell.append(" / ");
            personnelCell.appendChild(original);
        });
    }

    async function init() {
        await loadData();
        addStyles();
        updateHeader(); // <-- Neuer Tabellen-Header
        processTable();
    }

    init();
})();
