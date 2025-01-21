// ==UserScript==
// @name         [LSS] Sprechwunsch Sortierer
// @namespace    https://www.leitstellenspiel.de/
// @version      1.2
// @description  Sortiert Sprechwünsche nach Fahrzeugtypen
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
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

    // Funktion zum Abrufen der Fahrzeugdaten aus dem GM-Speicher
    function getStoredVehicleData() {
        const storedData = GM_getValue('vehicleData', null);
        const timestamp = GM_getValue('vehicleDataTimestamp', 0);
        const currentTime = Date.now();

        // Wenn Daten vorhanden sind und noch nicht älter als 24 Stunden
        if (storedData && (currentTime - timestamp < 24 * 60 * 60 * 1000)) {
            console.info('Fahrzeugdaten aus dem Speicher geladen.');
            return storedData;
        }

        return null;
    }

    // Fahrzeugdaten aus der API laden und im GM-Speicher speichern
    function fetchVehicleData() {
        console.info('Fahrzeugdaten werden aus der API geladen...');

        GM_xmlhttpRequest({
            method: "GET",
            url: 'https://www.leitstellenspiel.de/api/vehicles',
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);

                    vehicleData = data.reduce((acc, vehicle) => {
                        acc[vehicle.id] = vehicle.vehicle_type; // Speichert Fahrzeug-ID und Typ
                        return acc;
                    }, {});

                    // Speichern der Fahrzeugdaten und Timestamp (damit wir sie später aktualisieren können)
                    GM_setValue('vehicleData', vehicleData);
                    GM_setValue('vehicleDataTimestamp', Date.now());

                    console.info('Fahrzeugdaten erfolgreich aus der API geladen und im Speicher gespeichert.');
                } catch (error) {
                    console.error('Fehler beim Verarbeiten der API-Daten:', error);
                }
            },
            onerror: function() {
                console.error('Fehler bei der API-Anfrage');
            }
        });
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

            // Suche das Element, das das Wort "Funk" enthält
            const funkDiv = document.querySelector('.flex-grow-1');

            if (funkDiv) {
                console.info('Funk-Div gefunden:', funkDiv);

                const button = document.createElement('button');
                button.textContent = 'Sprechwünsche sortieren';
                button.className = 'btn btn-xs btn-primary';
                button.style.marginLeft = '10px'; // Etwas Abstand vom Wort "Funk"
                button.style.cursor = 'pointer';

                button.addEventListener('click', async () => {
                    // Abrufen der Fahrzeugdaten aus dem Speicher oder von der API
                    vehicleData = getStoredVehicleData() || {};
                    if (Object.keys(vehicleData).length === 0) {
                        await fetchVehicleData(); // Wenn keine Daten im Speicher, API-Daten holen
                    }
                    sortSprechwünsche(); // Anschließend die Sprechwünsche sortieren
                });

                // Button nach dem "Funk"-Div einfügen
                funkDiv.appendChild(button);
                buttonAdded = true;
                console.info('Button wurde neben dem "Funk"-Element hinzugefügt.');
            } else {
                console.error('Kein "Funk"-Element gefunden.');
            }
        } catch (error) {
            console.error('Fehler beim Hinzufügen des Buttons:', error);
        }
    }

    // Initialisierung
    async function init() {
        try {
            console.info('Skript initialisiert.');
            addButton(); // Button hinzufügen ohne API-Daten
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
