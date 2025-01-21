// ==UserScript==
// @name         [LSS] Sprechwunsch Sortierer
// @namespace    https://www.leitstellenspiel.de/
// @version      1.7
// @description  Sortiert Sprechwünsche (Status 5) nach Fahrzeugtypen aus der API und benutzerdefinierter Reihenfolge
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.info('Tampermonkey-Skript wird geladen...');

    // Benutzerdefinierte Prioritäten (IDs in gewünschter Reihenfolge)
    const PRIORITY_ORDER = [31, 28, 32]; // RTH, RTW, FuStW, dann alle anderen

    // Fahrzeugdaten aus der API
    let vehicleData = {};

    // Flag für Button-Hinzufügung
    let buttonAdded = false;

    // Fahrzeugdaten aus der API laden
    async function fetchVehicleData() {
        try {
            const response = await fetch('https://www.leitstellenspiel.de/api/vehicles');
            if (!response.ok) {
                throw new Error(`API-Fehler: ${response.status}`);
            }

            const data = await response.json();
            vehicleData = data.reduce((acc, vehicle) => {
                acc[vehicle.id] = vehicle.vehicle_type; // Speichert Fahrzeug-ID und Typ
                return acc;
            }, {});

            console.info('Fahrzeugdaten erfolgreich geladen:', vehicleData);
        } catch (error) {
            console.error('Fehler beim Laden der Fahrzeugdaten:', error);
        }
    }

    // Funktion zum Sortieren der Sprechwünsche
    function sortSprechwünsche() {
        try {
            console.info('Sortierfunktion wurde aufgerufen.');
            const listContainer = document.querySelector('#radio_messages_important');
            if (!listContainer) {
                console.error('Sprechwunsch-Container (#radio_messages_important) nicht gefunden.');
                return;
            }

            console.info('Sprechwunsch-Container gefunden:', listContainer);

            // Sprechwünsche sammeln und sortieren
            const items = Array.from(listContainer.children);
            items.sort((a, b) => {
                const aVehicleId = getVehicleIdFromElement(a);
                const bVehicleId = getVehicleIdFromElement(b);

                // Priorität nach den IDs bestimmen
                const aPriority = PRIORITY_ORDER.indexOf(vehicleData[aVehicleId] || -1);
                const bPriority = PRIORITY_ORDER.indexOf(vehicleData[bVehicleId] || -1);

                // Unbekannte Fahrzeuge ans Ende
                return (aPriority === -1 ? Infinity : aPriority) - (bPriority === -1 ? Infinity : bPriority);
            });

            // Sortierte Elemente zurück in den Container einfügen
            items.forEach(item => listContainer.appendChild(item));
            console.info('Sprechwünsche wurden erfolgreich sortiert.');
        } catch (error) {
            console.error('Fehler in der Sortierfunktion:', error);
        }
    }

    // Extrahiert die Fahrzeug-ID aus einem Sprechwunsch-Element
    function getVehicleIdFromElement(element) {
        try {
            // Sucht nach der Fahrzeug-ID im Klassennamen
            const className = element.className;
            const match = className.match(/vehicle_(\d+)/); // Sucht nach "vehicle_" gefolgt von einer Zahl

            if (match) {
                return parseInt(match[1], 10); // Gibt die Fahrzeug-ID zurück
            } else {
                console.warn('Keine Fahrzeug-ID im Klassennamen gefunden:', className);
                return -1;
            }
        } catch (error) {
            console.error('Fehler beim Extrahieren der Fahrzeug-ID:', error);
            return -1;
        }
    }

    // Button zum Sortieren hinzufügen
    function addButton() {
        if (buttonAdded) return; // Verhindert mehrfaches Hinzufügen des Buttons

        try {
            console.info('Versuche, den Button hinzuzufügen...');

            // Prüfen, ob der Fenstermodus aktiv ist
            const isFenstermodus = document.querySelector('#iframe-inside-container');
            console.info('Fenstermodus:', isFenstermodus ? 'Ja' : 'Nein');

            if (isFenstermodus) {
                const fensterMenu = document.querySelector('.map_position_mover');
                if (!fensterMenu) {
                    console.error('Fenstermodus-Menu-Container (.map_position_mover) nicht gefunden.');
                    return;
                }

                console.info('Fenstermodus-Menu-Container gefunden:', fensterMenu);

                const button = document.createElement('button');
                button.textContent = 'Sprechwünsche sortieren';
                button.className = 'btn btn-xs btn-primary';
                button.style.margin = '0 5px';
                button.style.cursor = 'pointer';

                button.addEventListener('click', sortSprechwünsche);
                fensterMenu.appendChild(button);
                console.info('Button wurde im Fenstermodus hinzugefügt.');
            } else {
                // Standardmodus: Regelmäßig nach dem Container suchen
                const interval = setInterval(() => {
                    const menu = document.querySelector('#radio_panel_heading');
                    if (menu) {
                        console.info('Menu-Container (#radio_panel_heading) gefunden:', menu);

                        const button = document.createElement('button');
                        button.textContent = 'Sprechwünsche sortieren';
                        button.className = 'btn btn-xs btn-primary';
                        button.style.margin = '0 5px';
                        button.style.cursor = 'pointer';

                        button.addEventListener('click', sortSprechwünsche);
                        menu.appendChild(button);
                        console.info('Button wurde im Standardmodus hinzugefügt.');

                        clearInterval(interval); // Stoppe das Intervall nach erfolgreichem Hinzufügen des Buttons
                        buttonAdded = true; // Markiere, dass der Button hinzugefügt wurde
                    } else {
                        console.info('Menu-Container #radio_panel_heading noch nicht gefunden. Versuche es erneut...');
                    }
                }, 500); // Versuche alle 500 ms, den Container zu finden
            }
        } catch (error) {
            console.error('Fehler beim Hinzufügen des Buttons:', error);
        }
    }

    // Initialisierung
    async function init() {
        try {
            console.info('Skript initialisiert.');
            await fetchVehicleData(); // Fahrzeugdaten laden
            addButton();
        } catch (error) {
            console.error('Fehler bei der Initialisierung:', error);
        }
    }

    // Warten, bis die Seite vollständig geladen ist
    document.addEventListener('DOMContentLoaded', () => {
        console.info('DOM vollständig geladen, starte Skript.');
        try {
            init();
        } catch (error) {
            console.error('Fehler beim Start des Skripts:', error);
        }
    });

    // Wiederholtes Laden sicherstellen, falls das DOM asynchron manipuliert wird
    let attempts = 0;
    const maxAttempts = 1;

    const observer = new MutationObserver(() => {
        attempts++;
        console.info(`DOM-Änderung erkannt, Versuch #${attempts}`);
        try {
            if (attempts <= maxAttempts) {
                init();
            } else {
                observer.disconnect(); // Deaktiviert den Observer nach maxAttempts
                console.info('MutationObserver deaktiviert nach maximalen Versuchen.');
            }
        } catch (error) {
            console.error('Fehler beim erneuten Ausführen des Skripts:', error);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
