// ==UserScript==
// @name         [LSS] Rename-Manager
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Ermöglicht das Vergeben von Wachen-Aliasen und das schema-basierte Umbenennen von Fahrzeugen inkl. Vorschau, Fortschrittsanzeige und Performance-Optimierung.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(async function () {
    'use strict';

    const DEBUG = false;
    function log(...args) { if (DEBUG) console.log('[LSS-Rename]', ...args); }
    function warn(...args) { if (DEBUG) console.warn('[LSS-Rename]', ...args); }
    function error(...args) { if (DEBUG) console.error('[LSS-Rename]', ...args); }

    const buildingId = location.pathname.split('/').pop();
    const DB_NAME = 'Wachenalias_DB';
    const STORE_NAME = 'aliases';
    const aliasMap = await loadAliasMap();
    const stationAlias = aliasMap[buildingId];

    // Funktionen zur Speicherung in der DB
    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
            req.onsuccess = e => resolve(e.target.result);
            req.onerror = e => reject(e.target.error);
        });
    }

    async function loadAliasMap() {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.getAll();
                request.onsuccess = () => {
                    const map = {};
                    request.result.forEach(r => map[r.id] = r.value);
                    resolve(map);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            error('AliasMap konnte nicht geladen werden', e);
            return {};
        }
    }

    async function saveAliasMap(map) {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            // alles neu schreiben
            await Promise.all(Object.entries(map).map(([id, value]) => store.put({ id, value })));
            log('AliasMap gespeichert', Object.keys(map).length, 'Einträge');
        } catch (e) {
            error('AliasMap konnte nicht gespeichert werden', e);
        }
    }

    // Funktion um den Menu-Button hinzu zufügen
    function addMenuButton() {
        const interval = setInterval(() => {
            const menu = document.querySelector('#menu_profile + .dropdown-menu');
            if (!menu) return;
            if (menu.querySelector('#open-alias-manager')) { clearInterval(interval); return; }

            const li = document.createElement('li');
            li.setAttribute('role','presentation');
            const a = document.createElement('a');
            a.href = '#';
            a.id = 'open-alias-manager';
            a.innerHTML = `<span class="glyphicon glyphicon-pencil"></span>&nbsp;&nbsp; Wachenalias-Manager (Beta)`;
            a.onclick = e => { e.preventDefault(); openAliasManager(); };
            li.appendChild(a);

            const divider = menu.querySelector('li.divider');
            if(divider) menu.insertBefore(li, divider); else menu.appendChild(li);
            clearInterval(interval);
        }, 500);
    }

    // Funktion um die Gebäude zu laden
    async function fetchAllBuildings() {
    try {
        const buildings = [];
        let url = '/api/v2/buildings?limit=1000';

        while (url) {
            const res = await fetch(url, { credentials: 'include' });

            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }

            const data = await res.json();

            if (Array.isArray(data.result)) {
                buildings.push(...data.result);
            }

            url = data.paging?.next_page || null;
            log( 'Wachen geladen:', buildings.length, '/', data.paging?.count_total ?? '?');
        }

        log('Wachen vollständig vom API geladen:', buildings.length);
        return buildings;

    } catch (e) {
        error('Konnte Wachen nicht laden!', e);
        alert('Konnte Wachenliste nicht automatisch laden.');
        return [];
    }
}

    // Öffnet den Alias-Manager
    async function openAliasManager() {
        if (document.getElementById('lss-alias-modal')) return;

        const map = await loadAliasMap();
        const buildings = await fetchAllBuildings();
        const darkMode = document.body.classList.contains('dark');

        let buildingTypeNames = {};
        try {
            const res = await fetch('https://api.lss-manager.de/de_DE/buildings');
            const data = await res.json();
            Object.entries(data).forEach(([id, obj]) => {
                buildingTypeNames[id] = obj.caption;
            });
        } catch (e) { console.error(e); }

        let showAliased = false;
        let activeType = null;
        const WACHEN_CHUNK = 500;
        const typeRenderState = {};

        const modal = document.createElement('div');
        modal.id = 'lss-alias-modal';
        modal.innerHTML = `
            <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;">
              <div style="background:${darkMode?'#1e1e1e':'#fff'};color:${darkMode?'#f1f1f1':'#000'};padding:12px;border-radius:6px;width:95%;max-width:1300px;max-height:90%;overflow:auto;">
                <h3 style="margin-top:0;">
                  <span class="glyphicon glyphicon-pencil"></span> Wachenalias-Manager
                </h3>

                <div id="lss-type-buttons" style="margin-bottom:8px; display:flex; flex-wrap:wrap; gap:6px;"></div>

                <div style="margin-bottom:6px;">
                  <label style="font-weight:normal; cursor:pointer;">
                    <input type="checkbox" id="lss-show-aliased" />
                    Auch Wachen mit eigenem Alias anzeigen
                  </label>
                </div>

                <div id="lss-type-content" style="border:1px solid ${darkMode ? '#333' : '#ccc'}; border-radius:4px; padding:8px; min-height:200px;"></div>

                <div style="margin-top:8px; text-align:right;">
                  <button class="btn btn-success btn-sm" id="lss-save-aliases">💾 Speichern</button>
                  <button class="btn btn-default btn-sm" id="lss-close-aliases">❌ Schließen</button>
                </div>
              </div>
            </div>
            `;
        document.body.appendChild(modal);

        const buttonContainer = modal.querySelector('#lss-type-buttons');
        const contentContainer = modal.querySelector('#lss-type-content');
        const showAliasedCheckbox = modal.querySelector('#lss-show-aliased');
        const infoBox = document.createElement('div');
        infoBox.id = 'lss-alias-infobox';
        infoBox.style.padding = '20px';
        infoBox.style.border = '2px dashed ' + (darkMode ? '#444' : '#ccc');
        infoBox.style.borderRadius = '6px';
        infoBox.style.textAlign = 'center';
        infoBox.style.color = darkMode ? '#aaa' : '#666';
        infoBox.style.marginTop = '10px';
        infoBox.style.background = darkMode ? '#1a1a1a' : '#fafafa';

        infoBox.innerHTML = `
            <h4 style="margin-top:0;">
              <span class="glyphicon glyphicon-info-sign"></span>
              Willkommen im Wachenalias-Manager
            </h4>
            <p>
              Wähle oben einen <b>Wachentyp</b>, um die zugehörigen Wachen anzuzeigen.
            </p>
            <p>
              Hier kannst du für jede Wache einen <b>Alias</b> vergeben, der später
              für die Fahrzeugumbenennung verwendet wird.
            </p>
            <p style="font-size:12px;">
              💡 Tipp: Der aktuelle Name ist bereits vorausgefüllt – so kannst du
              schnell kleine Anpassungen vornehmen.
            </p>
            <h5><b>Farblegende der Wachentypen</b></h5>

                <p style="margin:6px 0;">
                   🔴 <b>Rot</b> = Noch keine Wache besitzt einen Alias | 🟡 <b>Gelb</b> = Teilweise Aliase vorhanden | 🟢 <b>Grün</b> = Alle Wachen besitzen einen Alias
                </p>
            `;

        contentContainer.appendChild(infoBox);
        const grouped = {};
        buildings.forEach(b => {
            if (!grouped[b.building_type]) grouped[b.building_type] = [];
            grouped[b.building_type].push(b);
        });

        function renderType(typeId) {

            contentContainer.innerHTML = '';
            const activeHeader = document.createElement('div');
            activeHeader.style.background = darkMode ? '#2c3e50' : '#337ab7';
            activeHeader.style.color = '#fff';
            activeHeader.style.padding = '8px 12px';
            activeHeader.style.borderRadius = '4px';
            activeHeader.style.marginBottom = '10px';
            activeHeader.style.fontWeight = 'bold';
            activeHeader.style.fontSize = '13px';

            activeHeader.innerHTML = `
        <span class="glyphicon glyphicon-folder-open"></span>
        Aktiver Wachentyp:
        ${buildingTypeNames[typeId] || `Typ ${typeId}`}
    `;

            contentContainer.appendChild(activeHeader);

            const sorted = grouped[typeId]
            .slice()
            .sort((a, b) =>
                  (a.caption || '').localeCompare(b.caption || '', 'de')
                 );

            const visibleStations = sorted.filter(b => {
                const name = b.caption || '';
                const currentAlias = map[b.id];

                if (
                    !showAliased &&
                    currentAlias &&
                    currentAlias.trim() !== name.trim()
                ) {
                    return false;
                }

                return true;
            });

            if (visibleStations.length === 0) {

                const infoBox = document.createElement('div');

                infoBox.style.padding = '20px';
                infoBox.style.border = `2px dashed ${darkMode ? '#444' : '#ccc'}`;
                infoBox.style.borderRadius = '6px';
                infoBox.style.textAlign = 'center';
                infoBox.style.color = darkMode ? '#aaa' : '#666';
                infoBox.style.background = darkMode ? '#1a1a1a' : '#fafafa';
                infoBox.style.marginTop = '10px';

                infoBox.innerHTML = `
            <h4 style="margin-top:0;">
                <span class="glyphicon glyphicon-ok-circle"></span>
                Alle Wachen dieses Typs besitzen bereits einen Alias
            </h4>

            <p>
                Für diesen Wachentyp sind aktuell keine offenen Alias-Einträge vorhanden.
            </p>

            <p>
                Aktiviere die Checkbox
                <b>"Auch Wachen mit eigenem Alias anzeigen"</b>,
                um bereits bearbeitete Wachen anzuzeigen.
            </p>

            <p style="font-size:12px; margin-top:12px;">
                💡 Tipp: Aktiviere die Checkbox oben, um alle bereits vergebenen Aliase zu kontrollieren oder anzupassen.
            </p>
        `;

                contentContainer.appendChild(infoBox);
                return;
            }

            visibleStations.forEach(b => {

                const name = b.caption || '(ohne Name)';
                const currentAlias = map[b.id];

                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.gap = '6px';
                row.style.marginBottom = '4px';

                const nameDiv = document.createElement('div');
                nameDiv.textContent = name;
                nameDiv.style.flex = '1';
                nameDiv.style.fontSize = '12px';

                const input = document.createElement('input');
                input.className = 'form-control input-sm lss-alias-input';
                input.dataset.id = b.id;
                input.value = currentAlias || name;
                input.placeholder = 'Alias';
                input.style.flex = '1';
                input.style.height = '26px';
                input.style.padding = '2px 6px';

                if (darkMode) {
                    input.style.background = '#2a2a2a';
                    input.style.color = '#f1f1f1';
                    input.style.border = '1px solid #444';
                }

                row.appendChild(nameDiv);
                row.appendChild(input);

                contentContainer.appendChild(row);
            });
        }

        function updateTypeButtonColors() {
            buttonContainer.querySelectorAll('button[data-type-id]').forEach(btn => {
                const typeId = parseInt(btn.dataset.typeId, 10);
                const stations = grouped[typeId] || [];
                let aliased = 0;
                stations.forEach(b => {
                    const name = (b.caption || '').trim();
                    const alias = (map[b.id] || '').trim();
                    if (alias && alias !== name) {
                        aliased++;
                    }
                });
                btn.classList.remove('btn-success', 'btn-warning', 'btn-danger');
                if (aliased === stations.length && stations.length > 0) {
                    btn.classList.add('btn-success');
                } else if (aliased === 0) {
                    btn.classList.add('btn-danger');
                } else {
                    btn.classList.add('btn-warning');
                }
                btn.textContent = `${buildingTypeNames[typeId] || `Typ ${typeId}`} (${aliased}/${stations.length})`;
            });
        }

        Object.keys(grouped)
            .map(t => parseInt(t, 10))
            .sort((a, b) => a - b)
            .forEach(typeId => {

            const stations = grouped[typeId] || [];

            let aliased = 0;

            stations.forEach(b => {
                const name = (b.caption || '').trim();
                const alias = (map[b.id] || '').trim();

                if (alias && alias !== name) {
                    aliased++;
                }
            });

            const btn = document.createElement('button');
            btn.className = 'btn btn-sm';
            btn.dataset.typeId = typeId;
            if (aliased === stations.length && stations.length > 0) {
                btn.classList.add('btn-success');
            } else if (aliased === 0) {
                btn.classList.add('btn-danger');
            } else {
                btn.classList.add('btn-warning');
            }
            btn.textContent = `${buildingTypeNames[typeId] || `Typ ${typeId}`} (${aliased}/${stations.length})`;
            btn.onclick = () => {
                activeType = typeId;
                buttonContainer.querySelectorAll('button').forEach(b => {
                    b.style.outline = '';
                    b.style.boxShadow = '';
                    b.style.transform = '';
                });
                btn.style.outline = darkMode ? '3px solid #ffffff' : '3px solid #000000';
                btn.style.boxShadow = darkMode ? '0 0 10px rgba(255,255,255,0.5)' : '0 0 10px rgba(0,0,0,0.4)';
                btn.style.transform = 'scale(1.03)';
                renderType(typeId);
            };
            buttonContainer.appendChild(btn);
        });
        showAliasedCheckbox.onchange = () => {
            showAliased = showAliasedCheckbox.checked;
            if (activeType !== null) renderType(activeType);
        };
        modal.querySelector('#lss-save-aliases').onclick = async () => {
            try {
                modal.querySelectorAll('.lss-alias-input').forEach(inp => {
                    const val = inp.value.trim();

                    if (val) {
                        map[inp.dataset.id] = val;
                    } else {
                        delete map[inp.dataset.id];
                    }
                });

                await saveAliasMap(map);
                updateTypeButtonColors();
                if (activeType !== null) {
                    renderType(activeType);
                }

                alert("Aliase wurden erfolgreich gespeichert!");

            } catch (e) {
                console.error(e);
                alert("Fehler beim Speichern!");
            }
        };
        modal.querySelector('#lss-close-aliases').onclick = () => {
            modal.remove();
        };
    }

    // Fügt die Rename-UI auf der Gebäude-Seite ein
    (function insertRenameUI() {

        if (!location.pathname.startsWith('/buildings')) {
            log('Nicht auf einer Gebäudeseite – Script wird hier nicht eingefügt.');
            return;
        }

        if (document.getElementById('lss-rename-manager')) {
            return;
        }

        const hr = document.querySelector('hr');
        const tabs = document.querySelector('#tabs');

        if (!hr && !tabs) {
            log('Kein <hr> und kein #tabs gefunden – Rename-UI wird nicht eingefügt.');
            return;
        }

        log('Gebäudeseite erkannt – Rename-UI wird eingefügt');

        const box = document.createElement('div');
        box.id = 'lss-rename-manager';
        box.className = 'panel panel-default';

        box.innerHTML = `
        <div class="panel-heading">
            <strong>🛠 Fahrzeugnamen-Manager</strong>
        </div>

        <div class="panel-body">

            <div style="margin-bottom:8px;">
                <b>Wachen-Alias:</b>

                <span class="label label-primary" id="lss_alias_label">
                    ${stationAlias || '❌ KEIN ALIAS GESETZT'}
                </span>

                <span class="help-block" style="display:inline; margin-left:10px;">
                    Schema:
                    <code>{vehicleType}-{number} - {stationAlias}</code>
                </span>
            </div>

            <button class="btn btn-info" id="lss_preview_btn">
                Vorschau
            </button>

            <button class="btn btn-success" id="lss_rename_btn">
                Umbenennen
            </button>

            <button class="btn btn-danger" id="lss_cancel_preview_btn">
                Vorschau abbrechen
            </button>

            <span id="lss_status" style="margin-left:10px;">
                Status: Bereit
            </span>

            ${!stationAlias ? `
                <div class="alert alert-warning" style="margin-top:10px;">
                    ⚠️ Für diese Wache ist kein Alias gesetzt!<br>
                    Öffne den <b>Wachenalias-Manager</b> und trage einen Alias ein.
                </div>
            ` : ''}

        </div>
    `;

        if (hr) {
            hr.insertAdjacentElement('afterend', box);
            log('Rename-UI direkt nach <hr> eingefügt');
        }
        else if (tabs) {
            tabs.parentNode.insertBefore(box, tabs);
            log('Rename-UI vor #tabs eingefügt');
        }

        const previewBtn = document.getElementById('lss_preview_btn');

        if (previewBtn) {
            previewBtn.onclick = () => {
                log('Vorschau-Button geklickt');
                applyPreviewInTableWithInputs();
            };
        }

        const renameBtn = document.getElementById('lss_rename_btn');

        if (renameBtn) {
            renameBtn.onclick = async () => {

                log('Umbenennen-Button geklickt');

                const statusDiv = document.getElementById('lss_status');

                if (statusDiv) {
                    statusDiv.textContent = 'Status: Umbenennen läuft...';
                }

                await triggerAllInlineSaves();
            };
        }

        const cancelPreviewBtn = document.getElementById('lss_cancel_preview_btn');

        if (cancelPreviewBtn) {
            cancelPreviewBtn.onclick = () => {

                log('Vorschau abbrechen geklickt');

                revertPreviewInTable();

                const statusDiv = document.getElementById('lss_status');

                if (statusDiv) {
                    statusDiv.textContent = 'Status: Bereit';
                }
            };
        }
    })();

    // Prüft, ob ein Fahrzeugname bereits dem gewünschten Schema entspricht
    function isAlreadyCorrectlyNamed(currentName, vehicleType, stationAlias) {
        const escapedAlias = stationAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedType = vehicleType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${escapedType}-\\d+\\s+-\\s+${escapedAlias}$`);
        return regex.test(currentName);
    }

    function applyPreviewInTableWithInputs() {
        if (!stationAlias) {
            alert('Kein Wachen-Alias gesetzt!');
            return;
        }

        const rows = Array.from(document.querySelectorAll('tbody tr'));
        if (!rows.length) return;

        const existingNumbers = new Map();
        const highestNumber = new Map();
        const nextFreeNumbers = new Map();
        const typeCounters = new Map();

        let total = 0;
        for (const row of rows) {
            const nameLink = row.querySelector('td a[href^="/vehicles/"]');
            if (!nameLink) continue;

            const name = nameLink.textContent.trim();
            const match = name.match(/^(.+?)-(\d+)\s+-\s+(.+)$/);
            if (!match) continue;

            const vehicleType = match[1];
            const number = parseInt(match[2], 10);
            const alias = match[3];

            if (alias !== stationAlias) continue;

            if (!existingNumbers.has(vehicleType)) {
                existingNumbers.set(vehicleType, new Set());
                highestNumber.set(vehicleType, 0);
            }

            existingNumbers.get(vehicleType).add(number);

            if (number > highestNumber.get(vehicleType)) {
                highestNumber.set(vehicleType, number);
            }
        }
        for (const [type, numbersSet] of existingNumbers.entries()) {
            const max = highestNumber.get(type);
            const missing = [];

            for (let i = 1; i <= max; i++) {
                if (!numbersSet.has(i)) {
                    missing.push(i);
                }
            }

            nextFreeNumbers.set(type, missing);
            typeCounters.set(type, max);
        }
        for (const row of rows) {
            const nameLink = row.querySelector('td a[href^="/vehicles/"]');
            if (!nameLink) continue;
            if (nameLink.dataset.lssPreviewApplied === 'true') continue;

            const oldName = nameLink.textContent.trim();

            if (!nameLink.dataset.originalValue) {
                nameLink.dataset.originalValue = oldName;
            }

            let baseType = nameLink.dataset.lssBaseType;
            if (!baseType) {
                baseType = oldName.replace(/\s*-\s*\d+.*$/, '').trim();
                nameLink.dataset.lssBaseType = baseType;
            }

            const vehicleType = baseType;
            if (isAlreadyCorrectlyNamed(oldName, vehicleType, stationAlias)) {

                if (!row.querySelector('.lss-already-ok')) {
                    const infoSpan = document.createElement('span');
                    infoSpan.textContent = ' ✔ Bereits korrekt benannt';
                    infoSpan.className = 'lss-already-ok';
                    infoSpan.style.color = '#5cb85c';
                    infoSpan.style.fontSize = '13px';
                    infoSpan.style.marginLeft = '6px';
                    nameLink.parentElement.appendChild(infoSpan);
                }

                continue;
            }

            let typeNumber;

            if (!nextFreeNumbers.has(vehicleType)) {
                nextFreeNumbers.set(vehicleType, []);
                typeCounters.set(vehicleType, 0);
            }

            const missing = nextFreeNumbers.get(vehicleType);

            if (missing.length > 0) {
                typeNumber = missing.shift();
            } else {
                const currentMax = typeCounters.get(vehicleType) || 0;
                typeNumber = currentMax + 1;
                typeCounters.set(vehicleType, typeNumber);
            }

            const newName = `${vehicleType}-${typeNumber} - ${stationAlias}`;
            const vehicleId = nameLink.getAttribute('href').split('/').pop();

            nameLink.style.display = 'none';
            nameLink.dataset.lssPreviewApplied = 'true';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control lss-inline-preview-input';
            input.value = newName;
            input.dataset.vehicleId = vehicleId;
            input.dataset.originalValue = oldName;

            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'btn btn-xs btn-success lss-inline-save-btn';
            saveBtn.textContent = '💾';
            saveBtn.style.marginLeft = '6px';

            const statusSpan = document.createElement('span');
            statusSpan.style.marginLeft = '6px';

            saveBtn.onclick = async () => {
                await saveSingleVehicleName(vehicleId, input.value, nameLink, input, statusSpan);
            };

            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.appendChild(input);
            container.appendChild(saveBtn);
            container.appendChild(statusSpan);

            nameLink.parentElement.appendChild(container);

            total++;
        }

        const statusDiv = document.getElementById('lss_status');
        if (statusDiv) {
            statusDiv.textContent = `Status: Vorschau angewendet (${total} Fahrzeuge)`;
        }

        log('Inline-Vorschau angewendet:', total);
    }

    // Setzt die Vorschau zurück
    function revertPreviewInTable() {
        document.querySelectorAll('a[data-lss-preview-applied="true"]').forEach(nameLink => {
            const original = nameLink.dataset.originalValue;
            if (!original) return;
            const container = nameLink.parentElement.querySelector('div');
            if (container) container.remove();
            nameLink.style.display = '';
            delete nameLink.dataset.lssPreviewApplied;

            log('Vorschau zurückgesetzt für:', original);
        });

        log('Alle Vorschauen wurden zurückgesetzt');
    }

    // Speichert einen einzelnen Fahrzeugnamen
    async function saveSingleVehicleName(vehicleId, newName, nameLink, input, statusSpan) {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (!csrfToken) { alert('CSRF Token nicht gefunden!'); return; }

        statusSpan.textContent = '⏳';

        const formData = new FormData();
        formData.set('authenticity_token', csrfToken);
        formData.set('_method', 'patch');
        formData.set('vehicle[caption]', newName);

        try {
            const res = await fetch(`/vehicles/${vehicleId}`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
                redirect: 'follow'
            });

            if (res.ok || res.status === 302) {
                nameLink.textContent = newName;
                nameLink.style.display = '';
                nameLink.closest('td')?.setAttribute('sortvalue', newName);
                delete nameLink.dataset.lssPreviewApplied;
                input.parentElement.remove();
                statusSpan.textContent = '✅';
                log('Einzelfahrzeug gespeichert:', vehicleId, newName);
            } else {
                statusSpan.textContent = '❌';
                warn('Fehler beim Speichern:', vehicleId, res.status);
            }
        } catch (e) {
            statusSpan.textContent = '❌';
            error('Exception beim Speichern:', vehicleId, e);
        }
    }

    // Globales Umbenennen mit Fortschritt
    async function triggerAllInlineSaves() {
        const saveButtons = Array.from(document.querySelectorAll('.lss-inline-save-btn'));
        if (!saveButtons.length) {
            return;
        }
        const statusDiv = document.getElementById('lss_status');
        let done = 0;
        const total = saveButtons.length;
        for (const btn of saveButtons) {
            if (!document.body.contains(btn)) continue;

            try {
                done++;
                if (statusDiv) {
                    statusDiv.textContent = `Status: ${done} von ${total} umbenannt…`;
                }

                btn.click();
                await new Promise(r => setTimeout(r, 400));
            } catch (e) {
                error('Fehler beim Triggern eines Save-Buttons', e);
            }
        }
        if (statusDiv) {
            statusDiv.textContent = `Status: Fertig! ${done} von ${total} Fahrzeugen umbenannt ✅`;
        }
    }

    // Hotkeys für Vorschau / Umbenennen / Abbrechen + Kombi mit ALT
    function registerHotkeys() {
        document.addEventListener('keydown', async e => {
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if (e.altKey && !e.shiftKey && !e.ctrlKey && e.code === 'KeyV') {
                e.preventDefault();
                log('Hotkey Alt+V -> Vorschau');
                applyPreviewInTableWithInputs();
            }
            if (e.altKey && !e.shiftKey && !e.ctrlKey && e.code === 'KeyU') {
                e.preventDefault();
                log('Hotkey Alt+U -> Umbenennen');
                await triggerAllInlineSaves();
            }
            if (e.altKey && !e.shiftKey && !e.ctrlKey && e.code === 'KeyC') {
                e.preventDefault();
                log('Hotkey Alt+C -> Vorschau abbrechen');
                revertPreviewInTable();
            }
            if (e.altKey && !e.shiftKey && !e.ctrlKey && e.code === 'Enter') {
                e.preventDefault();
                log('Hotkey Alt+Enter -> Vorschau + Umbenennen');
                await previewAndRenameAll();
            }
        });
    }

    // Kombi-Funktion: Vorschau + direkt Umbenennen
    async function previewAndRenameAll() {
        log('Kombi-Aktion: Vorschau + Umbenennen');
        applyPreviewInTableWithInputs();
        await new Promise(r => setTimeout(r, 300));
        await triggerAllInlineSaves();
    }

    // Initialisierung des Scriptes
    addMenuButton();
    registerHotkeys();
    log('Rename Manager vollständig initialisiert');

})();
