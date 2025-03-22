// ==UserScript==
// @name         [LSS] Einsatzkategorienfilter
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Filtert die Einsatzliste nach Kategorien
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        GM.setValue
// @grant        GM.getValue
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// ==/UserScript==

(function () {
    'use strict';

    const apiUrl = "https://v3.lss-manager.de/modules/lss-missionHelper/missions/de_DE.json";
    const settingsApiUrl = "https://www.leitstellenspiel.de/api/settings"; // API zum Abrufen der Einstellungen
    const storageKey = "lssMissionsData";
    const storageTimestampKey = "lssMissionsDataTimestamp";
    const updateInterval = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden

    let missions = {};
    let categories = new Set();
    let missionCategoryMap = new Map();
    let isDarkMode = false; // Standardwert: Helles Design
    let activeCategoryButton = null; // Referenz auf den aktiven Button
    let activeFilters = []; // Globale Variable zur Speicherung der aktiven Filter


    // Mapping der Kategorien zu den benutzerdefinierten Beschriftungen
    const customCategoryLabels = {
        'fire': 'Feuerwehr',
        'police': 'Polizei',
        'ambulance': 'Rettungsdienst',
        'thw': 'Technisches Hilfswerk',
        'criminal_investigation': 'Kripo',
        'riot_police': 'Bereitschaftspolizei',
        'water_rescue': 'Wasserrettung',
        'mountain': 'Bergrettung',
        'coastal': 'Seenotrettung',
        'airport': 'Flughafeneinsätze',
        'airport_specialization': 'Speziallisierte Flughafeneinsätze',
        'factory_fire_brigade': 'Werkfeuerwehr',
        'seg': 'SEG-Einsätze',
        'seg_medical_service': 'SEG-Sanitätsdiensteinsätze',
        'energy_supply': 'NEA 50',
        'energy_supply_2': 'NEA 200',
    };

    const categoryGroups = {
        "FF": ['fire'],
        "POL": ['police'],
        "RD": ['ambulance'],
        "THW": ['thw'],
        "Be-Pol": ['criminal_investigation', 'riot_police'],
        "WR": ['water_rescue'],
        "BR": ['mountain'],
        "SNR": ['coastal'],
        "FHF": ['airport', 'airport_specialization'],
        "WF": ['factory_fire_brigade'],
        "SEG": ['seg', 'seg_medical_service'],
        "Stromausfälle": ['energy_supply', 'energy_supply_2'],
    };

    // Funktion zum Überprüfen, ob eine Kategorie in einer der Gruppen enthalten ist
    function isCategoryInAnyGroup(category) {
        return Object.values(categoryGroups).some(group => group.includes(category));
    }

    function observeMissionLists() {
        const missionListIds = [
            "mission_list",
            "mission_list_krankentransporte",
            "mission_list_alliance",
            "mission_list_sicherheitswache_alliance",
            "mission_list_alliance_event",
            "mission_list_sicherheitswache"
        ];

        missionListIds.forEach(id => {
            const missionList = document.getElementById(id);
            if (!missionList) {
                console.error(`Einsatzliste ${id} nicht gefunden!`);
                return;
            }

            const observer = new MutationObserver(mutations => {
                let updated = false;

                mutations.forEach(mutation => {
                    // Wenn neue Einsätze hinzugefügt werden
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.classList.contains("missionSideBarEntry")) {
                            updateSingleMissionVisibility(node);
                            updated = true; // Markiert eine Änderung
                        }
                    });

                    // Wenn Einsätze entfernt werden
                    mutation.removedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.classList.contains("missionSideBarEntry")) {
                            updated = true; // Markiert eine Änderung
                        }
                    });
                });

                // Nur wenn sich etwas geändert hat, aktualisieren wir den Verdienst
                if (updated) {
                    updateAverageEarnings();
                }
            });

            observer.observe(missionList, { childList: true });
        });
    }

    // Funktion um neue Einsätze Ihrer Kategorie zu zuordnen und ein- oder auszublenden
    function updateSingleMissionVisibility(missionElement) {
        if (activeFilters.length === 0) {
            missionElement.style.display = "";
            return;
        }

        const missionId = missionElement.getAttribute("mission_type_id");
        if (!missionId || !missionCategoryMap.has(missionId)) {
            missionElement.style.display = "none";
            return;
        }

        const missionCategories = missionCategoryMap.get(missionId);
        const match = activeFilters.some(category => missionCategories.includes(category));

        missionElement.style.display = match ? "" : "none";
    }

    // Aufruf der Funktion, um die Überwachung zu starten
    observeMissionLists();

    // Globale Variable zur Speicherung der Missionsdaten inklusive der durchschnittlichen Credits
    let missionData = {};

    async function loadMissionData() {
        const now = Date.now();
        const storedTimestamp = await GM.getValue(storageTimestampKey, 0);
        const isDataExpired = now - storedTimestamp > updateInterval;

        if (!isDataExpired) {
            missions = JSON.parse(await GM.getValue(storageKey, "{}"));
        } else {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error("Fehler beim Abrufen der API:", response.statusText);
                return;
            }
            missions = await response.json();
            await GM.setValue(storageKey, JSON.stringify(missions));
            await GM.setValue(storageTimestampKey, now);
        }

        missionData = {}; // Leeres Objekt für die Missionen

        // Durchlaufe alle Missionen und lade die Daten in missionData
        for (const mission of Object.values(missions)) {
            const baseMissionId = mission.base_mission_id;
            const additiveOverlays = mission.additive_overlays;

            // Falls die Mission eine Basis-Mission hat, speichere den Verdienst
            if (baseMissionId) {
                const baseCredits = mission.average_credits || 0;
                if (!missionData[baseMissionId]) {
                    missionData[baseMissionId] = {
                        base_credits: baseCredits,
                        overlays: {}
                    };
                }

                // Wenn Additive Overlays vorhanden sind, speichere den Verdienst für jedes Overlay
                if (additiveOverlays) {
                    missionData[baseMissionId].overlays[additiveOverlays] = mission.average_credits || 0;
                }
            }

            if (mission.mission_categories && Array.isArray(mission.mission_categories)) {
                mission.mission_categories.forEach(category => categories.add(category));
            }

            missionCategoryMap.set(mission.id, mission.mission_categories || []);
        }

        await loadSettings();
        createCategoryButtons(); // Jetzt, wo die Daten geladen wurden, können die Buttons erstellt werden
    }

    // Funktion um den Modus (Dark/White) abzurufen
    async function loadSettings() {
        try {
            const response = await fetch(settingsApiUrl);
            const settings = await response.json();

            if (settings && settings.design_mode !== undefined) {
                const designMode = settings.design_mode;
                isDarkMode = (designMode === 1 || designMode === 4);
            } else {
                console.error("Die erwartete Struktur wurde in der API-Antwort nicht gefunden.");
            }
        } catch (error) {
            console.error("Fehler beim Abrufen der Einstellungen:", error);
        }
    }

    const customTooltips = {
        'fire': 'Zeigt alle Einsätze der Feuerwehr',
        'police': 'Zeigt alle Einsätze der Polizei',
        'ambulance': 'Zeigt alle Einsätze des Rettungsdienstes',
        'thw': 'Zeigt alle Einsätze des THW',
        'riot_police': 'Zeigt alle Einsätze der Bereitschaftspolizei',
        'water_rescue': 'Zeigt alle Einsätze der Wasserrettung',
        'mountain': 'Zeigt alle Einsätze der Bergwacht',
        'coastal': 'Zeigt alle Einsätze der Küstenschutz-Einheit',
        'airport': 'Zeigt alle Einsätze am Flughafen',
        'factory_fire_brigade': 'Zeigt alle Einsätze der Werksfeuerwehr',
        'criminal_investigation': 'Zeigt alle Einsätze der Kriminalpolizei',
        'seg_medical_service': 'Zeigt alle Einsätze des Sanitäts- und Rettungsdienstes',
        'seg': 'Zeigt alle Einsätze der Schnelleinsatzgruppe',
    };

    // Funktion um die Button zu aktuallisieren
    function updateMissionCount() {
        const summary = getMissionSummary(); // Neue Zählung abrufen
        const categoryButtons = document.querySelectorAll('.category-button');

        categoryButtons.forEach(button => {
            const category = button.getAttribute('data-category');
            const countDisplay = button.querySelector('.mission-count');

            if (countDisplay) {
                countDisplay.textContent = summary[category] || 0; // Falls keine Einsätze, dann 0 setzen
            }
        });

        // Extra-Handling für VGSL/ÜO (falls nötig)
        const vgsloButton = document.querySelector('.category-button[data-category="VGSL/ÜO"]');
        if (vgsloButton) {
            const countDisplay = vgsloButton.querySelector('.mission-count');
            if (countDisplay) {
                countDisplay.textContent = summary["VGSL/ÜO"] || 0;
            }
        }
    }

    // Alle 20 Sekunden Zählung aktualisieren + Buttons updaten
    setInterval(updateMissionCount, 5000);

    // Funktion zur Berechnung der Anzahl der Einsätze für eine bestimmte Kategorie
    function getMissionCountByCategory(category) {
        const summary = getMissionSummary(); // Holt die bereits berechneten Werte
        return summary[category] || 0; // Falls die Kategorie nicht existiert, wird 0 zurückgegeben
    }

    // Funktion zur Berechnung der Anzahl der Einsätze für eine Kategoriegruppe
    function getMissionCountByCategoryGroup(categoriesGroup) {
        const summary = getMissionSummary();
        let count = 0;

        categoriesGroup.forEach(category => {
            count += summary[category] || 0; // Addiere die Werte aller Kategorien in der Gruppe
        });

        return count;
    }

    // Funktion um die Einsätze zu zählen
    function getMissionSummary() {
        let summary = {};

        const missionElements = document.querySelectorAll('.missionSideBarEntry:not(.mission_deleted)');

        missionElements.forEach(element => {
            const missionId = element.getAttribute('mission_type_id');
            let categories = missionCategoryMap.get(missionId) || ['no-category']; // Standardwert "no-category"

            // Überprüfen, ob die Mission-ID zu den speziellen IDs gehört, die der VGSL/ÜO zugeordnet werden sollen
            const specialIds = [41, 43, 59, 75, 99, 207, 221, 222, 256, 350];
            if (specialIds.includes(parseInt(missionId))) {
                categories = ['no-category']; // Ersetze alle Kategorien mit VGSL/ÜO für diese speziellen IDs
            }

            categories.forEach(category => {
                summary[category] = (summary[category] || 0) + 1;
            });
        });

        // Berechnung für Gruppen
        for (const [groupName, groupCategories] of Object.entries(categoryGroups)) {
            summary[groupName] = groupCategories.reduce((sum, category) => sum + (summary[category] || 0), 0);
        }
        return summary;
    }
    // Alle 20 Sekunden die Zusammenfassung neu berechnen
    setInterval(getMissionSummary, 5000);

    let categoryButtonsMap = new Map(); // Speichert die Buttons zur späteren Aktualisierung

    // Funktion um die Einsätze zu laden, aktuallisieren
    async function fetchMissionData() {
        try {
            const response = await fetch("https://v3.lss-manager.de/modules/lss-missionHelper/missions/de_DE.json");
            const missions = await response.json();
            return missions.reduce((acc, mission) => {
                acc[mission.id] = mission.average_credits || 0;
                return acc;
            }, {});
        } catch (error) {
            console.error("Fehler beim Abrufen der Missionen:", error);
            return {};
        }
    }

    // Funktion um die Buttons zu erstellen
    async function createCategoryButtons() {
        const searchInput = document.getElementById('search_input_field_missions');
        if (!searchInput) {
            console.error("Suchfeld nicht gefunden!");
            return;
        }

        const missionData = await fetchMissionData();

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexWrap = 'wrap';
        buttonContainer.style.marginBottom = '10px';

        const summary = getMissionSummary();

        const desiredOrder = [
            'fire', 'police', 'ambulance', 'thw', 'riot_police', 'water_rescue',
            'mountain', 'coastal', 'airport', 'factory_fire_brigade', 'criminal_investigation', 'seg', 'seg_medical_service'
        ];

        desiredOrder.forEach(category => {
            if (categories.has(category) && !isCategoryInAnyGroup(category)) {
                const button = document.createElement('button');
                button.textContent = `${customCategoryLabels[category] || category} (${summary[category] || 0})`;
                button.classList.add('btn', 'btn-xs');
                button.style.margin = '2px';
                styleButtonForCurrentTheme(button);

                button.title = customTooltips[category] || `Zeigt Einsätze der Kategorie ${customCategoryLabels[category] || category}`;

                button.addEventListener('click', () => {
                    filterMissionListByCategory(category);
                    storeVisibleMissions();
                    setActiveButton(button);
                    updateAverageEarnings();
                });

                buttonContainer.appendChild(button);
                categoryButtonsMap.set(category, button);
            }
        });

        // Gruppenbuttons hinzufügen
        for (const [groupName, groupCategories] of Object.entries(categoryGroups)) {
            const groupButton = document.createElement('button');
            groupButton.textContent = `${groupName} (${summary[groupName] || 0})`;
            groupButton.classList.add('btn', 'btn-xs');
            groupButton.style.margin = '2px';
            styleButtonForCurrentTheme(groupButton);

            groupButton.title = generateGroupTooltip(groupCategories);

            groupButton.addEventListener('click', () => {
                filterMissionListByCategoryGroup(groupCategories);
                storeVisibleMissions();
                setActiveButton(groupButton);
                updateAverageEarnings();
            });

            buttonContainer.appendChild(groupButton);
            categoryButtonsMap.set(groupName, groupButton);
        }

        // Button für VGSL/ÜO (Einsätze ohne Kategorie)
        const unoButton = document.createElement('button');
        unoButton.textContent = `VGSL/ÜO (${summary['no-category'] || 0})`;
        unoButton.classList.add('btn', 'btn-xs');
        unoButton.style.margin = '2px';
        styleButtonForCurrentTheme(unoButton);

        unoButton.title = customTooltips['VGSL/ÜO'] || "Zeigt Verbandsgroßschadenslagen und Übergabeorte an";

        unoButton.addEventListener('click', () => {
            filterMissionListWithoutCategory();
            storeVisibleMissions();
            setActiveButton(unoButton);
            updateAverageEarnings();
        });

        buttonContainer.appendChild(unoButton);
        categoryButtonsMap.set('VGSL/ÜO', unoButton);

        // "Alle anzeigen" Button
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Alle anzeigen';
        resetButton.classList.add('btn', 'btn-xs', 'btn-primary');
        resetButton.style.margin = '2px';

        resetButton.title = customTooltips['reset'] || "Alle Einsätze anzeigen";

        resetButton.addEventListener('click', () => {
            resetMissionList();
            resetActiveButton();
            storeVisibleMissions();
            updateAverageEarnings();
        });

        buttonContainer.appendChild(resetButton);
        searchInput.parentNode.insertBefore(buttonContainer, searchInput);

        // Durchschnittsverdienst-Anzeige erstellen
        const earningsContainer = document.createElement('div');
        earningsContainer.id = 'average_earnings_display';
        earningsContainer.style.marginTop = '10px';
        buttonContainer.appendChild(earningsContainer);

        updateAverageEarnings();
    }

    // Zwischenspeicher für aktive Einsätze
    let activeMissions = new Set();

    // Funktion zur Berechnung des Verdienstes
    function updateAverageEarnings() {

        const missionElements = document.querySelectorAll('.missionSideBarEntry:not(.mission_deleted)'); // Filtere gelöschte Einsätze
        let totalCredits = 0;
        let currentMissions = new Set(); // Neue Liste aktiver Einsätze

        missionElements.forEach(element => {
            if (element.style.display !== 'none') { // Nur sichtbare Einsätze zählen
                const missionId = element.getAttribute('mission_type_id');
                const additiveOverlay = element.getAttribute('data-additive-overlays');

                if (missionId && missionData[missionId]) {
                    let baseCredits = missionData[missionId].base_credits;
                    let credits = 0; // Standardwert setzen

                    // Falls base_credits existiert, setzen, sonst 0
                    if (baseCredits !== null && baseCredits !== undefined) {
                        credits = baseCredits;
                    }

                    // Falls ein Overlay existiert, verwende dessen Credits
                    if (additiveOverlay && missionData[missionId].overlays[additiveOverlay]) {
                        credits = missionData[missionId].overlays[additiveOverlay];
                    }

                    // Falls base_credits NULL ODER 0 ist, 250 Credits addieren
                    if (baseCredits === null || baseCredits === 0) {
                        credits += 250;
                    }
                    totalCredits += credits;
                    currentMissions.add(missionId);
                } else {
                }
            }
        });

        // Prüfen, welche Einsätze entfernt wurden und sie aus `activeMissions` entfernen
        activeMissions.forEach(missionId => {
            if (!currentMissions.has(missionId)) {
                activeMissions.delete(missionId);
            }
        });

        // Aktualisiere die gespeicherten aktiven Einsätze
        activeMissions = currentMissions;

        // Berechneten Verdienst anzeigen
        const earningsContainer = document.getElementById('average_earnings_display');
        if (earningsContainer) {
            earningsContainer.textContent = `Aktueller Verdienst: ${totalCredits.toLocaleString()} Credits`;
        }
    }


    // Funktion um die Kategoriebuttons zu aktuallisieren
    function updateCategoryButtons() {
        const summary = getMissionSummary(); // Holt die aktuelle Zählung

        categoryButtonsMap.forEach((button, category) => {
            if (categoryGroups[category]) {
                // Gruppen-Buttons aktualisieren
                button.textContent = `${category} (${summary[category] || 0})`;
            } else {
                // Einzelne Kategorie-Buttons aktualisieren
                button.textContent = `${customCategoryLabels[category] || category} (${summary[category] || 0})`;
            }
        });

        // Speziell für den VGSL/ÜO-Button
        if (categoryButtonsMap.has('VGSL/ÜO')) {
            const unoButton = categoryButtonsMap.get('VGSL/ÜO');
            unoButton.textContent = `VGSL/ÜO (${summary['no-category'] || 0})`;
        }
    }

    // Interval für die Updates
    setInterval(() => {
        updateMissionCount();
        updateCategoryButtons();
    }, 5000);

    // Funktion für die Tooltips der Buttons
    function generateGroupTooltip(groupCategories) {
        const categoryLabels = groupCategories.map(category => customCategoryLabels[category] || category);
        const tooltipText = `Zeigt alle Einsätze der Kategorien: ${categoryLabels.join(', ')}`;
        return tooltipText;
    }

    // Funktion um die Buttonfarbe dem Dark- oder White-Modus anzupassen
    function styleButtonForCurrentTheme(button) {
        if (isDarkMode) {
            button.style.backgroundColor = '#333';
            button.style.color = '#fff';
            button.style.border = '1px solid #555';
        } else {
            button.style.backgroundColor = '#fff';
            button.style.color = '#333';
            button.style.border = '1px solid #ccc';
        }
    }

    // Funktion um die sichtbaren Einsätze in den Session Storage zu speichern
    function storeVisibleMissions() {
        const visibleMissions = [];
        document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
            if (mission.style.display !== 'none') {
                const missionId = mission.id.split('_')[1];
                visibleMissions.push(missionId);
            }
        });
        // Lösche vorherige Speicherung im Session Storage
        sessionStorage.removeItem('visibleMissions');

        // Speichere neue sichtbare Einsätze
        sessionStorage.setItem('visibleMissions', JSON.stringify(visibleMissions));

        // Ausgabe des gespeicherten Wertes aus dem Session Store
        const storedMissions = sessionStorage.getItem('visibleMissions');
        console.log("Gespeicherte Einsätze im Session Store:", JSON.parse(storedMissions));
    }

    // Funktion um die Einsätze zu filtern und im Session Storage zu speichern
    function filterMissionListByCategory(category) {

        const specialMissionIds = [41, 43, 59, 75, 99, 207, 221, 222, 256, 350]; // Spezielle Einsatz-IDs

        const missionElements = document.querySelectorAll('.missionSideBarEntry');
        missionElements.forEach(element => {
            const missionId = element.getAttribute('mission_type_id');
            if (missionCategoryMap.has(missionId)) {
                const categories = missionCategoryMap.get(missionId);
                if (categories.includes(category) && !specialMissionIds.includes(parseInt(missionId))) {
                    element.style.display = '';
                } else {
                    element.style.display = 'none';
                }
            }
        });
    }

    // Funktion um Einsätze nach der Gruppenkategorie zu filtern und im Session Storage zu speichern
    function filterMissionListByCategoryGroup(categoriesGroup) {

        const specialMissionIds = [41, 43, 59, 75, 99, 207, 221, 222, 256, 350]; // Spezielle Einsatz-IDs

        const missionElements = document.querySelectorAll('.missionSideBarEntry');
        missionElements.forEach(element => {
            const missionId = element.getAttribute('mission_type_id');
            if (missionCategoryMap.has(missionId)) {
                const missionCategories = missionCategoryMap.get(missionId);
                const match = categoriesGroup.some(category => missionCategories.includes(category));

                if (match && !specialMissionIds.includes(parseInt(missionId))) {
                    element.style.display = '';
                } else {
                    element.style.display = 'none';
                }
            }
        });
    }

    // Funktion um Einsätze ohne Kategorie anzuzeigen
    function filterMissionListWithoutCategory() {

        const specialMissionIds = [41, 43, 59, 75, 99, 207, 221, 222, 256, 350]; // Spezielle Einsatz-IDs

        const missionElements = document.querySelectorAll('.missionSideBarEntry');
        missionElements.forEach(element => {
            const missionId = element.getAttribute('mission_type_id');
            if (missionCategoryMap.has(missionId)) {
                const categories = missionCategoryMap.get(missionId);
                if (categories.length === 0 || specialMissionIds.includes(parseInt(missionId))) {
                    element.style.display = '';
                } else {
                    element.style.display = 'none';
                }
            } else {
                element.style.display = '';
            }
        });
    }

    // Funktion um neue Einsätze direkt zu filtern
    function updateMissionVisibility() {
        document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
            let missionId = mission.getAttribute('mission_type_id');
            let missionType = mission.getAttribute('data-mission-type-filter');
            let missionState = mission.getAttribute('data-mission-state-filter');
            let missionParticipation = mission.getAttribute('data-mission-participation-filter');

            let categories = missionCategoryMap.get(missionId) || [];
            let isVisible = activeFilters.includes(missionType) ||
                activeFilters.includes(missionState) ||
                activeFilters.includes(missionParticipation) ||
                categories.some(category => activeFilters.includes(category));

            mission.style.display = isVisible ? "" : "none";
        });
    }

    // Funktion um die neuen Einsätze direkte der Kategorie zuzuordnen
    function filterMissionListByCategory(category) {

        activeFilters = [category]; // Setzt den aktiven Filter
        updateMissionVisibility();

    }

    // Funktion um die neuen Einsätze direkte der Gruppe zuzuordnen
    function filterMissionListByCategoryGroup(categoriesGroup) {

        activeFilters = categoriesGroup; // Setzt die aktiven Filter für mehrere Kategorien
        updateMissionVisibility();

    }

    // Funktion um alle Einsätze wieder anzuzeigen
    function resetMissionList() {

        activeFilters = []; // Löscht die aktiven Filter

        // Zeigt alle Einsätze an
        document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
            mission.style.display = ""; // Setzt `display` auf Standard zurück
        });
    }

    // Funktion um den aktiven Button visuell hervorzuheben
    function setActiveButton(button) {
        if (activeCategoryButton) {
            styleButtonForCurrentTheme(activeCategoryButton);
        }

        button.style.backgroundColor = '#28a745';
        button.style.color = '#fff';
        activeCategoryButton = button;
    }

    // Funktion um die visuelle Makierung zu entfernen
    function resetActiveButton() {
        if (activeCategoryButton) {
            styleButtonForCurrentTheme(activeCategoryButton);
        }
        activeCategoryButton = null;
    }

    // Funktion zum Entfernen einer bestimmten Mission-ID aus dem SessionStorage
    function removeMissionFromSessionStorage(missionId) {
        // Hole die gespeicherten sichtbaren Einsätze aus dem SessionStorage
        let visibleMissions = JSON.parse(sessionStorage.getItem('visibleMissions'));

        // Prüfe, ob sichtbare Einsätze vorhanden sind
        if (visibleMissions && Array.isArray(visibleMissions)) {
            // Filtere die ID, die entfernt werden soll
            visibleMissions = visibleMissions.filter(id => id !== missionId.toString());

            // Speichere das aktualisierte Array wieder im SessionStorage
            sessionStorage.setItem('visibleMissions', JSON.stringify(visibleMissions));
            console.log(`Mission ID ${missionId} wurde aus dem SessionStorage entfernt.`);

            // Gib die neue Liste der sichtbaren Einsätze aus, um sicherzustellen, dass die ID entfernt wurde
            console.log("Aktualisierte Liste der sichtbaren Einsätze:", visibleMissions);
        }
    }

    // Füge Event-Listener für die "Alarm"-Buttons hinzu
    const alarmButtons = document.querySelectorAll('[id^="alarm_button_"]'); // Selektiert alle Buttons, deren ID mit "alarm_button_" beginnt

    alarmButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Extrahiere die Mission-ID aus der Button-ID (z. B. alarm_button_3765332903 -> 3765332903)
            const missionId = button.id.split('_')[2];  // Die Mission-ID befindet sich nach "alarm_button_"

            // Entferne die ID aus dem SessionStorage
            removeMissionFromSessionStorage(missionId);
        });
    });

    function debugAlertNextButtonInIframe() {
        let alertNextButtonCount = 0;
        let missionNextButtonCount = 0;
        let alertNextAllianceButtonCount = 0;

        const visibleMissions = JSON.parse(sessionStorage.getItem('visibleMissions')) || [];

        if (visibleMissions.length === 0) {
            return false;
        }

        const nextMissionID = visibleMissions[0];

        const iframes = document.querySelectorAll('[id^="lightbox_iframe_"]');

        for (let iframe of iframes) {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

            if (!iframeDocument) {
                console.log(`❌ Kein Zugriff auf das iFrame-Dokument von ${iframe.id}!`);
                continue;
            }

            const buttons = [

                { selector: '.alert_next', name: '"Alarmieren und weiter"-Button' },
                { selector: '#mission_next_mission_btn', name: '"Mission Next"-Button' },
                { selector: '.btn.btn-success.btn-sm.alert_next_alliance.hidden-xs', name: '"Alert Next Alliance"-Button' },
            ];

            const dispatchButtons = iframeDocument.querySelector('#dispatch_buttons');
            if (dispatchButtons) {
                buttons.push({ selector: '#dispatch_buttons .alert_next', name: '"Alarmieren und weiter"-Button im Dispatch-Bereich' });
            }

            for (let btn of buttons) {
                let buttonList = iframeDocument.querySelectorAll(btn.selector);
                if (buttonList.length > 0) {
                    buttonList.forEach(button => {
                        if (button.hasAttribute("data-href-updated")) {
                            return;
                        }

                        console.log(`✅ ${btn.name} im iFrame ${iframe.id} gefunden!`);

                        let oldHref = button.getAttribute("href");
                        let newHref = `/missions/${nextMissionID}?ifp=st&sd=a&sk=cr`;
                        button.setAttribute("href", newHref);
                        button.setAttribute("data-href-updated", "true");
                        button.classList.remove("btn-success");
                        button.classList.add("btn-primary"); // Ändert die Farbe auf Blau
                    });
                }
            }
        }
    }

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.id.startsWith('lightbox_iframe_')) {
                        console.log(`🟢 Neuer iFrame mit id ${node.id} erkannt! Überprüfe Buttons...`);

                        let attempts = 0;
                        const maxAttempts = 5;

                        const intervalId = setInterval(() => {
                            const success = debugAlertNextButtonInIframe();

                            if (success || attempts >= maxAttempts) {
                                clearInterval(intervalId);
                                if (success) {
                                    console.log(`✅ Button-Update im iFrame ${node.id} erfolgreich.`);
                                } else {
                                    console.warn(`⚠️ Button-Update im iFrame ${node.id} nicht gefunden nach ${maxAttempts} Versuchen.`);
                                }
                            }
                            attempts++;
                        }, 1000);
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log("🔍 Debugging-Observer für iFrame-Alarmmaske gestartet.");


    // Funktion zum Abrufen der nächsten Mission ID
    function getNextMissionID() {
        let nextMissionID = sessionStorage.getItem('nextMissionID');

        // Wenn keine Mission ID gespeichert ist, setze eine Standard-ID oder eine Logik zum Abrufen der nächsten ID
        if (!nextMissionID) {
            nextMissionID = "defaultMissionID"; // Beispielwert
        }

        return nextMissionID;
    }

    // Funktion zum Entfernen des aktuellen iFrames und Setzen der nächsten Mission
    function removeIframeAndSetNextMission() {
        const iframes = document.querySelectorAll('[id^="lightbox_iframe_"]');
        const lastIframe = iframes[iframes.length - 1]; // Nimm den zuletzt hinzugefügten iFrame

        if (lastIframe) {
            lastIframe.remove(); // Entferne den iFrame
            //        console.log(`🟢 iFrame mit id ${lastIframe.id} entfernt!`);

            // Hole die nächste Mission ID
            const nextMissionID = getNextMissionID();
            sessionStorage.setItem('nextMissionID', nextMissionID); // Setze die nächste Mission ID im SessionStorage
            //        console.log(`🔄 Nächste Mission ID im SessionStorage gesetzt: ${nextMissionID}`);
        }
    }

    //    console.log("Starte das Script...");
    loadMissionData();
})();
