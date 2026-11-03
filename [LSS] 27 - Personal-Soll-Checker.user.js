// ==UserScript==
// @name         [LSS] Personal-Soll-Checker
// @namespace    https://www.leitstellenspiel.de/
// @version      1.4
// @description  Zeigt Personalstatus neben Gebäudenamen in der Gebäudeliste an
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    const API_URL = '/api/v2/buildings?limit=1000';

    async function fetchBuildings() {
        const buildings = [];
        let nextPage = API_URL;

        try {
            while (nextPage) {
                const response = await fetch(nextPage);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                if (Array.isArray(data.result)) {
                    buildings.push(...data.result);
                }

                nextPage = data.paging?.next_page || null;
            }

            return buildings;
        } catch (e) {
            console.error('[LSS Personal-Soll-Checker] Fehler beim Laden der Gebäude:', e);
            return [];
        }
    }

    async function highlightUnderstaffedBuildings() {
        const buildings = await fetchBuildings();
        const buildingMap = new Map(
            buildings.map(building => [String(building.id), building])
        );

        const list = document.querySelector('#building_list');
        if (!list) return;

        const entries = Array.from(list.querySelectorAll(':scope > li.building_list'));

        const sortedEntries = entries.map((element, index) => {
            const id = element.id.replace('building_list_', '');
            const building = buildingMap.get(id);

            if (!building) {
                return { element, index, missing: 0, current: 0, target: 0 };
            }

            const current = building.personal_count || 0;
            const target = building.personal_count_target || 0;
            const missing = target > 0 ? Math.max(0, target - current) : 0;

            const wrapper = element.querySelector(`#building_list_caption_${id}`);
            const link = wrapper?.querySelector('a.map_position_mover');

            wrapper?.querySelector('.personnel-missing-indicator')?.remove();

            if (missing > 0 && link) {
                const span = document.createElement('span');
                span.className = 'personnel-missing-indicator';
                span.textContent = `Personal (Aktuell ${current} / Soll ${target})`;
                span.style.marginLeft = '4px';
                span.style.fontWeight = 'bold';
                span.style.color = 'darkorange';

                link.after(span);

                element.style.backgroundColor = 'rgba(255, 140, 0, 0.12)';
                element.style.borderLeft = '4px solid darkorange';
            } else {
                element.style.backgroundColor = '';
                element.style.borderLeft = '';
            }

            return { element, index, missing };
        });

        sortedEntries.sort((a, b) =>
            b.missing - a.missing || a.index - b.index
        );

        sortedEntries.forEach(entry => list.appendChild(entry.element));
    }

    await highlightUnderstaffedBuildings();

})();
