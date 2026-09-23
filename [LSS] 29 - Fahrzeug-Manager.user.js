// ==UserScript==
// @name         [LSS] Fahrzeug-Manager
// @namespace    https://leitstellenspiel.de/
// @version      1.2
// @description  Zeigt fehlende Fahrzeuge, Abrollbehälter, Anhänger und Rollcontainer pro Wache, je Einstellung an und ermöglicht den Kauf dieser.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const coinsButton = false; 
    // Jede menge Daten (mehr wie Google!)
    const buildingTypeNames = {
        '0_normal': 'Feuerwache (Normal)',
        '0_small': 'Feuerwache (Kleinwache)',
        '2_normal': 'Rettungswache (Normal)',
        '2_small': 'Rettungswache (Kleinwache)',
        '5_normal': 'Rettungshubschrauber-Station',
        '6_normal': 'Polizeiwache (Normal)',
        '6_small': 'Polizeiwache (Kleinwache)',
        '9_normal': 'Technisches Hilfswerk',
        '11_normal': 'Bereitschaftspolizei',
        '12_normal': 'Schnelleinsatzgruppe (SEG)',
        '13_normal': 'Polizeihubschrauberstation',
        '15_normal': 'Wasserrettung',
        '17_normal': 'Polizei-Sondereinheiten',
        '24_normal': 'Reiterstaffel',
        '25_normal': 'Bergrettungswache',
        '26_normal': 'Seenotrettungswache',
        '29_normal': 'Autobahnpolizei',
    };
    const specialEquipmentBuildings = {
        police_lift: [13],
        rescue_lift: [5],
        mountain_drone: [25]
    };
    const hiddenBuildings = 'fm-hidden-buildings';
    const menu = document.querySelector('#menu_profile + ul.dropdown-menu'); if (menu) {
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

    let fmDataLoaded = false;
    let fmDataLoadingPromise = null;
    let buildingDataGlobal = [];
    let vehicleDataGlobal = [];
    let vehicleMapGlobal = {};
    let vehicleTypeMapGlobal = {};
    let equipmentTypeMapGlobal = {};
    let equipmentDataGlobal = [];
    let equipmentMapGlobal = {};
    let lssmBuildingDefsGlobal = null;
    let currentCredits = 0;
    let currentCoins = 0;

    // Fahrzeugtypen inklusive Anhänger / Abrollbehälter laden
    async function loadVehicleTypesLSSM() {
        try {
            const res = await fetch('https://api.lss-manager.de/de_DE/vehicles');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            return Object.entries(data).reduce((map, [id, vehicle]) => {
                map[id] = { ...vehicle, id: Number(id) };
                return map;
            }, {});
        } catch (e) {
            console.error('Fehler beim Laden der LSSM Fahrzeugtypen:', e);
            return {};
        }
    }

    // Ausrüstungen laden (RC / Winden)
    async function loadEquipmentTypesLSSM() {
        const url = 'https://raw.githubusercontent.com/LSS-Manager/LSSM-V.4/dev/src/i18n/de_DE/equipment.ts';
        const text = await fetch(url).then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
        });

        const equipment = {};
        const regex = /id:\s*['"]([^'"]+)['"][\s\S]*?caption:\s*['"]([^'"]+)['"][\s\S]*?size:\s*(\d+)[\s\S]*?credits:\s*([\d_]+)[\s\S]*?coins:\s*(\d+)/g;

        let match;
        while ((match = regex.exec(text)) !== null) {
            const [, id, caption, size, credits, coins] = match;
            equipment[id] = {
                id,
                caption,
                size: parseInt(size),
                credits: parseInt(credits.replace(/_/g, '')),
                coins: parseInt(coins),
                itemType: 'equipment',
                type: 'equipment'
            };
        }

        return equipment;
    }

    // Lädt die eigenen Ausrüstungen
    async function loadEquipmentsFromAPI() {
        try {
            const res = await fetch('/api/equipments');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const equipments = await res.json();
            return Array.isArray(equipments) ? equipments : [];
        } catch (e) {
            console.error('[FM] Fehler beim Laden der vorhandenen Equipment-Daten:', e);
            return [];
        }
    }

    // Lädt die Wachentypen
    async function loadLSSMBuildingDefs() {
        try {
            const res = await fetch('https://api.lss-manager.de/de_DE/buildings');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error('Fehler beim Laden der LSSM Building-Defs:', e);
            return {};
        }
    }

    // Fahrzeuge über API v2 laden
    async function loadVehiclesFromAPI(onProgress) {
        const vehicles = [];
        let url = '/api/v2/vehicles?limit=4000';
        let totalVehicles = 0;

        while (url) {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            totalVehicles = data.paging?.count_total || totalVehicles;
            vehicles.push(...(data.result || []));

            onProgress?.(vehicles.length, null, totalVehicles, null);
            url = data.paging?.next_page || null;
        }

        return vehicles;
    }

    // Gebäude über API v2 laden
    async function loadBuildingsFromAPI_v2(onProgress) {
        const buildings = [];
        let url = '/api/v2/buildings?limit=100';
        let totalBuildings = 0;

        while (url) {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            totalBuildings = data.paging?.count_total || totalBuildings;
            buildings.push(...(data.result || []));

            onProgress?.(null, buildings.length, null, totalBuildings);
            url = data.paging?.next_page || null;
        }

        return buildings;
    }

    // Lädt alle benötigten Daten
    async function loadFMData(onProgress) {
        if (fmDataLoaded) return;

        let vehicleCount = 0;
        let buildingCount = 0;
        let totalVehicles = 0;
        let totalBuildings = 0;
        let completedVehiclePages = 0;

        const updateProgress = (vehicles, buildings, totalV, totalB, vehiclePageCompleted = false) => {
            if (vehicles !== null) vehicleCount = vehicles;
            if (buildings !== null) buildingCount = buildings;
            if (totalV !== null) totalVehicles = totalV;
            if (totalB !== null) totalBuildings = totalB;
            if (vehiclePageCompleted) completedVehiclePages++;

            onProgress?.(
                vehicleCount,
                buildingCount,
                totalVehicles,
                totalBuildings,
                completedVehiclePages
            );
        };

        const [buildings, vehicles, vehicleTypes, buildingDefs, equipmentTypes, equipments] = await Promise.all([
            loadBuildingsFromAPI_v2(updateProgress),
            loadVehiclesFromAPI((v, b, tv, tb) => updateProgress(v, b, tv, tb, true)),
            loadVehicleTypesLSSM(),
            loadLSSMBuildingDefs(),
            loadEquipmentTypesLSSM(),
            loadEquipmentsFromAPI()
        ]);

        buildingDataGlobal = buildings;
        vehicleDataGlobal = vehicles;
        vehicleTypeMapGlobal = vehicleTypes;
        lssmBuildingDefsGlobal = buildingDefs;
        equipmentTypeMapGlobal = equipmentTypes;
        equipmentDataGlobal = Object.values(equipmentTypes);
        equipmentMapGlobal = buildEquipmentMap(equipments);

        vehicleMapGlobal = {};
        vehicles.forEach(v => {
            (vehicleMapGlobal[v.building_id] ||= []).push(v);
        });

        fmDataLoaded = true;
    }

    // Gesamte Übersicht laden
    async function loadBuildingsFromAPI() {
        const content = document.getElementById('fahrzeug-manager-content');
        setConfigButtonLoading(true);
        fmDataLoaded = false;

        let yoshiIndex = 0;

        const yoshis = [
            ['https://raw.githubusercontent.com/Caddy21/-docs-assets-css/main/firefighter_yoshi.png', 'Feuerwehr'],
            ['https://raw.githubusercontent.com/Caddy21/-docs-assets-css/main/paramedic_yoshi.png', 'Rettungsdienst'],
            ['https://raw.githubusercontent.com/Caddy21/-docs-assets-css/main/police_yoshi.png', 'Polizei'],
            ['https://raw.githubusercontent.com/Caddy21/-docs-assets-css/main/riot_police_Yoshi.png', 'Bereitschaftspolizei'],
            ['https://raw.githubusercontent.com/Caddy21/-docs-assets-css/main/thw_yoshi.png', 'THW'],
            ['https://raw.githubusercontent.com/Caddy21/-docs-assets-css/main/vip_yoshi.png', 'VIP']
        ];

        const updateLoading = (vehicles = 0, buildings = 0, totalVehicles = 0, totalBuildings = 0, completedPages = 0) => {
            yoshiIndex = Math.min(completedPages, yoshis.length);

            content.innerHTML = `
        <div style="padding:25px;text-align:center;">
            <span class="glyphicon glyphicon-refresh glyphicon-spin" style="font-size:26px;"></span>

            <div style="margin-top:12px;font-weight:bold;">
                Aktuelle Daten werden geladen …
            </div>

            <div>
                🏢 Wachen: <strong>${buildings.toLocaleString()} von ${totalBuildings.toLocaleString()}</strong>
            </div>

            <div style="margin-top:10px;">
                🚒 Fahrzeuge: <strong>${vehicles.toLocaleString()} von ${totalVehicles.toLocaleString()}</strong>
            </div>

            <div style="margin-top:12px;;">
                Bei <b>großen Accounts</b> kann der Datenabruf etwas dauern. Sollte es zu einem Datenabruffehler kommen, einfach das Script schließen und erneut öffnet.
            </div>

            <div style="display:flex;justify-content:center;align-items:flex-start;gap:25px;margin-top:20px;flex-wrap:wrap;">
                ${yoshis.map((yoshi, index) => `
                    <div style="
                        text-align:center;
                        opacity:${index < yoshiIndex ? '1' : '0'};
                        transition:opacity 0.5s ease;
                    ">
                        <img src="${yoshi[0]}" style="height:200px;width:auto;">
                        <div style="margin-top:5px;font-weight:bold;">${yoshi[1]}</div>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top:12px;font-weight:bold;">
                Die Bilder wurden mit viel Liebe von Bowser gemalt.
            </div>
        </div>`;
        };

        updateLoading();

        try {
            await loadFMData(updateLoading);

            const buildings = buildingDataGlobal;
            const vehicleMap = vehicleMapGlobal;

            const leitstellenMap = {};
            buildings.forEach(b => {
                if (b.building_type === 7 || b.is_leitstelle) leitstellenMap[b.id] = b.caption;
            });

            buildings.forEach(b => {
                b.leitstelle_caption = b.leitstelle_building_id && leitstellenMap[b.leitstelle_building_id]
                    ? leitstellenMap[b.leitstelle_building_id]
                : "-";
                b.vehicle_count = (vehicleMap[b.id] || []).length;
            });

            const filteredBuildings = buildings.filter(b => getBuildingTypeName(b) !== null);

            content.innerHTML = buildBuildingsByType(
                filteredBuildings,
                vehicleMap,
                vehicleTypeMapGlobal,
                lssmBuildingDefsGlobal
            );

            document.querySelectorAll('.fm-spoiler-header').forEach(header => {
                header.addEventListener('click', () => {
                    const targetId = header.dataset.target;
                    document.querySelectorAll('.fm-spoiler-body').forEach(body => {
                        body.id === targetId
                            ? body.classList.toggle('active')
                        : body.classList.remove('active');
                    });
                });
            });

            attachAllTableListeners();
            setConfigButtonLoading(false);

        } catch(err) {
            setConfigButtonLoading(false);
            content.innerHTML = `<div class="alert alert-danger">❌ Fehler beim Laden der Daten: ${err}</div>`;
        }
    }

    // Lädt die gespeicherte Konfiguration
    async function loadVehicleConfig() {
        const content = document.getElementById('fahrzeug-config-content');
        content.innerHTML = '<p><span class="glyphicon glyphicon-refresh glyphicon-spin"></span> Lade Fahrzeugkonfiguration...</p>';

        try {
            await loadFMData();

            const vehicleTypes = vehicleTypeMapGlobal;
            const sortedBuildingKeys = Object.keys(buildingTypeNames);
            let html = '';

            sortedBuildingKeys.forEach(key => {
                const buildingId = parseInt(key.split('_')[0], 10);
                const buildingCaption = buildingTypeNames[key];
                if (!buildingCaption) return;

                const vehiclesForBuilding = Object.values(vehicleTypes).filter(v =>
                                                                               Array.isArray(v.possibleBuildings) &&
                                                                               v.possibleBuildings.includes(buildingId)
                                                                              );

                const equipmentForBuilding = Object.values(equipmentDataGlobal).filter(e => {
                    const allowedBuildings = specialEquipmentBuildings[e.id];
                    if (!allowedBuildings) return buildingId === 0;
                    return allowedBuildings.includes(buildingId);
                });

                const itemsForBuilding = [
                    ...vehiclesForBuilding.map(v => ({
                        ...v,
                        itemType: 'vehicle',
                        type: 'vehicle'
                    })),
                    ...equipmentForBuilding.map(e => ({
                        ...e,
                        itemType: 'equipment',
                        type: 'equipment'
                    }))
                ];

                if (itemsForBuilding.length > 0) {
                    html += `
                <div class="fm-spoiler">
                    <div class="fm-spoiler-header" data-target="fm-config-body-${key}">
                        ${buildingCaption} – wird geladen …
                    </div>
                    <div id="fm-config-body-${key}" class="fm-spoiler-body">
                        ${buildConfigGrid(itemsForBuilding, key, 10, buildingCaption)}
                    </div>
                </div>`;
                }
            });

            content.innerHTML = html ||
                '<div class="alert alert-info">Keine passenden Fahrzeuge gefunden.</div>';

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

    // Zentralisiert die Ausrüstungen
    function buildEquipmentMap(equipments) {
        const map = {};
        equipments.forEach(equipment => {
            const buildingId =
                  equipment.building_id ??
                  equipment.buildingId;

            const typeId =
                  equipment.equipment_type ??
                  equipment.equipmentType ??
                  equipment.type_id ??
                  equipment.typeId;

            if (buildingId == null || typeId == null) return;
            if (!map[buildingId]) {
                map[buildingId] = {};
            }

            const key = String(typeId);

            map[buildingId][key] =
                (map[buildingId][key] || 0) + 1;
        });
        return map;
    }

    // Stellplatzberechnung für alle Gebäudetypen
    function calcMaxParkingLots(building, lssmBuildings) {
        const bTypeId = String(building.building_type);
        const level = Number(building.level ?? 1);
        const lssmDef = lssmBuildings?.[bTypeId];
        if (!lssmDef) return level + 1;

        // Hubschrauber-Stationen: jede Ausbaustufe = 1 zusätzlicher Stellplatz
        if ([5, 13, 28].includes(Number(building.building_type))) {
            return level + 1;
        }

        let max = Number(lssmDef.startParkingLots || 0);

        if (Array.isArray(building.extensions)) {
            for (const ext of building.extensions) {
                const lssmExt = lssmDef.extensions?.find(e =>
                                                         (typeof ext.type_id !== 'undefined' && typeof e.type_id !== 'undefined' && e.type_id === ext.type_id) ||
                                                         (e.caption && ext.caption && e.caption === ext.caption)
                                                        );
                if (lssmExt && Number(lssmExt.givesParkingLots) > 0 && ext.available === true) {
                    max += Number(lssmExt.givesParkingLots);
                }
            }
        }

        if (lssmDef.maxLevel > 0) {
            max += level;
        }

        return max;
    }

    // Stellplatzberechnung für Abrollbehälter
    function calcMaxABParkingLots(building, lssmBuildings) {
        const bTypeId = String(building.building_type);
        const lssmDef = lssmBuildings?.[bTypeId];
        if (!lssmDef || !Array.isArray(building.extensions)) return 0;

        return building.extensions.reduce((total, ext) => {
            const lssmExt = lssmDef.extensions?.find(e =>
                                                     (typeof ext.type_id !== 'undefined' && typeof e.type_id !== 'undefined' && e.type_id === ext.type_id) ||
                                                     (e.caption && ext.caption && e.caption === ext.caption)
                                                    );

            if (
                lssmExt &&
                lssmExt.caption === 'Abrollbehälter-Stellplatz' &&
                lssmExt.givesParkingLots &&
                ext.available === true
            ) {
                return total + lssmExt.givesParkingLots;
            }

            return total;
        }, 0);
    }

    // Stellplatzberechnung für Anhänger
    function calcMaxAnhStellplaetze(building) {
        if (!building || !Array.isArray(building.extensions)) return 0;
        return building.extensions.filter(ext =>
                                          Number(ext.type_id) === 20 &&
                                          String(ext.caption || '').trim().toLowerCase() === 'anhänger-stellplatz' &&
                                          ext.available === true
                                         ).length;
    }

    // Fügt den Gebäudelink hinzu
    function buildBuildingLink(building) {
        const url = `/buildings/${building.id}`;
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="fm-building-link">${building.caption}</a>`;
    }

    // Maximale Stellplätze berechnen
    function getMaxVehiclesForBuilding(building, lssmBuildingDefs) {
        let max = building.level !== undefined ? building.level + 1 : 1;
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
        if (!building || !lssmBuildingDefs) return null;

        const buildingDef = lssmBuildingDefs[building.building_type];

        if (!buildingDef || !Array.isArray(buildingDef.extensions)) {
            return null;
        }

        const typeId = Number(vehicleTypeId);
        const vehicleType = vehicleTypeMapGlobal?.[typeId];

        if (!vehicleType) return null;

        const extensions = buildingDef.extensions;

        const matchingExtDef = extensions.find(extDef =>
                                               Array.isArray(extDef.unlocksVehicleTypes) &&
                                               extDef.unlocksVehicleTypes.some(
            id => Number(id) === typeId
        )
                                              );
        if (!matchingExtDef) {
            return null;
        }
        const realExtension = building.extensions?.find(ext =>
                                                        ext.caption &&
                                                        matchingExtDef.caption &&
                                                        ext.caption.trim().toLowerCase() ===
                                                        matchingExtDef.caption.trim().toLowerCase()
                                                       );
        if (!realExtension) {
            return 'missing';
        }
        if (
            realExtension.available === false &&
            realExtension.enabled === true
        ) {
            return 'in_progress';
        }
        if (
            realExtension.available === true &&
            realExtension.enabled === false
        ) {
            return 'ok';
        }
        return 'ok';
    }

    // Ermittelt alle eigenen RC / Winden
    function getEquipmentById(typeId) {
        const id = String(typeId);

        return equipmentDataGlobal.find(
            e => String(e.id) === id
        ) || equipmentTypeMapGlobal[id] || null;
    }

    // Prüft den Status der Lager jeder Wache (Fehlt/Baut/Vorhanden)
    function getBuildingStorageInfo(building) {
        const storageTotal = Number(building?.storage_total || 0);
        const storageAvailable = Number(building?.storage_available || 0);

        const storageUpgrade = Array.isArray(building?.storage_upgrades)
        ? building.storage_upgrades.find(
            u => u.upgrade_type === 'Lagerraum'
        )
        : null;

        return {
            hasStorage: storageTotal > 0,
            available: storageTotal > 0 && storageAvailable > 0,
            total: storageTotal,
            free: Math.max(storageAvailable, 0),
            upgrade: storageUpgrade
        };
    }

    // Nach Typ gruppieren und Spoiler bauen
    function buildBuildingsByType(buildings, vehicleMap, vehicleTypeMap, lssmBuildingDefs) {
        const grouped = {};
        const hiddenBuildings = getHiddenBuildings();

        buildings.forEach(b => {
            const typeName = getBuildingTypeName(b);
            if (!typeName) return;

            if (!grouped[typeName]) grouped[typeName] = [];
            grouped[typeName].push(b);
        });

        let html = '';
        Object.keys(buildingTypeNames).forEach((key, idx) => {
            const typeName = buildingTypeNames[key];

            if (!grouped[typeName]) return;

            const filteredBuildings = grouped[typeName].filter(b => {
                if (hiddenBuildings.includes(Number(b.id))) return false;

                const vehiclesOnBuilding = vehicleMap[b.id] || [];
                const maxVehicles = calcMaxParkingLots(b, lssmBuildingDefs);

                // Gebäude 13: Außenlastbehälter belegen keine Hubschrauber-Stellplätze.
                const normalVehicles = Number(b.building_type) === 13
                ? vehiclesOnBuilding.filter(v => !isBesonderheit(v.vehicle_type))
                : vehiclesOnBuilding;

                const vehiclesCount = normalVehicles.length;
                const hasFreeVehicleSlot = vehiclesCount < maxVehicles;

                // Gebäude 13: Jeder Hubschrauber-Stellplatz erzeugt zusätzlich
                // einen Stellplatz für einen Außenlastbehälter.
                const hasFreeAussenlastbehaelterSlot = Number(b.building_type) === 13
                ? vehiclesOnBuilding.filter(v => isBesonderheit(v.vehicle_type)).length < maxVehicles
                : false;

                const hasFreeStorage = Number(b.storage_available || 0) > 0;

                return hasFreeVehicleSlot || hasFreeAussenlastbehaelterSlot || hasFreeStorage;
            });

            if (filteredBuildings.length === 0) return;

            html += `
            <div class="fm-spoiler">
                <div class="fm-spoiler-header" data-target="fm-spoiler-body-${idx}">${typeName}</div>
                <div id="fm-spoiler-body-${idx}" class="fm-spoiler-body">${buildFahrzeugTable(filteredBuildings, idx, vehicleMap, vehicleTypeMap, lssmBuildingDefs)}</div>
            </div>`;
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

        const coinsEl = document.getElementById('fm-costs-coins');
        if (coinsEl) coinsEl.textContent = totalCoins.toLocaleString();
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

    // Export: Alle Profile als JSON-Datei herunterladen
    function exportAllProfiles() {
        const exportData = {};

        // Alle Profile für jeden Wachentyp sammeln
        Object.keys(buildingTypeNames).forEach(key => {
            const profilesData = loadProfiles(key);
            if (Object.keys(profilesData.profiles).length > 0) {
                exportData[key] = profilesData;
            }
        });

        if (Object.keys(exportData).length === 0) {
            alert('Es gibt keine Profile zum Exportieren.');
            return;
        }

        // JSON erstellen und herunterladen
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fahrzeug-manager-profile-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert(`✅ ${Object.keys(exportData).length} Wachentypen exportiert!`);
    }

    // Import: Profile aus JSON-Datei importieren
    function importAllProfiles() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            try {
                const file = e.target.files[0];
                if (!file) return;

                const content = await file.text();
                const importData = JSON.parse(content);

                if (typeof importData !== 'object' || !Object.keys(importData).length) {
                    alert('❌ Ungültige Dateiformat oder leere Datei.');
                    return;
                }

                let importedCount = 0;
                let existingCount = 0;

                // Alle Profile importieren
                Object.entries(importData).forEach(([key, data]) => {
                    if (data.profiles && Object.keys(data.profiles).length > 0) {
                        const existingData = loadProfiles(key);

                        // Merge-Modus: Neuer Profile hinzufügen, bestehende nicht überschreiben
                        Object.entries(data.profiles).forEach(([profileName, profileConfig]) => {
                            if (existingData.profiles[profileName]) {
                                existingCount++;
                            } else {
                                existingData.profiles[profileName] = profileConfig;
                                importedCount++;
                            }
                        });

                        // Active Profile setzen (falls noch nicht gesetzt)
                        if (!existingData.activeProfile && data.activeProfile) {
                            existingData.activeProfile = data.activeProfile;
                        }

                        saveProfiles(key, existingData);
                    }
                });

                alert(`✅ Import abgeschlossen!\n• ${importedCount} neue Profile hinzugefügt\n• ${existingCount} Profile (bereits vorhanden, nicht überschrieben)`);

                // Config-Modal neu laden
                loadVehicleConfig();

            } catch (err) {
                alert(`❌ Fehler beim Import: ${err.message}`);
                console.error(err);
            }
        };
        input.click();
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
            const profilesData = loadProfiles(buildingKey);
            const profiles = profilesData.profiles || {};

            const raw = localStorage.getItem(
                `fm-config-building-profile-${buildingId}`
            );

            // Keine individuelle Zuordnung vorhanden
            if (!raw) {
                return profilesData.activeProfile || null;
            }

            const data = JSON.parse(raw);
            const profileName = data?.profileName;

            // Keine gültige Profilzuordnung vorhanden
            if (!profileName) {
                return profilesData.activeProfile || null;
            }

            // Profil existiert noch
            if (
                Object.prototype.hasOwnProperty.call(
                    profiles,
                    profileName
                )
            ) {
                return profileName;
            }

            // Profil wurde gelöscht -> alte Zuordnung entfernen
            localStorage.removeItem(
                `fm-config-building-profile-${buildingId}`
            );

            // Auf das aktuell aktive Profil des Gebäudetyps zurückfallen
            return profilesData.activeProfile || null;

        } catch (e) {
            console.warn(
                '[FM][Config] Fehler beim Laden des Wachenprofils:',
                buildingId,
                buildingKey,
                e
            );

            return loadProfiles(buildingKey).activeProfile || null;
        }
    }

    // Alles um Wachen auszublenden
    function getHiddenBuildings() {
        try {
            return JSON.parse(localStorage.getItem(hiddenBuildings) || '[]');
        } catch {
            return [];
        }
    }
    function setHiddenBuildings(ids) {
        localStorage.setItem(hiddenBuildings, JSON.stringify(ids));
    }
    function hideBuilding(buildingId) {
        const hidden = getHiddenBuildings();

        if (!hidden.includes(Number(buildingId))) {
            hidden.push(Number(buildingId));
            setHiddenBuildings(hidden);
        }
    }
    function unhideBuilding(buildingId) {
        const id = Number(buildingId);
        setHiddenBuildings(getHiddenBuildings().filter(hiddenId => hiddenId !== id));
    }
    function isBuildingHidden(buildingId) {
        return getHiddenBuildings().includes(Number(buildingId));
    }

    // Funktion für das Konfigurationsmenü
    function buildConfigGrid(vehicles, tableId, itemsPerRow = 10, buildingCaption = '') {
        if (!vehicles || vehicles.length === 0) {
            return '<div>Keine Fahrzeuge oder RCs vorhanden</div>';
        }

        vehicles = [...vehicles].sort((a, b) =>
                                      String(a.caption || '').localeCompare(String(b.caption || ''), 'de')
                                     );

        const profilesData = loadProfiles(tableId);
        const profileNames = Object.keys(profilesData.profiles || {});
        const hasProfiles = profileNames.length > 0;
        const activeProfile = profilesData.activeProfile;
        const savedConfig = getActiveProfileConfig(tableId) || [];
        const firstStart = !hasProfiles;
        const categories = {
            fahrzeuge: '🚒 Fahrzeuge',
            ab: '🚛 Abrollbehälter',
            anhaenger: '🛻 Anhänger / Außenlastbehälter / Winden',
            rc: '📦 Rollcontainer'
        };

        let migratedProfileConfig = false;

        savedConfig.forEach(saved => {
            // RCs haben eigene IDs und werden hier nicht angefasst.
            if ((saved.itemType || 'vehicle') === 'equipment') return;

            const currentVehicle = vehicles.find(v =>
                                                 (v.itemType || v.type || 'vehicle') === 'vehicle' &&
                                                 v.caption &&
                                                 saved.caption &&
                                                 v.caption === saved.caption
                                                );

            if (!currentVehicle) return;

            const currentTypeId = parseInt(currentVehicle.id, 10);
            const savedTypeId = parseInt(saved.typeId, 10);

            if (
                Number.isInteger(currentTypeId) &&
                savedTypeId !== currentTypeId
            ) {

                saved.typeId = currentTypeId;
                migratedProfileConfig = true;
            }
        });

        if (migratedProfileConfig) {
            saveActiveProfileConfig(tableId, savedConfig);

        }

        function getConfigCategory(vehicle) {
            const itemType = vehicle.itemType || vehicle.type || 'vehicle';

            if (itemType === 'equipment') return 'rc';

            if (vehicle.isTrailer === true) {
                const tractiveVehicles = Array.isArray(vehicle.tractiveVehicles)
                ? vehicle.tractiveVehicles
                : [];

                return tractiveVehicles.includes(46) ? 'ab' : 'anhaenger';
            }

            return 'fahrzeuge';
        }

        let html = `
        <div class="fm-config-header" style="margin-bottom:5px;display:flex;flex-wrap:wrap;gap:5px;align-items:center;">
            ${hasProfiles ? `
                <label>Profil(e):</label>
                <select class="fm-profile-select" data-table="${tableId}" style="padding:2px 4px;border:1px solid var(--spoiler-border);border-radius:4px;background:var(--spoiler-body-bg);color:var(--spoiler-body-text);">
                    ${profileNames.map(name =>
                                       `<option value="${name}" ${name === activeProfile ? 'selected' : ''}>${name}</option>`
                                      ).join('')}
                </select>
            ` : ''}
            <button class="btn btn-primary btn-xs fm-profile-saveas" data-table="${tableId}">Profil anlegen</button>
            <button class="btn btn-danger btn-xs fm-profile-delete" ${!hasProfiles ? 'disabled' : ''} data-table="${tableId}">Profil löschen</button>
            <button class="btn btn-success btn-xs fm-config-select-all" ${!hasProfiles ? 'disabled' : ''}>Alle anwählen</button>
            <button class="btn btn-danger btn-xs fm-config-deselect-all" ${!hasProfiles ? 'disabled' : ''}>Alle abwählen</button>
            <button class="btn btn-warning btn-xs fm-config-toggle" ${!hasProfiles ? 'disabled' : ''}>Abgewählte Fahrzeuge anzeigen</button>
        </div>
    `;

        if (firstStart) {
            html += `
            <div class="fm-config-hint" style="margin-bottom:8px;padding:8px;border:1px solid var(--spoiler-border);border-radius:4px;background:var(--spoiler-body-bg);font-size:12px;">
                Es wurden noch keine Profile erstellt.<br>
                Lege zuerst ein Profil an, dann erscheinen die Fahrzeuge und RCs und du kannst direkt deine Auswahl treffen. 🙂
            </div>
        `;
        }

        function buildCategorySpoiler(categoryKey) {
            const categoryItems = vehicles.filter(vehicle => getConfigCategory(vehicle) === categoryKey);
            if (!categoryItems.length) return '';

            const categoryTitle = categories[categoryKey];
            const spoilerId = `fm-config-category-${tableId}-${categoryKey}`;
            const isOpen = categoryKey === 'fahrzeuge';

            let categoryHtml = `
            <div class="fm-config-category-spoiler" style="border:1px solid var(--spoiler-border);border-radius:4px;margin-bottom:7px;overflow:hidden;">
                <div class="fm-config-category-header" data-category="${categoryKey}" data-category-target="${spoilerId}" style="background-color:var(--spoiler-header-bg);color:var(--spoiler-header-text);padding:8px 12px;cursor:pointer;font-weight:bold;user-select:none;display:flex;justify-content:space-between;align-items:center;">
                    <span>${categoryTitle}</span>
                    <span class="fm-config-category-arrow" style="font-size:12px;opacity:.7;">${isOpen ? '▼' : '▶'}</span>
                </div>
                <div id="${spoilerId}" class="fm-config-category-body" data-category="${categoryKey}" style="display:${isOpen ? 'block' : 'none'};padding:8px;background:var(--spoiler-body-bg);color:var(--spoiler-body-text);">
                    <div class="fm-config-grid" data-config-category="${categoryKey}" style="display:${hasProfiles ? 'grid' : 'none'};grid-template-columns:repeat(${itemsPerRow},minmax(120px,1fr));gap:4px 8px;width:100%;">
        `;

            categoryItems.forEach(vehicle => {
                const itemType = vehicle.itemType || vehicle.type || 'vehicle';

                const saved = savedConfig.find(c =>
                                               String(c.typeId) === String(vehicle.id) &&
                                               (c.itemType || 'vehicle') === itemType
                                              ) || savedConfig.find(c =>
                                                                    c.caption === vehicle.caption &&
                                                                    (c.itemType || 'vehicle') === itemType
                                                                   );

                const checked = saved ? !!saved.checked : hasProfiles;
                const display = checked ? 'flex' : 'none';
                const amount = saved ? parseInt(saved.amount, 10) || 1 : 1;
                const typeId = itemType === 'equipment'
                ? String(vehicle.id)
                : parseInt(vehicle.id, 10);

                categoryHtml += `
                <div class="fm-config-cell" data-category="${categoryKey}" style="white-space:nowrap;display:${display};flex-direction:column;gap:4px;padding:4px 6px;border:1px solid var(--spoiler-border);border-radius:4px;background:var(--spoiler-body-bg);">
                    <label style="cursor:pointer;display:flex;gap:4px;align-items:center;min-width:0;">
                        <input type="checkbox" class="fm-config-select" data-type-id="${typeId}" data-item-type="${itemType}" data-caption="${vehicle.caption}" ${checked ? 'checked' : ''}>
                        <span title="${vehicle.caption}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${vehicle.caption}</span>
                    </label>
                    <input type="number" class="fm-config-amount" value="${amount}" min="1" style="width:100%;padding:2px 4px;border:1px solid var(--spoiler-border);border-radius:3px;background:var(--spoiler-input-bg,#ffffff);color:var(--spoiler-input-text,#000000);color-scheme:light dark;">
                </div>
            `;
            });

            return categoryHtml + `
                    </div>
                </div>
            </div>
        `;
        }

        html += `
        <div class="fm-config-categories" id="fm-config-table-${tableId}" style="display:${hasProfiles ? 'block' : 'none'};width:100%;">
            ${buildCategorySpoiler('fahrzeuge')}
            ${buildCategorySpoiler('ab')}
            ${buildCategorySpoiler('anhaenger')}
            ${buildCategorySpoiler('rc')}
        </div>
    `;

        setTimeout(() => {
            const container = document.getElementById(`fm-config-table-${tableId}`);
            if (!container) return;
            const wrapper = container.parentElement;
            if (!wrapper || wrapper.dataset.eventsAttached) return;
            wrapper.dataset.eventsAttached = 'true';
            let profilesData = loadProfiles(tableId);
            let currentProfile = profilesData.activeProfile;
            let currentConfig = getActiveProfileConfig(tableId) || [];

            function getCurrentConfigFromDOM() {
                const config = [];

                wrapper.querySelectorAll('.fm-config-cell').forEach(cell => {
                    const cb = cell.querySelector('.fm-config-select');
                    const input = cell.querySelector('.fm-config-amount');

                    if (!cb) return;

                    const itemType = cb.dataset.itemType || 'vehicle';

                    config.push({
                        typeId: itemType === 'equipment'
                        ? String(cb.dataset.typeId)
                        : parseInt(cb.dataset.typeId, 10),
                        caption: cb.dataset.caption,
                        checked: cb.checked,
                        amount: parseInt(input?.value, 10) || 1,
                        itemType
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
                let totalVehicles = 0;
                let totalAB = 0;
                let totalTrailers = 0;
                let totalEquipment = 0;

                currentConfig.forEach(entry => {
                    if (!entry.checked) return;
                    const amount = parseInt(entry.amount, 10) || 0;
                    const itemType = entry.itemType || 'vehicle';
                    if (itemType === 'equipment') {
                        totalEquipment += amount;
                        return;
                    }
                    const vehicle = vehicles.find(v => String(v.id) === String(entry.typeId));
                    if (!vehicle) return;
                    if (vehicle.isTrailer === true) {
                        const tractiveVehicles = Array.isArray(vehicle.tractiveVehicles)
                        ? vehicle.tractiveVehicles
                        : [];
                        if (tractiveVehicles.includes(46)) {
                            totalAB += amount;
                        } else {
                            totalTrailers += amount;
                        }
                        return;
                    }
                    totalVehicles += amount;
                });
                const header = document.querySelector(`[data-target="fm-config-body-${tableId}"]`);
                if (!header) return;
                profilesData = loadProfiles(tableId);
                currentProfile = profilesData.activeProfile;
                const names = Object.keys(profilesData.profiles || {});
                const profileText = names.length
                ? ` (${names.map(name =>
                                 name === currentProfile
                                 ? `<strong>${name}</strong>`
                                 : name
                                ).join(' | ')})`
                : '';
                let counts = [];
                if (totalVehicles) {counts.push(`${totalVehicles} Fahrzeuge`);}
                if (totalAB) {counts.push(`${totalAB} Abrollbehälter`);}
                if (totalTrailers) {counts.push(`${totalTrailers} Anhänger / Außenlastbehälter / Winden`);}
                if (totalEquipment) {counts.push(`${totalEquipment} Rollcontainer`);}
                header.innerHTML =
                    `${buildingCaption}` +
                    (counts.length ? ` – ${counts.join(' – ')}` : '') +
                    profileText;
            }
            function reRenderAndSync() {
                const openCategory =
                      wrapper.querySelector(
                          '.fm-config-category-body[style*="display: block"]'
                      )?.dataset.category || 'fahrzeuge';

                wrapper.innerHTML = buildConfigGrid(
                    vehicles,
                    tableId,
                    itemsPerRow,
                    buildingCaption
                );

                setTimeout(() => {
                    const newContainer = document.getElementById(
                        `fm-config-table-${tableId}`
                    );

                    if (!newContainer) return;

                    newContainer.querySelectorAll('.fm-config-category-body').forEach(body => {
                        const open = body.dataset.category === openCategory;
                        body.style.display = open ? 'block' : 'none';

                        const header = newContainer.querySelector(
                            `[data-category-target="${body.id}"]`
                        );

                        const arrow = header?.querySelector(
                            '.fm-config-category-arrow'
                        );

                        if (arrow) arrow.textContent = open ? '▼' : '▶';
                    });

                    profilesData = loadProfiles(tableId);
                    currentProfile = profilesData.activeProfile;
                    currentConfig = getActiveProfileConfig(tableId) || [];

                    updateHeaderCount();
                }, 0);
            }

            wrapper.addEventListener('input', e => {
                if (e.target.classList.contains('fm-config-amount')) {
                    saveAndSync();
                }
            });
            wrapper.addEventListener('change', e => {
                if (e.target.classList.contains('fm-profile-select')) {
                    profilesData = loadProfiles(tableId);

                    const selectedProfile = e.target.value;

                    if (!profilesData.profiles?.[selectedProfile]) return;

                    profilesData.activeProfile = selectedProfile;
                    saveProfiles(tableId, profilesData);

                    currentProfile = selectedProfile;
                    currentConfig = profilesData.profiles[selectedProfile] || [];

                    reRenderAndSync();
                    return;
                }
                if (e.target.classList.contains('fm-config-select')) {
                    const cell = e.target.closest('.fm-config-cell');
                    if (!cell) return;

                    cell.style.display = e.target.checked ? 'flex' : 'none';
                    saveAndSync();
                }
            });
            wrapper.addEventListener('click', e => {
                const categoryHeader = e.target.closest('.fm-config-category-header');

                if (categoryHeader) {
                    const targetId = categoryHeader.dataset.categoryTarget;
                    const clickedBody = document.getElementById(targetId);

                    if (!clickedBody) return;

                    const categoryContainer =
                          wrapper.querySelector('.fm-config-categories');

                    if (!categoryContainer) return;

                    const wasOpen = clickedBody.style.display === 'block';

                    categoryContainer
                        .querySelectorAll('.fm-config-category-body')
                        .forEach(body => {
                        body.style.display = 'none';

                        const header = categoryContainer.querySelector(
                            `[data-category-target="${body.id}"]`
                        );

                        const arrow = header?.querySelector(
                            '.fm-config-category-arrow'
                        );

                        if (arrow) arrow.textContent = '▶';
                    });

                    if (!wasOpen) {
                        clickedBody.style.display = 'block';

                        const arrow = categoryHeader.querySelector(
                            '.fm-config-category-arrow'
                        );

                        if (arrow) arrow.textContent = '▼';
                    }

                    return;
                }
                if (e.target.classList.contains('fm-profile-saveas')) {
                    const newName = prompt('Name des neuen Profils:')?.trim();

                    if (!newName) return;

                    profilesData = loadProfiles(tableId);

                    if (profilesData.profiles[newName]) {
                        alert('Profil existiert bereits.');
                        return;
                    }

                    const config = vehicles.map(v => {
                        const itemType = v.itemType || v.type || 'vehicle';
                        const isEquipment = itemType === 'equipment';

                        return {
                            typeId: isEquipment
                            ? String(v.id)
                            : parseInt(v.id, 10),
                            caption: v.caption,
                            checked: true,
                            amount: 1,
                            itemType: isEquipment ? 'equipment' : 'vehicle'
                        };
                    });

                    profilesData.profiles[newName] = config;
                    profilesData.activeProfile = newName;

                    saveProfiles(tableId, profilesData);

                    currentProfile = newName;
                    currentConfig = config;

                    reRenderAndSync();
                    return;
                }
                if (e.target.classList.contains('fm-profile-delete')) {
                    profilesData = loadProfiles(tableId);

                    const active = profilesData.activeProfile;

                    if (!active) return;
                    if (!confirm(`Profil "${active}" löschen?`)) return;

                    // Profil löschen
                    delete profilesData.profiles[active];

                    // Neues aktives Profil bestimmen
                    const remaining = Object.keys(profilesData.profiles || {});
                    profilesData.activeProfile = remaining[0] || null;

                    // Profile speichern
                    saveProfiles(tableId, profilesData);

                    // Alle Wachen-Zuordnungen zu diesem gelöschten Profil entfernen
                    const prefix = 'fm-config-building-profile-';

                    for (let i = localStorage.length - 1; i >= 0; i--) {
                        const key = localStorage.key(i);

                        if (!key || !key.startsWith(prefix)) {
                            continue;
                        }

                        try {
                            const raw = localStorage.getItem(key);
                            if (!raw) continue;

                            const assignment = JSON.parse(raw);

                            if (
                                assignment &&
                                assignment.buildingKey === tableId &&
                                assignment.profileName === active
                            ) {
                                localStorage.removeItem(key);
                            }

                        } catch (err) {
                            console.warn(
                                '[FM][Config] Fehler beim Bereinigen der Profilzuordnung:',
                                key,
                                err
                            );
                        }
                    }

                    currentProfile = profilesData.activeProfile;
                    currentConfig = getActiveProfileConfig(tableId) || [];

                    reRenderAndSync();
                    return;
                }
                if (
                    e.target.classList.contains('fm-config-select-all') ||
                    e.target.classList.contains('fm-config-deselect-all')
                ) {
                    const selectAll =
                          e.target.classList.contains('fm-config-select-all');

                    wrapper.querySelectorAll('.fm-config-select').forEach(cb => {
                        cb.checked = selectAll;
                    });

                    wrapper.querySelectorAll('.fm-config-cell').forEach(cell => {
                        cell.style.display = selectAll ? 'flex' : 'none';
                    });

                    saveAndSync();
                    return;
                }
                if (e.target.classList.contains('fm-config-toggle')) {
                    const hidden = e.target.dataset.hidden === 'true';
                    const newState = !hidden;

                    wrapper.querySelectorAll('.fm-config-cell').forEach(cell => {
                        const cb = cell.querySelector('.fm-config-select');

                        if (cb && !cb.checked) {
                            cell.style.display = newState ? 'flex' : 'none';
                        }
                    });

                    e.target.dataset.hidden = String(newState);
                    e.target.textContent = newState
                        ? 'Abgewählte Fahrzeuge ausblenden'
                    : 'Abgewählte Fahrzeuge anzeigen';

                    return;
                }
            });
            updateHeaderCount();
        }, 0);
        return html;
    }

    // Tabelle(n) bauen
    function buildFahrzeugTable(buildings, tableId, vehicleMap, vehicleTypeMap, lssmBuildingDefs, filters = {}) {
        const filterLeitstelle = filters.leitstelle || '';
        const filterWache = filters.wache || '';
        const hiddenBuildings = getHiddenBuildings();
        const leitstellen = [...new Set(
            buildings.map(b => b.leitstelle_caption).filter(Boolean)
        )].sort((a, b) => a.localeCompare(b, 'de'));
        const wachen = [...new Set(
            buildings.map(b => b.caption).filter(Boolean)
        )].sort((a, b) => a.localeCompare(b, 'de'));

        let html = `
    <table class="table fm-table" id="fm-table-${tableId}">
      <thead>
        <tr>
          <th>Auswahl</th>
          <th>Leitstelle</th>
          <th>Wache</th>
          <th>Profil</th>
          <th>Freie Stellplätze</th>
          <th>Fahrzeuge / Ausrüstung auf Wache</th>
          <th>Fehlende Fahrzeuge / Ausrüstung</th>
          <th>Kaufen mit Credits</th>
          ${coinsButton ? '<th>Kaufen mit Coins</th>' : ''}
        </tr>

        <tr class="fm-filter-row">
          <td>
            <input type="checkbox" class="fm-select-all" data-table="${tableId}">
          </td>

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

          <td></td>
          <td></td>

          <td style="text-align:center;">
            <button class="btn btn-info btn-xs fm-toggle-hide-no-missing"
                    data-table="${tableId}"
                    title="Blendet Wachen aus, bei denen keine Fahrzeuge oder RCs fehlen">
              Keine fehlenden
            </button>
          </td>

          <td style="text-align:center;">
            <button class="btn btn-success btn-xs fm-buy-selected-credits"
                    data-table="${tableId}">
              💳 Alle kaufen
            </button>
          </td>

          ${coinsButton ? `
    <td style="text-align:center;">
        <button class="btn btn-danger btn-xs fm-buy-selected-coins"
                data-table="${tableId}">
            🪙 Alle kaufen
        </button>
    </td>
` : ''}
        </tr>
      </thead>

      <tbody>
    `;

        const sortedBuildings = buildings
        .slice()
        .sort((a, b) => a.caption.localeCompare(b.caption));

        sortedBuildings.forEach((b, idx) => {
            if (hiddenBuildings.includes(Number(b.id))) return;
            if (filterLeitstelle && b.leitstelle_caption !== filterLeitstelle) return;
            if (filterWache && b.caption !== filterWache) return;
            const vehiclesOnBuilding = vehicleMap[b.id] || [];
            const typeCountMapOnBuilding = {};
            const configuredSurplusItems = getConfiguredSurplusItems(b, vehicleMap);
            vehiclesOnBuilding.forEach(v => {
                const typeId = v.vehicle_type;
                const key = `vehicle:${typeId}`;

                const typeName =
                      vehicleTypeMap[typeId]?.caption ||
                      `Unbekannt (Typ ${typeId})`;

                if (!typeCountMapOnBuilding[key]) {
                    typeCountMapOnBuilding[key] = {
                        type: 'vehicle',
                        id: String(typeId),
                        name: typeName,
                        count: 0
                    };
                }

                typeCountMapOnBuilding[key].count++;
            });
            const buildingEquipment = equipmentMapGlobal[b.id] || {};
            Object.entries(buildingEquipment).forEach(([equipmentId, count]) => {
                const equipment = getEquipmentById(equipmentId);
                if (!equipment || !count) return;

                const key = `equipment:${equipmentId}`;

                typeCountMapOnBuilding[key] = {
                    type: 'equipment',
                    id: String(equipmentId),
                    name: equipment.caption,
                    count: Number(count) || 0
                };
            });
            const vehicleNames = Object.values(typeCountMapOnBuilding).map(item => {
                const displayName =
                      item.count > 1
                ? `${item.count}x ${item.name}`
                : item.name;

                const surplusKey = `${item.type}:${item.id}`;
                const surplus = configuredSurplusItems[surplusKey];

                // Mehr Fahrzeuge/RCs vorhanden als konfiguriert
                if (surplus) {
                    return `
                <span
                    style="color: #00a8e8; font-weight: bold;"
                    title="${surplus.surplus}x mehr vorhanden als konfiguriert (${surplus.actual}/${surplus.configured})"
                >
                    ${displayName}
                </span>
            `;
                }

                // Bestehende RC-Darstellung
                if (item.type === 'equipment') {
                    return `
                <span title="Rollcontainer">
                    ${displayName}
                </span>
            `;
                }

                return displayName;
            }).join(',<wbr> ') || 'Keine Fahrzeuge / RCs auf Wache vorhanden';
            const configKey = `${b.building_type}_${b.small_building ? 'small' : 'normal'}`;
            const profilesData = loadProfiles(configKey);
            const profileNames = Object.keys(profilesData.profiles);
            const hasProfiles = profileNames.length > 0;
            const activeProfile = hasProfiles ? getBuildingActiveProfile(b.id, configKey) : null;
            const storageFree = Number(b.storage_available || 0);
            const missingData = getMissingVehiclesForBuilding(b, vehicleMap, vehicleTypeMap, lssmBuildingDefs);
            const buyableData = getBuyableMissingVehicles(b, missingData, vehicleTypeMap, lssmBuildingDefs);
            const missingGrouped = {};
            (missingData.vehiclesIds || []).forEach(id => {
                const key = String(id);
                missingGrouped[key] = (missingGrouped[key] || 0) + 1;
            });
            const buyableGrouped = {};
            (buyableData.vehiclesIds || []).forEach(id => {
                const key = String(id);
                buyableGrouped[key] = (buyableGrouped[key] || 0) + 1;
            });
            const coloredMissingNames = Object.entries(missingGrouped).map(([id, count]) => {
                const buyableCount = buyableGrouped[id] || 0;
                const purchaseLimited = buyableCount < count;

                if (id.startsWith('equipment:')) {
                    const equipmentId = id.substring('equipment:'.length);
                    const equipment = getEquipmentById(equipmentId);

                    if (!equipment) {
                        return `Unbekannter RC (${equipmentId})`;
                    }

                    const displayName =
                          count > 1
                    ? `${count}x ${equipment.caption}`
                    : equipment.caption;

                    const storageTotal = Number(b.storage_total || 0);
                    const storageUpgrade =
                          Array.isArray(b.storage_upgrades)
                    ? b.storage_upgrades.find(
                        u => u.upgrade_type?.toLowerCase().includes('lagerraum')
                    )
                    : null;
                    if (
                        storageUpgrade &&
                        storageUpgrade.available === false &&
                        storageUpgrade.available_at
                    ) {
                        return `<span style="color:orange;font-weight:bold;" title="Lager im Bau">${displayName}</span>`;
                    }

                    if (purchaseLimited && storageTotal > 0) {
                        return `<span style="color:#00a6a6;font-weight:bold;" title="Nicht alle konfigurierten RCs können gekauft werden – Lagerkapazität reicht nicht aus">${displayName}</span>`;
                    }
                    if (storageTotal > 0) {
                        return displayName;
                    }
                    return `<span style="color:red;font-weight:bold;" title="Lager fehlt">${displayName}</span>`;
                }


                const typeId = parseInt(id, 10);

                const status = getExtensionStatusForVehicle(
                    b,
                    typeId,
                    lssmBuildingDefs
                );

                const name =
                      vehicleTypeMap[typeId]?.caption ||
                      `Unbekannt (Typ ${id})`;

                const displayName =
                      count > 1
                ? `${count}x ${name}`
                : name;

                // Erweiterungsstatus hat IMMER Vorrang
                switch (status) {
                    case 'locked':
                    case 'missing':
                        return `<span style="color:red;font-weight:bold;"
                    title="Erweiterung fehlt">${displayName}</span>`;

                    case 'in_progress':
                        return `<span style="color:orange;font-weight:bold;"
                    title="Erweiterung im Bau">${displayName}</span>`;

                    default:
                        // Erweiterung ist vorhanden/fertig.
                        // Erst jetzt prüfen, ob alle Fahrzeuge gekauft werden können.
                        if (purchaseLimited) {
                            if (isBesonderheit(typeId)) {
                                return `<span style="color:#00a6a6;font-weight:bold;"
                            title="Nicht alle konfigurierten Außenlastbehälter können gekauft werden – nicht genügend freie Plätze für Hubschrauber">${displayName}</span>`;
                            }

                            return `<span style="color:#00a6a6;font-weight:bold;"
                        title="Nicht alle konfigurierten Fahrzeuge können gekauft werden – nicht genügend freie Stellplätze">${displayName}</span>`;
                        }

                        return displayName;
                }
            }).join(',<wbr>&nbsp;') || missingData.names;
            const missingVehicles = buyableData.vehiclesIds || [];
            const missingVehiclesJson = JSON.stringify(missingVehicles);
            const hasMissing = missingVehicles.length > 0;
            const maxVehicles = calcMaxParkingLots(b, lssmBuildingDefs);
            const abOnBuilding = vehiclesOnBuilding.filter(v => {
                const type = vehicleTypeMap[v.vehicle_type];
                return type?.isTrailer === true &&
                    Array.isArray(type.tractiveVehicles) &&
                    type.tractiveVehicles.includes(46);
            });
            const normalVehiclesOnBuilding = vehiclesOnBuilding.filter(v => !isBesonderheit(v.vehicle_type));
            const maxABStellplaetze = calcMaxABParkingLots(b,lssmBuildingDefs);
            const freieStellplaetze = Math.max(maxVehicles - normalVehiclesOnBuilding.length,0);
            const freieABStellplaetze = Math.max(maxABStellplaetze - abOnBuilding.length,0);
            const anhaengerOnBuilding = vehiclesOnBuilding.filter(v => {
                const type = vehicleTypeMap[v.vehicle_type];
                return type?.isTrailer === true && !(Array.isArray(type.tractiveVehicles) && type.tractiveVehicles.includes(46));
            });
            const maxAnhStellplaetze = calcMaxAnhStellplaetze(b);
            const freieAnhStellplaetze = Math.max(maxAnhStellplaetze - anhaengerOnBuilding.length, 0);
            const profileCell = hasProfiles
            ? `<select class="fm-building-profile"
                       data-building-id="${b.id}"
                       data-config-key="${configKey}"
                       style="padding:2px 4px;
                              border:1px solid var(--spoiler-border);
                              border-radius:4px;
                              background:var(--spoiler-body-bg);
                              color:var(--spoiler-body-text);
                              width:100%;">
                ${profileNames.map(p => `
                    <option value="${p}" ${p === activeProfile ? 'selected' : ''}>
                        ${p}
                    </option>
                `).join('')}
              </select>`
            : `<span style="color:var(--text-color-secondary,#999);
                             font-style:italic;">
                 – kein Profil –
               </span>`;

            html += `
                    <tr data-building-id="${b.id}"
                        data-building-caption="${b.caption}"
                        data-leitstelle-caption="${b.leitstelle_caption ?? ''}"
                        data-config-key="${configKey}"
                        data-missing-vehicle-ids='${missingVehiclesJson}'
                        data-has-missing="${hasMissing}"
                        data-storage-free="${storageFree}">

            <td>
              <input type="checkbox"
                     class="fm-select"
                     id="fm-select-${tableId}-${idx}"
                     data-credits="${buyableData.totalCredits}"
                     data-coins="${buyableData.totalCoins}">
            </td>
            <td data-leitstelle-caption="${b.leitstelle_caption ?? ''}">
    ${b.leitstelle_caption ?? '-'}
<td>
    ${buildBuildingLink(b)}
    <button class="btn btn-danger btn-xs fm-hide-building"
            data-building-id="${b.id}"
            title="Wache dauerhaft ausblenden"
            style="margin-left:4px;">
        👁
    </button>
</td>
        <td>${profileCell}</td>
        <td>
  <span class="badge fm-badge-green" title="Freie Fahrzeug-Stellplätze">
    FZ ${freieStellplaetze}
  </span>
  ${maxABStellplaetze > 0 ? `
    <span class="badge fm-badge-green" title="Freie AB-Stellplätze">
      AB ${freieABStellplaetze}
    </span>
  ` : ''}
  ${Number(b.storage_total || 0) > 0 ? `
    <span class="badge fm-badge-green" title="Freie RC-Lagerplätze">
      RC ${storageFree}
    </span>
  ` : ''}
</td>
        <td>
          <span class="fm-vehicle-list">
            ${vehicleNames}
          </span>
        </td>

        <td>
          <span class="fm-vehicle-list">
            ${coloredMissingNames}
          </span>
        </td>

        <td>
          <button class="btn btn-success btn-xs fm-buy-credit"
            ${
            buyableData.totalCredits === 0
                ? 'disabled title="Keine kaufbaren Fahrzeuge oder RCs"'
            : buyableData.totalCredits > currentCredits
                ? 'disabled title="Nicht genug Credits"'
            : ''
        }>
            ${buyableData.totalCredits.toLocaleString()} Credits
          </button>
        </td>

        ${coinsButton ? `
    <td>
        <button class="btn btn-danger btn-xs fm-buy-coin"
            ${
            buyableData.totalCoins === 0
                ? 'disabled title="Keine kaufbaren Fahrzeuge oder RCs"'
            : buyableData.totalCoins > currentCoins
                ? 'disabled title="Nicht genug Coins"'
            : ''
        }>
            ${buyableData.totalCoins.toLocaleString()} Coins
        </button>
    </td>
` : ''}

      </tr>
    `;
        });

        html += '</tbody></table>';

        setTimeout(
            () => setupTableEventListeners(
                tableId,
                buildings,
                vehicleMap,
                vehicleTypeMap,
                lssmBuildingDefs
            ),
            0
        );

        return html;
    }

    // Modal für ausgeblendete Wachen
    function showHiddenBuildingsModal(buildings, vehicleMap, vehicleTypeMap, lssmBuildingDefs) {
        document.getElementById('fm-hidden-buildings-modal')?.remove();

        const hiddenIds = getHiddenBuildings();
        const hiddenBuildings = buildings
        .filter(b => hiddenIds.includes(Number(b.id)))
        .sort((a, b) => a.caption.localeCompare(b.caption, 'de'));

        const modal = document.createElement('div');
        modal.id = 'fm-hidden-buildings-modal';

        modal.innerHTML = `
        <div class="fm-hidden-buildings-dialog">
            <div class="fm-hidden-buildings-header">
                <span>👁 Ausgeblendete Wachen</span>
            </div>

            <div class="fm-hidden-buildings-body">
                ${
        hiddenBuildings.length
            ? hiddenBuildings.map(b => `
                            <div class="fm-hidden-building-row">
                                <span>${buildBuildingLink(b)}</span>
                                <button type="button"
                                        class="fm-unhide-building"
                                        data-building-id="${b.id}">
                                    Anzeigen
                                </button>
                            </div>
                        `).join('')
        : `
                            <div class="fm-hidden-buildings-empty">
                                Keine Wachen ausgeblendet.
                            </div>
                        `
    }
            </div>

            <div class="fm-hidden-buildings-footer">
                <button type="button"
                        class="fm-unhide-all-buildings"
                        ${hiddenBuildings.length ? '' : 'disabled'}>
                    Alle wieder anzeigen
                </button>

                <button type="button"
                        class="fm-hidden-buildings-close">
                    Schließen ✖
                </button>
            </div>
        </div>
    `;

        document.body.appendChild(modal);

        modal.querySelector('.fm-hidden-buildings-close')?.addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', event => {
            if (event.target === modal) modal.remove();
        });

        modal.querySelectorAll('.fm-unhide-building').forEach(button => {
            button.addEventListener('click', () => {
                unhideBuilding(button.dataset.buildingId);
                modal.remove();

                const content = document.getElementById('fahrzeug-manager-content');
                if (!content) return;

                content.innerHTML = buildBuildingsByType(
                    buildingDataGlobal,
                    vehicleMapGlobal,
                    vehicleTypeMapGlobal,
                    lssmBuildingDefsGlobal
                );

                document.querySelectorAll('.fm-spoiler-header').forEach(header => {
                    header.addEventListener('click', () => {
                        const targetId = header.dataset.target;

                        document.querySelectorAll('.fm-spoiler-body').forEach(body => {
                            body.id === targetId
                                ? body.classList.toggle('active')
                            : body.classList.remove('active');
                        });
                    });
                });

                attachAllTableListeners();
                updateSelectedCosts();
                updateBuyButtons();
            });
        });

        modal.querySelector('.fm-unhide-all-buildings')?.addEventListener('click', () => {
            setHiddenBuildings([]);
            modal.remove();

            const content = document.getElementById('fahrzeug-manager-content');
            if (!content) return;

            content.innerHTML = buildBuildingsByType(
                buildingDataGlobal,
                vehicleMapGlobal,
                vehicleTypeMapGlobal,
                lssmBuildingDefsGlobal
            );

            document.querySelectorAll('.fm-spoiler-header').forEach(header => {
                header.addEventListener('click', () => {
                    const targetId = header.dataset.target;

                    document.querySelectorAll('.fm-spoiler-body').forEach(body => {
                        body.id === targetId
                            ? body.classList.toggle('active')
                        : body.classList.remove('active');
                    });
                });
            });

            attachAllTableListeners();
            updateSelectedCosts();
            updateBuyButtons();
        });
    }

    // Bereitet die Listner vor
    function setupTableEventListeners(tableId, buildings, vehicleMap, vehicleTypeMap, lssmBuildingDefs) {
        const table = document.getElementById(`fm-table-${tableId}`);
        if (!table) return;
        const storageKey = `fm-hide-no-missing-${tableId}`;
        let hideNoMissing = localStorage.getItem(storageKey) === 'true';

        table.querySelectorAll('.fm-building-profile').forEach(sel => {
            sel.addEventListener('change', e => {
                const buildingId = e.target.dataset.buildingId;
                const configKey = e.target.dataset.configKey;
                const selectedProfile = e.target.value;
                setBuildingActiveProfile(buildingId, configKey, selectedProfile);
                const selectedBuildings = new Set(Array.from(table.querySelectorAll('.fm-select:checked')).map(cb => cb.closest('tr')?.dataset.buildingId));
                const masterChecked = table.querySelector('.fm-select-all')?.checked || false;
                const container = table.parentElement; container.style.visibility = 'hidden';
                const filterLeitstelle = table.querySelector('.fm-filter-leitstelle')?.value || '';
                const filterWache = table.querySelector('.fm-filter-wache')?.value || '';
                container.innerHTML = buildFahrzeugTable(buildings, tableId, vehicleMap, vehicleTypeMap, lssmBuildingDefs, {
                    leitstelle: '',
                    wache: ''
                });
                const newTable = document.getElementById(`fm-table-${tableId}`);
                if (newTable) {
                    const leitstelleSelect =
                          newTable.querySelector('.fm-filter-leitstelle');

                    const wacheSelect =
                          newTable.querySelector('.fm-filter-wache');

                    if (leitstelleSelect) {
                        leitstelleSelect.value = filterLeitstelle;
                    }

                    if (wacheSelect) {
                        wacheSelect.value = filterWache;
                    }

                    newTable.querySelectorAll('tbody tr').forEach(row => {
                        const id = row.dataset.buildingId;

                        if (selectedBuildings.has(id)) {
                            const cb = row.querySelector('.fm-select');
                            if (cb) cb.checked = true;
                        }
                    });

                    const master =
                          newTable.querySelector('.fm-select-all');

                    if (master) {
                        master.checked = masterChecked;
                    }

                    updateBuyButtons(newTable);
                }
                container.style.visibility = 'visible';
            });
        });

        const toggleBtn = table.querySelector(`.fm-toggle-hide-no-missing[data-table="${tableId}"]`);
        if (toggleBtn) {
            toggleBtn.classList.toggle('active', hideNoMissing);

            toggleBtn.textContent =
                hideNoMissing
                ? 'Alle anzeigen'
            : '"Keine" ausblenden';

            toggleBtn.addEventListener('click', () => {
                hideNoMissing = !hideNoMissing;

                localStorage.setItem(
                    storageKey,
                    hideNoMissing ? 'true' : 'false'
                );

                toggleBtn.classList.toggle('active', hideNoMissing);

                toggleBtn.textContent =
                    hideNoMissing
                    ? 'Alle anzeigen'
                : '"Keine" ausblenden';

                applyRowFilter();
            });
        }

        function applyRowFilter() {
            const filterLeitstelle =
                  table.querySelector('.fm-filter-leitstelle')?.value || '';

            const filterWache =
                  table.querySelector('.fm-filter-wache')?.value || '';

            table.querySelectorAll('tbody tr').forEach(row => {
                const rowLeitstelle =
                      row.dataset.leitstelleCaption || '';

                const rowWache =
                      row.dataset.buildingCaption || '';

                const hasMissing =
                      row.dataset.hasMissing === 'true';

                const storageFree =
                      Number(row.dataset.storageFree || 0);

                let visible = true;

                if (
                    filterLeitstelle &&
                    rowLeitstelle !== filterLeitstelle
                ) {
                    visible = false;
                }

                if (
                    filterWache &&
                    rowWache !== filterWache
                ) {
                    visible = false;
                }

                if (
                    hideNoMissing &&
                    !hasMissing &&
                    storageFree <= 0
                ) {
                    visible = false;
                }

                row.style.display = visible ? '' : 'none';

                if (!visible) {
                    const cb = row.querySelector('.fm-select');

                    if (cb) {
                        cb.checked = false;
                    }
                }
            });

            updateBuyButtons(table);
        }

        table.addEventListener('change', e => {
            if (
                e.target.classList.contains('fm-select') ||
                e.target.classList.contains('fm-select-all')
            ) {
                updateBuyButtons(table);
            }
        });
        table.querySelector('.fm-select-all')?.addEventListener('change', e => {
            const checked = e.target.checked;

            const visibleCheckboxes =
                  [...table.querySelectorAll('tbody .fm-select')]
            .filter(
                cb =>
                cb.closest('tr')?.offsetParent !== null
            );

            visibleCheckboxes.forEach(cb => {
                cb.checked = checked;
            });

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
        table.querySelectorAll('.fm-hide-building').forEach(button => {
            button.addEventListener('click', () => {
                const buildingId = Number(button.dataset.buildingId);
                const row = button.closest('tr');

                hideBuilding(buildingId);

                if (row) {
                    const checkbox = row.querySelector('.fm-select');

                    if (checkbox) {
                        checkbox.checked = false;
                    }

                    row.remove();
                }

                updateBuyButtons(table);

                if (!table.querySelector('tbody tr')) {
                    const spoiler = table.closest('.fm-spoiler');

                    if (spoiler) {
                        spoiler.remove();
                    }
                }
            });
        });
        applyRowFilter();
    }

    // Funktion für Besonderheiten
    function isBesonderheit(vehicleTypeId) {
        return Number(vehicleTypeId) === 96;
    }

    // Gibt die Kaufbaren Fahrzeuge zurück
    function getBuyableMissingVehicles(building, missingData, vehicleTypeMap, lssmBuildingDefs) {
        let totalCredits = 0;
        let totalCoins = 0;
        const missingVehicleIds = missingData?.vehiclesIds || [];
        const buyableVehicleIds = [];
        const storage = getBuildingStorageInfo(building);
        let remainingStorage = storage.free;

        const maxVehicles = calcMaxParkingLots(building, lssmBuildingDefs);
        const vehiclesOnBuilding = vehicleMapGlobal[building.id] || [];

        const normalVehiclesOnBuilding = vehiclesOnBuilding.filter(
            v => !isBesonderheit(v.vehicle_type)
        );

        let remainingParking = Math.max(
            maxVehicles - normalVehiclesOnBuilding.length,
            0
        );

        const existingAussenlastbehaelter = vehiclesOnBuilding.filter(
            v => isBesonderheit(v.vehicle_type)
        ).length;

        // Polizeihubschrauberstation: Jeder Hubschrauber-Stellplatz
        // erzeugt zusätzlich einen Stellplatz für einen Außenlastbehälter.
        const maxAussenlastbehaelter = Number(building.building_type) === 13
        ? maxVehicles
        : maxVehicles;

        let remainingAussenlastbehaelter = Math.max(
            maxAussenlastbehaelter - existingAussenlastbehaelter,
            0
        );

        missingVehicleIds.forEach(item => {
            const itemString = String(item);

            // Rollcontainer
            if (itemString.startsWith('equipment:')) {
                const equipmentTypeId = itemString.substring('equipment:'.length);
                const equipment = getEquipmentById(equipmentTypeId);

                if (!equipment) return;

                const size = Number(equipment.size || 0);

                // Kein Lager / kein freier Lagerplatz
                if (!storage.hasStorage || !storage.available || size <= 0) {
                    return;
                }

                if (remainingStorage < size) {
                    return;
                }

                totalCredits += Number(equipment.credits || 0);
                totalCoins += Number(equipment.coins || 0);

                remainingStorage -= size;
                buyableVehicleIds.push(item);
                return;
            }

            // Fahrzeug
            const typeId = parseInt(itemString, 10);

            if (Number.isNaN(typeId)) return;

            const status = getExtensionStatusForVehicle(
                building,
                typeId,
                lssmBuildingDefs
            );

            if (status !== 'ok' && status !== null) {
                return;
            }

            const vt = vehicleTypeMap[typeId];

            if (!vt) return;

            // Außenlastbehälter
            if (isBesonderheit(typeId)) {
                if (remainingAussenlastbehaelter <= 0) {
                    return;
                }

                totalCredits += Number(vt.credits || 0);
                totalCoins += Number(vt.coins || 0);

                buyableVehicleIds.push(item);
                remainingAussenlastbehaelter--;

                return;
            }

            // Normales Fahrzeug
            if (remainingParking <= 0) {
                return;
            }

            totalCredits += Number(vt.credits || 0);
            totalCoins += Number(vt.coins || 0);

            buyableVehicleIds.push(item);
            remainingParking--;
        });

        return {
            totalCredits,
            totalCoins,
            vehiclesIds: buyableVehicleIds
        };
    }

    // Ermittelt, welche Fahrzeuge und RCs einer Wache fehlen
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

            const itemType = c.itemType || c.type || 'vehicle';
            const requestedAmount = parseInt(c.amount, 10) || 1;
            if (itemType === 'equipment') {
                const equipmentTypeId = String(c.typeId);
                const ist = equipmentMapGlobal[building.id]?.[equipmentTypeId] || 0;
                const diff = Math.max(requestedAmount - ist, 0);

                if (diff <= 0) return;

                const equipment = getEquipmentById(equipmentTypeId);
                if (!equipment) return;

                for (let i = 0; i < diff; i++) {
                    missingVehicleIds.push(`equipment:${equipmentTypeId}`);
                }

                missing.push(
                    diff > 1
                    ? `${diff}x ${equipment.caption}`
                    : equipment.caption
                );

                totalCredits += (equipment.credits || 0) * diff;
                totalCoins += (equipment.coins || 0) * diff;

                return;
            }
            let typeId = c.typeId != null ? String(c.typeId) : null;
            if (!typeId) {
                const vtEntry = Object.entries(vehicleTypeMap).find(
                    ([id, v]) =>
                    (v.caption || '').trim() ===
                    (c.caption || '').trim()
                );

                if (vtEntry) typeId = String(vtEntry[0]);
            }
            if (!typeId) return;
            const ist = istByType[typeId] || 0;
            const diff = Math.max(requestedAmount - ist, 0);
            if (diff <= 0) return;
            const vt = vehicleTypeMap[typeId];
            for (let i = 0; i < diff; i++) {
                missingVehicleIds.push(parseInt(typeId, 10));
            }
            missing.push(
                diff > 1
                ? `${diff}x ${c.caption}`
                : c.caption
            );
            if (vt) {
                totalCredits += (vt.credits || 0) * diff;
                totalCoins += (vt.coins || 0) * diff;
            }
        });
        return {
            names: missing.join(',<wbr> ') || 'Keine',
            totalCredits,
            totalCoins,
            vehiclesIds: missingVehicleIds
        };
    }

    // Ermittelt überzählige Fahrzeuge und Ausrüstung im Vergleich zum aktiven Profil
    function getConfiguredSurplusItems(building, vehicleMap) {
        if (!building) return {};
        const configKey =  `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
        const activeProfile = getBuildingActiveProfile(building.id, configKey);
        if (!activeProfile) return {};
        const profiles = loadProfiles(configKey);
        const profile = profiles?.profiles?.[activeProfile];
        if (!Array.isArray(profile)) return {};
        const configured = {};
        const actual = {};
        profile.forEach(item => {
            if (!item.checked) return;
            const itemType = item.type || item.itemType || 'vehicle';
            const typeId = String(item.typeId ?? '');
            if (!typeId) return;
            const key = `${itemType}:${typeId}`;
            const amount = parseInt(item.amount, 10) || 0;
            configured[key] = amount;
        });
        const vehicles = vehicleMap?.[building.id] || [];

        vehicles.forEach(vehicle => {
            const typeId = String(
                vehicle.vehicle_type ??
                vehicle.vehicle_type_id ??
                vehicle.typeId ??
                ''
            );

            if (!typeId) return;

            const key = `vehicle:${typeId}`;

            actual[key] = (actual[key] || 0) + 1;
        });
        const equipment = equipmentMapGlobal?.[building.id] || {};

        Object.entries(equipment).forEach(([equipmentId, amount]) => {
            const key = `equipment:${String(equipmentId)}`;

            actual[key] = (actual[key] || 0) + (parseInt(amount, 10) || 0);
        });
        const surplus = {};

        Object.entries(actual).forEach(([key, actualAmount]) => {
            const configuredAmount = configured[key] || 0;

            if (actualAmount > configuredAmount) {
                surplus[key] = {
                    actual: actualAmount,
                    configured: configuredAmount,
                    surplus: actualAmount - configuredAmount
                };
            }
        });

        return surplus;
    }

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

            const coinsEl = document.getElementById('fm-coins');
            if (coinsEl) coinsEl.textContent = currentCoins.toLocaleString();

            // Buttons nachführen
            updateBuyButtons();
        } catch(e) {
            console.warn(e);
        }
    }

    // Kauffunktion für die Fahrzeuge
    async function buyVehicles(rows, currency, confirmBeforeBuy = true, controller = null, progressText = null, progressBar = null, spinner = null, cancelBtn = null) {
        if (!rows?.length) return;
        controller ??= new AbortController();

        let cancelRequested = false;
        const setAllButtonsDisabled = (disabled, excludeBtn = null) =>
        document.querySelectorAll('button').forEach(btn => {
            if (btn !== excludeBtn) btn.disabled = disabled;
        });

        const container = document.getElementById('fm-progress-container');
        const isDynamicUI = !progressText || !progressBar || !spinner || !cancelBtn;

        if (isDynamicUI) {
            if (!container) return;

            container.style.cssText = `
            display:block;padding:8px;border:1px solid #444;border-radius:6px;
            background:rgba(0,0,0,.1);opacity:1
        `;
            container.innerHTML = `
            <div style="margin-bottom:6px">
                <span id="fm-spinner">⏳</span>
                <span id="fm-progress-text">Kauf gestartet...</span>
            </div>
            <div style="width:100%;background:#333;height:12px;border-radius:4px;overflow:hidden;margin-bottom:6px">
                <div id="fm-progress-bar" style="width:0%;height:100%;background:#4caf50"></div>
            </div>
            <div style="text-align:right">
                <button id="fm-cancel-btn" class="btn btn-warning btn-xs">⛔ Abbrechen</button>
            </div>
        `;

            await new Promise(resolve => setTimeout(resolve, 0));

            progressText = document.getElementById('fm-progress-text');
            progressBar = document.getElementById('fm-progress-bar');
            spinner = document.getElementById('fm-spinner');
            cancelBtn = document.getElementById('fm-cancel-btn');
        }

        cancelBtn.onclick = () => {
            cancelRequested = true;
            controller.abort();
            cancelBtn.disabled = true;
            cancelBtn.textContent = 'Wird abgebrochen...';
            if (spinner) spinner.textContent = '⛔';
        };

        setAllButtonsDisabled(true, cancelBtn);

        try {
            const buyPlanMap = {};
            let totalWanted = 0;

            rows.forEach(row => {
                const items = JSON.parse(row.dataset.missingVehicleIds || '[]');
                const buildingId = Number(row.dataset.buildingId);

                items.forEach(item => {
                    const value = String(item);
                    const itemType = value.startsWith('equipment:') ? 'equipment' : 'vehicle';
                    const itemId = itemType === 'equipment'
                    ? value.substring('equipment:'.length)
                    : Number(value);
                    const key = `${buildingId}-${itemType}-${itemId}`;

                    buyPlanMap[key] ??= { buildingId, itemType, itemId, wanted: 0 };
                    buyPlanMap[key].wanted++;
                    totalWanted++;
                });
            });

            if (!totalWanted) {
                progressText.textContent = 'Keine fehlenden Fahrzeuge oder RCs vorhanden.';
                if (spinner) spinner.textContent = 'ℹ️';
                return;
            }

            let freshVehiclesData;

            try {
                const res = await fetch('/api/vehicles', { signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                freshVehiclesData = await res.json();
            } catch (e) {
                if (e.name === 'AbortError') {
                    cancelRequested = true;
                    return;
                }

                console.error('[FM] Fehler beim Nachladen der Fahrzeugliste:', e);
                alert('Fehler beim Nachladen der aktuellen Fahrzeugliste. Kauf abgebrochen.');
                return;
            }

            const freshVehicleMap = {};
            freshVehiclesData.forEach(vehicle => {
                const buildingId = Number(vehicle.building_id);
                freshVehicleMap[buildingId] ??= [];
                freshVehicleMap[buildingId].push(vehicle);
            });

            const requestsByBuilding = {};
            Object.values(buyPlanMap).forEach(request => {
                const buildingId = Number(request.buildingId);
                requestsByBuilding[buildingId] ??= [];
                requestsByBuilding[buildingId].push(request);
            });

            const filteredBuyList = [];
            let wantedVehicles = 0;
            let actualVehiclesToBuy = 0;
            let wantedEquipment = 0;
            let actualEquipmentToBuy = 0;
            let blockedByParking = 0;
            let blockedByStorage = 0;
            let blockedByNoStorage = 0;

            Object.entries(requestsByBuilding).forEach(([buildingIdString, requests]) => {
                const buildingId = Number(buildingIdString);
                const buildingObj = (buildingDataGlobal || []).find(
                    building => Number(building.id) === buildingId
                );

                let freeSlots = Infinity;
                let freeAussenlastbehaelterSlots = 0;

                if (buildingObj) {
                    try {
                        const max = calcMaxParkingLots(buildingObj, lssmBuildingDefsGlobal);
                        const vehicles = freshVehicleMap[buildingId] || [];

                        if (Number(buildingObj.building_type) === 13) {
                            const normalVehicles = vehicles.filter(
                                vehicle => !isBesonderheit(vehicle.vehicle_type)
                            );
                            const containers = vehicles.filter(
                                vehicle => isBesonderheit(vehicle.vehicle_type)
                            );

                            freeSlots = Math.max(max - normalVehicles.length, 0);
                            freeAussenlastbehaelterSlots = Math.max(
                                max - containers.length,
                                0
                            );
                        } else {
                            freeSlots = Math.max(max - vehicles.length, 0);
                        }
                    } catch {
                        freeSlots = 0;
                        freeAussenlastbehaelterSlots = 0;
                    }
                }

                const storage = getBuildingStorageInfo(buildingObj);
                let remainingStorage = storage.free;

                requests.forEach(({ itemType, itemId, wanted }) => {
                    if (itemType === 'equipment') {
                        wantedEquipment += wanted;

                        const equipment = getEquipmentById(itemId);
                        if (!equipment) {
                            console.warn('[FM] RC-Daten nicht gefunden:', itemId);
                            blockedByStorage += wanted;
                            return;
                        }

                        const size = Number(equipment.size || 0);
                        if (!storage.hasStorage || size <= 0) {
                            blockedByNoStorage += wanted;
                            return;
                        }

                        if (remainingStorage <= 0) {
                            blockedByStorage += wanted;
                            return;
                        }

                        const maxBuyable = Math.min(
                            wanted,
                            Math.floor(remainingStorage / size)
                        );

                        if (maxBuyable <= 0) {
                            blockedByStorage += wanted;
                            return;
                        }

                        for (let i = 0; i < maxBuyable; i++) {
                            filteredBuyList.push({
                                buildingId,
                                itemType: 'equipment',
                                itemId: String(itemId)
                            });
                        }

                        actualEquipmentToBuy += maxBuyable;
                        remainingStorage -= maxBuyable * size;

                        if (maxBuyable < wanted) {
                            blockedByStorage += wanted - maxBuyable;
                        }

                        return;
                    }

                    wantedVehicles += wanted;

                    const isAussenlastbehaelter =
                          Number(buildingObj?.building_type) === 13 &&
                          isBesonderheit(itemId);

                    const availableSlots = isAussenlastbehaelter
                    ? freeAussenlastbehaelterSlots
                    : freeSlots;

                    const toBuy = Math.min(wanted, availableSlots);

                    for (let i = 0; i < toBuy; i++) {
                        filteredBuyList.push({
                            buildingId,
                            itemType: 'vehicle',
                            itemId: Number(itemId)
                        });
                    }

                    actualVehiclesToBuy += toBuy;

                    if (wanted > toBuy) {
                        blockedByParking += wanted - toBuy;
                    }

                    if (isAussenlastbehaelter) {
                        freeAussenlastbehaelterSlots -= toBuy;
                    } else {
                        freeSlots -= toBuy;
                    }
                });
            });

            const actualToBuy = filteredBuyList.length;

            if (!actualToBuy) {
                let message = 'Es kann nichts gekauft werden.\n\n';

                if (blockedByParking) {
                    message += `${blockedByParking} Fahrzeug(e) haben keinen freien Stellplatz.\n`;
                }

                if (blockedByNoStorage) {
                    message += `${blockedByNoStorage} RC(s) können nicht gekauft werden, weil kein nutzbares Lager vorhanden ist.\n`;
                }

                if (blockedByStorage) {
                    message += `${blockedByStorage} RC(s) passen nicht mehr in das vorhandene Lager.\n`;
                }

                alert(message);
                progressText.textContent = 'Keine kaufbaren Fahrzeuge oder RCs.';
                if (spinner) spinner.textContent = 'ℹ️';
                return;
            }

            const warnings = [];

            if (blockedByParking) {
                warnings.push(
                    `${blockedByParking} Fahrzeug(e) können wegen fehlender Stellplätze nicht gekauft werden.`
                );
            }

            if (blockedByNoStorage) {
                warnings.push(
                    `${blockedByNoStorage} RC(s) können nicht gekauft werden, weil kein nutzbares Lager vorhanden ist.`
                );
            }

            if (blockedByStorage) {
                warnings.push(
                    `${blockedByStorage} RC(s) können wegen fehlendem Lagerplatz nicht gekauft werden.`
                );
            }

            if (warnings.length && confirmBeforeBuy) {
                const proceed = confirm(
                    `${warnings.join('\n')}\n\nDie kaufbaren Fahrzeuge und RCs trotzdem kaufen?`
                );
                if (!proceed) return;
            }

            const getItemData = item =>
            item.itemType === 'equipment'
            ? getEquipmentById(item.itemId)
            : vehicleTypeMapGlobal[item.itemId];

            let totalCost = 0;

            filteredBuyList.forEach(item => {
                const itemData = getItemData(item);

                if (!itemData) {
                    console.warn('[FM] Keine Daten für Kaufobjekt gefunden:', item);
                    return;
                }

                totalCost += Number(
                    currency === 'credits' ? itemData.credits || 0 : itemData.coins || 0
                );
            });

            const available = currency === 'credits' ? currentCredits : currentCoins;

            if (totalCost > available) {
                alert(
                    `Nicht genug ${currency === 'credits' ? 'Credits' : 'Coins'}!\n\n` +
                    `Benötigt: ${totalCost.toLocaleString()}\n` +
                    `Vorhanden: ${available.toLocaleString()}`
                );
                return;
            }

            if (confirmBeforeBuy) {
                const vehicleCount = filteredBuyList.filter(
                    item => item.itemType === 'vehicle'
                ).length;

                const equipmentCount = filteredBuyList.filter(
                    item => item.itemType === 'equipment'
                ).length;

                const parts = [];

                if (vehicleCount) {
                    parts.push(`${
                               vehicleCount
                               } Fahrzeug${vehicleCount === 1 ? '' : 'e'}`);
                }

                if (equipmentCount) {
                    parts.push(`${
                               equipmentCount
                               } RC${equipmentCount === 1 ? '' : 's'}`);
                }

                const proceed = confirm(
                    `Möchtest du wirklich ${parts.join(' und ')} für ` +
                    `${totalCost.toLocaleString()} ` +
                    `${currency === 'credits' ? 'Credits' : 'Coins'} kaufen?`
                );

                if (!proceed) return;
            }

            let boughtCount = 0;

            for (let i = 0; i < filteredBuyList.length; i++) {
                if (cancelRequested) break;

                const item = filteredBuyList[i];
                const { buildingId, itemType, itemId } = item;
                const itemData = getItemData(item);

                if (!itemData) {
                    console.warn('[FM] Kaufobjekt nicht gefunden:', item);
                    continue;
                }

                const isEquipment = itemType === 'equipment';
                const equipmentReturnTab = [
                    'rescue_lift',
                    'police_lift',
                    'mountain_drone'
                ].includes(String(itemId))
                ? 'helicopter_equipment'
                : 'rolling_containers';

                const url = isEquipment
                ? `/buildings/${buildingId}/equipment/${itemId}/${currency}?return_tab=${equipmentReturnTab}`
                : `/buildings/${buildingId}/vehicle/${buildingId}/${itemId}/${currency}?building=${buildingId}`;

                try {
                    let fetchOptions = { signal: controller.signal };

                    if (isEquipment) {
                        const token = document.querySelector(
                            'meta[name="csrf-token"]'
                        )?.content;

                        const body = new URLSearchParams({
                            _method: 'post',
                            authenticity_token: token
                        });

                        fetchOptions = {
                            method: 'POST',
                            headers: {
                                'Content-Type':
                                'application/x-www-form-urlencoded; charset=UTF-8'
                            },
                            body: body.toString(),
                            signal: controller.signal
                        };
                    }

                    const res = await fetch(url, fetchOptions);

                    if (res.ok) {
                        boughtCount++;

                        let purchaseLog = [];
                        try {
                            purchaseLog = JSON.parse(
                                localStorage.getItem('fm-purchase-log')
                            ) || [];
                        } catch {}

                        const buildingObj = (buildingDataGlobal || []).find(
                            building => Number(building.id) === Number(buildingId)
                        );

                        purchaseLog.push({
                            time: Date.now(),
                            buildingId,
                            buildingName: buildingObj?.caption || `Wache ${buildingId}`,
                            itemType,
                            itemId,
                            vehicleName: itemData.caption || (
                                isEquipment
                                ? `Equipment ${itemId}`
                                : `Fahrzeug ${itemId}`
                            ),
                            price: Number(
                                currency === 'credits'
                                ? itemData.credits || 0
                                : itemData.coins || 0
                            ),
                            currency: currency === 'credits' ? 'Credits' : 'Coins'
                        });

                        localStorage.setItem(
                            'fm-purchase-log',
                            JSON.stringify(purchaseLog)
                        );
                    }
                } catch (err) {
                    if (err.name === 'AbortError') {
                        cancelRequested = true;
                        break;
                    }

                    console.error(
                        `[Kauf] Fehler ${itemType} ${itemId} Wache ${buildingId}:`,
                        err
                    );
                }

                if (progressText && progressBar) {
                    const progress = Math.round(
                        ((i + 1) / filteredBuyList.length) * 100
                    );

                    progressText.textContent =
                        `${i + 1} / ${filteredBuyList.length} verarbeitet`;
                    progressBar.style.width = `${progress}%`;
                }

                if (confirmBeforeBuy && !cancelRequested) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            if (cancelRequested) {
                if (progressText && spinner) {
                    progressText.textContent =
                        `Der Kauf wurde abgebrochen. Es wurden ${boughtCount} Käufe durchgeführt.`;
                    spinner.textContent = '⛔';
                }

                await new Promise(resolve => setTimeout(resolve, 5000));
            } else if (progressText && spinner) {
                progressText.textContent = `Kauf abgeschlossen (${boughtCount} Käufe)`;
                spinner.textContent = '✅';
            }

            await loadBuildingsFromAPI();
            updateUserResources();
            updateSelectedCosts();
        } finally {
            setAllButtonsDisabled(false);

            if (container) {
                container.style.opacity = '0';

                setTimeout(() => {
                    container.style.display = 'none';
                    container.innerHTML = '';
                }, 300);
            }
        }
    }

    // Funktion für blinde (Coinsausgabe absicherung)
    function confirmCoinPurchase() {
        return confirm('⚠️ Bist du dir sicher, Coins ausgeben zu wollen?\nCoins sind eine Währung die mit Echtgeld gekauft werden und sind für immer weg.');
    }

    // Helper: fügt Modal nur ein, wenn noch nicht vorhanden
    function ensureModalInserted(modalId, html) {
        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend', html);
        }
    }

    // Sperrt gewisse Buttons
    function setConfigButtonLoading(loading) {
        const buttons = [
            document.getElementById('fm-config-btn'),
            document.querySelector('#fahrzeugManagerModal .fm-show-hidden-buildings'),
            document.getElementById('fm-log-btn')
        ].filter(Boolean);

        buttons.forEach(btn => {
            btn.disabled = loading;
            btn.style.backgroundColor = loading ? '#777' : '';
            btn.style.color = loading ? '#ccc' : '';
            btn.style.borderColor = loading ? '#666' : '';
            btn.style.opacity = loading ? '0.6' : '';
            btn.style.cursor = loading ? 'not-allowed' : '';
            btn.title = loading ? 'Daten werden noch geladen …' : '';
        });
    }

    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'fm-config-btn') {
            e.preventDefault();

            if (!fmDataLoaded) return;

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
                showPurchaseLog();
            }
        }
    }); // Resetbutton
    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'fahrzeug-manager-btn') {
            e.preventDefault();
            ensureModalInserted('fahrzeugManagerModal', modalHTML);
            $('#fahrzeugManagerModal').modal('show');
        }

        if (e.target?.classList.contains('fm-show-hidden-buildings')) {
            e.preventDefault();

            showHiddenBuildingsModal(
                buildingDataGlobal,
                vehicleMapGlobal,
                vehicleTypeMapGlobal,
                lssmBuildingDefsGlobal
            );
        }
    }); // Manager / ausgeblendete Wachen
    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'fm-export-profiles') {
            e.preventDefault();
            exportAllProfiles();
        }
    }); // Exportbutton
    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'fm-import-profiles') {
            e.preventDefault();
            importAllProfiles();
        }
    }); // Importbutton
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
            await new Promise(r => setTimeout(r, 0));
            const progressText = document.getElementById('fm-progress-text');
            const progressBar = document.getElementById('fm-progress-bar');
            const spinner = document.getElementById('fm-spinner');
            const cancelBtn = document.getElementById('fm-cancel-btn');
            cancelBtn.onclick = () => {
                cancelRequested = true;
                controller.abort();
                cancelBtn.disabled = true;
                cancelBtn.textContent = 'Wird abgebrochen...';
                spinner.textContent = '⛔';
            };
            const setAllButtonsDisabled = (disabled, excludeBtn = null) => {
                document.querySelectorAll('button').forEach(btn => {
                    if (btn !== excludeBtn) btn.disabled = disabled;
                });
            };
            setAllButtonsDisabled(true, cancelBtn);
            try {
                await buyVehicles([row], currency, false, controller, progressText, progressBar, spinner, cancelBtn);
            } finally {
                if (cancelRequested) {
                    await new Promise(r => setTimeout(r, 3000));
                }
                await loadBuildingsFromAPI();
                updateSelectedCosts();
                setAllButtonsDisabled(false);
                container.style.opacity = '0';
                setTimeout(() => container.style.display = 'none', 300);
            }
        }
    }); // Einzelkauf
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
    }); // Sammelkauf
    $(document).on('hidden.bs.modal', '#fahrzeugConfigModal', async function () {
        if (!document.getElementById('fahrzeugManagerModal')) return;

        const content = document.getElementById('fahrzeug-manager-content');
        if (!content) return;

        content.innerHTML = `
    <div style="padding:25px;text-align:center;">
        <div style="font-weight:bold;font-size:16px;">Tabellen werden aktualisiert …</div>
        <div>
            Die eingestellten Konfigurationen werden geladen und neu erstellt.
        </div>
        <img src="https://raw.githubusercontent.com/Caddy21/-docs-assets-css/main/worker_yoshi.png"style="height:250px;width:auto;margin-top:15px;"><div>
            <br>Keine Sorge – Yoshi arbeitet fleißig und ist schneller fertig als der BER. 🦖🔨<br>
        </div>
    </div>`;

        const renderStart = Date.now();

        try {
            await updateUserResources();

            const remaining = Math.max(0, 5000 - (Date.now() - renderStart));

            setTimeout(() => {
                try {
                    const buildings = buildingDataGlobal;
                    const vehicleMap = vehicleMapGlobal;

                    const leitstellenMap = {};
                    buildings.forEach(b => {
                        if (b.building_type === 7 || b.is_leitstelle) leitstellenMap[b.id] = b.caption;
                    });

                    buildings.forEach(b => {
                        b.leitstelle_caption = b.leitstelle_building_id && leitstellenMap[b.leitstelle_building_id]
                            ? leitstellenMap[b.leitstelle_building_id]
                        : "-";
                        b.vehicle_count = (vehicleMap[b.id] || []).length;
                    });

                    const filteredBuildings = buildings.filter(b => getBuildingTypeName(b) !== null);

                    content.innerHTML = buildBuildingsByType(
                        filteredBuildings,
                        vehicleMapGlobal,
                        vehicleTypeMapGlobal,
                        lssmBuildingDefsGlobal
                    );

                    document.querySelectorAll('.fm-spoiler-header').forEach(header => {
                        header.addEventListener('click', () => {
                            const targetId = header.dataset.target;
                            document.querySelectorAll('.fm-spoiler-body').forEach(body => {
                                body.id === targetId
                                    ? body.classList.toggle('active')
                                : body.classList.remove('active');
                            });
                        });
                    });

                    attachAllTableListeners();

                    document.querySelectorAll('.fm-select').forEach(cb => cb.checked = false);
                    updateSelectedCosts();
                    updateBuyButtons();

                } catch (err) {
                    console.warn('[FM] Fehler beim Erstellen der Tabellen:', err);
                    content.innerHTML = `<div class="alert alert-danger">❌ Fehler beim Erstellen der Tabellen: ${err}</div>`;
                }
            }, remaining);

        } catch (err) {
            console.warn('[FM] Fehler beim Aktualisieren nach Schließen des Config-Modals:', err);
        }
    }); // Fahrzeugkonfiguration schließen
    $(document).on('shown.bs.modal', '#fahrzeugManagerModal', function () {
        document.querySelectorAll('.fm-select').forEach(cb => cb.checked = false);
        document.getElementById('fm-costs-credits').textContent = '0';

        const coinsEl = document.getElementById('fm-costs-coins');
        if (coinsEl) coinsEl.textContent = '0';

        updateUserResources();
        loadBuildingsFromAPI();
    }); // Fahrzeug-Manager schließen

    window.fm_updateSelectedCosts = updateSelectedCosts;

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
                        <button type="button" class="fm-show-hidden-buildings" title="Ausgeblendete Wachen verwalten">👁 Wachen anzeigen</button>
                        <button type="button" class="fm-log-btn" id="fm-log-btn">Kaufprotokoll 📝</button>
                        <button type="button" class="fm-close-btn" data-dismiss="modal">Schließen ✖</button>
                    </div>
                  </div>
                    <div class="fm-description"
                         style="font-size: 14px; color: #555; background-color: var(--spoiler-body-bg); padding: 5px 0; line-height: 1.5;">
                         Nutze den <strong>Fahrzeug-Manager</strong>, um deine Fahrzeuge, Abrollbehälter, Anhänger und Rollcontainer zentral und übersichtlich zu verwalten.<br>
                         Konfiguriere für jeden Wachentyp individuelle Soll-Bestände und hinterlege eigene Profile für unterschiedliche Wachenkonzepte.<br>
                         Der Fahrzeug-Manager vergleicht den aktuellen Bestand mit deiner Konfiguration, zeigt dir fehlende Fahrzeuge, Abrollbehälter, Anhäger und Rollcontainer an und berücksichtigt dabei auch benötigte Erweiterungen und verfügbare Stellplätze.<br>
                         Alles was noch nicht vorhanden ist kannst du anschließend direkt aus der Übersicht heraus kaufen – inklusive einer übersichtlichen Anzeige der anfallenden Credits- und Coin-Kosten.
                    </div>
                    <br>
                    <div style="display:flex;align-items:flex-start;gap:30px;font-size:14px;">
                        <div style="display:grid;grid-template-columns:max-content 1fr;gap:15px;row-gap:3px;align-items:center;">
                            <div>
                                Aktuelle Credits:
                                <span id="fm-credits" style="color:#5cb85c;font-weight:bold;">0</span>
                            </div>

                            <div>
                                Ausgewählte Credits:
                                <span id="fm-costs-credits" style="color:#5cb85c;font-weight:bold;">0</span>
                            </div>

                            ${coinsButton ? `
                                <div>
                                    Aktuelle Coins:
                                    <span id="fm-coins" style="color:#dc3545;font-weight:bold;">0</span>
                                </div>

                                <div>
                                    Ausgewählte Coins:
                                    <span id="fm-costs-coins" style="color:#dc3545;font-weight:bold;">0</span>
                                </div>
                            ` : ''}
                        </div>

                        <div style="display:flex;align-items:center;gap:15px;min-height:100%;">
                            <strong>Farblegende:</strong>
                            <span> <span style="color:#00a8e8;font-weight:bold;">Blau</span> = mehr vorhanden als konfiguriert </span>
                            <span><span style="color:#00a6a6;font-weight:bold;">Türkis</span> = nicht alles kaufbar</span>
                            <span><span style="color:orange;font-weight:bold;">Orange</span> = Erweiterung / Lager im Bau</span>
                            <span><span style="color:red;font-weight:bold;">Rot</span> = Erweiterung / Lager fehlt</span>
                        </div>
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
                <p>Lade die eingestellten Konfigurationen, je nach Auswahl kann dies einen Augenblick dauern.</p>
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
              <button type="button" class="fm-export-btn" id="fm-export-profiles" title="Alle Profile exportieren">💾 Export</button>
              <button type="button" class="fm-import-btn" id="fm-import-profiles" title="Profile importieren">📂 Import</button>
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

    // CSS
    GM_addStyle(`
    #fahrzeugManagerModal,
    #fahrzeugConfigModal,
    #fahrzeugLogModal,
    #fm-hidden-buildings-modal {
        --fm-border: #d9dee3;
        --fm-header-bg: #f8f9fa;
        --fm-header-text: #212529;
        --fm-header-hover: #eef1f4;
        --fm-body-bg: #fff;
        --fm-body-text: #212529;
        --fm-table-header: #f1f3f5;
        --fm-table-hover: #f8f9fa;
        --fm-input-bg: #fff;
        --fm-input-text: #212529;
        --fm-modal-bg: #fff;
        --fm-modal-text: #212529;
    }

    body.dark #fahrzeugManagerModal,
    body.dark #fahrzeugConfigModal,
    body.dark #fahrzeugLogModal,
    body.dark #fm-hidden-buildings-modal {
        --fm-border: #454b52;
        --fm-header-bg: #292d32;
        --fm-header-text: #f1f3f5;
        --fm-header-hover: #343a40;
        --fm-body-bg: #1f2327;
        --fm-body-text: #e2e6ea;
        --fm-table-header: #292d32;
        --fm-table-hover: #292d32;
        --fm-input-bg: #30353a;
        --fm-input-text: #f1f3f5;
        --fm-modal-bg: #1f2327;
        --fm-modal-text: #e2e6ea;
    }

    #fahrzeugManagerModal { z-index: 10000 !important; }
    #fahrzeugConfigModal { z-index: 10001 !important; }
    #fahrzeugLogModal { z-index: 10002 !important; }
    #fm-hidden-buildings-modal { z-index: 10003 !important; }

    #fahrzeugManagerModal .modal-dialog {
        max-width: 2500px;
        width: 95%;
        margin: 30px auto;
    }

    #fahrzeugConfigModal .modal-dialog {
        max-width: 2000px;
        width: 90%;
        margin: 30px auto;
    }

    #fahrzeugLogModal .modal-dialog {
        max-width: 1500px;
        width: 70%;
        margin: 30px auto;
    }

    #fahrzeugManagerModal .modal-content,
    #fahrzeugConfigModal .modal-content,
    #fahrzeugLogModal .modal-content {
        width: 100%;
        background: var(--fm-modal-bg);
        color: var(--fm-modal-text);
        border: 1px solid var(--fm-border);
        border-radius: 12px;
        box-shadow: 0 12px 40px rgba(0,0,0,.25);
        overflow: hidden;
    }

    #fahrzeugManagerModal .modal-content {
        display: flex;
        flex-direction: column;
        height: 90vh;
        overflow-x: auto;
    }

    #fahrzeugConfigModal .modal-content { overflow-x: auto; }
    #fahrzeugLogModal .modal-content { max-height: 85vh; }

    #fahrzeugManagerModal .modal-header,
    #fahrzeugConfigModal .modal-header,
    #fahrzeugLogModal .modal-header {
        padding: 14px 18px;
        background: var(--fm-body-bg);
        color: var(--fm-body-text);
        border-bottom: 1px solid var(--fm-border);
    }

    #fahrzeugManagerModal .modal-header {
        flex-shrink: 0;
        position: sticky;
        top: 0;
        z-index: 10;
    }

    #fahrzeugManagerModal .modal-title,
    #fahrzeugConfigModal .modal-title,
    #fahrzeugLogModal .modal-title {
        color: var(--fm-header-text);
    }

    #fahrzeugManagerModal .modal-body,
    #fahrzeugConfigModal .modal-body,
    #fahrzeugLogModal .modal-body {
        padding: 16px;
        background: var(--fm-body-bg);
        color: var(--fm-body-text);
    }

    #fahrzeugManagerModal .modal-body {
        overflow-y: auto;
        flex-grow: 1;
    }

    #fahrzeugLogModal .modal-body {
        max-height: calc(85vh - 75px);
        overflow: auto;
    }

    #fahrzeugManagerModal .fm-description {
        color: var(--fm-body-text) !important;
        background: var(--fm-body-bg) !important;
    }

    /* Buttons */
    #fahrzeugManagerModal .fm-close-btn,
    #fahrzeugManagerModal .fm-config-btn,
    #fahrzeugManagerModal .fm-show-hidden-buildings,
    #fahrzeugManagerModal .fm-log-btn,
    #fahrzeugManagerModal .fm-export-btn,
    #fahrzeugManagerModal .fm-import-btn,
    #fahrzeugManagerModal .fm-reset-log-btn,
    #fahrzeugConfigModal .fm-close-btn,
    #fahrzeugConfigModal .fm-config-btn,
    #fahrzeugConfigModal .fm-show-hidden-buildings,
    #fahrzeugConfigModal .fm-log-btn,
    #fahrzeugConfigModal .fm-export-btn,
    #fahrzeugConfigModal .fm-import-btn,
    #fahrzeugConfigModal .fm-reset-log-btn,
    #fahrzeugLogModal .fm-close-btn,
    #fahrzeugLogModal .fm-config-btn,
    #fahrzeugLogModal .fm-show-hidden-buildings,
    #fahrzeugLogModal .fm-log-btn,
    #fahrzeugLogModal .fm-export-btn,
    #fahrzeugLogModal .fm-import-btn,
    #fahrzeugLogModal .fm-reset-log-btn {
        border: none;
        border-radius: 7px;
        padding: 6px 12px;
        font-size: 13px;
        cursor: pointer;
        font-weight: 600;
        transition: background-color .18s ease, transform .12s ease, box-shadow .18s ease, opacity .18s ease;
        box-shadow: 0 2px 5px rgba(0,0,0,.15);
    }

    #fahrzeugManagerModal .fm-close-btn,
    #fahrzeugConfigModal .fm-close-btn,
    #fahrzeugLogModal .fm-close-btn {
        color: #fff;
        background: #dc3545;
    }

    #fahrzeugManagerModal .fm-close-btn:hover,
    #fahrzeugConfigModal .fm-close-btn:hover,
    #fahrzeugLogModal .fm-close-btn:hover {
        background: #c82333;
    }

    #fahrzeugManagerModal .fm-config-btn {
        color: #fff;
        background: #0d6efd;
    }

    #fahrzeugManagerModal .fm-config-btn:hover {
        background: #0b5ed7;
    }

    #fahrzeugManagerModal .fm-show-hidden-buildings {
        color: #fff;
        background: #198754;
    }

    #fahrzeugManagerModal .fm-show-hidden-buildings:hover {
        background: #157347;
    }

    #fahrzeugManagerModal .fm-log-btn {
        color: #062b33;
        background: #0dcaf0;
    }

    #fahrzeugManagerModal .fm-log-btn:hover {
        background: #31d2f2;
    }

    #fahrzeugConfigModal .fm-export-btn {
        color: #fff;
        background: #198754;
    }

    #fahrzeugConfigModal .fm-export-btn:hover {
        background: #157347;
    }

    #fahrzeugConfigModal .fm-import-btn {
        color: #fff;
        background: #6f42c1;
    }

    #fahrzeugConfigModal .fm-import-btn:hover {
        background: #59359a;
    }

    #fahrzeugLogModal .fm-reset-log-btn {
        color: #212529;
        background: #ffc107;
        margin-left: 10px;
    }

    #fahrzeugLogModal .fm-reset-log-btn:hover {
        background: #ffca2c;
    }

    #fahrzeugManagerModal button[class*="fm-"]:hover,
    #fahrzeugConfigModal button[class*="fm-"]:hover,
    #fahrzeugLogModal button[class*="fm-"]:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 9px rgba(0,0,0,.2);
    }

    #fahrzeugManagerModal button[class*="fm-"]:active,
    #fahrzeugConfigModal button[class*="fm-"]:active,
    #fahrzeugLogModal button[class*="fm-"]:active {
        transform: translateY(0);
    }

    #fahrzeugManagerModal .fm-config-btn:disabled,
    #fahrzeugManagerModal .fm-show-hidden-buildings:disabled,
    #fahrzeugManagerModal .fm-log-btn:disabled {
        opacity: .55;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none;
    }

    #fahrzeugManagerModal .btn-xs,
    #fahrzeugConfigModal .btn-xs,
    #fahrzeugLogModal .btn-xs {
        padding: 3px 7px;
        font-size: 12px;
        border-radius: 5px;
    }

    /* Spoiler */
    #fahrzeugManagerModal .fm-spoiler,
    #fahrzeugConfigModal .fm-spoiler,
    #fahrzeugLogModal .fm-spoiler {
        border: 1px solid var(--fm-border);
        border-radius: 9px;
        margin-bottom: 10px;
        overflow: hidden;
        background: var(--fm-body-bg);
        box-shadow: 0 2px 6px rgba(0,0,0,.08);
        transition: box-shadow .2s ease;
    }

    #fahrzeugManagerModal .fm-spoiler:hover,
    #fahrzeugConfigModal .fm-spoiler:hover,
    #fahrzeugLogModal .fm-spoiler:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,.12);
    }

    #fahrzeugManagerModal .fm-spoiler-header,
    #fahrzeugConfigModal .fm-spoiler-header,
    #fahrzeugLogModal .fm-spoiler-header {
        padding: 10px 14px;
        background: var(--fm-header-bg);
        color: var(--fm-header-text);
        cursor: pointer;
        font-weight: 700;
        user-select: none;
        transition: background-color .18s ease, padding-left .18s ease;
    }

    #fahrzeugManagerModal .fm-spoiler-header:hover,
    #fahrzeugConfigModal .fm-spoiler-header:hover,
    #fahrzeugLogModal .fm-spoiler-header:hover {
        background: var(--fm-header-hover);
        padding-left: 17px;
    }

    #fahrzeugManagerModal .fm-spoiler-body,
    #fahrzeugConfigModal .fm-spoiler-body,
    #fahrzeugLogModal .fm-spoiler-body {
        display: none;
        padding: 12px;
        background: var(--fm-body-bg);
        color: var(--fm-body-text);
        overflow-x: auto;
    }

    #fahrzeugManagerModal .fm-spoiler-body.active,
    #fahrzeugConfigModal .fm-spoiler-body.active,
    #fahrzeugLogModal .fm-spoiler-body.active {
        display: block;
    }

    /* Tabellen */
    #fahrzeugManagerModal .fm-spoiler table,
    #fahrzeugConfigModal .fm-spoiler table,
    #fahrzeugLogModal .fm-spoiler table,
    #fahrzeugLogModal .modal-body table {
        border-collapse: separate;
        border-spacing: 0;
        width: 100%;
        min-width: 800px;
        border: 1px solid var(--fm-border);
        border-radius: 8px;
        overflow: hidden;
    }

    #fahrzeugManagerModal .fm-spoiler table th,
    #fahrzeugManagerModal .fm-spoiler table td,
    #fahrzeugManagerModal .fm-filter-row td,
    #fahrzeugConfigModal .fm-spoiler table th,
    #fahrzeugConfigModal .fm-spoiler table td,
    #fahrzeugConfigModal .fm-filter-row td,
    #fahrzeugLogModal .fm-spoiler table th,
    #fahrzeugLogModal .fm-spoiler table td,
    #fahrzeugLogModal .fm-filter-row td,
    #fahrzeugLogModal .modal-body table th,
    #fahrzeugLogModal .modal-body table td {
        border: none;
        border-bottom: 1px solid var(--fm-border);
        padding: 7px 9px;
        text-align: center;
        vertical-align: middle;
        white-space: nowrap;
    }

    #fahrzeugManagerModal .fm-spoiler table tbody tr:last-child td,
    #fahrzeugConfigModal .fm-spoiler table tbody tr:last-child td,
    #fahrzeugLogModal .fm-spoiler table tbody tr:last-child td,
    #fahrzeugLogModal .modal-body table tbody tr:last-child td {
        border-bottom: none;
    }

    #fahrzeugManagerModal .fm-spoiler table thead th,
    #fahrzeugManagerModal .fm-filter-row td,
    #fahrzeugConfigModal .fm-spoiler table thead th,
    #fahrzeugConfigModal .fm-filter-row td,
    #fahrzeugLogModal .fm-spoiler table thead th,
    #fahrzeugLogModal .fm-filter-row td {
        background: var(--fm-table-header);
        font-weight: 700;
    }

    #fahrzeugManagerModal .fm-spoiler table tbody tr:hover,
    #fahrzeugConfigModal .fm-spoiler table tbody tr:hover,
    #fahrzeugLogModal .fm-spoiler table tbody tr:hover,
    #fahrzeugLogModal .modal-body table tbody tr:hover {
        background: var(--fm-table-hover);
    }

    /* Filter */
    #fahrzeugManagerModal .fm-filter-row select,
    #fahrzeugManagerModal .fm-filter-row button.fm-filter-reset,
    #fahrzeugConfigModal .fm-filter-row select,
    #fahrzeugConfigModal .fm-filter-row button.fm-filter-reset,
    #fahrzeugLogModal .fm-filter-row select,
    #fahrzeugLogModal .fm-filter-row button.fm-filter-reset {
        font-size: 12px;
        padding: 4px 7px;
        min-width: 100px;
        width: 100%;
        border-radius: 6px;
    }

    #fahrzeugManagerModal .fm-filter-row select,
    #fahrzeugConfigModal .fm-filter-row select,
    #fahrzeugLogModal .fm-filter-row select,
    #fahrzeugManagerModal input,
    #fahrzeugManagerModal textarea,
    #fahrzeugManagerModal select,
    #fahrzeugConfigModal input,
    #fahrzeugConfigModal textarea,
    #fahrzeugConfigModal select,
    #fahrzeugLogModal input,
    #fahrzeugLogModal textarea,
    #fahrzeugLogModal select {
        background: var(--fm-input-bg);
        color: var(--fm-input-text);
        border-color: var(--fm-border);
    }

    #fahrzeugManagerModal input::placeholder,
    #fahrzeugManagerModal textarea::placeholder,
    #fahrzeugConfigModal input::placeholder,
    #fahrzeugConfigModal textarea::placeholder,
    #fahrzeugLogModal input::placeholder,
    #fahrzeugLogModal textarea::placeholder {
        color: #adb5bd;
    }

    #fahrzeugManagerModal input:focus,
    #fahrzeugManagerModal textarea:focus,
    #fahrzeugManagerModal select:focus,
    #fahrzeugConfigModal input:focus,
    #fahrzeugConfigModal textarea:focus,
    #fahrzeugConfigModal select:focus,
    #fahrzeugLogModal input:focus,
    #fahrzeugLogModal textarea:focus,
    #fahrzeugLogModal select:focus {
        background: var(--fm-input-bg);
        color: var(--fm-input-text);
        border-color: #0d6efd;
        box-shadow: 0 0 0 3px rgba(13,110,253,.18);
        outline: none;
    }

    body.dark #fahrzeugConfigModal input[type="number"],
    body.dark #fahrzeugConfigModal input[type="text"] {
        background: var(--fm-input-bg) !important;
        color: var(--fm-input-text) !important;
        border: 1px solid var(--fm-border) !important;
    }

    #fahrzeugManagerModal .fm-select,
    #fahrzeugConfigModal .fm-select,
    #fahrzeugLogModal .fm-select {
        cursor: pointer;
    }

    #fahrzeugManagerModal .fm-building-profile,
    #fahrzeugConfigModal .fm-building-profile,
    #fahrzeugLogModal .fm-building-profile {
        background: var(--fm-input-bg);
        color: var(--fm-input-text);
        border: 1px solid var(--fm-border);
        border-radius: 6px;
        padding: 4px 7px;
    }

    #fahrzeugManagerModal .fm-building-profile:focus,
    #fahrzeugConfigModal .fm-building-profile:focus,
    #fahrzeugLogModal .fm-building-profile:focus {
        outline: none;
        border-color: #0d6efd;
        box-shadow: 0 0 0 3px rgba(13,110,253,.18);
    }

    #fahrzeugManagerModal .fm-vehicle-list,
    #fahrzeugConfigModal .fm-vehicle-list,
    #fahrzeugLogModal .fm-vehicle-list {
        display: inline-block;
        max-width: 350px;
        white-space: normal !important;
        word-break: normal !important;
        overflow-wrap: normal !important;
    }

    #fahrzeugManagerModal .fm-badge-green,
    #fahrzeugConfigModal .fm-badge-green,
    #fahrzeugLogModal .fm-badge-green {
        background-color: #198754 !important;
        color: #fff !important;
        border-radius: 5px;
    }

    #fahrzeugManagerModal .fm-building-link,
    #fahrzeugManagerModal .fm-building-link:visited,
    #fahrzeugManagerModal .fm-building-link:hover,
    #fahrzeugManagerModal .fm-building-link:active,
    #fahrzeugConfigModal .fm-building-link,
    #fahrzeugConfigModal .fm-building-link:visited,
    #fahrzeugConfigModal .fm-building-link:hover,
    #fahrzeugConfigModal .fm-building-link:active,
    #fahrzeugLogModal .fm-building-link,
    #fahrzeugLogModal .fm-building-link:visited,
    #fahrzeugLogModal .fm-building-link:hover,
    #fahrzeugLogModal .fm-building-link:active {
        color: inherit !important;
        font-weight: normal !important;
        text-decoration: none !important;
        background: none !important;
    }

    #fahrzeugManagerModal #fm-progress-container { width: 100%; }
    #fahrzeugManagerModal #fm-progress-text { color: #0d6efd !important; }
    #fahrzeugManagerModal #fm-progress-bar { border-radius: 999px; }

    /* Ausgeblendete Wachen */
    #fm-hidden-buildings-modal {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: #f4f5f7;
    }

    body.dark #fm-hidden-buildings-modal {
        background: #171a1d;
    }

    #fm-hidden-buildings-modal .fm-hidden-buildings-dialog {
        width: 700px;
        max-width: 100%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        background: var(--fm-modal-bg);
        color: var(--fm-modal-text);
        border: 1px solid var(--fm-border);
        border-radius: 12px;
        box-shadow: 0 12px 40px rgba(0,0,0,.25);
        overflow: hidden;
    }

    #fm-hidden-buildings-modal .fm-hidden-buildings-header {
        padding: 14px 18px;
        background: var(--fm-body-bg);
        color: var(--fm-header-text);
        border-bottom: 1px solid var(--fm-border);
        font-size: 16px;
        font-weight: 700;
    }

    #fm-hidden-buildings-modal .fm-hidden-buildings-body {
        padding: 16px;
        overflow-y: auto;
        background: var(--fm-body-bg);
        color: var(--fm-body-text);
    }

    #fm-hidden-buildings-modal .fm-hidden-building-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 9px 10px;
        border-bottom: 1px solid var(--fm-border);
        border-radius: 6px;
        transition: background-color .18s ease;
    }

    #fm-hidden-buildings-modal .fm-hidden-building-row:last-child {
        border-bottom: none;
    }

    #fm-hidden-buildings-modal .fm-hidden-building-row:hover {
        background: var(--fm-table-hover);
    }

    #fm-hidden-buildings-modal .fm-hidden-building-row > span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    #fm-hidden-buildings-modal .fm-hidden-building-row button,
    #fm-hidden-buildings-modal .fm-hidden-buildings-footer button {
        flex-shrink: 0;
        border: none;
        border-radius: 7px;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color .18s ease, transform .12s ease, box-shadow .18s ease, opacity .18s ease;
        box-shadow: 0 2px 5px rgba(0,0,0,.15);
    }

    #fm-hidden-buildings-modal .fm-unhide-building {
        color: #fff;
        background: #198754;
    }

    #fm-hidden-buildings-modal .fm-unhide-building:hover {
        background: #157347;
    }

    #fm-hidden-buildings-modal .fm-unhide-all-buildings,
    #fm-hidden-buildings-modal .fm-hidden-buildings-close {
        color: #fff;
        background: #dc3545;
    }

    #fm-hidden-buildings-modal .fm-unhide-all-buildings:hover,
    #fm-hidden-buildings-modal .fm-hidden-buildings-close:hover {
        background: #c82333;
    }

    #fm-hidden-buildings-modal .fm-hidden-building-row button:hover,
    #fm-hidden-buildings-modal .fm-hidden-buildings-footer button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 9px rgba(0,0,0,.2);
    }

    #fm-hidden-buildings-modal .fm-unhide-all-buildings:disabled {
        opacity: .55;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    #fm-hidden-buildings-modal .fm-hidden-buildings-empty {
        padding: 25px 10px;
        color: var(--fm-body-text);
        text-align: center;
        opacity: .7;
        font-style: italic;
    }

    #fm-hidden-buildings-modal .fm-hidden-buildings-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 16px;
        background: var(--fm-body-bg);
        border-top: 1px solid var(--fm-border);
    }
`);
})();
