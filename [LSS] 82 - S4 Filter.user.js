// ==UserScript==
// @name         [LSS] S4 Filter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @author       Caddy21
// @description  Zeigt nur Einsätze an mit mindestes einem eigenem Fahrzeug an der Einsatzstelle im Status 4 bei geteilten Einsätzen an
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const CHECK_INTERVAL = 60 * 1000;
    const MAX_PARALLEL_REQUESTS = 3;
    const MISSION_LISTS = [
        '#mission_list_alliance',
        '#mission_list_alliance_event',
        '#mission_list_sicherheitswache'
    ];
    const missionCache = new Map();
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    let s4FilterActive = false;
    let checkRunning = false;
    let observerStarted = false;
    let filterButton = null;

    function getMissions() {
        return MISSION_LISTS.flatMap(selector => {
            const container = document.querySelector(selector);

            return container
                ? [...container.querySelectorAll(':scope > div[id^="mission_"][mission_id]')] : [];});
    }

    function getMissionId(mission) {
        return mission.getAttribute('mission_id') || mission.id.replace('mission_', '');
    }

    function getMissionUrl(mission) {
        const button = mission.querySelector('.mission-alarm-button');
        const href = button?.getAttribute('href');
        return href
            ? new URL(href, location.origin).href
            : null;
    }

    function setMissionVisibility(mission, visible) {
        mission.style.display =
            !s4FilterActive || visible ? '' : 'none';
    }

    function hasOwnS4Vehicle(doc) {
        return !!doc.querySelector('#mission_vehicle_at_mission .btn-backalarm-ajax');
    }

    async function fetchMissionResult(mission) {
        const id = getMissionId(mission);
        const url = getMissionUrl(mission);
        if (!url) {
            missionCache.set(id, {
                hasOwnS4: false,
                checkedAt: Date.now()
            });

            setMissionVisibility(mission, false);
            return;
        }
        try {
            const response = await fetch(url, {
                credentials: 'same-origin',
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const doc = new DOMParser().parseFromString(
                await response.text(),
                'text/html'
            );

            const hasOwnS4 = hasOwnS4Vehicle(doc);

            missionCache.set(id, {
                hasOwnS4,
                checkedAt: Date.now()
            });

            setMissionVisibility(mission, hasOwnS4);

        } catch {
            missionCache.set(id, {
                hasOwnS4: false,
                checkedAt: Date.now()
            });
            setMissionVisibility(mission, false);
        }
    }

    function cleanupCache(ids) {
        for (const id of missionCache.keys()) {
            if (!ids.has(id)) {
                missionCache.delete(id);
            }
        }
    }

    async function runWithConcurrency(items, worker, concurrency) {
        let index = 0;
        async function runner() {
            while (index < items.length) {
                await worker(items[index++]);
            }
        }
        await Promise.all(
            Array.from(
                { length: Math.min(concurrency, items.length) },
                runner
            )
        );
    }

    async function checkMissions(force = false) {
        if (checkRunning) return;

        const missions = getMissions();

        if (!missions.length) {
            updateNoMissionMessages();
            return;
        }

        checkRunning = true;

        try {
            const now = Date.now();
            const ids = new Set(missions.map(getMissionId));

            cleanupCache(ids);

            const toCheck = missions.filter(mission => {
                const cached = missionCache.get(getMissionId(mission));

                if (
                    !force &&
                    cached &&
                    now - cached.checkedAt < CHECK_INTERVAL
                ) {
                    setMissionVisibility(
                        mission,
                        cached.hasOwnS4
                    );
                    return false;
                }

                return true;
            });

            await runWithConcurrency(
                toCheck,
                fetchMissionResult,
                MAX_PARALLEL_REQUESTS
            );

            updateNoMissionMessages();

        } finally {
            checkRunning = false;
        }
    }

    function updateNoMissionMessages() {
        for (const selector of MISSION_LISTS) {
            const container = document.querySelector(selector);
            if (!container) continue;
            const noMission = container.querySelector('[id$="_no_mission"]');
            if (!noMission) continue;
            if (!s4FilterActive) {
                noMission.style.display = 'none';
                continue;
            }
            const visible = [...container.querySelectorAll(
                ':scope > div[id^="mission_"][mission_id]'
            )].some(
                mission => mission.style.display !== 'none'
            );
            noMission.style.display = visible ? 'none' : '';
        }
    }

    function applyCachedFilter() {
        for (const mission of getMissions()) {
            const cached = missionCache.get(getMissionId(mission));
            mission.style.display = !s4FilterActive || cached?.hasOwnS4 ? '' : 'none';
        }
        updateNoMissionMessages();
    }

    function updateFilterButton() {
        if (!filterButton) return;
        filterButton.textContent = s4FilterActive ? '🚒 S4: AN' : '🚒 S4: AUS';
        filterButton.classList.toggle('btn-success', s4FilterActive);
        filterButton.classList.toggle('btn-danger', !s4FilterActive);
        filterButton.title = s4FilterActive ? 'S4-Filter aktiv – nur Einsätze mit eigenem S4 werden angezeigt' : 'Nur Einsätze anzeigen, an denen ein eigenes Fahrzeug S4 ist';
    }

    function createFilterButton() {
        const existing = document.querySelector('#mission_select_own_s4');
        if (existing) {
            filterButton = existing;
            updateFilterButton();
            return;
        }
        const container = document.querySelector('#missions-panel-main');
        if (!container) return;

        filterButton = document.createElement('a');
        filterButton.id = 'mission_select_own_s4';
        filterButton.className = 'btn btn-xs mission_selection btn-danger';
        filterButton.href = '';
        filterButton.role = 'button';
        filterButton.setAttribute('aria-label', 'S4-Filter aktivieren');
        updateFilterButton();
        filterButton.addEventListener('click', async event => {
                event.preventDefault();
                event.stopPropagation();

                s4FilterActive = !s4FilterActive;
                updateFilterButton();

                if (s4FilterActive) {
                    await checkMissions();
                }

                applyCachedFilter();
            }
        );

        const control = container.querySelector('.filters-display-control');
        control ? container.insertBefore(filterButton, control) : container.appendChild(filterButton);
    }

    function startObserver() {
        if (observerStarted) return;

        const containers = MISSION_LISTS
            .map(selector => document.querySelector(selector))
            .filter(Boolean);

        if (!containers.length) return;

        observerStarted = true;

        let timer;

        const observer = new MutationObserver(() => {
            clearTimeout(timer);

            timer = setTimeout(() => {
                createFilterButton();

                if (s4FilterActive) {
                    checkMissions();
                }
            }, 500);
        });

        containers.forEach(container => {
            observer.observe(container, {
                childList: true,
                subtree: true
            });
        });
    }

    async function init() {
        for (let i = 0; i < 40; i++) {
            if (document.querySelector('#missions-panel-main')) break;
            await sleep(500);
        }

        if (!document.querySelector('#missions-panel-main')) return;

        createFilterButton();

        await checkMissions(true);

        startObserver();

        setInterval(
            () => checkMissions(),
            CHECK_INTERVAL
        );
    }
    init();
})();
