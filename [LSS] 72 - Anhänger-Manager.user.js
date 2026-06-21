// ==UserScript==
// @name         [LSS] Anhänger-Manager
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Prüft Anhänger auf korrekte Zugfahrzeuge (robust refactored)
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/**
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const CACHE_KEY = 'lss_trailer_manager_cache_v2';
    const TRAILER_META_CACHE = 'lss_trailer_meta';
    const TRAILER_META_TIME = 24 * 60 * 60 * 1000;
    const CACHE_TIME = 30 * 60 * 1000;
    const ITEMS_PER_PAGE = 25;
    const MAX_PAGES = 500;

    let CONFIG = [];
    let issues = new Map();
    let vehiclesCache = null;

    async function loadTrailerMeta() {
        const cached = localStorage.getItem(TRAILER_META_CACHE);

        if (cached) {
            const data = JSON.parse(cached);

            if (Date.now() - data.timestamp < TRAILER_META_TIME) {
                return data.meta;
            }
        }

        const meta = await fetch(
            'https://api.lss-manager.de/de_DE/vehicles'
        ).then(r => r.json());

        localStorage.setItem(
            TRAILER_META_CACHE,
            JSON.stringify({
                timestamp: Date.now(),
                meta
            })
        );

        return meta;
    }

    async function buildConfig() {
        const vehicleMeta = await loadTrailerMeta();

        return Object.entries(vehicleMeta)
            .filter(([id, v]) =>
                    v.isTrailer &&
                    Array.isArray(v.tractiveVehicles) &&
                    v.tractiveVehicles.length > 0
                   )
            .map(([id, v]) => ({
            trailerType: Number(id),
            trailerName: v.caption,
            allowedTractiveTypes: v.tractiveVehicles
        }));
    }

    function getCsrfToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content;
    }

    function getCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;

            const cache = JSON.parse(raw);
            if (!cache?.timestamp || !Array.isArray(cache.data)) return null;
            if (Date.now() - cache.timestamp > CACHE_TIME) return null;

            return cache.data;
        } catch {
            return null;
        }
    }

    function saveCache(data) {
        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), data })
        );
    }

    function clearCache() {
        localStorage.removeItem(CACHE_KEY);
    }

    function resetIssues() {
        issues = new Map();
    }

    function addIssue(trailer, expected, message, expectedVehicle = null, candidates = []) {
        if (!issues.has(trailer.id)) {
            issues.set(trailer.id, {
                trailer,
                expected,
                expectedVehicle,
                availableVehicles: candidates,
                messages: []
            });
        }
        issues.get(trailer.id).messages.push(message);
    }

    function setLoading(text = "Lade Fahrzeugdaten. Dies kann ein wenig dauern...") {
        const el = document.getElementById('trailer-manager-content');
        if (!el) return;

        el.innerHTML = `
      <div class="text-center">
        <h4>${text}</h4>
      </div>
    `;
    }

    function createModal() {
        if (document.getElementById('trailer-manager-modal')) return;

        document.body.insertAdjacentHTML(
            'beforeend',
            `
      <div class="modal fade" id="trailer-manager-modal" style="z-index: 10001;">
        <div class="modal-dialog modal-xl" style="width:95%; margin-top:80px;">
          <div class="modal-content" style="max-height:85vh;">
            <div class="modal-header">
              <div class="clearfix">
                <div class="pull-right">
                  <button class="btn btn-primary" id="reload-trailer-cache">
                    Cache aktualisieren
                  </button>
                  <button class="btn btn-danger" data-dismiss="modal">
                    Schließen
                  </button>
                </div>
                <h4 class="modal-title">Anhänger-Manager</h4>
              </div>
            </div>

            <div class="modal-body" style="max-height:70vh; overflow-y:auto;">
              <div id="trailer-manager-content"></div>
            </div>
          </div>
        </div>
      </div>
      `
        );

        document.getElementById('reload-trailer-cache')
            .addEventListener('click', async () => {
            try {
                setLoading("Cache wird aktualisiert...");
                clearCache();
                localStorage.removeItem(TRAILER_META_CACHE);

                resetIssues();

                CONFIG = await buildConfig();

                const result = await loadVehicles(true);
                const errors = validateAssignments(result.vehicles);

                renderResults(errors);
            } catch (err) {
                console.error(err);
                setLoading("Fehler beim Aktualisieren");
            }
        });
    }

    async function loadVehicles(force = false) {
        if (!force) {
            const cached = getCache();
            if (cached) {
                vehiclesCache = cached;
                return { vehicles: cached, cached: true };
            }
        }

        resetIssues();

        let vehicles = [];
        let nextPage = '/api/v2/vehicles?limit=1000';
        let page = 0;

        while (nextPage) {
            page++;

            if (page > MAX_PAGES) break;

            setLoading(`Fahrzeuge werden geladen, dies kann einen Moment dauern. Lade Seite ${page} (${vehicles.length} Fahrzeuge) geladen`);

            const res = await fetch(nextPage);
            if (!res.ok) throw new Error(`API Fehler: ${res.status}`);

            const data = await res.json();
            if (!data?.result) throw new Error("Ungültige API Antwort");

            vehicles.push(
                ...data.result.map(v => ({
                    id: v.id,
                    caption: v.caption,
                    building_id: v.building_id,
                    vehicle_type: v.vehicle_type,
                    tractive_vehicle_id: v.tractive_vehicle_id
                }))
            );

            nextPage = data.paging?.next_page || null;

            if (nextPage?.startsWith('https://www.leitstellenspiel.de')) {
                nextPage = nextPage.replace('https://www.leitstellenspiel.de', '');
            }
        }

        saveCache(vehicles);
        vehiclesCache = vehicles;

        return { vehicles, cached: false };
    }

    function validateAssignments(vehicles) {
        issues = new Map();

        const byId = new Map();
        const byType = new Map();

        vehicles.forEach(v => {
            byId.set(v.id, v);

            if (!byType.has(v.vehicle_type)) {
                byType.set(v.vehicle_type, []);
            }

            byType.get(v.vehicle_type).push(v);
        });

        for (const cfg of CONFIG) {

            const trailers =
                  byType.get(cfg.trailerType) || [];

            for (const trailer of trailers) {

                const candidates =
                      vehicles.filter(v =>
                                      cfg.allowedTractiveTypes.includes(
                          v.vehicle_type
                      ) &&
                                      v.building_id === trailer.building_id
                                     );

                const assigned =
                      byId.get(trailer.tractive_vehicle_id);

                const expectedVehicle =
                      candidates.find(v =>
                                      v.id === trailer.tractive_vehicle_id
                                     ) ||
                      candidates[0] ||
                      null;

                if (!assigned) {
                    addIssue(
                        trailer,
                        cfg.trailerName,
                        "❌ Kein Zugfahrzeug",
                        expectedVehicle,
                        candidates
                    );
                    continue;
                }

                if (
                    !cfg.allowedTractiveTypes.includes(
                        assigned.vehicle_type
                    ) ||
                    assigned.building_id !== trailer.building_id
                ) {
                    addIssue(
                        trailer,
                        cfg.trailerName,
                        "❌ Falsches Zugfahrzeug",
                        expectedVehicle,
                        candidates
                    );
                }
            }
        }

        return [...issues.values()];
    }

    async function fixTrailer(trailerId, tractiveId) {
        const token = getCsrfToken();

        const formData = new FormData();
        formData.append('utf8', '✓');
        formData.append('_method', 'patch');
        formData.append('authenticity_token', token);
        formData.append('vehicle[tractive_random]', '0');
        formData.append('vehicle[tractive_vehicle_id]', String(tractiveId));

        const res = await fetch(`/vehicles/${trailerId}`, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
            redirect: 'follow'
        });

        if (!res.ok) throw new Error(`Speichern fehlgeschlagen (${res.status})`);

        return true;
    }

    function renderTable(items) {
        return `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Anhänger</th>
                    <th>Fehler</th>
                    <th>Zugfahrzeug</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${items.map(e => `
                    <tr>
                       <td>
                            <a href="/vehicles/${e.trailer.id}/edit" target="_blank">
                                ${e.trailer.caption}
                            </a>
                        </td>
                        <td>${e.messages.join(", ")}</td>
                        <td>
                            <select class="trailer-select" data-id="${e.trailer.id}">
                                ${e.availableVehicles.map(v =>
                                                          `<option value="${v.id}">${v.caption}</option>`
                                                         ).join("")}
                            </select>
                        </td>
                        <td>
                            <button class="save-btn btn btn-success btn-xs" data-id="${e.trailer.id}">
                                Speichern
                            </button>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
    }

    function renderResults(errors) {
        const content = document.getElementById('trailer-manager-content');
        if (!content) return;

        if (!errors.length) {
            content.innerHTML = `<p class="text-success">✔ Alles korrekt</p>`;
            return;
        }

        const grouped = groupByTrailerType(errors);

        const tabs = [...grouped.entries()]
        .filter(([_, v]) => v.items.length > 0);

        if (!tabs.length) {
            content.innerHTML = `<p class="text-success">✔ Keine relevanten Fehler gefunden</p>`;
            return;
        }

        content.innerHTML = `
        Ich habe <p>${errors.length} Anhänger/Abrollbehälter gefunden die keinem Fahrzeug fest zugewiesen worden sind. </p>

        <ul class="nav nav-tabs">
            ${tabs.map(([typeId, entry], i) => `
                <li class="${i === 0 ? 'active' : ''}">
                    <a href="#tab-${typeId}" data-toggle="tab">
                        ${entry.cfg.trailerName}
                        <span class="badge">${entry.items.length}</span>
                    </a>
                </li>
            `).join("")}
        </ul>

        <div class="tab-content" style="margin-top: 10px;">
            ${tabs.map(([typeId, entry], i) => `
                <div class="tab-pane ${i === 0 ? 'active' : ''}" id="tab-${typeId}">
                    ${renderTable(entry.items)}
                </div>
            `).join("")}
        </div>
    `;

        // Events
        content.onclick = async (e) => {
            const btn = e.target.closest(".save-btn");
            if (!btn) return;

            const id = btn.dataset.id;
            const select = content.querySelector(`.trailer-select[data-id="${id}"]`);
            const value = select?.value;

            if (!value) return alert("Bitte auswählen");

            try {
                btn.disabled = true;
                await fixTrailer(id, value);
                btn.textContent = "✔";
            } catch (err) {
                console.error(err);
                btn.textContent = "Fehler";
                btn.disabled = false;
            }
        };
    }

    function groupByTrailerType(errors) {
        const map = new Map();

        // CONFIG initialisieren
        for (const cfg of CONFIG) {
            map.set(cfg.trailerType, {
                cfg,
                items: []
            });
        }

        // Fehler einsortieren
        for (const e of errors) {
            const type = e.trailer.vehicle_type;

            if (!map.has(type)) continue;

            map.get(type).items.push(e);
        }

        // alphabetisch sortieren
        for (const entry of map.values()) {
            entry.items.sort((a, b) =>
                             (a.trailer.caption || "").localeCompare(b.trailer.caption || "")
                            );
        }

        return map;
    }

    function addMenuButton() {
        const menu = document.querySelector('#menu_profile + .dropdown-menu');
        if (!menu || document.getElementById('open-trailer-manager')) return;

        const li = document.createElement('li');
        const a = document.createElement('a');

        a.id = "open-trailer-manager";
        a.href = "#";
        a.innerHTML = '<span class="glyphicon glyphicon-link"></span>&nbsp;&nbsp; Anhänger-Manager';

        a.onclick = async (e) => {
            e.preventDefault();

            createModal();
            $('#trailer-manager-modal').modal('show');

            setLoading("Lade Fahrzeuge...");

            try {
                resetIssues();

                CONFIG = await buildConfig();

                const result = await loadVehicles(true);
                const errors = validateAssignments(result.vehicles);
                renderResults(errors);
            } catch (err) {
                console.error(err);
                setLoading("Fehler beim Laden");
            }
        };

        li.appendChild(a);
        menu.appendChild(li);
    }

    addMenuButton();
})();
