// ==UserScript==
// @name         FMS Manager
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Fügt in der Lightbox einen Button zur Statusänderung bei Fahrzeugen dieser Leitstellen ein.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @grant        GM.xmlHttpRequest
// @connect      leitstellenspiel.de
// @connect      api.lss-manager.de
// ==/UserScript==

(function() {
    'use strict';

    // Verhindert die Ausführung im Hauptfenster, nur im iFrame aktiv
    initFmsButtonWatcher();

    function initFmsButtonWatcher() {
        console.log("📡 Initialisiere FMS-Button-Überwachung …");

        // Direkt prüfen nach dem Laden
        window.addEventListener('load', function () {
            console.log("🌐 Seite vollständig geladen.");
            tryInsertButton();
        });

        // MutationObserver als Fallback
        const observer = new MutationObserver(() => {
            tryInsertButton();
        });

        observer.observe(document.body, { childList: true, subtree: true });

        function tryInsertButton() {
            const titleEl = document.querySelector('.building-title h1[building_type="7"]');
            if (titleEl && !document.getElementById('fms-btn')) {
                console.log("🎯 building-title gefunden und Button wird eingefügt.");
                insertFmsButton(titleEl);
            }
        }
    }

    // Fügt den "Fahrzeugstatus setzen"-Button hinzu
    function insertFmsButton(titleEl) {
        const setStatusBtn = document.createElement('button');
        setStatusBtn.id = 'fms-btn';
        setStatusBtn.innerText = '🚓 Fahrzeugstatus setzen';
        // Styling und Farbwahl je nach Dark-/Light-Mode
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setStatusBtn.style = `
            margin-left: 10px;
            padding: 4px 8px;
            cursor: pointer;
            border: 1px solid #888;
            border-radius: 6px;
            font-size: 0.9em;
            background: ${isDarkMode ? '#333' : '#f0f0f0'};
            color: ${isDarkMode ? '#fff' : '#000'};
        `;

        // Beim Klick werden Fahrzeuge geladen
        setStatusBtn.addEventListener('click', () => {
            loadVehiclesFromTable();
        });

        titleEl.appendChild(setStatusBtn);
    }

    // Liest die Fahrzeuge aus der Tabelle in der Leitstelle aus
    function loadVehiclesFromTable() {
        const vehicleTable = document.querySelector('#tab_vehicle #vehicle_table tbody');
        if (!vehicleTable) {
            alert('❌ Keine Fahrzeuge in der Tabelle gefunden!');
            return;
        }

        const vehicles = [];
        const rows = vehicleTable.querySelectorAll('tr');

        // Extrahiert ID, Name und Typ der Fahrzeuge aus der Tabelle
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 1) {
                const linkElement = cells[1].querySelector('a[id^="vehicle_link_"]');
                const vehicleIdMatch = linkElement?.id.match(/vehicle_link_(\d+)/);
                const vehicleId = vehicleIdMatch ? vehicleIdMatch[1] : null;
                const vehicleName = linkElement ? linkElement.textContent.trim() : 'Unbekannt';
                const vehicleImg = row.querySelector('img[vehicle_type_id]');
                const vehicleTypeId = vehicleImg?.getAttribute('vehicle_type_id');

                if (vehicleId) {
                    vehicles.push({ id: vehicleId, name: vehicleName, type: vehicleTypeId });
                } else {
                    console.warn(`⚠️ Fahrzeug ohne gültige ID übersprungen: ${vehicleName}`);
                }
            }
        });

        // Weiter mit API-Abruf, wenn Fahrzeuge gefunden wurden
        if (vehicles.length > 0) {
            fetchVehicleTypeNames(vehicles);
        } else {
            alert('❌ Keine Fahrzeuge in der Tabelle gefunden.');
        }
    }

    // Ruft die Fahrzeugtypen von der API ab und gruppiert die Fahrzeuge nach Typ
    function fetchVehicleTypeNames(vehicles) {
        GM.xmlHttpRequest({
            method: "GET",
            url: "https://api.lss-manager.de/de_DE/vehicles",
            onload: function(response) {
                if (response.status === 200) {
                    const vehicleTypes = JSON.parse(response.responseText);
                    const typeIdToName = {};
                    for (const [id, data] of Object.entries(vehicleTypes)) {
                        typeIdToName[id] = data.caption;
                    }

                    const vehiclesByType = {};
                    vehicles.forEach(vehicle => {
                        const typeName = typeIdToName[vehicle.type] || 'Unbekannt';
                        vehiclesByType[typeName] = vehiclesByType[typeName] || [];
                        vehiclesByType[typeName].push(vehicle);
                    });

                    showVehicleSelector(vehiclesByType);
                } else {
                    alert("❌ Fehler beim Abrufen der Fahrzeugtypen.");
                }
            },
            onerror: function(err) {
                console.error("❌ Fehler beim Abrufen der Fahrzeugtypen:", err);
                alert("❌ Fehler beim Abrufen der Fahrzeugtypen.");
            }
        });
    }

    // Zeigt die Lightbox mit Auswahl von Typ und Status
    function showVehicleSelector(vehiclesByType) {
        const lightbox = document.createElement('div');
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        // Styling
        Object.assign(lightbox.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px',
            border: '1px solid #888',
            borderRadius: '8px',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
            zIndex: '9999',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            background: isDarkMode ? '#2c2c2c' : '#fff',
            color: isDarkMode ? '#fff' : '#000'
        });

        // Gemeinsames Styling für Buttons/Selects
        const baseStyle = {
            width: '220px',
            padding: '8px 12px',
            fontSize: '0.95em',
            border: '1px solid #888',
            borderRadius: '6px',
            cursor: 'pointer',
            background: isDarkMode ? '#444' : '#e0e0e0',
            color: isDarkMode ? '#fff' : '#000'
        };

        // Titel
        const title = document.createElement('h3');
        title.innerText = 'Fahrzeugstatus setzen';
        title.style.marginBottom = '10px';
        lightbox.appendChild(title);

        // Dropdown zur Auswahl des Fahrzeugtyps
        const vehicleTypeSelect = document.createElement('select');
        Object.assign(vehicleTypeSelect.style, baseStyle);
        const allOption = document.createElement('option');
        allOption.value = '__ALL__';
        allOption.innerText = `Alle Fahrzeuge (${Object.values(vehiclesByType).flat().length})`;
        vehicleTypeSelect.appendChild(allOption);
        for (const typeName in vehiclesByType) {
            const option = document.createElement('option');
            option.value = typeName;
            option.innerText = `${typeName} (${vehiclesByType[typeName].length})`;
            vehicleTypeSelect.appendChild(option);
        }

        // Dropdown zur Auswahl des Status (z. B. S2 oder S6)
        const statusSelect = document.createElement('select');
        Object.assign(statusSelect.style, baseStyle);
        [2, 6].forEach(statusNum => {
            const option = document.createElement('option');
            option.value = statusNum;
            option.innerText = `S${statusNum}`;
            statusSelect.appendChild(option);
        });

        // Fortschrittsanzeige
        const progressText = document.createElement('div');
        progressText.style.fontSize = '0.9em';
        const progressBar = document.createElement('div');
        Object.assign(progressBar.style, {
            width: '100%',
            height: '10px',
            background: isDarkMode ? '#555' : '#ccc',
            borderRadius: '5px',
            overflow: 'hidden'
        });
        const progressFill = document.createElement('div');
        Object.assign(progressFill.style, {
            height: '100%',
            width: '0%',
            background: isDarkMode ? '#4caf50' : '#2e7d32'
        });
        progressBar.appendChild(progressFill);

        // Buttons
        const buttonWrapper = document.createElement('div');
        buttonWrapper.style.display = 'flex';
        buttonWrapper.style.gap = '10px';

        const setButton = document.createElement('button');
        setButton.innerText = 'Status setzen';
        Object.assign(setButton.style, baseStyle, {
            background: isDarkMode ? '#2e7d32' : '#4caf50',
            color: '#fff'
        });

        const cancelButton = document.createElement('button');
        cancelButton.innerText = 'Abbrechen';
        cancelButton.disabled = true;
        Object.assign(cancelButton.style, baseStyle, {
            background: '#d32f2f',
            color: '#fff',
            border: '1px solid #b71c1c'
        });

        const closeButton = document.createElement('button');
        closeButton.innerText = 'Schließen';
        Object.assign(closeButton.style, baseStyle, {
            background: isDarkMode ? '#1976d2' : '#2196f3',
            color: '#fff',
            border: '1px solid #1565c0'
        });

        // Event-Handler zum Schließen
        closeButton.addEventListener('click', () => {
            document.body.removeChild(lightbox);
        });

        let cancelRequested = false;

        // Event-Handler zum Starten des Status-Änderns
        setButton.addEventListener('click', () => {
            const selectedType = vehicleTypeSelect.value;
            const status = statusSelect.value;
            let vehicles = selectedType === '__ALL__'
            ? Object.values(vehiclesByType).flat()
            : vehiclesByType[selectedType] || [];

            if (vehicles.length === 0) {
                alert(`❌ Keine Fahrzeuge gefunden.`);
                return;
            }

            let successCount = 0;
            let errorCount = 0;
            let currentIndex = 0;
            const total = vehicles.length;
            cancelRequested = false;
            cancelButton.disabled = false;
            closeButton.disabled = true;

            // Fortschritt aktualisieren
            function updateProgress() {
                const percent = Math.round((currentIndex / total) * 100);
                progressFill.style.width = percent + '%';
                progressText.innerText = `🔄 ${currentIndex}/${total} verarbeitet ...`;
            }

            // Nächstes Fahrzeug verarbeiten
            function processNext() {
                if (cancelRequested) {
                    progressText.innerText = `⛔ Vorgang abgebrochen: ${successCount} erfolgreich, ❌ ${errorCount} Fehler.`;
                    cancelButton.disabled = true;
                    closeButton.disabled = false;
                    return;
                }

                if (currentIndex >= total) {
                    progressText.innerText = `✅ ${successCount} erfolgreich, ❌ ${errorCount} Fehler.`;
                    cancelButton.disabled = true;
                    closeButton.disabled = false;
                    return;
                }

                const vehicle = vehicles[currentIndex];
                setVehicleStatus(vehicle.id, status, () => successCount++, () => errorCount++);
                currentIndex++;
                updateProgress();
                setTimeout(processNext, 1000);
            }

            updateProgress();
            processNext();
        });

        // Event-Handler zum Abbrechen
        cancelButton.addEventListener('click', () => {
            cancelRequested = true;
        });

        // Zusammenbauen der Lightbox
        lightbox.appendChild(vehicleTypeSelect);
        lightbox.appendChild(statusSelect);
        lightbox.appendChild(progressBar);
        lightbox.appendChild(progressText);
        buttonWrapper.appendChild(setButton);
        buttonWrapper.appendChild(cancelButton);
        buttonWrapper.appendChild(closeButton);
        lightbox.appendChild(buttonWrapper);
        document.body.appendChild(lightbox);
    }

    // Sendet die Statusänderung für ein Fahrzeug an den Server
    function setVehicleStatus(vehicleId, status, onSuccess, onError) {
        const url = `https://leitstellenspiel.de/vehicles/${vehicleId}/set_fms/${status}`;
        GM.xmlHttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                if (response.status === 200) {
                    console.log(`✅ Status ${status} für Fahrzeug ${vehicleId} erfolgreich gesetzt.`);
                    onSuccess?.();
                } else {
                    console.error(`❌ Fehler beim Setzen von Status ${status} für Fahrzeug ${vehicleId}: Statuscode ${response.status}`);
                    onError?.();
                }
            },
            onerror: function(err) {
                console.error(`❌ Netzwerkfehler bei Fahrzeug ${vehicleId}:`, err);
                onError?.();
            }
        });
    }

})();
