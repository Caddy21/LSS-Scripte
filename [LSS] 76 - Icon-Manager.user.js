
 // ==UserScript==
 // @name         [LSS] 76 - Icon Manager
 // @namespace    https://leitstellenspiel.de/
 // @version      1.5.3
 // @description  Verwaltung fehlender Gebäudegrafiken nach Wachentyp und Wachengröße mit Reload beim Schließen
 // @author       Caddy21
 // @match        https://www.leitstellenspiel.de/*
 // @match        https://polizei.leitstellenspiel.de/*
 // @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
 // ==/UserScript==

 (function () {
     'use strict';

     const API = '/api/v2/buildings';
     const BUILDING_TYPES_API = 'https://api.lss-manager.de/de_DE/buildings';
     const DB_NAME = 'lss-icon-manager';
     const DB_STORE = 'tabImages';
     const SAVE_DELAY = 100;

     let databasePromise = null;
     let buildings = [];
     let buildingTypeNames = {};
     let selectedTabKey = null;
     let saveCancelled = false;
     let saveRunning = false;
     let saveCurrent = 0;
     let saveTotal = 0;

     // Merkt sich erfolgreiche Gebäudespeicherungen bis zum Schließen.
     let hasSavedChanges = false;
     let managerClosed = false;
     let activeSingleSaves = 0;

     const tabImageCache = new Map();
     const previewUrls = new Set();

     function escapeHtml(value) {
         return String(value ?? '').replace(/[&<>"']/g, character => ({
             '&': '&amp;',
             '<': '&lt;',
             '>': '&gt;',
             '"': '&quot;',
             "'": '&#39;'
         })[character]);
     }

     function makeTabKey(building) {
         const type = String(building.building_type ?? 'unknown');
         const size = Boolean(building.small_building) ? 'small' : 'normal';
         return `${type}__${size}`;
     }

     function getTypeName(building) {
         const type = String(building.building_type ?? 'unknown');
         return buildingTypeNames[type] || `Unbekannter Typ (${type})`;
     }

     function getTabLabel(type, size) {
         const typeName = buildingTypeNames[type] || `Unbekannter Typ (${type})`;
         const hasSmallStationVariant = ['0', '2', '6', '18', '19', '20'].includes(String(type));

         return size === 'small' && hasSmallStationVariant
             ? `${typeName} (Kleinwache)`
             : typeName;
     }

     function getLabelFromKey(key) {
         const [type, size] = String(key).split('__');
         return getTabLabel(type, size);
     }

     // ------------------------------------------------------------
     // Reload-Verwaltung
     // ------------------------------------------------------------

     function reloadAfterCloseIfNeeded() {
         if (
             managerClosed &&
             hasSavedChanges &&
             !saveRunning &&
             activeSingleSaves === 0
         ) {
             // Flag zurücksetzen, damit kein mehrfacher Reload ausgelöst wird.
             hasSavedChanges = false;
             window.location.reload();
         }
     }

     function closeManager() {
         $('#lss-icon-modal').hide();
         managerClosed = true;

         clearPreviewUrls();
         reloadAfterCloseIfNeeded();
     }

     // ------------------------------------------------------------
     // IndexedDB
     // ------------------------------------------------------------

     function openImageDatabase() {
         if (!('indexedDB' in window) || !window.indexedDB) {
             return Promise.reject(new Error(
                 'window.indexedDB ist in diesem Seitenkontext nicht verfügbar.'
             ));
         }

         if (databasePromise) return databasePromise;

         databasePromise = new Promise((resolve, reject) => {
             let request;

             try {
                 request = window.indexedDB.open(DB_NAME, 1);
             } catch (error) {
                 databasePromise = null;
                 reject(error);
                 return;
             }

             request.onupgradeneeded = () => {
                 const db = request.result;

                 if (!db.objectStoreNames.contains(DB_STORE)) {
                     db.createObjectStore(DB_STORE, {
                         keyPath: 'tabKey'
                     });
                 }
             };

             request.onsuccess = () => {
                 const db = request.result;

                 if (!db.objectStoreNames.contains(DB_STORE)) {
                     console.error(
                         '[LSS Icon Manager] Der erwartete IndexedDB-Store fehlt:',
                         DB_STORE,
                         'Vorhandene Stores:',
                         Array.from(db.objectStoreNames)
                     );

                     db.close();
                     databasePromise = null;

                     reject(new Error(
                         `Der IndexedDB-Store "${DB_STORE}" existiert nicht.`
                     ));
                     return;
                 }

                 db.onversionchange = () => {
                     db.close();
                     databasePromise = null;
                 };

                 resolve(db);
             };

             request.onerror = () => {
                 databasePromise = null;

                 reject(
                     request.error ||
                     new Error('IndexedDB konnte nicht geöffnet werden.')
                 );
             };

             request.onblocked = () => {
                 console.warn(
                     '[LSS Icon Manager] Öffnen der IndexedDB wird blockiert. ' +
                     'Möglicherweise ist noch ein alter Datenbankzugriff aktiv.'
                 );
             };
         });

         return databasePromise;
     }

     async function storeTabImage(tabKey, file) {
         if (!tabKey || !file) {
             throw new Error('TAB oder Bilddatei fehlt.');
         }

         if (!(file instanceof Blob)) {
             throw new Error('Die ausgewählte Datei ist keine gültige Blob-Datei.');
         }

         const db = await openImageDatabase();

         return new Promise((resolve, reject) => {
             let transaction;

             try {
                 transaction = db.transaction(DB_STORE, 'readwrite');

                 const store = transaction.objectStore(DB_STORE);

                 const record = {
                     key: String(tabKey),
                     tabKey: String(tabKey),
                     file: file.slice(
                         0,
                         file.size,
                         file.type || 'application/octet-stream'
                     ),
                     name: file.name || 'Gebäudegrafik.png',
                     type: file.type || 'image/png',
                     updatedAt: Date.now()
                 };

                 if (store.keyPath === 'key' || store.keyPath === 'tabKey') {
                     store.put(record);
                 } else {
                     throw new Error(
                         'Nicht unterstützter IndexedDB-Schlüssel: ' +
                         JSON.stringify(store.keyPath)
                     );
                 }
             } catch (error) {
                 reject(error);
                 return;
             }

             transaction.oncomplete = () => {
                 tabImageCache.delete(tabKey);
                 resolve();
             };

             transaction.onerror = () => {
                 reject(
                     transaction.error ||
                     new Error('IndexedDB-Transaktion fehlgeschlagen.')
                 );
             };

             transaction.onabort = () => {
                 reject(
                     transaction.error ||
                     new Error('IndexedDB-Transaktion wurde abgebrochen.')
                 );
             };
         });
     }

     async function getTabImage(tabKey) {
         if (!tabKey) return null;

         if (tabImageCache.has(tabKey)) {
             return tabImageCache.get(tabKey);
         }

         const db = await openImageDatabase();

         const record = await new Promise((resolve, reject) => {
             let transaction;
             let request;

             try {
                 transaction = db.transaction(DB_STORE, 'readonly');
                 request = transaction.objectStore(DB_STORE).get(tabKey);
             } catch (error) {
                 reject(error);
                 return;
             }

             request.onsuccess = () => resolve(request.result || null);
             request.onerror = () => reject(
                 request.error ||
                 new Error('Gespeicherte Grafik konnte nicht geladen werden.')
             );
         });

         const file = record ? recordToFile(record) : null;
         tabImageCache.set(tabKey, file);

         return file;
     }

     function recordToFile(record) {
         if (!record || !record.file) return null;

         return new File(
             [record.file],
             record.name || 'Gebäudegrafik.png',
             {
                 type: record.type || record.file.type || 'image/png',
                 lastModified: record.updatedAt || Date.now()
             }
         );
     }

     // ------------------------------------------------------------
     // Vorschauen
     // ------------------------------------------------------------

     function createPreviewUrl(file) {
         const url = URL.createObjectURL(file);
         previewUrls.add(url);
         return url;
     }

     function clearPreviewUrls() {
         for (const url of previewUrls) {
             URL.revokeObjectURL(url);
         }

         previewUrls.clear();
     }

     function showPreview(container, file, label = 'Grafik') {
         const element = $(container);
         element.empty();

         if (!file) {
             element.text('Keine globale Grafik ausgewählt');
             return;
         }

         const url = createPreviewUrl(file);

         const image = $('<img>')
             .attr('src', url)
             .attr('alt', `${label} Vorschau`)
             .css({
                 maxWidth: '60px',
                 maxHeight: '50px',
                 verticalAlign: 'middle',
                 marginRight: '6px'
             });

         const name = $('<span>').text(file.name || 'Gebäudegrafik');

         element.append(image, name);
     }

     function showRowPreview(row, file) {
         const preview = row.find('.lss-preview');
         preview.empty();

         if (!file) {
             preview.text('-');
             return;
         }

         const image = $('<img>')
             .attr('src', createPreviewUrl(file))
             .attr('alt', 'Grafikvorschau')
             .css({
                 maxWidth: '60px',
                 maxHeight: '50px'
             });

         preview.append(image);
     }

     function updateVisibleBuildingPreviews(tabKey, file) {
         $(`#lss-icon-table-${CSS.escape(tabKey)} tbody tr`).each(function () {
             const row = $(this);
             const input = row.find('.lss-building-image')[0];

             if (input?.files?.length) return;

             showRowPreview(row, file);
         });
     }

     async function loadGlobalImageForTab(tabKey) {
         const pane = $(`#lss-pane-${CSS.escape(tabKey)}`);
         const preview = pane.find('.lss-global-preview');

         pane.find('.lss-global-image').val('');
         preview.text('Lade gespeicherte Grafik …');

         try {
             const file = await getTabImage(tabKey);

             if (selectedTabKey !== tabKey) return;

             showPreview(preview, file);
             updateVisibleBuildingPreviews(tabKey, file);
         } catch (error) {
             console.error(
                 `[LSS Icon Manager] Grafik für TAB "${getLabelFromKey(tabKey)}" konnte nicht geladen werden:`,
                 error
             );

             preview.text('Fehler beim Laden der Grafik. Details in der Browserkonsole.');
         }
     }

     // ------------------------------------------------------------
     // Menü und Modal
     // ------------------------------------------------------------

     function createButton() {
         const interval = setInterval(() => {
             const menu = document.querySelector('#menu_profile + .dropdown-menu');

             if (!menu) return;

             if (menu.querySelector('#open-icon-manager')) {
                 clearInterval(interval);
                 return;
             }

             const li = document.createElement('li');
             li.setAttribute('role', 'presentation');

             const link = document.createElement('a');
             link.href = '#';
             link.id = 'open-icon-manager';
             link.innerHTML = `
                 <span class="glyphicon glyphicon-picture"></span>&nbsp;&nbsp;
                 Gebäudegrafiken
             `;

             link.addEventListener('click', event => {
                 event.preventDefault();
                 openManager();
             });

             li.appendChild(link);

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
         $('body').append(`
             <div id="lss-icon-modal" style="
                 position:fixed;
                 inset:0;
                 background:rgba(0,0,0,.45);
                 display:none;
                 justify-content:center;
                 align-items:center;
                 z-index:999999;
                 padding:20px;
             ">
                 <div class="panel panel-default" style="
                     width:1200px;
                     max-width:100%;
                     max-height:100%;
                     overflow:auto;
                     margin:0;
                 ">
                     <div class="panel-heading">
                         <b>Gebäudegrafiken verwalten</b>
                         <span id="lss-icon-close" style="
                             float:right;
                             cursor:pointer;
                             font-size:20px;
                             line-height:20px;
                         ">&times;</span>
                     </div>

                     <div class="panel-body">
                         <p id="lss-counter">Noch keine Gebäude geladen.</p>

                         <ul class="nav nav-tabs"
                             id="lss-icon-tabs"
                             style="margin-bottom:0;flex-wrap:wrap;">
                         </ul>

                         <div id="lss-icon-tab-content" style="padding-top:15px;">
                         </div>
                     </div>
                 </div>
             </div>
         `);

         // Schließen über das X:
         $('#lss-icon-close').on('click', () => {
             closeManager();
         });

         // Schließen durch Klick auf den abgedunkelten Hintergrund:
         $('#lss-icon-modal').on('click', function (event) {
             if (event.target === this) {
                 closeManager();
             }
         });

         $(document).on('click', '#lss-icon-tabs a', function (event) {
             event.preventDefault();
             filterBuildings($(this).attr('data-filter'));
         });

         $(document).on('change', '.lss-building-image', function () {
             const file = this.files?.[0];
             if (!file) return;

             showRowPreview($(this).closest('tr'), file);
         });

         $(document).on('change', '.lss-global-image', async function () {
             const file = this.files?.[0] || null;
             const tabKey = String($(this).attr('data-tab-key') || '');

             if (!file || !tabKey) return;

             if (!file.type.startsWith('image/')) {
                 alert('Bitte wähle eine gültige Bilddatei aus.');
                 $(this).val('');
                 return;
             }

             const input = this;
             const pane = $(`#lss-pane-${CSS.escape(tabKey)}`);
             const preview = pane.find('.lss-global-preview');

             preview.text('Speichere Grafik lokal …');
             $(input).prop('disabled', true);

             try {
                 await storeTabImage(tabKey, file);

                 const savedFile = await getTabImage(tabKey);

                 showPreview(preview, savedFile);
                 updateVisibleBuildingPreviews(tabKey, savedFile);
             } catch (error) {
                 console.error(
                     `[LSS Icon Manager] Fehler beim lokalen Speichern für TAB "${getLabelFromKey(tabKey)}":`,
                     error
                 );

                 preview.text('Speichern fehlgeschlagen.');

                 alert(
                     'Die Grafik konnte nicht lokal gespeichert werden.\n\n' +
                     `Fehler: ${error?.name || 'Unbekannter Fehler'}\n` +
                     `Details: ${error?.message || error}\n\n` +
                     'Weitere Informationen findest du in der Browserkonsole (F12).'
                 );
             } finally {
                 $(input).prop('disabled', false);
             }
         });

         // Einzelnes Gebäude speichern:
         // Kein sofortiger Reload. Änderungen werden beim Schließen übernommen.
         $(document).on('click', '.lss-save', async function () {
             if (saveRunning) return;

             const button = $(this);
             const row = button.closest('tr');

             button.prop('disabled', true).text('Speichere …');
             activeSingleSaves++;

             try {
                 const saved = await saveBuilding(row);

                 if (saved) {
                     hasSavedChanges = true;

                     $('#lss-counter').text(
                         'Speichern erfolgreich. Die Seite wird beim Schließen aktualisiert.'
                     );
                 }
             } finally {
                 activeSingleSaves--;
                 button.prop('disabled', false).text('Speichern');

                 // Falls der Manager während des Speicherns geschlossen wurde:
                 reloadAfterCloseIfNeeded();
             }
         });

         // Alle Gebäude speichern:
         // Sequenziell, mit unveränderter Pause von 100 ms.
         // Kein Reload während des Durchlaufs.
         $(document).on('click', '.lss-save-all', async function () {
             if (saveRunning) return;

             const tabKey = String($(this).attr('data-tab-key') || '');
             if (!tabKey) return;

             const rows = $(`#lss-icon-table-${CSS.escape(tabKey)} tbody tr`).toArray();

             if (!rows.length) {
                 alert('In diesem TAB gibt es keine Gebäude zum Speichern.');
                 return;
             }

             let tabImage;

             try {
                 tabImage = await getTabImage(tabKey);
             } catch (error) {
                 console.error(
                     '[LSS Icon Manager] Globale Grafik konnte nicht geladen werden:',
                     error
                 );

                 alert('Die globale Grafik konnte nicht geladen werden. Bitte prüfe die Browserkonsole.');
                 return;
             }

             const hasIndividualImage = rows.some(row => {
                 return $(row).find('.lss-building-image')[0]?.files?.length > 0;
             });

             if (!tabImage && !hasIndividualImage) {
                 alert(
                     'Bitte wähle zuerst eine globale Grafik für diesen TAB ' +
                     'oder eine Grafik direkt bei einem Gebäude aus.'
                 );
                 return;
             }

             saveCancelled = false;
             saveRunning = true;
             saveCurrent = 0;
             saveTotal = rows.length;

             const pane = $(`#lss-pane-${CSS.escape(tabKey)}`);
             pane.find('.lss-save-all').prop('disabled', true);
             pane.find('.lss-cancel-all').prop('disabled', false);

             try {
                 for (const row of rows) {
                     if (saveCancelled) break;

                     const saved = await saveBuilding($(row));

                     if (saved) {
                         hasSavedChanges = true;
                     }

                     // Diese Pause ist vom Betreiber vorgegeben und bleibt erhalten.
                     await new Promise(resolve => setTimeout(resolve, SAVE_DELAY));
                 }
             } finally {
                 saveRunning = false;
                 pane.find('.lss-save-all').prop('disabled', false);
                 pane.find('.lss-cancel-all').prop('disabled', true);

                 if (saveCancelled) {
                     $('#lss-counter').text(
                         `Abgebrochen: ${saveCurrent} von ${saveTotal} Gebäuden bearbeitet.`
                     );
                 } else {
                     $('#lss-counter').text(
                         `Vorgang abgeschlossen: ${saveCurrent} von ${saveTotal} Gebäuden bearbeitet.`
                     );
                 }

                 // Wurde der Manager während des Durchlaufs geschlossen,
                 // erfolgt der Reload erst jetzt, nachdem alle laufenden
                 // Speichervorgänge beendet sind.
                 reloadAfterCloseIfNeeded();
             }
         });

         $(document).on('click', '.lss-cancel-all', function () {
             saveCancelled = true;
             $('#lss-counter').text('Abbruch angefordert …');
         });
     }

     // ------------------------------------------------------------
     // Gebäudetypen
     // ------------------------------------------------------------

     async function loadBuildingTypeNames() {
         const fallback = {
             0: 'Feuerwache',
             1: 'Feuerwehrschule',
             2: 'Rettungswache',
             3: 'Rettungsschule',
             4: 'Krankenhaus',
             5: 'Rettungshubschrauber-Station',
             6: 'Polizeiwache',
             7: 'Leitstelle',
             8: 'Polizeischule',
             9: 'THW-Ortsverband',
             10: 'THW-Bundesschule',
             11: 'Bereitschaftspolizei',
             12: 'Schnelleinsatzgruppe (SEG)',
             13: 'Polizeihubschrauberstation',
             14: 'Bereitstellungsraum',
             15: 'Wasserrettung',
             16: 'Verbandszellen',
             17: 'Polizei-Sondereinheiten',
             18: 'Feuerwache',
             19: 'Polizeiwache',
             20: 'Rettungswache',
             21: 'Rettungshundestaffel',
             22: 'Großer Komplex',
             23: 'Kleiner Komplex',
             24: 'Reiterstaffel',
             25: 'Bergrettungswache',
             26: 'Seenotrettungswache',
             27: 'Schule für Seefahrt und Seenotrettung',
             28: 'Hubschrauberstation (Seenotrettung)',
             29: 'Autobahnpolizei'
         };

         buildingTypeNames = { ...fallback };

         try {
             const response = await fetch(BUILDING_TYPES_API, {
                 headers: { Accept: 'application/json' }
             });

             if (!response.ok) return;

             const data = await response.json();

             if (Array.isArray(data)) {
                 for (const item of data) {
                     if (!item) continue;

                     const id = item.id ?? item.building_type ?? item.type;
                     const name = item.caption ?? item.name;

                     if (id !== undefined && name) {
                         buildingTypeNames[String(id)] = name;
                     }
                 }
             } else if (data && typeof data === 'object') {
                 for (const [id, item] of Object.entries(data)) {
                     if (typeof item === 'string') {
                         buildingTypeNames[String(id)] = item;
                     } else if (item && typeof item === 'object') {
                         const name = item.caption ?? item.name;

                         if (name) {
                             buildingTypeNames[String(item.id ?? id)] = name;
                         }
                     }
                 }
             }
         } catch (error) {
             console.warn(
                 '[LSS Icon Manager] Typnamen konnten nicht extern geladen werden; Fallback wird verwendet.',
                 error
             );
         }
     }

     // ------------------------------------------------------------
     // Tabs und Gebäudeliste
     // ------------------------------------------------------------

     function createTabContent(tabKey, group) {
         const label = group.label;

         const buildingsInTab = buildings.filter(
             building => makeTabKey(building) === tabKey
         );

         const paneId = `lss-pane-${tabKey}`;
         const tableId = `lss-icon-table-${tabKey}`;

         const pane = $(`
             <div class="lss-icon-pane"
                  id="${escapeHtml(paneId)}"
                  style="display:none;">

                 <div class="well well-sm" style="margin-bottom:15px;">
                     <div style="margin-bottom:8px;">
                         <strong>Globale Grafik für alle Wachen in diesem TAB:</strong>
                         <span class="text-muted">${escapeHtml(label)}</span>
                     </div>

                     <p class="help-block" style="margin-bottom:8px;">
                         Diese Grafik gilt nur für diesen TAB.
                         Eine individuell ausgewählte Grafik an einer Wache hat Vorrang.
                     </p>

                     <div class="form-inline">
                         <input type="file"
                                class="form-control lss-global-image"
                                data-tab-key="${escapeHtml(tabKey)}"
                                accept="image/png,image/jpeg,image/webp,image/gif">

                         <span class="lss-global-preview" style="margin:0 10px;">
                             Lade gespeicherte Grafik …
                         </span>
                     </div>
                 </div>

                 <div class="form-inline" style="margin-bottom:15px;">
                     <button class="btn btn-primary btn-xs lss-save-all"
                             data-tab-key="${escapeHtml(tabKey)}"
                             title="Speichert nur die Wachen in diesem TAB.">
                         Alle speichern
                     </button>

                     <button class="btn btn-danger btn-xs lss-cancel-all"
                             disabled>
                         Abbrechen
                     </button>
                 </div>

                 <div class="table-responsive">
                     <table id="${escapeHtml(tableId)}"
                            class="table table-striped table-bordered">
                         <thead>
                             <tr>
                                 <th>Gebäudename</th>
                                 <th>Wachentyp</th>
                                 <th>Bilddatei wählen</th>
                                 <th>Vorschau</th>
                                 <th>Status</th>
                                 <th>Aktion</th>
                             </tr>
                         </thead>
                         <tbody></tbody>
                     </table>
                 </div>
             </div>
         `);

         const tbody = pane.find('tbody');

         for (const building of buildingsInTab) {
             const smallBuilding = Boolean(building.small_building);
             const type = String(building.building_type ?? 'unknown');
             const size = smallBuilding ? 'small' : 'normal';

             tbody.append(`
                 <tr data-id="${escapeHtml(building.id)}"
                     data-building-id="${escapeHtml(building.id)}"
                     data-type="${escapeHtml(type)}"
                     data-small="${smallBuilding}"
                     data-tab-key="${escapeHtml(tabKey)}">
                     <td>${escapeHtml(building.caption || `Gebäude ${building.id}`)}</td>
                     <td>${escapeHtml(getTabLabel(type, size))}</td>
                     <td>
                         <input type="file"
                                class="lss-building-image"
                                accept="image/png,image/jpeg,image/webp,image/gif">
                     </td>
                     <td class="lss-preview">-</td>
                     <td class="lss-status">Bereit</td>
                     <td>
                         <button class="btn btn-success btn-xs lss-save">
                             Speichern
                         </button>
                     </td>
                 </tr>
             `);
         }

         $('#lss-icon-tab-content').append(pane);
     }

     function updateTabs() {
         const groups = new Map();

         for (const building of buildings) {
             const type = String(building.building_type ?? 'unknown');
             const size = Boolean(building.small_building) ? 'small' : 'normal';
             const key = `${type}__${size}`;

             if (!groups.has(key)) {
                 groups.set(key, {
                     type,
                     size,
                     count: 0,
                     label: getTabLabel(type, size)
                 });
             }

             groups.get(key).count++;
         }

         const tabs = [...groups.entries()].sort((a, b) => {
             const nameCompare = a[1].label.localeCompare(b[1].label, 'de');

             if (nameCompare !== 0) return nameCompare;

             return a[1].size.localeCompare(b[1].size);
         });

         const tabList = $('#lss-icon-tabs').empty();
         $('#lss-icon-tab-content').empty();

         for (const [key, group] of tabs) {
             tabList.append(`
                 <li>
                     <a href="#"
                        data-filter="${escapeHtml(key)}"
                        title="${escapeHtml(group.label)}">
                         ${escapeHtml(group.label)}
                         <span class="badge">${group.count}</span>
                     </a>
                 </li>
             `);

             createTabContent(key, group);
         }

         if (tabs.length) {
             filterBuildings(tabs[0][0]);
         } else {
             $('#lss-counter').text('Keine Gebäude ohne eigene Grafik gefunden.');
         }
     }

     function filterBuildings(tabKey) {
         selectedTabKey = String(tabKey);

         $('#lss-icon-tabs li').removeClass('active');

         $('#lss-icon-tabs a').each(function () {
             if ($(this).attr('data-filter') === selectedTabKey) {
                 $(this).parent().addClass('active');
             }
         });

         $('.lss-icon-pane').hide();
         $(`#lss-pane-${CSS.escape(selectedTabKey)}`).show();

         const count = $(`#lss-icon-table-${CSS.escape(selectedTabKey)} tbody tr`).length;

         $('#lss-counter').text(
             `${count} Gebäude: ${getLabelFromKey(selectedTabKey)}`
         );

         loadGlobalImageForTab(selectedTabKey);
     }

     // ------------------------------------------------------------
     // Gebäude speichern
     // ------------------------------------------------------------

     async function saveBuilding(row) {
         const id = row.data('id');
         const input = row.find('.lss-building-image')[0];
         const rowTabKey = String(row.attr('data-tab-key') || '');

         let file = input?.files?.length ? input.files[0] : null;

         if (!file) {
             file = await getTabImage(rowTabKey);
         }

         if (!file) {
             row.find('.lss-status').text('Keine Grafik ausgewählt');
             return false;
         }

         saveCurrent++;

         $('#lss-counter').text(
             `Speichere Gebäude ${saveCurrent} von ${saveTotal || saveCurrent} …`
         );

         row.find('.lss-status').text('Speichere …');

         try {
             // Bewährter Ablauf: Bearbeitungsformular abrufen und übernehmen.
             const response = await fetch(
                 `/buildings/${encodeURIComponent(id)}/edit`,
                 {
                     credentials: 'same-origin'
                 }
             );

             if (!response.ok) {
                 throw new Error(
                     `Formular konnte nicht geladen werden (HTTP ${response.status}).`
                 );
             }

             const html = await response.text();
             const doc = new DOMParser().parseFromString(html, 'text/html');
             const form = doc.querySelector('form');

             if (!form) {
                 throw new Error('Formular nicht gefunden.');
             }

             const formData = new FormData(form);

             formData.set(
                 'building[image]',
                 file,
                 file.name || 'Gebäudegrafik.png'
             );

             const save = await fetch(
                 `/buildings/${encodeURIComponent(id)}`,
                 {
                     method: 'POST',
                     credentials: 'same-origin',
                     body: formData,
                     redirect: 'follow'
                 }
             );

             if (!save.ok) {
                 throw new Error(`Speichern fehlgeschlagen (HTTP ${save.status}).`);
             }

             row.find('.lss-status').text('Gespeichert');
             return true;

         } catch (error) {
             console.error(
                 `[LSS Icon Manager] Fehler bei Gebäude ${id}:`,
                 error
             );

             row.find('.lss-status').text(`Fehler: ${error.message}`);
             return false;
         }
     }

     async function openManager() {
         managerClosed = false;

         if (!saveRunning && activeSingleSaves === 0) {
             hasSavedChanges = false;
         }

         $('#lss-icon-modal').css('display', 'flex');
         $('#lss-counter').text('Lade Gebäudedaten …');
         $('#lss-icon-tabs').empty();
         $('#lss-icon-tab-content').empty();

         clearPreviewUrls();
         selectedTabKey = null;

         try {
             const response = await fetch(API, {
                 credentials: 'same-origin',
                 cache: 'no-store',
                 headers: {
                     Accept: 'application/json'
                 }
             });

             if (!response.ok) {
                 throw new Error(
                     `API-Anfrage fehlgeschlagen (HTTP ${response.status}).`
                 );
             }

             const data = await response.json();

             if (!Array.isArray(data.result)) {
                 throw new Error(
                     'Die API-Antwort enthält keine gültige Gebäudeliste.'
                 );
             }

             await loadBuildingTypeNames();

             buildings = data.result
                 .filter(building => !building.custom_icon_url)
                 .sort((a, b) => {
                     const typeCompare = getTypeName(a).localeCompare(
                         getTypeName(b),
                         'de'
                     );

                     if (typeCompare !== 0) return typeCompare;

                     const sizeA = Boolean(a.small_building) ? 1 : 0;
                     const sizeB = Boolean(b.small_building) ? 1 : 0;

                     if (sizeA !== sizeB) return sizeA - sizeB;

                     return String(a.caption ?? '').localeCompare(
                         String(b.caption ?? ''),
                         'de'
                     );
                 });

             updateTabs();

             $('#lss-counter').text(
                 `${buildings.length} Gebäude ohne eigene Grafik gefunden.`
             );
         } catch (error) {
             console.error('[LSS Icon Manager] Fehler beim Laden:', error);
             $('#lss-counter').text(`Fehler: ${error.message}`);
         }
     }

     createButton();
     createModal();
 })();
