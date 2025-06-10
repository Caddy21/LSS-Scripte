// ==UserScript==
// @name         Einsatz- und Verdienststatistik
// @namespace    https://github.com/Caddy21/Testgebiet
// @version      1.0
// @description  Zeigt Einsatz- und Verdienststatistiken für Tag / Woche / Monat / Jahr
// @author       Caddy21
// @match        https://www.leitstellenspiel.de
// @grant        GM.getValue
// @grant        GM.setValue
// ==/UserScript==

(function () {
    'use strict';

    // Optional: missionData laden, falls benötigt
    let missionData = {};
    const MISSION_DATA_KEY = 'missionData_v1';

    // Funktion zum laden der Einsatzdaten
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

    // Funktion um den Container für Daten zu erstellen
    function createEarningsAndMissionsContainer(fallbackMode = false) {
        if (document.getElementById('average_earnings_display')) return;

        let containerParent = null;
        let insertBeforeNode = null;

        // Immer versuchen, Statistik nach dem Button-Container zu platzieren, falls vorhanden
        const catButtonContainer = document.getElementById('categoryButtonContainer');
        if (catButtonContainer && catButtonContainer.parentNode) {
            containerParent = catButtonContainer.parentNode;
            insertBeforeNode = catButtonContainer.nextSibling;
        } else if (fallbackMode) {
            // Nur wenn wirklich kein Button-Container da ist: vor das Suchfeld
            const searchInput = document.getElementById('search_input_field_missions');
            if (searchInput && searchInput.parentNode) {
                containerParent = searchInput.parentNode;
                insertBeforeNode = searchInput;
            }
        }

        if (!containerParent) return; // Keine sinnvolle Position gefunden

        const earningsContainer = document.createElement('div');
        earningsContainer.id = 'average_earnings_display';
        earningsContainer.style.marginTop = '10px';

        // Heute-Verdienst-Anzeige
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

        earningsContainer.appendChild(todayEarningsWrapper);
        earningsContainer.appendChild(todayMissionsWrapper);

        if (insertBeforeNode) {
            containerParent.insertBefore(earningsContainer, insertBeforeNode);
        } else {
            containerParent.appendChild(earningsContainer);
        }
    }

    // Funktion zum updaten der Zähler
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

        const missionCountsContainer = document.getElementById('today_missions_display');
        if (missionCountsContainer) {
            const currentMonthName = today.toLocaleString('de-DE', { month: 'long' });
            missionCountsContainer.innerHTML =
                `<div style="display: flex; gap: 10px; align-items: center;">
                    <span style="color: red; font-weight: bold;">Einsätze:</span>
                    <span title="Heute abgeschlossen">🗓️ <b>Heutige:</b> ${todayMissions} Stück</span>
                    <span title="Diese Woche abgeschlossen">📆 <b>Diese Woche:</b> ${weekMissions} Stück</span>
                    <span title="Diesen Monat abgeschlossen">📅 <b>Alle Einsätze im ${currentMonthName}:</b> ${monthMissions} Stück</span>
                    <span title="Dieses Jahr abgeschlossen">📆 <b>Alle Einsätze im Jahr ${currentYear}:</b> ${yearMissions} Stück</span>
                </div>`;
        }
    }

    // Funktion zum updaten des Verdienstes
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

        const todayEarningsContainer = document.getElementById('today_earnings_display');
        if (todayEarningsContainer) {
            const currentMonthName = today.toLocaleString('de-DE', { month: 'long' });
            todayEarningsContainer.innerHTML =
                `<div style="display: flex; gap: 10px;">
                    <span style="color: green; font-weight: bold;">Verdienst:</span>
                    <span title="Heutiger Verdienst">🗓️ <b>Heute:</b> ${todayEarnings.toLocaleString()} Credits</span>
                    <span title="Wochenverdienst">📆 <b>Diese Woche:</b> ${weekEarnings.toLocaleString()} Credits</span>
                    <span title="Monatsverdienst">📅 <b> Im Monat ${currentMonthName}:</b> ${monthEarnings.toLocaleString()} Credits</span>
                    <span title="Jahresverdienst">📆 <b> Im Jahr ${currentYear}:</b> ${yearEarnings.toLocaleString()} Credits</span>
                </div>`;
        }
    }

    // NEU: Stellt sicher, dass der Statistikbereich immer existiert
    function ensureStatsContainerExists() {
        if (!document.getElementById('average_earnings_display')) {
            createEarningsAndMissionsContainer(false);
            updateMissionCounts();
            updateAverageEarnings();
        }
    }

    // Funktion um das Script zu starten
    function startStats(fallbackMode = false) {
        // Starte Intervall-Timer nur EINMAL!
        if (!window.__statsStarted) {
            window.__statsStarted = true;
            setInterval(updateMissionCounts, 30000);
            setInterval(updateAverageEarnings, 30000);
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

    // Schnittstelle zum "Einsatzkategorienfilter-Script"
    if (window.categoryButtonReady) {
        startStats(false); // Normale Integration
    } else {
        document.addEventListener('categoryButtonReady', () => startStats(false));

        // Fallback: Statistik generell einfügen.
        setTimeout(() => {
            if (!window.__statsStarted) startStats(true);
        }, 2000);
    }

})();
