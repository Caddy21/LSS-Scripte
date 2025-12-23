// ==UserScript==
// @name         LSS Massenbau – Prototyp (Gammaversion)
// @namespace    lss.massbuild
// @version      0.9.4
// @description  Bauen bauen bauen
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const DEBUG = true;
    const log = (...args) => DEBUG && console.info('[LSS-MB]', ...args);

    const BUTTON_CLASSES = {
        primary: 'btn btn-primary btn-sm',
        info: 'btn btn-info btn-sm',
        success: 'btn btn-success btn-sm',
        danger: 'btn btn-danger btn-sm',
        warning: 'btn btn-warning btn-sm',
        secondary: 'btn btn-secondary btn-sm'
    };

    const LSS_MB = {
        state: {
            markers: [],
            queue: [],
            map: null,
            userInfo: null,
            buildingsData: null,
            buildRows: [],
            buildRowCounter: 0,
            userBuildings: {},        // counts per building_type
            userBuildingsTotal: 0     // total number of buildings
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

                // 1) Wenn response ein { buildings: [...] } enthält
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
                li.innerHTML = `<a href="#" id="lss_mb_open">🧱 Massenbau (Prototyp)</a>`;

                const firstDivider = profileMenu.querySelector('.divider');
                if (firstDivider) profileMenu.insertBefore(li, firstDivider);
                else profileMenu.appendChild(li);

                document.getElementById('lss_mb_open').addEventListener('click', e => {
                    e.preventDefault();
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
                        width: '90%',
                        maxWidth: '2500px',
                        maxHeight: '90vh',
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
                    header.textContent = '🧱 Massenbau (Prototyp)';
                    header.style.margin = '0';
                    header.style.fontSize = '18px';
                    header.style.fontWeight = '600';

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

                    headerContainer.appendChild(header);
                    headerContainer.appendChild(closeBtn);
                    container.appendChild(headerContainer);

                    const resources = document.createElement('div');
                    resources.id = 'lss_mb_resources';
                    resources.style.marginBottom = '10px';
                    resources.textContent = 'Lade Ressourcen…';
                    container.appendChild(resources);

                    document.body.appendChild(container);
                    log('UI Container erstellt');
                } else {
                    container.style.display = 'flex';
                    log('UI Container wieder sichtbar gemacht');
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
                resDiv.innerHTML = `💰 Credits: ${creditsFormatted} | 🪙 Coins: ${coinsVal}`;
                log('Ressourcen aktualisiert (formatiert):', creditsFormatted, coinsVal);
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

                const select = addField(document.createElement('select'));
                select.innerHTML = `<option disabled selected>Wachentyp wählen</option>`;
                buildings.forEach((b, i) => {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = b.caption;
                    select.appendChild(opt);
                });

                const creditsLabel = addField(document.createElement('div'), '120px');
                creditsLabel.textContent = '💰 -';
                creditsLabel.style.backgroundColor = mode === 'dark' ? '#444' : '#f0f0f0';
                creditsLabel.style.color = textColor;
                creditsLabel.style.textAlign = 'center';
                creditsLabel.style.lineHeight = '26px';

                const coinsLabel = addField(document.createElement('div'), '120px');
                coinsLabel.textContent = '🪙 -';
                coinsLabel.style.backgroundColor = mode === 'dark' ? '#444' : '#f0f0f0';
                coinsLabel.style.color = textColor;
                coinsLabel.style.textAlign = 'center';
                coinsLabel.style.lineHeight = '26px';

                // WICHTIG: select handler wartet jetzt auf async getCostsForBuilding
                select.addEventListener('change', async () => {
                    rowState.data.buildingType = select.value;

                    const idx = parseInt(select.value, 10);
                    const building = buildings[idx];
                    if (!building) {
                        log('select.change: building nicht gefunden für idx', idx);
                        return;
                    }

                    rowState.data.building = building;
                    log('Wachentyp gewählt:', building.caption, 'für Reihe', rowId);

                    // getCostsForBuilding ist async (kann User-Counts nachladen)
                    const costs = await getCostsForBuilding(building);
                    if (costs) {
                        const creditsText = `💰 ${costs.credits.toLocaleString('de-DE')}`;
                        const coinsText = `🪙 ${costs.coins.toLocaleString('de-DE')}`;
                        creditsLabel.textContent = creditsText;
                        coinsLabel.textContent = coinsText;
                        log('Kosten angezeigt für Reihe', rowId, costs);
                    } else {
                        creditsLabel.textContent = '💰 -';
                        coinsLabel.textContent = '🪙 -';
                        log('Keine Kosten ermittelbar für', building.caption);
                    }
                });

                const originalInput = document.getElementById('map_adress_search');
                const originalForm = document.getElementById('map_adress_search_form');
                let addressInput = null;
                if (originalInput && originalForm) {
                    addressInput = originalInput.cloneNode(true);
                    addressInput.className = '';
                    addressInput.placeholder = 'Adresse der Wache';
                    addField(addressInput, '200px');
                    addressInput.addEventListener('keypress', e => {
                        if (e.key === 'Enter') {
                            originalInput.value = addressInput.value;
                            originalForm.dispatchEvent(new Event('submit', { bubbles: true }));
                            e.preventDefault();
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
                    log('Name eingegeben für Reihe', rowId, rowState.data.name);
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
                vehicleSelect.addEventListener('change', () => rowState.data.startVehicle = vehicleSelect.value);

                const vehicleMapping = {
                    "LF 20": 0, "LF 10": 1, "LF 8/6": 6, "LF 20/16": 7,
                    "LF 10/6": 8, "LF 16-TS": 9, "LF-L": 107, "KLF": 88,
                    "MLF": 89, "TSF-W": 37, "HLF 10": 90, "HLF 20": 30
                };

                const userLevel = Number(LSS_MB.state.userInfo?.user_level ?? 0);
                const canUseHLF = userLevel >= 5;

                select.addEventListener('change', () => {
                    vehicleSelect.innerHTML = '';
                    vehicleSelect.style.display = 'none';
                    const idx = parseInt(select.value, 10);
                    const building = buildings[idx];
                    if (!building) return;

                    if (building.caption.toLowerCase().includes('feuerwache') && Array.isArray(building.startVehicles)) {
                        const placeholder = document.createElement('option');
                        placeholder.disabled = true;
                        placeholder.selected = true;
                        placeholder.textContent = 'Startfahrzeug wählen';
                        vehicleSelect.appendChild(placeholder);

                        const added = new Set();
                        building.startVehicles.forEach(v => {
                            if (!vehicleMapping[v] || added.has(v)) return;
                            const opt = document.createElement('option');
                            opt.value = vehicleMapping[v];
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
                        log('Marker Button: setze Marker (Reihe)', rowId);
                        const c = LSS_MB.state.map.getCenter();
                        LSS_MB.mapApi.addMarker(c.lat, c.lng);
                        const marker = LSS_MB.state.markers.at(-1);
                        if (!marker) {
                            alert('Marker konnte nicht gesetzt werden');
                            log('Marker konnte nicht gesetzt werden (keine Referenz)');
                            return;
                        }
                        rowState.marker = marker;
                        marker.__rowId = rowId;
                        const p = marker.getLatLng();
                        rowState.data.lat = p.lat;
                        rowState.data.lng = p.lng;
                        marker.on('dragend', () => {
                            const p = marker.getLatLng();
                            rowState.data.lat = p.lat;
                            rowState.data.lng = p.lng;
                            updateRowStatus(rowState, 'Marker gesetzt');
                            log('Marker dragend für Reihe', rowId, 'pos', p);
                        });
                        log('Marker gesetzt und verknüpft mit Reihe', rowId);
                    } else {
                        LSS_MB.state.map.removeLayer(rowState.marker);
                        rowState.marker = null;
                        markerBtn.textContent = 'Marker setzen';
                        markerBtn.className = BUTTON_CLASSES.primary;
                        log('Marker gelöscht für Reihe', rowId);
                    }
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
                });

                injectGlobalButtons();
            }

        }
    };

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
            greenBtn.className = BUTTON_CLASSES.info;
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

    function highlightField(el, isError) {
        if (!el) return;
        el.style.borderColor = isError ? '#ff4d4f' : '';
    }

    async function buildAll() {
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
            fd.append('building[address]', d.address);
            fd.append('building[leitstelle_building_id]', d.leitstelle || '');
            if (d.startVehicle) {
                const key = d.buildingType === '18'
                ? 'building[start_vehicle_feuerwache_kleinwache]'
                : 'building[start_vehicle_feuerwache]';
                fd.append(key, d.startVehicle);
            }

            log('Sende POST für Reihe', row.id, d);
            try {
                const resp = await fetch('/buildings', { method: 'POST', body: fd, credentials: 'same-origin' });
                log('POST abgeschlossen für Reihe', row.id, 'Status:', resp.status);
            } catch (e) {
                log('Fehler beim POST für Reihe', row.id, e);
            }
            await new Promise(r => setTimeout(r, 700));
        }

        log('buildAll fertig, reload');
        alert(`✅ Fertig: ${rows.length} Gebäude gebaut`);
        location.reload();
    }

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
        if (!d.address) { errors.push('Keine Adresse angegeben'); highlightField(addressInput, true); }
        if (!d.name) { errors.push('Kein Wachenname angegeben'); highlightField(nameInput, true); }
        else if (d.name.length > 40) { errors.push('Wachenname darf maximal 40 Zeichen haben'); highlightField(nameInput, true); }
        if (!d.lat || !d.lng || !rowState.marker) errors.push('Marker nicht gesetzt');

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

        if (errors.length) {
            log('validateRow Fehler für Reihe', rowState.id, errors);
            throw new Error(errors.join(', '));
        }
    }

    // ----- Kostenlogik (Whitelist + Seenot/Berg dynamic) -----
    const STATIC_COSTS = [
        { keywords: ['krankenhaus'], credits: 200000, coins: 25 },
        { keywords: ['polizeihubschrauberstation', 'rettungshubschrauber-station', 'hubschrauberstation (seenotrettung)' ], credits: 1000000, coins: 50 },
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

    // Hilfsfunktion: logarithmus zur Basis b
    function logBase(x, b) {
        return Math.log(x) / Math.log(b);
    }

    // Hilfsfunktion: Regex-escape
    function escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    async function getCostsForBuilding(building) {
        const caption = (building.caption || '').toLowerCase().trim();

        const rawType =
              building.building_type ??
              building.id ??
              building.buildingType ??
              building.type;

        const typeId = Number(rawType);
        log('getCostsForBuilding -> caption:', caption, 'typeId:', typeId);

        // ===== Dynamische Seenot (26) & Bergrettung (25) =====
        if (typeId === 26 || typeId === 25) {

            // User-Gebäude nur laden, wenn nötig
            if (
                !LSS_MB.state.userBuildings ||
                typeof LSS_MB.state.userBuildingsTotal !== 'number'
            ) {
                await fetchUserBuildingsCount();
            }

            const existing =
                  Number(
                      LSS_MB.state.userBuildings?.[typeId] ??
                      LSS_MB.state.userBuildings?.[String(typeId)] ??
                      0
                  ) || 0;

            const base = 100000;
            const coins = 35;

            // Spiel-Logik: (Anzahl + 1) - 9, minimum 1
            const countForCalc = existing + 1;
            const x = Math.max(1, countForCalc - 9);

            // 🔑 SPIELGLEICHE FORMEL (log10!)
            const rawValue =
                  base * (1 + Math.log(x) / Math.log(5));

            const credits = Math.round(rawValue) + 3;

            log(
                `${typeId === 26 ? 'Seenot' : 'Berg'} dynamic`,
                { existing, countForCalc, x, rawValue, credits }
            );

            return { credits, coins };
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
        if (
            typeof building.credits === 'number' ||
            typeof building.coins === 'number'
        ) {
            return {
                credits: building.credits ?? 0,
                coins: building.coins ?? 0
            };
        }

        return null;
    }

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

    function updateRowStatus(rowState, text) {
        log(`Reihe ${rowState.id}: ${text}`);
    }

    LSS_MB.init();

})();
