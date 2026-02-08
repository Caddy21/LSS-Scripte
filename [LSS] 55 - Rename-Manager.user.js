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

    const DEBUG = true;
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
            a.innerHTML = `<span class="glyphicon glyphicon-pencil"></span>&nbsp;&nbsp; Wachenalias-Manager`;
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
            const res = await fetch('https://www.leitstellenspiel.de/api/buildings', { credentials: 'include' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            log('Wachen vom API geladen:', data.length);
            return data;
        } catch(e){ error('Konnte Wachen nicht laden!', e); alert('Konnte Wachenliste nicht automatisch laden.'); return []; }
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

        let showAliased = false;   // 👈 Standard: ausgeblendet
        let activeType = null;
        const WACHEN_CHUNK = 500; // Anzahl Wachen pro Ladeblock
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
                  <button class="btn btn-success btn-sm" id="lss-save-close-aliases">💾 Speichern & Schließen</button>
                </div>
              </div>
            </div>
            `;
        document.body.appendChild(modal);

        const buttonContainer = modal.querySelector('#lss-type-buttons');
        const contentContainer = modal.querySelector('#lss-type-content');
        const showAliasedCheckbox = modal.querySelector('#lss-show-aliased');

        // ---------- Infobox (Startzustand) ----------
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
            `;

        contentContainer.appendChild(infoBox);

        // Gruppieren
        const grouped = {};
        buildings.forEach(b => {
            if (!grouped[b.building_type]) grouped[b.building_type] = [];
            grouped[b.building_type].push(b);
        });

        // ---------- Render-Funktion ----------
        function renderType(typeId) {
            contentContainer.innerHTML = '';

            const sorted = grouped[typeId]
            .slice()
            .sort((a, b) => (a.caption || '').localeCompare(b.caption || '', 'de'));

            sorted.forEach(b => {
                const name = b.caption || '(ohne Name)';
                const currentAlias = map[b.id];

                // FILTER: Standard = nur ohne Alias
                if (!showAliased && currentAlias && currentAlias.trim() !== name.trim()) {
                    return;
                }

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

        // ---------- Typ-Buttons ----------
        Object.keys(grouped)
            .map(t => parseInt(t, 10))
            .sort((a, b) => a - b)
            .forEach(typeId => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-default btn-sm';
            btn.textContent = buildingTypeNames[typeId] || `Typ ${typeId}`;

            btn.onclick = () => {
                activeType = typeId;
                buttonContainer.querySelectorAll('button').forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-default');
                });
                btn.classList.remove('btn-default');
                btn.classList.add('btn-primary');
                renderType(typeId);
            };

            buttonContainer.appendChild(btn);
        });

        // ---------- Checkbox ----------
        showAliasedCheckbox.onchange = () => {
            showAliased = showAliasedCheckbox.checked;
            if (activeType !== null) renderType(activeType);
        };

        // ---------- Save & Close ----------
        modal.querySelector('#lss-save-close-aliases').onclick = async () => {
            modal.querySelectorAll('.lss-alias-input').forEach(inp => {
                const val = inp.value.trim();
                if (val) map[inp.dataset.id] = val;
                else delete map[inp.dataset.id];
            });

            await saveAliasMap(map);
            modal.remove();
        };
    }

    // Fügt die Rename-UI auf der Gebäude-Seite ein
    (function insertRenameUI() {
        const tabs = document.querySelector('#tabs');

        if (!location.pathname.startsWith('/buildings') || !tabs || tabs.closest('.modal, .lightbox')) {
            log('Nicht auf der Haupt-Building-Seite – Script wird hier nicht eingefügt.');
            return;
        }

        log('Building-Seite erkannt – Rename-UI wird eingefügt');

        const box = document.createElement('div');
        box.className = 'panel panel-default';
        box.innerHTML = `
            <div class="panel-heading"><strong>🛠 Fahrzeugnamen-Manager</strong></div>
            <div class="panel-body">
                <div style="margin-bottom:8px;">
                    <b>Wachen-Alias:</b>
                    <span class="label label-primary" id="lss_alias_label">
                        ${stationAlias || '❌ KEIN ALIAS GESETZT'}
                    </span>
                    <span class="help-block" style="display:inline; margin-left:10px;">
                        Schema: <code>{vehicleType}-{number} - {stationAlias}</code>
                    </span>
                </div>

                <button class="btn btn-info" id="lss_preview_btn">Vorschau</button>
                <button class="btn btn-success" id="lss_rename_btn">Umbennen</button>
                <button class="btn btn-danger" id="lss_cancel_preview_btn">Vorschau abbrechen</button>
                <span id="lss_status" style="margin-left:10px;">Status: Bereit</span>

                ${!stationAlias ? `
                    <div class="alert alert-warning" style="margin-top:10px;">
                        ⚠️ Für diese Wache ist kein Alias gesetzt!<br>
                        Öffne den <b>Fahrzeugnamen-Manager</b> und trage einen Alias ein.
                    </div>` : ''}
            </div>
        `;
        tabs.parentNode.insertBefore(box, tabs);

        const previewBtn = document.getElementById('lss_preview_btn');
        if (previewBtn) previewBtn.onclick = () => { log('Vorschau-Button geklickt'); applyPreviewInTableWithInputs(); };

        const renameBtn = document.getElementById('lss_rename_btn');
        if (renameBtn) renameBtn.onclick = async () => {
            log('Globaler Umbennen-Button geklickt');
            const statusDiv = document.getElementById('lss_status');
            if (statusDiv) statusDiv.textContent = 'Status: Umbennen läuft...';
            await triggerAllInlineSaves();
        };

        const cancelPreviewBtn = document.getElementById('lss_cancel_preview_btn');
        if (cancelPreviewBtn) cancelPreviewBtn.onclick = () => {
            log('Vorschau abbrechen geklickt');

            // Vorschau rückgängig machen
            revertPreviewInTable();

            const statusDiv = document.getElementById('lss_status');
            if (statusDiv) statusDiv.textContent = 'Status: Bereit';
        };
    })();

    // Prüft, ob ein Fahrzeugname bereits dem gewünschten Schema entspricht
    function isAlreadyCorrectlyNamed(currentName, vehicleType, stationAlias) {
        // Beispiel: HLF-3 - Wache Mitte
        const escapedAlias = stationAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedType = vehicleType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const regex = new RegExp(`^${escapedType}-\\d+\\s+-\\s+${escapedAlias}$`);
        return regex.test(currentName);
    }

    // Erstellt die Vorschau mit Inline-Inputs
    function applyPreviewInTableWithInputs() {
        if (!stationAlias) { alert('Kein Wachen-Alias gesetzt!'); return; }

        const rows = document.querySelectorAll('tbody tr');
        const typeCounters = {};
        let total = 0;

        rows.forEach(row => {
            const nameLink = row.querySelector('td a[href^="/vehicles/"]');
            if (!nameLink) return;
            if (nameLink.dataset.lssPreviewApplied) return;

            const oldName = nameLink.textContent.trim();
            if (!nameLink.dataset.originalValue) {
                nameLink.dataset.originalValue = oldName;
            }

            let baseType = nameLink.dataset.lssBaseType;
            if (!baseType) {baseType = oldName.replace(/\s*-\s*\d+.*$/, '').trim(); nameLink.dataset.lssBaseType = baseType; }

            const vehicleType = baseType;

            // Zähler pro Fahrzeugtyp
            if (!typeCounters[vehicleType]) {
                typeCounters[vehicleType] = 1;
            } else {
                typeCounters[vehicleType]++;
            }

            const typeNumber = typeCounters[vehicleType];
            const newName = `${vehicleType}-${typeNumber} - ${stationAlias}`;

            // Prüfen, ob Fahrzeug bereits korrekt benannt ist
            if (isAlreadyCorrectlyNamed(oldName, vehicleType, stationAlias)) {
                const infoSpan = document.createElement('span');
                infoSpan.textContent = '✔ Bereits korrekt benannt';
                infoSpan.style.color = '#5cb85c';
                infoSpan.style.fontSize = '13px';
                infoSpan.style.marginLeft = '6px';

                nameLink.parentElement.appendChild(infoSpan);
                return; // KEINE Vorschau + KEIN Save-Button
            }
            const vehicleId = nameLink.getAttribute('href').split('/').pop();

            nameLink.style.display = 'none';
            nameLink.dataset.lssPreviewApplied = 'true';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control lss-inline-preview-input';
            input.value = newName;
            input.dataset.vehicleId = vehicleId;
            input.dataset.originalValue = oldName;   // Backup
            input.classList.add('lss-preview-input'); // Marker für Revert


            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'btn btn-xs btn-success lss-inline-save-btn';
            saveBtn.textContent = '💾';
            saveBtn.style.marginLeft = '6px';

            const statusSpan = document.createElement('span');
            statusSpan.style.marginLeft = '6px';

            saveBtn.onclick = async () => { await saveSingleVehicleName(vehicleId, input.value, nameLink, input, statusSpan); };

            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.appendChild(input);
            container.appendChild(saveBtn);
            container.appendChild(statusSpan);

            nameLink.parentElement.appendChild(container);

            total++;
        });

        const statusDiv = document.getElementById('lss_status');
        if (statusDiv) statusDiv.textContent = `Status: Vorschau angewendet (${total} Fahrzeuge)`;
        log('Inline-Vorschau angewendet:', total);
    }

    // Setzt die Vorschau zurück
    function revertPreviewInTable() {
        document.querySelectorAll('a[data-lss-preview-applied="true"]').forEach(nameLink => {
            const original = nameLink.dataset.originalValue;
            if (!original) return;

            // Container mit Input + Button entfernen
            const container = nameLink.parentElement.querySelector('div');
            if (container) container.remove();

            // Link wieder anzeigen
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
            alert('Keine Fahrzeuge zum Umbennen gefunden!');
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

                // kleine Pause, damit Server & UI hinterherkommen
                await new Promise(r => setTimeout(r, 400));
            } catch (e) {
                error('Fehler beim Triggern eines Save-Buttons', e);
            }
        }

        if (statusDiv) {
            statusDiv.textContent = `Status: Fertig! ${done} von ${total} Fahrzeugen umbenannt ✅`;
        }
    }

    // Initialisierung des Scriptes
    addMenuButton();
    log('Rename Manager vollständig initialisiert');

})();
