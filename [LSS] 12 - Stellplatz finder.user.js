// ==UserScript==
// @name         [LSS] Stellplätze Finder
// @namespace    https://leitstellenspiel.de/
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

    // Liste der Gebäude-Typen ohne Stellplätze
    const noSlotBuildingTypes = {
        3: "Schule",        // Keine Stellplätze
        4: "Krankenhaus",   // Betten statt Stellplätze
        7: "Leitstelle",    // Keine Stellplätze
        8: "Schule",
       10: "Schule",
       27: "Schule",
    };

    /**
     * Holt alle Gebäude und deren Level aus der API
     * @returns {Promise<Object>} Ein Objekt mit building_id als Key und Gebäude-Daten als Value
     */
    async function fetchBuildings() {
        try {
            const response = await fetch("https://www.leitstellenspiel.de/api/buildings");
            const buildings = await response.json();

            let buildingData = {};
            buildings.forEach(building => {
                buildingData[building.id] = {
                    name: building.caption,
                    level: building.level,
                    type: building.building_type // Korrigiert: building_type statt building_type_id
                };
            });

            console.log("[API] Gebäude erfolgreich geladen:", buildingData);
            return buildingData;
        } catch (error) {
            console.error("[API] Fehler beim Abrufen der Gebäude:", error);
            return {};
        }
    }

    /**
     * Holt alle Fahrzeuge und zählt sie pro Wache
     * @returns {Promise<Object>} Ein Objekt mit building_id als Key und Anzahl Fahrzeuge als Value
     */
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

    /**
     * Berechnet die freien Stellplätze und markiert Wachen
     */
    async function highlightFreeSlots() {
        let buildings = await fetchBuildings();
        let vehicles = await fetchVehicles();

        Object.keys(buildings).forEach(buildingID => {
            let { level, name, type } = buildings[buildingID];
            let vehicleCount = vehicles[buildingID] || 0;

            // Falls das Gebäude keine Stellplätze hat, überspringen
            if (noSlotBuildingTypes[type]) {
                console.log(`[Tampermonkey] ${name} (${noSlotBuildingTypes[type]}) hat keine Stellplätze.`);
                return;
            }

            // Berechnung der maximalen Stellplätze: Level + 1, max. 40 Stellplätze
            let maxSlots = Math.min(level + 1, 40); // +1 da Level 0 bereits ein Stellplatz ist
            let freeSlots = maxSlots - vehicleCount;

            // Wenn freie Stellplätze vorhanden sind, wird die Wache grün hinterlegt
            if (freeSlots > 0) {
                console.log(`[Tampermonkey] ${name} hat ${freeSlots} freie Stellplätze.`);

                // HTML-Element der Wache finden und Hintergrundfarbe ändern
                let buildingElement = document.getElementById(`building_list_caption_${buildingID}`);
                if (buildingElement) {
                    buildingElement.style.backgroundColor = 'green'; // Wache grün hinterlegen
                }
            }
        });
    }

    highlightFreeSlots();
})();
