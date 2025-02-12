// ==UserScript==
// @name         [LSS] 12 - Freie Stellplätze
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Findet freie Stellplätze in Wachen
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    console.log("[Tampermonkey] API-gestützter Stellplatzfinder gestartet...");

    // Mapping der Stellplätze für jede Erweiterung anhand der type_id
    const THWExtensions = {
        0: 2, 1: 1, 2: 4, 3: 5, 4: 1, 5: 2, 6: 1, 7: 2, 8: 4, 9: 1, 10: 2, 11: 2, 12: 1, 13: 5
    };

    const BPolExtensions = {
        0: 4, 1: 5, 2: 1, 3: 4, 4: 5, 5: 5, 6: 5, 7: 5, 8: 3, 9: 6, 10: 1
    };

    const SegExtensions = {
        0: 1, 1: 4, 2: 3, 3: 2, 4: 1, 5: 10
    };


    // Liste der Gebäude-Typen ohne Stellplätze
    const noSlotBuildingTypes = { 1: "Feuerwehrschule", 3: "Rettungsschule", 4: "Krankenhaus", 7: "Leitstelle", 8: "Polizeischule", 10: "THW-Schule", 27: "Schule für Seefahrt und Seenotrettung" };

    async function fetchBuildings() {
        try {
            const response = await fetch("https://www.leitstellenspiel.de/api/buildings");
            const buildings = await response.json();

            let buildingData = {};
            buildings.forEach(building => {
                let parkingLots = building.level + 1; // Standard: Level + 1 Stellplatz

                console.log(`[API] Gebäude geladen: ${building.caption} (ID: ${building.id}), Typ: ${building.building_type}`);

                if (building.building_type === 9) { // Falls es ein THW-Gebäude ist
                    parkingLots = 1; // Basis-Stellplatz

                    if (building.extensions) {
                        console.log(`[DEBUG] Erweiterungen für ${building.caption}:`, building.extensions);

                        building.extensions.forEach((extension, index) => {
                            console.log(`[DEBUG] Erweiterung ${index}: ${extension.caption}, type_id: ${extension.type_id}, enabled: ${extension.enabled}, available: ${extension.available}`);

                            // Berücksichtige alle Erweiterungen, unabhängig von ihrem "enabled" oder "available"-Status
                            const additionalSlots = THWExtensions[extension.type_id] || 0; // Falls keine spezielle Zuweisung, 0 Stellplätze
                            console.log(`[DEBUG] -> Erweiterung gibt Stellplätze: ${additionalSlots}`);
                            parkingLots += additionalSlots;
                        });
                    } else {
                        console.log(`[WARN] Keine Erweiterungen für ${building.caption} gefunden!`);
                    }
                }

                 if (building.building_type === 11) { // Falls es ein BPol-Gebäude ist
                    parkingLots = 4; // Basis-Stellplatz

                    if (building.extensions) {
                        console.log(`[DEBUG] Erweiterungen für ${building.caption}:`, building.extensions);

                        building.extensions.forEach((extension, index) => {
                            console.log(`[DEBUG] Erweiterung ${index}: ${extension.caption}, type_id: ${extension.type_id}, enabled: ${extension.enabled}, available: ${extension.available}`);

                            // Berücksichtige alle Erweiterungen, unabhängig von ihrem "enabled" oder "available"-Status
                            const additionalSlots = BPolExtensions[extension.type_id] || 0; // Falls keine spezielle Zuweisung, 0 Stellplätze
                            console.log(`[DEBUG] -> Erweiterung gibt Stellplätze: ${additionalSlots}`);
                            parkingLots += additionalSlots;
                        });
                    } else {
                        console.log(`[WARN] Keine Erweiterungen für ${building.caption} gefunden!`);
                    }
                }

                if (building.building_type === 12) { // Falls es eine SEG-Wache ist
                    parkingLots = 1; // Basis-Stellplatz

                    if (building.extensions) {
                        console.log(`[DEBUG] Erweiterungen für ${building.caption}:`, building.extensions);

                        building.extensions.forEach((extension, index) => {
                            console.log(`[DEBUG] Erweiterung ${index}: ${extension.caption}, type_id: ${extension.type_id}, enabled: ${extension.enabled}, available: ${extension.available}`);

                            // Berücksichtige alle Erweiterungen, unabhängig von ihrem "enabled" oder "available"-Status
                            const additionalSlots = THWExtensions[extension.type_id] || 0; // Falls keine spezielle Zuweisung, 0 Stellplätze
                            console.log(`[DEBUG] -> Erweiterung gibt Stellplätze: ${additionalSlots}`);
                            parkingLots += additionalSlots;
                        });
                    } else {
                        console.log(`[WARN] Keine Erweiterungen für ${building.caption} gefunden!`);
                    }
                }

                buildingData[building.id] = { name: building.caption, level: building.level, type: building.building_type, maxSlots: parkingLots };
                console.log(`[RESULT] ${building.caption} hat insgesamt ${parkingLots} Stellplätze.`);
            });

            return buildingData;
        } catch (error) {
            console.error("[API] Fehler beim Abrufen der Gebäude:", error);
            return {};
        }
    }

    async function fetchVehicles() {
        try {
            const response = await fetch("https://www.leitstellenspiel.de/api/vehicles");
            const vehicles = await response.json();

            let vehicleCounts = {};
            vehicles.forEach(vehicle => {
                vehicleCounts[vehicle.building_id] = (vehicleCounts[vehicle.building_id] || 0) + 1;
            });

            console.log("[API] Fahrzeuge erfolgreich geladen:", vehicleCounts);
            return vehicleCounts;
        } catch (error) {
            console.error("[API] Fehler beim Abrufen der Fahrzeuge:", error);
            return {};
        }
    }

    async function highlightFreeSlots() {
        let buildings = await fetchBuildings();
        let vehicles = await fetchVehicles();

        Object.keys(buildings).forEach(buildingID => {
            let { name, type, maxSlots } = buildings[buildingID];
            let vehicleCount = vehicles[buildingID] || 0;

            if (noSlotBuildingTypes[type]) {
                console.log(`[Tampermonkey] ${name} (${noSlotBuildingTypes[type]}) hat keine Stellplätze.`);
                return;
            }

            let freeSlots = maxSlots - vehicleCount;

            console.log(`[Tampermonkey] Gebäude: ${name} (ID: ${buildingID}), Typ: ${type}, Max. Stellplätze: ${maxSlots}, Fahrzeuge: ${vehicleCount}`);
            console.log(`[Tampermonkey] ${name} hat ${freeSlots} freie Stellplätze.`);

            if (freeSlots > 0) {
                let buildingElement = document.getElementById(`building_list_caption_${buildingID}`);
                if (buildingElement) {
                    buildingElement.style.backgroundColor = 'green';
                }
            }
        });
    }

    highlightFreeSlots();
})();
