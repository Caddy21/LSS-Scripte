// ==UserScript==
// @name         [LSS] 50 - Bau-Manager (Beta)
// @namespace    http://tampermonkey.net/
// @version      0.9.5
// @description  Hiermit kannst du Wachen & Gebäude schnell in Serie bauen
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const DEBUG = false;
    const log = (...args) => DEBUG && console.info('[LSS-MB]', ...args);
    const HIDE_COINS_BUTTON = true;
    const ALLIANCE_SCHOOL_TYPES = new Set([1, 3, 8, 10, 27]);
    const DYNAMIC_COST_TYPES = new Set([
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
    const STATIC_COSTS = [];
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
            isPremium: false,
            isBuilding: false,

            alliance: {
                roles: [],
                canBuildAllianceHospital: false
            },
        },
        init() {
            log('Init gestartet');

            // Premium-Status früh ermitteln
            this.state.isPremium = detectPremium();
            log('Premium-Status erkannt (initial):', this.state.isPremium);

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
                    list = data;
                } else if (data && typeof data === 'object') {
                    list = Object.entries(data)
                        .map(([key, val]) => {
                        if (!val || typeof val !== 'object') return null;
                        if (typeof val.building_type === 'undefined') {
                            const n = Number(key);
                            if (!Number.isNaN(n)) {
                                val.building_type = n;
                            }
                        }
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

                    showLoading();

                    const startTime = Date.now();
                    const MIN_DISPLAY_TIME = 800; // ms (fühlt sich gut an)

                    try {
                        // 1️⃣ Userinfo laden
                        const res = await fetch('/api/userinfo');
                        const data = await res.json();
                        LSS_MB.state.userInfo = data;
                        log('Userinfo geladen:', data);

                        // 2️⃣ Premium prüfen
                        LSS_MB.state.isPremium = detectPremium();
                        log('Premium-Status beim Öffnen UI:', LSS_MB.state.isPremium);

                        // 3️⃣ Verbandsinfo laden
                        await initAllianceInfo();

                    } catch (err) {
                        log('Fehler beim Laden:', err);
                        hideLoading();
                        return;
                    }

                    // ⏱️ Mindestanzeigezeit sicherstellen
                    const elapsed = Date.now() - startTime;
                    if (elapsed < MIN_DISPLAY_TIME) {
                        await new Promise(res => setTimeout(res, MIN_DISPLAY_TIME - elapsed));
                    }

                    hideLoading();
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
                LSS_MB.state.globalDefaults = {
                    buildingType: null,
                    leitstelle: null,
                    startVehicle: null,
                    hospitalMode: 'own',
                    schoolMode: 'own',
                    bereitschaftsraumMode: 'own'
                };

                log('Globale Defaults beim Öffnen zurückgesetzt');

                this.injectFocusFix();

                let container = document.getElementById('lss_mb_build_ui');

                if (!container) {
                    container = this.createUIContainer();
                    document.body.appendChild(container);
                    log('UI Container erstellt');
                } else {
                    this.resetUIVisibility(container);
                    log('UI Container wieder sichtbar gemacht');
                }

                // Alte globale Controls entfernen und neu erstellen
                const old = document.getElementById('lss_mb_global_controls');
                if (old) old.remove();
                createGlobalControls();

                // Gebäudedaten laden
                if (!LSS_MB.state.buildingsData) {
                    await LSS_MB.fetchBuildings();
                }

                // Benutzerinformationen laden
                try {
                    const res = await fetch('/api/userinfo');
                    const data = await res.json();
                    LSS_MB.state.userInfo = data;
                    this.updateResources();
                    log('Ressourcen aktualisiert beim Öffnen:', data.credits_user_current, data.coins_user_current);
                } catch (err) {
                    log('Fehler beim Laden der Userinfo:', err);
                }

                // Benutzer-Gebäudezähler laden
                try {
                    await fetchUserBuildingsCount();
                    log('User-Building-Counts geladen:', LSS_MB.state.userBuildings, 'total=', LSS_MB.state.userBuildingsTotal);
                } catch (e) {
                    log('Fehler beim Laden der User-Building-Counts', e);
                }

                // Alte Marker und Reihen entfernen
                this.clearBuildRows();

                // Erste Baureihe erstellen
                this.createBuildRow();
                log('Erste Build-Reihe erzeugt');
            },
            injectFocusFix() {
                if (document.getElementById('lss_mb_focus_fix')) return;

                const style = document.createElement('style');
                style.id = 'lss_mb_focus_fix';
                style.textContent = `
            #lss_mb_build_ui input:focus,
            #lss_mb_build_ui select:focus,
            #lss_mb_build_ui button:focus {
                outline: none !important;
                box-shadow: none !important;
            }

            #lss_mb_build_ui input:focus-visible,
            #lss_mb_build_ui select:focus-visible {
                border-color: #888;
            }

            body.dark #lss_mb_build_ui input:focus-visible,
            body.dark #lss_mb_build_ui select:focus-visible {
                border-color: #666;
            }
        `;
                document.head.appendChild(style);
            },
            createUIContainer() {
                const container = document.createElement('div');
                container.id = 'lss_mb_build_ui';
                container.dataset.minimized = '0';

                Object.assign(container.style, {
                    position: 'fixed',
                    top: '10px',
                    left: '10px',
                    width: '99%',
                    maxHeight: '90vh',
                    overflow: 'auto',
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
                this.createHeader(container);
                this.createResourcesSection(container);

                return container;
            },
            createHeader(container) {
                const headerContainer = document.createElement('div');
                Object.assign(headerContainer.style, {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    flexShrink: 0
                });
                headerContainer.id = 'lss_mb_header_container';

                // Titel
                const titleWrapper = document.createElement('div');
                titleWrapper.style.display = 'flex';
                titleWrapper.style.flexDirection = 'column';

                const header = document.createElement('h3');
                header.textContent = '🧱 Bau-Manager 🧱';
                header.style.margin = '0';
                header.style.fontSize = '18px';
                header.style.fontWeight = '600';
                titleWrapper.appendChild(header);

                const description = document.createElement('small');
                description.textContent = 'Plane und errichte mehrere Gebäude/Wachen in kurzer Zeit und mit wenigen Klicks.';
                Object.assign(description.style, {
                    fontSize: '16px',
                    color: '#666',
                    marginTop: '2px'
                });
                titleWrapper.appendChild(description);

                // Buttons (rechts)
                const btnGroup = document.createElement('div');
                btnGroup.id = 'lss_mb_btn_group';
                btnGroup.style.display = 'flex';
                btnGroup.style.alignItems = 'center';
                btnGroup.style.gap = '8px';
                btnGroup.style.flexShrink = 0;

                const minimizeBtn = this.createMinimizeButton();
                const closeBtn = this.createCloseButton();

                btnGroup.appendChild(minimizeBtn);
                btnGroup.appendChild(closeBtn);

                headerContainer.appendChild(titleWrapper);
                headerContainer.appendChild(btnGroup);
                container.appendChild(headerContainer);

                // ✅ NEU: Minimize-Button auch direkt im Container (für Minimiert-Ansicht)
                const minimizeBtnClone = this.createMinimizeButton();
                minimizeBtnClone.id = 'lss_mb_minimize_btn_clone';
                minimizeBtnClone.style.display = 'none';
                container.appendChild(minimizeBtnClone);
            },
            createMinimizeButton() {
                const minimizeBtn = document.createElement('button');
                minimizeBtn.className = BUTTON_CLASSES.info;
                minimizeBtn.textContent = '▾';
                minimizeBtn.title = 'Minimieren / Maximieren';
                minimizeBtn.style.flexShrink = 0;

                minimizeBtn.addEventListener('click', () => {
                    const container = document.getElementById('lss_mb_build_ui');
                    const isMinimized = container.dataset.minimized === '1';
                    this.setMinimized(!isMinimized);
                });

                return minimizeBtn;
            },
            createCloseButton() {
                const closeBtn = document.createElement('button');
                closeBtn.className = BUTTON_CLASSES.danger;
                closeBtn.textContent = 'Schließen';

                closeBtn.addEventListener('click', () => {
                    const container = document.getElementById('lss_mb_build_ui');
                    container.style.display = 'none';
                    log('UI geschlossen');

                    // Minimiert-Status zurücksetzen
                    try {
                        localStorage.removeItem('lss_mb_minimized');
                    } catch (e) {}

                    // Marker entfernen
                    if (LSS_MB.state.buildRows?.length) {
                        LSS_MB.state.buildRows.forEach(r => {
                            if (r.marker) {
                                try {
                                    LSS_MB.state.map.removeLayer(r.marker);
                                } catch (e) {
                                    log('Fehler beim Entfernen des Markers beim Schließen', e);
                                }
                            }
                        });
                    }

                    LSS_MB.state.buildRows = [];
                    LSS_MB.state.buildRowCounter = 0;
                });

                return closeBtn;
            },
            setMinimized(minimized) {
                const container = document.getElementById('lss_mb_build_ui');
                if (!container) return;

                container.dataset.minimized = minimized ? '1' : '0';
                const headerContainer = document.getElementById('lss_mb_header_container');
                const minimizeBtnClone = document.getElementById('lss_mb_minimize_btn_clone');

                if (minimized) {
                    // ===== MINIMIEREN: Nach rechts verschieben =====
                    Object.assign(container.style, {
                        width: '70px',
                        height: '70px',
                        left: 'auto',
                        right: '10px',
                        maxHeight: 'auto',
                        overflow: 'visible',
                        padding: '0',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0'
                    });

                    // Header verstecken
                    if (headerContainer) {
                        headerContainer.style.display = 'none';
                    }

                    // Inhalte ausblenden
                    const resDiv = document.getElementById('lss_mb_resources');
                    const rowsWrapper = document.getElementById('lss_mb_rows_wrapper');
                    const buttonsWrapper = document.getElementById('lss_mb_buttons_wrapper');
                    const globalControls = document.getElementById('lss_mb_global_controls');

                    if (resDiv) resDiv.style.display = 'none';
                    if (rowsWrapper) rowsWrapper.style.display = 'none';
                    if (buttonsWrapper) buttonsWrapper.style.display = 'none';
                    if (globalControls) globalControls.style.display = 'none';

                    // Minimize-Button-Clone anzeigen
                    if (minimizeBtnClone) {
                        minimizeBtnClone.textContent = '◀';
                        Object.assign(minimizeBtnClone.style, {
                            fontSize: '14px',
                            width: '50px',
                            height: '50px',
                            padding: '0',
                            margin: '0',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            cursor: 'pointer',
                            border: 'none',
                            backgroundColor: '#5bc0de',
                            color: 'white',
                            fontWeight: 'bold'
                        });
                    }

                } else {
                    // ===== MAXIMIEREN: Zurück zur Normalansicht =====
                    Object.assign(container.style, {
                        width: '99%',
                        height: 'auto',
                        left: '10px',
                        right: 'auto',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        padding: '15px',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'stretch',
                        gap: '10px'
                    });

                    // Header anzeigen
                    if (headerContainer) {
                        headerContainer.style.display = 'flex';
                    }

                    // Inhalte anzeigen
                    const resDiv = document.getElementById('lss_mb_resources');
                    const rowsWrapper = document.getElementById('lss_mb_rows_wrapper');
                    const buttonsWrapper = document.getElementById('lss_mb_buttons_wrapper');
                    const globalControls = document.getElementById('lss_mb_global_controls');

                    if (resDiv) resDiv.style.display = '';
                    if (rowsWrapper) rowsWrapper.style.display = 'flex';
                    if (buttonsWrapper) buttonsWrapper.style.display = 'flex';
                    if (globalControls) globalControls.style.display = 'flex';

                    // Minimize-Button-Clone verstecken
                    if (minimizeBtnClone) {
                        minimizeBtnClone.style.display = 'none';
                    }

                    // Kostenvorschau aktualisieren
                    try {
                        if (typeof updateCostPreview === 'function') {
                            updateCostPreview();
                        }
                    } catch (e) {
                        log('updateCostPreview Fehler nach Restore', e);
                    }
                }

                // In localStorage speichern
                try {
                    localStorage.setItem('lss_mb_minimized', minimized ? '1' : '0');
                } catch (e) {}
            },
            resetUIVisibility(container) {
                container.style.display = 'flex';
                container.dataset.minimized = '0';

                // Größe zurücksetzen
                Object.assign(container.style, {
                    width: '99%',
                    height: 'auto',
                    left: '10px',
                    right: 'auto',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '15px',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'stretch',
                    gap: '10px'
                });

                // Header anzeigen
                const headerContainer = document.getElementById('lss_mb_header_container');
                if (headerContainer) headerContainer.style.display = 'flex';

                // Alle Inhalte anzeigen
                const resDiv = document.getElementById('lss_mb_resources');
                const rowsWrapper = document.getElementById('lss_mb_rows_wrapper');
                const buttonsWrapper = document.getElementById('lss_mb_buttons_wrapper');
                const globalControls = document.getElementById('lss_mb_global_controls');
                const minimizeBtnClone = document.getElementById('lss_mb_minimize_btn_clone');

                if (resDiv) resDiv.style.display = '';
                if (rowsWrapper) rowsWrapper.style.display = 'flex';
                if (buttonsWrapper) buttonsWrapper.style.display = 'flex';
                if (globalControls) globalControls.style.display = 'flex';
                if (minimizeBtnClone) minimizeBtnClone.style.display = 'none';
            },
            clearBuildRows() {
                if (LSS_MB.state.buildRows?.length) {
                    LSS_MB.state.buildRows.forEach(r => {
                        if (r.marker) {
                            try {
                                LSS_MB.state.map.removeLayer(r.marker);
                            } catch (e) {
                                log('Fehler beim Entfernen eines Markers', e);
                            }
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
            },
            createResourcesSection(container) {
                const resources = document.createElement('div');
                resources.id = 'lss_mb_resources';
                resources.textContent = 'Lade Ressourcen…';
                container.appendChild(resources);
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

                let html = `💰 Eigene Credits: ${creditsFormatted} | 🪙 Coins: ${coinsFormatted}`;

                // Verbandscredits anzeigen wenn berechtigt
                if (LSS_MB.state.alliance.canBuildAllianceHospital && typeof LSS_MB.state.alliance.credits === 'number') {
                    const allianceCreditsFormatted = LSS_MB.state.alliance.credits.toLocaleString('de-DE');
                    html += `<br>🏛️ Verbandscredits: ${allianceCreditsFormatted}`;
                }

                // Kostenvorschau-Container
                html += `
            <hr style="margin:6px 0;">
            <div id="lss_mb_cost_preview"
                style="
                    position: sticky;
                    top: 0;
                    z-index: 5;
                    background: inherit;
                    padding: 6px 0;
                ">
                💸 <strong>Kostenvorschau</strong> 💸<br>
                💰 Credits: 0 | 🪙 Coins: 0
                ${LSS_MB.state.alliance.canBuildAllianceHospital ? '<br>🏛️ Verbandscredits: 0' : ''}
            </div>
        `;

                resDiv.innerHTML = html;

                log(
                    'Ressourcen aktualisiert:',
                    'user=', creditsFormatted,
                    'coins=', coinsFormatted,
                    'alliance=', LSS_MB.state.alliance.credits
                );
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
                        gap: '12px',
                        overflowY: 'auto',
                        flex: '1 1 auto',
                        maxHeight: '55vh',
                        paddingRight: '6px'
                    });
                    container.appendChild(rowsWrapper);
                    log('Rows wrapper erstellt');
                }

                let buildings = LSS_MB.state.buildingsData;
                if (!Array.isArray(buildings)) buildings = Object.values(buildings);
                buildings = buildings.slice().sort((a, b) =>
                                                   (a.caption || '').localeCompare(b.caption || '', 'de', { sensitivity: 'base' })
                                                  );
                if (!buildings.length) {
                    log('Keine buildings-Daten verfügbar');
                    return;
                }

                const flexDiv = document.createElement('div');
                flexDiv.dataset.rowId = rowId;
                rowState.el = flexDiv;
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

                function addField(el, width = '110px') {
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

                // ===== Reihenanzeige =====
                const rowLabel = addField(document.createElement('div'), '70px');
                rowLabel.className = 'lss-mb-row-label';
                rowLabel.textContent = '';
                rowLabel.style.fontWeight = 'bold';
                rowLabel.style.backgroundColor = mode === 'dark' ? '#3a3a3a' : '#e8e8e8';
                rowLabel.style.textAlign = 'center';
                rowLabel.style.lineHeight = '26px';

                // Referenz speichern
                rowState.rowLabelEl = rowLabel;

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

                // Level-Filter beim Aufbau der Select-Optionen
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

                const hospitalModeSelect = addField(document.createElement('select'), '1px');
                hospitalModeSelect.style.display = 'none';

                hospitalModeSelect.innerHTML = `
                <option value="own">Eigenes</option>
                <option value="alliance">Verband</option>
                `;

                hospitalModeSelect.addEventListener('change', async () => {
                    rowState.data.hospitalMode = hospitalModeSelect.value;
                    updateLeitstelleVisibility(rowState.data, lstSelect);
                    await updateCostPreview();
                });

                const schoolModeSelect = addField(document.createElement('select'), '1px');
                schoolModeSelect.style.display = 'none';

                schoolModeSelect.innerHTML = `
                <option value="own">Eigene</option>
                <option value="alliance">Verband</option>
                `;

                schoolModeSelect.addEventListener('change', async () => {
                    rowState.data.schoolMode = schoolModeSelect.value;
                    updateLeitstelleVisibility(rowState.data, lstSelect);
                    await updateCostPreview();
                });

                const bereitstellungsraumModeSelect = addField(document.createElement('select'), '1px');
                bereitstellungsraumModeSelect.style.display = 'none';
                bereitstellungsraumModeSelect.innerHTML = `
                <option value="own">Eigener</option>
                <option value="alliance">Verband</option>
                `;
                bereitstellungsraumModeSelect.addEventListener('change', async () => {
                    rowState.data.bereitschaftsraumMode = bereitstellungsraumModeSelect.value;
                    updateLeitstelleVisibility(rowState.data, lstSelect);
                    await updateCostPreview();
                    checkBereitsstellungsraumLimits(rowState);
                });

                const creditsLabel = addField(document.createElement('div'), '120px');
                creditsLabel.id = `lss_mb_credits_${rowId}`;
                creditsLabel.textContent = '💰 Credits';
                creditsLabel.style.backgroundColor = mode === 'dark' ? '#444' : '#f0f0f0';
                creditsLabel.style.color = textColor;
                creditsLabel.style.textAlign = 'center';
                creditsLabel.style.lineHeight = '26px';

                const coinsLabel = addField(document.createElement('div'), '120px');
                coinsLabel.id = `lss_mb_coins_${rowId}`;
                coinsLabel.textContent = '🪙 Coins';
                coinsLabel.style.backgroundColor = mode === 'dark' ? '#444' : '#f0f0f0';
                coinsLabel.style.color = textColor;
                coinsLabel.style.textAlign = 'center';
                coinsLabel.style.lineHeight = '26px';

                // Prüfen, ob Coins-Feld ausgeblendet werden soll
                if (HIDE_COINS_BUTTON) {
                    coinsLabel.style.display = 'none';
                }

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

                    // ===== Bereitsstellungsraum (Typ 14) =====
                    if (typeId === 14) {
                        rowState.data.bereitschaftsraumMode = 'own';
                        if (LSS_MB.state.alliance.canBuildAllianceHospital) {
                            bereitstellungsraumModeSelect.style.display = 'block';
                            bereitstellungsraumModeSelect.value = 'own';
                        } else {
                            bereitstellungsraumModeSelect.style.display = 'none';
                        }
                    } else {
                        bereitstellungsraumModeSelect.style.display = 'none';
                        delete rowState.data.bereitschaftsraumMode;
                    }

                    updateLeitstelleVisibility(rowState.data, lstSelect);
                    // direkt hier:
                    checkBereitsstellungsraumLimits(rowState);

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
                    addressInput.placeholder = 'Adresse (optional)';
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
                nameInput.placeholder = 'Name (max 40 Zeichen)';
                nameInput.addEventListener('input', () => {
                    rowState.data.name = nameInput.value;
                    updateMarkerLabel(rowState);
                });

                const lstSelect = addField(document.createElement('select'));
                lstSelect.innerHTML = `<option disabled selected>Leitstelle wählen</option>`;
                lstSelect.style.display = 'none';
                lstSelect.addEventListener('change', () => rowState.data.leitstelle = lstSelect.value);

                // Leitstellen laden
                let lstSelectLoaded = false;
                fetch('/api/buildings')
                    .then(r => r.json())
                    .then(data => {
                    data
                        .filter(b => b.building_type === 7)
                        .sort((a, b) =>
                              a.caption.localeCompare(b.caption, 'de', { sensitivity: 'base' })
                             )
                        .forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.id;
                        opt.textContent = b.caption;
                        lstSelect.appendChild(opt);
                    });
                    lstSelectLoaded = true;
                    log('Leitstellen alphabetisch sortiert geladen');
                })
                    .catch(e => {
                    log('Fehler beim Laden von Leitstellen', e);
                });

                const vehicleSelect = addField(document.createElement('select'));
                vehicleSelect.style.display = 'none';
                vehicleSelect.addEventListener('change', async () => {
                    rowState.data.startVehicle = vehicleSelect.value;
                    await updateCostPreview();
                });

                // 🔧 WICHTIG: Speichere Referenzen für globale Anwendung
                rowState.selects = {
                    building: select,
                    hospitalMode: hospitalModeSelect,
                    schoolMode: schoolModeSelect,
                    bereitstellungsraum: bereitstellungsraumModeSelect,
                    leitstelle: lstSelect,
                    vehicle: vehicleSelect
                };
                // ⭐ FLAG speichern für später
                rowState.lstSelectLoaded = () => lstSelectLoaded;

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
                        placeholder.textContent = 'Startfahrzeug';
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

                    // Maker setzten
                    if (!rowState.marker) {
                        markerBtn.textContent = 'Marker löschen';
                        markerBtn.className = BUTTON_CLASSES.danger;

                        const c = LSS_MB.state.map.getCenter();

                        // Marker erzeugen
                        LSS_MB.mapApi.addMarker(c.lat, c.lng);
                        const marker = LSS_MB.state.markers.at(-1);

                        if (!marker) {
                            alert('Marker konnte nicht gesetzt werden');
                            return;
                        }

                        // Feste Kopplung
                        rowState.marker = marker;
                        marker._lssMbRow = rowState;

                        // Label
                        updateMarkerLabel(rowState);

                        // Initiale Position
                        const p = marker.getLatLng();
                        rowState.data.lat = p.lat;
                        rowState.data.lng = p.lng;

                        // Drag synchronisiert NUR diese Row
                        marker.on('dragend', () => {
                            const p = marker.getLatLng();
                            rowState.data.lat = p.lat;
                            rowState.data.lng = p.lng;
                        });

                        log('Marker gesetzt für Reihe', rowLabel(rowState));
                        return;
                    }

                    // Marker löschen
                    LSS_MB.state.map.removeLayer(rowState.marker);
                    LSS_MB.state.markers =
                        LSS_MB.state.markers.filter(m => m !== rowState.marker);

                    rowState.marker = null;

                    markerBtn.textContent = 'Marker setzen';
                    markerBtn.className = BUTTON_CLASSES.primary;

                    log('Marker gelöscht für Reihe', rowState.id);
                });

                const deleteBtn = addField(document.createElement('button'),'100px');
                deleteBtn.className = BUTTON_CLASSES.danger;
                deleteBtn.textContent = '🗑 Entfernen';
                deleteBtn.addEventListener('click', () => {
                    if (rowState.marker) {
                        try { LSS_MB.state.map.removeLayer(rowState.marker); } catch {}
                    }

                    LSS_MB.state.markers =
                        LSS_MB.state.markers.filter(m => m !== rowState.marker);

                    LSS_MB.state.buildRows =
                        LSS_MB.state.buildRows.filter(r => r.id !== rowId);

                    flexDiv.remove();

                    renumberBuildRows();
                    updateCostPreview();
                    checkBereitsstellungsraumLimits();
                    updateBuildAllButtonState();
                    updateRowCountDisplay();

                    log('Reihe entfernt:', rowId);
                });

                // Status-Anzeige
                const statusLabel = addField(document.createElement('div'), '110px');
                statusLabel.textContent = '';
                statusLabel.style.display = 'none';
                statusLabel.style.backgroundColor = mode === 'dark' ? '#333' : '#f7f7f7';
                statusLabel.style.color = textColor;
                statusLabel.style.textAlign = 'center';
                statusLabel.style.lineHeight = '26px';
                statusLabel.style.fontWeight = 'bold';

                // Referenz im Row-State speichern
                rowState.statusEl = statusLabel;
                renumberBuildRows();
                updateRowCountDisplay();
                injectGlobalButtons();
            }
        },
    };

    // 🔧 Styles einmalig hinzufügen
    (function injectSpinnerStyles() {
        if (document.getElementById('lss_mb_spinner_style')) return;

        const style = document.createElement('style');
        style.id = 'lss_mb_spinner_style';
        style.innerHTML = `
    .lss_mb_spinner {
        border: 4px solid #fff;
        border-top: 4px solid transparent;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 0.8s linear infinite;
        margin-bottom: 10px;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }`;

        document.head.appendChild(style);
    })();

    // Ladekreisel anzeigen
    function showLoading() {
        if (document.getElementById('lss_mb_loading')) return;

        const overlay = document.createElement('div');
        overlay.id = 'lss_mb_loading';
        overlay.innerHTML = `
        <div class="lss_mb_spinner"></div>
        <div>Bitte kurz warten, die Daten werden geladen...</div>
    `;

        Object.assign(overlay.style, {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            fontSize: '18px'
        });

        document.body.appendChild(overlay);
    }

    // Ladekreise entfernen
    function hideLoading() {
        const el = document.getElementById('lss_mb_loading');
        if (el) el.remove();
    }

    // Funktion um die Reihen zu merken
    function renumberBuildRows() {
        const rowsWrapper = document.getElementById('lss_mb_rows_wrapper');
        if (!rowsWrapper) return;

        const rowDivs = [...rowsWrapper.querySelectorAll('[data-row-id]')];

        rowDivs.forEach((rowDiv, index) => {
            const visualIndex = index + 1;
            const rowId = Number(rowDiv.dataset.rowId);

            const rowState = LSS_MB.state.buildRows.find(r => r.id === rowId);
            if (!rowState) return;

            rowState.visualIndex = visualIndex;

            if (rowState.rowLabelEl) {
                rowState.rowLabelEl.textContent = `🏠 ${visualIndex}`;
            }

            updateMarkerLabel(rowState);
        });
    }

    // Funktion um die Echte ID in eine visuelle ID zu wandeln
    function rowLabel(row) {
        return row.visualIndex ?? row.id;
    }

    // Verbandsinfos des User beziehen
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
                marginTop: '4px',
                display: 'flex',
                flexWrap: 'wrap'
            });

            const rowsWrapper = document.getElementById('lss_mb_rows_wrapper');
            if (rowsWrapper && rowsWrapper.parentNode) {
                rowsWrapper.parentNode.insertBefore(wrapper, rowsWrapper.nextSibling);
            } else {
                document.getElementById('lss_mb_build_ui').appendChild(wrapper);
            }
            log('Buttons wrapper erstellt');
        }

        // ===== Reihen-Anzeige =====
        if (!document.getElementById('lss_mb_row_count')) {
            const rowCount = document.createElement('div');
            rowCount.id = 'lss_mb_row_count';
            const mode = document.body.classList.contains('dark') ? 'dark' : 'light';
            Object.assign(rowCount.style, {
                fontSize: '15px',
                fontWeight: 'bold',
                color: mode === 'dark' ? '#fff' : '#000',
                marginRight: '10px',
                display: 'flex',
                alignItems: 'center'
            });
            rowCount.textContent = 'Aktuelle Reihen: 0';
            wrapper.insertBefore(rowCount, wrapper.firstChild);
        }

        // Eine Reihe hinzufügen
        if (!document.getElementById('lss_mb_add_row_btn')) {
            const greenBtn = document.createElement('button');
            greenBtn.id = 'lss_mb_add_row_btn';
            greenBtn.className = BUTTON_CLASSES.primary;
            greenBtn.textContent = 'Weitere Reihe hinzufügen';
            greenBtn.style.height = '30px';
            greenBtn.style.padding = '0 12px';
            greenBtn.addEventListener('click', () => {
                log('AddRow Button geklickt');
                LSS_MB.ui.createBuildRow();
                if (LSS_MB.state.applyBtn) LSS_MB.state.applyBtn.disabled = false;

                if (LSS_MB.state.autoApplyGlobals) {
                    setTimeout(() => {
                        const lastRow = LSS_MB.state.buildRows.at(-1);
                        if (lastRow) applyGlobalsToRow(lastRow);
                        updateRowCountDisplay();
                    }, 0);
                } else {
                    updateRowCountDisplay();
                }
            });
            wrapper.appendChild(greenBtn);
        }

        // +5 Reihen Button
        if (!document.getElementById('lss_mb_add_5_rows_btn')) {
            const btn5 = document.createElement('button');
            btn5.id = 'lss_mb_add_5_rows_btn';
            btn5.className = BUTTON_CLASSES.warning;
            btn5.textContent = '+5 Reihen';
            btn5.style.height = '30px';
            btn5.style.padding = '0 12px';
            btn5.addEventListener('click', () => {
                log('+5 Reihen Button geklickt');
                if (LSS_MB.state.applyBtn) LSS_MB.state.applyBtn.disabled = false;
                const newRows = [];

                for (let i = 0; i < 5; i++) {
                    LSS_MB.ui.createBuildRow();
                    const row = LSS_MB.state.buildRows.at(-1);
                    if (row) newRows.push(row);
                }

                if (LSS_MB.state.autoApplyGlobals) {
                    setTimeout(() => {
                        newRows.forEach(row => applyGlobalsToRow(row));
                    }, 0);
                }

                updateRowCountDisplay();
            });
            wrapper.appendChild(btn5);
        }

        // +10 Reihen Button
        if (!document.getElementById('lss_mb_add_10_rows_btn')) {
            const btn10 = document.createElement('button');
            btn10.id = 'lss_mb_add_10_rows_btn';
            btn10.className = BUTTON_CLASSES.warning;
            btn10.textContent = '+10 Reihen';
            btn10.style.height = '30px';
            btn10.style.padding = '0 12px';
            btn10.addEventListener('click', () => {
                log('+10 Reihen Button geklickt');
                if (LSS_MB.state.applyBtn) LSS_MB.state.applyBtn.disabled = false;
                const newRows = [];

                for (let i = 0; i < 10; i++) {
                    LSS_MB.ui.createBuildRow();
                    const row = LSS_MB.state.buildRows.at(-1);
                    if (row) newRows.push(row);
                }

                if (LSS_MB.state.autoApplyGlobals) {
                    setTimeout(() => {
                        newRows.forEach(row => applyGlobalsToRow(row));
                    }, 0);
                }

                updateRowCountDisplay();
            });
            wrapper.appendChild(btn10);
        }

        // Bauen mit Credits
        if (!document.getElementById('lss_mb_build_all_btn')) {
            const buildBtn = document.createElement('button');
            buildBtn.id = 'lss_mb_build_all_btn';
            buildBtn.className = BUTTON_CLASSES.success;
            buildBtn.textContent = 'Wachen/Gebäude bauen (Credits)';
            buildBtn.style.height = '30px';
            buildBtn.style.padding = '0 12px';
            buildBtn.addEventListener('click', async () => {
                log('BuildAll Button geklickt');
                buildBtn.disabled = true;
                buildBtn.textContent = 'Baue…';
                disableButtonsDuringBuild(true);
                try { await buildAll(); } catch (e) { log('Fehler beim buildAll:', e); }
                finally {
                    buildBtn.disabled = false;
                    buildBtn.textContent = 'Wachen/Gebäude bauen (Credits)';
                    disableButtonsDuringBuild(false);
                }
            });
            wrapper.appendChild(buildBtn);
        }

        // Bauen mit Coins
        if (!document.getElementById('lss_mb_build_all_coins_btn') && !HIDE_COINS_BUTTON) {
            const coinsBtn = document.createElement('button');
            coinsBtn.id = 'lss_mb_build_all_coins_btn';
            coinsBtn.className = BUTTON_CLASSES.danger;
            coinsBtn.textContent = 'Wachen/Gebäude bauen (Coins)';
            coinsBtn.style.height = '30px';
            coinsBtn.style.padding = '0 12px';
            coinsBtn.addEventListener('click', async () => {
                coinsBtn.disabled = true;
                coinsBtn.textContent = 'Baue (Coins)…';
                disableButtonsDuringBuild(true);
                try { await buildAllCoins(); } finally {
                    coinsBtn.disabled = false;
                    coinsBtn.textContent = 'Wachen/Gebäude bauen (Coins)';
                    disableButtonsDuringBuild(false);
                }
            });
            wrapper.appendChild(coinsBtn);
        }

        updateBuildAllButtonState();
        createGlobalControls();
    }

    // Funktion für Globale Auswahl
    function createGlobalControls() {
        let wrap = document.getElementById('lss_mb_global_controls');
        if (wrap) return;

        const buttonsWrapper = document.getElementById('lss_mb_buttons_wrapper');
        if (!buttonsWrapper) return;

        wrap = document.createElement('div');
        wrap.id = 'lss_mb_global_controls';

        const mode = document.body.classList.contains('dark') ? 'dark' : 'light';
        const bgColor = mode === 'dark' ? '#2b2b2b' : '#fff';
        const textColor = mode === 'dark' ? '#eee' : '#000';
        const borderColor = mode === 'dark' ? '#555' : '#ccc';

        Object.assign(wrap.style, {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            marginTop: '8px',
            padding: '8px',
            borderRadius: '6px',
            backgroundColor: mode === 'dark' ? '#3a3a3a' : '#f5f5f5',
            border: `1px solid ${borderColor}`
        });

        // ===== Checkbox in eigener Zeile oben =====
        const checkboxRow = document.createElement('div');
        Object.assign(checkboxRow.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            width: '100%', // nimmt volle Breite ein, damit sie oben sitzt
            marginBottom: '4px',
            fontSize: '13px',
            color: textColor
        });

        const autoApplyCheckbox = document.createElement('input');
        autoApplyCheckbox.type = 'checkbox';
        autoApplyCheckbox.checked = LSS_MB.state.autoApplyGlobals ?? false;
        LSS_MB.state.autoApplyGlobals = autoApplyCheckbox.checked;
        log('Initialer Auto-Apply-State:', LSS_MB.state.autoApplyGlobals);
        autoApplyCheckbox.addEventListener('change', () => {
            LSS_MB.state.autoApplyGlobals = autoApplyCheckbox.checked;
            localStorage.setItem('lss_mb_auto_apply_globals', JSON.stringify(autoApplyCheckbox.checked));
            log('Automatisches Übernehmen globaler Einstellungen:', autoApplyCheckbox.checked);
        });

        const autoApplyLabel = document.createElement('span');
        autoApplyLabel.textContent = 'Neue Reihen übernehmen automatisch globale Einstellungen';

        checkboxRow.append(autoApplyCheckbox, autoApplyLabel);
        wrap.appendChild(checkboxRow);

        // ===== Hauptlabel „Globale Einstellungen“ =====
        const label = document.createElement('div');
        label.textContent = 'Globale Einstellungen';
        label.style.fontWeight = 'bold';
        label.style.marginRight = '10px';
        label.style.color = textColor;
        wrap.appendChild(label);

        function styleField(el, width = '160px') {
            el.style.boxSizing = 'border-box';
            el.style.flex = `0 0 ${width}`;
            el.style.height = '30px';
            el.style.padding = '2px 6px';
            el.style.borderRadius = '4px';
            el.style.border = `1px solid ${borderColor}`;
            el.style.backgroundColor = bgColor;
            el.style.color = textColor;
            el.style.fontSize = '13px';
            el.style.fontFamily = 'inherit';
            return el;
        }

        // ===== Globale Selects =====
        const globalBuilding = styleField(document.createElement('select'));
        const globalLST = styleField(document.createElement('select'));
        const globalVehicle = styleField(document.createElement('select'));

        globalBuilding.innerHTML = `<option value="">🏢 Wachentyp</option>`;
        globalLST.innerHTML = `<option value="">📡 Leitstelle</option>`;
        globalVehicle.innerHTML = `<option value="">🚒 Fahrzeug</option>`;
        globalVehicle.style.display = 'none';

        const globalHospitalMode = styleField(document.createElement('select'), '120px');
        globalHospitalMode.style.display = 'none';
        globalHospitalMode.innerHTML = `<option value="own">Eigenes</option><option value="alliance">Verband</option>`;

        const globalSchoolMode = styleField(document.createElement('select'), '120px');
        globalSchoolMode.style.display = 'none';
        globalSchoolMode.innerHTML = `<option value="own">Eigene</option><option value="alliance">Verband</option>`;

        const globalBereitsstellungsraumMode = styleField(document.createElement('select'), '120px');
        globalBereitsstellungsraumMode.style.display = 'none';
        globalBereitsstellungsraumMode.innerHTML = `<option value="own">Eigener</option><option value="alliance">Verband</option>`;

        wrap.append(globalBuilding, globalHospitalMode, globalSchoolMode, globalBereitsstellungsraumMode, globalLST, globalVehicle);

        // ===== Gebäude laden =====
        let buildings = LSS_MB.state.buildingsData;
        if (!Array.isArray(buildings)) buildings = Object.values(buildings);
        buildings = buildings.slice().sort((a, b) => (a.caption || '').localeCompare(b.caption || '', 'de', { sensitivity: 'base' }));
        const userLevel = Number(LSS_MB.state.userInfo?.user_level ?? 0);

        buildings.forEach(b => {
            const type = b.building_type;
            if ((type === 26 && userLevel < 4) ||
                (type === 25 && userLevel < 0) ||
                ((type === 5 || type === 13) && userLevel < 7) ||
                (type === 28 && userLevel < 5) ||
                (type === 24 && userLevel < 3) ||
                (type === 15 && userLevel < 6) ||
                (type === 16 && !LSS_MB.state.alliance.canBuildAllianceHospital)
               ) return;

            const opt = document.createElement('option');
            opt.value = String(b.building_type);
            opt.textContent = b.caption;
            globalBuilding.appendChild(opt);
        });

        // ===== Leitstellen laden =====
        fetch('/api/buildings')
            .then(r => r.json())
            .then(data => {
            data.filter(b => b.building_type === 7)
                .sort((a, b) => a.caption.localeCompare(b.caption, 'de', { sensitivity: 'base' }))
                .forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.caption;
                globalLST.appendChild(opt);
            });
            log('Globale Leitstellen geladen');
        });

        // ===== Fahrzeuge laden =====
        const vehicleMapping = { "LF 20": 0, "LF 10": 1, "LF 8/6": 6, "LF 20/16": 7, "LF 10/6": 8, "LF 16-TS": 9, "LF-L": 107, "KLF": 88, "MLF": 89, "TSF-W": 37, "HLF 10": 90, "HLF 20": 30 };
        Object.entries(vehicleMapping).forEach(([name, id]) => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = name;
            globalVehicle.appendChild(opt);
        });

        updateLeitstelleVisibility(LSS_MB.state.globalDefaults, globalLST);

        function updateGlobalVehicleVisibility() {
            const selected = globalBuilding.selectedOptions[0];
            if (!selected) return;
            const text = selected.textContent.toLowerCase();
            const isFeuerwache = text.includes('feuerwache');
            globalVehicle.style.display = isFeuerwache ? 'block' : 'none';
            if (!isFeuerwache) {
                globalVehicle.value = '';
                LSS_MB.state.globalDefaults.startVehicle = null;
            }
        }

        // ===== Event-Listener =====
        globalBuilding.addEventListener('change', () => {
            LSS_MB.state.globalDefaults.buildingType = globalBuilding.value || null;
            updateLeitstelleVisibility(LSS_MB.state.globalDefaults, globalLST);

            const typeId = Number(globalBuilding.value);
            const canBuildAlliance = LSS_MB.state.alliance.canBuildAllianceHospital;

            // Krankenhaus
            if (typeId === 4 && canBuildAlliance) {
                globalHospitalMode.style.display = 'block';
            } else {
                globalHospitalMode.style.display = 'none';
            }

            // Schulen
            if (ALLIANCE_SCHOOL_TYPES.has(typeId) && canBuildAlliance) {
                globalSchoolMode.style.display = 'block';
            } else {
                globalSchoolMode.style.display = 'none';
            }

            // Bereitsstellungsraum
            if (typeId === 14 && canBuildAlliance) {
                globalBereitsstellungsraumMode.style.display = 'block';
            } else {
                globalBereitsstellungsraumMode.style.display = 'none';
            }

            updateGlobalVehicleVisibility();
        });

        globalLST.addEventListener('change', () => {
            LSS_MB.state.globalDefaults.leitstelle = globalLST.value || null;
        });

        globalVehicle.addEventListener('change', () => {
            LSS_MB.state.globalDefaults.startVehicle = globalVehicle.value || null;
        });

        globalHospitalMode.addEventListener('change', () => {
            LSS_MB.state.globalDefaults.hospitalMode = globalHospitalMode.value;
            updateLeitstelleVisibility(LSS_MB.state.globalDefaults, globalLST);
        });

        globalSchoolMode.addEventListener('change', () => {
            LSS_MB.state.globalDefaults.schoolMode = globalSchoolMode.value;
            updateLeitstelleVisibility(LSS_MB.state.globalDefaults, globalLST);
        });

        globalBereitsstellungsraumMode.addEventListener('change', () => {
            LSS_MB.state.globalDefaults.bereitschaftsraumMode = globalBereitsstellungsraumMode.value;
            updateLeitstelleVisibility(LSS_MB.state.globalDefaults, globalLST);
        });

        // ===== Apply- und Delete-Buttons =====
        const applyBtn = document.createElement('button');
        applyBtn.textContent = '⚡ Auf alle Reihen anwenden';
        applyBtn.className = BUTTON_CLASSES.primary;
        applyBtn.style.height = '30px';
        applyBtn.onclick = () => {
            LSS_MB.state.buildRows.forEach(row => applyGlobalsToRow(row));
            updateCostPreview();
        };
        wrap.appendChild(applyBtn);

        LSS_MB.state.applyBtn = applyBtn;

        const deleteAllBtn = document.createElement('button');
        deleteAllBtn.textContent = '🗑 Alle Reihen entfernen';
        deleteAllBtn.className = BUTTON_CLASSES.danger;
        deleteAllBtn.style.height = '30px';
        deleteAllBtn.onclick = () => {
            if (!confirm('Wirklich alle Reihen entfernen?')) return;

            // Marker von der Karte entfernen
            LSS_MB.state.buildRows.forEach(row => {
                if (row.marker) {
                    try { LSS_MB.state.map.removeLayer(row.marker); } catch {}
                }
            });

            // Reihen im DOM löschen
            const rowsWrapper = document.getElementById('lss_mb_rows_wrapper');
            if (rowsWrapper) rowsWrapper.innerHTML = '';

            // State zurücksetzen
            LSS_MB.state.buildRows = [];
            LSS_MB.state.buildRowCounter = 0;
            LSS_MB.state.globalDefaults = {
                buildingType: null,
                leitstelle: null,
                startVehicle: null,
                hospitalMode: 'own',
                schoolMode: 'own',
                bereitschaftsraumMode: 'own'
            };

            // Globale Inputs zurücksetzen
            globalBuilding.value = '';
            globalLST.value = '';
            globalVehicle.value = '';
            globalHospitalMode.value = 'own';
            globalSchoolMode.value = 'own';
            globalBereitsstellungsraumMode.value = 'own';

            globalHospitalMode.style.display = 'none';
            globalSchoolMode.style.display = 'none';
            globalBereitsstellungsraumMode.style.display = 'none';
            globalVehicle.style.display = 'none';

            updateLeitstelleVisibility(LSS_MB.state.globalDefaults, globalLST);

            updateCostPreview();
            updateBuildAllButtonState();
            checkBereitsstellungsraumLimits();
            updateRowCountDisplay();

            // WICHTIG: applyBtn deaktivieren
            applyBtn.disabled = true;

            log('Alle Reihen entfernt, globale Einstellungen zurückgesetzt');
        };

        wrap.appendChild(deleteAllBtn);

        buttonsWrapper.parentNode.insertBefore(wrap, buttonsWrapper.nextSibling);
        LSS_MB.state.globalControlsWrap = wrap;

        updateBuildAllButtonState();
    }

    // Funktion um alles in die Reihen zu übernehmen
    function applyGlobalsToRow(rowState) {
        const defs = LSS_MB.state.globalDefaults;
        const s = rowState.selects;

        if (!s) {
            return;
        }

        // 1️⃣ Wachentyp setzen
        if (defs.buildingType && s.building) {
            s.building.value = defs.buildingType;
            s.building.dispatchEvent(new Event('change'));

            const canBuildAlliance = LSS_MB.state.alliance.canBuildAllianceHospital;

            setTimeout(() => {
                if (s.hospitalMode) {
                    s.hospitalMode.style.display =
                        defs.buildingType == 4 && canBuildAlliance ? 'block' : 'none';
                }

                if (s.schoolMode) {
                    s.schoolMode.style.display =
                        ALLIANCE_SCHOOL_TYPES.has(Number(defs.buildingType)) && canBuildAlliance
                        ? 'block'
                    : 'none';
                }

                if (s.bereitstellungsraum) {
                    s.bereitstellungsraum.style.display =
                        defs.buildingType == 14 && canBuildAlliance ? 'block' : 'none';
                }
            }, 50);
        }

        // 2️⃣ Mode-Selects setzen
        if (s.hospitalMode && defs.hospitalMode) {
            setTimeout(() => {
                s.hospitalMode.value = defs.hospitalMode;
                s.hospitalMode.dispatchEvent(new Event('change'));
            }, 100);
        }

        if (s.schoolMode && defs.schoolMode) {
            setTimeout(() => {
                s.schoolMode.value = defs.schoolMode;
                s.schoolMode.dispatchEvent(new Event('change'));
            }, 100);
        }

        if (s.bereitstellungsraum && defs.bereitschaftsraumMode) {
            setTimeout(() => {
                s.bereitstellungsraum.value = defs.bereitschaftsraumMode;
                s.bereitstellungsraum.dispatchEvent(new Event('change'));
            }, 100);
        }

        // 3️⃣ Leitstelle setzen
        if (s.leitstelle && defs.leitstelle) {
            let retryCount = 0;
            const applyLST = () => {
                retryCount++;
                const isLoaded = rowState.lstSelectLoaded?.() || false;

                if (isLoaded) {
                    const hasOption = [...s.leitstelle.options].some(o => o.value == defs.leitstelle);
                    if (hasOption) {
                        s.leitstelle.value = defs.leitstelle;
                        s.leitstelle.dispatchEvent(new Event('change'));
                        return;
                    }
                }

                if (retryCount > 15) {
                    return;
                }

                setTimeout(applyLST, 200);
            };

            setTimeout(applyLST, 100);
        }

        // 4️⃣ Fahrzeug setzen
        if (s.vehicle && defs.startVehicle) {
            let retryCount = 0;
            const applyVehicle = () => {
                retryCount++;
                const optionCount = s.vehicle.options.length;

                if (optionCount > 1) {
                    const hasOption = [...s.vehicle.options].some(o => o.value == defs.startVehicle);
                    if (hasOption) {
                        s.vehicle.value = defs.startVehicle;
                        s.vehicle.dispatchEvent(new Event('change'));
                        return;
                    }
                }

                if (retryCount > 15) {
                    return;
                }

                setTimeout(applyVehicle, 200);
            };

            setTimeout(applyVehicle, 100);
        }
    }

    // Reihenzähler
    function updateRowCountDisplay() {
        const el = document.getElementById('lss_mb_row_count');
        if (!el) return;

        const count = LSS_MB.state.buildRows?.length || 0;
        el.textContent = `Aktuelle Reihen: ${count}`;
    }

    // Funktion um Leistellenauswahl anzuzeigen oder nicht
    function updateLeitstelleVisibility(data, lstSelect) {
        const rawType = data.buildingType;

        // ❗ FIX: 0 ist gültig → nicht mit ! prüfen
        if (rawType === null || rawType === undefined || rawType === '') {
            lstSelect.style.display = 'none';
            return;
        }

        const typeId = Number(rawType);

        const isAllianceHospital =
              typeId === 4 && data.hospitalMode === 'alliance';

        const isAllianceSchool =
              ALLIANCE_SCHOOL_TYPES.has(typeId) && data.schoolMode === 'alliance';

        const isAllianceBereitstellungsraum =
              typeId === 14 && data.bereitschaftsraumMode === 'alliance';

        const isAllianceOnlyBuilding =
              typeId === 16;

        if (
            typeId === 7 ||
            isAllianceHospital ||
            isAllianceSchool ||
            isAllianceBereitstellungsraum ||
            isAllianceOnlyBuilding
        ) {
            lstSelect.style.display = 'none';
            delete data.leitstelle;
        } else {
            lstSelect.style.display = '';
        }
    }

    // Funktion um den Baubutton zu deaktivieren.
    function updateBuildAllButtonState() {
        const buildBtn = document.getElementById('lss_mb_build_all_btn');
        const coinsBtn = document.getElementById('lss_mb_build_all_coins_btn');
        if (!buildBtn && !coinsBtn) return;

        const hasRows = Array.isArray(LSS_MB.state.buildRows)
        && LSS_MB.state.buildRows.length > 0;

        if (buildBtn) {
            buildBtn.disabled = !hasRows;
            buildBtn.style.opacity = hasRows ? '1' : '0.5';
            buildBtn.style.cursor = hasRows ? 'pointer' : 'not-allowed';
        }
        if (coinsBtn) {
            coinsBtn.disabled = !hasRows;
            coinsBtn.style.opacity = hasRows ? '1' : '0.5';
            coinsBtn.style.cursor = hasRows ? 'pointer' : 'not-allowed';
        }
    }

    // Funktion um den Maker zu benennen
    function updateMarkerLabel(rowState) {
        if (!rowState.marker) return;

        const parts = [];

        // Sichtbare Reihen-Nummer verwenden
        const rowNr = rowState.visualIndex ?? rowState.id;
        parts.push(`Reihe ${rowNr}`);

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

    // Fehlerhaftes Feld anzeigen
    function highlightField(el, isError) {
        if (!el) return;
        el.style.borderColor = isError ? '#ff4d4f' : '';
    }

    // Zählung der geplanten Bereitstelungsräume
    function countPlannedBereitsstellungsraeume() {
        let own = 0;
        let alliance = 0;

        for (const r of LSS_MB.state.buildRows || []) {
            const d = r.data || {};
            if (String(d.buildingType) === '14') {
                if (d.bereitschaftsraumMode === 'alliance') {
                    alliance++;
                } else {
                    own++;
                }
            }
        }

        return { own, alliance };
    }

    // Prüfung des Limits der Bereitstellungsräumen
    function checkBereitsstellungsraumLimits(triggerRow) {
        try {
            const allowedOwnBR = LSS_MB.state.isPremium ? 8 : 4;
            const allowedAllianceBR = 4; // Verbandslimit

            const existingOwnBR = Number(LSS_MB.state.userBuildings?.[14] || 0);
            const existingAllianceBR = Number(LSS_MB.state.allianceBuildings?.[14] || 0);
            // ↑ falls vorhanden, sonst 0 lassen oder anpassen

            const plannedCounts = countPlannedBereitsstellungsraeume();
            const totalOwn = existingOwnBR + plannedCounts.own;
            const totalAlliance = existingAllianceBR + plannedCounts.alliance;

            const exceededOwn = totalOwn > allowedOwnBR;
            const exceededAlliance = totalAlliance > allowedAllianceBR;

            for (const r of LSS_MB.state.buildRows || []) {
                const d = r.data || {};
                if (String(d.buildingType) !== '14') {
                    if (r.statusEl) {
                        const txt = r.statusEl.textContent || '';
                        if (txt.startsWith('❌')) {
                            r.statusEl.style.display = 'none';
                            r.statusEl.textContent = '';
                        }
                    }
                    const sel = r.el?.querySelector('select');
                    if (sel) highlightField(sel, false);
                    continue;
                }

                const isAlliance = d.bereitschaftsraumMode === 'alliance';
                const sel = r.el?.querySelector('select');

                let showError = false;
                let errorText = '';

                if (!isAlliance && exceededOwn) {
                    showError = true;
                    errorText = `❌ Fehler`;
                }

                if (isAlliance && exceededAlliance) {
                    showError = true;
                    errorText = `❌ Fehler`;
                }

                if (showError) {
                    if (r.statusEl) {
                        r.statusEl.style.display = 'block';
                        r.statusEl.textContent = errorText;
                    }
                    if (sel) highlightField(sel, true);
                } else {
                    if (r.statusEl) {
                        const txt = r.statusEl.textContent || '';
                        if (txt.startsWith('❌')) {
                            r.statusEl.style.display = 'none';
                            r.statusEl.textContent = '';
                        }
                    }
                    if (sel) highlightField(sel, false);
                }
            }

            try { updateCostPreview(); } catch (e) { log('updateCostPreview Fehler nach BR-Check', e); }
        } catch (e) {
            log('checkBereitsstellungsraumLimits Fehler', e);
        }
    }

    // Funktion um Buttons während des Bauens zu deaktivieren
    function disableButtonsDuringBuild(disabled) {
        LSS_MB.state.isBuilding = disabled;

        const buildBtn = document.getElementById('lss_mb_build_all_btn');
        const coinsBtn = document.getElementById('lss_mb_build_all_coins_btn');
        const addBtn = document.getElementById('lss_mb_add_row_btn');
        const btn5 = document.getElementById('lss_mb_add_5_rows_btn');
        const btn10 = document.getElementById('lss_mb_add_10_rows_btn');

        if (btn5) {
            btn5.disabled = disabled || btn5.disabled;
            btn5.style.opacity = disabled ? '0.5' : '';
        }
        if (btn10) {
            btn10.disabled = disabled || btn10.disabled;
            btn10.style.opacity = disabled ? '0.5' : '';
        }
        if (buildBtn) {
            buildBtn.disabled = disabled || buildBtn.disabled;
            buildBtn.style.opacity = disabled ? '0.5' : '';
        }
        if (coinsBtn) {
            coinsBtn.disabled = disabled || coinsBtn.disabled;
            coinsBtn.style.opacity = disabled ? '0.5' : '';
        }
        if (addBtn) {
            addBtn.disabled = disabled || addBtn.disabled;
            addBtn.style.opacity = disabled ? '0.5' : '';
        }
    }

    // Funktion um die Wachen zu bauen
    async function buildAll() {
        const rows = LSS_MB.state.buildRows;
        const errorMessages = [];

        log('buildAll gestartet, Reihenanzahl=', rows.length);

        for (const row of rows) {
            if (row.statusEl) {
                row.statusEl.style.display = 'block'; // sichtbar machen
                row.statusEl.textContent = '⏳ Wartet';
            }
        }

        for (const row of rows) {
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
                row.statusEl && (row.statusEl.textContent = '❌ Fehler');
                alert(`❌ Interner Fehler in Reihe ${rowLabel(row)} (Gebäudetyp inkonsistent)`);
                return;
            }
        }

        for (let row of rows) {
            try {
                row.statusEl && (row.statusEl.textContent = '🔍 Prüfe…');
                await validateRow(row);
                row.statusEl && (row.statusEl.textContent = '⏳ Bereit');
            } catch (e) {
                row.statusEl && (row.statusEl.textContent = '❌ Fehler');
                errorMessages.push(`Reihe ${rowLabel(row)}: ${e.message}`);
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

            row.statusEl && (row.statusEl.textContent = '🔨 Baue…');

            const fd = new FormData();
            // utf8 wie beim Formular-Submit ergänzen (Rails-Forms nutzen das)
            fd.append('utf8', '✓');
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
                fd.append('commit', 'Bauen 200.000 Credits');
                if (d.hospitalMode === 'alliance') {
                    // richtiges Feld für Verbandsbau
                    fd.append('build_as_alliance', '1');
                    console.info('[LSS-MB][BUILD]', 'Reihe', rowLabel(row), '→ Verbandskrankenhaus');
                } else {
                    console.info('[LSS-MB][BUILD]', 'Reihe', rowLabel(row), '→ Eigenes Krankenhaus');
                }
            }

            // ===== Verbandszellen =====
            if (typeId === 16) {
                fd.append('commit', 'Bauen 200.000 Credits');
                fd.append('build_as_alliance', '1');
                console.info('[LSS-MB][BUILD]', 'Reihe', row.id, '→ Verbandszellen');
            }

            // ===== Schulen =====
            if (ALLIANCE_SCHOOL_TYPES.has(typeId)) {
                fd.append('commit', 'Bauen 200.000 Credits');
                if (d.schoolMode === 'alliance') {
                    fd.append('build_as_alliance', '1');
                    console.info('[LSS-MB][BUILD]', 'Reihe', row.id, '→ Verbandsschule');
                }
            }

            // ===== Bereitsstellungsraum (Typ 14) =====
            if (typeId === 14) {
                fd.append('commit', 'Bauen Bereitsstellungsraum');
                if (d.bereitschaftsraumMode === 'alliance') {
                    fd.append('build_as_alliance', '1');
                    console.info('[LSS-MB][BUILD]', 'Reihe', rowLabel(row), '→ Verbands-Bereitstellungsraum');
                } else {
                    console.info('[LSS-MB][BUILD]', 'Reihe', rowLabel(row), '→ Eigener Bereitsstellungsraum');
                }
            }

            // Debug
            for (let [k, v] of fd.entries()) {
            }

            try {
                const resp = await fetch('/buildings', {
                    method: 'POST',
                    body: fd,
                    credentials: 'same-origin'
                });

                if (!resp.ok) {
                    throw new Error(`HTTP ${resp.status}`);
                }

                row.statusEl && (row.statusEl.textContent = '✅ Fertig');
                log('POST abgeschlossen für Reihe', row.id, 'Status:', resp.status);
            } catch (e) {
                row.statusEl && (row.statusEl.textContent = '❌ Fehler');
                log('Fehler beim POST für Reihe', row.id, e);
            }

            await new Promise(r => setTimeout(r, 700));
        }

        log('buildAll fertig');
        alert(`✅ Fertig: ${rows.length} Gebäude gebaut. Seite wird neugeladen.`);
        location.reload();
    }

    // Validierung wie beim Credits-Bau, Bestätigung vor dem Absenden.
    async function buildAllCoins() {
        const rows = LSS_MB.state.buildRows;
        const errorMessages = [];

        log('buildAllCoins gestartet, Reihenanzahl=', rows.length);

        if (!Array.isArray(rows) || rows.length === 0) {
            alert('Keine Reihen vorhanden.');
            return;
        }

        // 1) Status auf "Wartet" setzen (sichtbar machen)
        for (const row of rows) {
            if (row.statusEl) {
                row.statusEl.style.display = 'block';
                row.statusEl.textContent = '⏳ Wartet';
            }
        }

        // 2) Gleiche FATAL-Prüfung wie bei buildAll: building_type mismatch für ALLE Reihen
        for (const row of rows) {
            const d = row.data;
            if (
                d.building &&
                String(d.building.building_type) !== String(d.buildingType)
            ) {
                console.error(
                    '[LSS-MB][FATAL][COINS] building_type-Mismatch',
                    d.building.building_type,
                    d.buildingType
                );
                row.statusEl && (row.statusEl.textContent = '❌ Fehler');
                alert(`❌ Interner Fehler in Reihe ${rowLabel(row)} (Gebäudetyp inkonsistent)`);
                return;
            }
        }

        // 3) Verbandsgebäude herausfiltern (können nicht mit Coins gekauft werden)
        const rowsToBuy = [];
        let skippedAllianceCount = 0;
        for (const row of rows) {
            const d = row.data;
            if (!d.building) continue;

            const typeId = Number(d.building.building_type);
            const isAlliance =
                  (typeId === 4 && d.hospitalMode === 'alliance') ||
                  (ALLIANCE_SCHOOL_TYPES.has(typeId) && d.schoolMode === 'alliance') ||
                  (typeId === 16);

            if (isAlliance) {
                skippedAllianceCount++;
                if (row.statusEl) {
                    row.statusEl.style.display = 'block';
                    row.statusEl.textContent = '🔒 Verbandsbau (kein Coins)';
                }
                continue;
            }
            rowsToBuy.push(row);
        }

        if (rowsToBuy.length === 0) {
            alert(
                skippedAllianceCount > 0
                ? 'Alle gewählten Reihen sind Verbandsgebäude und können nicht per Coins gekauft werden.'
                : 'Keine gültigen Reihen zum Bauen mit Coins gefunden.'
            );
            return;
        }

        // 4) Validierung nutzt validateRow
        for (let row of rowsToBuy) {
            try {
                row.statusEl && (row.statusEl.textContent = '🔍 Prüfe…');
                await validateRow(row);
                row.statusEl && (row.statusEl.textContent = '⏳ Bereit');
            } catch (e) {
                row.statusEl && (row.statusEl.textContent = '❌ Fehler');
                errorMessages.push(`Reihe ${rowLabel(row)}: ${e.message}`);
            }
        }

        if (errorMessages.length > 0) {
            log('Fehler beim Bau (Coins), Abbruch:', errorMessages);
            alert('❌ Fehler beim Bau (Coins):\n' + errorMessages.join('\n'));
            return;
        }

        // 5) Sicherstellen, dass Kostenvorschau aktuell ist
        try { await updateCostPreview(); } catch (e) { log('updateCostPreview fehlgeschlagen vor Coins-Bau', e); }

        // 6) Coins-Gesamtkosten aus der Anzeige summiere
        let totalCoins = 0;
        let unknownCoins = false;
        let buildingCount = 0;

        for (const row of rowsToBuy) {
            const d = row.data;
            if (!d.building) continue;
            buildingCount++;

            const coinEl = document.getElementById(`lss_mb_coins_${row.id}`);
            const txt = (coinEl?.textContent || '').trim();
            const match = txt.match(/([\d\.]+)/);
            if (!match) {
                unknownCoins = true;
                continue;
            }
            const num = Number(match[1].replace(/\./g, ''));
            if (!Number.isFinite(num)) {
                unknownCoins = true;
                continue;
            }
            totalCoins += num;
        }

        if (buildingCount === 0) {
            alert('Keine gültigen Gebäude/Reihen zum Bauen gefunden.');
            return;
        }

        // 7) Bestätigungsdialog
        const totalFormatted = totalCoins.toLocaleString('de-DE');
        let confirmMsg = '';
        if (skippedAllianceCount > 0) {
            confirmMsg += `${skippedAllianceCount} Verbandsgebäude werden ausgeschlossen (können nicht mit Coins gekauft werden).\n\n`;
        }
        if (unknownCoins) {
            confirmMsg += `Für einige ausgewählte Gebäude sind die Coin-Kosten nicht bekannt.\nMöchtest du trotzdem versuchen, ${buildingCount} Gebäude für insgesamt ca. ${totalFormatted} Coins zu kaufen?`;
        } else {
            confirmMsg += `Möchtest du wirklich ${buildingCount} Gebäude für insgesamt ${totalFormatted} Coins kaufen?`;
        }

        if (!window.confirm(confirmMsg)) {
            log('User hat den Coins-Kauf abgebrochen');
            for (const row of rowsToBuy) {
                if (row.statusEl) {
                    row.statusEl.style.display = 'block';
                    row.statusEl.textContent = '⛔ Abgebrochen';
                }
            }
            return;
        }

        // 8) POSTs mit build_with_coins (nur rowsToBuy)
        for (let row of rowsToBuy) {
            const d = row.data;
            const csrf = document.querySelector('meta[name="csrf-token"]')?.content;

            row.statusEl && (row.statusEl.textContent = '🔨 Baue');

            const fd = new FormData();
            fd.append('utf8', '✓');
            fd.append('authenticity_token', csrf);
            fd.append('building[building_type]', d.buildingType);
            fd.append('building[name]', d.name);
            fd.append('building[latitude]', d.lat);
            fd.append('building[longitude]', d.lng);
            fd.append('building[address]', d.address || '');
            fd.append('building[leitstelle_building_id]', d.leitstelle || '');
            fd.append('build_with_coins', '1');

            if (d.startVehicle) {
                const key = d.buildingType === '18'
                ? 'building[start_vehicle_feuerwache_kleinwache]'
                : 'building[start_vehicle_feuerwache]';
                fd.append(key, d.startVehicle);
            }

            const typeId = Number(d.building?.building_type);
            if (typeId === 4 || ALLIANCE_SCHOOL_TYPES.has(typeId) || typeId === 16) {
                fd.append('commit', 'Bauen (Coins)');
                if (typeId === 16) {
                    fd.append('build_as_alliance', '1');
                }
            }

            // Debug-Ausgabe
            for (let [k, v] of fd.entries()) {
            }

            try {
                const resp = await fetch('/buildings', {
                    method: 'POST',
                    body: fd,
                    credentials: 'same-origin'
                });

                if (!resp.ok) {
                    throw new Error(`HTTP ${resp.status}`);
                }
                row.statusEl && (row.statusEl.textContent = '✅ Fertig');
                log('POST (Coins) abgeschlossen für Reihe', row.id, 'Status:', resp.status);
            } catch (e) {
                row.statusEl && (row.statusEl.textContent = '❌ Fehler');
                log('Fehler beim POST (Coins) für Reihe', row.id, e);
            }
            await new Promise(r => setTimeout(r, 700));
        }
        log('buildAllCoins fertig');
        alert(`✅ Fertig: ${rowsToBuy.length} Gebäude gebaut. ${skippedAllianceCount > 0 ? skippedAllianceCount + ' Verbandsgebäude wurden ausgeschlossen.' : ''} Seite wird neugeladen.`);
        location.reload();
    }

    // Funktion um die Kosten zu berechnen
    async function validateRow(rowState) {
        const d = rowState.data;

        const rowEl = rowState.el;
        const selects = rowEl?.querySelectorAll('select');
        const typeSelect = selects ? selects[0] : null;
        const addressInput = rowEl?.querySelector('input[placeholder="Adresse (optional)"]');
        const nameInput = rowEl?.querySelector('input[placeholder="Name (max 40 Zeichen)"]');

        [typeSelect, addressInput, nameInput].forEach(f => highlightField(f, false));

        const errors = [];
        if (!d.buildingType) { errors.push('Kein Wachentyp gewählt'); highlightField(typeSelect, true); }
        if (!d.name) { errors.push('Kein Wachenname angegeben'); highlightField(nameInput, true); }
        if (!Number.isFinite(d.lat) || !Number.isFinite(d.lng)) { errors.push('Keine Position gewählt (Marker fehlt)'); }
        if (!d.name || typeof d.name !== 'string' || d.name.trim().length === 0) {
            errors.push('Kein Wachenname angegeben');
            highlightField(nameInput, true);
        } else {
            const nameLen = d.name.trim().length;
            if (nameLen < 2) {
                errors.push('Wachenname muss mindestens 2 Zeichen lang sein');
                highlightField(nameInput, true);
            } else if (nameLen > 40) {
                errors.push('Wachenname darf maximal 40 Zeichen haben');
                highlightField(nameInput, true);
            }
        }

        if (d.building) {
            const caption = (d.building.caption || '').toLowerCase();
            const isLeitstelle = caption.includes('leitstelle') || Number(d.building.building_type) === 7;
            if (isLeitstelle) {
                if (typeof LSS_MB.state.userBuildingsTotal !== 'number' || LSS_MB.state.userBuildingsTotal === 0) {
                    await fetchUserBuildingsCount();
                }
                const total = LSS_MB.state.userBuildingsTotal || 0;
                const existingLeitstellen = LSS_MB.state.userBuildings[7] || 0;

                // PREMIUM: 10 Gebäude pro Leitstelle, NON-PREMIUM: 15 Gebäude pro Leitstelle
                const per = LSS_MB.state.isPremium ? 10 : 15;
                const allowed = Math.floor(total / per);
                if (existingLeitstellen >= allowed) {
                    errors.push(`Leitstelle nicht erlaubt (erlaubt: ${allowed}, vorhanden: ${existingLeitstellen}). Pro ${per} Gebäude maximal 1 Leitstelle.`);
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

            // Verbandsschulen
            if (
                ALLIANCE_SCHOOL_TYPES.has(typeId) &&
                d.schoolMode === 'alliance' &&
                !LSS_MB.state.alliance.canBuildAllianceHospital
            ) {
                throw new Error('Keine Berechtigung für Verbandsschulen');
            }

            // Verbands-Bereitsstellungsraum prüfen
            if (typeId === 14) {
                if (typeof LSS_MB.state.userBuildingsTotal !== 'number' || LSS_MB.state.userBuildingsTotal === 0) {
                    await fetchUserBuildingsCount();
                }
                const existingBR = LSS_MB.state.userBuildings[14] || 0;
                const allowedBR = LSS_MB.state.isPremium ? 8 : 4;
                if (existingBR >= allowedBR) {
                    throw new Error(`Bereitstellungsraum nicht erlaubt (erlaubt: ${allowedBR}, vorhanden: ${existingBR}).`);
                }
            }
        }

        if (errors.length) {
            log('validateRow Fehler für Reihe', rowLabel(rowState), errors);
            throw new Error(errors.join(', '));
        }
    }

    // Hilfsfunktion: logarithmus zur Basis b
    function log2(x) {
        return Math.log(x) / Math.log(2);
    }

    // Berechnungsformel für Kleinwachen
    function calcLogSmallStationCost(count) {
        if (count <= 24) return 50_000;

        return Math.round(
            25_000 + 50_000 * log2(count - 22)
        );
    }

    // 🚒 Feuerwehr (Typ 0)
    function calcFireStationCost(existingCount) {
        // existingCount = Anzahl NACH dem Bau
        if (existingCount <= 24) return 100_000;

        return Math.round(
            50_000 + 100_000 * log2(existingCount - 22)
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
        if (existingCount <= 24) return 100_000;

        return Math.round(
            50_000 + 100_000 * log2(existingCount - 22)
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

    // Baukosten vom Server holen
    async function fetchRealBuildingCost(typeId) {
        if (BUILD_COST_CACHE[typeId]) return BUILD_COST_CACHE[typeId];

        try {
            const res = await fetch(`/buildings/new?building_type=${typeId}`, {
                credentials: 'same-origin'
            });
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

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
            try { checkBereitsstellungsraumLimits(); } catch (e) { log('checkBereitsstellungsraumLimits Fehler nach fetchUserBuildingsCount', e); }
            return { counts: {}, total: 0 };
        }

    }

    // Funktion um Verbands-BSR zu zählen
    async function fetchExistingAllianceBSRCount() {
        try {
            const res = await fetch('/api/alliance_buildings', {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('API Fehler: ' + res.status);

            const data = await res.json();
            if (!Array.isArray(data)) return 0;

            // building_type 14 = Bereitsstellungsraum
            const count = data.filter(b =>
                                      String(b.building_type) === '14' && b.enabled
                                     ).length;

            return count;
        } catch (e) {
            log('fetchExistingAllianceBSRCount Fehler', e);
            return 0;
        }
    }

    // Sekündlicher Verbandsgebäude API-Abgleich
    async function getCachedAllianceBSRCount() {
        const now = Date.now();
        const cache = LSS_MB.state._allianceBSRCache || {};

        if (cache.value && cache.ts && (now - cache.ts < 1000)) {
            return cache.value; // 1s Cache
        }

        const value = await fetchExistingAllianceBSRCount();
        LSS_MB.state._allianceBSRCache = { value, ts: now };
        return value;
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

        // ⚠️ Cache optional, damit nicht bei jedem Keypress neu gefetcht wird
        if (typeof LSS_MB.state._allianceBSRCount !== 'number') {
            LSS_MB.state._allianceBSRCount = await fetchExistingAllianceBSRCount();
        }

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
                return;
            }
        }

        let ownCredits = 0;
        let ownCoins = 0;
        let allianceCredits = 0;

        // Serverpreise nur einmal abrufen
        const serverPrices = {};

        // kombinierten Feuerwachen-Zähler (Groß + Klein)
        let simulatedFireTotal = (simulatedCounts[0] || 0) + (simulatedCounts[18] || 0);
        const existingServerFireTotal = (existingServerCounts[0] || 0) + (existingServerCounts[18] || 0);

        let simulatedPoliceTotal = (simulatedCounts[6] || 0) + (simulatedCounts[19] || 0);
        const existingServerPoliceTotal = (existingServerCounts[6] || 0) + (existingServerCounts[19] || 0);

        // Hilfsformatierer
        const fmt = v => Number(v || 0).toLocaleString('de-DE');

        for (const row of LSS_MB.state.buildRows) {
            const d = row.data;
            if (!d.building) {
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
                    }
                    credits = Math.round(calcFireStationCost(buildingNumber) * (serverPrices.__scale0 || 1));
                }

                if (typeof serverPrices.__last0 === 'number' && credits < serverPrices.__last0) credits = serverPrices.__last0;
                serverPrices.__last0 = credits;

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
                    }

                    credits = Math.round(calcSmallFireStationCost(buildingNumber) * (serverPrices.__scale18 || 1));
                    credits = Math.min(credits, FIRE_STATION_SMALL_CREDIT_CAP);
                }

                if (typeof serverPrices.__last18 === 'number' && credits < serverPrices.__last18) credits = serverPrices.__last18;
                serverPrices.__last18 = credits;

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

                if (!serverPrices[typeId]) {
                    serverPrices[typeId] = await getCostsForBuilding(d.building);
                }

                coins = serverPrices[typeId].coins || 0;
                credits = calcRescueSpecialCost(buildingNumber);

                label = `${d.building.caption} #${buildingNumber}`;
            }

            // 🛠️ THW (Typ 9)
            else if (typeId === 9) {
                simulatedCounts[9]++;
                buildingNumber = simulatedCounts[9];

                if (!serverPrices[9]) {
                    serverPrices[9] = await getCostsForBuilding(d.building);
                }

                coins = serverPrices[9].coins || 35;
                credits = calcTHWCost(buildingNumber);

                label = `THW-Ortsverband #${buildingNumber}`;
            }

            // andere Gebäude (generische Typen)
            else {
                simulatedCounts[typeId] = simulatedCounts[typeId] || 0;
                simulatedCounts[typeId]++;
                buildingNumber = simulatedCounts[typeId];

                const base = await getCostsForBuilding(d.building);
                credits = (base && typeof base.credits !== 'undefined') ? Number(base.credits) : 0;
                coins = (base && typeof base.coins !== 'undefined') ? Number(base.coins) : 0;
                label = `${d.building.caption} #${buildingNumber}`;
            }

            // Verbandslogik (ob die Kosten als Verbandskosten gelten)
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
            } catch (e) {}

            // Aktualisiere die per-Reihe Labels
            try {
                const cl = document.getElementById(`lss_mb_credits_${row.id}`);
                const col = document.getElementById(`lss_mb_coins_${row.id}`);
                if (cl) cl.textContent = (credits === null || typeof credits === 'undefined') ? '💰 -' : `💰 ${fmt(credits)}`;
                if (col) col.textContent = (coins === null || typeof coins === 'undefined') ? '🪙 -' : `🪙 ${fmt(coins)}`;
            } catch (e) {}
            //console.info(`[LSS-MB][PREVIEW] ${label} → ${((credits === null || typeof credits === 'undefined') ? '-' : fmt(credits))} Credits | ${((coins === null || typeof coins === 'undefined') ? '-' : fmt(coins))} Coins`);
        }

        const fmtTotal = v => Number(v || 0).toLocaleString('de-DE');

        let html = `
        💸 <strong>Kostenvorschau</strong> 💸<br>
        💰Credits: ${fmtTotal(ownCredits)} | 🪙Coins: ${fmtTotal(ownCoins)}
    `;

        if (LSS_MB.state.alliance.canBuildAllianceHospital) {
            html += `<br>🏛️ Verbandscredits: ${fmtTotal(allianceCredits)}`;
        }

        // Warnungen + Button-Handling (inkl. Verbandskasse)
        try {
            const availableCredits = Number(LSS_MB.state.userInfo?.credits_user_current) || 0;
            const availableCoins = Number(LSS_MB.state.userInfo?.coins_user_current) || 0;
            const availableAllianceCredits = Number(LSS_MB.state.alliance?.credits) || 0;

            const exceedsCredits = ownCredits > availableCredits;
            const exceedsCoins = ownCoins > availableCoins;
            const allianceInsufficient = allianceCredits > availableAllianceCredits;

            // --- NEU: Bereitsstellungsraum-Limit prüfen ---
            const allowedOwnBR = LSS_MB.state.isPremium ? 8 : 4;
            const allowedAllianceBR = 4; // Verbandslimit

            const existingOwnBR = Number(LSS_MB.state.userBuildings?.[14] || 0);
            const existingAllianceBR = await getCachedAllianceBSRCount();

            const plannedBRCounts = countPlannedBereitsstellungsraeume();
            const plannedOwnBR = Number(plannedBRCounts.own || 0);
            const plannedAllianceBR = Number(plannedBRCounts.alliance || 0);

            const totalOwnBR = existingOwnBR + plannedOwnBR;
            const totalAllianceBR = existingAllianceBR + plannedAllianceBR;

            const ownBRExceeded = totalOwnBR > allowedOwnBR;
            const allianceBRExceeded = totalAllianceBR > allowedAllianceBR;

            // Eigene-Ressourcen-Warnung (nur wenn beides nicht reicht)
            if (exceedsCredits && exceedsCoins) {
                html += `
                <br>
                <div id="lss_mb_insufficient_warning" style="margin-top:6px;padding:6px;border-radius:4px;background:#fff5f5;color:#a40000;border:1px solid #FF000;">
                <strong>Hinweiß:</strong> Die benötigten <strong>${fmtTotal(ownCredits)} Credits</strong> oder die benötigten <strong>${fmtTotal(ownCoins)} Coins</strong> überschreiten beide deine verfügbaren Mittel.
                </div>`;
            } else {
                const prev = document.getElementById('lss_mb_insufficient_warning');
                if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
            }

            // Verbandskassen-Warnung
            if (allianceInsufficient) {
                html += `
                <br><div id="lss_mb_alliance_warning" style="margin-top:6px;padding:6px;border-radius:4px;background:#fff7e6;color:#7a4b00;border:1px solid #f0d9b5;">
                <strong>Hinweiß (Verband):</strong> Die benötigten <strong>${fmtTotal(allianceCredits)} Verbandscredits</strong> reichen nicht aus, um die als Verband geplanten Gebäude zu kaufen.
                </div>`;
            } else {
                const prevA = document.getElementById('lss_mb_alliance_warning');
                if (prevA && prevA.parentNode) prevA.parentNode.removeChild(prevA);
            }

            // Bereitsstellungsraum-Warnung
            if (ownBRExceeded) {
                html += `
                <br><div id="lss_mb_br_warning" style="margin-top:6px;padding:6px;border-radius:4px;background:#fff5f5;color:#a40000;border:1px solid #ffdddd;">
                <strong>Hinweis:</strong> Es sind maximal ${allowedOwnBR} eigene Bereitsstellungsräume erlaubt. Derzeit vorhanden: ${existingOwnBR}, aktuell geplant: ${plannedOwnBR})
                </div>`;
            } else {
                const prevB = document.getElementById('lss_mb_br_warning');
                if (prevB && prevB.parentNode) prevB.parentNode.removeChild(prevB);
            }

            if (allianceBRExceeded) {
                html += `
                <br><div id="lss_mb_br_alliance_warning" style="margin-top:6px;padding:6px;border-radius:4px;background:#fff7e6;color:#7a4b00;border:1px solid #f0d9b5;">
                <strong>Hinweis (Verband):</strong> Es sind maximal ${allowedAllianceBR} Verbands-Bereitsstellungsräume erlaubt. Derzeit vorhanden: ${existingAllianceBR},  aktuell geplant: ${plannedAllianceBR})
                </div>`;
            } else {
                const prevBA = document.getElementById('lss_mb_br_alliance_warning');
                if (prevBA && prevBA.parentNode) prevBA.parentNode.removeChild(prevBA);
            }

            // Buttons aktualisieren
            const buildBtn = document.getElementById('lss_mb_build_all_btn');
            const coinsBtn = document.getElementById('lss_mb_build_all_coins_btn');
            const addBtn = document.getElementById('lss_mb_add_row_btn');
            const btn5 = document.getElementById('lss_mb_add_5_rows_btn');
            const btn10 = document.getElementById('lss_mb_add_10_rows_btn');
            const hasRows = Array.isArray(LSS_MB.state.buildRows) && LSS_MB.state.buildRows.length > 0;

            const shouldDisableForOwn = (exceedsCredits && exceedsCoins);
            const shouldDisableForAlliance = allianceInsufficient;

            // getrennte BR-Gründe
            const shouldDisableForOwnBR = ownBRExceeded;
            const shouldDisableForAllianceBR = allianceBRExceeded;
            const shouldDisableForBR = shouldDisableForOwnBR || shouldDisableForAllianceBR;

            // Gesamtlösung: Buttons deaktivieren wenn irgendein Grund vorliegt
            const shouldDisable = !hasRows || shouldDisableForOwn || shouldDisableForAlliance || shouldDisableForBR;

            // Kaufbutton (Credits)
            if (buildBtn) {
                const shouldDisableCredits =
                      !hasRows || exceedsCredits || shouldDisableForAlliance || shouldDisableForBR;

                buildBtn.disabled = shouldDisableCredits;
                buildBtn.style.opacity = shouldDisableCredits ? '0.5' : '1';
                buildBtn.style.cursor = shouldDisableCredits ? 'not-allowed' : 'pointer';

                if (!hasRows) {
                    buildBtn.title = 'Keine Reihen vorhanden.';
                } else if (exceedsCredits) {
                    buildBtn.title =
                        `Deine Credits (${fmtTotal(availableCredits)}) ` +
                        `reichen nicht für die gewählten Gebäude.`;
                } else if (shouldDisableForAlliance) {
                    buildBtn.title =
                        `Verbandscredits (${fmtTotal(availableAllianceCredits)}) ` +
                        `reichen nicht für die geplanten Verbandsgebäude.`;
                } else if (shouldDisableForOwnBR) {
                    buildBtn.title =
                        `Max. ${allowedOwnBR} eigene Bereitsstellungsräume erlaubt ` +
                        `(vorhanden: ${existingOwnBR}, geplant: ${plannedOwnBR}).`;
                } else if (shouldDisableForAllianceBR) {
                    buildBtn.title =
                        `Max. ${allowedAllianceBR} Verbands-Bereitsstellungsräume erlaubt ` +
                        `(vorhanden: ${existingAllianceBR}, geplant: ${plannedAllianceBR}).`;
                } else {
                    buildBtn.title = 'Wachen/Gebäude bauen (Credits)';
                }
            }

            // Kaufbutton (Coins)
            if (coinsBtn) {
                const shouldDisableCoins =
                      !hasRows || exceedsCoins || shouldDisableForAlliance || shouldDisableForBR;

                coinsBtn.disabled = shouldDisableCoins;
                coinsBtn.style.opacity = shouldDisableCoins ? '0.5' : '1';
                coinsBtn.style.cursor = shouldDisableCoins ? 'not-allowed' : 'pointer';

                if (!hasRows) {
                    coinsBtn.title = 'Deaktiviert: Keine Reihen vorhanden.';
                } else if (exceedsCoins) {
                    coinsBtn.title =
                        `Deine Coins (${fmtTotal(availableCoins)}) ` +
                        `reichen nicht für die gewählten Gebäude.`;
                } else if (shouldDisableForAlliance) {
                    coinsBtn.title =
                        `Verbandscredits (${fmtTotal(availableAllianceCredits)}) ` +
                        `reichen nicht für die geplanten Verbandsgebäude.`;
                } else if (shouldDisableForOwnBR) {
                    coinsBtn.title =
                        `Max. ${allowedOwnBR} eigene Bereitsstellungsräume erlaubt ` +
                        `(vorhanden: ${existingOwnBR}, geplant: ${plannedOwnBR}).`;
                } else if (shouldDisableForAllianceBR) {
                    coinsBtn.title =
                        `Max. ${allowedAllianceBR} Verbands-Bereitsstellungsräume erlaubt ` +
                        `(vorhanden: ${existingAllianceBR}, geplant: ${plannedAllianceBR}).`;
                } else {
                    coinsBtn.title = 'Wachen/Gebäude bauen (Coins)';
                }
            }

            // Button zum hinzufügen von Reihen
            if (addBtn) {
                const shouldDisableAdd =
                      shouldDisableForOwn || shouldDisableForAlliance || shouldDisableForBR;

                addBtn.disabled = shouldDisableAdd;
                addBtn.style.opacity = shouldDisableAdd ? '0.5' : '1';
                addBtn.style.cursor = shouldDisableAdd ? 'not-allowed' : 'pointer';

                if (shouldDisableForOwn) {
                    addBtn.title =
                        `Deaktiviert: Deine eigenen Credits (${fmtTotal(availableCredits)}) ` +
                        `und Coins (${fmtTotal(availableCoins)}) reichen beide nicht für die gewählten Gebäude.`;
                } else if (shouldDisableForAlliance) {
                    addBtn.title =
                        `Deaktiviert: Verbandscredits (${fmtTotal(availableAllianceCredits)}) ` +
                        `reichen nicht für die geplanten Verbandsgebäude.`;
                } else if (shouldDisableForOwnBR) {
                    addBtn.title =
                        `Deaktiviert: Max. ${allowedOwnBR} eigene Bereitsstellungsräume erlaubt ` +
                        `(vorhanden: ${existingOwnBR}, geplant: ${plannedOwnBR}).`;
                } else if (shouldDisableForAllianceBR) {
                    addBtn.title =
                        `Deaktiviert: Max. ${allowedAllianceBR} Verbands-Bereitsstellungsräume erlaubt ` +
                        `(vorhanden: ${existingAllianceBR}, geplant: ${plannedAllianceBR}).`;
                } else {
                    addBtn.title = 'Weitere Wache/Gebäude hinzufügen';
                }
            }

            // +5 Button
            if (btn5) {
                const shouldDisable5 =
                      shouldDisableForOwn || shouldDisableForAlliance || shouldDisableForBR;

                btn5.disabled = shouldDisable5;
                btn5.style.opacity = shouldDisable5 ? '0.5' : '1';
                btn5.style.cursor = shouldDisable5 ? 'not-allowed' : 'pointer';

                if (shouldDisableForOwn) {
                    btn5.title =
                        `Deaktiviert: Deine eigenen Credits (${fmtTotal(availableCredits)}) ` +
                        `und Coins (${fmtTotal(availableCoins)}) reichen beide nicht für die gewählten Gebäude.`;
                } else if (shouldDisableForAlliance) {
                    btn5.title =
                        `Deaktiviert: Verbandscredits (${fmtTotal(availableAllianceCredits)}) ` +
                        `reichen nicht für die geplanten Verbandsgebäude.`;
                } else if (shouldDisableForOwnBR) {
                    btn5.title =
                        `Deaktiviert: Max. ${allowedOwnBR} eigene Bereitsstellungsräume erlaubt ` +
                        `(vorhanden: ${existingOwnBR}, geplant: ${plannedOwnBR}).`;
                } else if (shouldDisableForAllianceBR) {
                    btn5.title =
                        `Deaktiviert: Max. ${allowedAllianceBR} Verbands-Bereitsstellungsräume erlaubt ` +
                        `(vorhanden: ${existingAllianceBR}, geplant: ${plannedAllianceBR}).`;
                } else {
                    btn5.title = '+5 Reihen hinzufügen';
                }
            }

            // +10 Button
            if (btn10) {
                const shouldDisable10 =
                      shouldDisableForOwn || shouldDisableForAlliance || shouldDisableForBR;

                btn10.disabled = shouldDisable10;
                btn10.style.opacity = shouldDisable10 ? '0.5' : '1';
                btn10.style.cursor = shouldDisable10 ? 'not-allowed' : 'pointer';

                if (shouldDisableForOwn) {
                    btn10.title =
                        `Deaktiviert: Deine eigenen Credits (${fmtTotal(availableCredits)}) ` +
                        `und Coins (${fmtTotal(availableCoins)}) reichen beide nicht für die gewählten Gebäude.`;
                } else if (shouldDisableForAlliance) {
                    btn10.title =
                        `Deaktiviert: Verbandscredits (${fmtTotal(availableAllianceCredits)}) ` +
                        `reichen nicht für die geplanten Verbandsgebäude.`;
                } else if (shouldDisableForOwnBR) {
                    btn10.title =
                        `Deaktiviert: Max. ${allowedOwnBR} eigene Bereitsstellungsräume erlaubt ` +
                        `(vorhanden: ${existingOwnBR}, geplant: ${plannedOwnBR}).`;
                } else if (shouldDisableForAllianceBR) {
                    btn10.title =
                        `Deaktiviert: Max. ${allowedAllianceBR} Verbands-Bereitsstellungsräume erlaubt ` +
                        `(vorhanden: ${existingAllianceBR}, geplant: ${plannedAllianceBR}).`;
                } else {
                    btn10.title = '+10 Reihen hinzufügen';
                }
            }

        } catch (e) {
            log('Warnungsprüfung / Button-Update konnte nicht durchgeführt werden', e);
        }

        preview.innerHTML = html;
    }

    // Premium-Status erkennen
    function detectPremium() {
        try {
            if (typeof window.user_premium === 'boolean') {
                return window.user_premium;
            }
            const html = document.documentElement?.innerHTML || '';
            const m = html.match(/var\s+user_premium\s*=\s*(true|false)/);
            if (m) {
                return m[1] === 'true';
            }
        } catch (e) {
            console.warn('detectPremium Fehler', e);
        }
        // Default: Nicht-Premium
        return false;
    }

    LSS_MB.init();
})();
