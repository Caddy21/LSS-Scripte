// ==UserScript==
// @name         [LSS] Fahrzeuge löschen
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Löscht alle Fahrzeuge einer Wache oder gezielt ausgewählte Fahrzeuge
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Funktion, um den aktuellen Modus (Dark oder Light) zu erkennen
    function getMode() {
        return document.body.classList.contains('dark') ? 'dark' : 'light';
    }

    // Funktion, um Checkboxen und Header zur Fahrzeugtabelle hinzuzufügen
    function addCheckboxHeaderAndRows() {
        const vehicleTable = document.querySelector('#vehicle_table'); // Tabelle mit Fahrzeugen
        if (!vehicleTable) return;

        const thead = vehicleTable.querySelector('thead');
        const tbody = vehicleTable.querySelector('tbody');

        // Headerzeile aktualisieren
        if (thead) {
            const headerRow = thead.querySelector('tr');
            if (headerRow && !headerRow.querySelector('.checkbox-header')) {
                const checkboxHeader = document.createElement('th');
                checkboxHeader.textContent = 'Auswählen';
                checkboxHeader.classList.add('checkbox-header');
                headerRow.insertBefore(checkboxHeader, headerRow.firstChild); // Checkbox-Header an erster Stelle hinzufügen
            }
        }

        // Checkboxen zu jeder Zeile hinzufügen
        const vehicleRows = tbody.querySelectorAll('tr'); // Alle Fahrzeugzeilen
        vehicleRows.forEach(row => {
            if (!row.querySelector('.vehicle-checkbox-cell')) {
                const vehicleId = row.querySelector('a[href^="/vehicles/"]')?.href.split('/').pop();
                if (!vehicleId) return;

                // Checkbox-Zelle erstellen
                const checkboxCell = document.createElement('td');
                checkboxCell.classList.add('vehicle-checkbox-cell');

                // Checkbox erstellen
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('vehicle-checkbox-end');
                checkbox.dataset.vehicleId = vehicleId; // Fahrzeug-ID speichern

                checkboxCell.appendChild(checkbox); // Checkbox zur Zelle hinzufügen
                row.insertBefore(checkboxCell, row.firstChild); // Checkbox-Zelle an erster Stelle in der Zeile einfügen
            }
        });
    }

    // Funktion, die nach jeder Änderung der Tabelle ausgeführt wird, um Checkboxen zu sichern
    function ensureCheckboxes() {
        // Überprüfen, ob alle Checkboxen vorhanden sind und ggf. neu hinzufügen
        const vehicleRows = document.querySelectorAll('#vehicle_table tbody tr');
        vehicleRows.forEach(row => {
            if (!row.querySelector('.vehicle-checkbox-cell')) {
                const vehicleId = row.querySelector('a[href^="/vehicles/"]')?.href.split('/').pop();
                if (!vehicleId) return;

                // Checkbox-Zelle erstellen
                const checkboxCell = document.createElement('td');
                checkboxCell.classList.add('vehicle-checkbox-cell');

                // Checkbox erstellen
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('vehicle-checkbox-end');
                checkbox.dataset.vehicleId = vehicleId; // Fahrzeug-ID speichern

                checkboxCell.appendChild(checkbox); // Checkbox zur Zelle hinzufügen
                row.insertBefore(checkboxCell, row.firstChild); // Checkbox-Zelle an erster Stelle in der Zeile einfügen
            }
        });
    }

    // MutationObserver: Überwacht Änderungen an der Tabelle und sorgt dafür, dass Checkboxen immer wieder hinzugefügt werden
    const observer = new MutationObserver(() => {
        ensureCheckboxes(); // Sicherstellen, dass die Checkboxen immer da sind
    });

    // Funktion zum Initialisieren
    function initialize() {
        // Initiale Überprüfung, ob wir auf einer Wache-Seite sind
        const currentUrl = window.location.href;
        if (currentUrl.includes('/buildings/')) {
            // Warten, bis das Fahrzeug-Table geladen ist
            const intervalId = setInterval(() => {
                const vehicleTable = document.querySelector('#vehicle_table');
                if (vehicleTable) {
                    clearInterval(intervalId);
                    addCheckboxHeaderAndRows(); // Checkboxen und Header hinzufügen
                    // Beobachten von DOM-Änderungen an der Tabelle (z.B. durch andere Skripts)
                    observer.observe(vehicleTable, {
                        childList: true, // Änderungen an den Kindern der Tabelle beobachten
                        subtree: true // Änderungen innerhalb der gesamten Tabelle beobachten
                    });
                }
            }, 500); // alle 500 ms nach dem Fahrzeug-Table suchen
        }
    }

    // Skript starten
    initialize();

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

    // Funktion, um Fahrzeuge gezielt basierend auf Checkbox-Auswahl zu löschen
    async function deleteSelectedVehicles() {
        const selectedCheckboxes = Array.from(document.querySelectorAll('.vehicle-checkbox-end:checked'));
        if (selectedCheckboxes.length === 0) {
            alert('Keine Fahrzeuge ausgewählt!');
            return;
        }

        const vehicleIds = selectedCheckboxes.map(checkbox => checkbox.dataset.vehicleId);
        const { progressBar, vehicleCount, overlay } = createOverlay();

        let deletedCount = 0;
        for (const vehicleId of vehicleIds) {
            const vehicleUrl = `https://www.leitstellenspiel.de/vehicles/${vehicleId}`;
            try {
                const response = await fetch(vehicleUrl);
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const deleteButton = doc.querySelector('a[data-method="delete"]');
                if (deleteButton) {
                    await fetch(deleteButton.href, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: '_method=delete'
                    });
                }
            } catch (error) {
                console.error(`Fehler beim Löschen des Fahrzeugs ${vehicleId}:`, error);
            }

            deletedCount++;
            const progress = (deletedCount / vehicleIds.length) * 100;
            progressBar.style.width = `${progress}%`;
            vehicleCount.textContent = `Gelöschte Fahrzeuge: ${deletedCount} von ${vehicleIds.length}`;

            await new Promise(resolve => setTimeout(resolve, 2000)); // Verzögerung zwischen Löschvorgängen
        }

        alert('Ausgewählte Fahrzeuge wurden gelöscht!');
        document.body.removeChild(overlay);
        location.reload();
    }

    // Funktion, um alle Fahrzeuge zu löschen
    async function deleteAllVehicles() {
        const vehicleCheckboxes = document.querySelectorAll('.vehicle-checkbox-end');
        vehicleCheckboxes.forEach(checkbox => checkbox.checked = true);
        deleteSelectedVehicles();
    }

    // Funktion zum Erstellen der Buttons
    function addDeleteButtons() {
        const mode = getMode();
        const buildingTitle = document.querySelector('.building-title'); // Titel der Wache finden

        if (buildingTitle && !buildingTitle.querySelector('.delete-buttons-container')) {
            const container = document.createElement('div');
            container.classList.add('delete-buttons-container');
            container.style.display = 'flex';
            container.style.gap = '10px';

            const deleteAllButton = document.createElement('button');
            deleteAllButton.textContent = 'Alle Fahrzeuge löschen';
            deleteAllButton.style.backgroundColor = mode === 'dark' ? '#d9534f' : '#5bc0de';
            deleteAllButton.style.color = 'white';
            deleteAllButton.style.border = 'none';
            deleteAllButton.style.padding = '8px 12px';
            deleteAllButton.style.borderRadius = '4px';
            deleteAllButton.style.cursor = 'pointer';
            deleteAllButton.style.fontWeight = 'bold';
            deleteAllButton.addEventListener('mouseover', () => {
                deleteAllButton.style.backgroundColor = mode === 'dark' ? '#c9302c' : '#c9302c';
            });
            deleteAllButton.addEventListener('mouseout', () => {
                deleteAllButton.style.backgroundColor = mode === 'dark' ? '#d9534f' : '#5bc0de';
            });
            deleteAllButton.addEventListener('click', () => {
                if (confirm('Möchtest du wirklich alle Fahrzeuge löschen?')) {
                    deleteAllVehicles();
                }
            });

            const deleteSelectedButton = document.createElement('button');
            deleteSelectedButton.textContent = 'Ausgewählte Fahrzeuge löschen';
            deleteSelectedButton.style.backgroundColor = mode === 'dark' ? '#5bc0de' : '#d9534f';
            deleteSelectedButton.style.color = 'white';
            deleteSelectedButton.style.border = 'none';
            deleteSelectedButton.style.padding = '8px 12px';
            deleteSelectedButton.style.borderRadius = '4px';
            deleteSelectedButton.style.cursor = 'pointer';
            deleteSelectedButton.style.fontWeight = 'bold';
            deleteSelectedButton.addEventListener('mouseover', () => {
                deleteSelectedButton.style.backgroundColor = mode === 'dark' ? '#428bca' : '#c9302c';
            });
            deleteSelectedButton.addEventListener('mouseout', () => {
                deleteSelectedButton.style.backgroundColor = mode === 'dark' ? '#5bc0de' : '#d9534f';
            });
            deleteSelectedButton.addEventListener('click', () => {
                if (confirm('Möchtest du die ausgewählten Fahrzeuge löschen?')) {
                    deleteSelectedVehicles();
                }
            });

            // Buttons dem Container hinzufügen
            container.appendChild(deleteAllButton);
            container.appendChild(deleteSelectedButton);

            // Container an den Titel anhängen
            buildingTitle.appendChild(container);
        }
    }

    // Initiale Überprüfung, ob wir auf einer Wache-Seite sind
    const currentUrl = window.location.href;
    if (currentUrl.includes('/buildings/')) {

        // Initialer Aufruf beim Laden der Seite
        addCheckboxHeaderAndRows();

        // Beobachter für dynamische Änderungen im DOM
        const observer = new MutationObserver(() => {
            // Überprüfen, ob Checkboxen noch fehlen und nachträglich hinzufügen, wenn nötig
            addCheckboxHeaderAndRows();
            addDeleteButtons();
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Initiale Aufrufe
        addDeleteButtons();
    } else {
        console.log("Nicht auf einer Wache-Seite.");
    }
})();
