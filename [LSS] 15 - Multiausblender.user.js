// ==UserScript==
// @name         [LSS] Einsatz- und Verdienststatistik
// @namespace    https://github.com/Caddy21/LSS-Scripte
// @version      1.0
// @description  Zeigt Einsatz- und Verdienststatistiken für Tag / Woche / Monat / Jahr in der Einsatzliste an
// @author       Caddy21
// @match        https://www.leitstellenspiel.de
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM.getValue
// @grant        GM.setValue
// ==/UserScript==

(function () {
    'use strict';

    // Optional: missionData laden, falls benötigt
    let missionData = {};
    const MISSION_DATA_KEY = 'missionData_v1';

    function loadMissionDataFromStorage() {
        const dataStr = localStorage.getItem(MISSION_DATA_KEY);
        if (dataStr) {
            try { missionData = JSON.parse(dataStr); } catch { missionData = {}; }
        }
    }

    // ISO-Woche berechnen
    function getISOWeek(date) {
        const target = new Date(date.valueOf());
        const dayNr = (date.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = new Date(target.getFullYear(), 0, 4);
        const diff = (target - firstThursday) / 86400000;
        return 1 + Math.floor(diff / 7);
    }

    (function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
/* Gesamtcontainer */
.stats-container {
    margin-top: 15px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
    gap: 15px;
    font-family: Arial, sans-serif;
    color: white;
}

/* Einzelne Box */
.stat-block {
    display: flex;
    align-items: center;
    background: #222;
    padding: 12px 15px;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    user-select: none;
}

/* Inhalt der Box */
.stat-content {
    flex-grow: 1;
}

/* Überschrift (z.B. "Einsätze") */
.stat-label {
    font-weight: 700;
    font-size: 1.5rem; /* Größe der Block-Überschrift */
    margin-bottom: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
}

/* Icons links/rechts neben der Überschrift */
.stat-icon-left,
.stat-icon-right {
    font-size: 16px;
}

/* Bereich für Werte und Worte */
.stat-values {
    font-size: 1.4rem; /* EINHEITLICHE Schriftgröße für Worte & Zahlen */
    line-height: 1.5;
    display: grid;
    grid-template-columns: auto 1fr;
    row-gap: 5px;
}

/* Worte wie "Heute", "Diese Woche" etc. */
.stat-values .label {
    justify-self: start;
    font-size: inherit; /* Stellt sicher, dass die Worte exakt die gleiche Größe wie die Zahlen haben */
    font-weight: 400;   /* Optional: Kannst du auf 700 setzen, wenn du die Worte fett möchtest */
}

/* Zahlenwerte */
.stat-values .value {
    justify-self: end;
    font-size: inherit; /* Zahlen ebenfalls gleich groß */
    font-weight: 400;   /* Optional: Kannst du auf 700 setzen, wenn du die Zahlen fett möchtest */
}
    `;
        document.head.appendChild(style);
    })();

    function createEarningsAndMissionsContainer(fallbackMode = false) {
        if (document.getElementById('average_earnings_display')) return;

        let containerParent = null;
        let insertBeforeNode = null;

        const catButtonContainer = document.getElementById('categoryButtonContainer');
        if (catButtonContainer && catButtonContainer.parentNode) {
            containerParent = catButtonContainer.parentNode;
            insertBeforeNode = catButtonContainer.nextSibling;
        } else if (fallbackMode) {
            const searchInput = document.getElementById('search_input_field_missions');
            if (searchInput && searchInput.parentNode) {
                containerParent = searchInput.parentNode;
                insertBeforeNode = searchInput;
            }
        }
        if (!containerParent) return;

        // Hilfsfunktion für einzelne Statistikblöcke
        function createStatBlock(id, colorClass, icon, label) {
            const wrapper = document.createElement('div');
            wrapper.className = 'stat-block ' + colorClass;
            wrapper.id = id;

            wrapper.innerHTML = `
            <div class="stat-content">
            <div class="stat-label">
                <span class="stat-icon-left">${icon}</span>
                ${label}
                <span class="stat-icon-right">${icon}</span>
            </div>
            <div class="stat-values"></div>
            </div>
        `;
            return wrapper;
        }

        const earningsContainer = document.createElement('section');
        earningsContainer.id = 'average_earnings_display';
        earningsContainer.className = 'stats-container';

        earningsContainer.appendChild(createStatBlock('today_missions_wrapper', 'red', '🚨', 'Einsätze'));
        earningsContainer.appendChild(createStatBlock('today_earnings_wrapper', 'green', '💰', 'Verdienst'));
        earningsContainer.appendChild(createStatBlock('patients_count_wrapper', 'yellow', '🩺', 'Patienten'));
        earningsContainer.appendChild(createStatBlock('prisoners_count_wrapper', 'orange', '🔒', 'Gefangene'));

        if (insertBeforeNode) {
            containerParent.insertBefore(earningsContainer, insertBeforeNode);
        } else {
            containerParent.appendChild(earningsContainer);
        }
    }

    async function updateAverageEarnings() {
        const finishedElements = document.querySelectorAll('.missionSideBarEntry.mission_deleted');

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
        const currentMonth = today.toISOString().slice(0, 7);
        const currentYear = today.getFullYear().toString();
        const currentWeek = getISOWeek(today);

        if (lastSavedDate !== todayDateString) {
            todayEarnings = 0;
            countedMissions = [];
            await GM.setValue('today_earnings', 0);
            await GM.setValue('counted_missions', []);
            await GM.setValue('last_saved_date', todayDateString);

            if (lastSavedWeek !== currentWeek.toString()) {
                weekEarnings = 0;
                await GM.setValue('week_earnings', 0);
                await GM.setValue('last_saved_week', currentWeek.toString());
            }
            if (lastSavedMonth !== currentMonth) {
                monthEarnings = 0;
                await GM.setValue('month_earnings', 0);
                await GM.setValue('last_saved_month', currentMonth);
            }
            if (lastSavedYear !== currentYear) {
                yearEarnings = 0;
                await GM.setValue('year_earnings', 0);
                await GM.setValue('last_saved_year', currentYear);
            }
        }

        for (const element of finishedElements) {
            const elementId = element.id;
            if (!countedMissions.includes(elementId)) {
                // Falls missionData genutzt wird:
                const missionId = element.getAttribute('mission_type_id');
                const additiveOverlay = element.getAttribute('data-additive-overlays');
                let credits = 250;
                if (missionId && missionData[missionId]) {
                    credits = missionData[missionId].base_credits ?? 250;
                    if (additiveOverlay && missionData[missionId].overlays && missionData[missionId].overlays[additiveOverlay]) {
                        credits = missionData[missionId].overlays[additiveOverlay];
                    }
                }
                todayEarnings += credits;
                weekEarnings += credits;
                monthEarnings += credits;
                yearEarnings += credits;
                countedMissions.push(elementId);
            }
        }

        await GM.setValue('today_earnings', todayEarnings);
        await GM.setValue('week_earnings', weekEarnings);
        await GM.setValue('month_earnings', monthEarnings);
        await GM.setValue('year_earnings', yearEarnings);
        await GM.setValue('counted_missions', countedMissions);

        const todayEarningsWrapper = document.querySelector('#today_earnings_wrapper .stat-values');
        if (todayEarningsWrapper) {
            const currentMonthName = new Date().toLocaleString('de-DE', { month: 'long' });
            const currentYear = new Date().getFullYear();
            todayEarningsWrapper.innerHTML = `
    <div class="label">Heute:</div><div class="value">${todayEarnings.toLocaleString()} Credits</div>
    <div class="label">Diese Woche:</div><div class="value">${weekEarnings.toLocaleString()} Credits</div>
    <div class="label">Im Monat ${currentMonthName}:</div><div class="value">${monthEarnings.toLocaleString()} Credits</div>
    <div class="label">Im Jahr ${currentYear}:</div><div class="value">${yearEarnings.toLocaleString()} Credits</div>
`;

        }
    }

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
        const currentWeek = getISOWeek(today);
        const currentWeekYearKey = `${currentYear}-KW${currentWeek.toString().padStart(2, '0')}`;

        if (lastSavedDate !== todayDateString) {
            todayMissions = 0;
            countedFinishedMissions = [];
            await GM.setValue('today_missions', 0);
            await GM.setValue('counted_finished_missions', []);
            await GM.setValue('last_saved_date_missions', todayDateString);

            if (lastSavedWeek !== currentWeekYearKey) {
                weekMissions = 0;
                await GM.setValue('week_missions', 0);
                await GM.setValue('last_saved_week_missions', currentWeekYearKey);
            }
            if (lastSavedMonth !== currentMonth) {
                monthMissions = 0;
                await GM.setValue('month_missions', 0);
                await GM.setValue('last_saved_month_missions', currentMonth);
            }
            if (lastSavedYear !== currentYear) {
                yearMissions = 0;
                await GM.setValue('year_missions', 0);
                await GM.setValue('last_saved_year_missions', currentYear);
            }
        }

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

        await GM.setValue('today_missions', todayMissions);
        await GM.setValue('week_missions', weekMissions);
        await GM.setValue('month_missions', monthMissions);
        await GM.setValue('year_missions', yearMissions);
        await GM.setValue('counted_finished_missions', countedFinishedMissions);

        const missionCountsWrapper = document.querySelector('#today_missions_wrapper .stat-values');
        if (missionCountsWrapper) {
            const currentMonthName = new Date().toLocaleString('de-DE', { month: 'long' });
            const currentYear = new Date().getFullYear();
            missionCountsWrapper.innerHTML = `
    <div class="label">Heute:</div><div class="value">${todayMissions} Stück</div>
    <div class="label">Diese Woche:</div><div class="value">${weekMissions} Stück</div>
    <div class="label">Im Monat ${currentMonthName}:</div><div class="value">${monthMissions} Stück</div>
    <div class="label">Im Jahr ${currentYear}:</div><div class="value">${yearMissions} Stück</div>
`;

        }
    }

    async function updatePatientsAndPrisonersCount() {
        // Werte laden
        let todayPatients = await GM.getValue('today_patients', 0);
        let weekPatients = await GM.getValue('week_patients', 0);
        let monthPatients = await GM.getValue('month_patients', 0);
        let yearPatients = await GM.getValue('year_patients', 0);
        let countedPatients = await GM.getValue('counted_patients', []);

        let todayPrisoners = await GM.getValue('today_prisoners', 0);
        let weekPrisoners = await GM.getValue('week_prisoners', 0);
        let monthPrisoners = await GM.getValue('month_prisoners', 0);
        let yearPrisoners = await GM.getValue('year_prisoners', 0);
        let countedPrisoners = await GM.getValue('counted_prisoners', []);

        // Patienten-Elemente finden: nur die mit class="col-md-6 small" und id beginnend mit "patient_"
        const patientElements = document.querySelectorAll('.col-md-6.small[id^="patient_"]');
        for (const patientEl of patientElements) {
            const patientId = patientEl.id;
            if (!countedPatients.includes(patientId)) {
                todayPatients++;
                weekPatients++;
                monthPatients++;
                yearPatients++;
                countedPatients.push(patientId);
            }
        }

        // Gefangene-Elemente finden: alle mit id beginnend mit "prisoner_"
        const prisonerElements = document.querySelectorAll('[id^="prisoner_"]');
        for (const prisonerEl of prisonerElements) {
            const prisonerId = prisonerEl.id;
            if (!countedPrisoners.includes(prisonerId)) {
                todayPrisoners++;
                weekPrisoners++;
                monthPrisoners++;
                yearPrisoners++;
                countedPrisoners.push(prisonerId);
            }
        }

        // Werte speichern
        await GM.setValue('today_patients', todayPatients);
        await GM.setValue('week_patients', weekPatients);
        await GM.setValue('month_patients', monthPatients);
        await GM.setValue('year_patients', yearPatients);
        await GM.setValue('counted_patients', countedPatients);

        await GM.setValue('today_prisoners', todayPrisoners);
        await GM.setValue('week_prisoners', weekPrisoners);
        await GM.setValue('month_prisoners', monthPrisoners);
        await GM.setValue('year_prisoners', yearPrisoners);
        await GM.setValue('counted_prisoners', countedPrisoners);

        // Anzeige aktualisieren
        const patientsCountWrapper = document.querySelector('#patients_count_wrapper .stat-values');
        if (patientsCountWrapper) {
            const currentMonthName = new Date().toLocaleString('de-DE', { month: 'long' });
            const currentYear = new Date().getFullYear();
            patientsCountWrapper.innerHTML = `
    <div class="label">Heute:</div><div class="value">${todayPatients} Stück</div>
    <div class="label">Diese Woche:</div><div class="value">${weekPatients} Stück</div>
    <div class="label">Im Monat ${currentMonthName}:</div><div class="value">${monthPatients} Stück</div>
    <div class="label">Im Jahr ${currentYear}:</div><div class="value">${yearPatients} Stück</div>
`;
        }

        const prisonersCountWrapper = document.querySelector('#prisoners_count_wrapper .stat-values');
        if (prisonersCountWrapper) {
            const currentMonthName = new Date().toLocaleString('de-DE', { month: 'long' });
            const currentYear = new Date().getFullYear();
            prisonersCountWrapper.innerHTML = `
    <div class="label">Heute:</div><div class="value">${todayPrisoners} Stück</div>
    <div class="label">Diese Woche:</div><div class="value">${weekPrisoners} Stück</div>
    <div class="label">Im Monat ${currentMonthName}:</div><div class="value">${monthPrisoners} Stück</div>
    <div class="label">Im Jahr ${currentYear}:</div><div class="value">${yearPrisoners} Stück</div>
`;
        }
    }

    function ensureStatsContainerExists() {
        if (!document.getElementById('average_earnings_display')) {
            createEarningsAndMissionsContainer(false);
        }
        updateMissionCounts();
        updateAverageEarnings();
        updatePatientsAndPrisonersCount();
    }

    function startStats(fallbackMode = false) {
        // Starte Intervall-Timer nur EINMAL!
        if (!window.__statsStarted) {
            window.__statsStarted = true;
            setInterval(updateMissionCounts, 1000);
            setInterval(updateAverageEarnings, 1000);
            setInterval(updatePatientsAndPrisonersCount, 1000);
        }
        // Egal wie oft das Event kommt: Statistikbox ggf. neu bauen!
        ensureStatsContainerExists();
    }

    // Starte Statistik-Script, sobald Buttons da sind:
    if (window.categoryButtonReady) {
        startStats(false);
    } else {
        // Auf Event warten
        document.addEventListener('categoryButtonReady', () => startStats(false));
        // Fallback nach 2 Sekunden (wenn Script 1 nicht da)
        setTimeout(() => {
            if (!window.__statsStarted) startStats(true);
        }, 2000);
    }

    // WICHTIG: Bei JEDEM categoryButtonReady-Event prüfen, ob Statistikbox fehlt und ggf. neu einfügen!
    document.addEventListener('categoryButtonReady', () => {
        ensureStatsContainerExists();
    });

    // Optional: missionData laden
    loadMissionDataFromStorage();

})();
