
// ==UserScript==
// @name         [LSS] Stellplatzfinder
// @namespace    https://www.leitstellenspiel.de/
// @version      1.2
// @description  Findet freie Stellplätze inklusive farblicher Unterscheidung zwischen Klein- und Normalwachen oder blendet volle Wachen aus.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    let hideFullBuildings = false;
    let enableSorting = true;

    const API_BASE = "https://www.leitstellenspiel.de/api/v2";

    const POLExtensions = {
        10: 1, 12: 1, 13: 2
    };

    const THWExtensions = {
        0: 2, 1: 1, 2: 4, 3: 5, 4: 1, 5: 2, 6: 1,
        7: 2, 8: 4, 9: 1, 10: 2, 11: 2, 12: 1, 13: 5
    };

    const BPolExtensions = {
        0: 4, 1: 5, 2: 1, 3: 4, 4: 5, 5: 5,
        6: 5, 7: 5, 8: 3, 9: 6, 10: 1
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

    const noSlotBuildingTypes = {
        1: "Feuerwehrschule",
        3: "Rettungsschule",
        4: "Krankenhaus",
        7: "Leitstelle",
        8: "Polizeischule",
        10: "THW-Schule",
        27: "Schule für Seefahrt und Seenotrettung"
    };


async function fetchAllPages(endpoint) {
    let results = [];
    let url = `${API_BASE}/${endpoint}?limit=4000`;

    try {
        while (url) {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`${endpoint}: HTTP ${response.status}`);
            }

            const data = await response.json();

            const entries = data.result;

            if (Array.isArray(entries)) {
                results.push(...entries);
            } else if (entries && typeof entries === "object") {
                results.push(...Object.values(entries));
            } else {
                throw new Error(`Unerwartetes API-Format bei ${endpoint}`);
            }

            url = data.paging?.next_page
                ? new URL(data.paging.next_page, location.origin).href
                : null;
        }

        console.log(`[Stellplatzfinder] ${endpoint}: ${results.length} Datensätze geladen`);

        return results;
    } catch (error) {
        console.error(`[Stellplatzfinder] Fehler beim Abrufen von ${endpoint}:`, error);
        return null;
    }
}

    async function fetchBuildings() {
        const buildings = await fetchAllPages("buildings");

        if (!buildings) return {};

        let buildingData = {};

        buildings.forEach(building => {
            let isSmall = building.small_building;
            let parkingLots = building.level + 1;

            if (building.extensions) {
                building.extensions.forEach(extension => {
                    if (extension.available) {
                        let additionalSlots = 0;

                        if (building.building_type === 9) {
                            additionalSlots = THWExtensions[extension.type_id] || 0;
                        } else if (building.building_type === 11) {
                            additionalSlots = BPolExtensions[extension.type_id] || 0;
                        } else if (building.building_type === 12) {
                            additionalSlots = SegExtensions[extension.type_id] || 0;
                        } else if (building.building_type === 17) {
                            additionalSlots = PolSonderExtensions[extension.type_id] || 0;
                        } else if (building.building_type === 25) {
                            additionalSlots = BergExtensions[extension.type_id] || 0;
                        } else if (
                            building.building_type === 6 ||
                            building.building_type === 0
                        ) {
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
    }

    async function fetchVehicles() {
        const vehicles = await fetchAllPages("vehicles");

        if (!vehicles) return {};

        let vehicleCounts = {};

        vehicles.forEach(vehicle => {
            vehicleCounts[vehicle.building_id] =
                (vehicleCounts[vehicle.building_id] || 0) + 1;
        });

        return vehicleCounts;
    }

    async function highlightFreeSlots() {
        const [buildings, vehicles] = await Promise.all([
            fetchBuildings(),
            fetchVehicles()
        ]);

        if (!Object.keys(buildings).length) {
            console.warn("[Stellplatzfinder] Keine Gebäudedaten verfügbar.");
            return;
        }

        Object.keys(buildings).forEach(buildingID => {
            let { type, maxSlots, small } = buildings[buildingID];
            let vehicleCount = vehicles[buildingID] || 0;

            let buildingElement = document.getElementById(
                `building_list_caption_${buildingID}`
            );

            if (!buildingElement) return;

            const buildingContainer = buildingElement.parentElement;

            if (noSlotBuildingTypes[type]) {
                buildingContainer.style.display = "";
                buildingElement.style.backgroundColor = "";
                return;
            }

            let freeSlots = maxSlots - vehicleCount;

            if (hideFullBuildings && freeSlots <= 0) {
                buildingContainer.style.display = "none";
            } else {
                buildingContainer.style.display = "";

                if (freeSlots > 0 && !hideFullBuildings) {
                    buildingElement.style.backgroundColor =
                        small ? "red" : "green";
                } else {
                    buildingElement.style.backgroundColor = "";
                }
            }
        });

        sortBuildings();
    }

    function sortBuildings() {
        if (!enableSorting) return;

        let buildingList = document.querySelector("#building_list");

        if (!buildingList) {
            console.warn("[Tampermonkey] Gebäude-Liste nicht gefunden!");
            return;
        }

        let buildings = Array.from(
            buildingList.querySelectorAll(".building_list_li")
        );

        buildings.sort((a, b) => {
            let colorA =
                a.querySelector(".building_list_caption")?.style.backgroundColor || "";
            let colorB =
                b.querySelector(".building_list_caption")?.style.backgroundColor || "";

            if (colorA === "green" && colorB !== "green") return -1;
            if (colorB === "green" && colorA !== "green") return 1;
            if (colorA === "red" && colorB !== "red") return -1;
            if (colorB === "red" && colorA !== "red") return 1;

            return 0;
        });

        buildings.forEach(building => buildingList.appendChild(building));
    }

    await highlightFreeSlots();

})();
