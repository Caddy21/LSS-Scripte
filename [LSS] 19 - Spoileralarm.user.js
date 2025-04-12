// ==UserScript==
// @name         [LSS] 09 - Einsatzkategorienfilter
// @namespace    http://tampermonkey.net/
// @version      1.6
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

    // IDs der voreingestellten VGSL
    const specialMissionIds = [41, 43, 59, 75, 99, 207, 221, 222, 256, 350]; // Spezielle Einsatz-IDs

    // IDs der Eventeinsätze
    const eventMissionIds = [
        //        53, 428, 581, 665, 787, 789, 793, 794, 795, 831, 861, 862, // Winter
        //        704, 705, 706, 707, 708, // Tag des Europüischen Notrufes
        //        710, 711, 712, 713, 714, 715, 716, 717, 718, 719, // Karneval / Fasching
        //        597, 598, 599, 600, 601, 602, 603, 604, 605, 790, 791, 792, 833, 834, 917, 918, 919, 920, // Valentin
        722, 723, 724, 725, 726, 727, 728, 729, 730, //Frühling
        284, 285, 286, 287, 288, 289, 290, 291, 442, 443, 444, 445, 446, 618, 732, 733, 734, 735, 736, 737, 739, 927, 928, 929 // Ostern
        //        88, 626, 627, 628, 629, 630, 844, 845, 846, // Vatertag
        //        360, 742, 743, 744, 745, 746, 747, 748, 847, // Muttertag
        //        183, 184, 185, 461, 546, 547, 548, 646, 647, 648, 754, // Sommer
        //        672, 673, 674, 675, 676, 677, 678, 679, 680, // Herbst
        //        111, 112, 113, 114, 115, 116, 117, 118, 119, // Halloween
        //        52, 54, 55, 56, 129, 130, 202, 203, 582, 583, 584, 585, 586, 587, 588, 589, 590, 783, 784, 785, 786, 901, // Weihnachten
        //        23, 26, 29, 35, 42, 51, 80, 86, 96, 186, 187, 214, 283, 320, 324, 327, 388, 389, 395, 398, 399, 400, 407, 408, 430, 462, 465, 470, 502, 515, 702, // Rauchmeldertag
        //        259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 326, 591, 695, // Silvester
        //        371, 372, 373, 374, 375, 376, 641, 642, 849, 850, 851, 852, // WM / EM
        //        756, 757, 758, 759, 760, 761, 762, 763, 764, 765, 766, 767, 768, 769, 770, 771, 772, // Jubiläum
        //        868, 869, 870, 871, 872, 873, 874, 875, 876, 877, 878, // Sportevent

    ];

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
        'event': 'Eventeinsätze',
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

    // Funktion zur Überwachung der Einsatzlisten
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
        console.log("Update Sichtbarkeit für Einsatz", missionElement);
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
        const match = activeFilters.some(category => missionCategories.includes(category)) || (activeFilters.includes('event') && eventMissionIds.includes(parseInt(missionId)));

        missionElement.style.display = match ? "" : "none";
    }

    // Globale Variable zur Speicherung der Missionsdaten inklusive der durchschnittlichen Credits
    let missionData = {};

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

        let categoryButtonsMap = new Map(); // Speichert die Buttons zur späteren Aktualisierung

    // Funktion zur Erstellung der Buttons
    async function createCategoryButtons() {
        const searchInput = document.getElementById('search_input_field_missions');
        if (!searchInput) {
            console.error("Suchfeld nicht gefunden!");
            return;
        }

        const missionData = await fetchMissionData();
        const summary = getMissionSummary();

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexWrap = 'wrap';
        buttonContainer.style.marginBottom = '10px';

        const desiredOrder = [
            'fire', 'police', 'ambulance', 'thw', 'riot_police', 'water_rescue', 'mountain', 'coastal', 'airport', 'factory_fire_brigade', 'criminal_investigation', 'seg', 'seg_medical_service'
        ];

        // Erstelle die Buttons für jede Kategorie
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
                    document.getElementById('standard_earnings_display').style.display = 'inline'; // Zeige Verdienste an
                    document.getElementById('full_earnings_display').style.display = 'none'; // Verstecke den vollständigen Verdienstbereich
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
                document.getElementById('standard_earnings_display').style.display = 'inline'; // Zeige Verdienste an
                document.getElementById('full_earnings_display').style.display = 'none'; // Verstecke den vollständigen Verdienstbereich
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
            document.getElementById('standard_earnings_display').style.display = 'inline'; // Zeige Verdienste an
            document.getElementById('full_earnings_display').style.display = 'none'; // Verstecke den vollständigen Verdienstbereich
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
            document.getElementById('standard_earnings_display').style.display = 'inline'; // Zeige Verdienste an
            document.getElementById('full_earnings_display').style.display = 'none'; // Verstecke den vollständigen Verdienstbereich
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
            storeVisibleMissions();
            document.getElementById('standard_earnings_display').style.display = 'none'; // Verstecke Verdienste wieder
            document.getElementById('full_earnings_display').style.display = 'inline'; // Verstecke den vollständigen Verdienstbereich
            updateAverageEarnings();
        });

        buttonContainer.appendChild(resetButton);
        searchInput.parentNode.insertBefore(buttonContainer, searchInput);

        // Verdienstanzeige-Bereich einfügen
        const earningsContainer = document.createElement('div');
        earningsContainer.id = 'average_earnings_display';
        earningsContainer.style.marginTop = '10px';

        const standardDisplay = document.createElement('div');
        standardDisplay.id = 'standard_earnings_display';
        standardDisplay.style.display = 'none'; // Zuerst ausblenden

        const fullDisplay = document.createElement('div');
        fullDisplay.id = 'full_earnings_display';

        earningsContainer.appendChild(standardDisplay);
        earningsContainer.appendChild(fullDisplay);
        buttonContainer.appendChild(earningsContainer);

        updateAverageEarnings();
    }

    // Zwischenspeicher für aktive Einsätze
    let activeMissions = new Set();

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

            // Überprüfen, ob die Mission-ID zu den speziellen IDs gehört, die der VGSL/ÜO zugeordnet werden sollen
            const specialIds = [41, 43, 59, 75, 99, 207, 221, 222, 256, 350];
            if (specialIds.includes(parseInt(missionId))) {
                categories = ['no-category']; // Ersetze alle Kategorien mit VGSL/ÜO für diese speziellen IDs
            }

            categories.forEach(category => {
                summary[category] = (summary[category] || 0) + 1;
            });

            // Überprüfen, ob die Mission-ID zu den Eventeinsatz-IDs gehört
            if (eventMissionIds.includes(parseInt(missionId))) {
                summary['event'] = (summary['event'] || 0) + 1;
            }
        });

        // Berechnung für Gruppen
        for (const [groupName, groupCategories] of Object.entries(categoryGroups)) {
            summary[groupName] = groupCategories.reduce((sum, category) => sum + (summary[category] || 0), 0);
        }

        return summary;
    }

    // ----- Bereich für die Filterung der Einsätze ----- \\

    // Funktion um die Kategprieneinsätze zu filtern
    function filterMissionListByCategory(category) {
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

    // Funktion um Einsätze nach der Gruppenkategorie zu filtern
    function filterMissionListByCategoryGroup(categoriesGroup) {
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

    // Funktion um die Eventeinsätze zu filtern
    function filterMissionListByEvent() {
        const missionElements = document.querySelectorAll('.missionSideBarEntry');
        missionElements.forEach(element => {
            const missionId = element.getAttribute('mission_type_id');
            if (eventMissionIds.includes(parseInt(missionId))) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
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

    // Funktion um die neuen Einsätze direkt der Kategorie zuzuordnen
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

    // Interval für die Updates (Jede Sekunde)
    setInterval(() => {
        updateMissionCount();
        updateAverageEarnings();
        updateCategoryButtons();
        getMissionSummary();
    }, 1000);

    // ----- Bereich für Alamieren und Weiter ----- \\

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

    //    console.log("Starte das Script...");
    loadMissionData();

})();
