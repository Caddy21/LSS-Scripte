// ==UserScript==
// @name         [LSS] Sprechwunsch Sortierer
// @namespace    https://www.leitstellenspiel.de/
// @version      1.1
// @description  Sortiert Sprechwünsche je nach Fahrzeugpriorität.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.info
// ==/UserScript==

(async function () {
    
    // Hier könnt Ihr die Reihenfolge der Sprechwünsche festlegen, aktuell sind folgende Fahrzeuge hinterlegt
    // Aktuelle Reihenfolge: RTH / FuStW / RTW
    const VEHICLE_TYPE_IDS = [31, 32, 28]; 
    // Reihenfolge kann beliebig geändert werden 
    // Fahrzeugtypen können beliebig erweitert werden 
    
    // Ab hier bitte nichts mehr ändern.
    const VEHICLE_API_URL = "https://www.leitstellenspiel.de/api/vehicles";
    const GM_STORAGE_KEY = "sorted_vehicle_queue";

    console.log("🚀 Skript gestartet: Fahrzeuge werden verwaltet.");

    // 🚀 1. Funktion zum Abrufen der Fahrzeuge
    async function fetchVehicles() {
        console.log("📡 Lade Fahrzeugdaten aus der API...");

        try {
            const response = await fetch(VEHICLE_API_URL);
            const vehicles = await response.json();

            console.log(`✅ ${vehicles.length} Fahrzeuge empfangen.`);

            // Filtere nach erlaubten Fahrzeugtypen
            const filteredVehicles = vehicles.filter(v => VEHICLE_TYPE_IDS.includes(v.vehicle_type));

            console.log(`✅ ${filteredVehicles.length} Fahrzeuge nach Typ gefiltert.`);

            // Sortiere nach der Reihenfolge der VEHICLE_TYPE_IDS
            const sortedVehicles = filteredVehicles.sort((a, b) => {
                return VEHICLE_TYPE_IDS.indexOf(a.vehicle_type) - VEHICLE_TYPE_IDS.indexOf(b.vehicle_type);
            });

            console.log(`✅ Fahrzeuge nach Fahrzeugtypen sortiert.`);
            return sortedVehicles;
        } catch (error) {
            console.error("❌ Fehler beim Abrufen der Fahrzeuge:", error);
            return [];
        }
    }

    // 🚀 5. Funktion zum Sortieren der Sprechwünsche nach den Fahrzeugtypen (basierend auf vehicle_type_id)
    function sortSprechwünsche() {
        try {
            console.info('🔵 [INFO] Sortierfunktion wurde aufgerufen.');

            const listContainer = document.querySelector('#radio_messages_important'); // Der Container für Sprechwünsche
            if (!listContainer) {
                console.error('🔴 [ERROR] Sprechwunsch-Container (#radio_messages_important) nicht gefunden.');
                return;
            }

            console.log('🟢 [SUCCESS] Sprechwunsch-Container gefunden:', listContainer);
            const items = Array.from(listContainer.children); // Alle <li>-Elemente in der Liste
            console.log('🔍 [DEBUG] Vor der Sortierung:', items.map(item => getVehicleIdAndTypeFromElement(item)));

            // Sortiere die Sprechwünsche nach der Reihenfolge der vehicle_type_id (basierend auf VEHICLE_TYPE_IDS)
            items.sort((a, b) => {
                const aVehicleType = getVehicleTypeFromElement(a);
                const bVehicleType = getVehicleTypeFromElement(b);

                // Bestimme die Priorität der Fahrzeugtypen in VEHICLE_TYPE_IDS
                const aPriority = VEHICLE_TYPE_IDS.indexOf(aVehicleType);
                const bPriority = VEHICLE_TYPE_IDS.indexOf(bVehicleType);

                //console.log(`🔍 [DEBUG] Fahrzeug a: Type ${aVehicleType}, Priority ${aPriority}`);
                //console.log(`🔍 [DEBUG] Fahrzeug b: Type ${bVehicleType}, Priority ${bPriority}`);

                // Falls ein Fahrzeugtyp nicht in der Liste ist, schiebt es ans Ende
                const aSortedPriority = aPriority === -1 ? Infinity : aPriority;
                const bSortedPriority = bPriority === -1 ? Infinity : bPriority;

                return aSortedPriority - bSortedPriority;
            });

            console.log('🔍 [DEBUG] Nach der Sortierung:', items.map(item => getVehicleIdFromElement(item)));

            // Die sortierten Elemente wieder in die Liste einfügen
            items.forEach(item => listContainer.appendChild(item));

            console.info('🟢 [SUCCESS] Sprechwünsche wurden erfolgreich sortiert.');

            // Speichern der Fahrzeug-IDs im sessionStorage, basierend auf der Sortierung
            const vehicleIds = items.map(item => getVehicleIdFromElement(item)); // Extrahiert nur die Fahrzeug-IDs
            sessionStorage.setItem('sortedVehicleIds', JSON.stringify(vehicleIds)); // Speichern der IDs
            sessionStorage.setItem('isSorted', 'true'); // Markierung setzen, dass die Liste sortiert wurde
            console.log('🔵 [INFO] Fahrzeug-IDs im sessionStorage gespeichert:', vehicleIds);

        } catch (error) {
            console.error('🔴 [ERROR] Fehler beim Sortieren der Sprechwünsche:', error);
        }
    }

    // Funktion zum Abrufen der Fahrzeug-ID und des Fahrzeugtyps aus einem Listenelement
    function getVehicleIdAndTypeFromElement(item) {
        const vehicleClass = item.className;
        const match = vehicleClass.match(/radio_message_vehicle_(\d+)/);
        const vehicleId = match ? parseInt(match[1], 10) : null;
        const vehicleType = parseInt(item.getAttribute('data-vehicle-type'), 10);
        return { vehicleId, vehicleType };
    }

    // Funktion zum Abrufen der Fahrzeug-ID aus einem Listenelement
    function getVehicleIdFromElement(item) {
        const vehicleClass = item.className;
        const match = vehicleClass.match(/radio_message_vehicle_(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    // Funktion zum Abrufen des Fahrzeugtyps aus einem Listenelement
    function getVehicleTypeFromElement(item) {
        return parseInt(item.getAttribute('data-vehicle-type'), 10);
    }

    // 🚀 6. "SW Bearbeiten"-Button in #radio_panel_heading direkt neben FUNK setzen
    function createSWBearbeitenButton() {
        console.log("📌 Suche nach Bereich mit class='flex-grow-1'...");

        const funkDiv = document.querySelector("#radio_panel_heading .flex-grow-1");
        if (!funkDiv) {
            console.warn("⚠ Bereich mit class='flex-grow-1' nicht gefunden!");
            return;
        }

        // Falls der Button schon existiert, nicht erneut hinzufügen
        if (document.querySelector("#sw-bearbeiten")) {
            console.log("ℹ 'SW Bearbeiten'-Button existiert bereits.");
            return;
        }

        console.log("✅ Bereich gefunden! Füge Button hinzu...");

        const button = document.createElement("button");
        button.innerText = "SW Bearbeiten";
        button.id = "sw-bearbeiten";
        button.classList.add("btn", "btn-xs", "btn-primary"); // Bootstrap-Klassen hinzufügen

        // Styling: Button direkt neben "FUNK"
        funkDiv.appendChild(button);

        button.addEventListener("click", sortSprechwünsche);

        console.log("ℹ Button 'SW Bearbeiten' hinzugefügt.");
    }

    // Stelle sicher, dass der Button erstellt wird, wenn das Skript gestartet wird
    createSWBearbeitenButton();

    // 🚀 7. Event Listener für den Klick auf einen Sprechwunsch-Button
    function handleSWListClick(event) {
        // Überprüfen, ob das angeklickte Element ein Fahrzeug-Element ist
        const listItem = event.target.closest('li[class^="radio_message_vehicle_"]');
        if (!listItem) return; // Verhindert Fehler, wenn kein Fahrzeug angeklickt wurde

        // Extrahiere die Fahrzeug-ID aus der Klasse des li-Elements (class="radio_message_vehicle_<ID>")
        const vehicleId = getVehicleIdFromClass(listItem.className);

        // Hole die Fahrzeug-IDs aus dem sessionStorage
        let vehicleIds = JSON.parse(sessionStorage.getItem('sortedVehicleIds')) || [];

        console.log(`🔵 [INFO] Fahrzeug-ID zu entfernen: ${vehicleId}`);
        console.log(`🔵 [INFO] Vorherige Fahrzeug-IDs im sessionStorage: ${JSON.stringify(vehicleIds)}`);

        // Überprüfen, ob die Fahrzeug-ID im sessionStorage vorhanden ist
        const vehicleIdIndex = vehicleIds.indexOf(vehicleId);
        if (vehicleIdIndex === -1) {
            console.warn(`🔴 [WARNUNG] Fahrzeug-ID ${vehicleId} nicht im sessionStorage gefunden!`);
            return;
        }

        // Entferne die Fahrzeug-ID aus der Liste
        vehicleIds.splice(vehicleIdIndex, 1);

        // Speichern der neuen Fahrzeug-IDs im sessionStorage
        sessionStorage.setItem('sortedVehicleIds', JSON.stringify(vehicleIds));

        // Debugging-Ausgabe
        console.log(`🔴 Fahrzeug-ID ${vehicleId} aus dem sessionStorage entfernt.`);
        console.log(`🔵 [INFO] Fahrzeug-IDs nach Entfernung: ${JSON.stringify(vehicleIds)}`);

        // Nach Entfernen der ID: Liste neu sortieren
        sortSprechwünsche();

        // Entferne das Listenelement (Fahrzeug) aus der Anzeige
        listItem.remove();
    }

    // Funktion zum Extrahieren der Fahrzeug-ID aus der Klasse (class="radio_message_vehicle_<ID>")
    function getVehicleIdFromClass(className) {
        const match = className.match(/radio_message_vehicle_(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    // 🚀 Initialisierung und Event Listener hinzufügen
    document.addEventListener('click', handleSWListClick);

    // 🚀 8. Funktion zum Ändern des href des "next-vehicle-fms-5"-Buttons
    let isProcessingStopped = false; // Flag, um zu verhindern, dass der Prozess weitergeht
    let hasLoggedStopMessage = false; // Neue Variable

    function updateNextVehicleButton() {
        // Verhindern, dass der Vorgang erneut startet
        if (isProcessingStopped) {
            if (!hasLoggedStopMessage) { // Nur beim ersten Mal loggen
                console.log("🔴 [INFO] Der Vorgang wurde bereits gestoppt. Keine weiteren Fahrzeuge werden bearbeitet.");
                hasLoggedStopMessage = true; // Danach keine Logs mehr
            }
            return;
        }

        // Überprüfe, ob eine Sortierung durchgeführt wurde
        const isSorted = sessionStorage.getItem('isSorted') === 'true';
        if (!isSorted) {
            console.log("🔴 [INFO] Keine Sortierung durchgeführt. Button wird nicht überschrieben.");
            return; // Wenn keine Sortierung durchgeführt wurde, abbrechen
        }

        // Lese die Fahrzeug-IDs aus dem sessionStorage und stelle sicher, dass sie korrekt geladen werden
        let vehicleIds = JSON.parse(sessionStorage.getItem('sortedVehicleIds')) || [];
        if (vehicleIds.length === 0) {
            console.warn("🔴 Keine Fahrzeug-IDs zum Abarbeiten vorhanden.");
            return;
        }
        console.log("🔵 [INFO] Fahrzeug-IDs im sessionStorage geladen:", vehicleIds);

        if (vehicleIds.length > 0) {
            const nextVehicleId = vehicleIds[0]; // Nimm das erste Fahrzeug in der Liste
            const nextVehicleButton = document.getElementById("next-vehicle-fms-5");

            if (!nextVehicleButton) {
                console.warn("🔴 Button 'next-vehicle-fms-5' nicht gefunden.");
                return;
            }

            const currentHref = nextVehicleButton.href;
            const currentVehicleId = currentHref ? extractVehicleIdFromHref(currentHref) : null;

            if (currentVehicleId !== nextVehicleId) {
                console.log(`🔵 [INFO] Der Button zeigt derzeit auf Fahrzeug ${currentVehicleId}. Nächste Fahrzeug-ID: ${nextVehicleId}`);

                // Setze den Button auf das nächste Fahrzeug
                nextVehicleButton.href = `/vehicles/${nextVehicleId}`;
                console.log(`🔵 [INFO] Der 'next-vehicle-fms-5' Button wurde auf Fahrzeug ${nextVehicleId} gesetzt.`);

                // Entferne das bearbeitete Fahrzeug aus der Liste
                vehicleIds.shift(); // Entferne das erste Fahrzeug

                // Speichere die aktualisierte Liste der Fahrzeug-IDs im sessionStorage
                sessionStorage.setItem('sortedVehicleIds', JSON.stringify(vehicleIds));

                // Setze das Flag, um den Prozess zu stoppen
                isProcessingStopped = true;
                hasLoggedStopMessage = false; // Reset für den nächsten Start

                console.log("🟢 Alle Fahrzeuge abgearbeitet.");
                return;
            } else {
                console.log(`🔵 [INFO] Der Button zeigt bereits auf Fahrzeug ${nextVehicleId}. Keine Änderungen notwendig.`);
            }
        }
    }

    // Diese Funktion extrahiert die Fahrzeug-ID aus dem href des Buttons
    function extractVehicleIdFromHref(href) {
        const match = href.match(/\/vehicles\/(\d+)/);
        return match ? match[1] : null;
    }

    // 🚀 9. MutationObserver zum Überwachen des Buttons "next-vehicle-fms-5"
    function observeNextVehicleButton() {
        const observer = new MutationObserver(() => {
            const nextVehicleButton = document.getElementById("next-vehicle-fms-5");
            if (nextVehicleButton) {
                // Wenn der Button erscheint, rufe die Funktion zum Aktualisieren des href auf
                updateNextVehicleButton();
            }
        });

        // Beobachte Änderungen im DOM, um den Button zu erkennen, sobald er erscheint
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 🚀 10. Funktion zum Initialisieren der Beobachtung
    function init() {
        // Starte die Beobachtung, wenn das Skript ausgeführt wird
        observeNextVehicleButton();
    }

    // 🚀 Start des Skripts
    init();

    document.querySelector("#radio_panel_body").addEventListener("click", function (event) {
        const link = event.target.closest('a[href^="/vehicles/"]');
        if (!link) return; // Falls kein gültiger Link geklickt wurde, abbrechen

        console.log("✅ Fahrzeug-Link erkannt:", link.href);

        const match = link.href.match(/\/vehicles\/(\d+)/);
        if (!match) return; // Falls keine ID extrahiert werden kann, abbrechen

        const vehicleId = parseInt(match[1], 10);
        console.log(`🚗 Fahrzeug-ID extrahiert: ${vehicleId}`);

        // 🚀 Fahrzeug-ID aus SessionStorage entfernen
        let vehicleIds = JSON.parse(sessionStorage.getItem('sortedVehicleIds')) || [];
        console.log("📂 Geladene Fahrzeug-IDs:", vehicleIds);

        const index = vehicleIds.indexOf(vehicleId);
        if (index !== -1) {
            vehicleIds.splice(index, 1);
            sessionStorage.setItem('sortedVehicleIds', JSON.stringify(vehicleIds));
            console.log(`🗑 Fahrzeug ${vehicleId} entfernt! Neue Liste:`, vehicleIds);
        } else {
            console.warn(`⚠ Fahrzeug-ID ${vehicleId} nicht in der Liste.`);
        }

    });

})();
