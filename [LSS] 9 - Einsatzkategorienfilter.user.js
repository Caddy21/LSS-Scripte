// ==UserScript==
// @name         [LSS] Einsatzkategorienfilter
// @namespace    http://tampermonkey.net/
// @version      1.2
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

    async function loadMissionData() {
        const now = Date.now();
        const storedTimestamp = await GM.getValue(storageTimestampKey, 0);
        const isDataExpired = now - storedTimestamp > updateInterval;

        if (!isDataExpired) {
            //            console.info("Lade Einsatzdaten aus der GM-Speicherung...");
            missions = JSON.parse(await GM.getValue(storageKey, "{}"));
        } else {
            //            console.info("Lade Einsatzdaten aus der API...");
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error("Fehler beim Abrufen der API:", response.statusText);
                return;
            }
            missions = await response.json();
            await GM.setValue(storageKey, JSON.stringify(missions));
            await GM.setValue(storageTimestampKey, now);
            //            console.info("Einsatzdaten wurden aus der API geladen und in der GM-Speicherung gespeichert.");
        }

        //        console.info("Erstelle Kategorien und Mapping...");
        for (const mission of Object.values(missions)) {
            if (mission.mission_categories && Array.isArray(mission.mission_categories)) {
                mission.mission_categories.forEach(category => categories.add(category));
            }
            missionCategoryMap.set(mission.id, mission.mission_categories || []);
        }

        //        console.info("Lade die Benutzereinstellungen...");
        await loadSettings();

        //        console.info("Erstelle die Kategorie-Buttons...");
        createCategoryButtons();
    }

    async function loadSettings() {
        try {
            const response = await fetch(settingsApiUrl);
            const settings = await response.json();

            //            console.log("API Antwortstruktur: ", settings);

            if (settings && settings.design_mode !== undefined) {
                const designMode = settings.design_mode;
                isDarkMode = (designMode === 1 || designMode === 4);
                //                console.info("Designmodus aktiviert:", isDarkMode ? "Dunkelmodus" : "Hellmodus");
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

    function createCategoryButtons() {
        const searchInput = document.getElementById('search_input_field_missions');
        if (!searchInput) {
            console.error("Suchfeld nicht gefunden!");
            return;
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexWrap = 'wrap';
        buttonContainer.style.marginBottom = '10px';

        const desiredOrder = [
            'fire', 'police', 'ambulance', 'thw', 'riot_police', 'water_rescue',
            'mountain', 'coastal', 'airport', 'factory_fire_brigade', 'criminal_investigation', 'seg', 'seg_medical_service'
        ];

        desiredOrder.forEach(category => {
            if (categories.has(category) && !isCategoryInAnyGroup(category)) {
                const button = document.createElement('button');
                button.textContent = customCategoryLabels[category] || category;
                button.classList.add('btn', 'btn-xs');
                button.style.margin = '2px';
                styleButtonForCurrentTheme(button);

                button.title = customTooltips[category] || `Zeigt Einsätze der Kategorie ${customCategoryLabels[category] || category}`;

                button.addEventListener('click', () => {
                    //                    console.info(`Kategoriefilter aktiviert: ${category}`);
                    filterMissionListByCategory(category);
                    setActiveButton(button);
                });
                buttonContainer.appendChild(button);
            }
        });

        for (const [groupName, groupCategories] of Object.entries(categoryGroups)) {
            const groupButton = document.createElement('button');
            groupButton.textContent = groupName;
            groupButton.classList.add('btn', 'btn-xs');
            groupButton.style.margin = '2px';
            styleButtonForCurrentTheme(groupButton);

            const groupTooltip = generateGroupTooltip(groupCategories);
            groupButton.title = groupTooltip;

            groupButton.addEventListener('click', () => {
                //                console.info(`Kategoriegruppen-Filter aktiviert: ${groupName}`);
                filterMissionListByCategoryGroup(groupCategories);
                setActiveButton(groupButton);
            });
            buttonContainer.appendChild(groupButton);
        }

        const unoButton = document.createElement('button');
        unoButton.textContent = 'VGSL/ÜO';
        unoButton.classList.add('btn', 'btn-xs');
        unoButton.style.margin = '2px';
        styleButtonForCurrentTheme(unoButton);

        unoButton.title = customTooltips['VGSL/ÜO'] || "Zeigt Verbandsgroßschadenslagen und Übergabeorte an";

        unoButton.addEventListener('click', () => {
            //            console.info("VGE/ÜO-Filter aktiviert: Zeige alle VGE's und Übergabeorte an");
            filterMissionListWithoutCategory();
            setActiveButton(unoButton);
        });
        buttonContainer.appendChild(unoButton);

        const resetButton = document.createElement('button');
        resetButton.textContent = 'Alle anzeigen';
        resetButton.classList.add('btn', 'btn-xs', 'btn-primary');
        resetButton.style.margin = '2px';

        resetButton.title = customTooltips['reset'] || "Alle Einsätze anzeigen";

        resetButton.addEventListener('click', () => {
            //            console.info("Reset-Filter aktiviert: Alle Einsätze anzeigen");
            resetMissionList();
            resetActiveButton();
        });

        buttonContainer.appendChild(resetButton);
        searchInput.parentNode.insertBefore(buttonContainer, searchInput);
    }

    function generateGroupTooltip(groupCategories) {
        const categoryLabels = groupCategories.map(category => customCategoryLabels[category] || category);
        const tooltipText = `Zeigt alle Einsätze der Kategorien: ${categoryLabels.join(', ')}`;
        return tooltipText;
    }

    function filterMissionListByCategory(category) {
        console.clear();
        console.log(`Filtern der Einsätze nach Kategorie: ${category}`);

        const specialMissionIds = [41, 43, 59, 75, 99, 207, 221, 222, 256, 350]; // Spezielle Einsatz-IDs

        const missionElements = document.querySelectorAll('.missionSideBarEntry');
        missionElements.forEach(element => {
            const missionId = element.getAttribute('mission_type_id');
            if (missionCategoryMap.has(missionId)) {
                const categories = missionCategoryMap.get(missionId);
                if (categories.includes(category) && !specialMissionIds.includes(parseInt(missionId))) {
                    element.style.display = '';
                    console.log(`Einsatz-ID ${missionId} bleibt sichtbar (Kategorie: ${category})`);
                } else {
                    element.style.display = 'none';
                }
            } else {
                element.style.display = 'none';
            }
        });
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

    function filterMissionListByCategoryGroup(categoriesGroup) {
        console.clear();
        console.log(`Filtern der Einsätze nach den Kategorien: ${categoriesGroup.join(", ")}`);

        const specialMissionIds = [41, 43, 59, 75, 99, 207, 221, 222, 256, 350]; // Spezielle Einsatz-IDs

        const missionElements = document.querySelectorAll('.missionSideBarEntry');
        missionElements.forEach(element => {
            const missionId = element.getAttribute('mission_type_id');
            if (missionCategoryMap.has(missionId)) {
                const missionCategories = missionCategoryMap.get(missionId);
                const match = categoriesGroup.some(category => missionCategories.includes(category));

                if (match && !specialMissionIds.includes(parseInt(missionId))) {
                    element.style.display = '';
                    console.log(`Einsatz-ID ${missionId} bleibt sichtbar (Kategorieguppe: ${categoriesGroup.join(", ")})`);
                } else {
                    element.style.display = 'none';
                }
            } else {
                element.style.display = 'none';
            }
        });
    }

    function filterMissionListWithoutCategory() {
        console.clear();
        console.log("Filtern der Einsätze ohne Kategorie");

        const specialMissionIds = [41, 43, 59, 75, 99, 207, 221, 222, 256, 350]; // Spezielle Einsatz-IDs

        const missionElements = document.querySelectorAll('.missionSideBarEntry');
        missionElements.forEach(element => {
            const missionId = element.getAttribute('mission_type_id');
            if (missionCategoryMap.has(missionId)) {
                const categories = missionCategoryMap.get(missionId);
                if (categories.length === 0 || specialMissionIds.includes(parseInt(missionId))) {
                    element.style.display = '';
                    // console.log(`Einsatz-ID ${missionId} bleibt sichtbar (ohne Kategorie oder spezielle ID)`);
                } else {
                    element.style.display = 'none';
                }
            } else {
                element.style.display = '';
                console.log(`Einsatz-ID ${missionId} bleibt sichtbar (keine Kategorien zugewiesen oder spezielle ID)`);
            }
        });
    }

    function resetMissionList() {
        const missionElements = document.querySelectorAll('.missionSideBarEntry');
        missionElements.forEach(element => {
            element.style.display = '';
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
        }
        activeCategoryButton = null;
    }

    //    console.log("Starte das Script...");
    loadMissionData();
})();
