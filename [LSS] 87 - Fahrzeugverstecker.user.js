// ==UserScript==
// @name         [LSS] Fahrzeugverstecker
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Alle Fahrzeuglisten der Gebäudeübersicht anzeigen oder ausblenden
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
    'use strict';

    const CONFIG = {
        delay: 250,
        debug: false
    };

    const log = (...args) => {
        if (CONFIG.debug) console.log('[LSS Fahrzeuglisten]', ...args);
    };

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    function getBuildings() {
        return [...document.querySelectorAll('li.building_list_li')]
            .filter(building =>
                building.querySelector('img.building_marker_image') &&
                building.querySelector('.building_list_vehicles')
            );
    }

    function isHidden(building) {
        const list = building.querySelector('.building_list_vehicles');
        return !list || list.style.display === 'none';
    }

    async function toggleBuildings(show) {
        const buildings = getBuildings();
        const buttons = document.querySelectorAll('.lss-vehicle-toggle');
        const status = document.querySelector('#lss-vehicle-status');

        buttons.forEach(button => button.disabled = true);

        let changed = 0;
        let skipped = 0;

        try {
            for (let i = 0; i < buildings.length; i++) {
                const building = buildings[i];

                if (isHidden(building) === show) {
                    const icon = building.querySelector('img.building_marker_image');

                    if (icon) {
                        icon.click();
                        changed++;

                        log(show ? 'Anzeigen:' : 'Ausblenden:', building.id);

                        await sleep(CONFIG.delay);
                    }
                } else {
                    skipped++;
                }

                if (status) {
                    status.textContent =
                        `Bearbeite ${i + 1} / ${buildings.length} Gebäude ...`;
                }
            }

            if (status) {
                status.textContent =
                    `Fertig! ${changed} geändert, ${skipped} unverändert.`;
            }

        } finally {
            buttons.forEach(button => button.disabled = false);
        }
    }

    function createControls() {
        const group = document.querySelector('#btn-group-building-select');

        if (!group || document.querySelector('#lss-vehicle-show')) return;

        const showButton = document.createElement('button');
        showButton.type = 'button';
        showButton.id = 'lss-vehicle-show';
        showButton.className = 'btn btn-xs btn-default lss-vehicle-toggle';
        showButton.textContent = 'Alle anzeigen';

        const hideButton = document.createElement('button');
        hideButton.type = 'button';
        hideButton.id = 'lss-vehicle-hide';
        hideButton.className = 'btn btn-xs btn-default lss-vehicle-toggle';
        hideButton.textContent = 'Alle ausblenden';

        const status = document.createElement('span');
        status.id = 'lss-vehicle-status';
        status.style.cssText = 'margin-left: 6px; align-self: center; font-size: 11px;';

        group.append(showButton, hideButton, status);

        showButton.addEventListener('click', () => toggleBuildings(true));
        hideButton.addEventListener('click', () => toggleBuildings(false));
    }

    createControls();

})();
