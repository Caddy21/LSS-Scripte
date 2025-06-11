
// ==UserScript==
// @name         [LSS] Einsatzkategorienfilter
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Filtert die Einsatzliste nach Kategorien
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        GM.setValue
// @grant        GM.getValue
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// ==/UserScript==

(function () {
    'use strict';

    const defaultCategoryGroups = {
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
    }; // Beschriftung und Zusammenstellung der Gruppen -> Hier könnt Ihr euch die Button beschriften und die Gruppen zuordnen
    const defaultEventMissionIds = [
        53, 428, 581, 665, 787, 789, 793, 794, 795, 831, 861, 862, // Winter
        704, 705, 706, 707, 708, // Tag des Europüischen Notrufes
        710, 711, 712, 713, 714, 715, 716, 717, 718, 719, // Karneval / Fasching
        597, 598, 599, 600, 601, 602, 603, 604, 605, 790, 791, 792, 833, 834, 917, 918, 919, 920, // Valentin
        722, 723, 724, 725, 726, 727, 728, 729, 730, //Frühling
        284, 285, 286, 287, 288, 289, 290, 291, 442, 443, 444, 445, 446, 618, 732, 733, 734, 735, 736, 737, 739, 927, 928, 929, // Ostern
        88, 626, 627, 628, 629, 630, 844, 845, 846, // Vatertag
        360, 742, 743, 744, 745, 746, 747, 748, 847, // Muttertag
        183, 184, 185, 461, 546, 547, 548, 646, 647, 648, 754, // Sommer
        672, 673, 674, 675, 676, 677, 678, 679, 680, // Herbst
        111, 112, 113, 114, 115, 116, 117, 118, 119, // Halloween
        52, 54, 55, 56, 129, 130, 202, 203, 582, 583, 584, 585, 586, 587, 588, 589, 590, 783, 784, 785, 786, 901, // Weihnachten
        23, 26, 29, 35, 42, 51, 80, 86, 96, 186, 187, 214, 283, 320, 324, 327, 388, 389, 395, 398, 399, 400, 407, 408, 430, 462, 465, 470, 502, 515, 702, // Rauchmeldertag
        259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 326, 591, 695, // Silvester
        371, 372, 373, 374, 375, 376, 641, 642, 849, 850, 851, 852, // WM / EM
        756, 757, 758, 759, 760, 761, 762, 763, 764, 765, 766, 767, 768, 769, 770, 771, 772, // Jubiläum
        868, 869, 870, 871, 872, 873, 874, 875, 876, 877, 878, // Sportevent

    ]; // IDs der Eventeinsätze
    const specialMissionIds = [41, 43, 59, 75, 99, 207, 221, 222, 256, 350]; // Spezielle Einsatz-IDs (VGSL)
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
        'event': 'Eventeinsätze',
    }; // Mapping der Kategorien zu den benutzerdefinierten Beschriftungen
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
        'energy_supply': 'Zeigt alle Einsätze der NEA50 an',
        'energy_supply_2': 'Zeigt alle Einsätze der NEA200 an',

    }; // Tooltipps der Kategoriebutton
    const missionListIds = [
        "mission_list",
        "mission_list_krankentransporte",
        "mission_list_alliance",
        "mission_list_sicherheitswache_alliance",
        "mission_list_alliance_event",
        "mission_list_sicherheitswache"
    ]; // Globale Variable für die Einsatzlisten
    const allCategories = [
        'fire', 'police', 'ambulance', 'thw', 'criminal_investigation',
        'riot_police', 'water_rescue', 'mountain', 'coastal', 'airport',
        'airport_specialization', 'factory_fire_brigade', 'seg', 'seg_medical_service',
        'energy_supply', 'energy_supply_2',
    ]; // Globale Konstanten für Kategorien & Labels
    const apiUrl = "https://v3.lss-manager.de/modules/lss-missionHelper/missions/de_DE.json"; // API zum Abrufen der Einsätze
    const settingsApiUrl = "https://www.leitstellenspiel.de/api/settings"; // API zum Abrufen der Einstellungen
    const storageKey = "lssMissionsData"; // Globale Konstanze für LocalStore
    const storageTimestampKey = "lssMissionsDataTimestamp"; // Zeitpunkt der letzten Speicherung
    const updateInterval = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden

    let missions = {};
    let categories = new Set();
    let missionCategoryMap = new Map();
    let isDarkMode = false; // Standardwert: Helles Design
    let activeCategoryButton = null; // Referenz auf den aktiven Button
    let activeFilters = []; // Globale Variable zur Speicherung der aktiven Filter
    let missionData = {}; // Globale Variable zur Speicherung der Missionsdaten inklusive der durchschnittlichen Credits
    let categoryButtonsMap = new Map(); // Speichert die Buttons zur späteren Aktualisierung
    let activeMissions = new Set(); // Zwischenspeicher für aktive Einsätze
    let categoryGroups = { ...defaultCategoryGroups };
    let eventMissionIds = [...defaultEventMissionIds];

    // Funktion zum Überprüfen, ob eine Kategorie in einer der Gruppen enthalten ist
    function isCategoryInAnyGroup(category) {
        return Object.values(categoryGroups).some(group => group.includes(category));
    }

    // Funktion um die Missionen zu laden
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

    // Funktion zur Erstellung der Buttons
    async function createCategoryButtons() {

        loadCustomSettings();
        const searchInput = document.getElementById('search_input_field_missions');
        if (!searchInput) {
            console.error("Suchfeld nicht gefunden!");
            return;
        }

        const missionData = await fetchMissionData();
        const summary = getMissionSummary();

        // Alten Container entfernen, wenn vorhanden
        const existingContainer = document.getElementById('categoryButtonContainer');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Neuen Container erstellen
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'categoryButtonContainer';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexWrap = 'wrap';
        buttonContainer.style.marginBottom = '10px';

        const desiredOrder = [
            'fire', 'police', 'ambulance', 'thw', 'riot_police', 'water_rescue', 'mountain', 'coastal', 'airport', 'factory_fire_brigade', 'criminal_investigation', 'seg', 'seg_medical_service', 'energy_supply', 'energy_supply_2', 'event'
        ];

        // Kategorie-Buttons erzeugen
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
                    document.getElementById('standard_earnings_display').style.display = 'inline';
                    document.getElementById('full_earnings_display').style.display = 'none';
                    updateAverageEarnings();
                });

                buttonContainer.appendChild(button);
                categoryButtonsMap.set(category, button);
            }
        });

        // Gruppenbuttons
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
                document.getElementById('standard_earnings_display').style.display = 'inline';
                document.getElementById('full_earnings_display').style.display = 'none';
                updateAverageEarnings();
            });

            buttonContainer.appendChild(groupButton);
            categoryButtonsMap.set(groupName, groupButton);
        }

        // VGSL/ÜO Button
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
            document.getElementById('standard_earnings_display').style.display = 'inline';
            document.getElementById('full_earnings_display').style.display = 'none';
            updateAverageEarnings();
        });

        buttonContainer.appendChild(unoButton);
        categoryButtonsMap.set('VGSL/ÜO', unoButton);

        // Eventeinsätze Button
        const eventButton = document.createElement('button');
        eventButton.textContent = `Eventeinsätze (${summary['event'] || 0})`;
        eventButton.classList.add('btn', 'btn-xs');
        eventButton.style.margin = '2px';
        styleButtonForCurrentTheme(eventButton);
        eventButton.title = customTooltips['event'] || "Zeigt alle Eventeinsätze";

        eventButton.addEventListener('click', () => {
            filterMissionListByEvent();
            storeVisibleMissions();
            setActiveButton(eventButton);
            document.getElementById('standard_earnings_display').style.display = 'inline';
            document.getElementById('full_earnings_display').style.display = 'none';
            updateAverageEarnings();
        });

        buttonContainer.appendChild(eventButton);
        categoryButtonsMap.set('event', eventButton);

        // "Alle anzeigen" Button
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Alle anzeigen';
        resetButton.classList.add('btn', 'btn-xs', 'btn-primary');
        resetButton.style.margin = '2px';
        resetButton.title = customTooltips['reset'] || "Alle Einsätze anzeigen";

        resetButton.addEventListener('click', () => {
            resetMissionList();
            resetActiveButton();
            sessionStorage.removeItem('visibleMissions');
            document.getElementById('standard_earnings_display').style.display = 'none';
            document.getElementById('full_earnings_display').style.display = 'inline';
            updateAverageEarnings();
        });

        buttonContainer.appendChild(resetButton);

        // Button-Container einfügen
        searchInput.parentNode.insertBefore(buttonContainer, searchInput);

        window.categoryButtonReady = true;
        document.dispatchEvent(new Event('categoryButtonReady'));

        // Statistik direkt unter die Buttons schieben, falls sie existiert
        const stats = document.getElementById('average_earnings_display');
        if (stats) {
            buttonContainer.parentNode.insertBefore(stats, buttonContainer.nextSibling);
        }

        // Zahnrad-Einstellungen-Button (hinter "Alle anzeigen"), falls du das hast!
        if (typeof createSettingsButton === "function") {
            const settingsButton = createSettingsButton();
            buttonContainer.appendChild(settingsButton);
        }

        // Verdienstanzeige-Bereich einfügen (optional, wenn du das noch brauchst)
        const earningsContainer = document.createElement('div');
        earningsContainer.id = 'average_earnings_display';
        earningsContainer.style.marginTop = '10px';

        const standardDisplay = document.createElement('div');
        standardDisplay.id = 'standard_earnings_display';
        standardDisplay.style.display = 'none';

        const fullDisplay = document.createElement('div');
        fullDisplay.id = 'full_earnings_display';

        earningsContainer.appendChild(standardDisplay);
        earningsContainer.appendChild(fullDisplay);
        buttonContainer.appendChild(earningsContainer);

        updateAverageEarnings();
    }

    // ----- Bereich für das Userinterface ----- \\

    // Funktion zum Laden der Einstellungen
    function loadCustomSettings() {
        const storedGroups = JSON.parse(localStorage.getItem('customCategoryGroups'));
        const storedEvents = JSON.parse(localStorage.getItem('customEventMissionIds'));

        if (storedGroups) categoryGroups = storedGroups;

        if (Array.isArray(storedEvents)) {
            eventMissionIds = storedEvents.map(id => parseInt(id)).filter(id => !isNaN(id));
        } else {
            eventMissionIds = [...defaultEventMissionIds];
            //console.log("Default-Eventmissionen verwendet:", eventMissionIds);
        }
    }

    // Funktion zum Speichern der Einstellungen
    function saveCustomSettings() {
        const newGroups = {};
        const usedCategories = new Set();

        document.querySelectorAll('#categorySettingsContainer .category-group-row').forEach(row => {
            const name = row.querySelector('.group-name-input').value.trim();
            const selects = row.querySelectorAll('.category-select');
            const categories = [...selects].map(sel => sel.value).filter(Boolean);
            if (name && categories.length) {
                newGroups[name] = categories;
                categories.forEach(cat => usedCategories.add(cat));
            }
        });

        // Kategorien filtern
        for (const [group, cats] of Object.entries(newGroups)) {
            newGroups[group] = cats.filter(cat => usedCategories.has(cat));
        }

        categoryGroups = newGroups;
        localStorage.setItem('customCategoryGroups', JSON.stringify(categoryGroups));

        // Gruppen in UI neu darstellen:
        const container = document.getElementById('categorySettingsContainer');
        if (container) {
            populateGroupSettings(container, categoryGroups, allCategories, customCategoryLabels);
        }

        // Statistik-Bereich sichern (falls vorhanden)
        let stats = document.getElementById('average_earnings_display');
        if (stats && stats.parentNode) {
            stats.parentNode.removeChild(stats);
        }

        // Buttons neu aufbauen
        createCategoryButtons();

        // Statistik-Flag/Event für Script 2 (wichtig, damit Statistik im Notfall neu erstellt wird)
        window.categoryButtonReady = true;
        document.dispatchEvent(new Event('categoryButtonReady'));


    }

    // Funktiom zum erstellen des Einstellungsbutton
    function createSettingsButton() {
        const settingsButton = document.createElement('button');
        settingsButton.innerHTML = '⚙️';
        settingsButton.classList.add('btn', 'btn-xs', 'btn-warning');
        settingsButton.style.margin = '2px';
        settingsButton.title = 'Einstellungen für Gruppen & Events öffnen';

        settingsButton.addEventListener('click', () => {
            let modal = document.getElementById('customSettingsModal');
            if (!modal) {
                createSettingsModal();
                modal = document.getElementById('customSettingsModal');
            }
            modal.style.display = 'flex';
        });

        return settingsButton;
    }

    // Funktion um die Dropdowns zu erstellen
    function createCategoryDropdown(selected, allCategories, labelMap, onRemove) {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';

        const select = document.createElement('select');
        select.className = 'form-select form-select-sm category-select';
        select.style.marginRight = '0';

        const optionDefault = document.createElement('option');
        optionDefault.value = '';
        optionDefault.textContent = 'Kategorie wählen';
        select.appendChild(optionDefault);

        allCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = labelMap[cat] || cat;
            if (cat === selected) option.selected = true;
            select.appendChild(option);
        });

        wrapper.appendChild(select);

        // Einheitlicher Entfernen-Button
        if (typeof onRemove === 'function') {
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '✖';
            removeBtn.className = 'btn btn-xs btn-danger remove-dropdown-btn';
            removeBtn.type = 'button';
            removeBtn.onclick = () => onRemove(wrapper);
            wrapper.appendChild(removeBtn);
        }

        return wrapper;
    }

    // Funktion um die Gruppennamen und Kategorien
    function populateGroupSettings(container, categoryGroups, allCategories, labelMap) {
        container.innerHTML = '';

        Object.entries(categoryGroups).forEach(([groupName, categories]) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'category-group-row flex items-center gap-2';
            groupDiv.style.marginBottom = '10px';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = groupName;
            nameInput.placeholder = 'Gruppenname';
            nameInput.className = 'input input-sm group-name-input';
            groupDiv.appendChild(nameInput);

            categories.forEach(category => {
                const dropdownWrapper = createCategoryDropdown(category, allCategories, labelMap, (wrapper) => {
                    wrapper.remove();
                });
                groupDiv.appendChild(dropdownWrapper);
            });

            // +Kategorie Button
            const addCategoryBtn = document.createElement('button');
            addCategoryBtn.textContent = '+ Kategorie';
            addCategoryBtn.className = 'btn btn-xs btn-info';
            addCategoryBtn.type = 'button';
            addCategoryBtn.onclick = () => {
                const dropdownWrapper = createCategoryDropdown('', allCategories, labelMap, (wrapper) => {
                    wrapper.remove();
                });
                groupDiv.insertBefore(dropdownWrapper, addCategoryBtn);
            };
            groupDiv.appendChild(addCategoryBtn);

            // Gruppe löschen Button
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '✖';
            removeBtn.className = 'btn btn-xs btn-danger remove-group-btn';
            removeBtn.type = 'button';
            removeBtn.onclick = () => groupDiv.remove();
            groupDiv.appendChild(removeBtn);

            container.appendChild(groupDiv);
        });
    }

    // Funktion zur Erstellung des Userinterfaces
    function createSettingsModal() {
        loadCustomSettings();
        if (document.getElementById('customSettingsModal')) return;

        // CSS für Entfernen-Button
        if (!document.getElementById('tm-btn-remove-style')) {
            const style = document.createElement('style');
            style.id = 'tm-btn-remove-style';
            style.textContent = `
            .btn-remove {
                background-color: #dc2626 !important;
                color: white !important;
                border: none !important;
                cursor: pointer !important;
                padding: 0.25rem 0.5rem !important;
                border-radius: 0.25rem !important;
                font-size: 0.75rem !important;
                line-height: 1rem !important;
                height: 1.5rem !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin-left: 10px !important;
            }
        `;
            document.head.appendChild(style);
        }

        if (!document.getElementById('tm-formstyle')) {
            const style = document.createElement('style');
            style.id = 'tm-formstyle';
            style.textContent = `
        .category-group-row .form-select,
        .category-group-row .input-sm,
        .category-group-row input[type="text"] {
            height: 1.85em !important;
            padding: 0 0.5em !important;
            font-size: 0.95em !important;
            border-radius: 0.2em !important;
            min-width: 120px;
        }
        .category-group-row .btn {
            height: 1.85em !important;
            padding: 0 0.7em !important;
            font-size: 0.95em !important;
            border-radius: 0.2em !important;
            display: inline-flex;
            align-items: center;
        }
        .category-group-row > * {
            margin-right: 6px;
        }
    `;
            document.head.appendChild(style);
        }

        const allCategories = [
            'fire', 'police', 'ambulance', 'thw', 'criminal_investigation',
            'riot_police', 'water_rescue', 'mountain', 'coastal', 'airport',
            'airport_specialization', 'factory_fire_brigade', 'seg', 'seg_medical_service',
            'energy_supply', 'energy_supply_2',
        ];

        const customCategoryLabels = {
            'fire': 'Feuerwehr',
            'police': 'Polizei',
            'ambulance': 'Rettungsdienst',
            'thw': 'Technisches Hilfswerk',
            'criminal_investigation': 'Kriminalpolizei',
            'riot_police': 'Bereitschaftspolizei',
            'water_rescue': 'Wasserrettung',
            'mountain': 'Bergrettung',
            'coastal': 'Seenotrettung',
            'airport': 'Flughafeneinsätze',
            'airport_specialization': 'Spezialisierte Flughafeneinsätze',
            'factory_fire_brigade': 'Werkfeuerwehr',
            'seg': 'SEG-Einsätze',
            'seg_medical_service': 'SEG-Sanitätsdienst',
            'energy_supply': 'NEA 50',
            'energy_supply_2': 'NEA 200',
        };

        const eventMissions = {
            "Winter": [53, 428, 581, 665, 787, 789, 793, 794, 795, 831, 861, 862],
            "Tag des Europäischen Notrufes": [704, 705, 706, 707, 708],
            "Karneval / Fasching": [710, 711, 712, 713, 714, 715, 716, 717, 718, 719],
            "Valentin": [597, 598, 599, 600, 601, 602, 603, 604, 605, 790, 791, 792, 833, 834, 917, 918, 919, 920],
            "Frühling": [722, 723, 724, 725, 726, 727, 728, 729, 730],
            "Ostern": [284, 285, 286, 287, 288, 289, 290, 291, 442, 443, 444, 445, 446, 618, 732, 733, 734, 735, 736, 737, 739, 927, 928, 929],
            "Vatertag": [88, 626, 627, 628, 629, 630, 844, 845, 846],
            "Muttertag": [360, 742, 743, 744, 745, 746, 747, 748, 847],
            "Sommer": [183, 184, 185, 461, 546, 547, 548, 646, 647, 648, 754],
            "Herbst": [672, 673, 674, 675, 676, 677, 678, 679, 680],
            "Halloween": [111, 112, 113, 114, 115, 116, 117, 118, 119],
            "Weihnachten": [52, 54, 55, 56, 129, 130, 202, 203, 582, 583, 584, 585, 586, 587, 588, 589, 590, 783, 784, 785, 786, 901],
            "Rauchmeldertag": [23, 26, 29, 35, 42, 51, 80, 86, 96, 186, 187, 214, 283, 320, 324, 327, 388, 389, 395, 398, 399, 400, 407, 408, 430, 462, 465, 470, 502, 515, 702],
            "Silvester": [259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 326, 591, 695],
            "WM / EM": [371, 372, 373, 374, 375, 376, 641, 642, 849, 850, 851, 852],
            "Jubiläum": [756, 757, 758, 759, 760, 761, 762, 763, 764, 765, 766, 767, 768, 769, 770, 771, 772],
            "Sportevent": [868, 869, 870, 871, 872, 873, 874, 875, 876, 877, 878],
        };

        let eventMissionIds = JSON.parse(localStorage.getItem('customEventMissionIds') || '[]');

        const modal = document.createElement('div');
        modal.id = 'customSettingsModal';
        modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.6);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;

        const isDarkMode = document.body.classList.contains('dark');

        const modalBox = document.createElement('div');
        modalBox.className = 'modal-box';
        modalBox.style.cssText = `
        max-height: 90vh;
        overflow-y: auto;
        max-width: 90vw;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
        background-color: ${isDarkMode ? '#1e1e1e' : '#ffffff'};
        color: ${isDarkMode ? '#ffffff' : '#000000'};
    `;

        modalBox.innerHTML = `
        <h3 class="font-bold text-lg mb-2">Einstellungen</h3>
        <div id="categorySettingsContainer" class="space-y-2 mb-4"></div>
        <button class="btn btn-sm btn-success my-2" id="addGroupBtn">+ Neue Gruppe</button>

        <h4 class="font-bold text-lg mb-1 text-left w-full">Eventeinsätze auswählen</h4>
        <p class="font-bold text-xl text-black mb-2 text-left w-full" style="margin-top: 0;">
        Die ausgewählten Events werden im Button <strong>"Eventeinsätze"</strong> angezeigt.
        </p>

        <div id="eventCheckboxContainer" class="grid grid-cols-3 gap-2 mb-4 w-full"></div>

        <div class="modal-action">
            <button class="btn btn-success" id="saveSettingsBtn">Speichern</button>
            <button class="btn btn-primary" id="closeSettingsBtn">Schließen</button>
            <button class="btn btn-danger" id="resetSettingsBtn">Zurücksetzen</button>
        </div>
    `;

        modal.appendChild(modalBox);
        document.body.appendChild(modal);

        // Gruppen laden
        const container = modal.querySelector('#categorySettingsContainer');
        container.innerHTML = ''; // <-- Alte Inhalte löschen
        populateGroupSettings(container, categoryGroups, allCategories, customCategoryLabels);

        // Event-Checkboxen laden (in 3 Spalten)
        const checkboxContainer = modal.querySelector('#eventCheckboxContainer');
        const savedEventLabels = JSON.parse(localStorage.getItem('customEventMissionLabels') || '[]');

        // Grid-Layout für 3 Spalten
        checkboxContainer.style.display = 'grid';
        checkboxContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        checkboxContainer.style.gap = '0.5rem';

        Object.keys(eventMissions).forEach(label => {
            const id = `eventCheckbox-${label.replace(/\s+/g, '_')}`;
            const isChecked = savedEventLabels.includes(label);

            const wrapper = document.createElement('label');
            wrapper.setAttribute('for', id);
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '0.5rem';
            wrapper.style.cursor = 'pointer';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'event-checkbox';
            checkbox.dataset.event = label;
            checkbox.id = id;
            if (isChecked) checkbox.checked = true;

            wrapper.appendChild(checkbox);
            wrapper.append(label);
            checkboxContainer.appendChild(wrapper);
        });

        // Neue Gruppe hinzufügen
        document.getElementById('addGroupBtn').addEventListener('click', () => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'category-group-row flex items-center gap-2';

            const nameInput = document.createElement('input');
            nameInput.placeholder = 'Gruppenname';
            nameInput.className = 'input input-sm group-name-input';
            groupDiv.appendChild(nameInput);

            const dropdownWrapper = createCategoryDropdown('', allCategories, customCategoryLabels, (wrapper) => {
                wrapper.remove();
            });
            groupDiv.appendChild(dropdownWrapper);

            const addCategoryBtn = document.createElement('button');
            addCategoryBtn.textContent = '+ Kategorie';
            addCategoryBtn.className = 'btn btn-xs btn-info';
            addCategoryBtn.type = 'button';
            addCategoryBtn.onclick = () => {
                const dropdownWrapper = createCategoryDropdown('', allCategories, customCategoryLabels, (wrapper) => {
                    wrapper.remove();
                });
                groupDiv.insertBefore(dropdownWrapper, addCategoryBtn);
            };
            groupDiv.appendChild(addCategoryBtn);

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '✖';
            removeBtn.className = 'btn btn-xs btn-danger remove-group-btn';
            removeBtn.type = 'button';
            removeBtn.onclick = () => groupDiv.remove();
            groupDiv.appendChild(removeBtn);

            container.appendChild(groupDiv);
        });

        // Speichern
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            const selectedLabels = Array.from(document.querySelectorAll('.event-checkbox'))
            .filter(cb => cb.checked)
            .map(cb => cb.dataset.event);

            const selectedEventIds = selectedLabels.flatMap(label => eventMissions[label]);

            localStorage.setItem('customEventMissionLabels', JSON.stringify(selectedLabels));
            localStorage.setItem('customEventMissionIds', JSON.stringify(selectedEventIds));

            // Speichere auch Kategoriegruppen
            saveCustomSettings();

            loadCustomSettings();

            alert('Einstellungen gespeichert.');
            modal.style.display = 'none';

            // Alte Buttons entfernen (z.B. den Container mit den Buttons)
            const searchInput = document.getElementById('search_input_field_missions');
            const oldButtonContainer = searchInput.previousElementSibling; // Wenn Buttons direkt davor eingefügt wurden
            if (oldButtonContainer) {
                oldButtonContainer.remove();
            }

            // Buttons neu erstellen
            createCategoryButtons();
        });

        // Zurücksetzen
        document.getElementById('resetSettingsBtn').addEventListener('click', () => {
            if (confirm("Zurücksetzen auf Standardeinstellungen? Dies löscht alle deine bisherigen Gruppeneinstellungen!")) {
                // LocalStorage löschen
                localStorage.removeItem('customCategoryGroups');
                localStorage.removeItem('customEventMissionLabels');
                localStorage.removeItem('customEventMissionIds');

                // Variablen zurücksetzen
                categoryGroups = {};
                eventMissionIds = [];

                // Gruppencontainer komplett leeren
                const container = document.getElementById('categorySettingsContainer');
                if (container) {
                    container.innerHTML = '';
                }

                // Event-Checkboxen entchecken
                const checkboxContainer = document.getElementById('eventCheckboxContainer');
                if (checkboxContainer) {
                    checkboxContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                        cb.checked = false;
                    });
                }

                // Alte Buttons vor dem Neubauen entfernen
                const buttonsContainer = document.getElementById('buttonsContainer'); // Beispiel-Id
                if (buttonsContainer) {
                    buttonsContainer.innerHTML = '';
                }

                // Jetzt neue Buttons erstellen (achte darauf, dass createCategoryButtons den Container benutzt)
                createCategoryButtons();

                alert('Einstellungen wurden zurückgesetzt.');
            }
        });

        // Schließen
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Funktion für Dark / White
    function applyThemeToModal(modal) {
        const isDarkMode = document.body.classList.contains('dark');

        if (isDarkMode) {
            modal.style.backgroundColor = '#1e1e1e';
            modal.style.color = '#ffffff';
            modal.style.border = '1px solid #444';
            modal.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.2)';
        } else {
            modal.style.backgroundColor = '#ffffff';
            modal.style.color = '#000000';
            modal.style.border = '1px solid #ccc';
            modal.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        }
    }

    // ----- Bereich für die Verdienstberechnung ----- \\

    // Funktion zur Berechnung des Verdienstes
    function updateAverageEarnings() {
        const missionElements = document.querySelectorAll('.missionSideBarEntry:not(.mission_deleted)');
        let totalCredits = 0;
        let actualCredits = 0;
        let allCredits = 0;
        let allActualCredits = 0;
        let currentMissions = new Set();
        let categoryCredits = {};

        missionElements.forEach(element => {
            // Sichtbarkeit prüfen: sowohl eigene Buttons (style.display) als auch Spiel-Buttons (.hidden)
            if (element.style.display === 'none' || element.classList.contains('hidden')) return;

            const missionId = element.getAttribute('mission_type_id');
            const additiveOverlay = element.getAttribute('data-additive-overlays');
            const category = element.getAttribute('data-mission-category');

            if (missionId && missionData[missionId]) {
                let baseCredits = missionData[missionId].base_credits;
                let credits = baseCredits ?? 0;

                if (additiveOverlay && missionData[missionId].overlays[additiveOverlay]) {
                    credits = missionData[missionId].overlays[additiveOverlay];
                }

                if (!baseCredits) {
                    credits += 250;
                }

                allCredits += credits;

                const idNum = element.id.replace(/\D/g, '');
                const participantIcon = document.getElementById(`mission_participant_${idNum}`);
                const isParticipating = participantIcon && !participantIcon.classList.contains('hidden');

                if (isParticipating) {
                    allActualCredits += credits;
                    if (category) {
                        categoryCredits[category] = (categoryCredits[category] || 0) + credits;
                    }
                }

                // Entfernen der 'hidden' Überprüfung
                if (element.style.display !== 'none') {
                    totalCredits += credits;
                    if (isParticipating) {
                        actualCredits += credits;
                    }
                    currentMissions.add(missionId);
                }
            }
        });

        activeMissions.forEach(missionId => {
            if (!currentMissions.has(missionId)) {
                activeMissions.delete(missionId);
            }
        });

        activeMissions = currentMissions;

        const standardHTML = `
    <span title="${customTooltips['total_earnings'] || 'Verdienst der Kategorie oder Gruppe'}">💰 ${totalCredits.toLocaleString()} Credits</span>
    /
    <span title="${customTooltips['actual_earnings'] || 'Verdienst aus angefahrenen Einsätzen der Kategorie oder Gruppe'}">
        <span class="glyphicon glyphicon-user" style="color: #8bc34a;" aria-hidden="true"></span> ${actualCredits.toLocaleString()} Credits
    </span>
    `;

        const fullHTML = `
    <span title="Gesamtverdienst aller Einsätze">💲${allCredits.toLocaleString()} Credits</span>
    /
    <span title="Verdienst aus allen angefahrenen Einsätzen">
        <span class="glyphicon glyphicon-user" style="color: #4caf50;" aria-hidden="true"></span>💲${allActualCredits.toLocaleString()} Credits
    </span>
    `;

        const standardContainer = document.getElementById('standard_earnings_display');
        const fullContainer = document.getElementById('full_earnings_display');

        if (standardContainer) standardContainer.innerHTML = standardHTML;
        if (fullContainer) fullContainer.innerHTML = fullHTML;
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

    // ----- Bereich für die Einsatzzählung ----- \\

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

        const missionElements = document.querySelectorAll('.missionSideBarEntry:not(.mission_deleted):not(.hidden)');

        missionElements.forEach(element => {
            const missionId = element.getAttribute('mission_type_id');
            let categories = missionCategoryMap.get(missionId) || ['no-category']; // Standardwert "no-category"
            const idNum = parseInt(missionId);

            // Eventlogik: ZÄHLE NUR, wenn eventMissionIds NICHT LEER ist und die Mission in der Liste ist
            if (eventMissionIds.length > 0 && eventMissionIds.includes(idNum)) {
                categories = ['event'];
            } else if (defaultEventMissionIds.includes(idNum)) {
                // NICHT als Event, sondern wie normale Kategorie behandeln
            } else if (specialMissionIds.includes(idNum)) {
                categories = ['no-category'];
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

    // ----- Bereich für die Filterung der Einsätze ----- \\

    // Beobachtet alle Einsatzlisten auf neue Einsätze
    function observeMissionLists() {
        missionListIds.forEach(id => {
            const missionList = document.getElementById(id);
            if (!missionList) {
                console.error(`Einsatzliste ${id} nicht gefunden!`);
                return;
            }

            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.classList.contains("missionSideBarEntry")) {
                            updateSingleMissionVisibility(node);
                        }
                    });
                });
            });

            observer.observe(missionList, { childList: true });
        });
    }

    // Bestimmt, ob ein neuer Einsatz sichtbar sein soll
    function updateSingleMissionVisibility(missionElement) {
        if (activeFilters.length === 0) {
            missionElement.style.display = "";
            return;
        }

        const missionId = missionElement.getAttribute('mission_type_id');
        const missionType = missionElement.getAttribute('data-mission-type-filter');
        const missionState = missionElement.getAttribute('data-mission-state-filter');
        const missionParticipation = missionElement.getAttribute('data-mission-participation-filter');
        const categories = missionCategoryMap.get(missionId) || [];

        const isVisible = activeFilters.includes(missionType) ||
              activeFilters.includes(missionState) ||
              activeFilters.includes(missionParticipation) ||
              categories.some(category => activeFilters.includes(category));

        missionElement.style.display = isVisible ? "" : "none";
    }

    // Aktualisiert die Sichtbarkeit aller bestehenden Einsätze
    function updateMissionVisibility() {
        document.querySelectorAll('.missionSideBarEntry').forEach(updateSingleMissionVisibility);
    }

    // Filter: Nur eine bestimmte Kategorie
    function filterMissionListByCategory(category) {
        activeFilters = [category];
        updateMissionVisibility();
    }

    // Filter: Gruppe von Kategorien
    function filterMissionListByCategoryGroup(categoriesGroup) {
        activeFilters = categoriesGroup;
        updateMissionVisibility();
    }

    // Filter: Einsätze ohne Kategorie
    function filterMissionListWithoutCategory() {
        activeFilters = ['without-category'];

        document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
            const missionId = mission.getAttribute('mission_type_id');
            const categories = missionCategoryMap.get(missionId) || [];
            const isWithoutCategory = categories.length === 0 || specialMissionIds.includes(parseInt(missionId));
            mission.style.display = isWithoutCategory ? "" : "none";
        });
    }

    // Filter: Eventeinsätze
    function filterMissionListByEvent() {
        activeFilters = ['event'];

        // Wenn keine Eventmissionen ausgewählt sind, ALLES ausblenden!
        if (!Array.isArray(eventMissionIds) || eventMissionIds.length === 0) {
            document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
                mission.style.display = "none";
            });
            return;
        }

        // Sonst nur die gewählten Eventeinsätze anzeigen
        document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
            const missionIdRaw = mission.getAttribute('mission_type_id') || mission.dataset.missionTypeId;
            const missionId = parseInt(missionIdRaw);

            const isEvent = eventMissionIds.includes(missionId);
            mission.style.display = isEvent ? "" : "none";
        });
    }

    // Alle Einsätze wieder sichtbar machen
    function resetMissionList() {
        activeFilters = [];
        document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
            mission.style.display = "";
        });
    }

    // Visuelle Hervorhebung des aktiven Buttons
    function setActiveButton(button) {
        if (activeCategoryButton) {
            styleButtonForCurrentTheme(activeCategoryButton);
        }
        button.style.backgroundColor = '#28a745';
        button.style.color = '#fff';
        activeCategoryButton = button;
    }

    // Entfernt die Hervorhebung des aktiven Buttons
    function resetActiveButton() {
        if (activeCategoryButton) {
            styleButtonForCurrentTheme(activeCategoryButton);
            activeCategoryButton = null;
        }
    }

    // ----- Bereich für Alamieren und Weiter (Mehr schlecht als Recht aktuell) ----- \\

    // Funktion um die sichtbaren Einsätze in den Session Storage zu speichern
    function storeVisibleMissions() {
        const visibleMissions = [];
        document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
            const isVisible = mission.style.display !== 'none';
            const isNotDeleted = !mission.classList.contains('mission_deleted');

            if (isVisible && isNotDeleted) {
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
        //console.log("Gespeicherte Einsätze im Session Store:", JSON.parse(storedMissions));
    }

    // Funktion zur Bereinigung der aktuellen Mission im SessionStorage
    function cleanUpCurrentMissionInStorage(iframe) {
        const match = iframe.src.match(/\/missions\/(\d+)/);
        const missionId = match ? match[1] : null;
        if (!missionId) return;

        let missions = JSON.parse(sessionStorage.getItem('visibleMissions') || '[]');
        if (missions.includes(missionId)) {
            missions = missions.filter(id => id !== missionId);
            sessionStorage.setItem('visibleMissions', JSON.stringify(missions));
            //console.log(`[SessionStore] Einsatz ${missionId} entfernt. Verbleibend:`, missions);
        }
    }

    // Funktion um zum nächsten Einsatz der selben Kategorie/Gruppe zu gelangen
    function handleIframeReady(iframe) {
        const doc = iframe.contentDocument;
        if (!doc) return;

        const match = iframe.src.match(/\/missions\/(\d+)/);
        const currentId = match ? match[1] : null;
        if (!currentId) {
            console.warn("[CustomAlarm] Einsatz-ID nicht aus IFrame lesbar.");
            return;
        }

        const previousMissions = JSON.parse(sessionStorage.getItem('visibleMissions') || '[]');
        cleanUpCurrentMissionInStorage(iframe);
        const missions = JSON.parse(sessionStorage.getItem('visibleMissions') || '[]');

        if (missions.length === 0 && previousMissions.length > 0) {
            alert("Dies ist der letzte Einsatz in der ausgewählten Kategorie/Gruppe.");
            return;
        }

        if (missions.length === 0) return;

        const nextId = missions[0];
        const alarmBtn = doc.querySelector('#mission_alarm_btn');
        if (!alarmBtn) {
            console.warn("[CustomAlarm] Alarmieren-Button nicht gefunden.");
            return;
        }

        // 🔽 NEU: Suche nach Warnsymbol anhand des Suffix (_rot, _gelb, _gruen)
        const warningImg = Array.from(doc.querySelectorAll('.mission_header_info.row img'))
        .find(img => /_(rot|gelb|gruen)\.png$/.test(img.src));

        if (warningImg && /_rot\.png$/.test(warningImg.src)) {
            //console.log("[CustomAlarm] Warnsymbol (_rot) gefunden – Weiterleitung unterdrückt.");
            return;
        }

        const drivingOwn = !!doc.querySelector('#mission_vehicle_driving .btn-backalarm-ajax');
        const atSceneOwn = !!doc.querySelector('#mission_vehicle_at_mission .btn-backalarm-ajax');

        if (drivingOwn || atSceneOwn) {
            iframe.src = `https://www.leitstellenspiel.de/missions/${nextId}`;
        } else {
            alarmBtn.addEventListener('click', () => {
                const recheckImg = Array.from(doc.querySelectorAll('.mission_header_info.row img'))
                .find(img => /_(rot|gelb|gruen)\.png$/.test(img.src));

                if (recheckImg && /_rot\.png$/.test(recheckImg.src)) {
                    //console.log("[CustomAlarm] Warnsymbol nach dem Alarmieren (_rot) vorhanden – Weiterleitung abgebrochen.");
                    return;
                }

                iframe.src = `https://www.leitstellenspiel.de/missions/${nextId}`;
            }, { once: true });
        }
    }

    let hotkeyPressed = false;

    // Beobachtet neue IFrames im DOM
    const observer = new MutationObserver(() => {
        const iframes = Array.from(document.querySelectorAll("iframe[id^='lightbox_iframe_']"));
        iframes.forEach(iframe => {
            if (!iframe.dataset.tampermonkeyInjected) {
                iframe.dataset.tampermonkeyInjected = "true";
                //console.log("[Observer] Neues Iframe erkannt:", iframe.id);

                iframe.addEventListener("load", () => {
                    //console.log("[Observer] Iframe geladen:", iframe.id);
                    handleIframeReady(iframe);
                });

                // Falls das iFrame bereits vollständig geladen wurde
                if (iframe.contentDocument?.readyState === 'complete') {
                    //console.log("[Observer] Iframe ist bereits geladen:", iframe.id);
                    handleIframeReady(iframe);
                }
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    //console.log("[Tampermonkey] Skript aktiviert – wartet auf IFrames.");

    // Regelmäßige Updates für Statistiken
    setInterval(() => {
        updateMissionCount();
        updateAverageEarnings();
        updateCategoryButtons();
        getMissionSummary();

    }, 1000);

    // Startet die Überwachung
    observeMissionLists();
    loadMissionData();

})();
