// ==UserScript==
// @name         [LSS] Sprechwunsch Sortierer
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Sortiert Sprechwünsche (Status 5) nach Fahrzeugtypen
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // IDs der Fahrzeuge nach Priorität
    const PRIORITY_ORDER = [31, 28, 25]; // RTH, RTW, FuStW

    // Flag für Button-Hinzufügung
    let buttonAdded = false;

    // Funktion zum Sortieren der Sprechwünsche
    function sortSprechwünsche() {
        try {
            const listContainer = document.querySelector('#radio_messages_important');
            if (!listContainer) {
                return;
            }

            // Sprechwünsche sammeln und sortieren
            const items = Array.from(listContainer.children);
            items.sort((a, b) => {
                const aVehicleId = getVehicleIdFromElement(a);
                const bVehicleId = getVehicleIdFromElement(b);

                // Priorität nach den IDs bestimmen
                const aPriority = PRIORITY_ORDER.indexOf(aVehicleId);
                const bPriority = PRIORITY_ORDER.indexOf(bVehicleId);

                // Unbekannte Fahrzeuge ans Ende
                return (aPriority === -1 ? Infinity : aPriority) - (bPriority === -1 ? Infinity : bPriority);
            });

            // Sortierte Elemente zurück in den Container einfügen
            items.forEach(item => listContainer.appendChild(item));
        } catch (error) {
            console.error('Fehler in der Sortierfunktion:', error);
        }
    }

    // Extrahiert die Fahrzeug-ID aus einem Sprechwunsch-Element
    function getVehicleIdFromElement(element) {
        try {
            // Fahrzeug-ID aus dem data-vehicle-type Attribut extrahieren
            const vehicleId = element.getAttribute('data-vehicle-type');
            if (!vehicleId) {
                return -1;
            }
            return parseInt(vehicleId, 10);
        } catch (error) {
            console.error('Fehler beim Extrahieren der Fahrzeug-ID:', error);
            return -1;
        }
    }

    // Button zum Sortieren hinzufügen
    function addButton() {
        if (buttonAdded) return; // Verhindert mehrfaches Hinzufügen des Buttons

        try {
            // Prüfen, ob der Fenstermodus aktiv ist
            const isFenstermodus = document.querySelector('#iframe-inside-container');

            if (isFenstermodus) {
                const fensterMenu = document.querySelector('.map_position_mover');
                if (!fensterMenu) {
                    return;
                }

                const button = document.createElement('button');
                button.textContent = 'Sprechwünsche sortieren';
                button.className = 'btn btn-xs btn-primary';
                button.style.margin = '0 5px';
                button.style.cursor = 'pointer';

                button.addEventListener('click', sortSprechwünsche);
                fensterMenu.appendChild(button);
            } else {
                // Standardmodus: Regelmäßig nach dem Container suchen
                const interval = setInterval(() => {
                    const menu = document.querySelector('#radio_panel_heading');
                    if (menu) {
                        const button = document.createElement('button');
                        button.textContent = 'Sprechwünsche sortieren';
                        button.className = 'btn btn-xs btn-primary';
                        button.style.margin = '0 5px';
                        button.style.cursor = 'pointer';

                        button.addEventListener('click', sortSprechwünsche);
                        menu.appendChild(button);

                        clearInterval(interval); // Stoppe das Intervall nach erfolgreichem Hinzufügen des Buttons
                        buttonAdded = true; // Markiere, dass der Button hinzugefügt wurde
                    }
                }, 500); // Versuche alle 500 ms, den Container zu finden
            }
        } catch (error) {
            console.error('Fehler beim Hinzufügen des Buttons:', error);
        }
    }

    // Initialisierung
    function init() {
        try {
            addButton();
        } catch (error) {
            console.error('Fehler bei der Initialisierung:', error);
        }
    }

    // Warten, bis die Seite vollständig geladen ist
    document.addEventListener('DOMContentLoaded', () => {
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
        try {
            if (attempts <= maxAttempts) {
                init();
            } else {
                observer.disconnect(); // Deaktiviert den Observer nach maxAttempts
            }
        } catch (error) {
            console.error('Fehler beim erneuten Ausführen des Skripts:', error);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
