// ==UserScript==
// @name         [LSS] Einsatzkategorienfilter
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Filtert die Einsatzliste nach Einsatzkaategorien
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        GM.setValue
// @grant        GM.getValue
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// ==/UserScript==

(function () {
    'use strict';

    // Beschriftung und Zusammenstellung der Gruppen -> Hier könnt Ihr euch die Button beschriften und die Gruppen zuordnen
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

    // IDs der Eventeinsätze -> Hier könnt Ihr die Eventeinsätze anzeigen oder ausblenden.
    const eventMissionIds = [
        //        53, 428, 581, 665, 787, 789, 793, 794, 795, 831, 861, 862, // Winter
        //        704, 705, 706, 707, 708, // Tag des Europüischen Notrufes
        //        710, 711, 712, 713, 714, 715, 716, 717, 718, 719, // Karneval / Fasching
        //        597, 598, 599, 600, 601, 602, 603, 604, 605, 790, 791, 792, 833, 834, 917, 918, 919, 920, // Valentin
        722, 723, 724, 725, 726, 727, 728, 729, 730, //Frühling
        //        284, 285, 286, 287, 288, 289, 290, 291, 442, 443, 444, 445, 446, 618, 732, 733, 734, 735, 736, 737, 739, 927, 928, 929 // Ostern
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

    const apiUrl = "https://v3.lss-manager.de/modules/lss-missionHelper/missions/de_DE.json";
    const settingsApiUrl = "https://www.leitstellenspiel.de/api/settings"; // API zum Abrufen der Einstellungen
    const storageKey = "lssMissionsData";
    const storageTimestampKey = "lssMissionsDataTimestamp";
    const updateInterval = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden
    const missionDataUrl = "https://v3.lss-manager.de/modules/lss-missionHelper/missions/de_DE.json";

    let missionCreditsMap = {};
    let missions = {};
    let categories = new Set();
    let missionCategoryMap = new Map();
    let isDarkMode = false; // Standardwert: Helles Design
    let activeCategoryButton = null; // Referenz auf den aktiven Button
    let activeFilters = []; // Globale Variable zur Speicherung der aktiven Filter
    let missionData = {}; // Globale Variable zur Speicherung der Missionsdaten inklusive der durchschnittlichen Credits
    let categoryButtonsMap = new Map(); // Speichert die Buttons zur späteren Aktualisierung
    let activeMissions = new Set(); // Zwischenspeicher für aktive Einsätze

    // Spezielle Einsatz-IDs (VGSL)
    const specialMissionIds = [41, 43, 59, 75, 99, 207, 221, 222, 256, 350];

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

    // Tooltipps der Kategoriebutton
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

    // Globale Variable für die Einsatzlisten
    const missionListIds = [
        "mission_list",
        "mission_list_krankentransporte",
        "mission_list_alliance",
        "mission_list_sicherheitswache_alliance",
        "mission_list_alliance_event",
        "mission_list_sicherheitswache"
    ];

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

    // Missionen laden
    async function fetchMissionData() {
        try {
            const response = await fetch(apiUrl);
            const missions = await response.json();
            missionCreditsMap = missions.reduce((acc, mission) => {
                acc[mission.id] = mission.average_credits || 0;
                return acc;
            }, {});
           // console.log(`[Einsatzkategorienfilter] ${missions.length} Missionen mit Durchschnittswerten geladen.`);
        } catch (error) {
            console.error("Fehler beim Abrufen der Missionen:", error);
        }
    }

    // 1. Direkt beim Spielstart
    fetchMissionData();

    // 2. Zeitgesteuerter Abruf um 11:10 Uhr täglich
    function scheduleDailyMissionFetch() {
        const now = new Date();
        const target = new Date();
        target.setHours(11, 10, 0, 0);

        if (now > target) {
            target.setDate(target.getDate() + 1); // Auf morgen verschieben
        }

        const timeUntilTarget = target.getTime() - now.getTime();

        setTimeout(() => {
            fetchMissionData(); // Erste Ausführung um 11:10 Uhr
            setInterval(fetchMissionData, 24 * 60 * 60 * 1000); // Danach täglich
        }, timeUntilTarget);
    }

    scheduleDailyMissionFetch();

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

    // Funktion zum Überprüfen, ob eine Kategorie in einer der Gruppen enthalten ist
    function isCategoryInAnyGroup(category) {
        return Object.values(categoryGroups).some(group => group.includes(category));
    }

    // Funktion zur Erstellung der Buttons und Anzeigen
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
            sessionStorage.removeItem('visibleMissions'); // SessionStore löschen
            document.getElementById('standard_earnings_display').style.display = 'none';
            document.getElementById('full_earnings_display').style.display = 'inline';
            updateAverageEarnings();
        });

        buttonContainer.appendChild(resetButton);
        searchInput.parentNode.insertBefore(buttonContainer, searchInput);

        // Verdienstanzeige-Bereich einfügen
        const earningsContainer = document.createElement('div');
        earningsContainer.id = 'average_earnings_display';
        earningsContainer.style.marginTop = '10px';

        // Standard- und Full-Anzeigen
        const standardDisplay = document.createElement('div');
        standardDisplay.id = 'standard_earnings_display';
        standardDisplay.style.display = 'none';

        const fullDisplay = document.createElement('div');
        fullDisplay.id = 'full_earnings_display';

        // Heute-Verdienst-Anzeige (ohne Reset-Button)
        const todayEarningsWrapper = document.createElement('div');
        todayEarningsWrapper.id = 'today_earnings_wrapper';
        todayEarningsWrapper.style.marginTop = '10px';
        todayEarningsWrapper.style.display = 'flex';
        todayEarningsWrapper.style.alignItems = 'center';
        todayEarningsWrapper.style.gap = '10px';

        const todayDisplay = document.createElement('div');
        todayDisplay.id = 'today_earnings_display';

        todayEarningsWrapper.appendChild(todayDisplay);

        // Bereich für Einsatzzahlen
        const todayMissionsWrapper = document.createElement('div');
        todayMissionsWrapper.id = 'today_missions_wrapper';
        todayMissionsWrapper.style.marginTop = '10px';
        todayMissionsWrapper.style.display = 'flex';
        todayMissionsWrapper.style.alignItems = 'center';
        todayMissionsWrapper.style.gap = '10px';

        const todayMissionsDisplay = document.createElement('div');
        todayMissionsDisplay.id = 'today_missions_display';

        todayMissionsWrapper.appendChild(todayMissionsDisplay);

        // In den Container einfügen
        earningsContainer.appendChild(standardDisplay);
        earningsContainer.appendChild(fullDisplay);
        earningsContainer.appendChild(todayEarningsWrapper);
        earningsContainer.appendChild(todayMissionsWrapper);

        buttonContainer.appendChild(earningsContainer);

        // Initiale Verdienstanzeige laden
        updateAverageEarnings();
        updateMissionCounts();
    }

    // Funktion für die Tooltips der Buttons
    function generateGroupTooltip(groupCategories) {
        const categoryLabels = groupCategories.map(category => customCategoryLabels[category] || category);
        const tooltipText = `Zeigt alle Einsätze der Kategorien: ${categoryLabels.join(', ')}`;
        return tooltipText;
    }

    // ----- Bereich für die Verdienstberechnung ----- \\

    // Funktion zur Berechnung des Verdienstes
    async function updateAverageEarnings() {
        const missionElements = document.querySelectorAll('.missionSideBarEntry:not(.mission_deleted)');
        const finishedElements = document.querySelectorAll('.missionSideBarEntry.mission_deleted');

        let totalCredits = 0;
        let actualCredits = 0;
        let allCredits = 0;
        let allActualCredits = 0;
        let todayEarnings = await GM.getValue('today_earnings', 0);
        let weekEarnings = await GM.getValue('week_earnings', 0);
        let monthEarnings = await GM.getValue('month_earnings', 0);
        let yearEarnings = await GM.getValue('year_earnings', 0);
        let countedMissions = await GM.getValue('counted_missions', []);
        let lastSavedDate = await GM.getValue('last_saved_date', '');
        let lastSavedWeek = await GM.getValue('last_saved_week', '');
        let lastSavedMonth = await GM.getValue('last_saved_month', '');
        let lastSavedYear = await GM.getValue('last_saved_year', '');
        if (!Array.isArray(countedMissions)) countedMissions = [];

        const today = new Date();
        const todayDateString = today.toISOString().slice(0, 10);
        const currentMonth = today.toISOString().slice(0, 7);  // z.B. "2025-04"
        const currentYear = today.getFullYear().toString();     // z.B. "2025"

        // Hilfsfunktion: ISO-Woche berechnen
        const getISOWeek = (date) => {
            const target = new Date(date.valueOf());
            const dayNr = (date.getDay() + 6) % 7;
            target.setDate(target.getDate() - dayNr + 3);
            const firstThursday = new Date(target.getFullYear(), 0, 4);
            const diff = (target - firstThursday) / 86400000;
            return 1 + Math.floor(diff / 7);
        };

        const currentWeek = getISOWeek(today);

        // Tageswechsel: Reset nur Tageswerte
        if (lastSavedDate !== todayDateString) {
            todayEarnings = 0;
            countedMissions = [];
            await GM.setValue('today_earnings', 0);
            await GM.setValue('counted_missions', []);
            await GM.setValue('last_saved_date', todayDateString);

            // Wochenwechsel: Reset Wochenverdienst
            if (lastSavedWeek !== currentWeek.toString()) {
                weekEarnings = 0;
                await GM.setValue('week_earnings', 0);
                await GM.setValue('last_saved_week', currentWeek.toString());
            }

            // Monatlicher Reset bei Monatswechsel
            if (lastSavedMonth !== currentMonth) {
                monthEarnings = 0;
                await GM.setValue('month_earnings', 0);
                await GM.setValue('last_saved_month', currentMonth);
            }

            // Jahresreset bei Jahreswechsel
            if (lastSavedYear !== currentYear) {
                yearEarnings = 0;
                await GM.setValue('year_earnings', 0);
                await GM.setValue('last_saved_year', currentYear);
            }
        }

        let currentMissions = new Set();

        missionElements.forEach(element => {
            if (element.style.display === 'none' || element.classList.contains('hidden')) return;

            const missionId = element.getAttribute('mission_type_id');
            const additiveOverlay = element.getAttribute('data-additive-overlays');

            if (missionId && missionData[missionId]) {
                let credits = missionData[missionId].base_credits ?? 0;

                if (additiveOverlay && missionData[missionId].overlays[additiveOverlay]) {
                    credits = missionData[missionId].overlays[additiveOverlay];
                }

                if (!credits) {
                    credits = 250;
                }

                allCredits += credits;

                const idNum = element.id.replace(/\D/g, '');
                const participantIcon = document.getElementById(`mission_participant_${idNum}`);
                const isParticipating = participantIcon && !participantIcon.classList.contains('hidden');

                if (isParticipating) {
                    allActualCredits += credits;
                }

                if (element.style.display !== 'none') {
                    totalCredits += credits;
                    if (isParticipating) {
                        actualCredits += credits;
                    }
                    currentMissions.add(missionId);
                }
            }
        });

        // Nur neue beendete Missionen heute zählen
        for (const element of finishedElements) {
            const elementId = element.id;
            if (!countedMissions.includes(elementId)) {
                const missionId = element.getAttribute('mission_type_id');
                const additiveOverlay = element.getAttribute('data-additive-overlays');

                if (missionId && missionData[missionId]) {
                    let credits = missionData[missionId].base_credits ?? 0;

                    if (additiveOverlay && missionData[missionId].overlays[additiveOverlay]) {
                        credits = missionData[missionId].overlays[additiveOverlay];
                    }

                    if (!credits) {
                        credits = 250;
                    }

                    todayEarnings += credits;
                    weekEarnings += credits;
                    monthEarnings += credits;
                    yearEarnings += credits;
                }

                countedMissions.push(elementId);
            }
        }

        // Werte speichern
        await GM.setValue('today_earnings', todayEarnings);
        await GM.setValue('week_earnings', weekEarnings);
        await GM.setValue('month_earnings', monthEarnings);
        await GM.setValue('year_earnings', yearEarnings);
        await GM.setValue('counted_missions', countedMissions);

        // Bestehende DOM-Elemente aktualisieren
        const standardContainer = document.getElementById('standard_earnings_display');
        const fullContainer = document.getElementById('full_earnings_display');
        const todayEarningsContainer = document.getElementById('today_earnings_display');

        if (standardContainer) {
            standardContainer.innerHTML = `
            <span title="Verdienst der aktuellen Kategorie oder Gruppe">💰 ${totalCredits.toLocaleString()} Credits</span>
            /
            <span title="Verdienst aus angefahrenen Einsätzen der aktuellen Kategorie oder Gruppe">
                <span class="glyphicon glyphicon-user" style="color: #8bc34a;" aria-hidden="true"></span> ${actualCredits.toLocaleString()} Credits
            </span>
        `;
        }

        if (fullContainer) {
            fullContainer.innerHTML = `
            <span title="Gesamtverdienst aller Einsätze">💲${allCredits.toLocaleString()} Credits</span>
            /
            <span title="Gesamtverdienst aus allen angefahrenen Einsätzen">
                <span class="glyphicon glyphicon-user" style="color: #4caf50;" aria-hidden="true"></span>💲${allActualCredits.toLocaleString()} Credits
            </span>
        `;
        }

        if (todayEarningsContainer) {
            const currentMonthName = today.toLocaleString('de-DE', { month: 'long' }); // z.B. "April"
            const currentYear = today.getFullYear(); // z.B. "2025"

            todayEarningsContainer.innerHTML = `
            <div style="display: flex; gap: 10px;">
            <span style="color: green; font-weight: bold;">Verdienst:</span>
                <span title="Heutiger Verdienst">🗓️ <b>Heute:</b> ${todayEarnings.toLocaleString()} Credits</span>
                <span title="Wochenverdienst">📆 <b>Diese Woche:</b> ${weekEarnings.toLocaleString()} Credits</span>
                <span title="Monatsverdienst">📅 <b> Im Monat ${currentMonthName}:</b> ${monthEarnings.toLocaleString()} Credits</span>
                <span title="Jahresverdienst">📆 <b> Im Jahr ${currentYear}:</b> ${yearEarnings.toLocaleString()} Credits</span>
            </div>
        `;
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

    // Sichtbarkeitsprüfung (z. B. wenn Laptop aufwacht)
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            const lastSavedDate = await GM.getValue('last_saved_date_missions', '');
            const todayDateString = new Date().toISOString().slice(0, 10);
            if (lastSavedDate !== todayDateString) {
                //console.log('[Tageswechsel nach Standby erkannt]');
                await updateMissionCounts();
            }
        }
    });

    // Hauptfunktion zur Missionszählung
    async function updateMissionCounts() {
        const accessedElements = document.querySelectorAll('.missionSideBarEntry .glyphicon-user:not(.hidden)');

        let todayMissions = await GM.getValue('today_missions', 0);
        let weekMissions = await GM.getValue('week_missions', 0);
        let monthMissions = await GM.getValue('month_missions', 0);
        let yearMissions = await GM.getValue('year_missions', 0);
        let countedFinishedMissions = await GM.getValue('counted_finished_missions', []);
        let lastSavedDate = await GM.getValue('last_saved_date_missions', '');
        let lastSavedWeek = await GM.getValue('last_saved_week_missions', '');
        let lastSavedMonth = await GM.getValue('last_saved_month_missions', '');
        let lastSavedYear = await GM.getValue('last_saved_year_missions', '');
        if (!Array.isArray(countedFinishedMissions)) countedFinishedMissions = [];

        const today = new Date();
        const todayDateString = today.toISOString().slice(0, 10);
        const currentMonth = today.toISOString().slice(0, 7);
        const currentYear = today.getFullYear().toString();

        const getISOWeek = (date) => {
            const target = new Date(date.valueOf());
            const dayNr = (date.getDay() + 6) % 7;
            target.setDate(target.getDate() - dayNr + 3);
            const firstThursday = new Date(target.getFullYear(), 0, 4);
            const diff = (target - firstThursday) / 86400000;
            return 1 + Math.floor(diff / 7);
        };

        const currentWeek = getISOWeek(today);
        const currentWeekYearKey = `${currentYear}-KW${currentWeek.toString().padStart(2, '0')}`;

        // LOG optional
        //console.log('[Check]', { lastSavedDate, todayDateString, lastSavedWeek, currentWeekYearKey });

        if (lastSavedDate !== todayDateString) {
            console.log('→ Neuer Tag erkannt. Tageszähler wird zurückgesetzt.');

            todayMissions = 0;
            countedFinishedMissions = [];
            await GM.setValue('today_missions', 0);
            await GM.setValue('counted_finished_missions', []);
            await GM.setValue('last_saved_date_missions', todayDateString);

            if (lastSavedWeek !== currentWeekYearKey) {
               // console.log('→ Neue Woche erkannt. Wochenzähler wird zurückgesetzt.');
                weekMissions = 0;
                await GM.setValue('week_missions', 0);
                await GM.setValue('last_saved_week_missions', currentWeekYearKey);
            }

            if (lastSavedMonth !== currentMonth) {
               // console.log('→ Neuer Monat erkannt. Monatszähler wird zurückgesetzt.');
                monthMissions = 0;
                await GM.setValue('month_missions', 0);
                await GM.setValue('last_saved_month_missions', currentMonth);
            }

            if (lastSavedYear !== currentYear) {
                //console.log('→ Neues Jahr erkannt. Jahreszähler wird zurückgesetzt.');
                yearMissions = 0;
                await GM.setValue('year_missions', 0);
                await GM.setValue('last_saved_year_missions', currentYear);
            }
        }

        // Einsätze zählen
        for (const element of accessedElements) {
            const missionEntry = element.closest('.missionSideBarEntry');
            if (!missionEntry) continue;

            const elementId = missionEntry.id;
            if (!countedFinishedMissions.includes(elementId)) {
                todayMissions++;
                weekMissions++;
                monthMissions++;
                yearMissions++;
                countedFinishedMissions.push(elementId);
            }
        }

        // Speichern
        await GM.setValue('today_missions', todayMissions);
        await GM.setValue('week_missions', weekMissions);
        await GM.setValue('month_missions', monthMissions);
        await GM.setValue('year_missions', yearMissions);
        await GM.setValue('counted_finished_missions', countedFinishedMissions);

        // Anzeige aktualisieren
        const missionCountsContainer = document.getElementById('today_missions_display');
        if (missionCountsContainer) {
            const currentMonthName = today.toLocaleString('de-DE', { month: 'long' });
            missionCountsContainer.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <span style="color: red; font-weight: bold;">Einsätze:</span>
            <span title="Heute abgeschlossen">🗓️ <b>Heutige:</b> ${todayMissions} Stück</span>
            <span title="Diese Woche abgeschlossen">📆 <b>Diese Woche:</b> ${weekMissions} Stück</span>
            <span title="Diesen Monat abgeschlossen">📅 <b>Alle Einsätze im ${currentMonthName}:</b> ${monthMissions} Stück</span>
            <span title="Dieses Jahr abgeschlossen">📆 <b>Alle Einsätze im Jahr ${currentYear}:</b> ${yearMissions} Stück</span>
        </div>
    `;
        }
    }

    // Geplanten Mitternachts-Reset ausführen
    function scheduleMidnightReset() {
        const now = new Date();
        const nextMidnight = new Date(now);
        nextMidnight.setHours(24, 0, 0, 0); // nächste Mitternacht

        const timeUntilMidnight = nextMidnight - now;

        //console.log(`🕛 Nächster geplanter Reset in ${(timeUntilMidnight / 1000 / 60).toFixed(2)} Minuten`);

        setTimeout(async () => {
            //console.log('🕛 Mitternacht erreicht – führe automatischen Reset aus');
            await updateMissionCounts(); // führt interne Resets durch
            scheduleMidnightReset();     // nächsten Reset planen
        }, timeUntilMidnight + 1000); // +1 Sekunde Puffer
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

    // Filter: Nur Eventeinsätze
    function filterMissionListByEvent() {
        activeFilters = ['event'];

        document.querySelectorAll('.missionSideBarEntry').forEach(mission => {
            const missionId = mission.getAttribute('mission_type_id');
            const isEvent = eventMissionIds.includes(parseInt(missionId));
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

    // ----- Bereich für Alamieren und Weiter (noch in Arbeit) ----- \\

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
    //console.log("[Einsatzkategorienfilter] Skript aktiviert – wartet auf IFrames.");

    // Regelmäßige Updates für Statistiken
    setInterval(() => {
        updateMissionCount();
        updateAverageEarnings();
        updateCategoryButtons();
        getMissionSummary();
        updateMissionCounts();
    }, 1000);

    // Startet die Überwachung
    observeMissionLists();
    scheduleMidnightReset()
    loadMissionData();


    // Debug-Funktionen für Verdienst
    unsafeWindow.debugNewDay = async function() {
        await GM.setValue('last_saved_date', '2000-01-01'); // absichtlich altes Datum
        console.log("Debug: Tageswechsel simuliert.");
        updateAverageEarnings(); // neu berechnen
    }

    unsafeWindow.debugNewWeek = async function() {
        await GM.setValue('last_saved_week', '1');
        console.log("Debug: Wochenwechsel simuliert.");
        updateAverageEarnings();
    }

    unsafeWindow.debugNewMonth = async function() {
        await GM.setValue('last_saved_month', '2025-02'); // z.B. ein Monat in der Vergangenheit
        console.log("Debug: Monatswechsel simuliert.");

        // Nur den Monatsverdienst zurücksetzen
        await GM.setValue('month_earnings', 0);

        // Die Berechnung neu starten
        updateAverageEarnings();
    }

    unsafeWindow.debugNewYear = async function() {
        await GM.setValue('last_saved_year', '2024'); // z.B. ein Jahr in der Vergangenheit
        console.log("Debug: Jahreswechsel simuliert.");

        // Jahresverdienst zurücksetzen
        await GM.setValue('year_earnings', 0);

        // Die Berechnung neu starten
        updateAverageEarnings();
    }

    // Debug-Funktionen für Einsatzzähler
    unsafeWindow.debugNewDayMissions = async function() {
        await GM.setValue('last_saved_date_missions', '2000-01-01'); // absichtlich altes Datum
        console.log("Debug: Tageswechsel für Einsätze simuliert.");

        updateMissionCounts(); // neu berechnen
    }

    unsafeWindow.debugNewWeekMissions = async function() {
        await GM.setValue('last_saved_week_missions', '1');
        console.log("Debug: Wochenwechsel für Einsätze simuliert.");

        updateMissionCounts(); // neu berechnen
    }

    unsafeWindow.debugNewMonthMissions = async function() {
        await GM.setValue('last_saved_month_missions', '2025-02'); // Beispiel: alter Monat
        console.log("Debug: Monatswechsel für Einsätze simuliert.");

        await GM.setValue('month_missions', 0); // Monatszähler zurücksetzen

        updateMissionCounts(); // neu berechnen
    }

    unsafeWindow.debugNewYearMissions = async function() {
        await GM.setValue('last_saved_year_missions', '2024'); // Beispiel: altes Jahr
        console.log("Debug: Jahreswechsel für Einsätze simuliert.");

        await GM.setValue('year_missions', 0); // Jahreszähler zurücksetzen

        updateMissionCounts(); // neu berechnen
    }

    unsafeWindow.debugResetAll = async function() {
        // Verdienst zurücksetzen
        await GM.setValue('month_earnings', 0);    // Monatsverdienst auf 0 setzen
        await GM.setValue('year_earnings', 0);     // Jahresverdienst auf 0 setzen
        await GM.setValue('last_saved_date', '2000-01-01'); // Tag zurücksetzen
        await GM.setValue('last_saved_week', '1');  // Woche zurücksetzen

        // Einsatzzähler zurücksetzen
        await GM.setValue('month_missions', 0);    // Monatszähler auf 0 setzen
        await GM.setValue('year_missions', 0);     // Jahreszähler auf 0 setzen
        await GM.setValue('last_saved_date_missions', '2000-01-01'); // Tag zurücksetzen
        await GM.setValue('last_saved_week_missions', '1'); // Woche zurücksetzen

        // Berechnungen neu starten
        updateAverageEarnings();  // Verdienstdurchschnitt neu berechnen
        updateMissionCounts();    // Einsatzzählung neu berechnen

        console.log("Debug: Tag, Woche, Verdienst und Einsatzzähler zurückgesetzt.");
    }


})();
