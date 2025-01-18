// ==UserScript==
// @name         Fahrzeuge löschen
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Löscht alle Fahrzeuge einer Wache
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Funktion, um den aktuellen Modus (Dark oder Light) zu erkennen
    function getMode() {
        return document.body.classList.contains('dark') ? 'dark' : 'light';
    }

    // Funktion, um das Overlay zu erstellen
    function createOverlay() {
        const mode = getMode();

        // Overlay Container erstellen
        const overlay = document.createElement('div');
        overlay.id = 'delete-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '10px';
        overlay.style.right = '10px';
        overlay.style.zIndex = '9999';
        overlay.style.backgroundColor = mode === 'dark' ? '#333' : '#fff';
        overlay.style.color = mode === 'dark' ? '#fff' : '#000';
        overlay.style.padding = '15px';
        overlay.style.borderRadius = '8px';
        overlay.style.boxShadow = '0px 4px 10px rgba(0, 0, 0, 0.2)';
        overlay.style.maxWidth = '300px';
        overlay.style.fontFamily = 'Arial, sans-serif';
        overlay.style.fontSize = '14px';

        // Titel für das Overlay
        const title = document.createElement('div');
        title.textContent = 'Fahrzeuge werden gelöscht';
        title.style.fontWeight = 'bold';
        overlay.appendChild(title);

        // Progressbar Container erstellen
        const progressContainer = document.createElement('div');
        progressContainer.style.height = '20px';
        progressContainer.style.backgroundColor = mode === 'dark' ? '#444' : '#f5f5f5';
        progressContainer.style.borderRadius = '5px';
        progressContainer.style.marginTop = '10px';

        // Progressbar erstellen
        const progressBar = document.createElement('div');
        progressBar.id = 'delete-progress-bar';
        progressBar.style.height = '100%';
        progressBar.style.width = '0%'; // Anfangswert 0%
        progressBar.style.backgroundColor = mode === 'dark' ? '#5bc0de' : '#d9534f';
        progressBar.style.borderRadius = '5px';
        progressContainer.appendChild(progressBar);
        overlay.appendChild(progressContainer);

        // Fahrzeuganzahl Anzeige
        const vehicleCount = document.createElement('div');
        vehicleCount.id = 'delete-count';
        vehicleCount.style.marginTop = '10px';
        vehicleCount.textContent = 'Gelöschte Fahrzeuge: 0 von 0';
        overlay.appendChild(vehicleCount);

        // Overlay an den Body anhängen
        document.body.appendChild(overlay);

        return { progressBar, vehicleCount, overlay };
    }

    // Funktion, um den Status eines Fahrzeugs über die API zu überprüfen (Status2)
    async function checkVehicleStatus(vehicleId) {
        const apiUrl = `https://www.leitstellenspiel.de/api/vehicles/${vehicleId}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error('Fehler beim Abrufen der Fahrzeugdaten');
            }

            const data = await response.json();
            const status = data.fms_real; // Status des Fahrzeugs

            // Überprüfen, ob der Fahrzeugstatus "Status2" ist (Wert: 2)
            return status === 2;
        } catch (error) {
            console.error(`Fehler beim Abrufen des Fahrzeugstatus: ${error}`);
            return false; // Im Fehlerfall kein Löschen durchführen
        }
    }

    // Funktion, um alle Fahrzeuge einer Wache zu löschen
    async function deleteAllVehiclesForBuilding() {
        const vehicleList = document.querySelector('#vehicle_table tbody'); // Tabelle mit Fahrzeugen
        if (!vehicleList) {
            alert("Keine Fahrzeugliste gefunden!");
            return;
        }

        const vehicleLinks = Array.from(vehicleList.querySelectorAll('a[href^="/vehicles/"]'))
            .filter(link => link.href.match(/^https:\/\/www\.leitstellenspiel\.de\/vehicles\/\d+$/));

        const vehicleUrls = vehicleLinks.map(link => link.href);

        console.log(`Gefundene Fahrzeuge: ${vehicleUrls.length}`);
        if (vehicleUrls.length === 0) {
            alert("Keine Fahrzeuge gefunden!");
            return;
        }

        const { progressBar, vehicleCount, overlay } = createOverlay(); // Overlay erstellen
        let deletedCount = 0;

        for (const url of vehicleUrls) {
            const vehicleId = url.split('/').pop(); // Fahrzeug-ID extrahieren
            console.log(`Fahrzeug-Seite aufrufen: ${url}`);

            // Status des Fahrzeugs über die API überprüfen
            const canDelete = await checkVehicleStatus(vehicleId);
            if (!canDelete) {
                console.log(`Fahrzeug im falschen Status oder Fehler: ${url}, überspringe.`);
                continue; // Überspringen, wenn das Fahrzeug nicht im Status2 ist
            }

            // Fahrzeug löschen
            await fetch(url)
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    const deleteButton = doc.querySelector('a[data-method="delete"]');
                    if (deleteButton) {
                        console.log(`Lösche Fahrzeug: ${url}`);
                        return fetch(deleteButton.href, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            body: '_method=delete'
                        });
                    } else {
                        console.error(`Kein Lösch-Button auf der Seite gefunden: ${url}`);
                    }
                })
                .catch(error => {
                    console.error(`Fehler beim Löschen des Fahrzeugs: ${error}`);
                });

            // Update der Progressbar und Fahrzeuganzahl
            deletedCount++;
            const progress = (deletedCount / vehicleUrls.length) * 100;
            progressBar.style.width = `${progress}%`; // Fortschritt der Progressbar aktualisieren
            vehicleCount.textContent = `Gelöschte Fahrzeuge: ${deletedCount} von ${vehicleUrls.length}`; // Fahrzeuganzahl aktualisieren

            await new Promise(resolve => setTimeout(resolve, 2000)); // Verzögerung zwischen den Löschvorgängen
        }

        alert("Alle Fahrzeuge wurden gelöscht!");
        document.body.removeChild(overlay); // Overlay nach Abschluss entfernen

        // Seite neu laden
        location.reload(); // Seite neu laden
    }

    // Funktion zum Erstellen des "Alle Fahrzeuge löschen"-Buttons
    function addDeleteButtonToBuildingTitle() {
        const mode = getMode();
        const buildingTitle = document.querySelector('.building-title'); // Titel der Wache finden

        if (buildingTitle && !buildingTitle.querySelector('.delete-all-vehicles-btn')) {
            // Button erstellen
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Alle Fahrzeuge löschen';
            deleteButton.classList.add('delete-all-vehicles-btn');
            deleteButton.style.marginLeft = '10px';
            deleteButton.style.backgroundColor = mode === 'dark' ? '#d9534f' : '#5bc0de'; // Rote für Dark Mode, blaue für Light Mode
            deleteButton.style.color = 'white'; // Weißer Text
            deleteButton.style.border = 'none'; // Kein Rand
            deleteButton.style.padding = '8px 12px'; // Abstand
            deleteButton.style.borderRadius = '4px'; // Abgerundete Ecken
            deleteButton.style.cursor = 'pointer'; // Zeiger beim Hover
            deleteButton.style.fontWeight = 'bold'; // Fettgedruckter Text

            // Hover-Effekt
            deleteButton.addEventListener('mouseover', () => {
                deleteButton.style.backgroundColor = mode === 'dark' ? '#c9302c' : '#c9302c'; // Etwas dunkler bei Hover
            });
            deleteButton.addEventListener('mouseout', () => {
                deleteButton.style.backgroundColor = mode === 'dark' ? '#d9534f' : '#5bc0de'; // Zurück zur ursprünglichen Farbe
            });

            // Klick-Event für den Button hinzufügen
            deleteButton.addEventListener('click', () => {
                if (confirm("Möchtest du wirklich alle Fahrzeuge löschen?")) {
                    deleteAllVehiclesForBuilding();
                }
            });

            // Button an den Titel anhängen
            buildingTitle.appendChild(deleteButton);
        }
    }

    // Beobachter für dynamische Änderungen im DOM
    const observer = new MutationObserver(addDeleteButtonToBuildingTitle);
    observer.observe(document.body, { childList: true, subtree: true });

    // Initialer Aufruf beim Laden der Seite
    addDeleteButtonToBuildingTitle();
})();
