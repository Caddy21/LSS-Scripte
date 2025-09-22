// ==UserScript==
// @name         [LSS] 37 - Besatzungshelfer
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Zeigt aktuelle und maximale Besatzung in der Fahrzeugliste an.
// @match        https://www.leitstellenspiel.de/vehicles*
// @match        https://www.leitstellenspiel.de/buildings/*
// @grant        GM_xmlhttpRequest
// @connect      leitstellenspiel.de
// @connect      api.lss-manager.de
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// ==/UserScript==

(function() {
    'use strict';

    console.info("[LSS-Besatzung] Script gestartet ✅");

    let vehicleMap = {};
    let vehicleTypes = {};

    // --- Fahrzeugtypen laden ---
    function loadVehicleTypes(callback) {
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://api.lss-manager.de/de_DE/vehicles",
            onload: function(response) {
                vehicleTypes = JSON.parse(response.responseText);
                console.info("[LSS-Besatzung] Fahrzeugtypen geladen:", Object.keys(vehicleTypes).length);
                if (callback) callback();
            }
        });
    }

    // --- Fahrzeugdaten laden ---
    function loadVehicleData(callback) {
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://www.leitstellenspiel.de/api/vehicles",
            onload: function(response) {
                let vehicles = JSON.parse(response.responseText);
                vehicleMap = {};

                vehicles.forEach(v => {
                    let max = v.max_personnel_override;
                    if (!max && vehicleTypes[v.vehicle_type]) {
                        max = vehicleTypes[v.vehicle_type].staff.max;
                    }
                    vehicleMap[v.id] = {
                        assigned: v.assigned_personnel_count,
                        max: max
                    };
                });

                console.info("[LSS-Besatzung] Fahrzeugdaten geladen:", vehicles.length);
                if (callback) callback();
            }
        });
    }

    // --- Farbe bestimmen ---
    function getColor(assigned, max) {
        if (assigned === 0) return "red";        // leer
        if (assigned < max) return "orange";     // teilweise
        return "#00cc00";                        // hellgrün voll
    }

    // --- Besatzung-Spalte finden ---
    function getBesatzungColumnIndex(table) {
        let headers = [...table.querySelectorAll("thead th")];

        // 1. Suche im sichtbaren Text (innerText)
        let idx = headers.findIndex(h => (h.innerText || "").trim().includes("Besatzung"));
        if (idx !== -1) return idx;

        // 2. Suche im aria-label
        idx = headers.findIndex(h => (h.getAttribute("aria-label") || "").includes("Besatzung"));
        if (idx !== -1) return idx;

        // 3. Fallback: data-column="5"
        let fallback = headers.find(h => h.getAttribute("data-column") === "5");
        if (fallback) return headers.indexOf(fallback);

        console.warn("[LSS-Besatzung] Spalte 'Besatzung' nicht gefunden!");
        return -1;
    }

    // --- Tabelle aktualisieren ---
    function updateTable(doc) {
        let table = doc.querySelector("#vehicle_table");
        if (!table) return;

        let index = getBesatzungColumnIndex(table);
        if (index === -1) return;

        let rows = table.querySelectorAll("tbody tr");
        rows.forEach(tr => {
            // Fahrzeug-ID aus Link ziehen
            let link = tr.querySelector("a[href^='/vehicles/']");
            if (!link) return;

            let idMatch = link.href.match(/\/vehicles\/(\d+)/);
            if (!idMatch) return;

            let vid = parseInt(idMatch[1]);
            let data = vehicleMap[vid];
            if (!data) return;

            let td = tr.querySelector(`td:nth-child(${index + 1})`);
            if (!td) return;

            let assigned = data.assigned ?? 0;
            let max = data.max ?? "?";
            let color = getColor(assigned, max);

            td.innerHTML = `<span style="color:${color}; font-weight:bold;" title="${assigned} von ${max} besetzt">${assigned}</span> / ${max}`;
        });

        console.info("[LSS-Besatzung] Tabelle aktualisiert");
    }

    // --- Observer für Tabelle ---
    function observeTable(doc) {
        let target = doc.querySelector("#vehicle_table tbody");
        if (!target) return;

        let observer = new MutationObserver(() => updateTable(doc));
        observer.observe(target, { childList: true, subtree: true });
        console.info("[LSS-Besatzung] MutationObserver für Tabelle aktiv");
    }

    // --- Observer für iFrames (id + class) ---
    function observeIframes() {
        let observer = new MutationObserver(() => {
            document.querySelectorAll("iframe[id^='lightbox_iframe_'], iframe[class^='lightbox_iframe_']").forEach(iframe => {
                if (!iframe.dataset.lssBesatzung) {
                    iframe.dataset.lssBesatzung = "true";
                    iframe.addEventListener("load", () => {
                        try {
                            let doc = iframe.contentDocument || iframe.contentWindow.document;
                            if (doc) {
                                updateTable(doc);
                                observeTable(doc);
                            }
                        } catch (e) {
                            console.warn("[LSS-Besatzung] Zugriff auf iFrame fehlgeschlagen:", e);
                        }
                    });
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        console.info("[LSS-Besatzung] MutationObserver für iFrames aktiv");
    }

    // --- Initial ---
    loadVehicleTypes(() => {
        loadVehicleData(() => {
            updateTable(document);
            observeTable(document);
            observeIframes();

            // alle 30 Sekunden Daten neu laden
            setInterval(() => loadVehicleData(() => updateTable(document)), 30000);
        });
    });

})();
