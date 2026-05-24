// ==UserScript==
// @name         [LSS] Verschiebe-Manager
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fahrzeuge komfortabel zwischen Wachen verschieben
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // Konfigurationen
    const API_BUILDINGS = '/api/buildings';
    const API_VEHICLES = '/api/vehicles';
    const MAX_VEHICLE_RESULTS = 10000;
    const MAX_BUILDING_RESULTS = 1000;
    const BUILDING_TYPE_MAP = {
        0: 'Feuerwache',
        2: 'Rettungswache',
        5: 'Rettungshubschrauber-Station',
        6: 'Polizei',
        9: 'THW',
        11: 'Bereitschaftspolizei',
        12: 'Schnelleinsatzgruppe',
        13: 'Polizeihubschrauberstation',
        15: 'Wasserrettung',
        17: 'Polizei-Sondereinheit',
        18: 'Feuerwache (Kleinwache)',
        19: 'Polizeiwache (Kleinwache',
        20: 'Rettungswache (Kleinwache',
        24: 'Reiterstaffel',
        26: 'Seenotrettungswache',
        28: 'Hubschrauberstation (Seenotrettung)',
        29: 'Autobahnpolizei',
    };

    let buildings = [];
    let vehicles = [];
    let buildingMap = new Map();
    let vehicleMap = new Map();
    let selectedVehicles = new Set();
    let selectedTarget = null;

    // Script initiallisieren (starten)
    async function init() {

        console.log('[LSS Fleet Manager] Initialisiere...');

        await loadData();

        createMenuButton();
    }

    // API-Abfragen
    async function loadData() {

        const [buildingResponse, vehicleResponse] = await Promise.all([
            fetch(API_BUILDINGS, {
                credentials: 'include'
            }),
            fetch(API_VEHICLES, {
                credentials: 'include'
            })
        ]);
        buildings = await buildingResponse.json();
        vehicles = await vehicleResponse.json();

        buildingMap.clear();
        vehicleMap.clear();

        buildings.forEach(building => {
            buildingMap.set(building.id, building);
        });
        buildings = buildings.map(building => ({
            ...building,

            _search: (
                building.caption || ''
            ).toLowerCase()
        }));

        vehicles = vehicles
            .filter(vehicle =>
                    vehicle.fms_real === 2 ||
                    vehicle.fms_show === 2
                   )
            .map(vehicle => {

            vehicleMap.set(vehicle.id, vehicle);

            const building =
                  buildingMap.get(vehicle.building_id);

            return {
                ...vehicle,

                _search: (
                    (vehicle.caption || '') + ' ' +
                    (building?.caption || '')
                ).toLowerCase()
            };
        });

        console.log(
            `[LSS Fleet Manager] ${vehicles.length} Fahrzeuge geladen`
        );
    }

    // Menübutton einfügen
    function createMenuButton() {
        const profileMenu = document.querySelector(
            '#menu_profile + .dropdown-menu'
        );

        if (!profileMenu) {
            console.warn('Profilmenü nicht gefunden');
            return;
        }
        if (document.getElementById('lssfm-open-menu')) {
            return;
        }
        const li = document.createElement('li');
        li.innerHTML = `
              <a href="#" id="lssfm-open-menu">
                  🚚 Fleet Manager
              </a>
          `;
        profileMenu.appendChild(li);
        document
            .getElementById('lssfm-open-menu')
            .addEventListener('click', (e) => {

            e.preventDefault();

            toggleUI();
        });
    }

    // Userinterface bauen
    function toggleUI() {
        const existing =
              document.getElementById('lssfm-wrapper');
        if (existing) {
            existing.remove();
            return;
        }
        createUI();
    }
    function createUI() {

        if (document.getElementById('lssfm-wrapper')) {
            return;
        }

        GM_addStyle(`
              #lssfm-wrapper{
                  position:fixed;
                  top:70px;
                  right:20px;
                  width:450px;
                  height:750px;
                  background:#1f1f1f;
                  color:white;
                  z-index:999999;
                  border-radius:12px;
                  overflow:hidden;
                  box-shadow:0 0 20px rgba(0,0,0,0.5);
                  font-family:Arial,sans-serif;
                  display:flex;
                  flex-direction:column;
              }

              #lssfm-header{
                  background:#111;
                  padding:12px;
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                  font-size:18px;
                  font-weight:bold;
              }

              #lssfm-close{
                  cursor:pointer;
                  background:#c0392b;
                  border:none;
                  color:white;
                  padding:6px 10px;
                  border-radius:6px;
              }

              #lssfm-search,
              #lssfm-target-search{
                  width:100%;
                  padding:10px;
                  border:none;
                  outline:none;
                  color:black;
              }

              #lssfm-vehicle-list{
                  flex:1;
                  overflow:auto;
                  padding:10px;
              }

              .lssfm-vehicle{
                  background:#2b2b2b;
                  margin-bottom:6px;
                  border-radius:6px;
                  padding:8px;
                  display:flex;
                  align-items:center;
                  gap:10px;
              }

              .lssfm-building{
                  color:#aaa;
                  font-size:12px;
              }

              #lssfm-footer{
                  padding:10px;
                  border-top:1px solid #333;
              }

              #lssfm-target-results{
                  max-height:180px;
                  overflow:auto;
                  margin-top:10px;
                  margin-bottom:10px;
              }

              .lssfm-target{
                  background:#2b2b2b;
                  padding:8px;
                  margin-bottom:5px;
                  border-radius:6px;
                  cursor:pointer;
              }

              .lssfm-target:hover{
                  background:#444;
              }

              .lssfm-selected-target{
                  background:#2f6fed !important;
              }

              #lssfm-move-btn{
                  width:100%;
                  padding:12px;
                  border:none;
                  background:#27ae60;
                  color:white;
                  border-radius:8px;
                  font-size:16px;
                  cursor:pointer;
              }

              #lssfm-status{
                  margin-top:10px;
                  max-height:120px;
                  overflow:auto;
                  font-size:12px;
              }

              .lssfm-info{
                  color:#aaa;
                  padding:10px;
                  font-size:13px;
              }
          `);

        const wrapper = document.createElement('div');

        wrapper.id = 'lssfm-wrapper';

        wrapper.innerHTML = `
              <div id="lssfm-header">
                  <span>🚚 Fleet Manager</span>

                  <button id="lssfm-close">
                      Schließen
                  </button>
              </div>

              <input
                  type="text"
                  id="lssfm-search"
                  placeholder="Fahrzeuge suchen..."
              >

              <div id="lssfm-vehicle-list">
                  <div class="lssfm-info">
                      Mindestens 2 Zeichen eingeben...
                  </div>
              </div>

              <div id="lssfm-footer">

                  <input
                      type="text"
                      id="lssfm-target-search"
                      placeholder="Zielwache suchen..."
                  >

                  <div id="lssfm-target-results">
                      <div class="lssfm-info">
                          Mindestens 2 Zeichen eingeben...
                      </div>
                  </div>

                  <button id="lssfm-move-btn">
                      Fahrzeuge verschieben
                  </button>

                  <div id="lssfm-status"></div>

              </div>
          `;

        document.body.appendChild(wrapper);

        /************************************************************
           * EVENTS
           ************************************************************/

        document
            .getElementById('lssfm-close')
            .addEventListener('click', () => {

            wrapper.remove();
        });

        document
            .getElementById('lssfm-search')
            .addEventListener(
            'input',
            debounce(renderVehicleList, 150)
        );

        document
            .getElementById('lssfm-target-search')
            .addEventListener(
            'input',
            debounce(renderTargetResults, 150)
        );

        document
            .getElementById('lssfm-move-btn')
            .addEventListener('click', moveSelectedVehicles);
    }

    // Fahrzeugliste
    function renderVehicleList() {
        const container =
              document.getElementById('lssfm-vehicle-list');

        if (!container) return;

        const search =
              document.getElementById('lssfm-search')
        .value
        .trim()
        .toLowerCase();

        if (search.length < 2) {

            container.innerHTML = `
                  <div class="lssfm-info">
                      Mindestens 2 Zeichen eingeben...
                  </div>
              `;

            return;
        }

        const filteredVehicles = vehicles
        .filter(vehicle =>
                vehicle._search.includes(search)
               )
        .slice(0, MAX_VEHICLE_RESULTS);

        const fragment =
              document.createDocumentFragment();

        filteredVehicles.forEach(vehicle => {

            const building =
                  buildingMap.get(vehicle.building_id);

            const div = document.createElement('div');

            div.className = 'lssfm-vehicle';

            div.innerHTML = `
                  <input
                      type="checkbox"
                      data-vehicle-id="${vehicle.id}"
                      ${selectedVehicles.has(vehicle.id)
                ? 'checked'
            : ''
        }
                  >

                  <div>
                      <div>
                          🟢 ${vehicle.caption}
                      </div>

                      <div class="lssfm-building">
                          ${building?.caption || 'Unbekannt'}
                      </div>
                  </div>
              `;

            const checkbox = div.querySelector('input');

            checkbox.addEventListener('change', () => {

                const currentType =
                      getSelectedBuildingType();

                const vehicleBuilding =
                      buildingMap.get(vehicle.building_id);

                const vehicleType =
                      vehicleBuilding?.building_type;

                if (
                    checkbox.checked &&
                    currentType !== null &&
                    currentType !== vehicleType
                ) {

                    alert(
                        'Nur Fahrzeuge desselben Wachtentyps auswählbar'
                    );

                    checkbox.checked = false;

                    return;
                }

                if (checkbox.checked) {
                    selectedVehicles.add(vehicle.id);
                } else {
                    selectedVehicles.delete(vehicle.id);
                }

                renderTargetResults();
            });

            fragment.appendChild(div);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    // Suchfelder
    function renderTargetResults() {

        const container =
              document.getElementById('lssfm-target-results');

        if (!container) return;

        const search =
              document.getElementById('lssfm-target-search')
        .value
        .trim()
        .toLowerCase();
        if (search.length < 2) {

            container.innerHTML = `
                  <div class="lssfm-info">
                      Mindestens 2 Zeichen eingeben...
                  </div>
              `;

            return;
        }

        const selectedType =
              getSelectedBuildingType();

        const filteredBuildings = buildings
        .filter(building => {

            /**
           * Suchtext
           */

            if (!building._search.includes(search)) {
                return false;
            }

            /**
           * Gebäudetyp
           */

            if (
                selectedType !== null &&
                building.building_type !== selectedType
            ) {
                return false;
            }

            return true;
        })
        .slice(0, MAX_BUILDING_RESULTS);

        const fragment =
              document.createDocumentFragment();

        filteredBuildings.forEach(building => {

            const div = document.createElement('div');

            div.className = 'lssfm-target';

            if (selectedTarget?.id === building.id) {
                div.classList.add('lssfm-selected-target');
            }

            div.innerHTML = `
                  <div>${building.caption}</div>

                  <div style="font-size:11px;color:#aaa;">
                      ${BUILDING_TYPE_MAP[building.building_type] || 'Unbekannt'}
                      | ID: ${building.id}
                  </div>
              `;

            div.addEventListener('click', () => {

                selectedTarget = building;

                renderTargetResults();
            });

            fragment.appendChild(div);
        });

        container.innerHTML = '';

        container.appendChild(fragment);
    }

    // Funktion zum verschieben der Fahrzeuge
    async function moveSelectedVehicles() {

        if (!selectedVehicles.size) {

            alert('Keine Fahrzeuge ausgewählt');

            return;
        }

        if (!selectedTarget) {

            alert('Keine Zielwache ausgewählt');

            return;
        }

        const status =
              document.getElementById('lssfm-status');

        status.innerHTML = '';

        const selected = [...selectedVehicles];

        for (const vehicleId of selected) {

            const vehicle =
                  vehicleMap.get(vehicleId);

            /********************************************************
               * SICHERHEITSCHECK
               ********************************************************/

            const movable =
                  vehicle.fms_real === 2 ||
                  vehicle.fms_show === 2;

            if (!movable) {

                status.innerHTML += `
                      <div>
                          ⚠️ ${vehicle.caption}
                          nicht mehr verschiebbar
                      </div>
                  `;

                continue;
            }

            try {

                const url =
                      `/vehicles/${vehicleId}/move/do/${selectedTarget.id}`;

                await fetch(url, {
                    credentials: 'include'
                });

                status.innerHTML += `
                      <div>
                          ✅ ${vehicle.caption}
                      </div>
                  `;

            } catch (e) {

                console.error(e);

                status.innerHTML += `
                      <div>
                          ❌ ${vehicle.caption}
                      </div>
                  `;
            }

            await sleep(250);
        }

        status.innerHTML += `
              <hr>
              Fertig.
          `;

        selectedVehicles.clear();

        await loadData();

        renderVehicleList();
    }

    // UTILS
    function getSelectedBuildingType() {

        if (selectedVehicles.size) {

            const firstVehicleId =
                  [...selectedVehicles][0];

            const vehicle =
                  vehicleMap.get(firstVehicleId);

            if (vehicle) {

                const building =
                      buildingMap.get(vehicle.building_id);

                return building?.building_type ?? null;
            }
        }

        const search =
              document
        .getElementById('lssfm-search')
        ?.value
        ?.trim()
        ?.toLowerCase();

        if (!search || search.length < 2) {
            return null;
        }

        const matchingVehicles = vehicles.filter(vehicle =>
                                                 vehicle._search.includes(search)
                                                );

        if (!matchingVehicles.length) {
            return null;
        }

        const types = new Set();

        matchingVehicles.forEach(vehicle => {

            const building =
                  buildingMap.get(vehicle.building_id);

            if (building) {
                types.add(building.building_type);
            }
        });

        if (types.size === 1) {
            return [...types][0];
        }

        return null;
    }
    function sleep(ms) {

        return new Promise(resolve => setTimeout(resolve, ms));
    }
    function debounce(fn, delay = 150) {

        let timeout;

        return (...args) => {

            clearTimeout(timeout);

            timeout = setTimeout(() => {
                fn(...args);
            }, delay);
        };
    }

    init();
})();
