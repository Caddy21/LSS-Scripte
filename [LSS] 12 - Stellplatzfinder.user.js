// ==UserScript==
// @name         [LSS] Stellplatzfinder
// @namespace    https://www.leitstellenspiel.de/
// @version      1.5
// @description  Findet freie Stellplätze inklusive farblicher Unterscheidung zwischen Klein- und Normalwachen oder blendet volle Wachen aus.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    let hideFullBuildings = false; // true = Volle Wachen ausblenden, false = Alle anzeigen + Highlights
    let enableSorting = true; // true = Wachen nach oben sortieren, false = Keine Sortierung

    // Mapping der Stellplätze für jede Erweiterung anhand der type_id
    const POLExtensions = {
        10: 1, 12: 1, 13: 2
    };

    const THWExtensions = {
        0: 2, 1: 1, 2: 4, 3: 5, 4: 1, 5: 2, 6: 1, 7: 2, 8: 4, 9: 1, 10: 2, 11: 2, 12: 1, 13: 5
    };

    const BPolExtensions = {
        0: 4, 1: 5, 2: 1, 3: 4, 4: 5, 5: 5, 6: 5, 7: 5, 8: 3, 9: 6, 10: 1
    };

    const SegExtensions = {
        0: 1, 1: 4, 2: 3, 3: 2, 4: 1, 5: 10
    };

    const PolSonderExtensions = {
        0: 5, 1: 5, 2: 5, 3: 5, 4: 3
    };

    const BergExtensions = {
        0: 2, 2: 2
    };

    // Liste der Gebäude-Typen ohne Stellplätze
    const noSlotBuildingTypes = {
        1: "Feuerwehrschule",
        3: "Rettungsschule",
        4: "Krankenhaus",
        7: "Leitstelle",
        8: "Polizeischule",
        10: "THW-Schule",
        27: "Schule für Seefahrt und Seenotrettung"
    };

    async function fetchBuildings() {
        try {
            const response = await fetch("https://www.leitstellenspiel.de/api/buildings");
            const buildings = await response.json();

            let buildingData = {};

            buildings.forEach(building => {
                let isSmall = building.small_building;
                let parkingLots = building.level + 1;

                // Erweiterungen berücksichtigen, auch wenn "enabled: false", solange "available: true"
                if (building.extensions) {
                    building.extensions.forEach(extension => {
                        if (extension.available) {
                            let additionalSlots = 0;

                            // Für die verschiedenen Gebäude-Typen Erweiterungen zu Stellplätzen zuordnen
                            if (building.building_type === 9) { // THW
                                additionalSlots = THWExtensions[extension.type_id] || 0;
                            } else if (building.building_type === 11) { // Bundespolizei
                                additionalSlots = BPolExtensions[extension.type_id] || 0;
                            } else if (building.building_type === 12) { // SEG
                                additionalSlots = SegExtensions[extension.type_id] || 0;
                            } else if (building.building_type === 17) { // Polizei-Sondereinheit
                                additionalSlots = PolSonderExtensions[extension.type_id] || 0;
                            } else if (building.building_type === 25) { // Bergwacht
                                additionalSlots = BergExtensions[extension.type_id] || 0;
                            } else if (building.building_type === 6 || building.building_type === 0) { // Pol-Kleinwache
                                additionalSlots = POLExtensions[extension.type_id] || 0;
                            }

                            parkingLots += additionalSlots;
                        }
                    });
                }

                buildingData[building.id] = {
                    name: building.caption,
                    level: building.level,
                    type: building.building_type,
                    small: isSmall,
                    maxSlots: parkingLots
                };
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

            return vehicleCounts;
        } catch (error) {
            console.error("[API] Fehler beim Abrufen der Fahrzeuge:", error);
            return {};
        }
    }

    // Funktion um Wachen hervorzuheben, wo Stellplätze frei sind und volle Wachen auszublenden
    async function highlightFreeSlots() {
        let buildings = await fetchBuildings();
        let vehicles = await fetchVehicles();

        Object.keys(buildings).forEach(buildingID => {
            let { name, type, maxSlots, small } = buildings[buildingID];
            let vehicleCount = vehicles[buildingID] || 0;

            let buildingElement = document.getElementById(`building_list_caption_${buildingID}`);

            if (buildingElement) {
                // Nur Gebäude ohne Stellplätze (Schulen, Leitstellen, etc.) immer anzeigen, auch wenn hideFullBuildings true ist
                if (noSlotBuildingTypes[type]) {
                    buildingElement.parentElement.style.display = ""; // Immer anzeigen, auch bei hideFullBuildings = true
                } else {
                    // Volle Wachen ausblenden, wenn hideFullBuildings aktiviert ist
                    if (hideFullBuildings && maxSlots <= vehicleCount) {
                        buildingElement.parentElement.style.display = "none"; // Ausblenden
                    } else {
                        buildingElement.parentElement.style.display = ""; // Wachen wieder anzeigen
                        let freeSlots = maxSlots - vehicleCount;

                        // Farbliche Markierung
                        if (freeSlots > 0 && !hideFullBuildings) {
                            // Markierung für freie Stellplätze (Kleinwachen rot, normale Wachen grün)
                            buildingElement.style.backgroundColor = small ? 'red' : 'green';
                        } else {
                            buildingElement.style.backgroundColor = ''; // Zurücksetzen der Hintergrundfarbe
                        }
                    }
                }
            }
        });

        // Nach dem Highlighting die Gebäude sortieren, wenn aktiviert
        sortBuildings();
    }

    // Funktion zum Sortieren der Gebäude
    function sortBuildings() {
        if (!enableSorting) {
            return; // Keine Sortierung, wenn deaktiviert
        }

        let buildingList = document.querySelector("#building_list"); // Hauptliste aller Gebäude
        if (!buildingList) {
            console.warn("[Tampermonkey] Gebäude-Liste nicht gefunden!");
            return;
        }

        let buildings = Array.from(buildingList.querySelectorAll(".building_list_li")); // Alle Gebäude-Elemente abrufen

        // Sortieren nach Hintergrundfarbe (grün und rot zuerst)
        buildings.sort((a, b) => {
            let colorA = a.querySelector(".building_list_caption")?.style.backgroundColor || "";
            let colorB = b.querySelector(".building_list_caption")?.style.backgroundColor || "";

            // Wachen mit freien Stellplätzen nach oben (grün oder rot)
            if (colorA === "green" && colorB !== "green") return -1;
            if (colorB === "green" && colorA !== "green") return 1;
            if (colorA === "red" && colorB !== "red") return -1;
            if (colorB === "red" && colorA !== "red") return 1;

            return 0; // Keine Änderung
        });

        // Liste neu anordnen
        buildingList.innerHTML = "";
        buildings.forEach(building => buildingList.appendChild(building));
    }

    // Das Skript ausführen
    highlightFreeSlots();

})();
