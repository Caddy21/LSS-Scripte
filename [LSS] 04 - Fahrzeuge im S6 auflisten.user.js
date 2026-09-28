// ==UserScript==
// @name         [LSS] 04 - Fahrzeuge im S6 auflisten
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Listet Fahrzeuge im S6 ohne Arbeitszeit auf und ermöglicht das direkte Versetzen auf S2.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        GM_xmlhttpRequest
// @connect      www.leitstellenspiel.de
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// ==/UserScript==

(function () {
    'use strict';

    const API_BASE = 'https://www.leitstellenspiel.de';
    const VEHICLES_API = '/api/v2/vehicles?limit=4000';
    const BUILDINGS_API = '/api/v2/buildings?limit=1000';
    const MODAL_Z_INDEX = 10001;
    const BACKDROP_Z_INDEX = 10000;

    let currentVehicles = [];
    let currentBuildingMap = {};
    let currentSearch = '';

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function requestJSON(url, retries = 4) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: url.startsWith('http') ? url : `${API_BASE}${url}`,
                        headers: { Accept: 'application/json' },
                        onload: resolve,
                        onerror: reject,
                        ontimeout: reject
                    });
                });

                if (response.status >= 200 && response.status < 300) return JSON.parse(response.responseText);
                if (![502, 503, 504].includes(response.status)) throw new Error(`HTTP ${response.status}`);

                console.warn(`[LSS S6] API ${response.status}, Versuch ${attempt}/${retries}`);
            } catch (error) {
                if (attempt >= retries) throw error;
                console.warn(`[LSS S6] API-Fehler, Versuch ${attempt}/${retries}`, error);
            }

            await sleep(700 * attempt);
        }

        throw new Error('API-Anfrage fehlgeschlagen.');
    }

    async function loadPagedAPI(initialUrl, label, updateLoading) {
        const results = [];
        let url = initialUrl;
        let page = 0;
        let total = null;

        while (url) {
            page++;
            const data = await requestJSON(url);

            if (!data || !Array.isArray(data.result)) throw new Error(`Ungültige Antwort der ${label}-API.`);

            const pageCount = data.result.length;
            total = data.paging?.count_total ?? total;
            const loaded = results.length + pageCount;
            const progress = total ? Math.min((loaded / total) * 100, 100) : 0;

            updateLoading(
                `${label} werden geladen … Seite ${page} mit ${pageCount.toLocaleString('de-DE')} ${label} von ${total ? total.toLocaleString('de-DE') : '?'}`,
                progress
            );

            results.push(...data.result);

            const nextPage = data.paging?.next_page;
            if (!nextPage) break;

            url = nextPage;
        }

        return results;
    }

    function createLoading() {
        document.querySelector('#lss-s6-loading')?.remove();
        document.querySelector('#lss-s6-loading-backdrop')?.remove();

        const loading = document.createElement('div');
        loading.id = 'lss-s6-loading';
        loading.className = 'modal fade in';
        loading.setAttribute('role', 'dialog');
        loading.setAttribute('aria-modal', 'true');
        loading.style.display = 'block';
        loading.style.zIndex = MODAL_Z_INDEX;

        loading.innerHTML = `
            <div class="modal-dialog modal-sm">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 class="modal-title">🚒 Daten werden geladen</h4>
                    </div>
                    <div class="modal-body">
                        <p id="lss-s6-loading-text" class="text-center">Bereite Daten vor …</p>
                        <div class="progress">
                            <div id="lss-s6-loading-progress-bar" class="progress-bar progress-bar-striped active" role="progressbar" style="width:0%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(loading);

        const backdrop = document.createElement('div');
        backdrop.id = 'lss-s6-loading-backdrop';
        backdrop.className = 'modal-backdrop fade in';
        backdrop.style.zIndex = BACKDROP_Z_INDEX;
        document.body.appendChild(backdrop);
    }

    function updateLoading(text, progress = 0) {
        const loading = document.querySelector('#lss-s6-loading');
        if (!loading) return;

        const textElement = loading.querySelector('#lss-s6-loading-text');
        const progressBar = loading.querySelector('#lss-s6-loading-progress-bar');

        if (textElement) textElement.textContent = text;
        if (progressBar) progressBar.style.width = `${progress}%`;
    }

    function closeLoading() {
        document.querySelector('#lss-s6-loading')?.remove();
        document.querySelector('#lss-s6-loading-backdrop')?.remove();
    }

    async function loadBuildingsAndVehicles() {
        createLoading();

        try {
            updateLoading('Wachen werden geladen …', 0);
            const buildings = await loadPagedAPI(BUILDINGS_API, 'Wachen', updateLoading);
            const buildingMap = {};

            buildings.forEach(building => {
                buildingMap[building.id] = building.caption || `Wache ${building.id}`;
            });

            updateLoading('Fahrzeuge werden geladen …', 0);
            const vehicles = await loadPagedAPI(VEHICLES_API, 'Fahrzeuge', updateLoading);

            const status6Vehicles = vehicles.filter(vehicle =>
                                                    Number(vehicle.fms_real) === 6 &&
                                                    Number(vehicle.working_hour_start) === 0 &&
                                                    Number(vehicle.working_hour_end) === 0
                                                   );

            closeLoading();

            if (!status6Vehicles.length) {
                showInfoModal(
                    'Keine Fahrzeuge im Status 6',
                    'Aktuell befinden sich keine Fahrzeuge im Status 6 ohne eingestellte Arbeitszeit.'
                );
                return;
            }

            currentVehicles = status6Vehicles;
            currentBuildingMap = buildingMap;
            currentSearch = '';

            openOverlay();
        } catch (error) {
            console.error('[LSS S6] Fehler beim Laden:', error);
            closeLoading();

            showInfoModal(
                'Fehler beim Laden',
                `Die Fahrzeug- oder Wachdaten konnten nicht geladen werden.<br><br><small>${escapeHTML(error.message || 'Unbekannter Fehler')}</small>`
            );
        }
    }

    function openOverlay() {
        closeOverlay();

        const overlay = document.createElement('div');
        overlay.id = 'lss-s6-overlay';
        overlay.className = 'modal fade in';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.style.display = 'block';
        overlay.style.zIndex = MODAL_Z_INDEX;
        overlay.style.overflowY = 'auto';

        overlay.innerHTML = `
            <div class="modal-dialog modal-lg" style="height:calc(100vh - 40px);">
                <div class="modal-content" style="height:100%; display:flex; flex-direction:column;">
                    <div class="modal-header">
                        <button type="button" class="close" id="lss-s6-close"><span>&times;</span></button>
                        <h4 class="modal-title">🚨 Fahrzeuge im Status 6</h4>
                    </div>

                    <div class="modal-body" style="display:flex; flex-direction:column; min-height:0; flex:1;">
                        <div class="row">
                            <div class="col-sm-7">
                                <div class="input-group">
                                    <span class="input-group-addon">🔎</span>
                                    <input type="search" class="form-control" id="lss-s6-search" placeholder="Fahrzeug oder Wache suchen …" autocomplete="off">
                                </div>
                            </div>

                            <div class="col-sm-5 text-right">
                                <span class="label label-default">Fahrzeuge <strong id="lss-s6-total">${currentVehicles.length}</strong></span>
                                <span class="label label-primary">Angezeigt <strong id="lss-s6-visible">${currentVehicles.length}</strong></span>
                            </div>
                        </div>
                        <div class="btn-toolbar">
                            <div class="btn-group">
                                <button type="button" class="btn btn-success" id="lss-s6-all-s2">🚨 Alle auf S2</button>
                            </div>
                        </div>
                        <hr>
                        <div class="table-responsive" style="flex:1; min-height:0; overflow-y:auto; overflow-x:auto;">
                            <table id="lss-s6-table" class="table table-striped table-hover table-condensed">
                                <thead>
                                    <tr>
                                        <th>Fahrzeug</th>
                                        <th>Wache</th>
                                        <th>Status</th>
                                        <th class="text-right">Aktion</th>
                                    </tr>
                                </thead>
                                <tbody id="lss-s6-table-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const backdrop = document.createElement('div');
        backdrop.id = 'lss-s6-backdrop';
        backdrop.className = 'modal-backdrop fade in';
        backdrop.style.zIndex = BACKDROP_Z_INDEX;
        document.body.appendChild(backdrop);

        document.querySelector('#lss-s6-close')?.addEventListener('click', closeOverlay);
        document.querySelector('#lss-s6-all-s2')?.addEventListener('click', setAllVehiclesToS2);
        document.querySelector('#lss-s6-search')?.addEventListener('input', event => {
            currentSearch = event.target.value.trim().toLowerCase();
            renderTable();
        });

        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeOverlay();
        });

        document.addEventListener('keydown', handleEscape);
        renderTable();
    }

    function renderTable() {
        const tableBody = document.querySelector('#lss-s6-table-body');
        const visibleCounter = document.querySelector('#lss-s6-visible');
        const totalCounter = document.querySelector('#lss-s6-total');

        if (!tableBody) return;

        const filteredVehicles = currentVehicles
        .filter(vehicle => {
            if (!currentSearch) return true;

            const buildingName = currentBuildingMap[vehicle.building_id] || 'Unbekannt';
            const searchText = [vehicle.caption, buildingName, vehicle.id, vehicle.fms_real].join(' ').toLowerCase();

            return searchText.includes(currentSearch);
        })
        .sort((a, b) => String(a.caption || '').localeCompare(String(b.caption || ''), 'de', { sensitivity: 'base' }));

        if (visibleCounter) visibleCounter.textContent = filteredVehicles.length;
        if (totalCounter) totalCounter.textContent = currentVehicles.length;

        tableBody.innerHTML = '';

        if (!filteredVehicles.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">🔎 Keine passenden Fahrzeuge gefunden.</td>
                </tr>
            `;
            return;
        }

        filteredVehicles.forEach(vehicle => {
            const row = document.createElement('tr');
            const buildingName = currentBuildingMap[vehicle.building_id] || 'Unbekannt';
            const vehicleLink = `${API_BASE}/vehicles/${vehicle.id}/zuweisung`;
            const buildingLink = `${API_BASE}/buildings/${vehicle.building_id}`;

            row.innerHTML = `
                <td>
                    <a href="${vehicleLink}" target="_blank" rel="noopener noreferrer">
                        ${escapeHTML(vehicle.caption || `Fahrzeug ${vehicle.id}`)}
                    </a>
                </td>
                <td>
                    <a href="${buildingLink}" target="_blank" rel="noopener noreferrer">
                        ${escapeHTML(buildingName)}
                    </a>
                </td>
                <td><span class="label label-danger">6</span></td>
                <td class="text-right">
                    <button type="button" class="btn btn-success btn-xs lss-s6-action" data-id="${vehicle.id}">In S2 versetzen</button>
                </td>
            `;

            const button = row.querySelector('.lss-s6-action');
            button?.addEventListener('click', () => changeVehicleStatus(vehicle.id, vehicle.caption, button));

            tableBody.appendChild(row);
        });
    }

    async function changeVehicleStatus(vehicleId, vehicleCaption, button) {
        if (!button || button.disabled) return;

        button.disabled = true;
        button.textContent = '⏳ Wird geändert …';

        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `${API_BASE}/vehicles/${vehicleId}/set_fms/2`,
                    onload: resolve,
                    onerror: reject,
                    ontimeout: reject
                });
            });

            if (response.status !== 200) throw new Error(`HTTP ${response.status}`);

            const index = currentVehicles.findIndex(item => String(item.id) === String(vehicleId));
            if (index !== -1) currentVehicles.splice(index, 1);
            renderTable();
        } catch (error) {
            console.error(`[LSS S6] Fehler bei Statusänderung für Fahrzeug ${vehicleId}:`, error);
            button.disabled = false;
            button.textContent = 'In S2 versetzen';

            showInfoModal(
                'Statusänderung fehlgeschlagen',
                `Der Status von <strong>${escapeHTML(vehicleCaption)}</strong> konnte nicht geändert werden.`
            );
        }
    }

    async function setAllVehiclesToS2() {
        const vehiclesToChange = currentVehicles.filter(vehicle => Number(vehicle.fms_real) === 6);
        if (!vehiclesToChange.length) return;

        const button = document.querySelector('#lss-s6-all-s2');

        if (button) {
            button.disabled = true;
            button.textContent = `⏳ 0 / ${vehiclesToChange.length}`;
        }

        let changed = 0;
        let failed = 0;

        for (const vehicle of vehiclesToChange) {
            try {
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: `${API_BASE}/vehicles/${vehicle.id}/set_fms/2`,
                        onload: resolve,
                        onerror: reject,
                        ontimeout: reject
                    });
                });

                if (response.status !== 200) throw new Error(`HTTP ${response.status}`);

                const index = currentVehicles.findIndex(item => String(item.id) === String(vehicle.id));
                if (index !== -1) currentVehicles.splice(index, 1);

                changed++;

                if (button) button.textContent = `⏳ ${changed} / ${vehiclesToChange.length}`;

                renderTable();

                await sleep(300);
            } catch (error) {
                failed++;
                console.error(`[LSS S6] Fehler bei Fahrzeug ${vehicle.id}:`, error);
            }
        }

        renderTable();

        if (button) {
            button.textContent = failed
                ? `⚠️ ${changed} auf S2, ${failed} Fehler`
            : `✓ ${changed} Fahrzeuge auf S2`;

            button.classList.remove('btn-warning');
            button.classList.add(failed ? 'btn-danger' : 'btn-success');

            setTimeout(() => {
                const currentButton = document.querySelector('#lss-s6-all-s2');
                if (!currentButton) return;

                currentButton.disabled = false;
                currentButton.textContent = '🚨 Alle auf S2';
                currentButton.classList.remove('btn-success', 'btn-danger');
                currentButton.classList.add('btn-warning');
            }, 2500);
        }
    }

    function showInfoModal(title, message) {
        document.querySelector('#lss-s6-info')?.remove();
        document.querySelector('#lss-s6-info-backdrop')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'lss-s6-info';
        overlay.className = 'modal fade in';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.style.display = 'block';
        overlay.style.zIndex = MODAL_Z_INDEX + 1;

        overlay.innerHTML = `
            <div class="modal-dialog modal-sm">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" id="lss-s6-info-close"><span>&times;</span></button>
                        <h4 class="modal-title">ℹ️ ${escapeHTML(title)}</h4>
                    </div>
                    <div class="modal-body text-center">${message}</div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const backdrop = document.createElement('div');
        backdrop.id = 'lss-s6-info-backdrop';
        backdrop.className = 'modal-backdrop fade in';
        backdrop.style.zIndex = MODAL_Z_INDEX;
        document.body.appendChild(backdrop);

        overlay.querySelector('#lss-s6-info-close')?.addEventListener('click', () => {
            overlay.remove();
            backdrop.remove();
        });

        overlay.addEventListener('click', event => {
            if (event.target === overlay) {
                overlay.remove();
                backdrop.remove();
            }
        });
    }

    function closeOverlay() {
        document.querySelector('#lss-s6-overlay')?.remove();
        document.querySelector('#lss-s6-backdrop')?.remove();
        document.removeEventListener('keydown', handleEscape);
    }

    function handleEscape(event) {
        if (event.key === 'Escape') closeOverlay();
    }

    function escapeHTML(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function insertButton() {
        if (document.querySelector('#lss-s6-button')) return;

        const buildingPanelBody = document.querySelector('#building_panel_body');

        if (!buildingPanelBody) {
            console.warn('[LSS S6] #building_panel_body nicht gefunden.');
            return;
        }

        const button = document.createElement('button');
        button.id = 'lss-s6-button';
        button.type = 'button';
        button.className = 'btn btn-primary';
        button.innerHTML = '🚨 Fahrzeuge im S6';
        button.addEventListener('click', loadBuildingsAndVehicles);

        buildingPanelBody.appendChild(button);
    }

    window.addEventListener('load', insertButton);
})();
