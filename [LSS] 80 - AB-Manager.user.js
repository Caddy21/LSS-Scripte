// ==UserScript==
// @name         [LSS] AB-Einstellungen
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Verwalte die Einstellungen deiner Abrollbehältern
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BUILDINGS_API = '/api/v2/buildings';
    const LSSM_VEHICLES_API = 'https://api.lss-manager.de/de_DE/vehicles';
    const AB_SLOT_CAPTION = 'Abrollbehälter-Stellplatz';
    const EDIT_CONCURRENCY = 5;

    let vehicleTypes = {};
    let abVehicles = [];
    let selectedVehicles = new Set();
    let visibleVehicles = new Set();
    let randomSetting = 'unchanged';
    let buildingRandomSetting = 'unchanged';
    let searchValue = '';
    let modal = null;

    function fetchJson(url) {
        return fetch(url, { credentials: 'same-origin' }).then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
            return response.json();
        });
    }

    async function loadVehicleTypes() {
        const data = await fetchJson(LSSM_VEHICLES_API);
        if (Array.isArray(data)) return Object.fromEntries(data.map(type => [type.id, type]));
        return data || {};
    }

    async function loadBuildings() {
        const data = await fetchJson(BUILDINGS_API);
        const buildings = Array.isArray(data) ? data : data.result || [];
        return buildings.filter(building =>
                                building.building_type === 0 &&
                                hasAbSlot(building)
                               );
    }

    function hasAbSlot(building) {
        return Array.isArray(building.extensions) &&
            building.extensions.some(extension =>
                                     extension.caption === AB_SLOT_CAPTION &&
                                     extension.available !== false &&
                                     extension.enabled !== false
                                    );
    }

    async function loadBuildingVehicles(buildingId) {
        const data = await fetchJson(`${BUILDINGS_API}/${buildingId}/vehicles`);
        return Array.isArray(data) ? data : data.result || [];
    }

    function isAbType(type) {
        if (!type) return false;
        return type.isTrailer === true &&
            Array.isArray(type.tractiveVehicles) &&
            type.tractiveVehicles.includes(46);
    }

    async function loadAbVehicles() {
        vehicleTypes = await loadVehicleTypes();
        const buildings = await loadBuildings();
        const result = [];

        await runLimited(buildings, EDIT_CONCURRENCY, async building => {
            const vehicles = await loadBuildingVehicles(building.id);

            vehicles.forEach(vehicle => {
                const type =
                      vehicleTypes[vehicle.vehicle_type] ||
                      vehicleTypes[String(vehicle.vehicle_type)];

                if (!isAbType(type)) return;

                result.push({
                    ...vehicle,
                    buildingId: building.id,
                    buildingCaption: building.caption || `Wache ${building.id}`,
                    vehicleType: type,
                    vehicleTypeCaption: type.caption || 'Abrollbehälter',
                    tractiveRandom: vehicle.tractive_random === true,
                    tractiveBuildingRandom: null,
                    editLoaded: false,
                    editError: null,
                    needsChange: false
                });
            });
        });

        result.sort((a, b) =>
                    a.buildingCaption.localeCompare(b.buildingCaption, 'de') ||
                    a.caption.localeCompare(b.caption, 'de')
                   );

        abVehicles = result;
        selectedVehicles.clear();
        visibleVehicles = new Set(result.map(vehicle => vehicle.id));

        renderTable();
        updateSelectionState();
        updateChangeCount();
    }

    async function loadVehicleEdit(vehicleId) {
        const response = await fetch(`/vehicles/${vehicleId}/edit`, {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`Edit-Seite konnte nicht geladen werden: HTTP ${response.status}`);
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const form = doc.querySelector('form[action*="/vehicles/"]');

        if (!form) throw new Error('Fahrzeugformular nicht gefunden');

        const randomCheckbox = form.querySelector('#vehicle_tractive_random');
        const buildingRandomCheckbox = form.querySelector('#vehicle_tractive_building_random');

        if (!randomCheckbox) {
            throw new Error('Checkbox für Zufälliges Trägerfahrzeug nicht gefunden');
        }

        return {
            form,
            randomCheckbox,
            buildingRandomCheckbox
        };
    }

    async function getCurrentBuildingRandom(vehicle) {
        if (vehicle.editLoaded) return vehicle.tractiveBuildingRandom;

        const data = await loadVehicleEdit(vehicle.id);

        vehicle.tractiveRandom = data.randomCheckbox.checked;
        vehicle.tractiveBuildingRandom = data.buildingRandomCheckbox?.checked || false;
        vehicle.editLoaded = true;
        vehicle.editError = null;

        return vehicle.tractiveBuildingRandom;
    }

    function needsRandomChange(vehicle) {
        if (randomSetting === 'unchanged') return false;
        if (randomSetting === 'enable') return vehicle.tractiveRandom !== true;
        if (randomSetting === 'disable') return vehicle.tractiveRandom === true;
        return false;
    }

    async function needsBuildingRandomChange(vehicle) {
        if (buildingRandomSetting === 'unchanged') return false;

        const currentValue = await getCurrentBuildingRandom(vehicle);

        if (buildingRandomSetting === 'enable') return currentValue !== true;
        if (buildingRandomSetting === 'disable') return currentValue === true;

        return false;
    }

    async function checkVehicleNeedsChange(vehicle) {
        try {
            const randomChange = needsRandomChange(vehicle);
            let buildingRandomChange = false;

            if (buildingRandomSetting !== 'unchanged') {
                buildingRandomChange = await needsBuildingRandomChange(vehicle);
            }

            vehicle.needsChange = randomChange || buildingRandomChange;
            vehicle.editError = null;

            return vehicle.needsChange;
        } catch (error) {
            vehicle.editError = error;
            vehicle.needsChange = true;
            return true;
        }
    }

    async function filterBySettings() {
        const progress = modal?.querySelector('#ab-progress');

        if (randomSetting === 'unchanged' && buildingRandomSetting === 'unchanged') {
            visibleVehicles = new Set(abVehicles.map(vehicle => vehicle.id));
            abVehicles.forEach(vehicle => {
                vehicle.needsChange = false;
                vehicle.editError = null;
            });
            renderTable();
            updateChangeCount();
            return;
        }

        if (progress) progress.textContent = 'Prüfe notwendige Änderungen …';

        visibleVehicles.clear();

        const candidates = abVehicles.filter(vehicle => {
            return selectedVehicles.has(vehicle.id) || selectedVehicles.size === 0;
        });

        // Bei der Filterung wird bewusst unabhängig von der Auswahl geprüft.
        await runLimited(abVehicles, EDIT_CONCURRENCY, async vehicle => {
            const needsChange = await checkVehicleNeedsChange(vehicle);

            if (needsChange) {
                visibleVehicles.add(vehicle.id);
            }
        });

        // Bereits ausgewählte ABs bleiben sichtbar, auch wenn sie nach der
        // aktuellen Prüfung nicht mehr geändert werden müssten.
        selectedVehicles.forEach(vehicleId => {
            if (abVehicles.some(vehicle => vehicle.id === vehicleId)) {
                visibleVehicles.add(vehicleId);
            }
        });

        renderTable();
        updateSelectionState();
        updateChangeCount();

        if (progress) {
            const changes = abVehicles.filter(vehicle =>
                                              visibleVehicles.has(vehicle.id) &&
                                              vehicle.needsChange
                                             ).length;

            progress.textContent =
                `${changes} AB benötigen eine Änderung.`;
        }
    }

    async function saveVehicleSettings(vehicle, randomValue, buildingRandomValue) {
        const data = await loadVehicleEdit(vehicle.id);

        const currentRandom = data.randomCheckbox.checked;
        const currentBuildingRandom = data.buildingRandomCheckbox?.checked || false;

        const randomChanged =
              randomValue !== null &&
              currentRandom !== randomValue;

        const buildingRandomChanged =
              buildingRandomValue !== null &&
              data.buildingRandomCheckbox &&
              currentBuildingRandom !== buildingRandomValue;

        if (!randomChanged && !buildingRandomChanged) {
            vehicle.tractiveRandom = currentRandom;
            vehicle.tractiveBuildingRandom = currentBuildingRandom;
            vehicle.editLoaded = true;
            vehicle.editError = null;
            return { changed: false, skipped: true };
        }

        const formData = new FormData(data.form);
        formData.set('_method', 'patch');

        if (randomValue !== null) {
            formData.delete('vehicle[tractive_random]');
            formData.append('vehicle[tractive_random]', '0');
            if (randomValue) formData.append('vehicle[tractive_random]', '1');
        }

        if (buildingRandomValue !== null && data.buildingRandomCheckbox) {
            formData.delete('vehicle[tractive_building_random]');
            formData.append('vehicle[tractive_building_random]', '0');
            if (buildingRandomValue) {
                formData.append('vehicle[tractive_building_random]', '1');
            }
        }

        const action =
              data.form.getAttribute('action') ||
              `/vehicles/${vehicle.id}`;

        const response = await fetch(action, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`Speichern fehlgeschlagen: HTTP ${response.status}`);
        }

        vehicle.tractiveRandom =
            randomValue !== null ? randomValue : currentRandom;

        vehicle.tractiveBuildingRandom =
            buildingRandomValue !== null && data.buildingRandomCheckbox
            ? buildingRandomValue
        : currentBuildingRandom;

        vehicle.editLoaded = true;
        vehicle.editError = null;

        return { changed: true, skipped: false };
    }

    async function runLimited(items, concurrency, worker) {
        let index = 0;

        async function runWorker() {
            while (true) {
                const currentIndex = index++;

                if (currentIndex >= items.length) return;

                await worker(items[currentIndex]);
            }
        }

        await Promise.all(
            Array.from(
                { length: Math.min(concurrency, items.length) },
                () => runWorker()
            )
        );
    }

    function getBuildings() {
        const buildings = new Map();

        abVehicles.forEach(vehicle => {
            if (!visibleVehicles.has(vehicle.id)) return;

            if (!buildings.has(vehicle.buildingId)) {
                buildings.set(vehicle.buildingId, {
                    id: vehicle.buildingId,
                    caption: vehicle.buildingCaption,
                    vehicles: []
                });
            }

            buildings.get(vehicle.buildingId).vehicles.push(vehicle);
        });

        return [...buildings.values()];
    }

    function getStatusHtml(vehicle) {
        if (vehicle.editError) {
            return '<span class="ab-status error">⚠ Fehler</span>';
        }

        if (vehicle.needsChange) {
            return '<span class="ab-status change">● Änderung</span>';
        }

        return '<span class="ab-status ok">● OK</span>';
    }

    function getRandomStatus(vehicle) {
        if (vehicle.tractiveRandom) {
            return '<span class="ab-status active">● Aktiv</span>';
        }

        return '<span class="ab-status off">● Aus</span>';
    }

    function getBuildingRandomStatus(vehicle) {
        if (vehicle.tractiveRandom !== true) {
            return '<span class="ab-status neutral">—</span>';
        }

        if (vehicle.tractiveBuildingRandom === null) {
            return '<span class="ab-status neutral">—</span>';
        }

        return vehicle.tractiveBuildingRandom
            ? '<span class="ab-status active">● Aktiv</span>'
        : '<span class="ab-status off">● Aus</span>';
    }

    function updateSelectionState() {
        if (!modal) return;

        const visibleIds = [...visibleVehicles];
        const selectedVisible = visibleIds.filter(id => selectedVehicles.has(id));
        const master = modal.querySelector('#ab-select-all');

        if (master) {
            master.checked =
                visibleIds.length > 0 &&
                selectedVisible.length === visibleIds.length;

            master.indeterminate = false;
        }

        modal.querySelectorAll('.ab-building-select').forEach(checkbox => {
            const buildingId = Number(checkbox.dataset.buildingId);
            const buildingVehicles = abVehicles.filter(vehicle =>
                                                       vehicle.buildingId === buildingId &&
                                                       visibleVehicles.has(vehicle.id)
                                                      );

            const selectedCount = buildingVehicles.filter(vehicle =>
                                                          selectedVehicles.has(vehicle.id)
                                                         ).length;

            checkbox.checked =
                buildingVehicles.length > 0 &&
                selectedCount === buildingVehicles.length;

            checkbox.indeterminate =
                selectedCount > 0 &&
                selectedCount < buildingVehicles.length;
        });

        modal.querySelectorAll('.ab-vehicle-select').forEach(checkbox => {
            checkbox.checked =
                selectedVehicles.has(Number(checkbox.dataset.vehicleId));
        });
    }

    function updateChangeCount() {
        if (!modal) return;

        const selectedCount = selectedVehicles.size;
        const changeCount = abVehicles.filter(vehicle =>
                                              selectedVehicles.has(vehicle.id) &&
                                              vehicle.needsChange
                                             ).length;

        const visibleChangeCount = abVehicles.filter(vehicle =>
                                                     visibleVehicles.has(vehicle.id) &&
                                                     vehicle.needsChange
                                                    ).length;

        const element = modal.querySelector('#ab-selection-info');

        if (element) {
            element.textContent =
                `${selectedCount} ausgewählt · ${visibleChangeCount} benötigen Änderung`;
        }
    }

    function renderTable() {
        const tableBody = modal?.querySelector('#ab-table-body');

        if (!tableBody) return;

        const buildings = getBuildings();

        tableBody.innerHTML = buildings.map(building => {
            const open = localStorage.getItem(`ab-settings-building-${building.id}`) === 'open';

            return `
                <div class="ab-building ${open ? 'open' : ''}">
                    <div class="ab-building-header">
                        <button
                            type="button"
                            class="ab-building-toggle"
                            data-building-id="${building.id}">
                            ${open ? '▾' : '▸'}
                        </button>
                        <label>
                            <input
                                type="checkbox"
                                class="ab-building-select"
                                data-building-id="${building.id}">
                            <strong>${escapeHtml(building.caption)}</strong>
                            <span class="ab-building-count">
                                (${building.vehicles.length})
                            </span>
                        </label>
                    </div>

                    <div class="ab-building-vehicles">
                        ${building.vehicles.map(vehicle => `
                            <div
                                class="ab-row ${vehicle.needsChange ? 'needs-change' : ''}"
                                data-search-text="${escapeHtml(
                `${building.caption} ${vehicle.caption}`.toLowerCase()
            )}">
                                <div class="ab-name">
                                    <label>
                                        <input
                                            type="checkbox"
                                            class="ab-vehicle-select"
                                            data-vehicle-id="${vehicle.id}">
                                        <span>${escapeHtml(vehicle.caption)}</span>
                                    </label>
                                </div>
                                <div>${getRandomStatus(vehicle)}</div>
                                <div>${getBuildingRandomStatus(vehicle)}</div>
                                <div>${getStatusHtml(vehicle)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        modal.querySelectorAll('.ab-building-toggle').forEach(button => {
            button.addEventListener('click', () => {
                const buildingId = Number(button.dataset.buildingId);
                const building = button.closest('.ab-building');
                const isOpen = building.classList.toggle('open');

                button.textContent = isOpen ? '▾' : '▸';
                localStorage.setItem(
                    `ab-settings-building-${buildingId}`,
                    isOpen ? 'open' : 'closed'
                );
            });
        });

        applySearch();
        updateSelectionState();
    }

    function applySearch() {
        if (!modal) return;

        const search = searchValue.trim().toLowerCase();

        modal.querySelectorAll('.ab-building').forEach(building => {
            const rows = [...building.querySelectorAll('.ab-row')];
            let visibleCount = 0;

            rows.forEach(row => {
                const text = row.dataset.searchText || '';
                const visible = !search || text.includes(search);

                row.style.display = visible ? '' : 'none';

                if (visible) visibleCount++;
            });

            building.style.display = visibleCount ? '' : 'none';
        });

        updateSelectionState();
    }

    function selectBuilding(buildingId, checked) {
        abVehicles
            .filter(vehicle =>
                    vehicle.buildingId === buildingId &&
                    visibleVehicles.has(vehicle.id)
                   )
            .forEach(vehicle => {
            if (checked) {
                selectedVehicles.add(vehicle.id);
            } else {
                selectedVehicles.delete(vehicle.id);
            }
        });

        updateSelectionState();
        updateChangeCount();
    }

    function selectAll(checked) {
        visibleVehicles.forEach(vehicleId => {
            if (checked) {
                selectedVehicles.add(vehicleId);
            } else {
                selectedVehicles.delete(vehicleId);
            }
        });

        updateSelectionState();
        updateChangeCount();
    }

    function setSetting(setting, value) {
        if (setting === 'random') {
            randomSetting = value;
        } else {
            buildingRandomSetting = value;
        }

        selectedVehicles.clear();

        filterBySettings();
    }

    async function applySettings() {
        const selected = abVehicles.filter(vehicle =>
                                           selectedVehicles.has(vehicle.id)
                                          );

        if (!selected.length) {
            alert('Es wurden keine AB ausgewählt.');
            return;
        }

        if (randomSetting === 'unchanged' &&
            buildingRandomSetting === 'unchanged') {
            alert('Es wurde keine Einstellung zum Ändern ausgewählt.');
            return;
        }

        const progress = modal.querySelector('#ab-progress');
        const applyButton = modal.querySelector('#ab-apply');

        applyButton.disabled = true;
        progress.textContent = 'Prüfe notwendige Änderungen …';

        try {
            const candidates = [];

            await runLimited(selected, EDIT_CONCURRENCY, async vehicle => {
                if (await checkVehicleNeedsChange(vehicle)) {
                    candidates.push(vehicle);
                }
            });

            if (!candidates.length) {
                progress.textContent = 'Keine Änderungen erforderlich.';
                return;
            }

            let completed = 0;
            let changed = 0;
            let errors = 0;

            progress.textContent =
                `0 von ${candidates.length} bearbeitet …`;

            await runLimited(candidates, EDIT_CONCURRENCY, async vehicle => {
                try {
                    const randomValue =
                          randomSetting === 'enable'
                    ? true
                    : randomSetting === 'disable'
                    ? false
                    : null;

                    const buildingRandomValue =
                          buildingRandomSetting === 'enable'
                    ? true
                    : buildingRandomSetting === 'disable'
                    ? false
                    : null;

                    const result = await saveVehicleSettings(
                        vehicle,
                        randomValue,
                        buildingRandomValue
                    );

                    if (result.changed) changed++;

                    vehicle.needsChange = false;
                } catch (error) {
                    vehicle.editError = error;
                    errors++;
                }

                completed++;

                progress.textContent =
                    `${completed} von ${candidates.length} bearbeitet · ${changed} geändert${errors ? ` · ${errors} Fehler` : ''}`;

                renderTable();
            });

            selectedVehicles.clear();

            if (randomSetting !== 'unchanged' ||
                buildingRandomSetting !== 'unchanged') {
                await filterBySettings();
            } else {
                renderTable();
            }

            progress.textContent =
                `${completed} von ${candidates.length} bearbeitet · ${changed} geändert${errors ? ` · ${errors} Fehler` : ''}`;
        } finally {
            applyButton.disabled = false;
        }
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function createModal() {
        modal = document.createElement('div');
        modal.id = 'ab-settings-modal';

        modal.innerHTML = `
            <div class="ab-modal-backdrop"></div>

            <div class="ab-modal">
                <div class="ab-modal-header">
                    <h2>AB-Einstellungen</h2>
                    <button type="button" id="ab-close">×</button>
                </div>

                <div class="ab-controls">
                    <input
                        type="search"
                        id="ab-search"
                        placeholder="AB oder Wache suchen …">

                    <div class="ab-setting">
                        <strong>Zufälliges Trägerfahrzeug</strong>
                        <label>
                            <input type="radio" name="ab-random" value="unchanged" checked>
                            Nicht ändern
                        </label>
                        <label>
                            <input type="radio" name="ab-random" value="enable">
                            Aktivieren
                        </label>
                        <label>
                            <input type="radio" name="ab-random" value="disable">
                            Deaktivieren
                        </label>
                    </div>

                    <div class="ab-setting">
                        <strong>Trägerfahrzeug von anderer Wache</strong>
                        <label>
                            <input type="radio" name="ab-building-random" value="unchanged" checked>
                            Nicht ändern
                        </label>
                        <label>
                            <input type="radio" name="ab-building-random" value="enable">
                            Aktivieren
                        </label>
                        <label>
                            <input type="radio" name="ab-building-random" value="disable">
                            Deaktivieren
                        </label>
                    </div>

                    <div class="ab-selection-bar">
                        <label>
                            <input type="checkbox" id="ab-select-all">
                            Alle sichtbaren auswählen
                        </label>

                        <button type="button" id="ab-select-none">
                            Keine auswählen
                        </button>

                        <span id="ab-selection-info"></span>
                    </div>
                </div>

                <div class="ab-table">
                    <div class="ab-table-header">
                        <div>Wachen mit Abrollbehältern</div>
                        <div>Zufälliges Trägerfahrzeug</div>
                        <div>Andere Wache</div>
                        <div>Status</div>
                    </div>

                    <div id="ab-table-body"></div>
                </div>

                <div class="ab-footer">
                    <div id="ab-progress"></div>

                    <div class="ab-buttons">
                        <button type="button" id="ab-reload">
                            ↻ AB neu laden
                        </button>

                        <button type="button" id="ab-apply">
                            Einstellungen anwenden
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        bindModalEvents();
        renderTable();
        updateChangeCount();
    }

    function bindModalEvents() {
        modal.querySelector('#ab-close').addEventListener('click', closeModal);
        modal.querySelector('.ab-modal-backdrop').addEventListener('click', closeModal);

        modal.querySelector('#ab-select-all').addEventListener('change', event => {
            selectAll(event.target.checked);
        });

        modal.querySelector('#ab-select-none').addEventListener('click', () => {
            selectAll(false);
        });

        modal.querySelector('#ab-search').addEventListener('input', event => {
            searchValue = event.target.value;
            applySearch();
        });

        modal.querySelectorAll('input[name="ab-random"]').forEach(input => {
            input.addEventListener('change', event => {
                setSetting('random', event.target.value);
            });
        });

        modal.querySelectorAll('input[name="ab-building-random"]').forEach(input => {
            input.addEventListener('change', event => {
                setSetting('buildingRandom', event.target.value);
            });
        });

        modal.querySelector('#ab-reload').addEventListener('click', async () => {
            const progress = modal.querySelector('#ab-progress');
            progress.textContent = 'AB werden geladen …';

            try {
                await loadAbVehicles();
                progress.textContent = `${abVehicles.length} AB geladen.`;
            } catch (error) {
                progress.textContent = `Fehler: ${error.message}`;
                console.error('[AB-Einstellungen]', error);
            }
        });

        modal.querySelector('#ab-apply').addEventListener('click', applySettings);

        modal.addEventListener('change', event => {
            if (event.target.classList.contains('ab-building-select')) {
                selectBuilding(
                    Number(event.target.dataset.buildingId),
                    event.target.checked
                );
            }

            if (event.target.classList.contains('ab-vehicle-select')) {
                const vehicleId = Number(event.target.dataset.vehicleId);

                if (event.target.checked) {
                    selectedVehicles.add(vehicleId);
                } else {
                    selectedVehicles.delete(vehicleId);
                }

                updateSelectionState();
                updateChangeCount();
            }
        });
    }

    function openModal() {
        if (!modal) createModal();

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        if (!abVehicles.length) {
            loadAbVehicles().catch(error => {
                const progress = modal.querySelector('#ab-progress');
                progress.textContent = `Fehler: ${error.message}`;
                console.error('[AB-Einstellungen]', error);
            });
        }
    }

    function closeModal() {
        if (!modal) return;

        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    function createOpenButton() {
        if (document.querySelector('#ab-settings-menu')) return;

        const menu = document.querySelector('#menu_profile + .dropdown-menu');
        if (!menu) return;

        const item = document.createElement('li');
        item.id = 'ab-settings-menu';
        item.setAttribute('role', 'presentation');
        item.innerHTML = `<a href="#" role="menuitem" title="Abrollbehälter-Manager"><span class="glyphicon glyphicon-random"></span>&nbsp;&nbsp; Abrollbehälter-Manager</a>`;

        item.querySelector('a').addEventListener('click', event => {
            event.preventDefault();
            openModal();
        });

        menu.appendChild(item);
    }

    function addStyles() {
        const style = document.createElement('style');

        style.textContent = `
            #ab-settings-button {
                position: fixed;
                right: 20px;
                bottom: 20px;
                width: 48px;
                height: 48px;
                border: 0;
                border-radius: 50%;
                background: #222;
                color: #fff;
                font-size: 24px;
                cursor: pointer;
                z-index: 99998;
                box-shadow: 0 3px 12px rgba(0,0,0,.4);
            }

            #ab-settings-modal {
                position: fixed;
                inset: 0;
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                font-family: Arial, sans-serif;
            }

            .ab-modal-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(0,0,0,.7);
            }

            .ab-modal {
                position: relative;
                width: min(1250px, calc(100vw - 30px));
                max-height: calc(100vh - 30px);
                display: flex;
                flex-direction: column;
                background: #1e1e1e;
                color: #eee;
                border: 1px solid #444;
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0,0,0,.7);
                overflow: hidden;
            }

            .ab-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: #292929;
                border-bottom: 1px solid #444;
            }

            .ab-modal-header h2 {
                margin: 0;
                font-size: 20px;
            }

            #ab-close {
                border: 0;
                background: transparent;
                color: #fff;
                font-size: 28px;
                cursor: pointer;
            }

            .ab-controls {
                padding: 12px 16px;
                border-bottom: 1px solid #444;
            }

            #ab-search {
                width: 100%;
                box-sizing: border-box;
                margin-bottom: 12px;
                padding: 8px 10px;
                border: 1px solid #555;
                border-radius: 4px;
                background: #111;
                color: #fff;
            }

            .ab-setting {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
                margin: 7px 0;
            }

            .ab-setting strong {
                min-width: 250px;
            }

            .ab-selection-bar {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px solid #444;
            }

            .ab-selection-bar button {
                padding: 5px 9px;
                border: 1px solid #555;
                border-radius: 4px;
                background: #333;
                color: #eee;
                cursor: pointer;
            }

            #ab-selection-info {
                margin-left: auto;
                color: #bbb;
            }

            .ab-table {
                overflow: auto;
                flex: 1;
            }

            .ab-table-header {
                position: sticky;
                top: 0;
                z-index: 3;
                display: grid;
                grid-template-columns: minmax(300px, 2fr) 180px 180px 140px;
                gap: 10px;
                align-items: center;
                padding: 9px 16px;
                background: #303030;
                color: #bbb;
                font-size: 12px;
                font-weight: bold;
            }

            .ab-building {
                border-top: 1px solid #444;
            }

            .ab-building-header {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 9px 16px;
                background: #272727;
            }

            .ab-building-header label {
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 7px;
            }

            .ab-building-toggle {
                width: 24px;
                height: 24px;
                padding: 0;
                border: 0;
                background: transparent;
                color: #ddd;
                cursor: pointer;
                font-size: 16px;
            }

            .ab-building-count {
                color: #888;
                font-size: 12px;
            }

            .ab-building-vehicles {
                display: none;
            }

            .ab-building.open .ab-building-vehicles {
                display: block;
            }

            .ab-row {
                display: grid;
                grid-template-columns: minmax(300px, 2fr) 180px 180px 140px;
                gap: 10px;
                align-items: center;
                min-height: 42px;
                padding: 5px 16px 5px 45px;
                border-top: 1px solid #333;
            }

            .ab-row.needs-change {
                background: rgba(255,193,7,.06);
            }

            .ab-name label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
            }

            .ab-status {
                display: inline-block;
                padding: 3px 7px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
            }

            .ab-status.active {
                background: #174d2a;
                color: #7ee2a8;
            }

            .ab-status.off {
                background: #4d1d1d;
                color: #ff8888;
            }

            .ab-status.neutral {
                color: #999;
            }

            .ab-status.change {
                background: #594b17;
                color: #ffd85c;
            }

            .ab-status.error {
                background: #632323;
                color: #ffaaaa;
            }

            .ab-status.ok {
                background: #174d2a;
                color: #7ee2a8;
            }

            .ab-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 15px;
                padding: 10px 16px;
                background: #292929;
                border-top: 1px solid #444;
            }

            #ab-progress {
                color: #bbb;
            }

            .ab-buttons {
                display: flex;
                gap: 8px;
            }

            .ab-buttons button {
                padding: 8px 12px;
                border: 1px solid #555;
                border-radius: 4px;
                background: #333;
                color: #eee;
                cursor: pointer;
            }

            .ab-buttons button:hover,
            .ab-selection-bar button:hover {
                background: #444;
            }

            .ab-buttons button:disabled {
                opacity: .5;
                cursor: default;
            }

            @media (max-width: 900px) {
                .ab-table-header {
                    display: none;
                }

                .ab-row {
                    grid-template-columns: 1fr 1fr;
                    padding-left: 30px;
                }

                #ab-selection-info {
                    width: 100%;
                    margin-left: 0;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function init() {
        addStyles();
        createOpenButton();
    }

    init();
})();
