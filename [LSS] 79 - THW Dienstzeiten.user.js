// ==UserScript==
// @name         [LSS] THW Anhänger Arbeitszeit-Manager
// @namespace    https://leitstellenspiel.de/
// @version      2.0
// @description  THW Bootanhänger mit festen Arbeitszeiten versehen
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @match        https://polizei.leitstellenspiel.de/
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    const VEHICLE_TYPES = {
        68: 'Anh MzAB',
        66: 'Anh MzB',
        67: 'Anh SchlB'
    };

    // Feste Arbeitszeiten
    const WORKING_HOURS = {
        68: { start: 0, end: 8 },
        66: { start: 8, end: 16 },
        67: { start: 16, end: 0 }
    };

    const API_URL = '/api/v2/vehicles?limit=2000';
    const CACHE_KEY = 'thw_working_hours_vehicle_cache';
    const CACHE_DURATION = 10 * 60 * 1000;

    let vehicles = [];
    let filteredVehicles = [];
    let updateCancelled = false;
    let updateRunning = false;

    GM_addStyle(`
        #thw-working-hours-modal {
            z-index: 10002 !important;
        }

        #thw-working-hours-modal + .modal-backdrop {
            z-index: 10001 !important;
        }

        #thw-working-hours-modal .modal-dialog {
            width: 1100px;
            max-width: calc(100% - 30px);
            margin: 55px auto 20px;
        }

        #thw-working-hours-modal .modal-content {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 75px);
            max-height: calc(100vh - 75px);
            border: 0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 15px 50px rgba(0,0,0,.35);
        }

        #thw-working-hours-modal .modal-header {
            flex: 0 0 auto;
            padding: 16px 20px;
            border-bottom: 1px solid #e5e5e5;
        }

        #thw-working-hours-modal .modal-title {
            font-size: 18px;
            font-weight: 600;
        }

        #thw-working-hours-modal .modal-title .glyphicon {
            margin-right: 7px;
        }

        #thw-working-hours-modal .modal-body {
            flex: 1 1 auto;
            min-height: 0;
            padding: 16px 20px;
            overflow: hidden;
        }

        #thw-content {
            display: flex;
            flex-direction: column;
            height: 100%;
            min-height: 0;
        }

        .thw-settings {
            flex: 0 0 auto;
            margin-bottom: 10px;
            padding: 12px 14px;
            border: 1px solid #ddd;
            border-radius: 9px;
        }

        .thw-settings-title {
            margin-bottom: 10px;
            font-size: 15px;
            font-weight: 600;
        }

        .thw-settings-row {
            display: flex;
            align-items: flex-end;
            gap: 12px;
            width: 100%;
        }

        .thw-settings-row .form-group {
            flex: 1 1 0;
            margin: 0;
        }

        .thw-settings-row .form-control {
            width: 100%;
        }

        #thw-summary {
            flex: 0 0 auto;
            margin: 0 0 8px;
            font-size: 13px;
            font-weight: 600;
            opacity: .75;
        }

        #thw-progress {
            display: none;
            flex: 0 0 auto;
            margin: 0 0 10px;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }

        #thw-progress .thw-progress-header,
        #thw-progress .thw-progress-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        }

        #thw-progress .thw-progress-header {
            margin-bottom: 7px;
            font-size: 12px;
        }

        #thw-progress-percent {
            font-weight: 700;
        }

        #thw-progress .progress {
            height: 12px;
            margin: 0;
            border-radius: 10px;
            overflow: hidden;
            background: #e9ecef;
        }

        #thw-progress-bar {
            width: 0;
            min-width: 0;
            transition: width .25s ease;
        }

        #thw-progress .thw-progress-info {
            margin-top: 6px;
            font-size: 11px;
            opacity: .7;
        }

        .thw-table-wrapper {
            flex: 1 1 auto;
            min-height: 0;
            overflow: auto;
            border: 1px solid #ddd;
            border-radius: 9px;
        }

        #thw-working-hours-modal table {
            width: 100%;
            margin: 0;
        }

        #thw-working-hours-modal thead th {
            position: sticky;
            top: 0;
            z-index: 5;
            padding: 9px 8px;
            background: #f3f4f6;
            border-bottom: 1px solid #ddd;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
        }

        #thw-working-hours-modal tbody td {
            padding: 7px 8px;
            vertical-align: middle;
            font-size: 13px;
        }

        #thw-working-hours-modal tbody tr:hover {
            background: rgba(51,122,183,.07);
        }

        .thw-vehicle-name {
            font-weight: 600;
        }

        .thw-vehicle-id {
            display: block;
            margin-top: 2px;
            font-size: 10px;
            opacity: .55;
        }

        .thw-type-badge,
        .thw-status-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 7px;
            border-radius: 5px;
            font-size: 11px;
            font-weight: 600;
        }

        .thw-type-badge {
            background: rgba(51,122,183,.12);
            color: #337ab7;
        }

        .thw-time {
            font-weight: 600;
            white-space: nowrap;
        }

        .thw-time-wrong {
            color: #dc3545;
        }

        .thw-time-correct {
            color: #198754;
        }

        .thw-status {
            white-space: nowrap;
        }

        .thw-status-badge {
            white-space: nowrap;
        }

        .thw-status-ready {
            background: rgba(108,117,125,.12);
            color: #6c757d;
        }

        .thw-status-warning {
            background: rgba(255,193,7,.15);
            color: #9a7500;
        }

        .thw-status-success {
            background: rgba(25,135,84,.13);
            color: #198754;
        }

        .thw-status-error {
            background: rgba(220,53,69,.13);
            color: #dc3545;
        }

        .thw-single-change {
            white-space: nowrap;
        }

        #thw-log {
            flex: 0 0 auto;
            max-height: 100px;
            margin-top: 8px;
            overflow-y: auto;
            border-radius: 7px;
            font-size: 11px;
        }

        .thw-log-entry {
            padding: 4px 7px;
            border-bottom: 1px solid rgba(127,127,127,.15);
        }

        #thw-working-hours-modal .modal-footer {
            flex: 0 0 auto;
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 12px 20px;
            border-top: 1px solid #e5e5e5;
        }

        #thw-loading {
            padding: 35px 20px;
            text-align: center;
        }

        .thw-loading-icon {
            margin-bottom: 12px;
            font-size: 28px;
            animation: thw-spin 1s linear infinite;
        }

        .thw-loading-title {
            margin-bottom: 6px;
            font-size: 15px;
            font-weight: 600;
        }

        .thw-loading-status,
        .thw-loading-count {
            font-size: 12px;
            opacity: .7;
        }

        .thw-loading-progress {
            max-width: 600px;
            margin: 18px auto 0;
        }

        .thw-loading-progress .progress {
            height: 10px;
            margin-bottom: 7px;
            border-radius: 10px;
            overflow: hidden;
        }

        @keyframes thw-spin {
            to {
                transform: rotate(360deg);
            }
        }

        body.dark #thw-working-hours-modal .modal-content {
            background: #202124;
            color: #e8eaed;
        }

        body.dark #thw-working-hours-modal .modal-header,
        body.dark #thw-working-hours-modal .modal-footer {
            background: #202124;
            border-color: #3a3b3d;
        }

        body.dark #thw-working-hours-modal .modal-header {
            background: #252629;
        }

        body.dark .thw-settings {
            background: #292a2d;
            border-color: #3a3b3d;
        }

        body.dark .thw-table-wrapper {
            border-color: #3a3b3d;
        }

        body.dark #thw-working-hours-modal thead th {
            background: #292a2d;
            color: #e8eaed;
            border-color: #3a3b3d;
        }

        body.dark #thw-working-hours-modal tbody td {
            border-color: #343538;
        }

        body.dark #thw-working-hours-modal tbody tr:hover {
            background: rgba(255,255,255,.045);
        }

        body.dark #thw-working-hours-modal .btn-default {
            background: #303134;
            border-color: #484a4e;
            color: #e8eaed;
        }

        body.dark #thw-working-hours-modal .btn-default:hover {
            background: #3a3b3e;
        }

        body.dark #thw-working-hours-modal .thw-type-badge {
            background: rgba(91,155,213,.15);
            color: #7db5e8;
        }

        body.dark #thw-progress {
            border-color: #3a3b3d;
            background: #292a2d;
        }

        body.dark #thw-progress .progress {
            background: #343538;
        }

        #thw-working-hours-modal .modal-dialog {
            width: calc(100% - 15px);
            margin: 15px auto;
        }

        #thw-working-hours-modal .modal-content {
            height: calc(100vh - 30px);
            max-height: calc(100vh - 30px);
        }

        #thw-working-hours-modal .modal-body {
            padding: 10px;
        }

        #thw-working-hours-modal .modal-footer {
            padding: 10px;
        }

        @media (max-width: 700px) {
            .thw-settings-row {
                flex-direction: column;
                align-items: stretch;
            }
        }
    `);

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';

        const div = document.createElement('div');
        div.textContent = String(value);

        return div.innerHTML;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function addMenuButton() {
        const interval = setInterval(() => {
            const menu = document.querySelector('#menu_profile + .dropdown-menu');

            if (!menu) return;

            if (menu.querySelector('#open-thw-working-hours-manager')) {
                clearInterval(interval);
                return;
            }

            const li = document.createElement('li');
            li.setAttribute('role', 'presentation');

            const a = document.createElement('a');
            a.href = '#';
            a.id = 'open-thw-working-hours-manager';

            a.innerHTML = `
                <span class="glyphicon glyphicon-time"></span>
                &nbsp;&nbsp; THW-Arbeitszeiten
            `;

            a.onclick = event => {
                event.preventDefault();
                openManager();
            };

            li.appendChild(a);

            const divider = menu.querySelector('li.divider');

            if (divider) {
                menu.insertBefore(li, divider);
            } else {
                menu.appendChild(li);
            }

            clearInterval(interval);
        }, 500);
    }

    function createModal() {
        if (document.getElementById('thw-working-hours-modal')) {
            return document.getElementById('thw-working-hours-modal');
        }

        const modal = document.createElement('div');

        modal.id = 'thw-working-hours-modal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                        <h4 class="modal-title">
                            <span class="glyphicon glyphicon-time"></span>
                            THW Anhänger – Arbeitszeit-Manager
                        </h4>
                    </div>
                    <div class="modal-body">
                        <div id="thw-loading">
                            <div class="thw-loading-icon">
                                <span class="glyphicon glyphicon-refresh"></span>
                            </div>
                            <div class="thw-loading-title">
                                Fahrzeugdaten werden geladen
                            </div>
                            <div id="thw-loading-status" class="thw-loading-status">
                                Verbindung zur Fahrzeug-API wird hergestellt …
                            </div>
                            <div class="thw-loading-progress">
                                <div class="progress">
                                    <div id="thw-loading-progress-bar"
                                         class="progress-bar progress-bar-striped active"
                                         style="width:0%">
                                    </div>
                                </div>
                                <div id="thw-loading-count" class="thw-loading-count">
                                    0 Fahrzeuge geladen
                                </div>
                            </div>
                        </div>
                        <div id="thw-content" style="display:none;">
                            <div class="thw-settings">
                                <div class="thw-settings-title">
                                    Festgelegte Arbeitszeiten
                                </div>
                                <div class="thw-settings-row">
                                    <div class="form-group">
                                        <label>Anh MzAB</label>
                                        <div class="form-control">00:00 – 08:00</div>
                                    </div>
                                    <div class="form-group">
                                        <label>Anh MzB</label>
                                        <div class="form-control">08:00 – 16:00</div>
                                    </div>
                                    <div class="form-group">
                                        <label>Anh SchlB</label>
                                        <div class="form-control">16:00 – 00:00</div>
                                    </div>
                                </div>
                                <div class="form-group" style="margin:10px 0 0;">
                                    <label for="thw-type-filter">
                                        Fahrzeugtyp
                                    </label>
                                    <select id="thw-type-filter" class="form-control">
                                        <option value="all">Alle falschen Anhänger</option>
                                        <option value="68">Anh MzAB</option>
                                        <option value="66">Anh MzB</option>
                                        <option value="67">Anh SchlB</option>
                                    </select>
                                </div>
                            </div>
                            <div id="thw-summary"></div>
                            <div id="thw-progress">
                                <div class="thw-progress-header">
                                    <strong>Arbeitszeiten werden gesetzt</strong>
                                    <span id="thw-progress-percent">0%</span>
                                </div>
                                <div class="progress">
                                    <div id="thw-progress-bar"
                                         class="progress-bar progress-bar-striped active"
                                         style="width:0%">
                                    </div>
                                </div>
                                <div class="thw-progress-info">
                                    <span id="thw-progress-text">Vorbereitung …</span>
                                    <span id="thw-progress-count">0 / 0 Fahrzeuge</span>
                                </div>
                            </div>
                            <div class="thw-table-wrapper">
                                <table class="table table-hover table-condensed">
                                    <thead>
                                        <tr>
                                            <th>Fahrzeug</th>
                                            <th>Typ</th>
                                            <th>Aktuelle Arbeitszeit</th>
                                            <th>Sollzeit</th>
                                            <th>Status</th>
                                            <th>Aktion</th>
                                        </tr>
                                    </thead>
                                    <tbody id="thw-vehicle-list"></tbody>
                                </table>
                            </div>
                            <div id="thw-log"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button"
                                id="thw-refresh"
                                class="btn btn-info">
                            <span class="glyphicon glyphicon-refresh"></span>
                            Aktualisieren
                        </button>
                        <button type="button"
                                id="thw-cancel"
                                class="btn btn-warning"
                                style="display:none;">
                            <span class="glyphicon glyphicon-stop"></span>
                            Abbrechen
                        </button>
                        <button type="button"
                                id="thw-apply"
                                class="btn btn-success"
                                disabled>
                            <span class="glyphicon glyphicon-time"></span>
                            Alle falschen Arbeitszeiten setzen
                        </button>
                        <button type="button"
                                class="btn btn-danger"
                                data-dismiss="modal">
                            <span class="glyphicon glyphicon-remove"></span>
                            Schließen
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('thw-type-filter')
            .addEventListener('change', filterAndRender);

        document.getElementById('thw-refresh')
            .addEventListener('click', () => refreshVehicles(true));

        document.getElementById('thw-apply')
            .addEventListener('click', applyWorkingHours);

        document.getElementById('thw-cancel')
            .addEventListener('click', cancelUpdate);

        return modal;
    }

    function formatTime(hour) {
        return `${String(hour).padStart(2, '0')}:00`;
    }

    function getTargetWorkingHours(vehicle) {
        return WORKING_HOURS[Number(vehicle.vehicle_type)] || null;
    }

    function isWorkingHoursCorrect(vehicle) {
        const target = getTargetWorkingHours(vehicle);
        if (!target) return true;
        return Number(vehicle.working_hour_start) === target.start &&
            Number(vehicle.working_hour_end) === target.end;
    }

    function getWrongVehicles(vehicleList) {
        return vehicleList.filter(vehicle => !isWorkingHoursCorrect(vehicle));
    }

    function updateLoading(text, current = 0, total = 0) {
        const status = document.getElementById('thw-loading-status');
        const bar = document.getElementById('thw-loading-progress-bar');
        const count = document.getElementById('thw-loading-count');
        if (status) status.textContent = text;
        if (count) {
            count.textContent = total
                ? `${current.toLocaleString('de-DE')} / ${total.toLocaleString('de-DE')} Fahrzeuge geladen`
                : `${current.toLocaleString('de-DE')} Fahrzeuge geladen`;
        }
        if (bar) {
            bar.style.width = total
                ? `${Math.min(100, (current / total) * 100)}%`
                : '5%';
        }
    }

    function saveVehicleCache(vehicleList) {
        try {
            sessionStorage.setItem(
                CACHE_KEY,
                JSON.stringify({
                    timestamp: Date.now(),
                    vehicles: vehicleList
                })
            );
        } catch (error) {
            console.warn('[THW-Arbeitszeit] Cache konnte nicht gespeichert werden:', error);
        }
    }

    function loadVehicleCache() {
        try {
            const raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const cache = JSON.parse(raw);
            if (!cache?.timestamp || !Array.isArray(cache.vehicles)) {
                sessionStorage.removeItem(CACHE_KEY);
                return null;
            }
            const age = Date.now() - Number(cache.timestamp);
            if (age >= CACHE_DURATION) {
                sessionStorage.removeItem(CACHE_KEY);
                return null;
            }
            return {
                vehicles: cache.vehicles,
                age
            };
        } catch (error) {
            console.warn('[THW-Arbeitszeit] Cache konnte nicht gelesen werden:', error);
            return null;
        }
    }

    async function loadAllVehicles(forceRefresh = false) {
        if (!forceRefresh) {
            const cached = loadVehicleCache();
            if (cached) {
                updateLoading(
                    'Fahrzeugdaten aus Cache geladen.',
                    cached.vehicles.length,
                    cached.vehicles.length
                );
                return {
                    vehicles: cached.vehicles,
                    fromCache: true,
                    cacheAge: cached.age
                };
            }
        }
        const result = [];
        let nextUrl = API_URL;
        let page = 0;
        let total = 0;
        while (nextUrl) {
            page++;
            updateLoading(
                `Lade Fahrzeugdaten – Seite ${page} …`,
                result.length,
                total
            );
            const response = await fetch(nextUrl, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Fahrzeug-API meldet HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.paging?.count_total) {
                total = Number(data.paging.count_total);
            }

            let pageVehicles = [];

            if (Array.isArray(data.result)) {
                pageVehicles = data.result;
            } else if (data.result && typeof data.result === 'object') {
                pageVehicles = Object.values(data.result).filter(
                    item => item && typeof item === 'object' && item.id
                );
            }

            result.push(...pageVehicles);

            updateLoading(
                `Seite ${page} geladen – nächste Seite wird geladen …`,
                result.length,
                total
            );

            nextUrl = data.paging?.next_page || null;
        }

        const targetVehicles = getTargetVehicles(result);

        saveVehicleCache(targetVehicles);

        updateLoading(
            'Fahrzeugdaten vollständig geladen.',
            targetVehicles.length,
            targetVehicles.length
        );

        return {
            vehicles: targetVehicles,
            fromCache: false,
            cacheAge: 0
        };
    }

    function getTargetVehicles(allVehicles) {
        return allVehicles.filter(
            vehicle => Object.prototype.hasOwnProperty.call(
                VEHICLE_TYPES,
                Number(vehicle.vehicle_type)
            )
        );
    }

    function filterAndRender() {
        const filter = document.getElementById('thw-type-filter').value;
        const wrongVehicles = getWrongVehicles(vehicles);

        filteredVehicles = filter === 'all'
            ? [...wrongVehicles]
            : wrongVehicles.filter(
                vehicle => Number(vehicle.vehicle_type) === Number(filter)
            );

        renderVehicleList();
    }

    function renderVehicleList() {
        const tbody = document.getElementById('thw-vehicle-list');
        const summary = document.getElementById('thw-summary');

        tbody.innerHTML = '';

        if (!filteredVehicles.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <span class="glyphicon glyphicon-ok" style="color:#198754;"></span>
                        &nbsp;
                        Alle Anhänger sind korrekt eingestellt.
                    </td>
                </tr>
            `;

            summary.textContent = 'Keine falsch eingestellten Anhänger';
            updateApplyButton();
            return;
        }

        summary.textContent =
            `${filteredVehicles.length.toLocaleString('de-DE')} falsch eingestellte Anhänger`;

        filteredVehicles.forEach(vehicle => {
            const type = Number(vehicle.vehicle_type);
            const typeName = VEHICLE_TYPES[type];
            const target = getTargetWorkingHours(vehicle);
            const row = document.createElement('tr');

            row.dataset.vehicleId = vehicle.id;

            row.innerHTML = `
                <td>
                    <span class="thw-vehicle-name">
                        ${escapeHtml(vehicle.caption)}
                    </span>

                    <span class="thw-vehicle-id">
                        ID ${vehicle.id}
                    </span>
                </td>

                <td>
                    <span class="thw-type-badge">
                        ${escapeHtml(typeName)}
                    </span>
                </td>

                <td class="thw-time thw-time-wrong">
                    ${formatTime(vehicle.working_hour_start)}
                    –
                    ${formatTime(vehicle.working_hour_end)}
                </td>

                <td class="thw-time thw-time-correct">
                    ${formatTime(target.start)}
                    –
                    ${formatTime(target.end)}
                </td>

                <td class="thw-status">
                    <span class="thw-status-badge thw-status-ready">
                        Falsch
                    </span>
                </td>

                <td>
                    <button type="button"
                            class="btn btn-primary btn-sm thw-single-change">
                        <span class="glyphicon glyphicon-time"></span>
                        Korrigieren
                    </button>
                </td>
            `;

            tbody.appendChild(row);

            row.querySelector('.thw-single-change')
                .addEventListener('click', () => changeSingleVehicle(vehicle));
        });

        updateApplyButton();
    }

    function updateApplyButton() {
        const button = document.getElementById('thw-apply');

        if (!button) return;

        button.disabled =
            updateRunning ||
            filteredVehicles.length === 0;
    }

    async function changeSingleVehicle(vehicle) {
        if (updateRunning) return;

        const row = document.querySelector(`tr[data-vehicle-id="${vehicle.id}"]`);

        if (!row) return;

        const button = row.querySelector('.thw-single-change');

        if (button.disabled) return;

        const target = getTargetWorkingHours(vehicle);

        if (!target) return;

        button.disabled = true;

        setVehicleStatus(vehicle.id, 'Wird geändert …', 'warning');

        try {
            await saveVehicle(vehicle, target.start, target.end);

            setVehicleStatus(vehicle.id, 'Prüfe …', 'warning');

            const verification = await verifyVehicle(
                vehicle,
                target.start,
                target.end
            );

            if (!verification.success) {
                throw new Error(
                    `API meldet weiterhin ${formatTime(
                        verification.vehicle.working_hour_start
                    )} – ${formatTime(
                        verification.vehicle.working_hour_end
                    )}`
                );
            }

            vehicle.working_hour_start =
                verification.vehicle.working_hour_start;

            vehicle.working_hour_end =
                verification.vehicle.working_hour_end;

            vehicle.updated_iso =
                verification.vehicle.updated_iso;

            saveVehicleCache(vehicles);

            setVehicleStatus(vehicle.id, 'Erfolgreich', 'success');

            log(
                `✓ ${vehicle.caption}: ${formatTime(target.start)} – ${formatTime(target.end)} übernommen.`,
                'success'
            );

            await sleep(250);

            filterAndRender();

        } catch (error) {
            setVehicleStatus(vehicle.id, 'Fehler', 'error');

            log(
                `✗ ${vehicle.caption}: ${error.message}`,
                'error'
            );

            console.error('[THW-Arbeitszeit]', error);

            button.disabled = false;
        }
    }

    function getTargetVehiclesForUpdate() {
        return filteredVehicles.filter(
            vehicle => !isWorkingHoursCorrect(vehicle)
        );
    }

    function log(message, type = 'info') {
        const container = document.getElementById('thw-log');
        const entry = document.createElement('div');

        entry.className = `thw-log-entry thw-${type}`;
        entry.textContent = message;

        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
    }

    function setVehicleStatus(vehicleId, text, type = 'ready') {
        const row = document.querySelector(`tr[data-vehicle-id="${vehicleId}"]`);

        if (!row) return;

        const status = row.querySelector('.thw-status');

        status.innerHTML = `
            <span class="thw-status-badge thw-status-${type}">
                ${escapeHtml(text)}
            </span>
        `;
    }

    function updateProgress(current, total, text) {
        const progress = document.getElementById('thw-progress');
        const bar = document.getElementById('thw-progress-bar');
        const percentElement = document.getElementById('thw-progress-percent');
        const progressText = document.getElementById('thw-progress-text');
        const countElement = document.getElementById('thw-progress-count');

        if (!progress || !bar) return;

        progress.style.display = 'block';

        const percent = total > 0
            ? Math.min(100, Math.round((current / total) * 100))
            : 0;

        bar.style.width = `${percent}%`;

        if (percentElement) {
            percentElement.textContent = `${percent}%`;
        }

        if (progressText) {
            progressText.textContent = text;
        }

        if (countElement) {
            countElement.textContent =
                `${current.toLocaleString('de-DE')} / ${total.toLocaleString('de-DE')} Fahrzeuge`;
        }
    }

    function cancelUpdate() {
        if (!updateRunning) return;

        updateCancelled = true;

        const cancelButton = document.getElementById('thw-cancel');

        if (cancelButton) {
            cancelButton.disabled = true;
            cancelButton.innerHTML =
                '<span class="glyphicon glyphicon-refresh"></span> Wird beendet …';
        }

        log(
            'Abbruch angefordert. Das aktuell laufende Fahrzeug wird noch abgeschlossen.',
            'warning'
        );
    }

    async function getVehicleEditPage(vehicleId) {
        const response = await fetch(`/vehicles/${vehicleId}/edit`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Bearbeitungsseite HTTP ${response.status}`);
        }

        return response.text();
    }

    function extractVehicleForm(html, vehicleId) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        let form = doc.querySelector(`form[action="/vehicles/${vehicleId}"]`);

        if (!form) {
            form = doc.querySelector(`form[action*="/vehicles/${vehicleId}"]`);
        }

        if (!form) {
            form = doc.querySelector('form');
        }

        if (!form) {
            throw new Error('Fahrzeugformular nicht gefunden');
        }

        return form;
    }

    function findField(form, names, ids) {
        for (const id of ids) {
            const field = form.querySelector(`#${id}`);

            if (field) return field;
        }

        for (const name of names) {
            const field = form.querySelector(`[name="${name}"]`);

            if (field) return field;
        }

        return null;
    }

    function prepareFormData(form, start, end) {
        const startField = findField(
            form,
            ['vehicle[working_hour_start]'],
            ['vehicle_working_hour_start']
        );

        const endField = findField(
            form,
            ['vehicle[working_hour_end]'],
            ['vehicle_working_hour_end']
        );

        if (!startField) {
            throw new Error('Arbeitszeit-Beginn-Feld nicht gefunden');
        }

        if (!endField) {
            throw new Error('Arbeitszeit-Ende-Feld nicht gefunden');
        }

        const formData = new FormData(form);

        formData.set('vehicle[working_hour_start]', String(start));
        formData.set('vehicle[working_hour_end]', String(end));

        return formData;
    }

    async function saveVehicle(vehicle, start, end) {
        const html = await getVehicleEditPage(vehicle.id);
        const form = extractVehicleForm(html, vehicle.id);
        const formData = prepareFormData(form, start, end);

        let action = form.getAttribute('action');

        if (!action) {
            action = `/vehicles/${vehicle.id}`;
        }

        if (action.startsWith('/')) {
            action = window.location.origin + action;
        }

        const response = await fetch(action, {
            method: 'POST',
            credentials: 'include',
            body: formData,
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`Speichern HTTP ${response.status}`);
        }

        return true;
    }

    async function verifyVehicle(vehicle, start, end) {
        const response = await fetch(`/api/v2/vehicles/${vehicle.id}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Überprüfung HTTP ${response.status}`);
        }

        const data = await response.json();
        const updatedVehicle = data.result || data;

        const actualStart = Number(updatedVehicle.working_hour_start);
        const actualEnd = Number(updatedVehicle.working_hour_end);

        return {
            success:
                actualStart === Number(start) &&
                actualEnd === Number(end),
            vehicle: updatedVehicle
        };
    }

    async function applyWorkingHours() {
        if (updateRunning) return;

        const targets = getTargetVehiclesForUpdate();

        document.getElementById('thw-log').innerHTML = '';

        if (!targets.length) {
            log('Keine falsch eingestellten Anhänger vorhanden.', 'success');
            return;
        }

        const confirmed = confirm(
            `${targets.length} Anhänger mit falscher Arbeitszeit korrigieren?`
        );

        if (!confirmed) return;

        updateRunning = true;
        updateCancelled = false;

        const button = document.getElementById('thw-apply');
        const cancelButton = document.getElementById('thw-cancel');

        button.disabled = true;

        if (cancelButton) {
            cancelButton.style.display = '';
            cancelButton.disabled = false;
            cancelButton.innerHTML =
                '<span class="glyphicon glyphicon-stop"></span> Abbrechen';
        }

        updateProgress(0, targets.length, 'Vorbereitung …');

        let success = 0;
        let errors = 0;
        let processed = 0;

        for (let index = 0; index < targets.length; index++) {
            if (updateCancelled) break;

            const vehicle = targets[index];
            const target = getTargetWorkingHours(vehicle);

            setVehicleStatus(vehicle.id, 'Wird geändert …', 'warning');

            updateProgress(
                processed,
                targets.length,
                `Bearbeite: ${vehicle.caption}`
            );

            try {
                await saveVehicle(
                    vehicle,
                    target.start,
                    target.end
                );

                setVehicleStatus(vehicle.id, 'Prüfe …', 'warning');

                const verification = await verifyVehicle(
                    vehicle,
                    target.start,
                    target.end
                );

                if (!verification.success) {
                    throw new Error(
                        `API meldet weiterhin ${formatTime(
                            verification.vehicle.working_hour_start
                        )} – ${formatTime(
                            verification.vehicle.working_hour_end
                        )}`
                    );
                }

                vehicle.working_hour_start =
                    verification.vehicle.working_hour_start;

                vehicle.working_hour_end =
                    verification.vehicle.working_hour_end;

                vehicle.updated_iso =
                    verification.vehicle.updated_iso;

                success++;

                setVehicleStatus(
                    vehicle.id,
                    'Erfolgreich',
                    'success'
                );

                log(
                    `✓ ${vehicle.caption}: ${formatTime(target.start)} – ${formatTime(target.end)} übernommen.`,
                    'success'
                );

            } catch (error) {
                errors++;

                setVehicleStatus(
                    vehicle.id,
                    'Fehler',
                    'error'
                );

                log(
                    `✗ ${vehicle.caption}: ${error.message}`,
                    'error'
                );

                console.error('[THW-Arbeitszeit]', error);
            }

            processed++;

            updateProgress(
                processed,
                targets.length,
                processed === targets.length
                    ? 'Alle Fahrzeuge wurden verarbeitet.'
                    : updateCancelled
                        ? 'Abbruch wird durchgeführt …'
                        : 'Nächstes Fahrzeug wird verarbeitet …'
            );

            if (updateCancelled) break;

            await sleep(500);
        }

        saveVehicleCache(vehicles);

        if (updateCancelled) {
            const remaining = targets.length - processed;

            log(
                `Abgebrochen: ${success} erfolgreich, ${errors} Fehler, ${remaining} nicht verarbeitet.`,
                'warning'
            );

            updateProgress(
                processed,
                targets.length,
                'Verarbeitung abgebrochen.'
            );

        } else {
            log(
                `Fertig: ${success} erfolgreich, ${errors} Fehler.`,
                errors ? 'error' : 'success'
            );

            updateProgress(
                processed,
                targets.length,
                'Alle Fahrzeuge wurden verarbeitet.'
            );
        }

        updateRunning = false;
        updateCancelled = false;

        button.disabled = false;

        if (cancelButton) {
            cancelButton.style.display = 'none';
            cancelButton.disabled = false;
        }

        filterAndRender();
    }

    async function refreshVehicles(forceRefresh = false) {
        if (updateRunning) return;

        const refresh = document.getElementById('thw-refresh');

        if (refresh) {
            refresh.disabled = true;
        }

        document.getElementById('thw-content').style.display = 'none';
        document.getElementById('thw-loading').style.display = '';

        updateLoading(
            forceRefresh
                ? 'Fahrzeugdaten werden vollständig aktualisiert …'
                : 'Fahrzeugdaten werden geladen …',
            0,
            0
        );

        try {
            const result = await loadAllVehicles(forceRefresh);

            vehicles = result.vehicles;
            filteredVehicles = getWrongVehicles(vehicles);

            const status = document.getElementById('thw-loading-status');

            if (status) {
                status.textContent = result.fromCache
                    ? `${vehicles.length.toLocaleString('de-DE')} THW-Anhänger aus dem Cache geladen.`
                    : `${vehicles.length.toLocaleString('de-DE')} THW-Anhänger gefunden – Daten aktualisiert.`;
            }

            await sleep(result.fromCache ? 150 : 500);

            document.getElementById('thw-loading').style.display = 'none';
            document.getElementById('thw-content').style.display = '';
            document.getElementById('thw-progress').style.display = 'none';

            renderVehicleList();

        } catch (error) {
            document.getElementById('thw-loading').innerHTML = `
                <div class="alert alert-danger">
                    <strong>Fehler beim Laden der Fahrzeugdaten</strong><br>
                    ${escapeHtml(error.message)}
                </div>
            `;

            console.error('[THW-Arbeitszeit]', error);
        }

        if (refresh) {
            refresh.disabled = false;
        }
    }

    async function openManager() {
        if (updateRunning) return;

        createModal();

        $('#thw-working-hours-modal').modal('show');

        document.getElementById('thw-log').innerHTML = '';
        document.getElementById('thw-progress').style.display = 'none';
        document.getElementById('thw-progress-bar').style.width = '0%';
        document.getElementById('thw-progress-percent').textContent = '0%';
        document.getElementById('thw-progress-text').textContent = 'Vorbereitung …';
        document.getElementById('thw-progress-count').textContent = '0 / 0 Fahrzeuge';
        document.getElementById('thw-content').style.display = 'none';
        document.getElementById('thw-loading').style.display = '';

        updateLoading('Fahrzeugdaten werden geladen …', 0, 0);

        await refreshVehicles(false);
    }

    function init() {
        addMenuButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
