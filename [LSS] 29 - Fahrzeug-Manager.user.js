// ==UserScript==
// @name         [LSS] Fahrzeug-Manager (Beta)
// @namespace    https://leitstellenspiel.de/
// @version      0.5
// @description  Zeigt fehlden Fahrzeuge pro Wache, je Einstellung an und ermöglicht den Kauf dieser.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
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
            a.innerHTML = '<span class="glyphicon glyphicon-list"></span>&nbsp;&nbsp; Fahrzeug-Manager';
            li.appendChild(a);
            menu.insertBefore(li, divider);
        }
    }

    // Modal HTML
    const modalHTML = `
        <div class="modal fade" id="fahrzeugManagerModal" tabindex="-1" role="dialog" aria-labelledby="fahrzeugManagerLabel">
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header" fm-sticky-header">
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
                  <button type="button" class="fm-help-btn">❔ Hilfe</button>
                  <button type="button" class="fm-close-btn" data-dismiss="modal">Schließen ✖</button>
                </div>
              </div>
              <div class="modal-body" style="padding-top:8px;">
                <div id="fm-help-box" style="
                    display:none;
                    margin-bottom:10px;
                    padding:10px;
                    border:1px solid var(--spoiler-border);
                    border-radius:6px;
                    background:var(--spoiler-body-bg);
                    color:var(--spoiler-body-text);
                    font-size:13px;
                    line-height:1.4;
                ">
                  <strong>ℹ️ Fahrzeugkonfiguration – Kurzanleitung</strong><br>
                  Hier kannst du festlegen, welche Fahrzeuge auf welche Wache sollen.
                  Du kannst mehrere <strong>Profile</strong> anlegen welche automatisch gespeichert werden, um verschiedene Konfigurationen zu verwalten
                  (z.&nbsp;B. „Flughafenfeuerwehr“, „Werkfeuerwehr“, „Pol-Groß“, „Pol-Klein“, ect).<br><br>
                  <ul style="margin:0 0 0 18px; padding:0;">
                    <li>☑️ Haken entfernen → Fahrzeug wird abgewählt</li>
                    <li>🔢 Zahl ändern → Menge des Fahrzeugtyps anpassen</li>
                    <li>💾 Änderungen werden automatisch gespeichert</li>
                    <li>📂 „Profil anlegen“ → Neues Profil anlegen und speichern</li>
                    <li>🗑️ „Profil löschen“ → Aktuelles Profil entfernen</li>
                    <li>👁️ „Abgewählte Fahrzeuge anzeigen“ → Abgewählte Fahrzeuge ein-/ausblenden</li>
                  </ul>
                </div>
                <div id="fahrzeug-config-content">
                  <p>Lade Fahrzeugtypen...</p>
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

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.insertAdjacentHTML('beforeend', configModalHTML);
    document.body.insertAdjacentHTML('beforeend', logModalHTML);

    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'fm-config-btn') {
            e.preventDefault();
            $('#fahrzeugConfigModal').modal('show');
            loadVehicleConfig();
        }
    }); // Konfigbutton
    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'fm-log-btn') {
            e.preventDefault();
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
            $('#fahrzeugManagerModal').modal('show');
            loadBuildingsFromAPI();
        }
    }); // Managerbutton
    document.addEventListener('click', e => {
        if (e.target.classList.contains('fm-help-btn')) {
            const helpBox = document.getElementById('fm-help-box');
            if (!helpBox) return;
            const isVisible = helpBox.style.display === 'block';
            helpBox.style.display = isVisible ? 'none' : 'block';
            e.target.textContent = isVisible ? '❔ Hilfe' : '❌ Hilfe ausblenden';
        }
    }); // Hilfebutton

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
        body:not(.dark) { --spoiler-border: #ddd; --spoiler-header-bg: #f7f7f7; --spoiler-header-text: #000; --spoiler-header-hover: #eaeaea; --spoiler-body-bg: #fff; --spoiler-body-text: #000; --table-header-bg: #f1f1f1; }
        body.dark { --spoiler-border: #444; --spoiler-header-bg: #333; --spoiler-header-text: #eee; --spoiler-header-hover: #444; --spoiler-body-bg: #222; --spoiler-body-text: #ddd; --table-header-bg: #333; }
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
        .fm-help-btn { background-color: #17a2b8; color: white; border: none; border-radius: 4px; padding: 5px 10px; font-size: 13px; cursor: pointer; }
        .fm-help-btn:hover { background-color: #138496; }
        #fahrzeugLogModal { z-index: 10002 !important; }
        #fahrzeugLogModal .modal-content { width: 100%; overflow-x: auto; }
        #fahrzeugLogModal .modal-dialog { max-width: 1500px; width: 70%; margin: 30px auto; }
        #fahrzeugLogModal + .modal-backdrop { z-index: 10001 !important; }
        .fm-log-btn { background-color: #17a2b8; color: white; border: none; border-radius: 4px; padding: 5px 10px; font-size: 13px; cursor: pointer; }
        .fm-reset-log-btn { background-color: #ffc107; color: #333; border: none; border-radius: 4px; padding: 5px 10px; font-size: 13px; cursor: pointer; margin-left: 10px; }
        .fm-reset-log-btn:hover { background-color: #e0a800; }
        .fm-building-profile { background-color: var(--bs-body-bg, #fff); color: var(--bs-body-color, #000); }
        .fm-building-profile { background-color: #222; color: #f0f0f0; border-color: #444; }
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
                // Patch: Nur Erweiterungen zählen, die wirklich verfügbar sind!
                if (lssmExt && lssmExt.givesParkingLots) {
                    // Erweiterung muss verfügbar sein!
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

    // LSS-Manager Fahrzeugtypen laden
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

    // LSS-Manager Building-Definitionen laden
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

            // Wichtig: Listener für die Tabellen (Select-All, Filter, Checkboxen) anfügen
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
        // Standard: Level + 1
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

        if (!matchingExtDef) return null; // keine Erweiterung nötig

        // reale Erweiterung anhand des Caption-Vergleichs finden
        const realExt = building.extensions.find(e =>
                                                 e.caption.trim().toLowerCase() === matchingExtDef.caption.trim().toLowerCase()
                                                );

        // 🔍 Debug-Ausgabe zur Kontrolle
        console.debug("🔍 Erweiterungsprüfung:", {
            gebäude: building.caption,
            fahrzeugTypeId: vehicleTypeId,
            fahrzeugName: lssmBuildingDefs[building.building_type]?.caption ?? '?',
            erforderlicheErweiterung: matchingExtDef.caption,
            vorhandeneErweiterungen: building.extensions.map(e => ({
                caption: e.caption,
                available: e.available,
                enabled: e.enabled
            })),
            realExt
        });

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

    // --- Einzelne Tabellen: Event-Listener zentral anlegen ---
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
        document.querySelectorAll('#fahrzeugModal table tbody tr').forEach(row => {
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
            if (!raw) return { activeProfile: 'Standard', profiles: { 'Standard': [] } };
            const parsed = JSON.parse(raw);
            if (!parsed.profiles) parsed.profiles = { 'Standard': [] };
            if (!parsed.activeProfile) parsed.activeProfile = Object.keys(parsed.profiles)[0] || 'Standard';
            return parsed;
        } catch (e) {
            console.warn(`[FM][Config] Fehler beim Laden der Profile ${buildingKey}:`, e);
            return { activeProfile: 'Standard', profiles: { 'Standard': [] } };
        }
    }

    // Speichert die Profile für ein bestimmtes Gebäude
    function saveProfiles(buildingKey, data) {
        localStorage.setItem(`fm-config-${buildingKey}-profiles`, JSON.stringify(data));
    }

    // Gibt die Konfiguration des aktuell aktiven Profils für ein bestimmtes Gebäude zurück.
    function getActiveProfileConfig(buildingKey) {
        const data = loadProfiles(buildingKey);
        return data.profiles[data.activeProfile] || [];
    }

    // Speichert eine neue Konfiguration für das aktuell aktive Profil eines Gebäudes.
    function saveActiveProfileConfig(buildingKey, config) {
        const data = loadProfiles(buildingKey);
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
        if (!vehicles || vehicles.length === 0) return '<div>Keine Fahrzeuge vorhanden</div>';

        vehicles.sort((a, b) => a.caption.localeCompare(b.caption));

        // ---- Profile laden ----
        const profilesData = loadProfiles(tableId);
        const profileNames = Object.keys(profilesData.profiles).filter(p => p !== 'Standard');
        const hasProfiles = profileNames.length > 0;
        const activeProfile = hasProfiles ? profilesData.activeProfile : null;
        const savedConfig = getActiveProfileConfig(tableId);

        // ---- Kopfbereich ----
        let html = `<div style="margin-bottom:5px; display:flex; flex-wrap:wrap; gap:5px; align-items:center;">`;

        if (hasProfiles) {
            html += `
        <label>Profil(e):</label>
        <select class="fm-profile-select" data-table="${tableId}"
                style="padding:2px 4px; border:1px solid var(--spoiler-border); border-radius:4px;
                       background:var(--spoiler-body-bg); color:var(--spoiler-body-text);">
            ${profileNames.map(name => `<option value="${name}" ${name === activeProfile ? 'selected' : ''}>${name}</option>`).join('')}
        </select>`;
        }

        html += `
            <button class="btn btn-primary btn-xs fm-profile-saveas" data-table="${tableId}">Profil anlegen</button>
            <button class="btn btn-danger btn-xs fm-profile-delete" data-table="${tableId}">Profil löschen</button>
            <button class="btn btn-success btn-xs fm-config-select-all" data-table="${tableId}">Alle anwählen</button>
            <button class="btn btn-danger btn-xs fm-config-deselect-all" data-table="${tableId}">Alle abwählen</button>
            <button class="btn btn-warning btn-xs fm-config-toggle" data-table="${tableId}">Abgewählte Fahrzeuge anzeigen</button>
        </div>`;

        // ---- Fahrzeugraster ----
        html += `<div class="fm-config-grid" id="fm-config-table-${tableId}"
        style="display: grid; grid-template-columns: repeat(${itemsPerRow}, minmax(120px, 1fr)); gap: 4px 8px; width: 100%;">`;

        vehicles.forEach((vehicle, idx) => {
            const saved = savedConfig.find(c =>
                                           (c.typeId !== undefined && String(c.typeId) === String(vehicle.id)) ||
                                           c.caption === vehicle.caption
                                          );
            const checked = saved ? !!saved.checked : true;
            const amount = saved ? (parseInt(saved.amount, 10) || 1) : 1;

            html += `
            <div class="fm-config-cell" style="
                white-space: nowrap;
                display: ${checked ? 'flex' : 'none'};
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
                padding: 4px 6px;
                border: 1px solid var(--spoiler-border);
                border-radius: 4px;
                background: var(--spoiler-body-bg);
                color: var(--spoiler-body-text);
            ">
            <label style="cursor: pointer; display: flex; align-items: center; gap: 4px; width: 100%;">
                <input type="checkbox" class="fm-config-select" id="fm-config-select-${tableId}-${idx}"
                    data-caption="${vehicle.caption}"
                    data-type-id="${vehicle.id}"
                    ${checked ? 'checked' : ''}>
                <span title="${vehicle.caption}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${vehicle.caption}
            </span>
            </label>
            <input type="number" class="fm-config-amount" id="fm-config-amount-${tableId}-${idx}"
                value="${amount}" min="1" style="
                width: 100%;
                padding: 2px 4px;
                border: 1px solid var(--spoiler-border);
                border-radius: 3px;
                background: var(--spoiler-body-bg);
                color: var(--spoiler-body-text);
            " />
        </div>`;
        });

        html += `</div>`; // Ende Grid

        // ---- Event-Bindings ----
        setTimeout(() => {
            const grid = document.getElementById(`fm-config-table-${tableId}`);
            if (!grid) return;

            const header = document.querySelector(`[data-target="fm-config-body-${tableId}"]`);
            const profileSelect = grid.parentElement.querySelector('.fm-profile-select');
            const btnSaveAs = grid.parentElement.querySelector('.fm-profile-saveas');
            const btnDelete = grid.parentElement.querySelector('.fm-profile-delete');
            const btnSelectAll = grid.parentElement.querySelector('.fm-config-select-all');
            const btnDeselectAll = grid.parentElement.querySelector('.fm-config-deselect-all');
            const toggleBtn = grid.parentElement.querySelector('.fm-config-toggle');

            function updateHeaderCount() {
                let selected = 0;
                grid.querySelectorAll('.fm-config-cell').forEach(cell => {
                    const cb = cell.querySelector('.fm-config-select');
                    const input = cell.querySelector('.fm-config-amount');
                    if (!cb || !input) return;
                    if (cb.checked) selected += parseInt(input.value, 10) || 0;
                });
                if (header) header.innerHTML = `${buildingCaption} – ${selected} Fahrzeuge${activeProfile ? ' ('+activeProfile+')' : ''}`;
            }

            function saveConfig() {
                const config = [];
                grid.querySelectorAll('.fm-config-cell').forEach(cell => {
                    const cb = cell.querySelector('.fm-config-select');
                    const input = cell.querySelector('.fm-config-amount');
                    if (!cb || !input) return;
                    config.push({
                        typeId: parseInt(cb.dataset.typeId, 10),
                        caption: cb.dataset.caption,
                        checked: cb.checked,
                        amount: parseInt(input.value, 10) || 1
                    });
                });
                saveActiveProfileConfig(tableId, config);
            }

            // Checkbox- & Input-Events
            grid.querySelectorAll('.fm-config-select').forEach(cb => {
                const cell = cb.closest('.fm-config-cell');
                cb.addEventListener('change', () => {
                    if (!cell) return;
                    cell.style.display = cb.checked ? '' : 'none';
                    updateHeaderCount(); saveConfig();
                });
            });
            grid.querySelectorAll('.fm-config-amount').forEach(input => {
                input.addEventListener('change', () => { updateHeaderCount(); saveConfig(); });
                input.addEventListener('input', () => { updateHeaderCount(); saveConfig(); });
            });

            // Alle auswählen / abwählen
            btnSelectAll?.addEventListener('click', () => {
                grid.querySelectorAll('.fm-config-select').forEach(cb => cb.checked = true);
                grid.querySelectorAll('.fm-config-cell').forEach(cell => cell.style.display = '');
                updateHeaderCount(); saveConfig();
            });
            btnDeselectAll?.addEventListener('click', () => {
                grid.querySelectorAll('.fm-config-select').forEach(cb => cb.checked = false);
                grid.querySelectorAll('.fm-config-cell').forEach(cell => cell.style.display = 'none');
                updateHeaderCount(); saveConfig();
            });

            // Toggle abgewählte Fahrzeuge
            if (toggleBtn) {
                let showingHidden = false;
                toggleBtn.addEventListener('click', () => {
                    showingHidden = !showingHidden;
                    grid.querySelectorAll('.fm-config-cell').forEach(cell => {
                        const cb = cell.querySelector('.fm-config-select');
                        if (cb && !cb.checked) cell.style.display = showingHidden ? '' : 'none';
                    });
                    toggleBtn.textContent = showingHidden ? 'Abgewählte Fahrzeuge ausblenden' : 'Abgewählte Fahrzeuge anzeigen';
                });
            }

            // ---- Profil erstellen / löschen ----
            btnSaveAs?.addEventListener('click', () => {
                const newName = prompt('Neues Profil:');
                if (!newName) return;

                const data = loadProfiles(tableId);

                // Neues, leeres Profil anlegen (alle Fahrzeuge ausgewählt = "sichtbar")
                const newProfileConfig = vehicles.map(v => ({
                    typeId: parseInt(v.id, 10),
                    caption: v.caption,
                    checked: true,
                    amount: 1
                }));

                data.profiles[newName] = newProfileConfig;
                data.activeProfile = newName;

                saveProfiles(tableId, data);

                // Tabelle neu aufbauen (frische Auswahl)
                grid.parentElement.innerHTML = buildConfigGrid(vehicles, tableId, itemsPerRow, buildingCaption);
            });

            btnDelete?.addEventListener('click', () => {
                const data = loadProfiles(tableId);
                const active = data.activeProfile;

                if (!active) return alert('Kein Profil zum Löschen vorhanden.');
                if (!confirm(`Profil "${active}" wirklich löschen?`)) return;

                delete data.profiles[active];

                const remaining = Object.keys(data.profiles);
                if (remaining.length === 0) {
                    // Keine Profile mehr vorhanden → komplett neu starten
                    data.activeProfile = 'Standard';
                    data.profiles = { 'Standard': [] };
                } else {
                    // Nächstes vorhandenes Profil aktivieren
                    data.activeProfile = remaining[0];
                }

                saveProfiles(tableId, data);
                grid.parentElement.innerHTML = buildConfigGrid(vehicles, tableId, itemsPerRow, buildingCaption);
            });


            // Profil wechseln
            profileSelect?.addEventListener('change', () => {
                const data = loadProfiles(tableId);
                data.activeProfile = profileSelect.value;
                saveProfiles(tableId, data);
                grid.parentElement.innerHTML = buildConfigGrid(vehicles, tableId, itemsPerRow, buildingCaption);
            });

            updateHeaderCount();

        }, 0);

        return html;
    }

    // Tabelle für Gebäude eines Typs
    function buildFahrzeugTable(buildings, tableId, vehicleMap, vehicleTypeMap, lssmBuildingDefs) {
        const leitstellen = [...new Set(buildings.map(b => b.leitstelle_caption).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'de'));

        const wachen = [...new Set(buildings.map(b => b.caption).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'de'));

        let html = `<table class="table fm-table" id="fm-table-${tableId}">
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
                        <button class="fm-filter-reset btn btn-primary btn-xs" data-table="${tableId}">
                            Filter zurücksetzen
                        </button>
                    </td>
                    <td colspan="4"></td>
                    <td style="text-align: center;">
                        <button class="btn btn-success btn-xs fm-buy-selected-credits" data-table="${tableId}">
                            💳 Alle kaufen
                        </button>
                    </td>
                    <td style="text-align: center;">
                        <button class="btn btn-danger btn-xs fm-buy-selected-coins" data-table="${tableId}">
                            🪙 Alle kaufen
                        </button>
                    </td>
                </tr>
            </thead>
            <tbody>`;

        const sortedBuildings = buildings.slice().sort((a, b) => a.caption.localeCompare(b.caption));

        sortedBuildings.forEach((b, idx) => {
            const vehiclesOnBuilding = vehicleMap[b.id] || [];

            const typeCountMapOnBuilding = {};
            vehiclesOnBuilding.forEach(v => {
                const typeId = v.vehicle_type;
                const typeName = vehicleTypeMap[typeId]?.caption || `Unbekannt (Typ ${typeId})`;
                typeCountMapOnBuilding[typeName] = (typeCountMapOnBuilding[typeName] || 0) + 1;
            });

            const vehicleNames = Object.entries(typeCountMapOnBuilding)
            .map(([name, count]) => (count > 1 ? `${count}x ${name}` : name))
            .join(',<wbr> ') || 'Keine Fahrzeuge auf Wache vorhanden';

            const configKey = `${b.building_type}_${b.small_building ? 'small' : 'normal'}`;
            const profilesData = loadProfiles(configKey);
            const profileNames = Object.keys(profilesData.profiles).filter(p => p !== 'Standard');
            const hasProfiles = profileNames.length > 0;
            const activeProfile = hasProfiles ? getBuildingActiveProfile(b.id, configKey) : null;

            const missingData = getMissingVehiclesForBuilding(b, vehicleMap, vehicleTypeMap, configKey);
            const buyableData = getBuyableMissingVehicles(b, vehicleMap, vehicleTypeMap, lssmBuildingDefs);


            const coloredMissingNames = missingData.vehiclesIds && missingData.vehiclesIds.length > 0
            ? Object.entries(missingData.vehiclesIds.reduce((acc, id) => {
                acc[id] = (acc[id] || 0) + 1;
                return acc;
            }, {})).map(([id, count]) => {
                const typeId = parseInt(id, 10);
                const status = getExtensionStatusForVehicle(b, typeId, lssmBuildingDefs);
                const name = vehicleTypeMap[typeId]?.caption || `Unbekannt (Typ ${id})`;
                const displayName = count > 1 ? `${count}x ${name}` : name;

                switch (status) {
                    case 'locked':
                    case 'missing':
                        return `<span style="color: red; font-weight: bold;" title="Erweiterung fehlt">${displayName}</span>`;
                    case 'in_progress':
                        return `<span style="color: orange; font-weight: bold;" title="Erweiterung im Bau">${displayName}</span>`;
                    default:
                        return displayName;
                }
            }).join(',<wbr>&nbsp;')
            : missingData.names;

            const missingVehiclesJson = JSON.stringify(missingData.vehiclesIds || []);
            const maxVehicles = calcMaxParkingLots(b, lssmBuildingDefs);
            const freieStellplaetze = Math.max(maxVehicles - vehiclesOnBuilding.length, 0);

            const profileCell = hasProfiles
            ? `<select class="fm-building-profile" data-building-id="${b.id}" data-config-key="${configKey}"
                    style="padding:2px 4px; border:1px solid var(--spoiler-border); border-radius:4px;
                           background:var(--spoiler-body-bg); color:var(--spoiler-body-text); width:100%;">
                    ${profileNames.map(p => `<option value="${p}" ${p === activeProfile ? 'selected' : ''}>${p}</option>`).join('')}
               </select>`
            : `<span style="color: var(--text-color-secondary, #999); font-style: italic;">– kein Profil –</span>`;

            html += `<tr data-building-id="${b.id}" data-config-key="${configKey}" data-missing-vehicle-ids='${missingVehiclesJson}'>
                    <td><input type="checkbox" class="fm-select" id="fm-select-${tableId}-${idx}"
                               data-credits="${buyableData.totalCredits}" data-coins="${buyableData.totalCoins}"></td>
                    <td>${b.leitstelle_caption ?? '-'}</td>
                    <td>${b.caption}</td>
                    <td>${profileCell}</td>
                    <td>${b.vehicle_count ?? 0}</td>
                    <td><span class="badge fm-badge-green">${freieStellplaetze}</span></td>
                    <td><span class="fm-vehicle-list">${vehicleNames}</span></td>
                    <td><span class="fm-vehicle-list">${coloredMissingNames}</span></td>
                    <td>
                      <button class="btn btn-success btn-xs fm-buy-credit"
                        ${buyableData.totalCredits === 0 ? 'disabled title="Keine kaufbaren Fahrzeuge"' :
            (buyableData.totalCredits > currentCredits ? 'disabled title="Nicht genug Credits"' : '')}>
                        ${buyableData.totalCredits.toLocaleString()} Credits
                      </button>
                    </td>
                    <td>
                      <button class="btn btn-danger btn-xs fm-buy-coin"
                        ${buyableData.totalCoins === 0 ? 'disabled title="Keine kaufbaren Fahrzeuge"' :
            (buyableData.totalCoins > currentCoins ? 'disabled title="Nicht genug Coins"' : '')}>
                        ${buyableData.totalCoins.toLocaleString()} Coins
                      </button>
                    </td>
                </tr>`;
        });

        html += '</tbody></table>';

        // ---- Eventlistener für Profilwechsel ----
        setTimeout(() => {
            document.querySelectorAll('.fm-building-profile').forEach(sel => {
                sel.addEventListener('change', e => {
                    const buildingId = e.target.dataset.buildingId;
                    const configKey = e.target.dataset.configKey;
                    const selectedProfile = e.target.value;
                    setBuildingActiveProfile(buildingId, configKey, selectedProfile);

                    const container = document.getElementById(`fm-table-${tableId}`).parentElement;
                    container.innerHTML = buildFahrzeugTable(buildings, tableId, vehicleMap, vehicleTypeMap, lssmBuildingDefs);
                });
            });
        }, 0);

        return html;
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

    // Funktiion zum Kauf der fehlenden Fahrzeuge
    async function buyVehicles(rows, currency, confirmBeforeBuy = true) {
        if (!rows || rows.length === 0) return;

        // Hilfsfunktion für Protokoll-Eintrag
        function logPurchase({ time, buildingId, buildingName, vehicleId, vehicleName, price, currency }) {
            const LOG_KEY = 'fm-purchase-log';
            const RESET_KEY = 'fm-purchase-log-reset';

            // Check for auto-reset
            let lastReset = parseInt(localStorage.getItem(RESET_KEY), 10) || 0;
            const now = Date.now();
            const ONE_MONTH = 1000 * 60 * 60 * 24 * 30; // Millisekunden für 30 Tage

            if (now - lastReset > ONE_MONTH) {
                // Reset log if older than 1 month
                localStorage.setItem(LOG_KEY, JSON.stringify([]));
                localStorage.setItem(RESET_KEY, now.toString());
            }

            // Save log entry
            let log = [];
            try { log = JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch {}
            log.push({ time, buildingId, buildingName, vehicleId, vehicleName, price, currency });
            localStorage.setItem(LOG_KEY, JSON.stringify(log));
        }

        // Kaufplan erstellen aus den Zeilen
        const buyPlanMap = {};
        rows.forEach(row => {
            const vehicleIds = JSON.parse(row.dataset.missingVehicleIds || '[]');
            const buildingId = Number(row.dataset.buildingId);
            vehicleIds.forEach(vehicleTypeId => {
                const key = `${buildingId}-${vehicleTypeId}`;
                buyPlanMap[key] = (buyPlanMap[key] || 0) + 1;
            });
        });

        // Frische Fahrzeugdaten laden
        let freshVehiclesData = [];
        try {
            freshVehiclesData = await fetch('/api/vehicles').then(r => r.json());
        } catch (e) {
            alert("Fehler beim Nachladen der aktuellen Fahrzeugliste. Der Kauf wird abgebrochen.");
            return;
        }
        const freshVehicleMap = {};
        freshVehiclesData.forEach(v => {
            if (!freshVehicleMap[v.building_id]) freshVehicleMap[v.building_id] = [];
            freshVehicleMap[v.building_id].push(v);
        });

        // Finale Kaufliste erstellen
        const filteredBuyList = [];
        Object.entries(buyPlanMap).forEach(([key, wanted]) => {
            const [buildingId, vehicleTypeId] = key.split('-').map(Number);
            if (wanted > 0) {
                for (let i = 0; i < wanted; ++i) {
                    filteredBuyList.push({ buildingId, vehicleId: vehicleTypeId });
                }
            }
        });

        if (filteredBuyList.length === 0) {
            alert("Keine Fahrzeuge mehr zu kaufen – die gewünschte Anzahl ist schon vorhanden!");
            return;
        }

        // Gesamtkosten berechnen
        let totalCost = 0;
        filteredBuyList.forEach(v => {
            const vt = vehicleTypeMapGlobal[v.vehicleId];
            if (!vt) return;
            totalCost += currency === 'credits' ? vt.credits : vt.coins;
        });

        const available = currency === 'credits' ? currentCredits : currentCoins;
        if (totalCost > available) {
            alert(`❌ Nicht genug ${currency === 'credits' ? 'Credits' : 'Coins'}!\nBenötigt: ${totalCost.toLocaleString()} ${currency === 'credits' ? 'Credits' : 'Coins'}\nVorhanden: ${available.toLocaleString()} ${currency === 'credits' ? 'Credits' : 'Coins'}`);
            return;
        }

        if (confirmBeforeBuy && !confirm(`Möchtest du wirklich ${filteredBuyList.length} Fahrzeuge für ${totalCost.toLocaleString()} ${currency === 'credits' ? 'Credits' : 'Coins'} kaufen?`)) {
            return;
        }

        // Fortschrittsanzeige im Modal-Header
        const progressContainer = document.getElementById('fm-progress-container');
        const progressText = document.getElementById('fm-progress-text');
        const progressBar = document.getElementById('fm-progress-bar');
        progressContainer.style.display = 'block';
        progressText.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = `Kauf gestartet...`;

        // Gebäudenamen für Logging
        const buildingsById = {};
        (buildingDataGlobal || []).forEach(b => buildingsById[b.id] = b.caption);

        let boughtCount = 0;
        for (let i = 0; i < filteredBuyList.length; i++) {
            const { buildingId, vehicleId } = filteredBuyList[i];
            const vehicleName = vehicleTypeMapGlobal?.[vehicleId]?.caption || `Typ ${vehicleId}`;
            const buildingName = buildingsById?.[buildingId] || buildingId;
            const url = `/buildings/${buildingId}/vehicle/${buildingId}/${vehicleId}/${currency}?building=${buildingId}`;
            const vt = vehicleTypeMapGlobal?.[vehicleId];

            try {
                const res = await fetch(url, { method: 'GET' });
                if (res.ok) {
                    boughtCount++;
                    // Protokoll-Eintrag speichern:
                    logPurchase({
                        time: Date.now(),
                        buildingId,
                        buildingName,
                        vehicleId,
                        vehicleName,
                        price: currency === 'credits' ? vt.credits : vt.coins,
                        currency: currency === 'credits' ? 'Credits' : 'Coins'
                    });
                    console.info(`[Kauf] Erfolgreich gekauft: Typ ${vehicleId} (${vehicleName}) auf Wache ${buildingId} (${buildingName})`);
                } else {
                    let text = '';
                    try { text = await res.text(); } catch {}
                    console.warn(`[Kauf] Fehler beim Kauf von Typ ${vehicleId} (${vehicleName}) auf Wache ${buildingId} (${buildingName}) (Status ${res.status})`, text.slice(0, 200));
                }
            } catch (err) {
                console.error(`[Kauf] Kauf fehlgeschlagen für Typ ${vehicleId} (${vehicleName}) auf Wache ${buildingId} (${buildingName}):`, err);
            }

            progressText.textContent = `${i + 1} / ${filteredBuyList.length} Fahrzeuge gekauft`;
            progressBar.style.width = `${Math.round(((i + 1) / filteredBuyList.length) * 100)}%`;
            if (confirmBeforeBuy) await new Promise(r => setTimeout(r, 1000));
        }

        progressText.textContent = `✅ Kauf abgeschlossen (${boughtCount} Fahrzeuge)`;
        progressBar.style.width = `100%`;

        setTimeout(() => {
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';
        }, 2000);

        console.info(`[Kauf] Zusammenfassung: ${boughtCount} Fahrzeuge erfolgreich gekauft.`);

        // Ansicht aktualisieren
        await loadBuildingsFromAPI();
        updateSelectedCosts();
    }

    // Einzelkauf + Sammelkauf "Alle kaufen"
    document.addEventListener('click', async e => {
        if (e.target && (e.target.classList.contains('fm-buy-credit') || e.target.classList.contains('fm-buy-coin'))) {
            e.preventDefault();
            const row = e.target.closest('tr');
            if (!row) return;
            const currency = e.target.classList.contains('fm-buy-credit') ? 'credits' : 'coins';
            await buyVehicles([row], currency, false);
        }
    });
    document.addEventListener('click', async e => {
        if (e.target && (e.target.classList.contains('fm-buy-selected-credits') || e.target.classList.contains('fm-buy-selected-coins'))) {
            e.preventDefault();
            const table = e.target.closest('table');
            if (!table) return;
            const currency = e.target.classList.contains('fm-buy-selected-credits') ? 'credits' : 'coins';
            const selectedRows = [...table.querySelectorAll('tbody tr input.fm-select:checked')].map(cb => cb.closest('tr'));
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

    // Nur einmal beim Laden ausführen
    updateUserResources();

    // Tabellen nach Schließen des Config-Modals aktualisieren
    $('#fahrzeugConfigModal').on('hidden.bs.modal', () => {
        const content = document.getElementById('fahrzeug-manager-content');
        if (!content) return;

        // Gefilterte Gebäude nach Typ
        const filteredBuildings = buildingDataGlobal.filter(b => getBuildingTypeName(b) !== null);

        // Tabellen neu bauen
        content.innerHTML = buildBuildingsByType(filteredBuildings, vehicleMapGlobal, vehicleTypeMapGlobal, lssmBuildingDefsGlobal, updateSelectedCosts);

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
                    allCheckbox.checked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb.checked);
                }

                allCheckbox.addEventListener('change', () => {
                    const checked = allCheckbox.checked;
                    table.querySelectorAll('tbody tr').forEach(row => {
                        if(row.style.display !== 'none') row.querySelector('.fm-select').checked = checked;
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
    });
})();
