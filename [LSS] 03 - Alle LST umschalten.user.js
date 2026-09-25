// ==UserScript==
// @name         [LSS] Alle Leitstellen umschalten
// @namespace    https://www.leitstellenspiel.de/
// @version      1.1
// @description  Schaltet alle Leitstellen um und zeigt den Fortschritt an.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @match        https://polizei.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const LOG_PREFIX = '[LSS - Leitstellen umschalten]';
    const REQUEST_DELAY = 100;
    const BUILDING_TYPE_COMMAND_CENTER = '7';
    const BUTTON_ID = 'lss-toggle-command-centers';
    const PROGRESS_ID = 'lss-toggle-progress';
    const TARGET_SELECTOR = '#building-list-header-buttons';

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function isDarkMode() {
        const html = document.documentElement;

        if (!html) {
            return false;
        }

        const themeAttributes = [
            html.getAttribute('data-theme'),
            html.getAttribute('data-bs-theme'),
            html.getAttribute('theme')
        ]
            .filter(Boolean)
            .map(value => value.toLowerCase());

        if (themeAttributes.some(theme => theme.includes('dark'))) {
            return true;
        }

        if (themeAttributes.some(theme => theme.includes('light') || theme.includes('white'))) {
            return false;
        }

        const htmlClasses = Array.from(html.classList)
            .map(className => className.toLowerCase());

        if (htmlClasses.some(className =>
            className === 'dark' ||
            className.includes('darkmode') ||
            className.includes('dark-mode')
        )) {
            return true;
        }

        if (htmlClasses.some(className =>
            className === 'light' ||
            className.includes('lightmode') ||
            className.includes('light-mode')
        )) {
            return false;
        }

        const body = document.body;

        if (body) {
            const backgroundColor = getComputedStyle(body).backgroundColor;
            const match = backgroundColor.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);

            if (match) {
                const red = Number(match[1]);
                const green = Number(match[2]);
                const blue = Number(match[3]);
                const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

                return brightness < 128;
            }
        }

        return false;
    }

    function getProgressStyles() {
        if (isDarkMode()) {
            return {
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
            };
        }

        return {
            backgroundColor: '#fff',
            color: '#333',
            border: '1px solid #ccc',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        };
    }

    function getCommandCenterIds() {
        const buildings = Array.from(
            document.querySelectorAll(
                `.building_list_li.buildings_searchable[building_type_id="${BUILDING_TYPE_COMMAND_CENTER}"]`
            )
        );

        return buildings
            .map(building => {
                const link = building.querySelector('a[href*="/buildings/"]');

                if (!link) {
                    return null;
                }

                const match = link.href.match(/\/buildings\/(\d+)/);
                return match ? match[1] : null;
            })
            .filter(Boolean);
    }

    async function toggleBuilding(buildingId) {
        const url = `https://www.leitstellenspiel.de/buildings/${buildingId}/active?active=true`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }

            console.log(`${LOG_PREFIX} Leitstelle ${buildingId} erfolgreich umgeschaltet.`);
            return true;
        } catch (error) {
            console.error(`${LOG_PREFIX} Fehler bei Leitstelle ${buildingId}:`, error);
            return false;
        }
    }

    function removeProgress() {
        document.getElementById(PROGRESS_ID)?.remove();
    }

    function createProgress(commandCenterCount) {
        removeProgress();

        const styles = getProgressStyles();
        const container = document.createElement('div');

        container.id = PROGRESS_ID;

        Object.assign(container.style, {
            position: 'fixed',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '15px',
            zIndex: '999999',
            fontFamily: 'Arial, sans-serif',
            minWidth: '280px',
            maxWidth: 'calc(100vw - 30px)',
            borderRadius: '8px',
            textAlign: 'center',
            ...styles
        });

        const text = document.createElement('p');

        Object.assign(text.style, {
            margin: '0 0 8px 0',
            fontSize: '14px'
        });

        text.textContent = `0 von ${commandCenterCount} Leitstellen umgeschaltet.`;

        const progress = document.createElement('progress');

        Object.assign(progress.style, {
            width: '100%',
            height: '20px'
        });

        progress.max = commandCenterCount;
        progress.value = 0;

        container.appendChild(text);
        container.appendChild(progress);
        document.body.appendChild(container);

        return {
            container,
            text,
            progress
        };
    }

    async function toggleAllCommandCenters() {
        const commandCenterIds = getCommandCenterIds();

        console.log(`${LOG_PREFIX} Gefundene Leitstellen:`, commandCenterIds);

        if (!commandCenterIds.length) {
            alert('Es wurden keine Leitstellen gefunden.');
            return;
        }

        const { container, text, progress } = createProgress(commandCenterIds.length);

        let successful = 0;
        let failed = 0;

        for (let i = 0; i < commandCenterIds.length; i++) {
            const success = await toggleBuilding(commandCenterIds[i]);

            if (success) {
                successful++;
            } else {
                failed++;
            }

            progress.value = i + 1;
            text.textContent = `${i + 1} von ${commandCenterIds.length} Leitstellen bearbeitet.`;

            if (i < commandCenterIds.length - 1) {
                await sleep(REQUEST_DELAY);
            }
        }

        console.log(`${LOG_PREFIX} Vorgang abgeschlossen.`, {
            erfolgreich: successful,
            fehlgeschlagen: failed
        });

        if (failed === 0) {
            alert(`Alle ${successful} Leitstellen wurden erfolgreich umgeschaltet.`);
        } else {
            alert(
                `Vorgang abgeschlossen.\n\n` +
                `Erfolgreich: ${successful}\n` +
                `Fehlgeschlagen: ${failed}`
            );
        }

        setTimeout(() => {
            container.remove();
        }, 2000);
    }

    function addButton() {
        const target = document.querySelector(TARGET_SELECTOR);

        if (!target || document.getElementById(BUTTON_ID)) {
            return;
        }

        const button = document.createElement('a');

        button.id = BUTTON_ID;
        button.href = '#';
        button.className = 'btn btn-xs btn-default';
        button.textContent = 'Leitstellen umschalten';

        button.addEventListener('click', event => {
            event.preventDefault();

            if (button.dataset.running === 'true') {
                return;
            }

            button.dataset.running = 'true';
            button.classList.add('disabled');

            toggleAllCommandCenters().finally(() => {
                button.dataset.running = 'false';
                button.classList.remove('disabled');
            });
        });

        target.appendChild(button);

        console.log(`${LOG_PREFIX} Button eingefügt.`);
    }

    let addButtonTimeout = null;

    function scheduleAddButton() {
        if (addButtonTimeout) {
            clearTimeout(addButtonTimeout);
        }

        addButtonTimeout = setTimeout(() => {
            addButtonTimeout = null;
            addButton();
        }, 50);
    }

    function startObserver() {
        const observer = new MutationObserver(() => {
            scheduleAddButton();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log(`${LOG_PREFIX} MutationObserver gestartet.`);
    }

    function init() {
        addButton();
        startObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
