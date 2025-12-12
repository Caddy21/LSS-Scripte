// ==UserScript==
// @name         [LSS] 46 - Personalverschieber
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Markiert freies Personal im Hintergrund.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/buildings/*/hire
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    "use strict";

    if (!window.loadedBuildings) window.loadedBuildings = [];

    async function loadPanel(buildingId) {
        const panelHeading = document.querySelector(`.personal-select-heading[building_id='${buildingId}']`);
        if (!panelHeading) return false;
        const panelBody = document.querySelector(`.panel-body[building_id='${buildingId}']`);
        if (!panelBody) return false;

        const href = panelHeading.getAttribute('href');
        if (window.loadedBuildings.includes(href)) return true;

        return new Promise(resolve => {
            $.get(href, function(data) {
                panelBody.innerHTML = data;
                window.loadedBuildings.push(href);

                const education_key = $("input[name=education]:checked").attr("education_key");
                if (education_key) {
                    schooling_disable(education_key);
                    update_schooling_free();
                }
                resolve(true);
            });
        });
    }

    async function getPersonnelRows(buildingId) {
        await loadPanel(buildingId);
        const panelBody = document.querySelector(`.panel-body[building_id='${buildingId}']`);
        const table = panelBody?.querySelector('table');
        if (!table) return [];
        return Array.from(table.querySelectorAll('tbody tr'));
    }

    function findUnused(rows) {
        return rows.filter(row => {
            const hasEducation = row.querySelector('td:nth-child(3)')?.innerText.trim() !== '';
            const assignedVehicle = row.querySelector('td:nth-child(4)')?.innerText.trim() !== '';
            return !hasEducation && !assignedVehicle;
        });
    }

    async function markUnused(buildingId, increment) {
        const rows = await getPersonnelRows(buildingId);
        if (!rows.length) return;

        const currentlyMarked = rows.filter(r => r.querySelector('input.schooling_checkbox')?.checked).length;
        const unusedRows = findUnused(rows).filter(r => !r.querySelector('input.schooling_checkbox').checked);

        const toMark = unusedRows.slice(0, increment);
        toMark.forEach(row => {
            const cb = row.querySelector('input.schooling_checkbox');
            if (cb) cb.checked = true;
        });

        updateMarkedCount(buildingId);
    }

    async function updateMarkedCount(buildingId) {
        const rows = await getPersonnelRows(buildingId);
        const countSpan = document.querySelector(`#marked_count_${buildingId}`);
        if (!countSpan) return;

        const marked = rows.filter(r => r.querySelector('input.schooling_checkbox')?.checked).length;
        countSpan.innerText = marked;

        if (marked > 0) {
            countSpan.style.backgroundColor = 'green';
            countSpan.style.color = 'white';
            countSpan.style.padding = '2px 6px';
            countSpan.style.borderRadius = '4px';
        } else {
            countSpan.style.backgroundColor = '';
            countSpan.style.color = '';
            countSpan.style.padding = '';
            countSpan.style.borderRadius = '';
        }
    }

    function createButtons() {
        document.querySelectorAll('.panel-heading.personal-select-heading').forEach(header => {
            const buildingId = header.getAttribute('building_id');
            if (!buildingId) return;
            if (header.dataset.filterButtonsAdded === '1') return;
            header.dataset.filterButtonsAdded = '1';

            const btnContainer = document.createElement('span');
            btnContainer.style.float = 'right';
            btnContainer.style.marginRight = '10px';

            const counter = document.createElement('span');
            counter.id = `marked_count_${buildingId}`;
            counter.style.marginRight = '6px';
            counter.innerText = '0';

            const btn10 = document.createElement('button');
            btn10.innerText = '10';
            btn10.className = 'btn btn-xs btn-default';
            btn10.style.marginRight = '5px';
            btn10.addEventListener('click', e => {
                e.preventDefault(); e.stopPropagation();
                markUnused(buildingId, 10);
            });

            const btn100 = document.createElement('button');
            btn100.innerText = '100';
            btn100.className = 'btn btn-xs btn-default';
            btn100.style.marginRight = '5px';
            btn100.addEventListener('click', e => {
                e.preventDefault(); e.stopPropagation();
                markUnused(buildingId, 100);
            });

            const btnDelete = document.createElement('button');
            btnDelete.innerText = 'Löschen';
            btnDelete.className = 'btn btn-xs btn-danger';
            btnDelete.addEventListener('click', e => {
                e.preventDefault(); e.stopPropagation();
                getPersonnelRows(buildingId).then(rows => {
                    rows.forEach(row => {
                        const cb = row.querySelector('input.schooling_checkbox');
                        if (cb) cb.checked = false;
                    });
                    updateMarkedCount(buildingId);
                });
            });

            btnContainer.appendChild(counter);
            btnContainer.appendChild(btn10);
            btnContainer.appendChild(btn100);
            btnContainer.appendChild(btnDelete);

            header.appendChild(btnContainer);
        });
    }

    function startObserver() {
        createButtons();
        const obs = new MutationObserver(createButtons);
        obs.observe(document.body, { childList: true, subtree: true });
    }

    startObserver();
})();
