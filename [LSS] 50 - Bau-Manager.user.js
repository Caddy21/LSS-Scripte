// ==UserScript==
// @name         [LSS] Bau-Manager – Prototyp (Beta-Version)
// @namespace    lss.massbuild
// @version      0.9.5
// @description  Bauen bauen bauen
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const DEBUG = false;
    const log = (...args) => DEBUG && console.info('[LSS-MB]', ...args);
    const ALLIANCE_SCHOOL_TYPES = new Set([1, 3, 8, 10, 27]);
    const DYNAMIC_COST_TYPES = new Set([
        // Feuerwehr
        0, 18, // Feuerwache, Kleinwache
        6, 19, // Polizeiwache, Kleinwache
        9,     // THW
        25,    // Bergrettung
        26     // Seenotrettung
    ]);
    const START_VEHICLE_COSTS = {
        107: 4000, // LF-L
        90: 15000, // HLF 10
        30: 15000, // HLF 20
    };
    const BUILD_COST_CACHE = {};
    const FIRE_STATION_SMALL_TYPE = 18;
    const FIRE_STATION_SMALL_CREDIT_CAP = 1_000_000;
    const BUTTON_CLASSES = {
        primary: 'btn btn-primary btn-sm', // Blau
        info: 'btn btn-info btn-sm', // Hellblau
        success: 'btn btn-success btn-sm', // Grün
        danger: 'btn btn-danger btn-sm', // Rot
        warning: 'btn btn-warning btn-sm', // Gelb
        secondary: 'btn btn-secondary btn-sm', // Grau
        dark: 'btn btn-dark btn-sm', // Schwarz
    };
    const STATIC_COSTS = [
        { keywords: ['krankenhaus'], credits: 200000, coins: 35 },
        { keywords: ['polizeihubschrauberstation', 'rettungshubschrauber-station', 'hubschrauberstation seenotrettung' ], credits: 1000000, coins: 50 },
        { keywords: ['wasserrettung'], credits: 500000, coins: 50 },
        { keywords: ['polizei-sondereinheiten'], credits: 400000, coins: 40 },
        { keywords: ['rettungshundestaffel'], credits: 450000, coins: 50 },
        { keywords: ['reiterstaffel'], credits: 300000, coins: 50 },
        { keywords: ['bereitschaftspolizei'], credits: 500000, coins: 50 },
        { keywords: ['bereitstellungsraum'], credits: 0, coins: 0 },
        { keywords: ['verbandszellen'], credits: 100000, coins: 0 },
        { keywords: ['feuerwehrschule', 'thw bundesschule', 'polizeisschule', 'rettungsschule', 'schule für seefahrt und seenotrettung'], credits: 500000, coins: 50 },
        { keywords: ['schnelleinsatzgruppe (seg)'], credits: 100000, coins: 30 }
    ];
    const LSS_MB = {
        state: {
            markers: [],
            queue: [],
            map: null,
            userInfo: null,
            buildingsData: null,
            buildRows: [],
            buildRowCounter: 0,
            userBuildings: {},
            userBuildingsTotal: 0,

            alliance: {
                roles: [],
                canBuildAllianceHospital: false
            }

        },

        init() {
            log('Init gestartet');
            this.waitForMap();
            this.injectMenu();
            log('Initialisiert');
        },

        waitForMap() {
            const i = setInterval(() => {
                if (window.map && typeof window.map.addLayer === 'function') {
                    clearInterval(i);
                    this.state.map = window.map;
                    log('Karte erkannt', window.map);
                }
            }, 500);
        },

        fetchBuildings() {
            log('Lade buildings von API...');
            return fetch('https://api.lss-manager.de/de_DE/buildings')
                .then(res => res.json())
                .then(data => {
                let list = [];
                if (Array.isArray(data.buildings)) {
                    list = data.buildings;
                } else if (Array.isArray(data)) {
                    // selten — falls API direkt ein Array zurückgibt
                    list = data;
                } else if (data && typeof data === 'object') {
                    // häufig: keyed object wie { "25": {...}, "26": {...}, "locale": "de" }
                    list = Object.entries(data)
                        .map(([key, val]) => {
                        if (!val || typeof val !== 'object') return null;
                        // Falls building_type nicht im Objekt ist, verwenden wir den Key als ID
                        if (typeof val.building_type === 'undefined') {
                            const n = Number(key);
                            if (!Number.isNaN(n)) {
                                val.building_type = n;
                            }
                        }
                        // setze auch id falls fehlt (hilfreich für spätere Verwendung)
                        if (typeof val.id === 'undefined') {
                            const n = Number(key);
                            if (!Number.isNaN(n)) val.id = n;
                        }
                        return val;
                    })
                        .filter(Boolean);
                } else {
                    list = Object.values(data);
                }

                // Entferne Komplextypen wie vorher
                list = list.filter(b => {
                    const c = (b.caption || '').toLowerCase();
                    return !c.includes('kleiner komplex') && !c.includes('großer komplex');
                });

                this.state.buildingsData = list;
                log('Wachentypen geladen (komplexe entfernt):', this.state.buildingsData);
                this.ui.createBuildRow();
            })
                .catch(err => {
                log('Fehler beim Laden von Wachentypen:', err);
            });
        },

        injectMenu() {
            const i = setInterval(() => {
                const profileMenu = document.querySelector('ul.dropdown-menu[aria-labelledby="menu_profile"]');
                if (!profileMenu) return;

                if (document.getElementById('lss_mb_menu_entry')) {
                    clearInterval(i);
                    log('Menüeintrag bereits vorhanden, stoppe Polling');
                    return;
                }

                clearInterval(i);

                const li = document.createElement('li');
                li.role = 'presentation';
                li.id = 'lss_mb_menu_entry';
                li.innerHTML = `<a href="#" id="lss_mb_open"> <span class="glyphicon glyphicon-home"></span>&nbsp;&nbsp; Bau-Manager</a>`;

                const firstDivider = profileMenu.querySelector('.divider');
                if (firstDivider) profileMenu.insertBefore(li, firstDivider);
                else profileMenu.appendChild(li);

                document.getElementById('lss_mb_open').addEventListener('click', async e => {
                    e.preventDefault();

                    // 1️⃣ Userinfo laden
                    try {
                        const res = await fetch('/api/userinfo');
                        const data = await res.json();
                        LSS_MB.state.userInfo = data;
                        log('Userinfo geladen:', data);
                    } catch (err) {
                        log('Fehler beim Laden der Userinfo:', err);
                        return;
                    }

                    // 2️⃣ Verbandsinfo laden (erst nachdem Userinfo da ist)
                    await initAllianceInfo();
                    LSS_MB.ui.open();
                });

                log('Menüeintrag hinzugefügt');
            }, 500);
        },

        mapApi: {
            addMarker(lat, lng) {
                if (!LSS_MB.state.map) {
                    log('addMarker: map nicht vorhanden');
                    return;
                }
                const marker = L.marker([lat, lng], { draggable: true }).addTo(LSS_MB.state.map);
                marker.on('dragend', () => {
                    const pos = marker.getLatLng();
                    log('Marker verschoben:', pos.lat, pos.lng);
                });
                LSS_MB.state.markers.push(marker);
                log('Marker gesetzt:', lat, lng);
            }
        },

        queueApi: {
            add(entry) {
                LSS_MB.state.queue.push(entry);
                log('Queue hinzugefügt:', entry);
            },
            dump() {
                log('Aktuelle Queue:', LSS_MB.state.queue);
            }
        },

        ui: {
            async open() {
                log('UI öffnen angefordert');

                let container = document.getElementById('lss_mb_build_ui');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'lss_mb_build_ui';
                    Object.assign(container.style, {
                        position: 'fixed',
                        top: '10px',
                        left: '10px',
                        width: '99%',
                        overflowY: 'auto',
                        padding: '15px',
                        zIndex: 9999,
                        borderRadius: '8px',
                        boxShadow: '0 0 15px rgba(0,0,0,0.3)',
                        fontFamily: 'Arial, sans-serif',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        backgroundColor: '#f9f9f9'
                    });
                    this.applyTheme(container);

                    const headerContainer = document.createElement('div');
                    Object.assign(headerContainer.style, {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '10px'
                    });

                    const header = document.createElement('h3');
                    header.textContent = '🧱 Bau-Manager 🧱';
                    header.style.margin = '0';
                    header.style.fontSize = '18px';
                    header.style.fontWeight = '600';

                    const titleWrapper = document.createElement('div');
                    titleWrapper.style.display = 'flex';
                    titleWrapper.style.flexDirection = 'column';

                    titleWrapper.appendChild(header);

                    const description = document.createElement('small');
                    description.textContent = 'Plane und errichte mehrere Gebäude mit wenigen Schritten in wenigen Minuten.';
                    Object.assign(description.style, {
                        fontSize: '16px',
                        color: '#666',
                        marginTop: '2px'
                    });

                    titleWrapper.appendChild(description);

                    // Button-Group (rechts im Header)
                    const btnGroup = document.createElement('div');
                    btnGroup.style.display = 'flex';
                    btnGroup.style.alignItems = 'center';

                    // --- Minimize Button ---
                    const minimizeBtn = document.createElement('button');
                    minimizeBtn.id = 'lss_mb_minimize_btn';
                    minimizeBtn.className = BUTTON_CLASSES.info;
                    minimizeBtn.style.marginLeft = '8px';
                    minimizeBtn.title = 'Minimieren / Wiederherstellen';

                    // helper: set collapsed state (persistiert in localStorage)
                    function setMinimized(min) {
                        container.dataset.minimized = min ? '1' : '0';
                        const resDiv = document.getElementById('lss_mb_resources');
                        const rowsWrapper = document.getElementById('lss_mb_rows_wrapper');
                        const buttonsWrapper = document.getElementById('lss_mb_buttons_wrapper');

                        if (min) {
                            if (resDiv) resDiv.style.display = 'none';
                            if (rowsWrapper) rowsWrapper.style.display = 'none';
                            if (buttonsWrapper) buttonsWrapper.style.display = 'none';
                            minimizeBtn.textContent = '▸';
                        } else {
                            if (resDiv) resDiv.style.display = '';
                            if (rowsWrapper) rowsWrapper.style.display = 'flex';
                            if (buttonsWrapper) buttonsWrapper.style.display = 'flex';
                            minimizeBtn.textContent = '▾';
                            try { if (typeof updateCostPreview === 'function') updateCostPreview(); } catch (e) { log('updateCostPreview Fehler nach Restore', e); }
                        }

                        try { localStorage.setItem('lss_mb_minimized', min ? '1' : '0'); } catch (e) {}
                    }

                    minimizeBtn.addEventListener('click', () => {
                        const cur = container.dataset.minimized === '1';
                        setMinimized(!cur);
                    });

                    const closeBtn = document.createElement('button');
                    closeBtn.className = BUTTON_CLASSES.danger;
                    closeBtn.textContent = 'Schließen';
                    closeBtn.style.marginLeft = '8px';
                    closeBtn.addEventListener('click', () => {
                        container.style.display = 'none';
                        log('UI geschlossen');

                        if (LSS_MB.state.buildRows?.length) {
                            LSS_MB.state.buildRows.forEach(r => {
                                if (r.marker) {
                                    try { LSS_MB.state.map.removeLayer(r.marker); } catch (e) { log('Fehler beim Entfernen des Markers beim Schließen', e); }
                                }
                            });
                        }
                        LSS_MB.state.buildRows = [];
                        LSS_MB.state.buildRowCounter = 0;
                    });

                    // Packe Buttons in die Gruppe, damit Header (links) und Buttons (rechts) sauber ausgerichtet sind
                    btnGroup.appendChild(minimizeBtn);
                    btnGroup.appendChild(closeBtn);

                    headerContainer.appendChild(titleWrapper);
                    headerContainer.appendChild(btnGroup);
                    container.appendChild(headerContainer);

                    const resources = document.createElement('div');
                    resources.id = 'lss_mb_resources';
                    resources.style.marginBottom = '10px';
                    resources.textContent = 'Lade Ressourcen…';
                    container.appendChild(resources);

                    document.body.appendChild(container);
                    log('UI Container erstellt');

                    // Beim erstmaligen Erstellen den gespeicherten Minimzed-Zustand anwenden
                    try {
                        const saved = localStorage.getItem('lss_mb_minimized');
                        if (saved === '1') {
                            // setTimeout, damit DOM (rows/buttons) evtl. später erzeugte Elemente korrekt gefunden werden
                            setTimeout(() => setMinimized(true), 0);
                        } else {
                            // Default sichtbar
                            minimizeBtn.textContent = '▾';
                            container.dataset.minimized = '0';
                        }
                    } catch (e) {
                        minimizeBtn.textContent = '▾';
                        container.dataset.minimized = '0';
                    }

                } else {
                    container.style.display = 'flex';
                    log('UI Container wieder sichtbar gemacht');

                    // Beim Wiederöffnen ggf. gespeicherten Zustand anwenden (falls zuvor minimiert)
                    try {
                        const saved = localStorage.getItem('lss_mb_minimized');
                        if (saved === '1') {
                            setTimeout(() => {
                                // setMinimized ist im Erstellungs-Block definiert; falls der Container schon existiert,
                                // definieren wir eine local helper-Funktion hier kurz neu, die das gleiche Verhalten hat.
                                const resDiv = document.getElementById('lss_mb_resources');
                                const rowsWrapper = document.getElementById('lss_mb_rows_wrapper');
                                const buttonsWrapper = document.getElementById('lss_mb_buttons_wrapper');
                                if (resDiv) resDiv.style.display = 'none';
                                if (rowsWrapper) rowsWrapper.style.display = 'none';
                                if (buttonsWrapper) buttonsWrapper.style.display = 'none';
                                const mb = document.getElementById('lss_mb_minimize_btn');
                                if (mb) mb.textContent = '▸';
                                container.dataset.minimized = '1';
                            }, 0);
                        } else {
                            const mb = document.getElementById('lss_mb_minimize_btn');
                            if (mb) mb.textContent = '▾';
                            container.dataset.minimized = '0';
                        }
                    } catch (e) { /* ignore */ }
                }

                if (!LSS_MB.state.buildingsData) {
                    await LSS_MB.fetchBuildings();
                }

                try {
                    const res = await fetch('/api/userinfo');
                    const data = await res.json();
                    LSS_MB.state.userInfo = data;
                    this.updateResources();
                    log('Ressourcen aktualisiert beim Öffnen:', data.credits_user_current, data.coins_user_current);
                } catch (err) {
                    log('Fehler beim Laden der Userinfo:', err);
                }

                try {
                    await fetchUserBuildingsCount();
                    log('User-Building-Counts geladen:', LSS_MB.state.userBuildings, 'total=', LSS_MB.state.userBuildingsTotal);
                } catch (e) {
                    log('Fehler beim Laden der User-Building-Counts', e);
                }

                if (LSS_MB.state.buildRows?.length) {
                    LSS_MB.state.buildRows.forEach(r => {
                        if (r.marker) {
                            try { LSS_MB.state.map.removeLayer(r.marker); } catch (e) { log('Fehler beim Entfernen eines Markers', e); }
                        }
                    });
                }
                LSS_MB.state.buildRows = [];
                LSS_MB.state.buildRowCounter = 0;

                const oldWrapper = document.getElementById('lss_mb_rows_wrapper');
                if (oldWrapper) {
                    oldWrapper.remove();
                    log('Alter rows_wrapper entfernt');
                }

                this.createBuildRow();
                log('Erste Build-Reihe erzeugt');

            },

            getMode() {
                return document.body.classList.contains('dark') ? 'dark' : 'light';
            },

            applyTheme(container) {
                const mode = this.getMode();
                if (mode === 'dark') {
                    container.style.backgroundColor = 'rgba(25,25,25,0.95)';
                    container.style.color = '#EEE';
                    container.style.border = '1px solid #444';
                } else {
                    container.style.backgroundColor = '#FFF';
                    container.style.color = '#000';
                    container.style.border = '1px solid #CCC';
                }
            },

            updateResources() {
                const resDiv = document.getElementById('lss_mb_resources');
                if (!resDiv || !LSS_MB.state.userInfo) {
                    log('updateResources: keine userInfo vorhanden');
                    return;
                }

                const creditsVal = Number(LSS_MB.state.userInfo.credits_user_current) || 0;
                const coinsVal = Number(LSS_MB.state.userInfo.coins_user_current) || 0;

                const creditsFormatted = creditsVal.toLocaleString('de-DE');
                const coinsFormatted = coinsVal.toLocaleString('de-DE');

                // Immer die Grundinfos anzeigen
                let html = `💰 Eigene Credits: ${creditsFormatted} | 🪙 Coins: ${coinsFormatted}`;

                // Verbandscredits nur zeigen wenn vorhanden / berechtigt
                if (LSS_MB.state.alliance.canBuildAllianceHospital && typeof LSS_MB.state.alliance.credits === 'number') {
                    const allianceCreditsFormatted =
                          LSS_MB.state.alliance.credits.toLocaleString('de-DE');
                    html += `<br>🏛️ Verbandscredits: ${allianceCreditsFormatted}`;
                }

                // Kostenvorschau-Container IMMER anfügen (Platzhalterwerte)
                html += `
                    <hr style="margin:6px 0;">
                    <div id="lss_mb_cost_preview">
                        💸 <strong>Kostenvorschau</strong> 💸<br>
                        💰 Credits: 0 |🪙 Coins: 0
                        ${LSS_MB.state.alliance.canBuildAllianceHospital ? '<br>🏛️ Verbandscredits: 0' : ''}
                    </div>
                `;

                resDiv.innerHTML = html;

                log(
                    'Ressourcen aktualisiert:',
                    'user=', creditsFormatted,
                    'coins=', coinsFormatted,
                    'alliance=', LSS_MB.state.alliance.credits
                )
            },

            createBuildRow() {
                const container = document.getElementById('lss_mb_build_ui');
                if (!container) {
                    log('createBuildRow: container nicht gefunden');
                    return;
                }

                const rowId = ++LSS_MB.state.buildRowCounter;
                const rowState = { id: rowId, marker: null, data: {} };
                LSS_MB.state.buildRows.push(rowState);
                log('Neue Reihe erzeugt, id=', rowId);

                let rowsWrapper = document.getElementById('lss_mb_rows_wrapper');
                if (!rowsWrapper) {
                    rowsWrapper = document.createElement('div');
                    rowsWrapper.id = 'lss_mb_rows_wrapper';
                    Object.assign(rowsWrapper.style, {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    });
                    container.appendChild(rowsWrapper);
                    log('Rows wrapper erstellt');
                }

                let buildings = LSS_MB.state.buildingsData;
                if (!Array.isArray(buildings)) buildings = Object.values(buildings);
                if (!buildings.length) {
                    log('Keine buildings-Daten verfügbar');
                    return;
                }

                const flexDiv = document.createElement('div');
                flexDiv.dataset.rowId = rowId;
                Object.assign(flexDiv.style, {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    alignItems: 'center'
                });
                rowsWrapper.appendChild(flexDiv);

                const mode = document.body.classList.contains('dark') ? 'dark' : 'light';
                const bgColor = mode === 'dark' ? '#2b2b2b' : '#fff';
                const textColor = mode === 'dark' ? '#eee' : '#000';
                const borderColor = mode === 'dark' ? '#555' : '#ccc';

                function addField(el, width = '180px') {
                    el.style.boxSizing = 'border-box';
                    el.style.flex = `0 0 ${width}`;
                    el.style.height = '30px';
                    el.style.padding = '2px 6px';
                    el.style.borderRadius = '4px';
                    if (el.tagName !== 'BUTTON') {
                        el.style.border = `1px solid ${borderColor}`;
                        el.style.backgroundColor = bgColor;
                        el.style.color = textColor;
                        el.style.lineHeight = '26px';
                    } else {
                        el.style.lineHeight = 'normal';
                        el.style.cursor = 'pointer';
                    }
                    el.style.fontSize = '13px';
                    el.style.fontFamily = 'inherit';
                    el.style.margin = '0';
                    el.style.verticalAlign = 'middle';
                    flexDiv.appendChild(el);
                    return el;
                }

                const userLevel = Number(LSS_MB.state.userInfo?.user_level ?? 0);
                const canUseHLF = userLevel >= 5;

                const select = addField(document.createElement('select'));
                select.innerHTML = `<option disabled selected>Wachentyp wählen</option>`;

                // Anzeige der Anzahl der Wachen
                const numberLabel = addField(document.createElement('div'), '100px');
                numberLabel.id = `lss_mb_number_${rowId}`;
                numberLabel.textContent = '#';
                numberLabel.style.backgroundColor = mode === 'dark' ? '#444' : '#f0f0f0';
                numberLabel.style.color = textColor;
                numberLabel.style.textAlign = 'center';
                numberLabel.style.lineHeight = '26px';

                // ---- Level-Filter beim Aufbau der Select-Optionen ----
                buildings.forEach(b => {
                    const type = b.building_type;
                    const caption = (b.caption || '').toLowerCase();

                    if (
                        (type === 26 && userLevel < 4) ||
                        (type === 25 && userLevel < 0) ||
                        ((type === 5 || type === 13) && userLevel < 7) ||
                        (type === 28 && userLevel < 5) ||
                        (type === 24 && userLevel < 3) ||
                        (type === 15 && userLevel < 6) ||
                        (type === 16 && !LSS_MB.state.alliance.canBuildAllianceHospital)
                    ) {
                        return;
                    }

                    const opt = document.createElement('option');
                    opt.value = String(b.building_type);
                    opt.textContent = b.caption;
                    select.appendChild(opt);
                });

                const hospitalModeSelect = addField(document.createElement('select'), '160px');
                hospitalModeSelect.style.display = 'none';

                hospitalModeSelect.innerHTML = `
                <option value="own">Eigenes Krankenhaus</option>
                <option value="alliance">Verbandskrankenhaus</option>
                `;

                hospitalModeSelect.addEventListener('change', async () => {
                    rowState.data.hospitalMode = hospitalModeSelect.value;
                    await updateCostPreview();
                });

                const schoolModeSelect = addField(document.createElement('select'), '160px');
                schoolModeSelect.style.display = 'none';

                schoolModeSelect.innerHTML = `
                <option value="own">Eigene Schule</option>
                <option value="alliance">Verbandsschule</option>
                `;

                schoolModeSelect.addEventListener('change', async () => {
                    rowState.data.schoolMode = schoolModeSelect.value;
                    await updateCostPreview();
                });

                const creditsLabel = addField(document.createElement('div'), '120px');
                creditsLabel.id = `lss_mb_credits_${rowId}`;
                creditsLabel.textContent = '💰 -';
                creditsLabel.style.backgroundColor = mode === 'dark' ? '#444' : '#f0f0f0';
                creditsLabel.style.color = textColor;
                creditsLabel.style.textAlign = 'center';
                creditsLabel.style.lineHeight = '26px';

                const coinsLabel = addField(document.createElement('div'), '120px');
                coinsLabel.id = `lss_mb_coins_${rowId}`;
                coinsLabel.textContent = '🪙 -';
                coinsLabel.style.backgroundColor = mode === 'dark' ? '#444' : '#f0f0f0';
                coinsLabel.style.color = textColor;
                coinsLabel.style.textAlign = 'center';
                coinsLabel.style.lineHeight = '26px';

                // WICHTIG: select handler wartet jetzt auf async getCostsForBuilding
                select.addEventListener('change', async () => {
                    rowState.data.buildingType = select.value;

                    const typeId = Number(select.value);
                    const building = buildings.find(
                        b => Number(b.building_type) === typeId
                    );

                    if (!building) {
                        console.warn('[LSS-MB] building_type nicht gefunden:', typeId);
                        return;
                    }

                    rowState.data.buildingType = String(typeId);
                    rowState.data.building = building;
                    updateMarkerLabel(rowState);

                    // Nur Krankenhaus
                    if (typeId === 4) {
                        rowState.data.hospitalMode = 'own';
                        if (LSS_MB.state.alliance.canBuildAllianceHospital) {
                            hospitalModeSelect.style.display = 'block';
                            hospitalModeSelect.value = 'own';
                        } else {
                            hospitalModeSelect.style.display = 'none';
                        }
                    } else {
                        hospitalModeSelect.style.display = 'none';
                        delete rowState.data.hospitalMode;
                    }

                    // ===== Schulen =====
                    if (ALLIANCE_SCHOOL_TYPES.has(typeId)) {
                        rowState.data.schoolMode = 'own';

                        if (LSS_MB.state.alliance.canBuildAllianceHospital) {
                            schoolModeSelect.style.display = 'block';
                            schoolModeSelect.value = 'own';
                        } else {
                            schoolModeSelect.style.display = 'none';
                        }
                    } else {
                        schoolModeSelect.style.display = 'none';
                        delete rowState.data.schoolMode;
                    }
                    await updateCostPreview();
                });

                const originalInput = document.getElementById('map_adress_search');
                const originalForm = document.getElementById('map_adress_search_form');
                let addressInput = null;
                if (originalInput && originalForm) {
                    addressInput = originalInput.cloneNode(true);
                    addressInput.value = '';
                    addressInput.defaultValue = '';
                    addressInput.removeAttribute('value');
                    addressInput.className = '';
                    addressInput.placeholder = 'Adresse der Wache (optional)';
                    addField(addressInput, '200px');
                    addressInput.addEventListener('keydown', e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            originalInput.value = addressInput.value;
                            originalForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                        }
                    });
                }
                addressInput?.addEventListener('input', () => {
                    rowState.data.address = addressInput.value;
                    log('Adresse eingegeben für Reihe', rowId, rowState.data.address);
                });

                const nameInput = addField(document.createElement('input'));
                nameInput.placeholder = 'Name der Wache';
                nameInput.addEventListener('input', () => {
                    rowState.data.name = nameInput.value;
                    updateMarkerLabel(rowState);
                });

                const lstSelect = addField(document.createElement('select'));
                lstSelect.innerHTML = `<option disabled selected>Leitstelle wählen</option>`;
                lstSelect.addEventListener('change', () => rowState.data.leitstelle = lstSelect.value);
                fetch('/api/buildings')
                    .then(r => r.json())
                    .then(data => {
                    data.filter(b => b.building_type === 7).forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.id;
                        opt.textContent = b.caption;
                        lstSelect.appendChild(opt);
                    });
                    log('Leitstellen geladen und ins Select eingefügt');
                }).catch(e => { log('Fehler beim Laden von Leitstellen', e); });

                const vehicleSelect = addField(document.createElement('select'));
                vehicleSelect.style.display = 'none';
                vehicleSelect.addEventListener('change', async () => {
                    rowState.data.startVehicle = vehicleSelect.value;
                    await updateCostPreview();
                });

                const vehicleMapping = {
                    "LF 20": 0, "LF 10": 1, "LF 8/6": 6, "LF 20/16": 7,
                    "LF 10/6": 8, "LF 16-TS": 9, "LF-L": 107, "KLF": 88,
                    "MLF": 89, "TSF-W": 37, "HLF 10": 90, "HLF 20": 30
                };

                select.addEventListener('change', () => {
                    vehicleSelect.innerHTML = '';
                    vehicleSelect.style.display = 'none';
                    const typeId = Number(select.value);
                    const building = buildings.find(
                        b => Number(b.building_type) === typeId
                    );
                    if (!building) return;

                    if (building.caption.toLowerCase().includes('feuerwache') && Array.isArray(building.startVehicles)) {
                        const placeholder = document.createElement('option');
                        placeholder.disabled = true;
                        placeholder.selected = true;
                        placeholder.textContent = 'Startfahrzeug wählen';
                        vehicleSelect.appendChild(placeholder);

                        const added = new Set();
                        building.startVehicles.forEach(v => {
                            if (!(v in vehicleMapping) || added.has(v)) return;

                            const opt = document.createElement('option');
                            opt.value = vehicleMapping[v]; // LF 20 => 0 ✅
                            opt.textContent = v;
                            vehicleSelect.appendChild(opt);
                            added.add(v);
                        });

                        if (!added.has('LF-L')) {
                            const opt = document.createElement('option');
                            opt.value = vehicleMapping['LF-L'];
                            opt.textContent = 'LF-L';
                            vehicleSelect.appendChild(opt);
                            added.add('LF-L');
                        }

                        if (canUseHLF) {
                            ['HLF 10','HLF 20'].forEach(v => {
                                if (added.has(v)) return;
                                const opt = document.createElement('option');
                                opt.value = vehicleMapping[v];
                                opt.textContent = v;
                                vehicleSelect.appendChild(opt);
                            });
                        }

                        vehicleSelect.style.display = 'block';
                        log('Fahrzeugauswahl angezeigt für Reihe', rowId);
                    }
                });

                const markerBtn = addField(document.createElement('button'));
                markerBtn.className = BUTTON_CLASSES.primary;
                markerBtn.textContent = 'Marker setzen';
                markerBtn.addEventListener('click', () => {
                    if (!LSS_MB.state.map) {
                        log('Marker setzen: Map nicht verfügbar');
                        return;
                    }

                    if (!rowState.marker) {
                        markerBtn.textContent = 'Marker löschen';
                        markerBtn.className = BUTTON_CLASSES.danger;

                        const c = LSS_MB.state.map.getCenter();
                        LSS_MB.mapApi.addMarker(c.lat, c.lng);

                        const marker = LSS_MB.state.markers.at(-1);
                        if (!marker) {
                            alert('Marker konnte nicht gesetzt werden');
                            return;
                        }

                        rowState.marker = marker;
                        marker.__rowId = rowId;

                        // 🏷️ Label setzen
                        updateMarkerLabel(rowState);

                        const p = marker.getLatLng();
                        rowState.data.lat = p.lat;
                        rowState.data.lng = p.lng;

                        marker.on('dragend', () => {
                            const p = marker.getLatLng();
                            rowState.data.lat = p.lat;
                            rowState.data.lng = p.lng;
                        });

                        log('Marker gesetzt für Reihe', rowId);
                        return;
                    }

                    LSS_MB.state.map.removeLayer(rowState.marker);
                    LSS_MB.state.markers =
                        LSS_MB.state.markers.filter(m => m !== rowState.marker);

                    rowState.marker = null;

                    markerBtn.textContent = 'Marker setzen';
                    markerBtn.className = BUTTON_CLASSES.primary;

                    log('Marker gelöscht für Reihe', rowId);
                });

                const deleteBtn = addField(document.createElement('button'),'120px');
                deleteBtn.className = BUTTON_CLASSES.danger;
                deleteBtn.textContent = '🗑 Entfernen';
                deleteBtn.addEventListener('click', () => {
                    if (rowState.marker) try { LSS_MB.state.map.removeLayer(rowState.marker); } catch (e) { log('Fehler beim Entfernen Marker beim Löschen der Reihe', e); }
                    LSS_MB.state.markers = LSS_MB.state.markers.filter(m => m.__rowId !== rowId);
                    LSS_MB.state.buildRows = LSS_MB.state.buildRows.filter(r => r.id !== rowId);
                    flexDiv.remove();
                    log('Reihe entfernt:', rowId);
                    updateCostPreview();
                });
                injectGlobalButtons();
            }
        }
    };

    // ----- Alliance-Info sauber laden -----
    async function initAllianceInfo() {
        log('[LSS-MB][ALLIANCE] Lade Alliance-Info …');

        try {
            const res = await fetch('/api/allianceinfo');
            const allianceData = await res.json();

            const currentUserId = Number(LSS_MB.state.userInfo?.user_id);
            if (!currentUserId) {
                console.warn('[LSS-MB][ALLIANCE] Kein user_id verfügbar – Alliance-Check übersprungen');
                LSS_MB.state.alliance.canBuildAllianceHospital = false;
                return;
            }

            // users ist ein Objekt mit numerischen Keys → in Array umwandeln
            const usersArray = allianceData.users ? Object.values(allianceData.users) : [];

            // aktuellen User finden
            const me = usersArray.find(u => Number(u.id) === currentUserId);
            if (!me) {
                console.warn('[LSS-MB][ALLIANCE] User nicht im Verband gefunden – Verbandsbau nicht erlaubt');
                LSS_MB.state.alliance.canBuildAllianceHospital = false;
                return;
            }

            // Berechtigung prüfen
            const canBuild = !!(me.role_flags?.finance || me.role_flags?.admin || me.role_flags?.coadmin);

            LSS_MB.state.alliance.roles = me.roles || [];
            LSS_MB.state.alliance.canBuildAllianceHospital = canBuild;
            LSS_MB.state.alliance.credits = Number(allianceData.credits_current) || 0;

            log(
                '[LSS-MB][ALLIANCE] Rollen:',
                me.roles,
                '| Verbandskrankenhaus erlaubt:',
                canBuild
            );

        } catch (e) {
            console.error('[LSS-MB][ALLIANCE] Fehler beim Laden der Allianzdaten', e);
            LSS_MB.state.alliance.roles = [];
            LSS_MB.state.alliance.canBuildAllianceHospital = false;
        }
    }

    // Button einfügen
    function injectGlobalButtons() {
        let wrapper = document.getElementById('lss_mb_buttons_wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'lss_mb_buttons_wrapper';
            Object.assign(wrapper.style, {
                gap: '10px',
                marginTop: '12px',
                display: 'flex',
                flexWrap: 'wrap'
            });
            document.getElementById('lss_mb_build_ui').appendChild(wrapper);
            log('Buttons wrapper erstellt');
        }

        if (!document.getElementById('lss_mb_add_row_btn')) {
            const greenBtn = document.createElement('button');
            greenBtn.id = 'lss_mb_add_row_btn';
            greenBtn.className = BUTTON_CLASSES.primary;
            greenBtn.textContent = 'Weitere Wache/Gebäude hinzufügen';
            greenBtn.style.height = '30px';
            greenBtn.style.padding = '0 12px';
            greenBtn.addEventListener('click', () => {
                log('AddRow Button geklickt');
                LSS_MB.ui.createBuildRow();
            });
            wrapper.appendChild(greenBtn);
            log('AddRow Button hinzugefügt');
        }

        if (!document.getElementById('lss_mb_build_all_btn')) {
            const buildBtn = document.createElement('button');
            buildBtn.id = 'lss_mb_build_all_btn';
            buildBtn.className = BUTTON_CLASSES.success;
            buildBtn.textContent = 'Wachen/Gebäude bauen';
            buildBtn.style.height = '30px';
            buildBtn.style.padding = '0 12px';
            buildBtn.addEventListener('click', async () => {
                log('BuildAll Button geklickt');
                buildBtn.disabled = true;
                buildBtn.textContent = 'Baue…';

                try {
                    await buildAll();
                } catch (e) {
                    log('Fehler beim buildAll:', e);
                } finally {
                    buildBtn.disabled = false;
                    buildBtn.textContent = 'Wachen/Gebäude bauen';
                    log('buildAll fertig / Buttons zurückgesetzt');
                }
            });
            wrapper.appendChild(buildBtn);
            log('BuildAll Button hinzugefügt');
        }
    }

    // Fehlerhaftes Feld anzeigen
    function highlightField(el, isError) {
        if (!el) return;
        el.style.borderColor = isError ? '#ff4d4f' : '';
    }

    // Funktion um den Maker zu benennen
    function updateMarkerLabel(rowState) {
        if (!rowState.marker) return;

        const parts = [];

        parts.push(`Reihe ${rowState.id}`);

        if (rowState.data.building?.caption)
            parts.push(rowState.data.building.caption);
        if (rowState.data.name)
            parts.push(rowState.data.name);

        const label = parts.join(' – ');

        rowState.marker.bindTooltip(label, {
            permanent: true,
            direction: 'top',
            offset: [0, -10]
        }).openTooltip();
    }

    // Funktion um die Wachen zu bauen
    async function buildAll() {
        for (const row of LSS_MB.state.buildRows) {
            const d = row.data;
            if (
                d.building &&
                String(d.building.building_type) !== String(d.buildingType)
            ) {
                console.error(
                    '[LSS-MB][FATAL] building_type-Mismatch',
                    d.building.building_type,
                    d.buildingType
                );
                alert(`❌ Interner Fehler in Reihe ${row.id} (Gebäudetyp inkonsistent)`);
                return;
            }
        }
        const rows = LSS_MB.state.buildRows;
        const errorMessages = [];

        log('buildAll gestartet, Reihenanzahl=', rows.length);

        for (let row of rows) {
            try {
                await validateRow(row);
            } catch (e) {
                errorMessages.push(`Reihe ${row.id}: ${e.message}`);
            }
        }

        if (errorMessages.length > 0) {
            log('Fehler beim Bau, Abbruch:', errorMessages);
            alert('❌ Fehler beim Bau:\n' + errorMessages.join('\n'));
            return;
        }

        for (let row of rows) {
            const d = row.data;
            const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
            const fd = new FormData();
            fd.append('authenticity_token', csrf);
            fd.append('building[building_type]', d.buildingType);
            fd.append('building[name]', d.name);
            fd.append('building[latitude]', d.lat);
            fd.append('building[longitude]', d.lng);
            fd.append('building[address]', '');
            fd.append('building[leitstelle_building_id]', d.leitstelle || '');
            if (d.startVehicle) {
                const key = d.buildingType === '18'
                ? 'building[start_vehicle_feuerwache_kleinwache]'
                : 'building[start_vehicle_feuerwache]';
                fd.append(key, d.startVehicle);
            }

            const typeId = Number(d.building?.building_type);

            // ===== Krankenhaus =====
            if (typeId === 4) {
                if (d.hospitalMode === 'alliance') {
                    // Verbandskrankenhaus
                    fd.append('commit', 'Bauen 200.000 Credits');
                    fd.append('alliance', '1');
                    console.info('[LSS-MB][BUILD]', 'Reihe', row.id, '→ Verbandskrankenhaus');
                } else {
                    // Eigenes Krankenhaus
                    fd.append('commit', 'Bauen 200.000 Credits');
                    console.info('[LSS-MB][BUILD]', 'Reihe', row.id, '→ Eigenes Krankenhaus');
                }
            }

            if (typeId === 16) {
                fd.append('commit', 'Bauen 200.000 Credits');
                fd.append('alliance', '1');
                console.info('[LSS-MB][BUILD]', 'Reihe', row.id, '→ Verbandszellen');
            }

            if (ALLIANCE_SCHOOL_TYPES.has(typeId)) {
                if (d.schoolMode === 'alliance') {
                    fd.append('commit', 'Bauen 200.000 Credits');
                    fd.append('alliance', '1');
                    console.info('[LSS-MB][BUILD]', 'Reihe', row.id, '→ Verbandsschule');
                } else {
                    fd.append('commit', 'Bauen 200.000 Credits');
                }
            }

            // Debug: FormData ausgeben
            console.log(`[LSS-MB][POST] Reihe ${row.id} FormData:`);
            for (let [k, v] of fd.entries()) {
                console.log('   ', k, '=', v);
            }

            log('Sende POST für Reihe', row.id, d);
            try {
                const resp = await fetch('/buildings', { method: 'POST', body: fd, credentials: 'same-origin' });
                log('POST abgeschlossen f��r Reihe', row.id, 'Status:', resp.status);
            } catch (e) {
                log('Fehler beim POST für Reihe', row.id, e);
            }
            await new Promise(r => setTimeout(r, 700));
        }

        log('buildAll fertig, reload');
        alert(`✅ Fertig: ${rows.length} Gebäude gebaut`);
        location.reload();
    }

    // Funktion um die Kosten zu berechnen
    async function validateRow(rowState) {
        const d = rowState.data;

        const rowEl = document.querySelector(`[data-row-id="${rowState.id}"]`);
        const selects = rowEl?.querySelectorAll('select');
        const typeSelect = selects ? selects[0] : null;
        const addressInput = rowEl?.querySelector('input[placeholder="Adresse der Wache"]');
        const nameInput = rowEl?.querySelector('input[placeholder="Name der Wache"]');

        [typeSelect, addressInput, nameInput].forEach(f => highlightField(f, false));

        const errors = [];
        if (!d.buildingType) { errors.push('Kein Wachentyp gewählt'); highlightField(typeSelect, true); }
        if (!d.name) { errors.push('Kein Wachenname angegeben'); highlightField(nameInput, true); }
        if (!Number.isFinite(d.lat) || !Number.isFinite(d.lng)) { errors.push('Keine Position gewählt (Marker fehlt)'); }
        else if (d.name.length > 40) { errors.push('Wachenname darf maximal 40 Zeichen haben'); highlightField(nameInput, true); }

        if (d.building) {
            const caption = (d.building.caption || '').toLowerCase();
            const isLeitstelle = caption.includes('leitstelle') || Number(d.building.building_type) === 7;
            if (isLeitstelle) {
                if (typeof LSS_MB.state.userBuildingsTotal !== 'number' || LSS_MB.state.userBuildingsTotal === 0) {
                    await fetchUserBuildingsCount();
                }
                const total = LSS_MB.state.userBuildingsTotal || 0;
                const existingLeitstellen = LSS_MB.state.userBuildings[7] || 0;
                const allowed = Math.floor(total / 10);
                if (existingLeitstellen >= allowed) {
                    errors.push(`Leitstelle nicht erlaubt (erlaubt: ${allowed}, vorhanden: ${existingLeitstellen}). Pro 10 Gebäude maximal 1 Leitstelle.`);
                    highlightField(typeSelect, true);
                }
            }
        }

        if (d.building) {
            const typeId = Number(d.building.building_type);

            // Verbandskrankenhaus
            if (
                typeId === 4 &&
                d.hospitalMode === 'alliance' &&
                !LSS_MB.state.alliance.canBuildAllianceHospital
            ) {
                throw new Error('Keine Berechtigung für Verbandskrankenhaus');
            }

            // Verbandszellen
            if (
                typeId === 16 &&
                !LSS_MB.state.alliance.canBuildAllianceHospital
            ) {
                throw new Error('Keine Berechtigung für Verbandszellen');
            }

            // ===== NEU: Verbandsschulen =====
            if (
                ALLIANCE_SCHOOL_TYPES.has(typeId) &&
                d.schoolMode === 'alliance' &&
                !LSS_MB.state.alliance.canBuildAllianceHospital
            ) {
                throw new Error('Keine Berechtigung für Verbandsschulen');
            }
        }

        if (errors.length) {
            log('validateRow Fehler für Reihe', rowState.id, errors);
            throw new Error(errors.join(', '));
        }
    }

    // Hilfsfunktion: logarithmus zur Basis b
    function log2(x) {
        return Math.log(x) / Math.log(2);
    }

    // Berechnungsformel für Kleinwachen
    function calcLogSmallStationCost(count) {
        if (count <= 23) return 50_000;

        return Math.round(
            25_000 + 50_000 * log2(count - 22)
        );
    }

    // 🚒 Feuerwehr (Typ 0)
    function calcFireStationCost(existingCount) {
        // existingCount = Anzahl NACH dem Bau
        if (existingCount <= 23) return 100000;

        return Math.round(
            50000 + 100000 * log2(existingCount - 22)
        );
    }

    // 🚒 Feuerwehr Kleinwache (Typ 18)
    function calcSmallFireStationCost(count) {
        return Math.min(
            calcLogSmallStationCost(count),
            1_000_000
        );
    }

    // 🚓 Polizeiwache (Typ 6)
    function calcPoliceStationCost(existingCount) {
        // existingCount = Anzahl NACH dem Bau
        if (existingCount <= 23) return 100000;

        return Math.round(
            50000 + 100000 * log2(existingCount - 22)
        );
    }

    // 🚓 Polizeiwache Kleinwache (Typ 19)
    function calcSmallPoliceStationCost(count) {
        return calcLogSmallStationCost(count);
    }

    // 🛠️ THW (Typ 9)
    function calcTHWCost(existingCount) {
        // existingCount = Anzahl NACH dem Bau
        return Math.round(
            200_000 + 100_000 * log2(existingCount)
        );
    }

    // 🏔️ Bergrettung & 🚤 Seenotrettung
    function calcRescueSpecialCost(count) {
        if (count <= 10) return 100_000;

        return Math.round(
            100_000 + (100_000 * (Math.log(count - 9) / Math.log(5)))
        );
    }

    // Hilfsfunktion: Regex-escape
    function escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ===== Echte Baukosten vom Server holen =====
    async function fetchRealBuildingCost(typeId) {
        if (BUILD_COST_CACHE[typeId]) return BUILD_COST_CACHE[typeId];

        try {
            const res = await fetch(`/buildings/new?building_type=${typeId}`, {
                credentials: 'same-origin'
            });
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            // Credits auslesen
            const creditsInput = doc.getElementById(`build_credits_${typeId}`);
            const coinsInput = doc.querySelector(`#purchase_btns_${typeId} .coins_activate`);

            const credits = creditsInput
            ? Number(creditsInput.value.match(/([\d\.]+)/)[1].replace(/\./g, ''))
            : 0;

            const coins = coinsInput
            ? Number(coinsInput.value.match(/([\d\.]+)/)[1].replace(/\./g, ''))
            : 0;

            const result = { credits, coins };
            BUILD_COST_CACHE[typeId] = result;
            return result;

        } catch (e) {
            console.error('Fehler beim Laden der Serverkosten für Typ', typeId, e);
            return { credits: 0, coins: 0 };
        }
    }

    // Preis des Gebäude beziehen
    async function getCostsForBuilding(building) {
        const caption = (building.caption || '').toLowerCase().trim();
        const typeId = Number(building.building_type ?? building.id ?? building.buildingType ?? building.type);
        const userLevel = Number(LSS_MB.state.userInfo?.user_level ?? 0);

        log('getCostsForBuilding -> caption:', caption, 'typeId:', typeId, 'userLevel:', userLevel);

        // ===== Seenotrettungswache (dynamisch) =====
        if (typeId === 26) { // Seenotrettung
            if (userLevel < 4) {
                log('Userlevel zu niedrig für Seenotrettung:', userLevel);
                return { credits: null, coins: null, locked: true }; // optional Flag "locked"
            }
        }

        // ===== Bergrettung (dynamisch) =====
        if (typeId === 25) {
            // kein Level-Limit, kann ab Level 0 gebaut werden
        }

        // ===== Dynamische Gebäude (Serverkosten) =====
        if (DYNAMIC_COST_TYPES.has(typeId)) {
            const costs = await fetchRealBuildingCost(typeId);

            // Spezialfall: Kleinwache → Credit-Cap
            if (
                typeId === FIRE_STATION_SMALL_TYPE &&
                costs.credits > FIRE_STATION_SMALL_CREDIT_CAP
            ) {
                log(
                    'Kleinwache Credit-Cap angewendet:',
                    costs.credits,
                    '→',
                    FIRE_STATION_SMALL_CREDIT_CAP
                );

                costs.credits = FIRE_STATION_SMALL_CREDIT_CAP;
            }

            log('Dynamische Serverkosten:', costs);
            return costs;
        }

        // ===== Leitstelle =====
        if (typeId === 7 || /\bleitstelle\b/.test(caption)) {
            return { credits: 0, coins: 0 };
        }

        // ===== Statische Whitelist =====
        for (const entry of STATIC_COSTS) {
            for (const kwRaw of entry.keywords) {
                const kw = (kwRaw || '').toLowerCase().trim();
                if (!kw) continue;
                const re = new RegExp('\\b' + escapeRegex(kw) + '\\b', 'u');
                if (re.test(caption)) {
                    return { credits: entry.credits, coins: entry.coins };
                }
            }
        }

        // ===== Fallback =====
        if (typeof building.credits === 'number' || typeof building.coins === 'number') {
            return { credits: building.credits ?? 0, coins: building.coins ?? 0 };
        }

        return null;
    }

    // Funktion um die Gebäude zu zählen
    async function fetchUserBuildingsCount() {
        try {
            const res = await fetch('/api/buildings');
            const data = await res.json();
            const counts = {};
            let total = 0;
            data.forEach(b => {
                total++;
                if (typeof b.building_type === 'number' && b.building_type >= 0) {
                    counts[b.building_type] = (counts[b.building_type] || 0) + 1;
                }
            });
            LSS_MB.state.userBuildings = counts;
            LSS_MB.state.userBuildingsTotal = total;
            log('User buildings gezählt:', counts, 'total=', total);
            return { counts, total };
        } catch (err) {
            log('Fehler beim Laden der User-Wachen:', err);
            LSS_MB.state.userBuildings = {};
            LSS_MB.state.userBuildingsTotal = 0;
            return { counts: {}, total: 0 };
        }
    }

    // Berechnet und aktualisiert die Kostenvorschau für alle aktuell geplanten Gebäude.
    async function updateCostPreview() {
        const rows = LSS_MB.state.buildRows;

        const simulatedCounts = { ...LSS_MB.state.userBuildings };
        simulatedCounts[0] = simulatedCounts[0] || 0;   // Großwache
        simulatedCounts[18] = simulatedCounts[18] || 0; // Kleinwache
        simulatedCounts[6] = simulatedCounts[6] || 0;   // Polizeiwache
        simulatedCounts[19] = simulatedCounts[19] || 0; // Polizeikleinwache
        simulatedCounts[25] = simulatedCounts[25] || 0; // Bergrettung
        simulatedCounts[26] = simulatedCounts[26] || 0; // Seenotrettung
        simulatedCounts[9] = simulatedCounts[9] || 0; // THW

        const existingServerCounts = { ...simulatedCounts };
        let preview = document.getElementById('lss_mb_cost_preview');

        if (!preview) {
            const resDiv = document.getElementById('lss_mb_resources');
            if (resDiv) {
                const div = document.createElement('div');
                div.id = 'lss_mb_cost_preview';
                div.innerHTML = `💸 <strong>Kostenvorschau</strong><br>💰 Credits: 0<br>🪙 Coins: 0
                    ${LSS_MB.state.alliance.canBuildAllianceHospital ? '<br>🏛️ Verbandscredits: 0' : ''}`;
                resDiv.appendChild(div);
                preview = div;
            } else {
                // Wenn auch resources nicht existiert (sehr ungewöhnlich), beende still.
                return;
            }
        }

        let ownCredits = 0;
        let ownCoins = 0;
        let allianceCredits = 0;

        // Serverpreise nur einmal abrufen
        const serverPrices = {};

        // kombinierten Fire-Zähler (Groß + Klein) — wichtig
        let simulatedFireTotal = (simulatedCounts[0] || 0) + (simulatedCounts[18] || 0);
        const existingServerFireTotal = (existingServerCounts[0] || 0) + (existingServerCounts[18] || 0);

        let simulatedPoliceTotal = (simulatedCounts[6] || 0) + (simulatedCounts[19] || 0);
        const existingServerPoliceTotal = (existingServerCounts[6] || 0) + (existingServerCounts[19] || 0);

        // Hilfsformatierer
        const fmt = v => Number(v || 0).toLocaleString('de-DE');

        for (const row of LSS_MB.state.buildRows) {
            const d = row.data;
            if (!d.building) {
                // Falls Reihe gelöscht wurde oder noch leer ist, Labels zurücksetzen
                try {
                    const num = document.getElementById(`lss_mb_number_${row.id}`);
                    const cl = document.getElementById(`lss_mb_credits_${row.id}`);
                    const col = document.getElementById(`lss_mb_coins_${row.id}`);
                    if (num) num.textContent = '#';
                    if (cl) cl.textContent = '💰 -';
                    if (col) col.textContent = '🪙 -';
                } catch (e) {}
                continue;
            }

            const typeId = Number(d.building.building_type);

            let credits = null;
            let coins = null;
            let label = '';
            let buildingNumber = 0;

            // 🚒 Großwache (Typ 0)
            if (typeId === 0) {
                simulatedFireTotal++;
                buildingNumber = simulatedFireTotal;

                if (!serverPrices[0]) {
                    serverPrices[0] = await getCostsForBuilding(d.building);
                }

                coins = serverPrices[0].coins || 0;

                if (buildingNumber === existingServerFireTotal + 1) {
                    credits = serverPrices[0].credits;
                } else {
                    if (typeof serverPrices.__scale0 === 'undefined') {
                        const anchorCount = existingServerFireTotal + 1;
                        const anchorCalc = calcFireStationCost(anchorCount);
                        serverPrices.__scale0 = (anchorCalc > 0)
                            ? ((serverPrices[0].credits || 0) / anchorCalc)
                        : 1;
                        if (!isFinite(serverPrices.__scale0) || serverPrices.__scale0 <= 0) serverPrices.__scale0 = 1;
                        log('[LSS-MB][PREVIEW] Großwache Skalierung festgelegt (float):', serverPrices.__scale0, '(anchorCalc=', anchorCalc, ', server=', serverPrices[0].credits, ')');
                    }
                    credits = Math.round(calcFireStationCost(buildingNumber) * (serverPrices.__scale0 || 1));
                }

                // Monotonie
                if (typeof serverPrices.__last0 === 'number' && credits < serverPrices.__last0) credits = serverPrices.__last0;
                serverPrices.__last0 = credits;

                // ➕ Startfahrzeug-Kosten
                if (d.startVehicle && START_VEHICLE_COSTS[d.startVehicle]) {
                    credits += START_VEHICLE_COSTS[d.startVehicle];
                }

                label = `Feuerwache #${buildingNumber}`;
            }

            // 🚒 Kleinwache (Typ 18)
            else if (typeId === 18) {
                simulatedFireTotal++;
                buildingNumber = simulatedFireTotal;

                if (!serverPrices[18]) {
                    serverPrices[18] = await getCostsForBuilding(d.building);
                }

                coins = serverPrices[18].coins || 0;

                if (buildingNumber === existingServerFireTotal + 1) {
                    credits = serverPrices[18].credits;
                } else {
                    if (typeof serverPrices.__scale18 === 'undefined') {
                        const anchorCount = existingServerFireTotal + 1;
                        const anchorCalc = calcSmallFireStationCost(anchorCount);
                        serverPrices.__scale18 = (anchorCalc > 0)
                            ? ((serverPrices[18].credits || 0) / anchorCalc)
                        : 1;
                        if (!isFinite(serverPrices.__scale18) || serverPrices.__scale18 <= 0) serverPrices.__scale18 = 1;
                        log('[LSS-MB][PREVIEW] Kleinwache Skalierung festgelegt (float):', serverPrices.__scale18, '(anchorCalc=', anchorCalc, ', server=', serverPrices[18].credits, ')');
                    }

                    credits = Math.round(calcSmallFireStationCost(buildingNumber) * (serverPrices.__scale18 || 1));

                    // Cap für Feuerwehr-Kleinwache anwenden
                    credits = Math.min(credits, FIRE_STATION_SMALL_CREDIT_CAP);
                }

                if (typeof serverPrices.__last18 === 'number' && credits < serverPrices.__last18) credits = serverPrices.__last18;
                serverPrices.__last18 = credits;

                // ➕ Startfahrzeug-Kosten
                if (d.startVehicle && START_VEHICLE_COSTS[d.startVehicle]) {
                    credits += START_VEHICLE_COSTS[d.startVehicle];
                }

                label = `Kleinwache #${buildingNumber}`;
            }

            // 🚓 Polizeiwache (Typ 6)
            else if (typeId === 6) {
                simulatedPoliceTotal++;
                buildingNumber = simulatedPoliceTotal;

                if (!serverPrices[6]) serverPrices[6] = await getCostsForBuilding(d.building);
                coins = serverPrices[6].coins || 0;

                if (buildingNumber === existingServerPoliceTotal + 1) {
                    credits = serverPrices[6].credits;
                } else {
                    if (typeof serverPrices.__scale6 === 'undefined') {
                        const anchorCount = existingServerPoliceTotal + 1;
                        const anchorCalc = calcPoliceStationCost(anchorCount);
                        serverPrices.__scale6 =
                            anchorCalc > 0 ? serverPrices[6].credits / anchorCalc : 1;
                    }
                    credits = Math.round(
                        calcPoliceStationCost(buildingNumber) * serverPrices.__scale6
                    );
                }

                label = `Polizeiwache #${buildingNumber}`;
            }

            // 🚓 Polizeikleinwache (Typ 19)
            else if (typeId === 19) {
                simulatedPoliceTotal++;
                buildingNumber = simulatedPoliceTotal;

                if (!serverPrices[19]) serverPrices[19] = await getCostsForBuilding(d.building);
                coins = serverPrices[19].coins || 0;

                if (buildingNumber === existingServerPoliceTotal + 1) {
                    credits = serverPrices[19].credits;
                } else {
                    if (typeof serverPrices.__scale19 === 'undefined') {
                        const anchorCount = existingServerPoliceTotal + 1;
                        const anchorCalc = calcSmallPoliceStationCost(anchorCount);
                        serverPrices.__scale19 =
                            anchorCalc > 0 ? serverPrices[19].credits / anchorCalc : 1;
                    }
                    credits = Math.round(
                        calcSmallPoliceStationCost(buildingNumber) * serverPrices.__scale19
                    );
                }

                label = `Polizeiwache (Klein) #${buildingNumber}`;
            }

            // 🏔️ Bergrettung & 🚤 Seenotrettung
            else if (typeId === 25 || typeId === 26) {
                simulatedCounts[typeId]++;
                buildingNumber = simulatedCounts[typeId];

                // Coins kommen vom Server (sind konstant)
                if (!serverPrices[typeId]) {
                    serverPrices[typeId] = await getCostsForBuilding(d.building);
                }

                coins = serverPrices[typeId].coins || 0;

                // Credits IMMER selbst berechnen
                credits = calcRescueSpecialCost(buildingNumber);

                label = `${d.building.caption} #${buildingNumber}`;
            }

            // 🛠️ THW (Typ 9)
            else if (typeId === 9) {
                simulatedCounts[9]++;
                buildingNumber = simulatedCounts[9];

                // Coins kommen vom Server (konstant)
                if (!serverPrices[9]) {
                    serverPrices[9] = await getCostsForBuilding(d.building);
                }

                coins = serverPrices[9].coins || 35;

                // Credits IMMER selbst berechnen
                credits = calcTHWCost(buildingNumber);

                label = `THW-Ortsverband #${buildingNumber}`;
            }

            // 🔁 andere Gebäude (generische Typen) — Zähler verwenden und Nummer setzen
            else {
                // Stelle sicher, dass wir einen Zähler für diesen Typ haben
                simulatedCounts[typeId] = simulatedCounts[typeId] || 0;
                simulatedCounts[typeId]++;
                buildingNumber = simulatedCounts[typeId];

                const base = await getCostsForBuilding(d.building);
                credits = (base && typeof base.credits !== 'undefined') ? Number(base.credits) : 0;
                coins = (base && typeof base.coins !== 'undefined') ? Number(base.coins) : 0;
                label = `${d.building.caption} #${buildingNumber}`;
            }

            // Verbandslogik
            const isAlliance =
                  (typeId === 4 && d.hospitalMode === 'alliance') ||
                  (ALLIANCE_SCHOOL_TYPES.has(typeId) && d.schoolMode === 'alliance') ||
                  (typeId === 16);

            if (isAlliance) {
                allianceCredits += credits || 0;
            } else {
                ownCredits += credits || 0;
                ownCoins += coins || 0;
            }

            // DOM-Update der kleinen Nr.-Anzeige (pro Reihe)
            try {
                const numEl = document.getElementById(`lss_mb_number_${row.id}`);
                if (numEl) {
                    numEl.textContent = buildingNumber ? `#${buildingNumber}` : '#';
                }
            } catch (e) {
                // ignore
            }

            // Aktualisiere die per-Reihe Labels (wichtig!)
            try {
                const cl = document.getElementById(`lss_mb_credits_${row.id}`);
                const col = document.getElementById(`lss_mb_coins_${row.id}`);
                if (cl) cl.textContent = (credits === null || typeof credits === 'undefined') ? '💰 -' : `💰 ${fmt(credits)}`;
                if (col) col.textContent = (coins === null || typeof coins === 'undefined') ? '🪙 -' : `🪙 ${fmt(coins)}`;
            } catch (e) {
                // ignore
            }

            console.info(`[LSS-MB][PREVIEW] ${label} → ${((credits === null || typeof credits === 'undefined') ? '-' : fmt(credits))} Credits | ${((coins === null || typeof coins === 'undefined') ? '-' : fmt(coins))} Coins`);
        }

        const fmtTotal = v => Number(v || 0).toLocaleString('de-DE');

        let html = `
    💸 <strong>Kostenvorschau</strong> 💸<br>
    💰Credits: ${fmtTotal(ownCredits)} | 🪙Coins: ${fmtTotal(ownCoins)}
    `;

        if (LSS_MB.state.alliance.canBuildAllianceHospital) {
            html += `<br>🏛️ Verbandscredits: ${fmtTotal(allianceCredits)}`;
        }

        preview.innerHTML = html;
    }

    LSS_MB.init();

})();
