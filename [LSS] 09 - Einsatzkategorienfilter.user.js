// ==UserScript==
// @name         [LSS] Einsatzkategorienfilter
// @namespace    http://tampermonkey.net/
// @version      1.9
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
        "AP": ['highway_police'],
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
        "Tierrettung": ['animal_rescue']
    };
    const defaultEventMissionIds = [];
    const specialMissionIds = [41, 43, 59, 75, 99, 207, 221, 222, 256, 350];
    const customCategoryLabels = {
        fire: 'Feuerwehr',
        police: 'Polizei',
        ambulance: 'Rettungsdienst',
        thw: 'Technisches Hilfswerk',
        criminal_investigation: 'Kripo',
        riot_police: 'Bereitschaftspolizei',
        highway_police: 'Autobahnpolizei',
        water_rescue: 'Wasserrettung',
        mountain: 'Bergrettung',
        coastal: 'Seenotrettung',
        airport: 'Flughafeneinsätze',
        airport_specialization: 'Speziallisierte Flughafeneinsätze',
        factory_fire_brigade: 'Werkfeuerwehr',
        seg: 'SEG-Einsätze',
        seg_medical_service: 'SEG-Sanitätsdiensteinsätze',
        energy_supply: 'NEA 50',
        energy_supply_2: 'NEA 200',
        animal_rescue: 'Tierrettung',
        event: 'Eventeinsätze'
    };
    const customTooltips = {
        fire: 'Zeigt alle Einsätze der Feuerwehr',
        police: 'Zeigt alle Einsätze der Polizei',
        ambulance: 'Zeigt alle Einsätze des Rettungsdienstes',
        thw: 'Zeigt alle Einsätze des THW',
        riot_police: 'Zeigt alle Einsätze der Bereitschaftspolizei',
        water_rescue: 'Zeigt alle Einsätze der Wasserrettung',
        mountain: 'Zeigt alle Einsätze der Bergwacht',
        coastal: 'Zeigt alle Einsätze der Küstenschutz-Einheit',
        airport: 'Zeigt alle Einsätze am Flughafen',
        factory_fire_brigade: 'Zeigt alle Einsätze der Werksfeuerwehr',
        criminal_investigation: 'Zeigt alle Einsätze der Kriminalpolizei',
        seg_medical_service: 'Zeigt alle Einsätze des Sanitäts- und Rettungsdienstes',
        seg: 'Zeigt alle Einsätze der Schnelleinsatzgruppe',
        energy_supply: 'Zeigt alle Einsätze der NEA50 an',
        energy_supply_2: 'Zeigt alle Einsätze der NEA200 an',
        highway_police: 'Zeigt alle Einsätze der Autobahnpolizei an',
        animal_rescue: 'Zeigt alle Einsätze der Tierrettung an'
    };
    const missionListIds = [
        "mission_list",
        "mission_list_krankentransporte",
        "mission_list_alliance",
        "mission_list_sicherheitswache_alliance",
        "mission_list_alliance_event",
        "mission_list_sicherheitswache"
    ];
    const allCategories = [
        'fire', 'police', 'ambulance', 'thw', 'criminal_investigation',
        'riot_police', 'water_rescue', 'mountain', 'coastal', 'airport',
        'airport_specialization', 'factory_fire_brigade', 'seg',
        'seg_medical_service', 'energy_supply', 'energy_supply_2',
        'highway_police', 'animal_rescue'
    ];
    const apiUrl = "https://v3.lss-manager.de/modules/lss-missionHelper/missions/de_DE.json";
    const settingsApiUrl = "https://www.leitstellenspiel.de/api/settings";
    const storageKey = "lssMissionsData";
    const storageTimestampKey = "lssMissionsDataTimestamp";
    const updateInterval = 6 * 60 * 60 * 1000;

    let missions = {};
    let categories = new Set();
    let missionCategoryMap = new Map();
    let isDarkMode = false;
    let activeCategoryButton = null;
    let activeFilters = [];
    let missionData = {};
    let categoryButtonsMap = new Map();
    let activeMissions = new Set();
    let categoryGroups = { ...defaultCategoryGroups };
    let eventMissionIds = [...defaultEventMissionIds];

    function isCategoryInAnyGroup(category) {
        return Object.values(categoryGroups).some(group => group.includes(category));
    }

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

        missionData = {};

        for (const mission of Object.values(missions)) {
            const baseMissionId = mission.base_mission_id;
            const additiveOverlays = mission.additive_overlays;

            if (baseMissionId) {
                const baseCredits = mission.average_credits || 0;

                if (!missionData[baseMissionId]) {
                    missionData[baseMissionId] = {
                        base_credits: baseCredits,
                        overlays: {}
                    };
                }

                if (additiveOverlays) {
                    missionData[baseMissionId].overlays[additiveOverlays] = mission.average_credits || 0;
                }
            }

            if (Array.isArray(mission.mission_categories)) {
                mission.mission_categories.forEach(category => categories.add(category));
            }

            missionCategoryMap.set(mission.id, mission.mission_categories || []);
        }

        await loadSettings();
        createCategoryButtons();
    }

    async function loadSettings() {
        try {
            const response = await fetch(settingsApiUrl);
            const settings = await response.json();

            if (settings && settings.design_mode !== undefined) {
                isDarkMode = settings.design_mode === 1 || settings.design_mode === 4;
            } else {
                console.error("Die erwartete Struktur wurde in der API-Antwort nicht gefunden.");
            }
        } catch (error) {
            console.error("Fehler beim Abrufen der Einstellungen:", error);
        }
    }

    function generateGroupTooltip(groupCategories) {
        const categoryLabels = groupCategories.map(category => customCategoryLabels[category] || category);
        return `Zeigt alle Einsätze der Kategorien: ${categoryLabels.join(', ')}`;
    }

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

    function showStandardEarnings() {
        document.getElementById('standard_earnings_display').style.display = 'inline';
        document.getElementById('full_earnings_display').style.display = 'none';
    }

    function createFilterButton(text, title, onClick, classes = ['btn', 'btn-xs']) {
        const button = document.createElement('button');
        button.textContent = text;
        button.title = title;
        button.classList.add(...classes);
        button.style.margin = '2px';

        if (!classes.includes('btn-primary')) {
            styleButtonForCurrentTheme(button);
        }
        button.addEventListener('click', onClick);
        return button;
    }

    function createCategoryButtons() {
        loadCustomSettings();

        const searchInput = document.getElementById('search_input_field_missions');
        if (!searchInput) {
            console.error("Suchfeld nicht gefunden!");
            return;
        }

        const summary = getMissionSummary();
        const existingContainer = document.getElementById('categoryButtonContainer');

        if (existingContainer) {
            existingContainer.remove();
        }

        categoryButtonsMap.clear();

        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'categoryButtonContainer';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexWrap = 'wrap';
        buttonContainer.style.marginBottom = '10px';

        const desiredOrder = [
            'fire', 'police', 'highway_police', 'ambulance', 'thw',
            'riot_police', 'water_rescue', 'mountain', 'coastal', 'airport',
            'factory_fire_brigade', 'criminal_investigation', 'seg',
            'seg_medical_service', 'energy_supply', 'energy_supply_2',
            'animal_rescue', 'event'
        ];

        desiredOrder.forEach(category => {
            if (!categories.has(category) || isCategoryInAnyGroup(category)) return;

            const label = customCategoryLabels[category] || category;
            const button = createFilterButton(
                `${label} (${summary[category] || 0})`,
                customTooltips[category] || `Zeigt Einsätze der Kategorie ${label}`,
                () => {
                    filterMissionListByCategory(category);
                    storeVisibleMissions();
                    setActiveButton(button);
                    showStandardEarnings();
                    updateAverageEarnings();
                }
            );

            buttonContainer.appendChild(button);
            categoryButtonsMap.set(category, button);
        });

        for (const [groupName, groupCategories] of Object.entries(categoryGroups)) {
            const groupButton = createFilterButton(
                `${groupName} (${summary[groupName] || 0})`,
                generateGroupTooltip(groupCategories),
                () => {
                    filterMissionListByCategoryGroup(groupCategories);
                    storeVisibleMissions();
                    setActiveButton(groupButton);
                    showStandardEarnings();
                    updateAverageEarnings();
                }
            );

            buttonContainer.appendChild(groupButton);
            categoryButtonsMap.set(groupName, groupButton);
        }

        const unoButton = createFilterButton(
            `VGSL/ÜO (${summary['no-category'] || 0})`,
            customTooltips['VGSL/ÜO'] || "Zeigt Verbandsgroßschadenslagen und Übergabeorte an",
            () => {
                filterMissionListWithoutCategory();
                storeVisibleMissions();
                setActiveButton(unoButton);
                showStandardEarnings();
                updateAverageEarnings();
            }
        );

        buttonContainer.appendChild(unoButton);
        categoryButtonsMap.set('VGSL/ÜO', unoButton);

        const eventButton = createFilterButton(
            `Eventeinsätze (${summary['event'] || 0})`,
            customTooltips['event'] || "Zeigt alle Eventeinsätze",
            () => {
                filterMissionListByEvent();
                storeVisibleMissions();
                setActiveButton(eventButton);
                showStandardEarnings();
                updateAverageEarnings();
            }
        );

        buttonContainer.appendChild(eventButton);
        categoryButtonsMap.set('event', eventButton);

        const resetButton = createFilterButton(
            'Alle anzeigen',
            customTooltips['reset'] || "Alle Einsätze anzeigen",
            () => {
                resetMissionList();
                resetActiveButton();
                sessionStorage.removeItem('visibleMissions');
                document.getElementById('standard_earnings_display').style.display = 'none';
                document.getElementById('full_earnings_display').style.display = 'inline';
                updateAverageEarnings();
            },
            ['btn', 'btn-xs', 'btn-primary']
        );

        buttonContainer.appendChild(resetButton);
        searchInput.parentNode.insertBefore(buttonContainer, searchInput);

        window.categoryButtonReady = true;
        document.dispatchEvent(new Event('categoryButtonReady'));

        const oldStats = document.getElementById('average_earnings_display');

        if (oldStats) {
            buttonContainer.parentNode.insertBefore(oldStats, buttonContainer.nextSibling);
        }

        if (typeof createSettingsButton === "function") {
            buttonContainer.appendChild(createSettingsButton());
        }

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

    function loadCustomSettings() {
        const storedGroups = JSON.parse(localStorage.getItem('customCategoryGroups'));
        const storedEvents = JSON.parse(localStorage.getItem('customEventMissionIds'));

        if (storedGroups) {
            categoryGroups = storedGroups;
        }

        eventMissionIds = Array.isArray(storedEvents)
            ? storedEvents.map(id => parseInt(id)).filter(id => !isNaN(id))
        : [...defaultEventMissionIds];
    }

    function saveCustomSettings() {
        const newGroups = {};

        document.querySelectorAll('#categorySettingsContainer .category-group-row').forEach(row => {
            const name = row.querySelector('.group-name-input').value.trim();
            const categories = [...row.querySelectorAll('.category-select')]
            .map(select => select.value)
            .filter(Boolean);

            if (name && categories.length) {
                newGroups[name] = categories;
            }
        });

        categoryGroups = newGroups;
        localStorage.setItem('customCategoryGroups', JSON.stringify(categoryGroups));

        const container = document.getElementById('categorySettingsContainer');

        if (container) {
            populateGroupSettings(container, categoryGroups, allCategories, customCategoryLabels);
        }

        const stats = document.getElementById('average_earnings_display');

        if (stats && stats.parentNode) {
            stats.parentNode.removeChild(stats);
        }

        createCategoryButtons();
        window.categoryButtonReady = true;
        document.dispatchEvent(new Event('categoryButtonReady'));
    }

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

    function createCategoryDropdown(selected, categoriesList, labelMap, onRemove) {
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

        categoriesList.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = labelMap[category] || category;
            option.selected = category === selected;
            select.appendChild(option);
        });

        wrapper.appendChild(select);

        if (typeof onRemove === 'function') {
            const removeButton = document.createElement('button');
            removeButton.textContent = '✖';
            removeButton.className = 'btn btn-xs btn-danger remove-dropdown-btn';
            removeButton.type = 'button';
            removeButton.onclick = () => onRemove(wrapper);
            wrapper.appendChild(removeButton);
        }

        return wrapper;
    }

    function populateGroupSettings(container, groups, categoriesList, labelMap) {
        container.innerHTML = '';

        Object.entries(groups).forEach(([groupName, categories]) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'category-group-row flex items-center gap-2';
            groupDiv.style.marginBottom = '10px';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = groupName;
            nameInput.placeholder = 'Gruppenname';
            nameInput.className = 'input input-sm group-name-input';
            groupDiv.appendChild(nameInput);

            const addCategoryButton = () => {
                const dropdown = createCategoryDropdown('', categoriesList, labelMap, wrapper => wrapper.remove());
                groupDiv.insertBefore(dropdown, addCategoryBtn);
            };

            categories.forEach(category => {
                groupDiv.appendChild(
                    createCategoryDropdown(category, categoriesList, labelMap, wrapper => wrapper.remove())
                );
            });

            const addCategoryBtn = document.createElement('button');
            addCategoryBtn.textContent = '+ Kategorie';
            addCategoryBtn.className = 'btn btn-xs btn-info';
            addCategoryBtn.type = 'button';
            addCategoryBtn.onclick = addCategoryButton;
            groupDiv.appendChild(addCategoryBtn);

            const moveUpBtn = document.createElement('button');
            moveUpBtn.textContent = '⬆';
            moveUpBtn.className = 'btn btn-xs btn-move';
            moveUpBtn.type = 'button';
            moveUpBtn.onclick = () => {
                const previous = groupDiv.previousElementSibling;
                if (previous) container.insertBefore(groupDiv, previous);
            };
            groupDiv.appendChild(moveUpBtn);

            const moveDownBtn = document.createElement('button');
            moveDownBtn.textContent = '⬇';
            moveDownBtn.className = 'btn btn-xs btn-move';
            moveDownBtn.type = 'button';
            moveDownBtn.onclick = () => {
                const next = groupDiv.nextElementSibling;
                if (next) container.insertBefore(next, groupDiv);
            };
            groupDiv.appendChild(moveDownBtn);

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '✖';
            removeBtn.className = 'btn btn-xs btn-danger remove-group-btn';
            removeBtn.type = 'button';
            removeBtn.onclick = () => groupDiv.remove();
            groupDiv.appendChild(removeBtn);

            container.appendChild(groupDiv);
        });
    }

    function createSettingsModal() {
        loadCustomSettings();

        if (document.getElementById('customSettingsModal')) return;

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
                }`;
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
                        .btn-move {
                            background-color: #000 !important;
                            color: #fff !important;
                            border: 1px solid #444 !important;
                        }
                    .btn-move:hover {
                        background-color: #222 !important;
                    }`;
            document.head.appendChild(style);
        }

        const modalCategories = [
            'fire', 'police', 'ambulance', 'thw', 'criminal_investigation',
            'riot_police', 'water_rescue', 'mountain', 'coastal', 'airport',
            'airport_specialization', 'factory_fire_brigade', 'seg',
            'seg_medical_service', 'energy_supply', 'energy_supply_2',
            'highway_police', 'animal_rescue'
        ];

        const modalLabels = {
            fire: 'Feuerwehr',
            police: 'Polizei',
            ambulance: 'Rettungsdienst',
            thw: 'Technisches Hilfswerk',
            criminal_investigation: 'Kriminalpolizei',
            riot_police: 'Bereitschaftspolizei',
            water_rescue: 'Wasserrettung',
            mountain: 'Bergrettung',
            coastal: 'Seenotrettung',
            airport: 'Flughafeneinsätze',
            airport_specialization: 'Spezialisierte Flughafeneinsätze',
            factory_fire_brigade: 'Werkfeuerwehr',
            seg: 'SEG-Einsätze',
            seg_medical_service: 'SEG-Sanitätsdienst',
            energy_supply: 'NEA 50',
            energy_supply_2: 'NEA 200',
            highway_police: 'Autobahnpolizei',
            animal_rescue: 'Tierrettung'
        };

        const eventMissions = {
            "Winter": [53, 428, 581, 665, 787, 788, 789, 793, 794, 795, 831, 861, 862],
            "Tag des Europäischen Notrufes": [704, 705, 706, 707, 708],
            "Karneval / Fasching": [710, 711, 712, 713, 714, 715, 716, 717, 718, 719],
            "Valentinstag": [597, 598, 599, 600, 601, 602, 603, 604, 605, 790, 791, 792, 833, 834, 917, 918, 919, 920, 962, 963],
            "Frühling": [722, 723, 724, 725, 726, 727, 728, 729, 730],
            "Ostern": [284, 285, 286, 287, 288, 289, 290, 291, 442, 443, 444, 445, 446, 618, 732, 733, 734, 735, 736, 737, 739, 927, 928, 929, 965],
            "Vatertag": [88, 626, 627, 628, 629, 630, 844, 845, 846],
            "Muttertag": [360, 742, 743, 744, 745, 746, 747, 748, 847],
            "Sommer": [183, 184, 185, 461, 546, 547, 548, 646, 647, 648, 754],
            "Herbst": [672, 673, 674, 675, 676, 677, 678, 679, 680],
            "Halloween": [111, 112, 113, 114, 115, 116, 117, 118, 119, 943, 944, 945, 946],
            "Weihnachten": [52, 54, 55, 56, 129, 130, 202, 203, 582, 583, 584, 585, 586, 587, 588, 589, 590, 783, 784, 785, 786, 901, 911, 912, 913, 952, 953, 954, 955, 956, 957, 958],
            "Rauchmeldertag": [23, 26, 29, 35, 42, 51, 80, 86, 96, 186, 187, 214, 283, 320, 324, 327, 388, 389, 395, 398, 399, 400, 407, 408, 430, 462, 465, 470, 502, 515, 702],
            "Silvester": [259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 326, 591, 695],
            "WM / EM": [371, 372, 373, 374, 375, 376, 641, 642, 849, 850, 851, 852, 1004, 1005, 1006, 1007, 1008, 1009],
            "Jubiläum": [756, 757, 758, 759, 760, 761, 762, 763, 764, 765, 766, 767, 768, 769, 770, 771, 772],
            "Sportevent": [868, 869, 870, 871, 872, 873, 874, 875, 876, 877, 878]
        };

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
                    align-items: center;`;

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
                    color: ${isDarkMode ? '#ffffff' : '#000000'};`;

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
                    </div>`;


        modal.appendChild(modalBox);
        document.body.appendChild(modal);

        const container = modal.querySelector('#categorySettingsContainer');
        populateGroupSettings(container, categoryGroups, modalCategories, modalLabels);

        const checkboxContainer = modal.querySelector('#eventCheckboxContainer');
        const savedEventLabels = JSON.parse(localStorage.getItem('customEventMissionLabels') || '[]');

        checkboxContainer.style.display = 'grid';
        checkboxContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        checkboxContainer.style.gap = '0.5rem';

        Object.keys(eventMissions).forEach(label => {
            const id = `eventCheckbox-${label.replace(/\s+/g, '_')}`;
            const wrapper = document.createElement('label');
            const checkbox = document.createElement('input');

            wrapper.setAttribute('for', id);
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '0.5rem';
            wrapper.style.cursor = 'pointer';

            checkbox.type = 'checkbox';
            checkbox.className = 'event-checkbox';
            checkbox.dataset.event = label;
            checkbox.id = id;
            checkbox.checked = savedEventLabels.includes(label);

            wrapper.appendChild(checkbox);
            wrapper.append(label);
            checkboxContainer.appendChild(wrapper);
        });

        document.getElementById('addGroupBtn').addEventListener('click', () => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'category-group-row flex items-center gap-2';

            const nameInput = document.createElement('input');
            nameInput.placeholder = 'Gruppenname';
            nameInput.className = 'input input-sm group-name-input';
            groupDiv.appendChild(nameInput);

            const addCategoryBtn = document.createElement('button');
            addCategoryBtn.textContent = '+ Kategorie';
            addCategoryBtn.className = 'btn btn-xs btn-info';
            addCategoryBtn.type = 'button';
            addCategoryBtn.onclick = () => {
                const dropdown = createCategoryDropdown('', modalCategories, modalLabels, wrapper => wrapper.remove());
                groupDiv.insertBefore(dropdown, addCategoryBtn);
            };

            groupDiv.appendChild(
                createCategoryDropdown('', modalCategories, modalLabels, wrapper => wrapper.remove())
            );
            groupDiv.appendChild(addCategoryBtn);

            const moveUpBtn = document.createElement('button');
            moveUpBtn.textContent = '⬆';
            moveUpBtn.className = 'btn btn-xs btn-move';
            moveUpBtn.type = 'button';
            moveUpBtn.onclick = () => {
                const previous = groupDiv.previousElementSibling;
                if (previous) container.insertBefore(groupDiv, previous);
            };
            groupDiv.appendChild(moveUpBtn);

            const moveDownBtn = document.createElement('button');
            moveDownBtn.textContent = '⬇';
            moveDownBtn.className = 'btn btn-xs btn-move';
            moveDownBtn.type = 'button';
            moveDownBtn.onclick = () => {
                const next = groupDiv.nextElementSibling;
                if (next) container.insertBefore(next, groupDiv);
            };
            groupDiv.appendChild(moveDownBtn);

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '✖';
            removeBtn.className = 'btn btn-xs btn-danger remove-group-btn';
            removeBtn.type = 'button';
            removeBtn.onclick = () => groupDiv.remove();
            groupDiv.appendChild(removeBtn);

            container.appendChild(groupDiv);
        });

        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            const selectedLabels = [...document.querySelectorAll('.event-checkbox')]
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.dataset.event);

            const selectedEventIds = selectedLabels.flatMap(label => eventMissions[label]);

            localStorage.setItem('customEventMissionLabels', JSON.stringify(selectedLabels));
            localStorage.setItem('customEventMissionIds', JSON.stringify(selectedEventIds));

            saveCustomSettings();
            loadCustomSettings();

            alert('Einstellungen gespeichert.');
            modal.style.display = 'none';

            const searchInput = document.getElementById('search_input_field_missions');
            const oldButtonContainer = searchInput.previousElementSibling;

            if (oldButtonContainer) {
                oldButtonContainer.remove();
            }

            createCategoryButtons();
        });

        document.getElementById('resetSettingsBtn').addEventListener('click', () => {
            if (!confirm("Zurücksetzen auf Standardeinstellungen? Dies löscht alle deine bisherigen Gruppeneinstellungen!")) return;

            localStorage.removeItem('customCategoryGroups');
            localStorage.removeItem('customEventMissionLabels');
            localStorage.removeItem('customEventMissionIds');

            categoryGroups = {};
            eventMissionIds = [];

            const groupContainer = document.getElementById('categorySettingsContainer');
            if (groupContainer) {
                groupContainer.innerHTML = '';
            }

            const eventsContainer = document.getElementById('eventCheckboxContainer');
            if (eventsContainer) {
                eventsContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = false;
                });
            }

            const buttonsContainer = document.getElementById('buttonsContainer');
            if (buttonsContainer) {
                buttonsContainer.innerHTML = '';
            }

            createCategoryButtons();
            alert('Einstellungen wurden zurückgesetzt.');
        });

        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    function applyThemeToModal(modal) {
        const dark = document.body.classList.contains('dark');

        if (dark) {
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

    function updateAverageEarnings() {
        const missionElements = document.querySelectorAll('.missionSideBarEntry:not(.mission_deleted)');
        let totalCredits = 0;
        let actualCredits = 0;
        let allCredits = 0;
        let allActualCredits = 0;
        const currentMissions = new Set();
        const categoryCredits = {};

        let creditMultiplier = 1;
        const eventElement = document.getElementById('event-info-block');

        if (eventElement) {
            const timer = eventElement.querySelector('.timer');
            const endTime = parseInt(timer?.getAttribute('data-end-time') || 0, 10);
            const now = Date.now();

            if (now < endTime) {
                const isPremium = typeof user_premium !== 'undefined' && user_premium === true;
                const titleText = eventElement.querySelector('.credits-title')?.textContent || '';

                if (isPremium && titleText.includes('x2,5')) {
                    creditMultiplier = 2.5;
                } else if (!isPremium && titleText.includes('x2')) {
                    creditMultiplier = 2;
                }
            }
        }

        missionElements.forEach(element => {
            if (element.style.display === 'none' || element.classList.contains('hidden')) return;

            const missionId = element.getAttribute('mission_type_id');
            const additiveOverlay = element.getAttribute('data-additive-overlays');
            const category = element.getAttribute('data-mission-category');

            if (!missionId || !missionData[missionId]) return;

            const baseCredits = missionData[missionId].base_credits;
            let credits = baseCredits ?? 0;

            if (additiveOverlay && missionData[missionId].overlays[additiveOverlay]) {
                credits = missionData[missionId].overlays[additiveOverlay];
            }

            if (!baseCredits) {
                credits += 250;
            }

            credits *= creditMultiplier;
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

            totalCredits += credits;

            if (isParticipating) {
                actualCredits += credits;
            }

            currentMissions.add(missionId);
        });

        activeMissions.forEach(missionId => {
            if (!currentMissions.has(missionId)) {
                activeMissions.delete(missionId);
            }
        });

        activeMissions = currentMissions;

        const multiplierHTML = creditMultiplier > 1
        ? `<br><small style="color: #888;">(Multiplikator aktiv: x${creditMultiplier})</small>`
        : '';

        const standardHTML = `

        <span title="${customTooltips['total_earnings'] || 'Verdienst der Kategorie oder Gruppe'}">💰 ${totalCredits.toLocaleString()} Credits</span>
        / <span title="${customTooltips['actual_earnings'] || 'Verdienst aus angefahrenen Einsätzen der Kategorie oder Gruppe'}"> <span class="glyphicon glyphicon-user" style="color: #8bc34a;" aria-hidden="true"></span> ${actualCredits.toLocaleString()} Credits </span>
            ${multiplierHTML}`;

        const fullHTML = `

            <span title="Gesamtverdienst aller Einsätze">💲${allCredits.toLocaleString()} Credits</span>
        / <span title="Verdienst aus allen angefahrenen Einsätzen"> <span class="glyphicon glyphicon-user" style="color: #4caf50;" aria-hidden="true"></span>💲${allActualCredits.toLocaleString()} Credits </span>
            ${multiplierHTML}`;

        const standardContainer = document.getElementById('standard_earnings_display');
        const fullContainer = document.getElementById('full_earnings_display');

        if (standardContainer) standardContainer.innerHTML = standardHTML;
        if (fullContainer) fullContainer.innerHTML = fullHTML;
    }

    function updateCategoryButtons() {
        const summary = getMissionSummary();

        categoryButtonsMap.forEach((button, category) => {
            button.textContent = categoryGroups[category]
                ? `${category} (${summary[category] || 0})`
            : `${customCategoryLabels[category] || category} (${summary[category] || 0})`;
        });

        if (categoryButtonsMap.has('VGSL/ÜO')) {
            categoryButtonsMap.get('VGSL/ÜO').textContent = `VGSL/ÜO (${summary['no-category'] || 0})`;
        }
    }

    function updateMissionCount() {
        const summary = getMissionSummary();
        const categoryButtons = document.querySelectorAll('.category-button');

        categoryButtons.forEach(button => {
            const category = button.getAttribute('data-category');
            const countDisplay = button.querySelector('.mission-count');

            if (countDisplay) {
                countDisplay.textContent = summary[category] || 0;
            }
        });

        const vgsloButton = document.querySelector('.category-button[data-category="VGSL/ÜO"]');

        if (vgsloButton) {
            const countDisplay = vgsloButton.querySelector('.mission-count');

            if (countDisplay) {
                countDisplay.textContent = summary["VGSL/ÜO"] || 0;
            }
        }
    }

    function getMissionCountByCategory(category) {
        return getMissionSummary()[category] || 0;
    }

    function getMissionCountByCategoryGroup(categoriesGroup) {
        const summary = getMissionSummary();
        return categoriesGroup.reduce((count, category) => count + (summary[category] || 0), 0);
    }

    function getMissionSummary() {
        const summary = {};
        const missionElements = document.querySelectorAll('.missionSideBarEntry:not(.mission_deleted):not(.hidden)');

        missionElements.forEach(element => {
            const missionId = element.getAttribute('mission_type_id');
            let missionCategories = missionCategoryMap.get(missionId) || ['no-category'];
            const idNum = parseInt(missionId);

            if (eventMissionIds.length > 0 && eventMissionIds.includes(idNum)) {
                missionCategories = ['event'];
            } else if (defaultEventMissionIds.includes(idNum)) {
                // Als normale Kategorie behandeln
            } else if (specialMissionIds.includes(idNum)) {
                missionCategories = ['no-category'];
            }

            missionCategories.forEach(category => {
                summary[category] = (summary[category] || 0) + 1;
            });
        });

        for (const [groupName, groupCategories] of Object.entries(categoryGroups)) {
            summary[groupName] = groupCategories.reduce(
                (sum, category) => sum + (summary[category] || 0),
                0
            );
        }

        return summary;
    }

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

        const isVisible =
              activeFilters.includes(missionType) ||
              activeFilters.includes(missionState) ||
              activeFilters.includes(missionParticipation) ||
              categories.some(category => activeFilters.includes(category));

        missionElement.style.display = isVisible ? "" : "none";
    }

    function updateMissionVisibility() {
        document.querySelectorAll('.missionSideBarEntry').forEach(updateSingleMissionVisibility);
    }

    function filterMissionListByCategory(category) {
        activeFilters = [category];
        updateMissionVisibility();
    }

    function filterMissionListByCategoryGroup(categoriesGroup) {
        activeFilters = categoriesGroup;
        updateMissionVisibility();
    }

    function filterMissionListWithoutCategory() {
        activeFilters = ['without-category'];

        document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
            const missionId = mission.getAttribute('mission_type_id');
            const categories = missionCategoryMap.get(missionId) || [];
            const isWithoutCategory = categories.length === 0 || specialMissionIds.includes(parseInt(missionId));
            mission.style.display = isWithoutCategory ? "" : "none";
        });
    }

    function filterMissionListByEvent() {
        activeFilters = ['event'];

        if (!Array.isArray(eventMissionIds) || eventMissionIds.length === 0) {
            document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
                mission.style.display = "none";
            });
            return;
        }

        document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
            const missionIdRaw = mission.getAttribute('mission_type_id') || mission.dataset.missionTypeId;
            const missionId = parseInt(missionIdRaw);
            mission.style.display = eventMissionIds.includes(missionId) ? "" : "none";
        });
    }

    function resetMissionList() {
        activeFilters = [];
        document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
            mission.style.display = "";
        });
    }

    function setActiveButton(button) {
        if (activeCategoryButton) {
            styleButtonForCurrentTheme(activeCategoryButton);
        }

        button.style.backgroundColor = '#28a745';
        button.style.color = '#fff';
        activeCategoryButton = button;
    }

    function resetActiveButton() {
        if (activeCategoryButton) {
            styleButtonForCurrentTheme(activeCategoryButton);
            activeCategoryButton = null;
        }
    }

    function storeVisibleMissions() {
        const visibleMissions = [];

        document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
            if (
                mission.style.display !== 'none' &&
                !mission.classList.contains('mission_deleted')
            ) {
                visibleMissions.push(mission.id.split('_')[1]);
            }
        });

        sessionStorage.setItem('visibleMissions', JSON.stringify(visibleMissions));
    }

    function cleanUpCurrentMissionInStorage(iframe) {
        const match = iframe.src.match(/\/missions\/(\d+)/);
        const missionId = match ? match[1] : null;

        if (!missionId) return;

        let storedMissions = JSON.parse(sessionStorage.getItem('visibleMissions') || '[]');

        if (storedMissions.includes(missionId)) {
            storedMissions = storedMissions.filter(id => id !== missionId);
            sessionStorage.setItem('visibleMissions', JSON.stringify(storedMissions));
        }
    }

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

        const storedMissions = JSON.parse(sessionStorage.getItem('visibleMissions') || '[]');

        if (storedMissions.length === 0 && previousMissions.length > 0) {
            alert("Dies ist der letzte Einsatz in der ausgewählten Kategorie/Gruppe.");
            return;
        }

        if (storedMissions.length === 0) return;

        const nextId = storedMissions[0];
        const alarmBtn = doc.querySelector('#mission_alarm_btn');

        if (!alarmBtn) {
            console.warn("[CustomAlarm] Alarmieren-Button nicht gefunden.");
            return;
        }

        const findWarningImage = () =>
        Array.from(doc.querySelectorAll('.mission_header_info.row img'))
        .find(img => /_(rot|gelb|gruen)\.png$/.test(img.src));

        const warningImg = findWarningImage();

        if (warningImg && /_rot\.png$/.test(warningImg.src)) {
            return;
        }

        const drivingOwn = !!doc.querySelector('#mission_vehicle_driving .btn-backalarm-ajax');
        const atSceneOwn = !!doc.querySelector('#mission_vehicle_at_mission .btn-backalarm-ajax');

        if (drivingOwn || atSceneOwn) {
            iframe.src = `https://www.leitstellenspiel.de/missions/${nextId}`;
            return;
        }

        alarmBtn.addEventListener('click', () => {
            const recheckImg = findWarningImage();

            if (recheckImg && /_rot\.png$/.test(recheckImg.src)) {
                return;
            }

            iframe.src = `https://www.leitstellenspiel.de/missions/${nextId}`;
        }, { once: true });
    }

    const observer = new MutationObserver(() => {
        const iframes = Array.from(document.querySelectorAll("iframe[id^='lightbox_iframe_']"));

        iframes.forEach(iframe => {
            if (iframe.dataset.tampermonkeyInjected) return;

            iframe.dataset.tampermonkeyInjected = "true";
            iframe.addEventListener("load", () => {
                handleIframeReady(iframe);
            });

            if (iframe.contentDocument?.readyState === 'complete') {
                handleIframeReady(iframe);
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setInterval(() => {
        try {
            updateMissionCount();
            updateAverageEarnings();
            updateCategoryButtons();
            getMissionSummary();
        } catch (error) {
            console.error("Fehler bei Statistik-Update:", error);
        }
    }, 1000);

    observeMissionLists();
    loadMissionData();
})();
