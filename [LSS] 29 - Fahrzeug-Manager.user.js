// ==UserScript==
// @name         [LSS] Fahrzeug-Manager
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Zeigt fehlden Fahrzeuge pro Wache, je Einstellung an und ermöglicht den Kauf dieser.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Globale Daten
    let buildingDataGlobal = [];
    let vehicleDataGlobal = [];
    let vehicleMapGlobal = {};
    let vehicleTypeMapGlobal = {};
    let lssmBuildingDefsGlobal = null;
    let currentCredits = 0;
    let currentCoins = 0;

    const buildingTypeNames = {
        '0_normal': 'Feuerwache (Normal)',
        '0_small': 'Feuerwache (Kleinwache)',
        '2_normal': 'Rettungswache (Normal)',
        '2_small': 'Rettungswache (Kleinwache)',
        '6_normal': 'Polizeiwache (Normal)',
        '6_small': 'Polizeiwache (Kleinwache)',
        '9_normal': 'Technisches Hilfswerk',
        '11_normal': 'Bereitschaftspolizei',
        '12_normal': 'Schnelleinsatzgruppe (SEG)',
        '15_normal': 'Wasserrettung',
        '17_normal': 'Polizei-Sondereinheiten',
        '24_normal': 'Reiterstaffel',
        '25_normal': 'Bergrettungswache',
        '26_normal': 'Seenotrettungswache',
    };

    // Button ins Profil-Dropdown einfügen
    const menu = document.querySelector('#menu_profile + ul.dropdown-menu');
    if (menu) {
        const divider = menu.querySelector('li.divider');
        if (divider) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.id = 'fahrzeug-manager-btn';
            a.innerHTML = '<span class="glyphicon glyphicon-road"></span>&nbsp;&nbsp; Fahrzeug-Manager';
            li.appendChild(a);
            menu.insertBefore(li, divider);
        }
    }

    // Modal HTML
    const modalHTML = `
        <div class="modal fade" id="fahrzeugManagerModal" tabindex="-1" role="dialog" aria-labelledby="fahrzeugManagerLabel">
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header fm-sticky-header">
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                      <h3 class="modal-title" id="fahrzeugManagerLabel" style="font-weight: bold; margin: 0;">🚒 Der Fahrzeug-Manager🚒</h3>
                      <div style="display: flex; gap: 10px; align-items: center;">
                          <button type="button" class="fm-config-btn" id="fm-config-btn">Fahrzeugkonfiguration ⚙️</button>
                          <button type="button" class="fm-log-btn" id="fm-log-btn">Kaufprotokoll 📝</button>
                          <button type="button" class="fm-close-btn" data-dismiss="modal">Schließen ✖</button>
                      </div>
                  </div>
                    <div class="fm-description"
                         style="font-size: 14px; color: #555; background-color: var(--spoiler-body-bg); padding: 5px 0; line-height: 1.5;">
                      Nutze den <strong>Fahrzeug-Manager</strong>, um deine Fahrzeugflotte effizient zu verwalten.<br>
                      Du kannst pro Wachentyp deine Fahrzeuge individuell konfigurieren – über den Button oben rechts.<br>
                      Außerdem kannst du deine Wachen deutlich schneller mit Fahrzeugen bestücken und behältst dabei stets die Kosten im Blick.
                    </div>
                  <div style="display: grid; grid-template-columns: max-content 1fr; gap: 15px; row-gap: 3px; align-items: center; font-size: 14px;">
                      <div>Aktuelle Credits: <span id="fm-credits" style="color: #5cb85c; font-weight: bold;">0</span></div>
                      <div>Ausgewählte Credits: <span id="fm-costs-credits" style="color: #5cb85c; font-weight: bold;">0</span></div>
                      <div>Aktuelle Coins: <span id="fm-coins" style="color: #dc3545; font-weight: bold;">0</span></div>
                      <div>Ausgewählte Coins: <span id="fm-costs-coins" style="color: #dc3545; font-weight: bold;">0</span></div>
                  </div>
                  <div id="fm-progress-container" style="width: 100%; display: none; margin-top: 5px;">
                    <div id="fm-progress-text" style="font-size: 13px; margin-bottom: 3px; font-weight: bold; color: #007bff;">
                        Kauf gestartet...
                    </div>
                    <div style="background: #e0e0e0; border-radius: 4px; overflow: hidden; height: 8px;">
                        <div id="fm-progress-bar" style="width: 0%; height: 100%; background: #28a745; transition: width 0.3s ease;"></div>
                    </div>
                </div>
              </div>
              <div class="modal-body" id="fahrzeug-manager-content">
                <p>Lade Daten...</p>
              </div>
            </div>
          </div>
        </div>`;

    // Fahrzeugkonfigurations-Modal
    const configModalHTML = `
        <div class="modal fade" id="fahrzeugConfigModal" tabindex="-1" role="dialog" aria-labelledby="fahrzeugConfigLabel">
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h3 class="modal-title" id="fahrzeugConfigLabel" style="font-weight: bold; margin: 0;">⚙️ Fahrzeugkonfiguration ⚙️</h3>
                <div style="display:flex; align-items:center; gap:8px;">
                  <button type="button" class="fm-close-btn" data-dismiss="modal">Schließen ✖</button>
                </div>
              </div>
                <br><div id="fahrzeug-config-content">
                  <p>Bitte warten, Daten werden geladen...</p>
                </div>
              </div>
            </div>
          </div>
        </div>`;

    // Kaufprotokoll-Modal
    const logModalHTML = `
        <div class="modal fade" id="fahrzeugLogModal" tabindex="-1" role="dialog" aria-labelledby="fahrzeugLogLabel">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3 class="modal-title" id="fahrzeugLogLabel">📝 Kaufprotokoll 📝</h3>
            <button type="button" class="fm-reset-log-btn" id="fm-reset-log-btn">Protokoll zurücksetzen</button>
            <button type="button" class="fm-close-btn" data-dismiss="modal">Schließen ✖</button>
          </div>
          <div class="modal-body" id="fahrzeug-log-content">
            <p>Lade Protokoll...</p>
          </div>
        </div>
      </div>
    </div>`;

    // Helper: fügt Modal nur ein, wenn noch nicht vorhanden
    function ensureModalInserted(modalId, html) {
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', html);
        }
    }

    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'fm-config-btn') {
            e.preventDefault();
            ensureModalInserted('fahrzeugConfigModal', configModalHTML);
            $('#fahrzeugConfigModal').modal('show');
            loadVehicleConfig();
        }
    }); // Konfigbutton
    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'fm-log-btn') {
            e.preventDefault();
            ensureModalInserted('fahrzeugLogModal', logModalHTML);
            $('#fahrzeugLogModal').modal('show');
            showPurchaseLog();
        }
    }); // Kaufprotokoll
    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'fm-reset-log-btn') {
            if (confirm('Möchtest du das Kaufprotokoll wirklich zurücksetzen?')) {
                const now = Date.now();
                localStorage.setItem('fm-purchase-log', JSON.stringify([]));
                localStorage.setItem('fm-purchase-log-reset', now.toString());
                showPurchaseLog(); // Aktualisiere die Anzeige sofort
            }
        }
    }); // Resetbutton
    document.addEventListener('click', e => {
        if(e.target && e.target.id==='fahrzeug-manager-btn'){
            e.preventDefault();
            ensureModalInserted('fahrzeugManagerModal', modalHTML);
            $('#fahrzeugManagerModal').modal('show');
            updateUserResources();
            loadBuildingsFromAPI();
        }
    }); // Managerbutton

    // CSS
    GM_addStyle(`
        #fahrzeugManagerModal .modal-dialog { max-width: 2500px; width: 95%; margin: 30px auto; }
        #fahrzeugManagerModal .modal-content { width: 100%; overflow-x: auto; }
        #fahrzeugManagerModal { z-index: 10000 !important; }
        #fahrzeugManagerModal .modal-content { display: flex;  flex-direction: column;  height: 90vh; /* gesamte Modalhöhe */ }
        #fahrzeugManagerModal .modal-header { flex-shrink: 0;  position: sticky;  top: 0;  z-index: 10;  background: var(--spoiler-body-bg); }
        #fahrzeugManagerModal .modal-body { overflow-y: auto;  flex-grow: 1; }
        .modal-backdrop { z-index: 9999 !important; }
        .fm-close-btn { background-color: #dc3545; color: white; border: none; border-radius: 4px; padding: 5px 10px; font-size: 13px; cursor: pointer; }
        .fm-close-btn:hover { background-color: #c82333; }
        .fm-select { cursor: pointer; }
        .btn-xs { padding: 2px 6px; font-size: 12px; }
        .fm-spoiler { border: 1px solid var(--spoiler-border); border-radius: 4px; margin-bottom: 8px; overflow: hidden; }
        .fm-spoiler-header { background-color: var(--spoiler-header-bg); color: var(--spoiler-header-text); padding: 8px 12px; cursor: pointer; font-weight: bold; user-select: none; transition: background-color 0.2s; }
        .fm-spoiler-header:hover { background-color: var(--spoiler-header-hover); }
        .fm-spoiler-body { display: none; padding: 10px; background: var(--spoiler-body-bg); color: var(--spoiler-body-text); overflow-x: auto; }
        .fm-spoiler-body.active { display: block; }
        body:not(.dark) { --spoiler-border: #ddd; --spoiler-header-bg: #f7f7f7; --spoiler-header-text: #000; --spoiler-header-hover: #eaeaea; --spoiler-body-bg: #fff; --spoiler-body-text: #000; --table-header-bg: #f1f1f1; --spoiler-input-bg: #ffffff; --spoiler-input-text: #000000; }
        body.dark { --spoiler-border: #444; --spoiler-header-bg: #333; --spoiler-header-text: #eee; --spoiler-header-hover: #444; --spoiler-body-bg: #222; --spoiler-body-text: #ddd; --table-header-bg: #333; --spoiler-input-bg: #3a3a3a; --spoiler-input-text: #ffffff; }
        .fm-spoiler table { border-collapse: collapse; width: 100%; table-layout: auto; min-width: 800px; }
        .fm-spoiler table th, .fm-spoiler table td, .fm-spoiler table .fm-filter-row td { border: none; padding: 6px 8px; text-align: center; vertical-align: middle; white-space: nowrap; }
        .fm-spoiler table thead th, .fm-spoiler table .fm-filter-row td { background-color: var(--table-header-bg); font-weight: bold; }
        .fm-filter-row select, .fm-filter-row button.fm-filter-reset { font-size: 12px; padding: 2px 4px; min-width: 100px; width: 100%; }
        .fm-badge-green { background-color: #28a745 !important; color: #fff !important; }
        .fm-vehicle-list { white-space: normal !important; word-break: normal !important; overflow-wrap: normal !important; max-width: 350px; display: inline-block; }
        .fm-config-btn { background-color: #007bff; color: white; border: none; border-radius: 4px; padding: 5px 10px; font-size: 13px; cursor: pointer; }
        .fm-config-btn:hover { background-color: #0069d9; }
        #fahrzeugConfigModal .modal-dialog { max-width: 2000px; width: 90%; margin: 30px auto; }
        #fahrzeugConfigModal .modal-content { width: 100%; overflow-x: auto; }
        #fahrzeugConfigModal { z-index: 10001 !important; }  /* höher als FahrzeugManager */
        #fahrzeugConfigModal + .modal-backdrop { z-index: 10000 !important; }
        #fahrzeugLogModal { z-index: 10002 !important; }
        #fahrzeugLogModal .modal-content { width: 100%; overflow-x: auto; }
        #fahrzeugLogModal .modal-dialog { max-width: 1500px; width: 70%; margin: 30px auto; }
        #fahrzeugLogModal + .modal-backdrop { z-index: 10001 !important; }
        .fm-log-btn { background-color: #17a2b8; color: white; border: none; border-radius: 4px; padding: 5px 10px; font-size: 13px; cursor: pointer; }
        .fm-reset-log-btn { background-color: #ffc107; color: #333; border: none; border-radius: 4px; padding: 5px 10px; font-size: 13px; cursor: pointer; margin-left: 10px; }
        .fm-reset-log-btn:hover { background-color: #e0a800; }
        .fm-building-profile { background-color: var(--bs-body-bg, #fff); color: var(--bs-body-color, #000); }
        .fm-building-profile { background-color: #222; color: #f0f0f0; border-color: #444; }
        .fm-building-link,
        .fm-building-link:visited,
        .fm-building-link:hover,
        .fm-building-link:active { color: inherit; font-weight: inherit; text-decoration: inherit; }
        .fm-building-link,
        .fm-building-link:visited,
        .fm-building-link:hover,
        .fm-building-link:active { color: inherit !important; font-weight: normal !important; text-decoration: none !important; background: none !important; }

    `);

    // Stellplatzberechnung für alle Gebäudetypen
    function calcMaxParkingLots(building, lssmBuildings) {
        const bTypeId = String(building.building_type);
        const lssmDef = lssmBuildings?.[bTypeId];
        if (!lssmDef) return (building.level ?? 0) + 1;

        // Spezialwachen: startParkingLots + alle Erweiterungen mit givesParkingLots
        let max = lssmDef.startParkingLots || 0;
        if (Array.isArray(building.extensions)) {
            for (const ext of building.extensions) {
                const lssmExt = lssmDef.extensions?.find(e =>
                                                         (typeof ext.type_id !== "undefined" && typeof e.type_id !== "undefined" && e.type_id === ext.type_id) ||
                                                         (e.caption && ext.caption && e.caption === ext.caption)
                                                        );
                if (lssmExt && lssmExt.givesParkingLots) {
                    if (ext.available === true) {
                        max += lssmExt.givesParkingLots;
                    }
                }
            }
        }
        if (lssmDef.maxLevel > 0) {
            max += (building.level ?? 0);
        }
        return max;
    }

    // Fügt den Gebäudelink hinzu
    function buildBuildingLink(building) {
        const url = `/buildings/${building.id}`;
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="fm-building-link">${building.caption}</a>`;
    }

    // Fahrzeugtypen laden
    async function loadVehicleTypesLSSM() {
        try {
            const res = await fetch('https://api.lss-manager.de/de_DE/vehicles');
            const data = await res.json();
            return data;
        } catch (e) {
            console.error('Fehler beim Laden der LSSM Fahrzeugtypen:', e);
            return {};
        }
    }

    // Building-Definitionen laden
    async function loadLSSMBuildingDefs() {
        try {
            const res = await fetch('https://api.lss-manager.de/de_DE/buildings');
            const data = await res.json();
            return data;
        } catch (e) {
            console.error('Fehler beim Laden der LSSM Building-Defs:', e);
            return {};
        }
    }

    // Fahrzeuge laden und nach Gebäude gruppieren
    async function loadVehiclesFromAPI_raw() {
        try {
            const res = await fetch('/api/vehicles');
            const vehicles = await res.json();
            return vehicles;
        } catch (error) {
            console.error('Fehler beim Laden der Fahrzeugdaten:', error);
            return [];
        }
    }

    // Gesamte Übersicht laden
    async function loadBuildingsFromAPI() {
        const content = document.getElementById('fahrzeug-manager-content');
        content.innerHTML = '<p><span class="glyphicon glyphicon-refresh glyphicon-spin"></span> Lade Übersicht...</p>';
        try {
            const [buildings, vehiclesRaw, vehicleTypeMap, lssmBuildingDefs] = await Promise.all([
                fetch('/api/buildings').then(r=>r.json()),
                loadVehiclesFromAPI_raw(),
                loadVehicleTypesLSSM(),
                loadLSSMBuildingDefs()
            ]);

            // Globale Speicherung
            buildingDataGlobal = buildings;
            vehicleDataGlobal = vehiclesRaw;
            vehicleTypeMapGlobal = vehicleTypeMap;
            lssmBuildingDefsGlobal = lssmBuildingDefs;

            // vehicleMap aufbauen
            const vehicleMap = {};
            vehicleDataGlobal.forEach(v => {
                if (!vehicleMap[v.building_id]) vehicleMap[v.building_id] = [];
                vehicleMap[v.building_id].push(v);
            });
            vehicleMapGlobal = vehicleMap;

            // leitstellen map und vehicle_count berechnen
            const leitstellenMap = {};
            buildings.forEach(b => { if(b.building_type===7 || b.is_leitstelle) leitstellenMap[b.id]=b.caption; });
            buildings.forEach(b => {
                b.leitstelle_caption = b.leitstelle_building_id && leitstellenMap[b.leitstelle_building_id] ? leitstellenMap[b.leitstelle_building_id] : "-";
                b.vehicle_count = (vehicleMap[b.id] || []).length;
            });

            const filteredBuildings = buildings.filter(b=>getBuildingTypeName(b)!==null);
            content.innerHTML = buildBuildingsByType(filteredBuildings, vehicleMap, vehicleTypeMap, lssmBuildingDefsGlobal);

            // Spoiler eventlisteners
            document.querySelectorAll('.fm-spoiler-header').forEach(header=>{
                header.addEventListener('click', ()=>{
                    const targetId = header.dataset.target;
                    document.querySelectorAll('.fm-spoiler-body').forEach(body=>{
                        body.id===targetId ? body.classList.toggle('active') : body.classList.remove('active');
                    });
                });
            });

            // Listener für die Tabellen (Select-All, Filter, Checkboxen) anfügen
            attachAllTableListeners();
        } catch(err) {
            content.innerHTML = `<div class="alert alert-danger">❌ Fehler beim Laden der Daten: ${err}</div>`;
        }
    }

    // Lade die gespeicherte Konfiguration
    async function loadVehicleConfig() {
        const content = document.getElementById('fahrzeug-config-content');
        content.innerHTML = '<p><span class="glyphicon glyphicon-refresh glyphicon-spin"></span> Lade Fahrzeugkonfiguration...</p>';

        try {
            const [buildingTypes, vehicleTypes] = await Promise.all([
                fetch('https://api.lss-manager.de/de_DE/buildings').then(r => r.json()),
                loadVehicleTypesLSSM()
            ]);

            const sortedBuildingKeys = Object.keys(buildingTypeNames);
            let html = '';

            sortedBuildingKeys.forEach((key) => {
                const buildingId = parseInt(key.split('_')[0], 10);
                const buildingCaption = buildingTypeNames[key];
                if (!buildingCaption) return;

                const vehiclesForBuilding = Object.values(vehicleTypes).filter(v =>
                                                                               Array.isArray(v.possibleBuildings) && v.possibleBuildings.includes(buildingId)
                                                                              );

                if (vehiclesForBuilding.length > 0) {
                    html += `
                    <div class="fm-spoiler">
                      <div class="fm-spoiler-header" data-target="fm-config-body-${key}">
                        ${buildingCaption} – wird geladen …
                      </div>
                      <div id="fm-config-body-${key}" class="fm-spoiler-body">
                        ${buildConfigGrid(vehiclesForBuilding, key, 10, buildingCaption)}
                      </div>
                    </div>`;
                }
            });

            content.innerHTML = html || '<div class="alert alert-info">Keine passenden Fahrzeuge gefunden.</div>';

            // Spoiler-Logik
            document.querySelectorAll('#fahrzeugConfigModal .fm-spoiler-header').forEach(header => {
                header.addEventListener('click', () => {
                    const targetId = header.dataset.target;
                    document.querySelectorAll('#fahrzeugConfigModal .fm-spoiler-body').forEach(body => {
                        body.id === targetId ? body.classList.toggle('active') : body.classList.remove('active');
                    });
                });
            });

        } catch (err) {
            content.innerHTML = `<div class="alert alert-danger">❌ Fehler beim Laden der Konfigurationsdaten: ${err}</div>`;
        }
    }

    // Maximale Stellplätze berechnen
    function getMaxVehiclesForBuilding(building, lssmBuildingDefs) {
        let max = building.level !== undefined ? building.level + 1 : 1;

        // Spezialwachen: Stellplätze durch Erweiterungen (SEG/THW etc.)
        if (Array.isArray(building.extensions) && lssmBuildingDefs) {
            building.extensions.forEach(ext => {
                max += getParkingLotsForExtension(building.building_type, ext.type_id ?? ext.caption, lssmBuildingDefs);
            });
        }
        return max;
    }

    // Gebäudepname bestimmen
    function getBuildingTypeName(building) {
        let typeId = building.building_type;
        const size = building.small_building ? 'small' : 'normal';
        const key = `${typeId}_${size}`;
        return buildingTypeNames[key] ?? null;
    }

    // Hilfsfunktion: Gibt die Stellplätze für eine Erweiterung zurück
    function getParkingLotsForExtension(buildingTypeId, extensionTypeIdOrCaption, lssmBuildingDefs) {
        const buildingDef = lssmBuildingDefs[String(buildingTypeId)];
        if (!buildingDef || !Array.isArray(buildingDef.extensions)) return 0;
        const extDef = buildingDef.extensions.find(ext =>
                                                   (ext.type_id !== undefined && ext.type_id === extensionTypeIdOrCaption) ||
                                                   (typeof extensionTypeIdOrCaption === "string" && ext.caption === extensionTypeIdOrCaption)
                                                  );
        return extDef && extDef.givesParkingLots ? extDef.givesParkingLots : 0;
    }

    // Ermittelt den Erweiterungsstatus eines Gebäudes für einen bestimmten Fahrzeugtyp
    function getExtensionStatusForVehicle(building, vehicleTypeId, lssmBuildingDefs) {
        if (!building || !building.extensions || !lssmBuildingDefs) return null;

        const buildingDef = lssmBuildingDefs[building.building_type];
        if (!buildingDef || !buildingDef.extensions) return null;

        const matchingExtDef = buildingDef.extensions.find(extDef =>
                                                           extDef.unlocksVehicleTypes && extDef.unlocksVehicleTypes.includes(vehicleTypeId)
                                                          );

        if (!matchingExtDef) return null;

        // reale Erweiterung anhand des Caption-Vergleichs finden
        const realExt = building.extensions.find(e =>
                                                 e.caption.trim().toLowerCase() === matchingExtDef.caption.trim().toLowerCase()
                                                );

        if (!realExt) {
            return 'missing';
        }

        if (realExt.available === false && realExt.enabled === true) {
            return 'in_progress';
        }

        // ✅ Erweiterung vorhanden, aber deaktiviert -> trotzdem OK
        if (realExt.available === true && realExt.enabled === false) {
            return 'ok';
        }

        return 'ok';
    }

    // Nach Typ gruppieren und Spoiler bauen
    function buildBuildingsByType(buildings, vehicleMap, vehicleTypeMap, lssmBuildingDefs) {
        const grouped = {};
        buildings.forEach(b => {
            const typeName = getBuildingTypeName(b);
            if(!typeName) return;
            if(!grouped[typeName]) grouped[typeName]=[];
            grouped[typeName].push(b);
        });

        let html='';
        Object.keys(buildingTypeNames).forEach((key, idx) => {
            const typeName = buildingTypeNames[key];
            if(grouped[typeName]){
                const filteredBuildings = grouped[typeName].filter(b => {
                    const vehiclesCount = (vehicleMap[b.id] || []).length;
                    const maxVehicles = calcMaxParkingLots(b, lssmBuildingDefs);
                    return vehiclesCount < maxVehicles;
                });
                if(filteredBuildings.length > 0) {
                    html+=
                        `<div class="fm-spoiler">
                         <div class="fm-spoiler-header" data-target="fm-spoiler-body-${idx}">${typeName}</div>
                         <div id="fm-spoiler-body-${idx}" class="fm-spoiler-body">${buildFahrzeugTable(filteredBuildings, idx, vehicleMap, vehicleTypeMap, lssmBuildingDefs)}</div>
                         </div>`;
                }
            }
        });
        return html;
    }

    // Einzelne Tabellen: Event-Listener zentral anlegen
    function attachAllTableListeners() {
        const content = document.getElementById('fahrzeug-manager-content');
        if (!content) return;

        // Delegierte Events
        content.addEventListener('change', e => {
            const table = e.target.closest('.fm-table');
            if (!table) return;

            // Filter geändert
            if (e.target.classList.contains('fm-filter-leitstelle') ||
                e.target.classList.contains('fm-filter-wache')) {
                applyFilters(table);
            }

            // einzelne Checkbox geändert
            if (e.target.classList.contains('fm-select')) {
                updateSelectAll(table);
                updateSelectedCosts();
            }

            // Select-All geändert
            if (e.target.classList.contains('fm-select-all')) {
                const checked = e.target.checked;
                table.querySelectorAll('tbody tr').forEach(row => {
                    if (row.style.display !== 'none') {
                        const cb = row.querySelector('.fm-select');
                        if (cb) cb.checked = checked;
                    }
                });
                updateSelectedCosts();
            }
        });

        content.addEventListener('click', e => {
            if (!e.target.classList.contains('fm-filter-reset')) return;
            const table = e.target.closest('.fm-table');
            if (!table) return;
            const filterLeitstelle = table.querySelector('.fm-filter-leitstelle');
            const filterWache = table.querySelector('.fm-filter-wache');
            if (filterLeitstelle) filterLeitstelle.value = '';
            if (filterWache) filterWache.value = '';
            applyFilters(table);
        });

        function applyFilters(table) {
            const leitstelle = table.querySelector('.fm-filter-leitstelle')?.value || '';
            const wache = table.querySelector('.fm-filter-wache')?.value || '';
            const rows = [...table.querySelectorAll('tbody tr')];
            rows.forEach(row => {
                const rowLeitstelle = row.cells[1]?.textContent.trim() || '';
                const rowWache = row.cells[2]?.textContent.trim() || '';
                row.style.display = (leitstelle && rowLeitstelle !== leitstelle) ||
                    (wache && rowWache !== wache) ? 'none' : '';
            });
            updateSelectAll(table);
        }

        function updateSelectAll(table) {
            const rows = [...table.querySelectorAll('tbody tr')];
            const visibleCheckboxes = rows
            .filter(r => r.style.display !== 'none')
            .map(r => r.querySelector('.fm-select'))
            .filter(Boolean);
            const allCheckbox = table.querySelector('.fm-select-all');
            if (allCheckbox) {
                allCheckbox.checked = visibleCheckboxes.length > 0 &&
                    visibleCheckboxes.every(cb => cb.checked);
            }
        }

        // Initial Filter anwenden
        document.querySelectorAll('.fm-table').forEach(table => applyFilters(table));
    }

    // Berechnet den aktuellen Kaufpreis je nach Auswahl
    function updateBuyButtons() {
        document.querySelectorAll('#fahrzeugManagerModal table tbody tr').forEach(row => {
            const creditsCost = parseInt(row.querySelector('.fm-select')?.dataset.credits || '0', 10);
            const coinsCost = parseInt(row.querySelector('.fm-select')?.dataset.coins || '0', 10);

            const creditBtn = row.querySelector('.fm-buy-credit');
            const coinBtn = row.querySelector('.fm-buy-coin');

            if (creditBtn) {
                if (creditsCost > currentCredits) {
                    creditBtn.disabled = true;
                    creditBtn.title = `Benötigt: ${creditsCost.toLocaleString()} Credits (nur ${currentCredits.toLocaleString()} vorhanden)`;
                } else {
                    creditBtn.disabled = false;
                    creditBtn.title = '';
                }
            }

            if (coinBtn) {
                if (coinsCost > currentCoins) {
                    coinBtn.disabled = true;
                    coinBtn.title = `Benötigt: ${coinsCost.toLocaleString()} Coins (nur ${currentCoins.toLocaleString()} vorhanden)`;
                } else {
                    coinBtn.disabled = false;
                    coinBtn.title = '';
                }
            }
        });
    }

    // Ausgewählte Kosten berechnen
    function updateSelectedCosts(){
        let totalCredits=0,totalCoins=0;
        document.querySelectorAll('.fm-select:checked').forEach(cb=>{
            totalCredits += parseInt(cb.dataset.credits,10)||0;
            totalCoins += parseInt(cb.dataset.coins,10)||0;
        });
        document.getElementById('fm-costs-credits').textContent=totalCredits.toLocaleString();
        document.getElementById('fm-costs-coins').textContent=totalCoins.toLocaleString();
    }

    // Lädt die gespeicherten Profile für ein bestimmtes Gebäude
    function loadProfiles(buildingKey) {
        try {
            const raw = localStorage.getItem(`fm-config-${buildingKey}-profiles`);
            if (!raw) {
                return {
                    activeProfile: null,
                    profiles: {}
                };
            }

            const parsed = JSON.parse(raw);

            if (!parsed.profiles) parsed.profiles = {};

            // 🔥 Cleanup
            if (parsed.profiles["null"]) {
                delete parsed.profiles["null"];
            }

            if (!parsed.activeProfile || parsed.activeProfile === "null") {
                parsed.activeProfile = Object.keys(parsed.profiles)[0] || null;
            }

            return parsed;

        } catch (e) {
            console.warn(`[FM][Config] Fehler beim Laden der Profile ${buildingKey}:`, e);
            return {
                activeProfile: null,
                profiles: {}
            };
        }
    }

    // Speichert die Profile für ein bestimmtes Gebäude
    function saveProfiles(buildingKey, data) {
        localStorage.setItem(`fm-config-${buildingKey}-profiles`, JSON.stringify(data));
    }

    // Gibt die Konfiguration des aktuell aktiven Profils für ein bestimmtes Gebäude zurück.
    function getActiveProfileConfig(buildingKey) {
        const data = loadProfiles(buildingKey);

        if (!data.activeProfile) return [];

        return data.profiles[data.activeProfile] || [];
    }

    // Speichert eine neue Konfiguration für das aktuell aktive Profil eines Gebäudes.
    function saveActiveProfileConfig(buildingKey, config) {
        const data = loadProfiles(buildingKey);

        if (!data.activeProfile) return; // 💥 verhindert "null"-Profil

        data.profiles[data.activeProfile] = config;
        saveProfiles(buildingKey, data);
    }

    // Speichert pro Wache das aktive Profil für einen bestimmten Gebäudetyp
    function setBuildingActiveProfile(buildingId, buildingKey, profileName) {
        const key = `fm-config-building-profile-${buildingId}`;
        localStorage.setItem(key, JSON.stringify({ buildingKey, profileName }));
    }

    // Lädt das aktive Profil einer Wache
    function getBuildingActiveProfile(buildingId, buildingKey) {
        try {
            const raw = localStorage.getItem(`fm-config-building-profile-${buildingId}`);
            if (!raw) return loadProfiles(buildingKey).activeProfile; // Fallback
            const data = JSON.parse(raw);
            return data.profileName || loadProfiles(buildingKey).activeProfile;
        } catch {
            return loadProfiles(buildingKey).activeProfile;
        }
    }

    // Funktion für das Konfigurationsmenü
    function buildConfigGrid(vehicles, tableId, itemsPerRow = 10, buildingCaption = '') {

        if (!vehicles || vehicles.length === 0) {
            return '<div>Keine Fahrzeuge vorhanden</div>';
        }

        vehicles.sort((a, b) => a.caption.localeCompare(b.caption));

        const profilesData = loadProfiles(tableId);
        const profileNames = Object.keys(profilesData.profiles);
        const hasProfiles = profileNames.length > 0;
        const activeProfile = profilesData.activeProfile;
        const savedConfig = getActiveProfileConfig(tableId);
        const firstStart = !hasProfiles;

        let html = '';

        /* ---------------- HEADER ---------------- */
        html += `<div class="fm-config-header"
        style="margin-bottom:5px; display:flex; flex-wrap:wrap; gap:5px; align-items:center;">`;

        if (hasProfiles) {
            html += `
        <label>Profil(e):</label>
        <select class="fm-profile-select" data-table="${tableId}"
            style="padding:2px 4px; border:1px solid var(--spoiler-border); border-radius:4px;
                   background:var(--spoiler-body-bg); color:var(--spoiler-body-text);">
            ${profileNames.map(name =>
                               `<option value="${name}" ${name === activeProfile ? 'selected' : ''}>${name}</option>`
                              ).join('')}
        </select>`;
        }

        html += `
            <button class="btn btn-primary btn-xs fm-profile-saveas" data-table="${tableId}">Profil anlegen</button>
            <button class="btn btn-danger btn-xs fm-profile-delete" ${!hasProfiles ? 'disabled' : ''} data-table="${tableId}">Profil löschen</button>
            <button class="btn btn-success btn-xs fm-config-select-all" ${!hasProfiles ? 'disabled' : ''}>Alle anwählen</button>
            <button class="btn btn-danger btn-xs fm-config-deselect-all" ${!hasProfiles ? 'disabled' : ''}>Alle abwählen</button>
            <button class="btn btn-warning btn-xs fm-config-toggle" ${!hasProfiles ? 'disabled' : ''}>Abgewählte Fahrzeuge anzeigen</button>
        </div>`;

        /* ---------------- HINWEIS ---------------- */
        if (firstStart) {
            html += `
        <div class="fm-config-hint"
            style="margin-bottom:8px;padding:8px;border:1px solid var(--spoiler-border);
            border-radius:4px;background:var(--spoiler-body-bg);font-size:12px;">
            Es wurden noch keine Profile erstellt.<br>
            Lege zuerst ein Profil an, dann erscheinen die Fahrzeuge und du kannst direkt deine Auswahl treffen. 🙂
        </div>`;
        }

        /* ---------------- GRID ---------------- */
        html += `<div class="fm-config-grid" id="fm-config-table-${tableId}"
        style="display:${hasProfiles ? 'grid' : 'none'};grid-template-columns:repeat(${itemsPerRow},minmax(120px,1fr));
        gap:4px 8px;width:100%;">`;

        vehicles.forEach((vehicle, idx) => {
            const saved = savedConfig?.find(c =>
                                            String(c.typeId) === String(vehicle.id) || c.caption === vehicle.caption
                                           );

            // checked: Checkbox-Status
            const checked = saved ? !!saved.checked : hasProfiles ? true : false;

            // display: Sichtbarkeit der Zelle
            const display = saved ? (saved.checked ? 'flex' : 'none') : (hasProfiles ? 'flex' : 'none');

            const amount = saved ? (parseInt(saved.amount) || 1) : 1;

            html += `
            <div class="fm-config-cell"
                 style="white-space:nowrap;display:${display};
                        flex-direction:column;gap:4px;padding:4px 6px;
                        border:1px solid var(--spoiler-border);
                        border-radius:4px;background:var(--spoiler-body-bg);">

                <label style="cursor:pointer;display:flex;gap:4px;">
                    <input type="checkbox"
                           class="fm-config-select"
                           data-type-id="${vehicle.id}"
                           data-caption="${vehicle.caption}"
                           ${checked ? 'checked' : ''}>
                    <span title="${vehicle.caption}"
                          style="overflow:hidden;text-overflow:ellipsis;">
                          ${vehicle.caption}
                    </span>
                </label>

                <input type="number"
                       class="fm-config-amount"
                       value="${amount}" min="1"
                       style="width:100%;padding:2px 4px;
                              border:1px solid var(--spoiler-border);
                              border-radius:3px;
                              background:var(--spoiler-input-bg, #ffffff);
                              color:var(--spoiler-input-text, #000000);
                              color-scheme: light dark;">
             </div>`;
        });

        html += `</div>`;


        /* ---------------- EVENTS ---------------- */
        setTimeout(() => {

            const wrapper = document.getElementById(`fm-config-table-${tableId}`).parentElement;
            if (wrapper.dataset.eventsAttached) return;
            wrapper.dataset.eventsAttached = "true";

            let profilesData = loadProfiles(tableId);
            let currentProfile = profilesData.activeProfile;
            let currentConfig = getActiveProfileConfig(tableId) || [];

            function getCurrentConfigFromDOM() {

                const grid = wrapper.querySelector('.fm-config-grid');
                if (!grid) return [];

                const config = [];

                grid.querySelectorAll('.fm-config-cell').forEach(cell => {

                    const cb = cell.querySelector('.fm-config-select');
                    const input = cell.querySelector('.fm-config-amount');

                    config.push({
                        typeId: parseInt(cb.dataset.typeId),
                        caption: cb.dataset.caption,
                        checked: cb.checked,
                        amount: parseInt(input.value) || 1
                    });

                });

                return config;
            }

            function saveAndSync() {
                currentConfig = getCurrentConfigFromDOM();
                saveActiveProfileConfig(tableId, currentConfig);
                updateHeaderCount();
            }

            function updateHeaderCount() {

                let total = 0;

                currentConfig.forEach(entry => {
                    if (entry.checked) {
                        total += parseInt(entry.amount) || 0;
                    }
                });

                const header = document.querySelector(`[data-target="fm-config-body-${tableId}"]`);

                if (!header) return;

                profilesData = loadProfiles(tableId);
                currentProfile = profilesData.activeProfile;

                const profileNames = Object.keys(profilesData.profiles);

                let profileText = '';

                if (profileNames.length > 0) {
                    profileText = ' (' + profileNames.map(name => {
                        return name === currentProfile
                            ? `<strong>${name}</strong>`
                        : name;
                    }).join(' | ') + ')';
                }

                header.innerHTML =
                    `${buildingCaption} – ${total} Fahrzeuge` +
                    profileText;
            }

            function reRenderAndSync() {
                wrapper.innerHTML = buildConfigGrid(vehicles, tableId, itemsPerRow, buildingCaption);

                setTimeout(() => {
                    currentConfig = getCurrentConfigFromDOM();
                    saveActiveProfileConfig(tableId, currentConfig);
                    updateHeaderCount();
                }, 0);
            }

            /* ---------------- EVENTS ---------------- */

            // 🔥 LIVE UPDATE bei Eingabe
            wrapper.addEventListener('input', e => {
                if (e.target.classList.contains('fm-config-amount')) {
                    saveAndSync();
                }
            });

            wrapper.addEventListener('change', e => {

                if (e.target.classList.contains('fm-profile-select')) {

                    profilesData = loadProfiles(tableId);
                    profilesData.activeProfile = e.target.value;
                    saveProfiles(tableId, profilesData);

                    reRenderAndSync();
                    setTimeout(() => {
                        currentConfig = getCurrentConfigFromDOM();
                        saveActiveProfileConfig(tableId, currentConfig);
                        updateHeaderCount();
                    }, 0);
                    return;
                }

                if (e.target.classList.contains('fm-config-select')) {

                    const cell = e.target.closest('.fm-config-cell');
                    cell.style.display = e.target.checked ? 'flex' : 'none';

                    saveAndSync();
                }

            });

            wrapper.addEventListener('click', e => {

                if (e.target.classList.contains('fm-profile-saveas')) {

                    const newName = prompt('Name des neuen Profils:');
                    if (!newName) return;

                    profilesData = loadProfiles(tableId);

                    if (profilesData.profiles[newName]) {
                        alert('Profil existiert bereits.');
                        return;
                    }

                    const config = vehicles.map(v => ({
                        typeId: parseInt(v.id),
                        caption: v.caption,
                        checked: true,
                        amount: 1
                    }));

                    profilesData.profiles[newName] = config;
                    profilesData.activeProfile = newName;

                    saveProfiles(tableId, profilesData);

                    reRenderAndSync();
                    return;
                }

                if (e.target.classList.contains('fm-profile-delete')) {

                    profilesData = loadProfiles(tableId);
                    const active = profilesData.activeProfile;

                    if (!active) return;
                    if (!confirm(`Profil "${active}" löschen?`)) return;

                    delete profilesData.profiles[active];

                    const remaining = Object.keys(profilesData.profiles);
                    profilesData.activeProfile = remaining[0] || null;

                    saveProfiles(tableId, profilesData);

                    reRenderAndSync();
                    return;
                }

                if (e.target.classList.contains('fm-config-select-all') ||
                    e.target.classList.contains('fm-config-deselect-all')) {

                    const selectAll = e.target.classList.contains('fm-config-select-all');

                    const grid = wrapper.querySelector('.fm-config-grid');
                    if (!grid) return;

                    grid.querySelectorAll('.fm-config-select').forEach(cb => {
                        cb.checked = selectAll;
                    });

                    grid.querySelectorAll('.fm-config-cell').forEach(cell => {
                        cell.style.display = selectAll ? 'flex' : 'none';
                    });

                    saveAndSync();
                }

                if (e.target.classList.contains('fm-config-toggle')) {

                    const grid = wrapper.querySelector('.fm-config-grid');
                    if (!grid) return;

                    const hidden = e.target.dataset.hidden === "true";
                    const newState = !hidden;

                    grid.querySelectorAll('.fm-config-cell').forEach(cell => {
                        const cb = cell.querySelector('.fm-config-select');

                        if (!cb.checked) {
                            cell.style.display = newState ? 'flex' : 'none';
                        }
                    });

                    e.target.dataset.hidden = newState;
                    e.target.textContent = newState
                        ? 'Abgewählte Fahrzeuge ausblenden'
                    : 'Abgewählte Fahrzeuge anzeigen';
                }

            });

            // 🔥 Initial korrekt setzen
            updateHeaderCount();

        }, 0);

        return html;
    }

    // Tabelle bauen
    function buildFahrzeugTable(buildings, tableId, vehicleMap, vehicleTypeMap, lssmBuildingDefs, filters = {}) {
        const filterLeitstelle = filters.leitstelle || '';
        const filterWache = filters.wache || '';
        const leitstellen = [...new Set(buildings.map(b => b.leitstelle_caption).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'de'));
        const wachen = [...new Set(buildings.map(b => b.caption).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'de'));

        let html = `
    <table class="table fm-table" id="fm-table-${tableId}">
        <thead>
            <tr>
                <th>Auswahl</th>
                <th>Leitstelle</th>
                <th>Wache</th>
                <th>Profil</th>
                <th>Fahrzeuge</th>
                <th>Freie Stellplätze</th>
                <th>Fahrzeuge auf Wache</th>
                <th>Fehlende Fahrzeuge</th>
                <th>Kaufen mit Credits</th>
                <th>Kaufen mit Coins</th>
            </tr>
            <tr class="fm-filter-row">
                <td><input type="checkbox" class="fm-select-all" data-table="${tableId}"></td>
                <td>
                    <select class="fm-filter-leitstelle" data-table="${tableId}">
                        <option value="">Alle</option>
                        ${leitstellen.map(n => `<option value="${n}">${n}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <select class="fm-filter-wache" data-table="${tableId}">
                        <option value="">Alle</option>
                        ${wachen.map(n => `<option value="${n}">${n}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <button class="fm-filter-reset btn btn-primary btn-xs" data-table="${tableId}">Filter zurücksetzen</button>
                </td>
                <td></td>
                <td></td>
                <td></td>
                <td style="text-align:center;">
                    <button class="btn btn-info btn-xs fm-toggle-hide-no-missing" data-table="${tableId}" title="Blendet Wachen aus, bei denen keine Fahrzeuge fehlen">
                        Keine fehlenden
                    </button>
                </td>
                <td style="text-align: center;">
                    <button class="btn btn-success btn-xs fm-buy-selected-credits" data-table="${tableId}">💳 Alle kaufen</button>
                </td>
                <td style="text-align: center;">
                    <button class="btn btn-danger btn-xs fm-buy-selected-coins" data-table="${tableId}">🪙 Alle kaufen</button>
                </td>
            </tr>
        </thead>
        <tbody>
    `;

        const sortedBuildings = buildings.slice().sort((a, b) => a.caption.localeCompare(b.caption));

        sortedBuildings.forEach((b, idx) => {
            if (filterLeitstelle && b.leitstelle_caption !== filterLeitstelle) return;
            if (filterWache && b.caption !== filterWache) return;
            const vehiclesOnBuilding = vehicleMap[b.id] || [];
            const typeCountMapOnBuilding = {};

            vehiclesOnBuilding.forEach(v => {
                const typeId = v.vehicle_type;
                const typeName = vehicleTypeMap[typeId]?.caption || `Unbekannt (Typ ${typeId})`;
                typeCountMapOnBuilding[typeName] = (typeCountMapOnBuilding[typeName] || 0) + 1;
            });

            const vehicleNames = Object.entries(typeCountMapOnBuilding)
            .map(([name, count]) => count > 1 ? `${count}x ${name}` : name)
            .join(',<wbr> ') || 'Keine Fahrzeuge auf Wache vorhanden';

            const configKey = `${b.building_type}_${b.small_building ? 'small' : 'normal'}`;
            const profilesData = loadProfiles(configKey);
            const profileNames = Object.keys(profilesData.profiles);
            const hasProfiles = profileNames.length > 0;
            const activeProfile = hasProfiles ? getBuildingActiveProfile(b.id, configKey) : null;

            const missingData = getMissingVehiclesForBuilding(b, vehicleMap, vehicleTypeMap, configKey);
            const buyableData = getBuyableMissingVehicles(b, vehicleMap, vehicleTypeMap, lssmBuildingDefs);

            const coloredMissingNames = missingData.vehiclesIds && missingData.vehiclesIds.length > 0
            ? Object.entries(missingData.vehiclesIds.reduce((acc, id) => {
                acc[id] = (acc[id] || 0) + 1;
                return acc;
            }, {}))
            .map(([id, count]) => {
                const typeId = parseInt(id, 10);
                const status = getExtensionStatusForVehicle(b, typeId, lssmBuildingDefs);
                const name = vehicleTypeMap[typeId]?.caption || `Unbekannt (Typ ${id})`;
                const displayName = count > 1 ? `${count}x ${name}` : name;
                switch (status) {
                    case 'locked':
                    case 'missing':
                        return `<span style="color:red;font-weight:bold;" title="Erweiterung fehlt">${displayName}</span>`;
                    case 'in_progress':
                        return `<span style="color:orange;font-weight:bold;" title="Erweiterung im Bau">${displayName}</span>`;
                    default:
                        return displayName;
                }
            }).join(',<wbr>&nbsp;')
            : missingData.names;

            const missingVehiclesJson = JSON.stringify(missingData.vehiclesIds || []);
            const maxVehicles = calcMaxParkingLots(b, lssmBuildingDefs);
            const freieStellplaetze = Math.max(maxVehicles - vehiclesOnBuilding.length, 0);

            const profileCell = hasProfiles
            ? `<select class="fm-building-profile" data-building-id="${b.id}" data-config-key="${configKey}" style="padding:2px 4px; border:1px solid var(--spoiler-border); border-radius:4px; background:var(--spoiler-body-bg); color:var(--spoiler-body-text); width:100%;">
                ${profileNames.map(p => `<option value="${p}" ${p === activeProfile ? 'selected' : ''}>${p}</option>`).join('')}
              </select>`
            : `<span style="color: var(--text-color-secondary, #999); font-style: italic;">– kein Profil –</span>`;

            html += `
            <tr data-building-id="${b.id}" data-config-key="${configKey}" data-missing-vehicle-ids='${missingVehiclesJson}'>
                <td><input type="checkbox" class="fm-select" id="fm-select-${tableId}-${idx}" data-credits="${buyableData.totalCredits}" data-coins="${buyableData.totalCoins}"></td>
                <td>${b.leitstelle_caption ?? '-'}</td>
                <td>${buildBuildingLink(b)}</td>
                <td>${profileCell}</td>
                <td>${b.vehicle_count ?? 0}</td>
                <td><span class="badge fm-badge-green">${freieStellplaetze}</span></td>
                <td><span class="fm-vehicle-list">${vehicleNames}</span></td>
                <td><span class="fm-vehicle-list">${coloredMissingNames}</span></td>
                <td>
                    <button class="btn btn-success btn-xs fm-buy-credit" ${buyableData.totalCredits === 0 ? 'disabled title="Keine kaufbaren Fahrzeuge"' : (buyableData.totalCredits > currentCredits ? 'disabled title="Nicht genug Credits"' : '')}>
                        ${buyableData.totalCredits.toLocaleString()} Credits
                    </button>
                </td>
                <td>
                    <button class="btn btn-danger btn-xs fm-buy-coin" ${buyableData.totalCoins === 0 ? 'disabled title="Keine kaufbaren Fahrzeuge"' : (buyableData.totalCoins > currentCoins ? 'disabled title="Nicht genug Coins"' : '')}>
                        ${buyableData.totalCoins.toLocaleString()} Coins
                    </button>
                </td>
            </tr>
        `;
        });

        html += '</tbody></table>';

        // Event-Listener in separate Funktion auslagern
        setTimeout(() => setupTableEventListeners(tableId, buildings, vehicleMap, vehicleTypeMap, lssmBuildingDefs), 0);

        return html;
    }

    // Funktion für alle Event-Listener
    function setupTableEventListeners(tableId, buildings, vehicleMap, vehicleTypeMap, lssmBuildingDefs) {
        const table = document.getElementById(`fm-table-${tableId}`);
        if (!table) return;

        let storageKey = `fm-hide-no-missing-${tableId}`;
        let hideNoMissing = localStorage.getItem(storageKey) === 'true';

        // --- Profilwechsel ---
        table.querySelectorAll('.fm-building-profile').forEach(sel => {
            sel.addEventListener('change', e => {
                const buildingId = e.target.dataset.buildingId;
                const configKey = e.target.dataset.configKey;
                const selectedProfile = e.target.value;

                setBuildingActiveProfile(buildingId, configKey, selectedProfile);

                // Aktuell ausgewählte Gebäude merken
                const selectedBuildings = new Set(Array.from(table.querySelectorAll('.fm-select:checked'))
                                                  .map(cb => cb.closest('tr')?.dataset.buildingId));

                // Mastercheckbox merken
                const masterChecked = table.querySelector('.fm-select-all')?.checked || false;

                // Tabelle neu rendern
                const container = table.parentElement;
                container.style.visibility = 'hidden';
                const filterLeitstelle = table.querySelector('.fm-filter-leitstelle')?.value || '';
                const filterWache = table.querySelector('.fm-filter-wache')?.value || '';
                container.innerHTML = buildFahrzeugTable(
                    buildings,
                    tableId,
                    vehicleMap,
                    vehicleTypeMap,
                    lssmBuildingDefs,
                    {
                        leitstelle: filterLeitstelle,
                        wache: filterWache
                    }
                );

                // Auswahl & Master wiederherstellen
                const newTable = document.getElementById(`fm-table-${tableId}`);

                if (newTable) {
                    // Filter wiederherstellen
                    const leitstelleSelect = newTable.querySelector('.fm-filter-leitstelle');
                    const wacheSelect = newTable.querySelector('.fm-filter-wache');

                    if (leitstelleSelect) leitstelleSelect.value = filterLeitstelle;
                    if (wacheSelect) wacheSelect.value = filterWache;

                    leitstelleSelect?.dispatchEvent(new Event('change'));
                    wacheSelect?.dispatchEvent(new Event('change'));

                    // ✅ Checkboxen wiederherstellen
                    newTable.querySelectorAll('tbody tr').forEach(row => {
                        const id = row.dataset.buildingId;
                        if (selectedBuildings.has(id)) {
                            const cb = row.querySelector('.fm-select');
                            if (cb) cb.checked = true;
                        }
                    });

                    // ✅ Master-Checkbox wiederherstellen
                    const master = newTable.querySelector('.fm-select-all');
                    if (master) master.checked = masterChecked;

                    // Optional: Buttons aktualisieren
                    updateBuyButtons(newTable);
                }

                // 👇 erst danach wieder anzeigen
                container.style.visibility = 'visible';
            });
        });

        // --- Toggle "Keine fehlenden" ---
        const toggleBtn = table.querySelector(`.fm-toggle-hide-no-missing[data-table="${tableId}"]`);
        if (toggleBtn) {
            toggleBtn.classList.toggle('active', hideNoMissing);
            toggleBtn.textContent = hideNoMissing ? 'Alle anzeigen' : '"Keine" ausblenden';
            toggleBtn.addEventListener('click', () => {
                hideNoMissing = !hideNoMissing;
                localStorage.setItem(storageKey, hideNoMissing ? 'true' : 'false');
                toggleBtn.classList.toggle('active', hideNoMissing);
                toggleBtn.textContent = hideNoMissing ? 'Alle anzeigen' : '"Keine" ausblenden';
                applyRowFilter();
            });
        }

        // --- Filterfunktion ---
        function applyRowFilter() {
            const filterLeitstelle = table.querySelector('.fm-filter-leitstelle')?.value || '';
            const filterWache = table.querySelector('.fm-filter-wache')?.value || '';

            table.querySelectorAll('tbody tr').forEach(row => {
                const rowLeitstelle = row.children[1]?.textContent.trim();
                const rowWache = row.children[2]?.textContent.trim();
                const missingText = row.children[7]?.innerText.trim() || '';
                let visible = true;

                if (filterLeitstelle && rowLeitstelle !== filterLeitstelle) visible = false;
                if (filterWache && rowWache !== filterWache) visible = false;
                if (hideNoMissing && missingText === 'Keine') visible = false;

                row.style.display = visible ? '' : 'none';
            });
        }

        // --- Event-Listener für Filter & Checkboxen ---
        table.addEventListener('change', e => {
            if (e.target.classList.contains('fm-select') || e.target.classList.contains('fm-select-all')) {
                updateBuyButtons(table);
            }
        });

        table.querySelector('.fm-select-all')?.addEventListener('change', e => {
            const checked = e.target.checked;
            table.querySelectorAll('.fm-select').forEach(cb => cb.checked = checked);
            updateBuyButtons(table);
        });

        table.querySelector('.fm-filter-leitstelle')?.addEventListener('change', applyRowFilter);
        table.querySelector('.fm-filter-wache')?.addEventListener('change', applyRowFilter);
        table.querySelector('.fm-filter-reset')?.addEventListener('click', () => {
            const container = table.parentElement;

            container.innerHTML = buildFahrzeugTable(
                buildings,
                tableId,
                vehicleMap,
                vehicleTypeMap,
                lssmBuildingDefs,
                {
                    leitstelle: '',
                    wache: ''
                }
            );
        });

        // --- initial anwenden ---
        applyRowFilter();
    }

    // Gibt die kaufbaren Fahrzeuge zurück
    function getBuyableMissingVehicles(building, vehicleMap, vehicleTypeMap, lssmBuildingDefs) {
        const vehiclesOnBuilding = vehicleMap[building.id] || [];
        const istByType = {};
        vehiclesOnBuilding.forEach(v => {
            const tid = String(v.vehicle_type);
            istByType[tid] = (istByType[tid] || 0) + 1;
        });

        const buildingKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
        const activeProfile = getBuildingActiveProfile(building.id, buildingKey);
        const profilesData = loadProfiles(buildingKey);
        const config = profilesData.profiles[activeProfile] || [];

        let totalCredits = 0;
        let totalCoins = 0;
        const missingVehicleIds = [];

        config.forEach(c => {
            if (!c.checked) return;

            const requestedAmount = parseInt(c.amount, 10) || 1;
            let typeId = c.typeId != null ? String(c.typeId) : null;

            if (!typeId) {
                const vtEntry = Object.entries(vehicleTypeMap).find(
                    ([id, v]) => (v.caption || '').trim() === (c.caption || '').trim()
                );
                if (vtEntry) typeId = String(vtEntry[0]);
            }
            if (!typeId) return;

            const ist = istByType[typeId] || 0;
            const diff = Math.max(requestedAmount - ist, 0);
            if (diff <= 0) return;

            // Status für Kauf prüfen:
            const status = getExtensionStatusForVehicle(building, parseInt(typeId, 10), lssmBuildingDefs);
            if (status !== 'ok' && status !== null) return; // nur kaufbare Fahrzeuge

            const vt = vehicleTypeMap[typeId];
            if (vt) {
                totalCredits += (vt.credits || 0) * diff;
                totalCoins += (vt.coins || 0) * diff;
            }
            for (let i = 0; i < diff; i++) missingVehicleIds.push(parseInt(typeId, 10));
        });

        return {
            totalCredits,
            totalCoins,
            vehiclesIds: missingVehicleIds
        };
    }

    // Ermittelt, welche Fahrzeuge einer Wache fehlen.
    function getMissingVehiclesForBuilding(building, vehicleMap, vehicleTypeMap, lssmBuildingDefs) {
        const vehiclesOnBuilding = vehicleMap[building.id] || [];
        const istByType = {};
        vehiclesOnBuilding.forEach(v => {
            const tid = String(v.vehicle_type);
            istByType[tid] = (istByType[tid] || 0) + 1;
        });

        const buildingKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
        const activeProfile = getBuildingActiveProfile(building.id, buildingKey);
        const profilesData = loadProfiles(buildingKey);
        const config = profilesData.profiles[activeProfile] || [];

        const missing = [];
        const missingVehicleIds = [];
        let totalCredits = 0;
        let totalCoins = 0;

        config.forEach(c => {
            if (!c.checked) return;

            const requestedAmount = parseInt(c.amount, 10) || 1;
            let typeId = c.typeId != null ? String(c.typeId) : null;

            if (!typeId) {
                const vtEntry = Object.entries(vehicleTypeMap).find(
                    ([id, v]) => (v.caption || '').trim() === (c.caption || '').trim()
                );
                if (vtEntry) typeId = String(vtEntry[0]);
            }
            if (!typeId) return;

            const ist = istByType[typeId] || 0;
            const diff = Math.max(requestedAmount - ist, 0);

            if (diff <= 0) return;

            // Erweiterungsstatus prüfen
            const status = getExtensionStatusForVehicle(building, parseInt(typeId, 10), lssmBuildingDefs);
            if (status !== 'ok' && status !== null) return;

            const vt = vehicleTypeMap[typeId];
            if (vt) {
                totalCredits += (vt.credits || 0) * diff;
                totalCoins += (vt.coins || 0) * diff;
            }

            for (let i = 0; i < diff; i++) missingVehicleIds.push(parseInt(typeId, 10));
            missing.push(diff > 1 ? `${diff}x ${c.caption}` : c.caption);
        });

        return {
            names: missing.join(',<wbr> ') || 'Keine',
            totalCredits,
            totalCoins,
            vehiclesIds: missingVehicleIds
        };
    }

    // Kauffunktion für die Fahrzeuge
    async function buyVehicles(rows, currency, confirmBeforeBuy = true, controller = null, progressText = null, progressBar = null, spinner = null, cancelBtn = null) {
        if (!rows || rows.length === 0) return;

        // AbortController falls nicht gesetzt
        if (!controller) controller = new AbortController();

        let cancelRequested = false;

        // Buttons sperren, Cancel-Button ausgenommen
        const setAllButtonsDisabled = (disabled, excludeBtn = null) => {
            document.querySelectorAll('button').forEach(btn => {
                if (btn !== excludeBtn) btn.disabled = disabled;
            });
        };

        // Progressbar UI erzeugen, falls nicht übergeben (Batch-Kauf)
        const container = document.getElementById('fm-progress-container');
        const isDynamicUI = !progressText || !progressBar || !spinner || !cancelBtn;

        if (isDynamicUI) {
            container.style.display = 'block';
            container.style.padding = '8px';
            container.style.border = '1px solid #444';
            container.style.borderRadius = '6px';
            container.style.background = 'rgba(0,0,0,0.1)';
            container.style.opacity = '1';

            container.innerHTML = `
            <div style="margin-bottom:6px;">
                <span id="fm-spinner">⏳</span>
                <span id="fm-progress-text">Kauf gestartet...</span>
            </div>
            <div style="width:100%; background:#333; height:12px; border-radius:4px; overflow:hidden; margin-bottom:6px;">
                <div id="fm-progress-bar" style="width:0%; height:100%; background:#4caf50;"></div>
            </div>
            <div style="text-align:right;">
                <button id="fm-cancel-btn" class="btn btn-warning btn-xs">⛔ Abbrechen</button>
            </div>
        `;

            // DOM muss geupdatet sein
            await new Promise(r => setTimeout(r, 0));

            progressText = document.getElementById('fm-progress-text');
            progressBar = document.getElementById('fm-progress-bar');
            spinner = document.getElementById('fm-spinner');
            cancelBtn = document.getElementById('fm-cancel-btn');
        }

        // Cancel-Button Logik
        cancelBtn.onclick = () => {
            cancelRequested = true;
            controller.abort();
            cancelBtn.disabled = true;
            cancelBtn.textContent = 'Wird abgebrochen...';
            spinner.textContent = '⛔';
        };

        // Buttons sperren (Cancel-Button bleibt aktiv)
        setAllButtonsDisabled(true, cancelBtn);

        try {
            // ----------------- 1. Kaufplan erstellen -----------------
            const buyPlanMap = {};
            let totalWanted = 0;

            rows.forEach(row => {
                const vehicleIds = JSON.parse(row.dataset.missingVehicleIds || '[]');
                const buildingId = Number(row.dataset.buildingId);

                const counts = {};
                vehicleIds.forEach(id => counts[id] = (counts[id] || 0) + 1);

                Object.entries(counts).forEach(([vehicleTypeId, wanted]) => {
                    const key = `${buildingId}-${vehicleTypeId}`;
                    buyPlanMap[key] = (buyPlanMap[key] || 0) + wanted;
                    totalWanted += wanted;
                });
            });

            // ----------------- 2. Fahrzeugdaten laden -----------------
            let freshVehiclesData = [];
            try {
                const res = await fetch('/api/vehicles');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                freshVehiclesData = await res.json();
            } catch (e) {
                alert("Fehler beim Nachladen der aktuellen Fahrzeugliste. Kauf abgebrochen.");
                return;
            }

            const freshVehicleMap = {};
            freshVehiclesData.forEach(v => {
                if (!freshVehicleMap[v.building_id]) freshVehicleMap[v.building_id] = [];
                freshVehicleMap[v.building_id].push(v);
            });

            // ----------------- 3. Requests pro Gebäude -----------------
            const perBuildingRequests = {};
            Object.entries(buyPlanMap).forEach(([key, wanted]) => {
                const [buildingId, vehicleTypeId] = key.split('-').map(Number);
                if (!perBuildingRequests[buildingId]) perBuildingRequests[buildingId] = [];
                perBuildingRequests[buildingId].push({ vehicleTypeId, wanted });
            });

            // ----------------- 4. Kaufliste erstellen -----------------
            const filteredBuyList = [];
            Object.entries(perBuildingRequests).forEach(([buildingId, requests]) => {
                let freeSlots = Infinity;
                const buildingObj = (buildingDataGlobal || []).find(b => Number(b.id) === Number(buildingId));
                if (buildingObj) {
                    try {
                        const max = calcMaxParkingLots(buildingObj, lssmBuildingDefsGlobal);
                        const current = (freshVehicleMap[buildingId] || []).length;
                        freeSlots = Math.max(max - current, 0);
                    } catch {}
                }

                requests.forEach(({ vehicleTypeId, wanted }) => {
                    const toBuy = Math.min(wanted, freeSlots);
                    for (let i = 0; i < toBuy; i++) filteredBuyList.push({ buildingId: Number(buildingId), vehicleId: vehicleTypeId });
                    freeSlots -= toBuy;
                });
            });

            if (filteredBuyList.length === 0) {
                alert("Keine Fahrzeuge zu kaufen – Stellplätze belegt oder Fahrzeuge vorhanden!");
                return;
            }

            // ----------------- 5. Kosten prüfen -----------------
            let totalCost = 0;
            filteredBuyList.forEach(v => {
                const vt = vehicleTypeMapGlobal[v.vehicleId];
                totalCost += currency === 'credits' ? (vt?.credits || 0) : (vt?.coins || 0);
            });

            const available = currency === 'credits' ? currentCredits : currentCoins;
            if (totalCost > available) {
                alert(`Nicht genug ${currency === 'credits' ? 'Credits' : 'Coins'}!`);
                return;
            }

            if (confirmBeforeBuy && !confirm(`Möchtest du wirklich ${filteredBuyList.length} Fahrzeuge für ${totalCost.toLocaleString()} ${currency === 'credits' ? 'Credits' : 'Coins'} kaufen?`)) {
                return;
            }

            // ----------------- 6. Fahrzeuge kaufen -----------------
            let boughtCount = 0;

            for (let i = 0; i < filteredBuyList.length; i++) {
                if (cancelRequested) break;

                const { buildingId, vehicleId } = filteredBuyList[i];
                const url = `/buildings/${buildingId}/vehicle/${buildingId}/${vehicleId}/${currency}?building=${buildingId}`;

                try {
                    const res = await fetch(url, { signal: controller.signal });
                    if (res.ok) boughtCount++;
                } catch (err) {
                    if (err.name === 'AbortError') break;
                    console.error(`[Kauf] Fehler Typ ${vehicleId} Wache ${buildingId}:`, err);
                }

                if (progressText && progressBar) {
                    progressText.textContent = `${i + 1} / ${filteredBuyList.length} Fahrzeuge verarbeitet`;
                    progressBar.style.width = `${Math.round(((i + 1) / filteredBuyList.length) * 100)}%`;
                }

                if (confirmBeforeBuy && !cancelRequested) await new Promise(r => setTimeout(r, 500));
            }

            // ----------------- 7. Abschluss / Abbruch -----------------
            if (cancelRequested) {
                if (progressText && spinner) {
                    progressText.textContent = `⛔ Der Kauf wurde abgebrochen. Es wurden dennoch (${boughtCount} Fahrzeuge gekauft)`;
                    spinner.textContent = '⛔';
                }
                await new Promise(r => setTimeout(r, 5000)); // Server wartet
            } else if (progressText && spinner) {
                progressText.textContent = `✅ Kauf abgeschlossen (${boughtCount} Fahrzeuge)`;
                spinner.textContent = '✅';
            }

            // Gebäude + Kosten aktualisieren
            await loadBuildingsFromAPI();
            updateSelectedCosts();

        } finally {
            // UI wieder freigeben
            setAllButtonsDisabled(false);
            container.style.opacity = '0';
            setTimeout(() => {
                container.style.display = 'none';
                container.innerHTML = '';
            }, 300);
        }
    }

    // Funktion für blinde (Coinsausgabe absicherung)
    function confirmCoinPurchase() {
        return confirm('⚠️ Bist du dir sicher, Coins ausgeben zu wollen?\nCoins sind eine Währung die mit Echtgeld gekauft werden und sind für immer weg.');
    }

    // Einzelkauf
    document.addEventListener('click', async e => {
        if (e.target && (e.target.classList.contains('fm-buy-credit') || e.target.classList.contains('fm-buy-coin'))) {
            e.preventDefault();

            const row = e.target.closest('tr');
            if (!row) return;

            const isCoins = e.target.classList.contains('fm-buy-coin');
            if (isCoins && !confirmCoinPurchase()) return;

            const currency = isCoins ? 'coins' : 'credits';
            let cancelRequested = false;
            const controller = new AbortController();

            // Progressbar erzeugen
            const container = document.getElementById('fm-progress-container');
            container.style.display = 'block';
            container.style.padding = '8px';
            container.style.border = '1px solid #444';
            container.style.borderRadius = '6px';
            container.style.background = 'rgba(0,0,0,0.1)';
            container.style.opacity = '1';

            container.innerHTML = `
            <div style="margin-bottom:6px;">
                <span id="fm-spinner">⏳</span>
                <span id="fm-progress-text">Kauf gestartet...</span>
            </div>
            <div style="width:100%; background:#333; height:12px; border-radius:4px; overflow:hidden; margin-bottom:6px;">
                <div id="fm-progress-bar" style="width:0%; height:100%; background:#4caf50;"></div>
            </div>
            <div style="text-align:right;">
                <button id="fm-cancel-btn" class="btn btn-warning btn-xs">⛔ Abbrechen</button>
            </div>
        `;

            // Warten, bis DOM aktualisiert ist
            await new Promise(r => setTimeout(r, 0));

            const progressText = document.getElementById('fm-progress-text');
            const progressBar = document.getElementById('fm-progress-bar');
            const spinner = document.getElementById('fm-spinner');
            const cancelBtn = document.getElementById('fm-cancel-btn');

            // Cancel-Button Logik
            cancelBtn.onclick = () => {
                cancelRequested = true;
                controller.abort();
                cancelBtn.disabled = true;
                cancelBtn.textContent = 'Wird abgebrochen...';
                spinner.textContent = '⛔';
            };

            // Buttons sperren, Cancel-Button ausgenommen
            const setAllButtonsDisabled = (disabled, excludeBtn = null) => {
                document.querySelectorAll('button').forEach(btn => {
                    if (btn !== excludeBtn) btn.disabled = disabled;
                });
            };
            setAllButtonsDisabled(true, cancelBtn);

            try {
                await buyVehicles([row], currency, false, controller, progressText, progressBar, spinner, cancelBtn);
            } finally {
                // Nach Abbruch oder Abschluss
                if (cancelRequested) {
                    // 3 Sekunden warten, damit Server aktualisiert
                    await new Promise(r => setTimeout(r, 3000));
                }

                // Gebäude & Kosten aktualisieren
                await loadBuildingsFromAPI();
                updateSelectedCosts();

                setAllButtonsDisabled(false);
                container.style.opacity = '0';
                setTimeout(() => container.style.display = 'none', 300);
            }
        }
    });

    // Sammelkauf
    document.addEventListener('click', async e => {
        if (e.target && (e.target.classList.contains('fm-buy-selected-credits') || e.target.classList.contains('fm-buy-selected-coins'))) {
            e.preventDefault();

            const table = e.target.closest('table');
            if (!table) return;

            const isCoins = e.target.classList.contains('fm-buy-selected-coins');
            if (isCoins && !confirmCoinPurchase()) return;

            const currency = isCoins ? 'coins' : 'credits';
            const selectedRows = [...table.querySelectorAll('tbody tr input.fm-select:checked')]
            .map(cb => cb.closest('tr'));

            if (selectedRows.length === 0) {
                alert('Bitte mindestens eine Wache auswählen.');
                return;
            }

            await buyVehicles(selectedRows, currency, true);
        }
    });

    // Expose updateSelectedCosts globally in case listeners need it
    window.fm_updateSelectedCosts = updateSelectedCosts;

    // Funktion zum füllen der Kaufprotokolltabelle
    function showPurchaseLog() {
        const content = document.getElementById('fahrzeug-log-content');
        let log = [];
        try { log = JSON.parse(localStorage.getItem('fm-purchase-log')) || []; } catch {}

        if (log.length === 0) {
            content.innerHTML = '<div class="alert alert-info">Keine Käufe protokolliert.</div>';
            return;
        }

        let html = '<table class="table table-striped"><thead><tr><th>Zeitpunkt</th><th>Wache</th><th>Fahrzeug</th><th>Preis</th><th>Währung</th></tr></thead><tbody>';
        log.slice().reverse().forEach(entry => {
            const dateStr = new Date(entry.time).toLocaleString();
            html += `<tr>
            <td>${dateStr}</td>
            <td>${entry.buildingName}</td>
            <td>${entry.vehicleName}</td>
            <td>${entry.price.toLocaleString()}</td>
            <td>${entry.currency}</td>
        </tr>`;
        });
        html += '</tbody></table>';
        content.innerHTML = html;
    }

    // Aktuelle Credits/Coins holen und aktualisieren
    async function updateUserResources(){
        try {
            const res = await fetch('/api/userinfo');
            const data = await res.json();
            currentCredits = data.credits_user_current || 0;
            currentCoins = data.coins_user_current || 0;

            document.getElementById('fm-credits').textContent = currentCredits.toLocaleString();
            document.getElementById('fm-coins').textContent = currentCoins.toLocaleString();

            // Buttons nachführen
            updateBuyButtons();
        } catch(e) {
            console.warn(e);
        }
    }

    // Tabellen nach Schließen des Config-Modals aktualisieren
    $(document).on('hidden.bs.modal', '#fahrzeugConfigModal', async function () {
        if (!document.getElementById('fahrzeugManagerModal')) return;
        try {
            await updateUserResources();
            await loadBuildingsFromAPI();
        } catch (err) {
            console.warn('[FM] Fehler beim Neuladen nach Schließen des Konfig-Modals:', err);
            const content = document.getElementById('fahrzeug-manager-content');
            if (!content) return;

            const filteredBuildings = buildingDataGlobal.filter(b => getBuildingTypeName(b) !== null);

            // Tabellen neu bauen
            content.innerHTML = buildBuildingsByType(filteredBuildings, vehicleMapGlobal, vehicleTypeMapGlobal, lssmBuildingDefsGlobal);

            // Spoiler-Eventlistener erneut setzen
            document.querySelectorAll('.fm-spoiler-header').forEach(header => {
                header.addEventListener('click', () => {
                    const targetId = header.dataset.target;
                    document.querySelectorAll('.fm-spoiler-body').forEach(body => {
                        body.id === targetId ? body.classList.toggle('active') : body.classList.remove('active');
                    });
                });
            });

            // Checkbox-Listener für Kosten aktualisieren
            setTimeout(() => {
                document.querySelectorAll('.fm-table').forEach(table => {
                    const allCheckbox = table.querySelector('.fm-select-all');
                    const filterLeitstelle = table.querySelector('.fm-filter-leitstelle');
                    const filterWache = table.querySelector('.fm-filter-wache');
                    const resetBtn = table.querySelector('.fm-filter-reset');
                    if (!allCheckbox || !filterLeitstelle || !filterWache || !resetBtn) return;

                    function applyFilters() {
                        const leitstelle = filterLeitstelle.value;
                        const wache = filterWache.value;
                        table.querySelectorAll('tbody tr').forEach(row => {
                            const rowLeitstelle = row.cells[1].textContent.trim();
                            const rowWache = row.cells[2].textContent.trim();
                            row.style.display = (leitstelle && rowLeitstelle !== leitstelle) || (wache && rowWache !== wache) ? 'none' : '';
                        });
                        const visibleCheckboxes = [...table.querySelectorAll('tbody tr')]
                        .filter(r => r.style.display !== 'none')
                        .map(r => r.querySelector('.fm-select'));
                        allCheckbox.checked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb && cb.checked);
                    }

                    allCheckbox.addEventListener('change', () => {
                        const checked = allCheckbox.checked;
                        table.querySelectorAll('tbody tr').forEach(row => {
                            if (row.style.display !== 'none') {
                                const cb = row.querySelector('.fm-select');
                                if (cb) cb.checked = checked;
                            }
                        });
                        updateSelectedCosts();
                    });
                    filterLeitstelle.addEventListener('change', applyFilters);
                    filterWache.addEventListener('change', applyFilters);
                    resetBtn.addEventListener('click', () => { filterLeitstelle.value=''; filterWache.value=''; applyFilters(); });
                    table.querySelectorAll('.fm-select').forEach(cb => {
                        cb.addEventListener('change', () => { applyFilters(); updateSelectedCosts(); });
                    });
                });
            }, 0);
        }

        // UI final aktualisieren: Auswahl zurücksetzen und Kosten/Buttons anpassen
        try {
            document.querySelectorAll('.fm-select').forEach(cb => cb.checked = false);
            updateSelectedCosts();
            updateBuyButtons();
        } catch (e) { /* ignore */ }
    });

    $(document).on('shown.bs.modal', '#fahrzeugManagerModal', function () {
        document.querySelectorAll('.fm-select').forEach(cb => cb.checked = false);
        document.getElementById('fm-costs-credits').textContent = '0';
        document.getElementById('fm-costs-coins').textContent = '0';

        updateUserResources();
        loadBuildingsFromAPI();
    });

})();
