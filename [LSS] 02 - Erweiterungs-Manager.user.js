// ==UserScript==
// @name         [LSS] Erweiterungs-Manager
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Ermöglicht das einfache Verwalten und Bauen von fehlenden Erweiterungen, Lagerräumen, Ausbaustufen und Spezialisierungen für eigene Wachen/Gebäude sowie Verbandsgebäude.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @match        https://polizei.leitstellenspiel.de/
// @match        https://leitstellenspiel.de/
// @grant        GM_xmlhttpRequest
// @connect      api.lss-manager.de
// @connect      leitstellenspiel.de
// @connect      polizei.leitstellenspiel.de
// @grant        GM_getValue
// @grant        GM_setValue
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const styles = `
    :root
{ --background-color: #f2f2f2; --surface-color: #fff; --text-color: #000; --border-color: #ccc; --button-background-color: #007bff; --button-text-color: #fff; --level-button-background: #e0e0e0; --level-button-hover: #ccc; --level-button-text: #000; --warning-color: #fd7e14; --credits-color: #28a745; --coins-color: #dc3545; --cancel-color: #6c757d; --progress-background: #e0e0e0; --progress-fill: #4caf50; --input-background: #fff; --input-text: #000; --shadow-color: rgba(0, 0, 0, .25); --overlay-color: rgba(0, 0, 0, .55); --radius-small: 4px; --radius-medium: 6px; --radius-large: 10px; }
body.dark { --background-color: #333; --surface-color: #3b3b3b; --text-color: #fff; --border-color: #444; --level-button-background: #444; --level-button-hover: #666; --level-button-text: #fff; --progress-background: #444; --input-background: #2f2f2f; --input-text: #fff; --shadow-color: rgba(0, 0, 0, .5); }
#extension-lightbox, #construction-lightbox { position: fixed; inset: 0; display: flex; justify-content: center; background: var(--overlay-color); }
#extension-lightbox { align-items: center; z-index: 10000; }
#construction-lightbox { align-items: flex-start; padding: 8px; z-index: 10001; }
#construction-lightbox, #construction-lightbox * { box-sizing: border-box; }
#extension-lightbox-modal, .construction-modal { display: flex; flex-direction: column; width: 100%; overflow: hidden; background: var(--background-color); color: var(--text-color); border: 1px solid var(--border-color); border-radius: var(--radius-large); box-shadow: 0 8px 30px var(--shadow-color); }
#extension-lightbox-modal { max-width: 1700px; max-height: 90vh; }
#extension-lightbox-header { display: flex; justify-content: space-between; align-items: center; gap: 15px; padding: 10px; border-bottom: 1px solid var(--border-color); }
#extension-lightbox-content { padding: 20px; overflow-y: auto; text-align: center; }
.lss-header-actions { display: flex; gap: 10px; }
#user-balance, #alliance-balance { display: flex; gap: 20px; text-align: left; }
#alliance-info, #open-alliance-buildings { display: none; }
#open-alliance-buildings { background: deeppink; }
#open-extension-toggle-manager { background: #6f42c1; }
#under-construction { background: #17a2b8; }
#extension-lightbox #close-extension-helper { padding: 6px 14px; font-weight: 600; background: #ff4d4d; border-radius: var(--radius-medium); }
#open-extension-settings { margin: 0 5px; font-weight: 600; background: var(--button-background-color); }
#current-credits, #selected-credits { color: var(--credits-color); font-weight: bold; }
#current-coins, #selected-coins { color: var(--coins-color); font-weight: bold; }
#current-alliance-credits, #selected-alliance-credits { color: deeppink; font-weight: bold; }
.lss-title { margin: 0; }
#extension-lightbox-content a { color: var(--button-background-color); text-decoration: none; }
#loading-container { display: none; padding: 20px; text-align: center; }
#loading-text { font-size: 16px; font-weight: bold; }
#loading-progress { margin-top: 6px; font-size: 13px; opacity: .75; }
#extension-lightbox table { width: 100%; margin-top: 10px; border-collapse: collapse; font-size: 16px; }
#extension-lightbox :is(th, td) { padding: 10px; text-align: center; vertical-align: middle; }
#extension-lightbox td { background: var(--background-color); color: var(--text-color); border: 1px solid var(--border-color); }
#extension-lightbox thead { background: var(--background-color); color: var(--text-color); font-weight: bold; border-bottom: 2px solid var(--border-color); }
#extension-lightbox thead th { border-bottom: 2px solid var(--border-color); }
#extension-lightbox .lss-manager-filter-row th { padding: 4px 8px; }
#extension-lightbox .lss-manager-search-row th { padding: 6px 10px; }
#extension-lightbox td.lss-empty { padding: 15px; opacity: .7; }
#extension-lightbox td.is-unavailable, #extension-lightbox tr.limit-reached { opacity: .55; }
#extension-lightbox .lss-filter-select { width: 100%; padding: 2px 6px; font-size: .8em; vertical-align: middle; cursor: pointer; background: var(--input-background); color: var(--input-text); border: 1px solid var(--border-color); }
#extension-lightbox .lss-filter-select.is-auto { width: auto; }
#extension-lightbox .lss-filter-btn { padding: 2px 6px; font-size: .8em; }
#extension-lightbox .lss-filter-btn + .lss-filter-select { margin-left: 6px; }
#extension-lightbox .lss-search { width: 100%; background: var(--input-background); color: var(--input-text); border: 1px solid var(--border-color); }
#extension-lightbox .extension-search { box-sizing: border-box; width: 100%; padding: 8px 10px; margin: 10px 0; background: var(--input-background); color: var(--input-text); border: 1px solid var(--border-color); border-radius: var(--radius-medium); font-size: 14px; outline: none; transition: border-color .2s ease, box-shadow .2s ease; }
#extension-lightbox .extension-search:focus { border-color: var(--button-background-color); box-shadow: 0 0 0 2px rgba(0, 123, 255, .15); }
#extension-lightbox button, .currency-button, .cancel-button { border: none; padding: 6px 10px; cursor: pointer; border-radius: var(--radius-small); font-size: 14px; color: var(--button-text-color); transition: filter .2s ease, transform .1s ease; }
:is(#extension-lightbox button, .currency-button, .cancel-button):hover:not(:disabled) { filter: brightness(.9); }
:is(#extension-lightbox button, .currency-button, .cancel-button):active:not(:disabled) { transform: translateY(1px); }
#extension-lightbox .spoiler-button { background: #198754; }
#extension-lightbox .lager-button { background: #ee9a00; }
#extension-lightbox .level-button { background: #cd661d; }
#extension-lightbox .special-button { background: #408080; }
#extension-lightbox .build-selected-button { background: #0d6efd; }
#extension-lightbox .build-selected-levels-button { background: #6f42c1; }
#extension-lightbox .build-selected-special-button { background: #ee6a50; }
#extension-lightbox .build-all-button { background: var(--coins-color); }
#extension-lightbox :is(.credit-button, .credits-button) { background: var(--credits-color); color: #fff; }
#extension-lightbox .coins-button { background: var(--coins-color); color: #fff; }
#extension-lightbox :is(.build-selected-button, .build-selected-levels-button, .build-selected-special-button, .build-all-button):disabled { background: #777 !important; color: #ddd !important; cursor: not-allowed; filter: none !important; transform: none !important; }
#extension-lightbox :is(.spoiler-button, .lager-button, .level-button, .special-button):disabled { opacity: .5; cursor: not-allowed; }
#extension-lightbox button.btn-danger, #extension-lightbox button.btn-danger:is(:hover, :focus, :active) { background: var(--coins-color) !important; border-color: var(--coins-color) !important; color: #fff !important; box-shadow: none !important; filter: none !important; transition: none !important; }
#extension-lightbox .button-container { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px; }
#extension-lightbox .button-container > button { margin: 0; }
#extension-lightbox .spoiler-content, .lager-wrapper, .level-wrapper, .special-wrapper { display: none; }
.lager-wrapper, .level-wrapper, .special-wrapper { margin-top: 10px; }
.active-button { font-weight: bold; }
#extension-lightbox .level-choice-button { display: inline-block; padding: 3px 7px; margin: 0 2px; font-size: 11px; font-weight: bold; border-radius: 12px; background: var(--level-button-background); color: var(--level-button-text); transition: background-color .2s ease, color .2s ease; }
#extension-lightbox .level-choice-button:hover:not([data-active="true"]) { background: var(--level-button-hover); }
#extension-lightbox .level-choice-button[data-active="true"] { background: var(--credits-color); color: #fff; }
.currency-selection, .progress-container, .extension-custom-alert { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 20px; background: var(--background-color); color: var(--text-color); border: 1px solid var(--border-color); border-radius: var(--radius-large); box-shadow: 0 8px 25px var(--shadow-color); }
.currency-selection { display: flex; flex-direction: column; gap: 10px; min-width: 320px; max-width: 500px; z-index: 10001; text-align: center; }
.currency-selection h4 { margin-top: 0; }
.currency-selection button { margin: 5px; padding: 10px 20px; border-radius: 5px; }
.currency-selection button:disabled { cursor: not-allowed; }
.currency-selection .is-green { color: green; }
.currency-selection .is-red { color: red; }
.currency-selection .is-credits, .is-credits { color: var(--credits-color); }
.currency-selection .is-coins { color: var(--coins-color); }
.currency-button.credits-button { background: var(--credits-color); }
.currency-button.coins-button { background: var(--coins-color); }
.cancel-button { background: var(--cancel-color); }
.extension-custom-alert { width: 300px; z-index: 10002; text-align: center; }
.extension-custom-alert button { margin-top: 10px; padding: 5px 10px; border: none; border-radius: var(--radius-small); cursor: pointer; background: var(--button-background-color); color: var(--button-text-color); }
.progress-container { min-width: 280px; z-index: 10002; text-align: center; }
.progress-container .progress-bar { width: 100%; height: 10px; margin-top: 10px; overflow: hidden; background: var(--progress-background); border-radius: 5px; }
.progress-container .progress-fill { width: 0; height: 100%; background: var(--progress-fill); border-radius: 5px; transition: width .2s ease; }
.progress-container .progress-text { margin: 8px 0 0; }
#extension-toggle-content { display: none; }
#extension-toggle-list { text-align: left; }
#extension-toggle-progress-container { margin: 15px 0; }
#extension-toggle-progress-title { margin-bottom: 8px; font-weight: bold; }
#extension-toggle-progress-bar { min-width: 2em; }
#extension-toggle-progress-container .progress { margin-bottom: 8px; }
#extension-toggle-list .extension-toggle-spoiler { margin: 0 0 12px; overflow: hidden; border: 1px solid var(--border-color); border-radius: var(--radius-medium); }
#extension-toggle-list .extension-toggle-spoiler > summary { display: block; padding: 12px 15px; background: var(--surface-color); font-size: 14px; font-weight: 600; line-height: 1.5; cursor: pointer; }
#extension-toggle-list .extension-toggle-spoiler > summary:hover { filter: brightness(.95); }
#extension-toggle-list .extension-toggle-table { width: 100%; margin: 0; table-layout: fixed; font-size: 14px; }
#extension-toggle-list .extension-toggle-table :is(th, td) { padding: 10px 14px; border: 0; border-bottom: 1px solid var(--border-color); }
#extension-toggle-list .extension-toggle-table thead th { padding: 11px 14px; background: var(--surface-color); border-bottom-width: 2px; font-weight: 600; }
#extension-toggle-list .extension-toggle-table tbody tr:last-child td { border-bottom: 0; }
#extension-toggle-list .extension-toggle-table tbody tr:hover td { background: var(--surface-color); }
#extension-toggle-list .extension-toggle-table :is(th, td):first-child { width: 65%; text-align: left; overflow-wrap: anywhere; line-height: 1.45; }
#extension-toggle-list .extension-toggle-table :is(th, td):last-child { width: 35%; text-align: center; }
#extension-toggle-list .extension-toggle-actions { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; }
#extension-toggle-list .extension-toggle-action { display: inline-flex; align-items: center; justify-content: center; flex: 0 1 130px; width: 130px; min-height: 34px; padding: 7px 10px; font-size: 13px; line-height: 1.3; text-align: center; white-space: normal; }
#extension-toggle-list .extension-toggle-disable { background: var(--coins-color); }
#extension-toggle-list .extension-toggle-enable { background: var(--credits-color); }
#extension-toggle-list .extension-toggle-action:disabled { opacity: .45; cursor: not-allowed; filter: grayscale(100%); box-shadow: none; }
#extension-toggle-list .extension-toggle-empty { padding: 18px; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius-medium); text-align: center; }
.lss-settings-overlay { position: fixed; inset: 0; z-index: 10001; overflow-y: auto; background: rgba(0, 0, 0, .5); }
.lss-settings-panel { display: flex; flex-direction: column; max-width: 900px; height: calc(100vh - 80px); margin: 30px auto; overflow: hidden; background: var(--background-color); color: var(--text-color); border-radius: var(--radius-large); box-shadow: 0 0 10px var(--shadow-color); }
.lss-settings-description { flex-shrink: 0; padding: 20px 20px 0; margin-bottom: 20px; }
.lss-settings-description h4 { margin-bottom: 10px; font-size: 1.2em; line-height: 1.4; }
.lss-settings-description p { margin: 0; line-height: 1.6; }
.lss-settings-tabs { display: flex; flex-wrap: wrap; gap: 6px; flex-shrink: 0; margin: 0 20px 15px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color); }
.lss-settings-tabs button { padding: 7px 14px; background: transparent; color: var(--text-color); border: 1px solid var(--border-color); border-radius: var(--radius-small); cursor: pointer; }
.lss-settings-tabs button.is-active { background: var(--button-background-color); color: #fff; border-color: var(--button-background-color); }
#settings-tab-content { flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; padding: 0 20px; }
.lss-settings-group { margin-bottom: 12px; }
.lss-settings-group > legend { display: flex; align-items: center; gap: 6px; padding: 6px 10px; margin-bottom: 6px; border-bottom: 1px solid var(--border-color); color: var(--text-color); font-size: .95em; font-weight: 600; cursor: pointer; user-select: none; }
.lss-settings-grid { display: none; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; padding: 8px 0; }
.lss-settings-group.is-open .lss-settings-grid { display: grid; }
.lss-settings-grid label { display: flex; align-items: center; gap: 6px; }
.lss-settings-grid .lss-select-all { grid-column: 1 / -1; font-weight: 500; }
.lss-settings-grid .lss-select-all span { font-weight: bold; color: var(--button-background-color); }
.lss-settings-message { padding: 15px; text-align: center; opacity: .7; font-style: italic; }
.lss-settings-footer { display: flex; justify-content: center; gap: 10px; flex-shrink: 0; padding: 12px 20px; border-top: 1px solid var(--border-color); background: var(--background-color); }
.lss-settings-footer button { padding: 6px 12px; border: none; border-radius: var(--radius-small); color: #fff; cursor: pointer; }
.lss-settings-save { background: var(--credits-color); }
.lss-settings-close { background: var(--coins-color); }
.construction-modal { max-width: 1650px; height: calc(100vh - 16px); height: calc(100dvh - 16px); min-height: 0; border-radius: 8px; }
.construction-header { display: flex; flex: 0 0 auto; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 12px 16px; background: var(--surface-color); color: var(--text-color); border-bottom: 1px solid var(--border-color); }
.construction-title { margin: 0; color: var(--text-color); font-size: 21px; font-weight: 600; line-height: 1.4; }
.construction-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; }
#construction-lightbox .bau-btn { min-height: 32px; padding: 8px 12px; border: none; border-radius: 5px; color: #fff; font-size: 13px; font-weight: 500; white-space: nowrap; cursor: pointer; transition: filter .2s ease, transform .1s ease; }
#construction-lightbox .bau-btn:hover:not(:disabled) { filter: brightness(.9); }
#construction-lightbox .bau-btn:active:not(:disabled) { transform: translateY(1px); }
#construction-lightbox .bau-btn:disabled { opacity: .6; cursor: not-allowed; }
#construction-lightbox .bau-btn-danger { background: var(--coins-color); }
#construction-lightbox .bau-btn-success { background: var(--credits-color); }
#construction-lightbox .bau-btn-warning { background: var(--warning-color); }
#construction-lightbox :is(.construction-filter-table, #construction-data-table) { width: 100%; min-width: 1250px; margin: 0; table-layout: fixed; border-collapse: separate; border-spacing: 0; font-size: 13px; text-align: center; }
#construction-lightbox col:nth-child(1) { width: 17%; }
#construction-lightbox col:nth-child(2) { width: 13%; }
#construction-lightbox col:nth-child(3) { width: 20%; }
#construction-lightbox col:nth-child(4) { width: 18%; }
#construction-lightbox col:nth-child(5) { width: 20%; }
#construction-lightbox col:nth-child(6) { width: 12%; }
.construction-filters-wrapper { position: relative; z-index: 5; flex: 0 0 auto; overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain; scrollbar-width: none; background: var(--surface-color); border-bottom: 1px solid var(--border-color); }
.construction-filters-wrapper::-webkit-scrollbar { display: none; }
#construction-lightbox .construction-filter-table, #construction-lightbox .construction-filter-table th { background: var(--surface-color); color: var(--text-color); }
#construction-lightbox .construction-filter-table th { padding: 9px 10px 10px; vertical-align: top; text-align: left; border-right: 1px solid var(--border-color); }
#construction-lightbox .construction-filter-table th:last-child { border-right: 0; }
#construction-lightbox .construction-filter-table th:nth-child(5) { text-align: center; vertical-align: middle; white-space: nowrap; cursor: pointer; user-select: none; }
.construction-filter-label { display: block; min-height: 18px; margin: 0 0 7px; color: var(--text-color); font-size: 12px; font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
#construction-lightbox .construction-filter-table select, #construction-lightbox .construction-filter-table select option { background: var(--input-background); color: var(--input-text); }
#construction-lightbox .construction-filter-table select { display: block; width: 100%; height: 34px; padding: 6px 25px 6px 9px; border: 1px solid var(--border-color); border-radius: 5px; font-size: 12px; }
#construction-lightbox .construction-filter-table select:focus { outline: 2px solid var(--button-background-color); outline-offset: -1px; }
.construction-table-wrapper { position: relative; isolation: isolate; z-index: 1; flex: 1 1 0; min-height: 0; overflow: auto; overscroll-behavior: contain; }
#construction-lightbox #construction-data-table td { padding: 11px 10px; vertical-align: middle; line-height: 1.45; overflow-wrap: anywhere; color: var(--text-color); background: var(--background-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
#construction-lightbox #construction-data-table td:first-child { padding-left: 16px; text-align: left; }
#construction-lightbox #construction-data-table td:last-child { padding: 8px; }
#construction-lightbox #construction-data-table td:last-child .bau-btn { max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
#construction-lightbox #construction-data-table tbody tr:nth-child(even) td { background: var(--level-button-background); color: var(--text-color); }
#construction-lightbox #construction-data-table tbody tr:hover td { background: var(--level-button-hover); color: var(--text-color); }
.construction-modal .countdown { white-space: nowrap; font-variant-numeric: tabular-nums; }
.construction-progress { background: var(--progress-background); border: 1px solid var(--border-color); }
.construction-progress-bar { background: var(--progress-fill); }
.construction-progress-bar.cancel { background: var(--coins-color); }
body.hide-coins-buttons .coins-button, body.hide-coins-buttons .coins-column-hidden { display: none !important; }
.extension-toggle-leitstelle-wrapper { margin-bottom: 12px; color: var(--text-color); }
.extension-toggle-leitstelle-wrapper label { color: var(--text-color); margin-right: 6px; }
.extension-toggle-leitstelle-select { max-width: 100%; padding: 6px 10px; color: var(--input-text) !important; background: var(--input-background); border: 1px solid var(--border-color); border-radius: var(--radius-small); }
.extension-toggle-leitstelle-select option { color: var(--input-text); background: var(--input-background); }
.extension-toggle-leitstelle-select:focus { outline: 2px solid var(--button-background-color); outline-offset: 1px; }

@media (max-width: 900px) {
    #construction-lightbox { padding: 4px; }
    .construction-modal { height: calc(100vh - 8px); height: calc(100dvh - 8px); }
    .construction-header { align-items: flex-start; padding: 10px 12px; }
    .construction-toolbar { justify-content: flex-start; }
    .construction-title { font-size: 18px; }
    #construction-lightbox .construction-filter-table th { padding: 8px; }
    #construction-lightbox #construction-data-table td { padding: 9px 8px; }
}

@media (max-width: 700px) {
    #extension-toggle-list .extension-toggle-table :is(th, td) { padding: 8px; }
    #extension-toggle-list .extension-toggle-table :is(th, td):first-child { width: 45%; }
    #extension-toggle-list .extension-toggle-table :is(th, td):last-child { width: 55%; }
    #extension-toggle-list .extension-toggle-actions { flex-direction: column; gap: 6px; }
    #extension-toggle-list .extension-toggle-action { width: 100%; flex-basis: auto; }
}

@media (max-width: 500px) {
    .construction-toolbar { width: 100%; }
    .construction-title { font-size: 17px; }
}
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    const lightbox = document.createElement('div');
    lightbox.id = 'extension-lightbox';
    lightbox.style.display = 'none';
    lightbox.innerHTML = `
        <div id="extension-lightbox-modal">
          <div id="extension-lightbox-header">
            <div id="user-balance">
              <div id="alliance-balance">
                <div>
                  <div>Aktuelle Credits: <span id="current-credits">...</span></div>
                  <div>Aktuelle Coins: <span id="current-coins">...</span></div>
                </div>
                <div>
                  <div>Ausgewählte Credits: <span id="selected-credits">0</span></div>
                  <div>Ausgewählte Coins: <span id="selected-coins">0</span></div>
                </div>
              </div>
              <div id="alliance-info">
                <div>
                  Aktuelle Verbands-Credits: <span id="current-alliance-credits">...</span><br>
                  Ausgewählte Verbands-Credits: <span id="selected-alliance-credits">0</span>
                </div>
              </div>
            </div>
            <div class="lss-header-actions">
              <button id="open-extension-toggle-manager" type="button">Erweiterungen De-/Aktivieren</button>
              <button id="under-construction">Aktuell Im Bau oder Fertiggestellt</button>
              <button id="open-alliance-buildings">Verbandsgebäude</button>
              <button id="close-extension-helper">Schließen</button>
            </div>
          </div>
          <div id="extension-lightbox-content">
            <h3>🚒🏗️ <strong>Herzlich willkommen beim ultimativen Ausbau-Assistenten für Eure Wachen!</strong> 🚒🏗️</h3>
            <br>
            <h2 class="lss-title">Dem Erweiterungs-Manager</h2>
            <h5>
              <br><br>Dieses kleine Helferlein zeigt euch genau, wo noch Platz in euren Wachen ist: Welche <strong>Erweiterungen, Lagerräume</strong> und <strong>Ausbaustufen</strong> noch möglich sind – und mit nur ein paar Klicks geht’s direkt in den Ausbau.
              <br><br>Einfacher wird’s nicht!
              <br><br>Und das Beste: Über den
              <button id="open-extension-settings">Einstellungen</button>
              -Button könnt ihr festlegen, welche Erweiterungen und Lagerräume euch pro Wachen-Typ angezeigt werden – ganz nach eurem Geschmack. Einmal gespeichert, für immer gemerkt.
              <br><br>Kleiner Hinweis am Rande: Feedback, Verbesserungsvorschläge oder Kritik zum Skript sind jederzeit im
              <a href="https://forum.leitstellenspiel.de/index.php?thread/27856-script-erweiterungs-manager/" target="_blank">
                <strong>Forum</strong>
              </a> willkommen. 💌
              <br><br><br>Und nun viel Spaß beim Credits oder Coins ausgeben!
              <br><br>
              <div id="loading-container">
                <div id="loading-text">Lade Daten</div>
                <div id="loading-progress"></div>
              </div>
              <div id="extension-list"></div>
              <div id="extension-toggle-content">
                <h2>Erweiterungen global deaktivieren oder aktivieren</h2>
                <input
                  id="extension-toggle-search"
                  type="search"
                  class="extension-search"
                  placeholder="Gebäudetyp oder Erweiterung suchen …">
                <div id="extension-toggle-list"></div>
              </div>
            </h5>
          </div>
        </div>
    `;

    document.body.appendChild(lightbox);

    let buildingsData = [];
    let buildingGroups = {};
    let currentCredits = 0;
    let currentCoins = 0;
    let allianceInfo = null;
    let allianceBuildingsData = [];
    let currentView = 'personal';
    let manualSearchTerm = '';
    let cachedUserInfo = null;
    let specializationSelectionCounter = 0;
    let toggleableExtensionsCache = null;
    let toggleableExtensionsCacheSource = null;

    const buildingCountLimits = {
        0: {
            9: { requiredBuildings: 10, countSmallBuildings: true },
            8: { requiredBuildings: 10, countSmallBuildings: true }
        },
        2: {
            0: { requiredBuildings: 10, countSmallBuildings: true }
        },
        6: {
            14: { requiredBuildings: 10, countSmallBuildings: true },
            15: { requiredBuildings: 10, countSmallBuildings: true }
        },
        4: {
            9: { requiredBuildings: 5, countSmallBuildings: true }
        }
    };
    const ignoreLevels = [
        '5_normal',  // Rettungshubschrauber-Station
        '13_normal', // Polizeihubschrauber-Station
        '28_normal'  // Seenotrettungshubschrauber-Station
    ];
    const storageGroups = {};
    const selectedLevels = {};
    const storageBuildQueue = {};
    const manualExtensions = {};
    const manualStorageRooms = {};
    const manualLevels = {};
    const buildingTypeApiMapping = {
        '0_normal': 0,
        '0_small': 0,
        '1_normal': 1,
        '2_normal': 2,
        '2_small': 2,
        '3_normal': 3,
        '4_normal': 4,
        '5_normal': 5,
        '6_normal': 6,
        '6_small': 6,
        '8_normal': 8,
        '9_normal': 9,
        '10_normal': 10,
        '11_normal': 11,
        '12_normal': 12,
        '13_normal': 13,
        '15_normal': 15,
        '16_normal': 16,
        '17_normal': 17,
        '24_normal': 24,
        '25_normal': 25,
        '26_normal': 26,
        '27_normal': 27,
        '29_normal': 29
    };
    const buildingTypeNames = {
        '0_normal': 'Feuerwache (Normal)',
        '0_small': 'Feuerwache (Kleinwache)',
        '1_normal': 'Feuerwehrschule',
        '2_normal': 'Rettungswache (Normal)',
        '2_small': 'Rettungswache (Kleinwache)',
        '3_normal': 'Rettungsschule',
        '4_normal': 'Krankenhaus',
        '5_normal': 'Rettungshubschrauber-Station',
        '6_normal': 'Polizeiwache (Normal)',
        '6_small': 'Polizeiwache (Kleinwache)',
        '8_normal': 'Polizeischule',
        '9_normal': 'Technisches Hilfswerk',
        '10_normal': 'Technisches Hilfswerk - Bundesschule',
        '11_normal': 'Bereitschaftspolizei',
        '12_normal': 'Schnelleinsatzgruppe (SEG)',
        '13_normal': 'Polizeihubschrauber-Station',
        '15_normal': 'Wasserrettung',
        '16_normal': 'Verbandszellen',
        '17_normal': 'Polizei-Sondereinheiten',
        '24_normal': 'Reiterstaffel',
        '25_normal': 'Bergrettungswache',
        '26_normal': 'Seenotrettungswache',
        '27_normal': 'Schule für Seefahrt und Seenotrettung',
        '29_normal': 'Autobahnpolizei'
    };
    const allowedBuildings = new Set([
        '0_normal',  // Feuerwache (Normal)
        '0_small',   // Feuerwache (Kleinwache)
        '4_normal',  // Krankenhaus
        '6_normal',  // Polizeiwache (Normal)
        '6_small',   // Polizeiwache (Kleinwache)
        '2_normal',  // Rettungswache (Normal)
        '2_small',   // Rettungswache (Kleinwache)
        '15_normal', // Wasserrettung
        '25_normal', // Bergrettungswache
        '26_normal', // Seenotrettungswache
        '29_normal'  // Autobahnpolizei
    ]);
    const specializationBuildings = new Set([
        '0_normal',
        '0_small',
        '6_normal',
        '6_small'
    ]);
    const specializationDefinitions = {
        airport_fire_brigade: {
            name: 'Flughafen-Spezialisierung',
            extensionId: 8,
            coins: 20,
            apiType: 'airport',
            buildingTypes: ['0_normal', '0_small']
        },
        water_rescue: {
            name: 'Wasserrettung-Spezialisierung',
            extensionId: 6,
            coins: 20,
            apiType: 'water_rescue',
            buildingTypes: ['0_normal', '0_small']
        },
        factory_fire_brigade: {
            name: 'Werkfeuerwehr-Spezialisierung',
            extensionId: 13,
            coins: 20,
            apiType: 'factory_fire_brigade',
            buildingTypes: ['0_normal', '0_small']
        },
        highway_police: {
            name: 'Autobahnpolizei-Spezialisierung',
            extensionId: 16,
            coins: 20,
            apiType: 'highway_police',
            buildingTypes: ['6_normal', '6_small']
        }
    };
    const progressBars = {
        activate: null,
        cancel: null
    };
    const SETTINGS_KEY = 'enabledExtensions';
    const defaultExtensionSettings = {
        showCoinsButtons: true
    };
    const coinsTableObserver = new MutationObserver(() => {
        if (getExtensionSettings().showCoinsButtons === false) {
            applyCoinsButtonVisibility();
        }
    });

    // Ruft die Verbandsinformationen ab und ermittelt Guthaben sowie Berechtigungen
    async function getAllianceInfo() {
        try {
            const resp = await fetch('/api/allianceinfo');
            if (!resp.ok) {
                console.warn('getAllianceInfo: /api/allianceinfo returned', resp.status);
                return null;
            }

            const data = await resp.json();
            const credits_current = Number(data.credits_current ?? data.credits ?? 0);

            let admin = Boolean(data.admin);
            let coadmin = Boolean(data.coadmin);
            let finance = Boolean(data.finance);

            if (data.role_flags && typeof data.role_flags === 'object') {
                admin = admin || Boolean(data.role_flags.admin);
                coadmin = coadmin || Boolean(data.role_flags.coadmin);
                finance = finance || Boolean(data.role_flags.finance || data.role_flags.finanace);
            }

            const memberArrays = ['members', 'users', 'memberships', 'members_info'];
            const foundArrayName = memberArrays.find(k => Array.isArray(data[k]));

            if (foundArrayName) {
                const members = data[foundArrayName];
                let currentUserId = null;

                try {
                    const userResp = await fetch('/api/userinfo');
                    if (userResp.ok) {
                        const userJson = await userResp.json();
                        currentUserId = userJson.id ?? userJson.user_id ?? null;
                    }
                } catch (e) {
                    // Benutzer-ID nicht ermittelbar: Rechte bleiben wie bisher
                }

                if (currentUserId !== null) {
                    const me = members.find(m =>
                                            Number(m.id) === Number(currentUserId) ||
                                            Number(m.user_id) === Number(currentUserId) ||
                                            m.name === (window.current_user_name || '')
                                           );

                    if (me) {
                        if (me.role_flags && typeof me.role_flags === 'object') {
                            admin = admin || Boolean(me.role_flags.admin);
                            coadmin = coadmin || Boolean(me.role_flags.coadmin);
                            finance = finance || Boolean(me.role_flags.finance);
                        }
                        admin = admin || Boolean(me.admin || me.is_admin);
                        coadmin = coadmin || Boolean(me.coadmin);
                        finance = finance || Boolean(me.finance);
                    }
                }
            }

            return { credits_current, admin, coadmin, finance, raw: data };
        } catch (err) {
            console.warn('getAllianceInfo error', err);
            return null;
        }
    }

    // Initialisiert die UI für Verbandsgebäude und prüft die erforderlichen Berechtigungen
    async function initAllianceUI() {
        try {
            const allianceBtn = document.getElementById('open-alliance-buildings');
            const allianceInfoDiv = document.getElementById('alliance-info');
            const allianceCreditsSpan = document.getElementById('current-alliance-credits');

            if (allianceBtn) allianceBtn.style.display = 'none';
            if (allianceInfoDiv) allianceInfoDiv.style.display = 'none';

            const info = await getAllianceInfo();
            allianceInfo = info;

            if (!info || !hasAllianceBuildingRights()) return;

            if (allianceCreditsSpan) allianceCreditsSpan.textContent = (info.credits_current || 0).toLocaleString();

            const selAllianceSpan = document.getElementById('selected-alliance-credits');
            if (selAllianceSpan) selAllianceSpan.textContent = '0';
            if (allianceInfoDiv) allianceInfoDiv.style.display = 'flex';

            if (!allianceBtn) return;

            allianceBtn.style.display = 'inline-block';
            allianceBtn.textContent = 'Verbandsgebäude';

            // Button klonen, damit keine doppelten Listener entstehen
            const freshBtn = allianceBtn.cloneNode(true);
            allianceBtn.replaceWith(freshBtn);

            freshBtn.addEventListener('click', async (e) => {
                e.preventDefault();

                if (currentView === 'alliance') {
                    currentView = 'personal';
                    freshBtn.textContent = 'Verbandsgebäude';
                    setLightboxTitleForView();
                    await fetchBuildingsAndRender();
                } else {
                    currentView = 'alliance';
                    freshBtn.textContent = 'Eigene Wachen';
                    setLightboxTitleForView();
                    await fetchAllianceBuildingsAndRender();
                }
            });
        } catch (err) {
            console.warn('initAllianceUI error', err);
        }
    }

    // Lädt die Verbandsgebäude und rendert die verfügbaren Erweiterungen
    async function fetchAllianceBuildingsAndRender() {
        const loadingText = document.getElementById('loading-text');
        const loadingContainer = document.getElementById('loading-container');
        const extensionList = document.getElementById('extension-list');

        let dotInterval;

        function startLoadingAnimation() {
            let dots = 0;
            if (loadingText) loadingText.textContent = 'Lade Verbandsgebäude...';

            dotInterval = setInterval(() => {
                dots = (dots + 1) % 4;
                if (loadingText) loadingText.textContent = 'Lade Verbandsgebäude' + '.'.repeat(dots);
            }, 500);
        }

        function stopLoadingAnimation() {
            clearInterval(dotInterval);
        }

        if (loadingContainer) loadingContainer.style.display = 'block';
        if (extensionList) extensionList.style.display = 'none';
        startLoadingAnimation();

        try {
            const response = await fetch('/api/alliance_buildings');
            if (!response.ok) throw new Error('Fehler beim Abrufen der Verbandsgebäude');

            const buildings = await response.json();
            allianceBuildingsData = buildings;

            if (!allianceInfo) {
                allianceInfo = await getAllianceInfo();
            }

            if (hasAllianceBuildingRights() && document.getElementById('current-alliance-credits')) {
                document.getElementById('current-alliance-credits').textContent =
                    (allianceInfo.credits_current || 0).toLocaleString();

                const allianceInfoDiv = document.getElementById('alliance-info');
                if (allianceInfoDiv) allianceInfoDiv.style.display = 'flex';
            }

            const allianceUserInfo = {
                credits: allianceInfo ? (allianceInfo.credits_current || 0) : 0,
                coins: 0,
                premium: false
            };

            await renderMissingExtensions(buildings, allianceUserInfo);

            stopLoadingAnimation();
            if (loadingContainer) loadingContainer.style.display = 'none';
            if (extensionList) extensionList.style.display = 'block';
        } catch (error) {
            stopLoadingAnimation();
            if (loadingContainer) loadingContainer.style.display = 'none';
            if (extensionList) {
                extensionList.style.display = 'block';
                extensionList.innerHTML = 'Fehler beim Laden der Verbandsgebäude.';
            }
            console.error(error);
        }
    }

    // Passt den Titel des Erweiterungs-Managers an die aktuell angezeigte Ansicht an
    function setLightboxTitleForView() {
        const titleEl = document.querySelector('#extension-lightbox-content h2');
        if (!titleEl) return;

        titleEl.textContent = currentView === 'alliance'
            ? 'Verbandsgebäude - Erweiterungs-Manager'
        : 'Dem Erweiterungs-Manager';
    }

    // Prüft, ob der aktuelle Benutzer über Berechtigungen zum Bauen von Verbandsgebäuden verfügt
    function hasAllianceBuildingRights() {
        return Boolean(allianceInfo && (allianceInfo.admin || allianceInfo.coadmin || allianceInfo.finance));
    }

    // Prüft, ob die angegebene Gebäudekategorie zu den Verbandsgebäuden gehört
    function isAllianceBuildingCategory(category) {
        return ['1_normal', '3_normal', '4_normal', '8_normal', '10_normal', '16_normal'].includes(category);
    }

    // Speichert die Einstellungen
    function saveExtensionSettings(settings) {
        GM_setValue(SETTINGS_KEY, settings);
    }

    // Liefert die gespeicherten Einstellungen
    function getExtensionSettings() {
        return { ...defaultExtensionSettings, ...GM_getValue(SETTINGS_KEY, {}) };
    }

    // Coin-Button ausblenden
    function applyCoinsButtonVisibility() {
        const settings = getExtensionSettings();
        const showCoinsButtons = settings.showCoinsButtons !== false;

        document.body.classList.toggle(
            'hide-coins-buttons',
            !showCoinsButtons
        );

        // Coins-Spalten in allen Tabellen aktualisieren
        document.querySelectorAll('table').forEach(table => {
            // Vorherige Markierungen entfernen
            table.querySelectorAll('.coins-column-hidden').forEach(cell => {
                cell.classList.remove('coins-column-hidden');
            });

            if (showCoinsButtons) return;

            const columnIndexes = new Set();

            // Spalten anhand der Coins-Buttons erkennen
            table.querySelectorAll('tr').forEach(row => {
                const cells = Array.from(row.children);

                cells.forEach((cell, index) => {
                    if (cell.querySelector('.coins-button')) {
                        columnIndexes.add(index);
                    }
                });
            });

            // Passende Zellen einschließlich Überschriften ausblenden
            table.querySelectorAll('tr').forEach(row => {
                const cells = Array.from(row.children);

                columnIndexes.forEach(index => {
                    if (cells[index]) {
                        cells[index].classList.add('coins-column-hidden');
                    }
                });
            });
        });
    }

    // Ermittelt den lokalen Speicher-Schlüssel für eine Gebäudeerweiterung
    function getExtensionSettingKey(category, extensionId, isAlliance = false) {
        if (isAlliance && isAllianceBuildingCategory(category)) {
            return `alliance_${category}_${extensionId}`;
        }
        return `${category}_${extensionId}`;
    }

    // Ermittelt den lokalen Speicher-Schlüssel für einen Lagerraum
    function getStorageSettingKey(category, roomId, isAlliance = false) {
        const roomKey = String(roomId);

        if (isAlliance && isAllianceBuildingCategory(category)) {
            return `alliance_${category}_storage_${roomKey}`;
        }
        return `${category}_storage_${roomKey}`;
    }

    // Öffnet das Einstellungs-Overlay
    function openExtensionSettingsOverlay() {
        const settings = getExtensionSettings();
        const allianceRights = hasAllianceBuildingRights();

        const overlay = document.createElement('div');
        overlay.className = 'lss-settings-overlay';

        const panel = document.createElement('div');
        panel.className = 'lss-settings-panel';

        const description = document.createElement('div');
        description.className = 'lss-settings-description';
        description.innerHTML = `
            <h4>🛠️ Erweiterungen &amp; Lagerräume anpassen</h4>
            <p>Bestimme, welche Erweiterungen und Lagerräume in den jeweiligen Gebäudearten angezeigt werden. Eigene Gebäude und Verbandsgebäude können unabhängig voneinander konfiguriert werden.</p>
        `;

        const tabs = document.createElement('div');
        tabs.className = 'lss-settings-tabs';

        const tabContent = document.createElement('div');
        tabContent.id = 'settings-tab-content';

        const tabButtons = [];

        function showTab(button, render) {
            tabContent.innerHTML = '';
            tabButtons.forEach(btn => btn.classList.toggle('is-active', btn === button));
            render();
        }

        function createTabButton(id, text, render) {
            const btn = document.createElement('button');
            btn.id = id;
            btn.className = 'tab-btn';
            btn.type = 'button';
            btn.textContent = text;
            btn.addEventListener('click', () => showTab(btn, render));

            tabs.appendChild(btn);
            tabButtons.push(btn);
            return btn;
        }

        function appendEmptyMessage(text) {
            const message = document.createElement('div');
            message.className = 'lss-settings-message';
            message.textContent = text;
            tabContent.appendChild(message);
        }

        // Gemeinsame Formular-Erzeugung für Erweiterungen und Lagerräume
        function createSettingsForm(categories, getEntries, selectAllText) {
            const form = document.createElement('form');
            let visibleCategories = 0;

            categories.forEach(category => {
                const entries = getEntries(category);
                if (entries.length === 0) return;

                const fieldset = document.createElement('fieldset');
                fieldset.className = 'lss-settings-group';

                const legend = document.createElement('legend');
                const arrow = document.createElement('span');
                arrow.textContent = '▶';
                const title = document.createElement('span');
                title.textContent = buildingTypeNames[category] || category;
                legend.append(arrow, title);

                const grid = document.createElement('div');
                grid.className = 'lss-settings-grid';

                const allLabel = document.createElement('label');
                allLabel.className = 'lss-select-all';

                const selectAll = document.createElement('input');
                selectAll.type = 'checkbox';

                const allText = document.createElement('span');
                allText.textContent = selectAllText;

                allLabel.append(selectAll, allText);
                grid.appendChild(allLabel);

                const checkboxes = [];
                const syncSelectAll = () => {
                    selectAll.checked = checkboxes.length > 0 && checkboxes.every(cb => cb.checked);
                };

                entries.forEach(({ name, key }) => {
                    const label = document.createElement('label');

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = settings[key] ?? true;
                    checkbox.dataset.key = key;

                    checkbox.addEventListener('change', () => {
                        settings[key] = checkbox.checked;
                        syncSelectAll();
                    });

                    label.append(checkbox, ` ${name}`);
                    grid.appendChild(label);
                    checkboxes.push(checkbox);
                });

                syncSelectAll();

                selectAll.addEventListener('change', () => {
                    checkboxes.forEach(cb => {
                        cb.checked = selectAll.checked;
                        settings[cb.dataset.key] = cb.checked;
                    });
                });

                legend.addEventListener('click', () => {
                    const open = fieldset.classList.toggle('is-open');
                    arrow.textContent = open ? '▼' : '▶';
                });

                fieldset.append(legend, grid);
                form.appendChild(fieldset);
                visibleCategories++;
            });

            return { form, visibleCategories };
        }

        const hasEntries = (source, category) =>
        Array.isArray(source[category]) && source[category].length > 0;

        const extensionEntries = isAlliance => category =>
        manualExtensions[category]
        .slice()
        .sort((a, b) => {
            const aAlpha = /^[A-Za-z]/.test(a.name);
            const bAlpha = /^[A-Za-z]/.test(b.name);

            if (aAlpha && !bAlpha) return -1;
            if (!aAlpha && bAlpha) return 1;

            return a.name.localeCompare(b.name, 'de', { numeric: true });
        })
        .map(ext => ({
            name: ext.name,
            key: getExtensionSettingKey(category, ext.id, isAlliance)
        }));

        const storageEntries = isAlliance => category =>
        manualStorageRooms[category].map(room => ({
            name: room.name,
            key: getStorageSettingKey(category, room.id, isAlliance)
        }));

        // Tab: Eigene Wachen / Gebäude
        const renderOwnTab = () => {
            const categories = Object.keys(buildingTypeNames).filter(category =>
                                                                     category !== '16_normal' && hasEntries(manualExtensions, category)
                                                                    );

            const result = createSettingsForm(categories, extensionEntries(false), 'Alle Erweiterungen an-/abwählen');

            if (result.visibleCategories === 0) {
                appendEmptyMessage('Für eigene Gebäude sind keine Erweiterungen konfigurierbar.');
                return;
            }
            tabContent.appendChild(result.form);
        };

        // Tab: Lagerräume
        const renderStorageTab = () => {
            const categories = Object.keys(buildingTypeNames).filter(category =>
                                                                     category !== '16_normal' && hasEntries(manualStorageRooms, category)
                                                                    );

            if (categories.length === 0) {
                appendEmptyMessage('Für eigene Gebäude sind keine Lagerräume konfigurierbar.');
                return;
            }

            tabContent.appendChild(
                createSettingsForm(categories, storageEntries(false), 'Alle Lagerräume an-/abwählen').form
            );
        };

        // Tab: Verbandsgebäude (nur Krankenhäuser, Schulen und Verbandszellen)
        const renderAllianceTab = () => {
            if (!allianceRights) {
                appendEmptyMessage('Du besitzt keine Berechtigung zur Verwaltung von Verbandsgebäuden.');
                return;
            }

            const categories = ['1_normal', '3_normal', '4_normal', '8_normal', '10_normal', '16_normal']
            .filter(category => hasEntries(manualExtensions, category));

            const result = createSettingsForm(categories, extensionEntries(true), 'Alle Erweiterungen an-/abwählen');

            if (result.visibleCategories === 0) {
                appendEmptyMessage('Für Verbandsgebäude sind keine Erweiterungen konfigurierbar.');
                return;
            }
            tabContent.appendChild(result.form);
        };

        // Tab: Allgemeine Einstellungen
        const renderGeneralTab = () => {
            const form = document.createElement('div');
            form.className = 'lss-settings-group is-open';

            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '8px';
            label.style.padding = '12px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = settings.showCoinsButtons !== false;

            const text = document.createElement('span');
            text.textContent = 'Coins-Buttons im gesamten Skript anzeigen';

            checkbox.addEventListener('change', () => {
                settings.showCoinsButtons = checkbox.checked;
            });

            label.append(checkbox, text);
            form.appendChild(label);
            tabContent.appendChild(form);
        };

        const generalBtn = createTabButton(
            'tab-general-btn',
            'Allgemein',
            renderGeneralTab
        );

        const ownBtn = createTabButton('tab-own-btn', 'Eigene Wachen / Gebäude', renderOwnTab);
        createTabButton('tab-storage-btn', 'Lagerräume', renderStorageTab);
        if (allianceRights) {
            createTabButton('tab-alliance-btn', 'Verbandsgebäude', renderAllianceTab);
        }

        showTab(generalBtn, renderGeneralTab);

        // Fußzeile
        const footer = document.createElement('div');
        footer.className = 'lss-settings-footer';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'lss-settings-save';
        saveBtn.textContent = 'Speichern';
        saveBtn.addEventListener('click', () => {
            saveExtensionSettings(settings);
            alert('Deine Einstellungen wurden gespeichert. Die Seite wird neu geladen, um diese zu übernehmen.');
            overlay.remove();
            location.reload();
        });

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'lss-settings-close';
        closeBtn.textContent = 'Schließen';
        closeBtn.addEventListener('click', () => overlay.remove());

        footer.append(saveBtn, closeBtn);

        panel.append(description, tabs, tabContent, footer);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
    }

    // Funktion zum Formatieren der Zahl
    function formatNumber(number) {
        return new Intl.NumberFormat('de-DE').format(number);
    }

    // Funktion zum Abrufen des CSRF-Tokens
    function getCSRFToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    // Erstellt einen Button mit Text und Klassen
    function createButton(text, classes = []) {
        const btn = document.createElement('button');
        btn.textContent = text;
        classes.forEach(cls => btn.classList.add(cls));
        return btn;
    }

    // Erstellt ein Filter-Dropdown
    function createFilterSelect(options, placeholder, extraClass = '') {
        const select = document.createElement('select');
        select.className = `btn btn-sm lss-filter-select ${extraClass}`.trim();
        select.innerHTML = `<option value="">🔽 ${placeholder}</option>`;

        options.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText;
            option.textContent = optionText;
            select.appendChild(option);
        });

        return select;
    }

    // Erstellt einen kleinen Filter-Button
    function createFilterButton(text, variant) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = `btn btn-sm btn-${variant} lss-filter-btn`;
        return btn;
    }

    // Erstellt das Suchfeld für die Tabellen
    function createSearchInput(placeholder) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control lss-search';
        input.placeholder = placeholder;
        input.autocomplete = 'off';
        return input;
    }

    // Erstellt eine Kopfzelle (optional mit Inhalt)
    function createHeaderCell(child = null) {
        const th = document.createElement('th');
        if (child) th.appendChild(child);
        return th;
    }

    // Erstellt die Zeile mit dem Suchfeld
    function createSearchRow(input, colSpan) {
        const row = document.createElement('tr');
        row.className = 'lss-manager-search-row';

        const cell = document.createElement('th');
        cell.colSpan = colSpan;
        cell.appendChild(input);

        row.appendChild(cell);
        return row;
    }

    // Erstellt eine Textzelle
    function createTextCell(text) {
        const td = document.createElement('td');
        td.textContent = text;
        return td;
    }

    // Erstellt eine Fortschrittsanzeige
    function createProgress(total, unit) {
        const container = document.createElement('div');
        container.className = 'progress-container';
        container.append('Bitte warten...');

        const bar = document.createElement('div');
        bar.className = 'progress-bar';

        const fill = document.createElement('div');
        fill.className = 'progress-fill';
        bar.appendChild(fill);

        const text = document.createElement('p');
        text.className = 'progress-text';

        const update = done => {
            fill.style.width = `${total > 0 ? (done / total) * 100 : 100}%`;
            text.textContent = `${done} von ${total} ${unit} gebaut`;
        };

        update(0);
        container.append(bar, text);
        document.body.appendChild(container);

        return {
            update,
            close: (delay = 0) => {
                if (delay > 0) {
                    setTimeout(() => container.remove(), delay);
                } else {
                    container.remove();
                }
            }
        };
    }

    // Zeigt einen Auswahl-/Bestätigungsdialog.
    function showDialog({ title = null, html, actions }) {
        const dialog = document.createElement('div');
        dialog.className = 'currency-selection';

        if (title) {
            const heading = document.createElement('h4');
            heading.textContent = title;
            dialog.appendChild(heading);
        }

        const info = document.createElement('p');
        info.innerHTML = html;
        dialog.appendChild(info);

        actions.forEach(({ text, classes, disabled = false, onClick }) => {
            const btn = createButton(text, classes);
            btn.disabled = Boolean(disabled);
            btn.addEventListener('click', () => onClick(dialog));
            dialog.appendChild(btn);
        });

        document.body.appendChild(dialog);
        return dialog;
    }

    // Deaktiviert alle Buttons eines Dialogs
    function lockDialog(dialog) {
        dialog.querySelectorAll('button').forEach(btn => { btn.disabled = true; });
    }

    // Button im Profilmenü hinzufügen
    function addMenuButton() {
        const profileMenu = document.querySelector('#menu_profile + .dropdown-menu');
        if (!profileMenu) {
            console.error('Profilmenü (#menu_profile + .dropdown-menu) nicht gefunden. Der Button konnte nicht hinzugefügt werden.');
            return;
        }
        if (profileMenu.querySelector('#open-extension-helper')) return;
        const menuButton = document.createElement('li');
        menuButton.setAttribute('role', 'presentation');
        const link = document.createElement('a');
        link.id = 'open-extension-helper';
        link.href = '#';
        link.innerHTML = `<span class="glyphicon glyphicon-wrench"></span>&nbsp;&nbsp; Erweiterungs-Manager`;
        link.addEventListener('click', (e) => {
            e.preventDefault();

            document.getElementById('selected-credits').textContent = '0';
            document.getElementById('selected-coins').textContent = '0';

            // Beim Öffnen immer mit der eigenen Ansicht starten
            currentView = 'personal';
            setLightboxTitleForView();

            checkPremiumAndShowHint();
            loadManualDataFromLSSM();
            initAllianceUI();
            initUserCredits();
            fetchBuildingsAndRender();
            updateBuildSelectedButton();
        });
        menuButton.appendChild(link);
        const divider = profileMenu.querySelector('li.divider');
        if (divider) {
            profileMenu.insertBefore(menuButton, divider);
        } else {
            profileMenu.appendChild(menuButton);
        }
        document.getElementById('open-extension-settings')?.addEventListener('click', openExtensionSettingsOverlay);
    }

    // Funktion, um den Premium-Status zu überprüfen
    function checkPremiumStatus() {
        const scripts = document.getElementsByTagName('script');

        for (const script of scripts) {
            const scriptContent = script.textContent || '';
            const premiumMatch = scriptContent.match(/\buser_premium\s*=\s*(true|false)\s*;/);

            if (premiumMatch) {
                return premiumMatch[1] === 'true';
            }
        }

        console.error("[Erweiterungs-Manager] 'user_premium' wurde im HTML nicht gefunden.");
        return false;
    }

    // Funktion zur Prüfung von Premium und Hinweis
    async function checkPremiumAndShowHint() {
        const openLightbox = () => {
            const box = document.getElementById('extension-lightbox');

            if (box) {
                box.style.display = 'flex';
                fetchBuildingsAndRender();
            }
        };

        if (checkPremiumStatus()) {
            openLightbox();
            return;
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = 'extension-custom-alert';

        const alertText = document.createElement('p');
        alertText.textContent = 'Du kannst dieses Script nur mit Einschränkungen nutzen da du keinen Premium-Account hast.';

        const okButton = createButton('OK');
        okButton.addEventListener('click', () => {
            alertDiv.remove();
            openLightbox();
        });

        alertDiv.append(alertText, okButton);
        document.body.appendChild(alertDiv);
    }

    // Daten von der LSSM API beziehen
    async function loadManualDataFromLSSM() {
        const response = await fetch('https://api.lss-manager.de/de_DE/buildings', {
            method: 'GET',
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`[LSSM] API HTTP-Fehler: ${response.status}`);
        }

        const json = await response.json();
        const buildings = json?.buildings ?? json;

        if (!buildings || typeof buildings !== 'object') {
            throw new Error('[LSSM] Ungültige Gebäude-Daten erhalten.');
        }

        const extensionsData = {};
        const storageData = {};
        const levelsData = {};

        for (const [key, apiId] of Object.entries(buildingTypeApiMapping)) {
            const building = buildings[String(apiId)];

            if (!building) {
                console.warn(`[LSSM] Gebäudetyp ${apiId} für "${key}" wurde nicht gefunden.`);
                continue;
            }

            if (Array.isArray(building.extensions)) {
                extensionsData[key] = building.extensions
                    .map((extension, idx) => {
                    if (!extension) return null;

                    // Nutze, falls vorhanden, die echte API-ID / type_id.
                    const extensionApiId = Number(extension.type_id ?? extension.typeId ?? extension.id ?? idx);

                    return {
                        id: extensionApiId,
                        _index: idx,
                        name: extension.caption ?? `Erweiterung ${extensionApiId}`,
                        cost: Number(extension.credits ?? 0),
                        coins: Number(extension.coins ?? 0),
                        cannotDisable: extension.cannotDisable === true
                    };
                })
                    .filter(Boolean);
            }

            if (building.storageUpgrades && typeof building.storageUpgrades === 'object') {
                storageData[key] = Object.entries(building.storageUpgrades)
                    .map(([id, storage]) => {
                    if (!storage) return null;

                    return {
                        id,
                        name: storage.caption ?? id,
                        cost: Number(storage.credits ?? 0),
                        coins: Number(storage.coins ?? 0),
                        additionalStorage: Number(storage.additionalStorage ?? 0)
                    };
                })
                    .filter(Boolean);
            }

            if (building.levelPrices && Array.isArray(building.levelPrices.credits)) {
                const credits = building.levelPrices.credits;
                const coins = Array.isArray(building.levelPrices.coins) ? building.levelPrices.coins : [];

                levelsData[key] = credits.map((cost, id) => ({
                    id: id + 1,
                    name: String(id + 1),
                    cost: Number(cost ?? 0),
                    coins: Number(coins[id] ?? 0)
                }));
            }
        }

        Object.assign(manualExtensions, extensionsData);
        Object.assign(manualStorageRooms, storageData);
        Object.assign(manualLevels, levelsData);
    }

    // Funktion um alle Daten zu sammeln
    async function fetchBuildingsAndRender() {
        const loadingText = document.getElementById('loading-text');
        const loadingProgress = document.getElementById('loading-progress');
        const loadingContainer = document.getElementById('loading-container');
        const extensionList = document.getElementById('extension-list');

        const baseText = 'Lade die Gebäudedaten, je nach Anzahl der Gebäude und Serverlast kann dies einen Augenblick dauern';
        let dotInterval;

        function startLoadingAnimation() {
            let dots = 0;
            if (loadingText) loadingText.textContent = baseText;

            dotInterval = setInterval(() => {
                dots = (dots + 1) % 4;
                if (loadingText) loadingText.textContent = baseText + '.'.repeat(dots);
            }, 500);
        }

        function stopLoadingAnimation() {
            clearInterval(dotInterval);
        }

        loadingContainer.style.display = 'block';
        extensionList.style.display = 'none';
        if (loadingProgress) loadingProgress.textContent = '';

        startLoadingAnimation();

        try {
            const limit = 1000;
            let nextPage = `/api/v2/buildings?limit=${limit}`;
            let expectedTotal = null;
            const allBuildings = [];

            while (nextPage) {
                let response = null;
                const maxAttempts = 3;
                let attempt = 0;

                while (attempt < maxAttempts) {
                    attempt++;

                    try {
                        response = await fetch(
                            nextPage + (nextPage.includes('?') ? '&' : '?') + 'ts=' + Date.now(),
                            {
                                credentials: 'same-origin',
                                cache: 'no-store',
                                headers: { 'Accept': 'application/json' }
                            }
                        );

                        if (response && response.ok) break;
                    } catch (err) {
                        console.warn(
                            `[Erweiterungs-Manager] Fehler beim Abrufen der Gebäudeseite (Versuch ${attempt}/${maxAttempts}):`,
                            err
                        );
                    }

                    if (attempt < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 400));
                    }
                }

                if (!response || !response.ok) {
                    throw new Error('Fehler beim Abrufen der Gebäudedaten');
                }

                const data = await response.json();

                if (!data || !Array.isArray(data.result)) {
                    throw new Error('Ungültige Antwort der Gebäude-V2-API');
                }

                if (expectedTotal === null && data.paging?.count_total != null) {
                    expectedTotal = Number(data.paging.count_total);
                }

                allBuildings.push(...data.result);

                if (loadingProgress) {
                    loadingProgress.textContent = expectedTotal !== null
                        ? `${allBuildings.length} von ${expectedTotal} Gebäuden geladen`
                    : `${allBuildings.length} Gebäude geladen`;
                }

                nextPage = data.paging?.next_page || null;
            }

            if (expectedTotal !== null && allBuildings.length !== expectedTotal) {
                console.warn(
                    `[Erweiterungs-Manager] Die API meldet ${expectedTotal} Gebäude, ` +
                    `geladen wurden jedoch nur ${allBuildings.length}.`
                );
            }

            buildingsData = allBuildings;
            buildingsData.forEach(building => getBuildingLevelInfo(building));

            await initUserCredits();
            await renderMissingExtensions(buildingsData);

            updateSelectedAmounts(buildingsData);

            stopLoadingAnimation();
            loadingContainer.style.display = 'none';
            extensionList.style.display = 'block';
        } catch (error) {
            stopLoadingAnimation();

            loadingContainer.style.display = 'none';
            extensionList.style.display = 'block';
            if (loadingProgress) loadingProgress.textContent = '';

            extensionList.innerHTML = 'Fehler beim Laden der Gebäudedaten.';
            console.error('[Erweiterungs-Manager] Fehler beim Laden der Gebäudedaten:', error);
        }
    }

    // Funktion um die aktuelle Credits und Coins des Users abzurufen
    async function getUserCredits(forceRefresh = false) {
        if (cachedUserInfo && !forceRefresh) {
            return cachedUserInfo;
        }

        try {
            const response = await fetch('/api/userinfo');

            if (!response.ok) {
                throw new Error('Fehler beim Abrufen der Userdaten');
            }

            const data = await response.json();

            cachedUserInfo = {
                credits: Number(data.credits_user_current) || 0,
                coins: Number(data.coins_user_current) || 0,
                premium: data.premium
            };

            return cachedUserInfo;
        } catch (error) {
            console.error('Fehler beim Abrufen der Userdaten:', error);
            throw error;
        }
    }
    async function initUserCredits(forceRefresh = false) {
        try {
            const data = await getUserCredits(forceRefresh);

            currentCredits = data.credits;
            currentCoins = data.coins;

            document.getElementById('current-credits').textContent = currentCredits.toLocaleString();
            document.getElementById('current-coins').textContent = currentCoins.toLocaleString();
            updateSelectedAmounts();
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Guthabens:', error);
        }
    }

    // Funktion, um den Namen der zugehörigen Leitstelle zu ermitteln
    function getLeitstelleName(building) {
        if (!building.leitstelle_building_id) return 'Keine Leitstelle';

        const leitstelle = buildingsData.find(b => b.id === building.leitstelle_building_id);
        return leitstelle ? leitstelle.caption : 'Unbekannt';
    }

    // Funktion um die Ausbaustufen zu ermitteln
    function getBuildingLevelInfo(building) {
        const type = building.building_type;
        const size = building.small_building ? 'small' : 'normal';
        const levelData = manualLevels[`${type}_${size}`];
        if (!levelData) return null;

        const currentLevel = typeof building.level === 'number' && building.level >= 0
        ? building.level
        : -1;

        const current = currentLevel >= 0
        ? levelData.find(l => Number(l.id) === currentLevel)
        : null;

        const next = currentLevel >= 0
        ? levelData.find(l => Number(l.id) === currentLevel + 1)
        : levelData[0];

        return { current, next, currentLevel };
    }

    // Funktion um den Gebäudetyp-Schlüssel zu beziehen
    function getBuildingTypeKey(building) {
        return `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
    }

    // Funktion zur Ermittlung von Wachen mit Spezialisierungen
    function getAvailableSpecializations(building) {
        if (building.specialization?.active || building.specialization?.available === false) {
            return [];
        }

        const buildingTypeKey = getBuildingTypeKey(building);

        const finishedExtensions = new Set(
            (building.extensions || [])
            .filter(extension => extension.available === true && extension.available_at == null)
            .map(extension => Number(extension.type_id))
        );

        return Object.entries(specializationDefinitions)
            .filter(([, definition]) =>
                    definition.buildingTypes.includes(buildingTypeKey) &&
                    finishedExtensions.has(Number(definition.extensionId))
                   )
            .map(([type, definition]) => ({
            type,
            apiType: definition.apiType,
            name: definition.name,
            coins: definition.coins
        }));
    }

    // Anzahl bereits gebauter Spezialisierungen eines Typs
    function getSpecializationCount(buildings, specializationType) {
        return buildings.filter(
            building =>
            building.specialization?.active === true &&
            building.specialization.type === specializationType
        ).length;
    }

    // Ermittelt die Credit-Kosten für die nächste Spezialisierung eines Gebäudes
    function getSpecializationCreditCost(buildings, specializationType, building) {
        const count = getSpecializationCount(buildings, specializationType) + 1;
        return getSpecializationCreditCostByCount(count, building.small_building);
    }

    // Berechnet die Credit-Kosten anhand der bisherigen Anzahl an Spezialisierungen
    function getSpecializationCreditCostByCount(count) {
        let cost = count <= 3
        ? 50000
        : Math.round(50000 + 100000 * Math.log2(count - 2));

        // Event-Rabatt auf Spezialisierungen
        const discount = getSpecializationCreditDiscount();
        if (discount > 0) {
            cost = Math.round(cost * (1 - discount / 100));
        }

        return cost;
    }

    // Aktualisiert die angezeigten Spezialisierungspreise anhand der aktuellen Auswahl
    function updateSpecializationPrices(buildings) {
        if (!Array.isArray(buildings)) return;

        const counts = {};
        const checkboxesByType = {};

        // Bereits gebaute Spezialisierungen zählen
        buildings.forEach(building => {
            const type = building.specialization?.type;

            if (building.specialization?.active && type) {
                counts[type] = (counts[type] || 0) + 1;
            }
        });

        // Alle Spezialisierungszeilen nach Typ sammeln
        document.querySelectorAll('.extension-checkbox[data-specialization-type]').forEach(cb => {
            const type = cb.dataset.apiType;
            if (!type) return;

            (checkboxesByType[type] = checkboxesByType[type] || []).push(cb);
        });

        // Preis setzen und Button aktualisieren
        const applyCost = (cb, building, position) => {
            const cost = getSpecializationCreditCostByCount(position, building.small_building);
            cb.dataset.creditCost = cost;

            const creditBtn = cb.closest('tr')?.querySelector('.credits-button');
            if (!creditBtn) return;

            creditBtn.textContent = `${formatNumber(cost)} Credits`;

            const canAfford = Number(currentCredits ?? 0) >= cost;
            creditBtn.disabled = !canAfford;
            creditBtn.title = canAfford ? '' : `Benötigt ${formatNumber(cost)} Credits`;
        };

        const findBuilding = cb =>
        buildings.find(b => String(b.id) === String(cb.dataset.buildingId));

        Object.entries(checkboxesByType).forEach(([type, checkboxes]) => {
            const selected = checkboxes
            .filter(cb => cb.checked)
            .sort((a, b) => Number(a.dataset.selectionOrder || 0) - Number(b.dataset.selectionOrder || 0));

            let position = counts[type] || 0;

            // Ausgewählte Spezialisierungen bekommen ihre feste Position
            selected.forEach(cb => {
                const building = findBuilding(cb);
                if (!building) return;

                position++;
                applyCost(cb, building, position);
            });

            // Alle nicht ausgewählten Zeilen zeigen den nächsten Preis
            const nextPosition = position + 1;

            checkboxes
                .filter(cb => !cb.checked)
                .forEach(cb => {
                const building = findBuilding(cb);
                if (!building) return;

                applyCost(cb, building, nextPosition);
            });
        });
    }

    // Ermittelt einen aktuell aktiven Event-Rabatt auf Spezialisierungen
    function getSpecializationCreditDiscount() {
        const events = document.querySelectorAll('[data-original-title], [title]');

        for (const event of events) {
            const title = event.getAttribute('data-original-title') || event.getAttribute('title') || '';
            const match = title.match(/Credits-Rabatt für Spezialisierungen:\s*-(\d+)%\s*auf Spezialisierungskosten/i);

            if (match) {
                return Number(match[1]);
            }
        }

        return 0;
    }

    // Prüft Erweiterungen anhand der Gesamtanzahl der Gebäude
    function isBuildingCountLimitReached(buildings, building, extensionId) {
        const buildingType = Number(building.building_type);
        const extensionConfig = buildingCountLimits[buildingType]?.[Number(extensionId)];

        if (!extensionConfig) return false;

        const requiredBuildings = Number(extensionConfig.requiredBuildings) || 0;
        if (requiredBuildings <= 0) return false;

        const countSmallBuildings = extensionConfig.countSmallBuildings !== false;

        const buildingCount = buildings.filter(b =>
                                               Number(b.building_type) === buildingType &&
                                               (countSmallBuildings || !b.small_building)
                                              ).length;

        const allowedCount = Math.floor(buildingCount / requiredBuildings);

        const alreadyBuiltCount = buildings.reduce((count, b) =>
                                                   count + (b.extensions || []).filter(ext => Number(ext.type_id) === Number(extensionId)).length
                                                   , 0);

        return alreadyBuiltCount >= allowedCount;
    }

    // Funktion zur Unterscheidung der Erweiterungswarteschlange zwischen Premium und Nicht Premium User
    function isExtensionLimitReached(building, extensionId) {
        const fireStationSmallAlwaysAllowed = [1, 2, 20, 21];
        const fireStationSmallLimited = [0, 6, 8, 13, 14, 16, 18, 19, 25, 30];
        const policeStationSmallAlwaysAllowed = [0, 1];
        const policeStationSmallLimited = [10, 11, 12, 13, 16];

        // Falls Premium aktiv ist, gibt es keine Einschränkungen
        if (typeof user_premium !== 'undefined' && user_premium) {
            return false;
        }

        // Schulen
        if ([1, 3, 8, 10, 27].includes(building.building_type)) {
            // Erweiterung 0 und 1 sind immer erlaubt
            if (extensionId === 0 || extensionId === 1) return false;

            // Erweiterung 2 nur erlaubt, wenn Erweiterung 0 bereits gebaut wurde
            if (extensionId === 2) {
                const hasExtension0 = building.extensions.some(ext => ext.type_id === 0);
                if (!hasExtension0) return true;
            }
        }

        // Feuerwehr (Kleinwache)
        if (building.building_type === 0 && building.small_building) {
            if (fireStationSmallAlwaysAllowed.includes(extensionId)) return false;
            return building.extensions.some(ext => fireStationSmallLimited.includes(ext.type_id));
        }

        // Polizei (Kleinwache)
        if (building.building_type === 6 && building.small_building) {
            if (policeStationSmallAlwaysAllowed.includes(extensionId)) return false;
            return building.extensions.some(ext => policeStationSmallLimited.includes(ext.type_id));
        }

        // Krankenhaus
        if (building.building_type === 4) {
            const khRequiredFirst = [0, 1];
            const khRestrictedUntilFirstTwo = [2, 3, 4, 5, 6, 7, 8];
            const khAlwaysAllowed = [9];

            if (khAlwaysAllowed.includes(extensionId)) return false;

            const hasRequiredFirstExtensions = khRequiredFirst.every(reqId =>
                                                                     building.extensions.some(ext => ext.type_id === reqId)
                                                                    );

            return khRestrictedUntilFirstTwo.includes(extensionId) && !hasRequiredFirstExtensions;
        }

        // THW
        if (building.building_type === 9) {
            const thwRequiredFirst = [0, 1];
            const thwRestrictedUntilFirstTwo = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 15];
            const thwAlwaysAllowed = [11, 14];

            if (thwAlwaysAllowed.includes(extensionId)) return false;

            const hasRequiredFirstExtensions = thwRequiredFirst.every(reqId =>
                                                                      building.extensions.some(ext => ext.type_id === reqId)
                                                                     );

            return thwRestrictedUntilFirstTwo.includes(extensionId) && !hasRequiredFirstExtensions;
        }

        // Bereitschaftspolizei
        if (building.building_type === 11) {
            const bpolAlwaysAllowed = [0, 3, 4, 6, 8, 9, 10];
            const bpolConditional = { 1: 0, 2: 1, 5: 4, 7: 8 };

            if (bpolAlwaysAllowed.includes(extensionId)) return false;
            if (bpolConditional[extensionId] !== undefined) {
                return !building.extensions.some(ext => ext.type_id === bpolConditional[extensionId]);
            }

            return false;
        }

        // Polizei-Sondereinheit
        if (building.building_type === 17) {
            const polSonderEinheitAlwaysAllowed = [0, 2, 4];
            const polSonderEinheitConditional = { 1: 0, 3: 1 };

            if (polSonderEinheitAlwaysAllowed.includes(extensionId)) return false;
            if (polSonderEinheitConditional[extensionId] !== undefined) {
                return !building.extensions.some(ext => ext.type_id === polSonderEinheitConditional[extensionId]);
            }

            return false;
        }

        return false;
    }

    // Prüft Gebäude auf Spezialisierungsausbau
    function isSpecializationBuilding(building) {
        return specializationBuildings.has(getBuildingTypeKey(building));
    }

    const STORAGE_ORDER_HINT =
          'Bitte beachte: Die Lagerräume müssen in der vorgegebenen Reihenfolge gebaut werden.\n\n' +
          'Reihenfolge:\n' +
          '1. Lagerraum\n' +
          '2. 1te zusätzlicher Lagerraum\n' +
          '3. 2te zusätzlicher Lagerraum\n' +
          '4. 3te zusätzlicher Lagerraum\n' +
          '5. 4te zusätzlicher Lagerraum\n' +
          '6. 5te zusätzlicher Lagerraum\n' +
          '7. 6te zusätzlicher Lagerraum\n' +
          '8. 7te zusätzlicher Lagerraum';

    // Funktion um die Tabellen mit Daten zu füllen
    async function renderMissingExtensions(buildings, userInfoOverride = null) {
        const isAllianceView = currentView === 'alliance';
        const userInfo = userInfoOverride
        ? userInfoOverride
        : isAllianceView
        ? { credits: Number(allianceInfo?.credits_current || 0), coins: 0, premium: false }
        : await getUserCredits();

        const list = document.getElementById('extension-list');
        if (!list) return;

        list.innerHTML = '';
        buildingGroups = {};
        buildingsData = buildings;

        const settings = getExtensionSettings();
        const liveAllianceInfo = isAllianceView ? await getAllianceInfo() : null;

        // Verbandsrechte prüfen
        if (isAllianceView && !hasAllianceBuildingRights()) {
            const message = document.createElement('div');
            message.className = 'lss-settings-message';
            message.textContent = 'Keine Berechtigung für Verbandsgebäude.';
            list.appendChild(message);
            return;
        }

        buildings.sort((a, b) =>
                       a.building_type === b.building_type
                       ? a.caption.localeCompare(b.caption)
                       : a.building_type - b.building_type
                      );

        buildings.forEach(building => {
            const baseKey = getBuildingTypeKey(building);

            // Verbandszellen nur im Verbandsbereich
            if (baseKey === '16_normal' && !isAllianceView) return;

            const extensions = Array.isArray(manualExtensions[baseKey]) ? manualExtensions[baseKey] : [];
            const storageOptions = Array.isArray(manualStorageRooms[baseKey]) ? manualStorageRooms[baseKey] : [];
            const ignoresLevelUpgrade = ignoreLevels.includes(baseKey);
            const hasLevelUpgrade =
                  !isAllianceView &&
                  !ignoresLevelUpgrade &&
                  !!getBuildingLevelInfo(building)?.next;

            const existingExtensions = new Set((building.extensions || []).map(e => Number(e.type_id)));
            const existingStorages = new Set(
                (building.storage_upgrades || []).map(u => {
                    if (u.type_id !== undefined) return String(u.type_id);
                    const key = Object.keys(u)[0];
                    return key !== undefined ? String(key) : '';
                })
            );

            // Erweiterungen filtern
            const allowedExtensions = extensions.filter(ext => {
                const key = getExtensionSettingKey(baseKey, ext.id, isAllianceView);
                if (settings[key] === false) return false;
                if (isExtensionLimitReached(building, ext.id)) return false;
                if (existingExtensions.has(Number(ext.id))) return false;

                const isForbidden = ids =>
                ids.some(id => existingExtensions.has(Number(id))) && !ids.includes(Number(ext.id));

                if (building.building_type === 0 && building.small_building) {
                    const limited = [0, 6, 8, 13, 14, 16, 18, 19, 25, 30];
                    const alwaysAllowed = [1, 2, 20, 21];
                    if (alwaysAllowed.includes(Number(ext.id))) return true;
                    return !isForbidden(limited);
                }

                if (building.building_type === 6 && building.small_building) {
                    const limited = [10, 11, 12, 13];
                    const alwaysAllowed = [0, 1];
                    if (alwaysAllowed.includes(Number(ext.id))) return true;
                    return !isForbidden(limited);
                }

                return true;
            });

            // Lagerräume filtern
            const enabledStorages = storageOptions.filter(opt => {
                const key = getStorageSettingKey(baseKey, opt.id, isAllianceView);
                return settings[key] !== false && !existingStorages.has(String(opt.id));
            });

            // Gebäude nur aufnehmen, wenn mindestens ein Bereich relevant ist
            const hasSpecialization =
                  isSpecializationBuilding(building) &&
                  getAvailableSpecializations(building).length > 0;

            if (
                allowedExtensions.length === 0 &&
                enabledStorages.length === 0 &&
                !hasLevelUpgrade &&
                !hasSpecialization
            ) return;

            buildingGroups[baseKey] = buildingGroups[baseKey] || [];
            buildingGroups[baseKey].push({
                building,
                missingExtensions: allowedExtensions,
                enabledStorages
            });
        });

        // Aktiviert/deaktiviert einen Hauptbutton samt Hinweistext
        const setAvailability = (button, available, hint) => {
            if (!button) return;
            button.disabled = !available;
            button.title = available ? '' : hint;
        };

        // UI erzeugen
        Object.entries(buildingGroups).forEach(([groupKey, group]) => {
            const header = createHeader(buildingTypeNames[groupKey] || 'Unbekannt');
            const buttons = createButtonContainer(groupKey, group, userInfo);

            buttons.container.dataset.buildingType = groupKey;

            // Lager
            const hasEnabledStorage = group.some(
                ({ enabledStorages }) => Array.isArray(enabledStorages) && enabledStorages.length > 0
            );
            setAvailability(buttons.lagerButton, hasEnabledStorage, 'Keine aktivierten Lagerräume verfügbar');

            // Erweiterungen
            const hasExtensions = group.some(
                ({ missingExtensions }) => Array.isArray(missingExtensions) && missingExtensions.length > 0
            );
            setAvailability(buttons.spoilerButton, hasExtensions, 'Keine aktivierten Erweiterungen verfügbar');

            // Ausbaustufen
            const hasLevelUpgrades =
                  !isAllianceView &&
                  !ignoreLevels.includes(groupKey) &&
                  group.some(({ building }) => !!getBuildingLevelInfo(building)?.next);
            setAvailability(buttons.levelButton, hasLevelUpgrades, 'Keine weiteren Ausbaustufen verfügbar');

            // Spezialisierungen
            const hasSpecializations = group.some(
                ({ building }) =>
                isSpecializationBuilding(building) &&
                getAvailableSpecializations(building).length > 0
            );
            setAvailability(buttons.specialButton, hasSpecializations, 'Keine Spezialisierungen verfügbar');

            // Wrapper
            const spoilerWrapper = buttons.spoilerButton && hasExtensions
            ? createToggleWrapper(
                buttons.spoilerButton,
                'spoiler-content',
                'Erweiterungen',
                createExtensionTable(
                    groupKey,
                    group,
                    userInfo,
                    buttons.buildSelectedButton,
                    isAllianceView,
                    liveAllianceInfo,
                    buildings
                )
            )
            : null;

            const lagerWrapper = buttons.lagerButton && hasEnabledStorage
            ? createToggleWrapper(
                buttons.lagerButton,
                'lager-wrapper',
                'Lagerräume',
                createLagerTable(group, userInfo, buttons.buildSelectedButton)
            )
            : null;

            const levelWrapper = buttons.levelButton && hasLevelUpgrades
            ? createToggleWrapper(
                buttons.levelButton,
                'level-wrapper',
                'Ausbaustufen',
                createLevelTable(group, userInfo)
            )
            : null;

            const specialWrapper = buttons.specialButton && hasSpecializations
            ? createToggleWrapper(
                buttons.specialButton,
                'special-wrapper',
                'Spezialisierung',
                createSpecialTable(group, userInfo, buildings)
            )
            : null;

            // Alles einfügen
            const wrappers = [spoilerWrapper, lagerWrapper, levelWrapper, specialWrapper].filter(Boolean);
            list.append(header, buttons.container, ...wrappers);

            // Wrapper gegenseitig bekannt machen
            wrappers.forEach(wrapper => {
                wrapper.otherWrappers = wrappers.filter(other => other !== wrapper);
            });
        });
    }

    // Funktion um den TabellenHeader zu erstellen
    function createHeader(title) {
        const h = document.createElement('h4');
        h.textContent = title;
        h.classList.add('building-header');
        return h;
    }

    // Funktion um den ButtonContainer zu erstellen
    function createButtonContainer(groupKey, group) {
        const container = document.createElement('div');
        container.classList.add('button-container');

        const spoilerButton = createButton('Erweiterungen', ['btn', 'spoiler-button']);
        const showLevelButton = group.some(({ building }) => allowedBuildings.has(getBuildingTypeKey(building)));
        const levelButton = showLevelButton ? createButton('Ausbaustufen', ['btn', 'level-button']) : null;
        const canBuildStorage = group.some(({ building }) =>
                                           manualStorageRooms.hasOwnProperty(getBuildingTypeKey(building))
                                          );
        const lagerButton = canBuildStorage ? createButton('Lagerräume', ['btn', 'lager-button']) : null;
        const buildSelectedButton = createButton(
            'Ausgewählte Erweiterungen/Lager bauen',
            ['btn', 'build-selected-button']
        );
        buildSelectedButton.disabled = true;
        buildSelectedButton.onclick = () => buildSelectedExtensions();

        const buildSelectedLevelsButton = createButton(
            'Ausgewählte Stufen bauen',
            ['btn', 'build-selected-levels-button']
        );
        buildSelectedLevelsButton.disabled = true;
        buildSelectedLevelsButton.onclick = () => buildSelectedLevelsAll(buildingsData);

        let specialButton = null;
        let buildSelectedSpecialButton = null;

        if (group.some(({ building }) => isSpecializationBuilding(building))) {
            specialButton = createButton('Spezialisierung', ['btn', 'special-button']);

            buildSelectedSpecialButton = createButton(
                'Ausgewählte Spezialisierungen bauen',
                ['btn', 'special-button', 'build-selected-special-button']
            );
            buildSelectedSpecialButton.disabled = true;
            buildSelectedSpecialButton.onclick = () => buildSelectedSpecializations(buildingsData);
        }

        const buildAllButton = createButton(
            'Konfiguration bei allen Wachen bauen',
            ['btn', 'build-all-button']
        );
        buildAllButton.onclick = () => showCurrencySelectionForAll(groupKey);

        [
            spoilerButton,
            lagerButton,
            buildSelectedButton,
            levelButton,
            buildSelectedLevelsButton,
            specialButton,
            buildSelectedSpecialButton,
            buildAllButton
        ]
            .filter(Boolean)
            .forEach(btn => container.appendChild(btn));

        return {
            container,
            spoilerButton,
            levelButton,
            lagerButton,
            buildSelectedLevelsButton,
            specialButton,
            buildSelectedSpecialButton,
            buildSelectedButton
        };
    }

    // Erstellt einen ein-/ausklappbaren Bereich, der von einem Button gesteuert wird.
    function createToggleWrapper(button, className, label, content) {
        const wrapper = document.createElement('div');
        wrapper.className = className;
        wrapper.baseLabel = label;
        wrapper.associatedButton = button;
        wrapper.appendChild(content);

        button.addEventListener('click', () => {
            if (button.disabled) return;

            const show = wrapper.style.display !== 'block';

            (wrapper.otherWrappers || []).forEach(other => {
                other.style.display = 'none';
                other.associatedButton.classList.remove('active-button');
                resetButtonText(other);
            });

            wrapper.style.display = show ? 'block' : 'none';
            button.textContent = show ? `${label} ausblenden` : label;
            button.classList.toggle('active-button', show);
        });

        return wrapper;
    }

    // Funktion für den Buttontext
    function resetButtonText(wrapper) {
        if (wrapper.associatedButton && wrapper.baseLabel) {
            wrapper.associatedButton.textContent = wrapper.baseLabel;
        }
    }

    // Tabelle: Erweiterungen / Lagerräume / Ausbaustufen / Spezilisierungen
    function createExtensionTable(groupKey, group, userInfo, buildSelectedButton, isAlliance = false, allianceInfo = null, buildings = []) {
        const table = document.createElement('table');

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Alle An- / Abwählen</th>
                    <th>Leitstelle</th>
                    <th>Wache/Gebäude</th>
                    <th>Baubare Erweiterungen</th>
                    <th>Bauen mit Credits</th>
                    <th>Bauen mit Coins</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        const thead = table.querySelector('thead');
        const filters = {};
        const filterElements = {};
        let manualSearchTerm = '';

        function createDropdownFilter(options, placeholder, colIndex) {
            const select = createFilterSelect([...new Set(options)].sort(), placeholder);

            select.addEventListener('change', () => {
                filters[colIndex] = select.value || undefined;
                applyAllFilters();
                updateSelectAllCheckboxState();
            });

            filterElements[colIndex] = select;
            return createHeaderCell(select);
        }

        const currentSettings = getExtensionSettings();

        function isExtensionEnabledByConfig(building, extension) {
            const baseKey = getBuildingTypeKey(building);
            const storageOptions = manualStorageRooms[baseKey];

            if (Array.isArray(storageOptions)) {
                const storage = storageOptions.find(opt => String(opt.id) === String(extension.id));

                if (storage) {
                    return currentSettings[getStorageSettingKey(baseKey, storage.id, isAlliance)] !== false;
                }
            }

            return currentSettings[getExtensionSettingKey(groupKey, extension.id, isAlliance)] !== false;
        }

        const activeGroup = group
        .map(g => ({
            ...g,
            missingExtensions: Array.isArray(g.missingExtensions)
            ? g.missingExtensions.filter(extension =>
                                         isExtensionEnabledByConfig(g.building, extension) &&
                                         !isExtensionLimitReached(g.building, extension.id) &&
                                         !isBuildingCountLimitReached(buildings, g.building, extension.id)
                                        )
            : []
        }))
        .filter(g => g.missingExtensions.length > 0);

        const leitstellen = activeGroup.map(g => getLeitstelleName(g.building));
        const wachen = activeGroup.map(g => g.building.caption);
        const erweiterungen = activeGroup.flatMap(g => g.missingExtensions.map(e => e.name));

        // Filterzeile
        const filterRow = document.createElement('tr');
        filterRow.classList.add('lss-manager-filter-row');

        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = 'select-all-checkbox';
        selectAllCheckbox.dataset.group = groupKey;

        const resetBtn = createFilterButton('Filter zurücksetzen', 'primary');
        const uncheckAllBtn = createFilterButton('Alle abwählen', 'warning');

        filterRow.append(
            createHeaderCell(selectAllCheckbox),
            createDropdownFilter(leitstellen, 'Leitstelle', 1),
            createDropdownFilter(wachen, 'Wache', 2),
            createDropdownFilter(erweiterungen, 'Erweiterung', 3),
            createHeaderCell(resetBtn),
            createHeaderCell(uncheckAllBtn)
        );

        // Suchzeile
        const searchInput = createSearchInput('Manuelle Suche: Leitstelle, Wache/Gebäude oder Erweiterung...');

        searchInput.addEventListener('input', () => {
            manualSearchTerm = searchInput.value.toLowerCase().trim();
            applyAllFilters();
            updateSelectAllCheckboxState();
        });

        thead.append(createSearchRow(searchInput, 6), filterRow);

        resetBtn.onclick = () => {
            Object.values(filterElements).forEach(select => select.selectedIndex = 0);
            Object.keys(filters).forEach(key => delete filters[key]);
            manualSearchTerm = '';
            searchInput.value = '';
            applyAllFilters();
            updateSelectAllCheckboxState();
        };

        uncheckAllBtn.onclick = () => {
            tbody.querySelectorAll('tr').forEach(row => {
                if (row.style.display === 'none') return;

                const checkbox = row.querySelector('.extension-checkbox');
                if (checkbox && !checkbox.disabled) checkbox.checked = false;
            });

            updateBuildSelectedButton();
            updateSelectAllCheckboxState();
            updateSelectedAmounts(buildingsData);
        };

        selectAllCheckbox.addEventListener('change', () => {
            const isChecked = selectAllCheckbox.checked;

            if (!isChecked) {
                tbody.querySelectorAll('tr').forEach(row => {
                    if (row.style.display === 'none') return;

                    const checkbox = row.querySelector('.extension-checkbox');
                    if (checkbox && !checkbox.disabled) checkbox.checked = false;
                });

                updateBuildSelectedButton();
                updateSelectAllCheckboxState();
                updateSelectedAmounts(buildingsData);
                return;
            }

            let totalCredits = 0;
            let totalCoins = 0;

            tbody.querySelectorAll('tr').forEach(row => {
                if (row.style.display === 'none') return;

                const checkbox = row.querySelector('.extension-checkbox');
                if (!checkbox || checkbox.disabled) return;

                totalCredits += Number(checkbox.dataset.creditCost) || 0;

                if (!isAlliance) {
                    totalCoins += Number(checkbox.dataset.coinCost) || 0;
                }
            });

            let canPayAll = false;
            let missingCredits = 0;
            let missingCoins = 0;

            if (isAlliance) {
                const availableCredits = Number(allianceInfo?.credits_current || 0);
                canPayAll = availableCredits >= totalCredits;
                missingCredits = Math.max(0, totalCredits - availableCredits);
            } else {
                const availableCredits = Number(userInfo?.credits || 0);
                const availableCoins = Number(userInfo?.coins || 0);

                canPayAll = availableCredits >= totalCredits || availableCoins >= totalCoins;
                missingCredits = Math.max(0, totalCredits - availableCredits);
                missingCoins = Math.max(0, totalCoins - availableCoins);
            }

            if (!canPayAll) {
                let message;

                if (isAlliance) {
                    const availableCredits = Number(allianceInfo?.credits_current || 0);

                    message =
                        'Die Auswahl übersteigt das verfügbare Verbandsguthaben.\n\n' +
                        `Benötigte Verbands-Credits: ${formatNumber(totalCredits)}\n` +
                        `Verfügbare Verbands-Credits: ${formatNumber(availableCredits)}\n` +
                        `Fehlende Verbands-Credits: ${formatNumber(missingCredits)}`;
                } else {
                    message = 'Deine Auswahl übersteigt dein aktuelles Guthaben.\n\n';
                    if (missingCredits > 0) message += `Fehlende Credits: ${formatNumber(missingCredits)}\n`;
                    if (missingCoins > 0) message += `Fehlende Coins: ${formatNumber(missingCoins)}\n`;
                }

                alert(message);
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
                return;
            }

            tbody.querySelectorAll('tr').forEach(row => {
                if (row.style.display === 'none') return;

                const checkbox = row.querySelector('.extension-checkbox');
                if (checkbox && !checkbox.disabled) checkbox.checked = true;
            });

            updateBuildSelectedButton();
            updateSelectAllCheckboxState();
            updateSelectedAmounts(buildingsData);
        });

        // Zeilen
        activeGroup.forEach(({ building, missingExtensions }) => {
            missingExtensions.forEach(extension => {
                if (isExtensionLimitReached(building, extension.id)) return;

                const limitReached = isBuildingCountLimitReached(buildings, building, extension.id);
                const limitHint = 'Gebäudeanzahl-Limit für diese Erweiterung erreicht';

                const row = document.createElement('tr');
                row.classList.add(`row-${building.id}-${extension.id}`);

                if (limitReached) {
                    row.classList.add('limit-reached');
                    row.title = limitHint;
                }

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'extension-checkbox';
                checkbox.dataset.buildingId = building.id;
                checkbox.dataset.extensionId = extension.id;
                checkbox.dataset.creditCost = Number(extension.cost) || 0;
                checkbox.dataset.coinCost = isAlliance ? 0 : Number(extension.coins) || 0;

                if (limitReached) {
                    checkbox.disabled = true;
                    checkbox.title = limitHint;
                } else if (isAlliance) {
                    checkbox.disabled = Number(allianceInfo?.credits_current || 0) < Number(extension.cost || 0);
                } else {
                    checkbox.disabled =
                        Number(userInfo?.credits || 0) < Number(extension.cost || 0) &&
                        Number(userInfo?.coins || 0) < Number(extension.coins || 0);
                }

                checkbox.addEventListener('change', () => {
                    updateBuildSelectedButton();
                    updateSelectedAmounts(buildingsData);
                    updateSelectAllCheckboxState();
                });

                const checkboxCell = document.createElement('td');
                checkboxCell.appendChild(checkbox);

                row.append(
                    checkboxCell,
                    createTextCell(getLeitstelleName(building)),
                    createTextCell(building.caption),
                    createTextCell(extension.name)
                );

                // Credits
                const creditCell = document.createElement('td');
                const creditBtn = createButton(`${formatNumber(extension.cost)} Credits`, ['btn', 'btn-xl', 'credit-button']);

                if (limitReached) {
                    creditBtn.disabled = true;
                    creditBtn.title = limitHint;
                } else if (isAlliance) {
                    creditBtn.disabled = Number(allianceInfo?.credits_current || 0) < Number(extension.cost || 0);
                } else {
                    creditBtn.disabled = Number(userInfo?.credits || 0) < Number(extension.cost || 0);
                }

                creditBtn.onclick = async () => {
                    await buildExtension(building, extension.id, 'credits', extension.cost, row, isAlliance);

                    const cb = row.querySelector('.extension-checkbox');
                    if (cb) cb.checked = false;

                    if (isAlliance) {
                        allianceInfo = await getAllianceInfo();
                    } else {
                        await initUserCredits();
                    }

                    updateBuildSelectedButton();
                    updateSelectedAmounts(buildingsData);
                    updateSelectAllCheckboxState();
                };

                creditCell.appendChild(creditBtn);
                row.appendChild(creditCell);

                // Coins
                const coinsCell = document.createElement('td');

                if (isAlliance) {
                    coinsCell.textContent = 'Nicht verfügbar';
                    coinsCell.classList.add('is-unavailable');
                } else {
                    const coinBtn = createButton(`${formatNumber(extension.coins)} Coins`, ['btn', 'btn-xl', 'coins-button']);

                    if (limitReached) {
                        coinBtn.disabled = true;
                        coinBtn.title = limitHint;
                    } else {
                        coinBtn.disabled = Number(userInfo?.coins || 0) < Number(extension.coins || 0);
                    }

                    coinBtn.onclick = async () => {
                        await buildExtension(building, extension.id, 'coins', extension.coins, row, false);

                        const cb = row.querySelector('.extension-checkbox');
                        if (cb) cb.checked = false;

                        await initUserCredits();

                        updateBuildSelectedButton();
                        updateSelectedAmounts(buildingsData);
                        updateSelectAllCheckboxState();
                    };

                    coinsCell.appendChild(coinBtn);
                }

                row.appendChild(coinsCell);
                tbody.appendChild(row);
            });
        });

        function applyAllFilters() {
            tbody.querySelectorAll('tr').forEach(row => {
                const filterMatch = Object.entries(filters).every(([index, value]) =>
                                                                  !value ||
                                                                  row.children[index]?.textContent.trim().toLowerCase() === value.toLowerCase()
                                                                 );

                const searchMatch =
                      !manualSearchTerm ||
                      [1, 2, 3].some(index =>
                                     row.children[index]?.textContent.toLowerCase().includes(manualSearchTerm)
                                    );

                row.style.display = filterMatch && searchMatch ? '' : 'none';
            });
        }

        function updateSelectAllCheckboxState() {
            let total = 0;
            let checked = 0;

            tbody.querySelectorAll('tr').forEach(row => {
                if (row.style.display === 'none') return;

                const checkbox = row.querySelector('.extension-checkbox');

                if (checkbox && !checkbox.disabled) {
                    total++;
                    if (checkbox.checked) checked++;
                }
            });

            selectAllCheckbox.checked = total > 0 && total === checked;
            selectAllCheckbox.indeterminate = checked > 0 && checked < total;
            selectAllCheckbox.disabled = total === 0;
        }

        updateSelectAllCheckboxState();

        return table;
    }
    function createLagerTable(group, userInfo, buildSelectedButton, currentGroupKey) {
        const liveBuiltStorages = {};
        const currentCredits = Number(userInfo?.credits || 0);
        const currentCoins = Number(userInfo?.coins || 0);

        const getStorageIds = building => new Set(
            (building.storage_upgrades || []).map(u => {
                if (u.type_id !== undefined) return String(u.type_id);
                const key = Object.keys(u)[0];
                return key !== undefined ? String(key) : '';
            })
        );

        group.forEach(({ building }) => {
            liveBuiltStorages[building.id] = getStorageIds(building);
        });

        const table = document.createElement('table');

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Alle An- / Abwählen</th>
                    <th>Leitstelle</th>
                    <th>Wache</th>
                    <th>Baubare Lager</th>
                    <th>Lagerkapazität</th>
                    <th>Credits</th>
                    <th>Coins</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        const thead = table.querySelector('thead');
        const filters = {};
        const filterElements = {};
        let manualSearchTerm = '';

        function createDropdownFilter(options, placeholder, colIndex) {
            const select = createFilterSelect([...new Set(options)].sort(), placeholder);

            select.addEventListener('change', () => {
                filters[colIndex] = select.value || undefined;
                applyAllFilters();
                updateSelectAllCheckboxState();
            });

            filterElements[colIndex] = select;
            return createHeaderCell(select);
        }

        const leitstellen = [];
        const wachen = [];
        const lagerArten = [];

        group.forEach(({ building }) => {
            const baseKey = getBuildingTypeKey(building);
            const options = manualStorageRooms[baseKey];
            if (!options) return;

            const current = liveBuiltStorages[building.id];

            options.forEach(opt => {
                const id = String(opt.id);
                if (current.has(id)) return;

                const storageKey = getStorageSettingKey(baseKey, opt.id, currentView === 'alliance');
                if (getExtensionSettings()[storageKey] === false) return;

                leitstellen.push(getLeitstelleName(building));
                wachen.push(building.caption);
                lagerArten.push(opt.name);

                const row = document.createElement('tr');
                row.classList.add(`storage-row-${building.id}-${opt.id}`);

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'storage-checkbox';
                checkbox.dataset.buildingId = building.id;
                checkbox.dataset.storageType = opt.id;
                checkbox.dataset.creditCost = Number(opt.cost) || 0;
                checkbox.dataset.coinCost = Number(opt.coins) || 0;
                checkbox.disabled = currentCredits < Number(opt.cost || 0) && currentCoins < Number(opt.coins || 0);

                checkbox.addEventListener('change', () => {
                    updateBuildSelectedButton();
                    updateSelectedAmounts(buildingsData);
                    updateSelectAllCheckboxState();
                });

                const checkboxCell = document.createElement('td');
                checkboxCell.appendChild(checkbox);

                row.append(
                    checkboxCell,
                    createTextCell(getLeitstelleName(building)),
                    createTextCell(building.caption),
                    createTextCell(opt.name),
                    createTextCell(`+${opt.additionalStorage}`)
                );

                const creditBtn = createButton(`${formatNumber(opt.cost)} Credits`, ['btn', 'btn-xl', 'credit-button']);
                creditBtn.disabled = currentCredits < Number(opt.cost || 0);

                const coinBtn = createButton(`${formatNumber(opt.coins)} Coins`, ['btn', 'btn-xl', 'coins-button']);
                coinBtn.disabled = currentCoins < Number(opt.coins || 0);

                // Gemeinsamer Ablauf für Credits und Coins
                const buildFromButton = async (currency, amount) => {
                    if (!canBuildStorageInOrder(building.id, opt.id)) {
                        alert(STORAGE_ORDER_HINT);
                        return;
                    }

                    await buildStorage(building, opt.id, currency, amount, row);
                    liveBuiltStorages[building.id].add(id);

                    creditBtn.disabled = true;
                    coinBtn.disabled = true;
                    checkbox.disabled = true;

                    await initUserCredits();
                    updateBuildSelectedButton();
                    updateSelectedAmounts(buildingsData);
                    updateSelectAllCheckboxState();
                };

                creditBtn.onclick = () => buildFromButton('credits', opt.cost);
                coinBtn.onclick = () => buildFromButton('coins', opt.coins);

                const creditCell = document.createElement('td');
                creditCell.appendChild(creditBtn);

                const coinsCell = document.createElement('td');
                coinsCell.appendChild(coinBtn);

                row.append(creditCell, coinsCell);
                tbody.appendChild(row);
            });
        });

        // Filterzeile
        const filterRow = document.createElement('tr');
        filterRow.classList.add('lss-manager-filter-row');

        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = 'select-all-checkbox-lager';

        const resetBtn = createFilterButton('Filter zurücksetzen', 'primary');
        const uncheckAllBtn = createFilterButton('Alle abwählen', 'warning');

        filterRow.append(
            createHeaderCell(selectAllCheckbox),
            createDropdownFilter(leitstellen, 'Leitstelle', 1),
            createDropdownFilter(wachen, 'Wache', 2),
            createDropdownFilter(lagerArten, 'Lager', 3),
            createHeaderCell(resetBtn),
            createHeaderCell(uncheckAllBtn)
        );

        // Suchzeile
        const searchInput = createSearchInput('Manuelle Suche: Leitstelle, Wache oder Lager...');

        searchInput.addEventListener('input', () => {
            manualSearchTerm = searchInput.value.toLowerCase().trim();
            applyAllFilters();
            updateSelectAllCheckboxState();
        });

        thead.append(createSearchRow(searchInput, 7), filterRow);

        resetBtn.onclick = () => {
            Object.values(filterElements).forEach(select => select.selectedIndex = 0);
            Object.keys(filters).forEach(key => delete filters[key]);
            manualSearchTerm = '';
            searchInput.value = '';
            applyAllFilters();
            updateSelectAllCheckboxState();
        };

        uncheckAllBtn.onclick = () => {
            tbody.querySelectorAll('tr').forEach(row => {
                if (row.style.display === 'none') return;

                const cb = row.querySelector('.storage-checkbox');
                if (cb && !cb.disabled) cb.checked = false;
            });

            updateBuildSelectedButton();
            updateSelectAllCheckboxState();
            updateSelectedAmounts(buildingsData);
        };

        selectAllCheckbox.addEventListener('change', () => {
            const isChecked = selectAllCheckbox.checked;
            let totalCredits = 0;
            let totalCoins = 0;
            const rows = tbody.querySelectorAll('tr');

            rows.forEach(row => {
                if (row.style.display === 'none') return;

                const cb = row.querySelector('.storage-checkbox');
                if (!cb || cb.disabled) return;

                if (isChecked) {
                    totalCredits += Number(cb.dataset.creditCost) || 0;
                    totalCoins += Number(cb.dataset.coinCost) || 0;
                }
            });

            if (isChecked && currentCredits < totalCredits && currentCoins < totalCoins) {
                const missingCredits = Math.max(0, totalCredits - currentCredits);
                const missingCoins = Math.max(0, totalCoins - currentCoins);

                let message = 'Deine Auswahl übersteigt dein aktuelles Guthaben.\n\n';
                if (missingCredits > 0) message += `Fehlende Credits: ${formatNumber(missingCredits)}\n`;
                if (missingCoins > 0) message += `Fehlende Coins: ${formatNumber(missingCoins)}\n`;

                alert(message);
                selectAllCheckbox.checked = false;
                return;
            }

            rows.forEach(row => {
                if (row.style.display === 'none') return;

                const cb = row.querySelector('.storage-checkbox');
                if (cb && !cb.disabled) cb.checked = isChecked;
            });

            updateSelectAllCheckboxState();
            updateBuildSelectedButton();
            updateSelectedAmounts(buildingsData);
        });

        function applyAllFilters() {
            tbody.querySelectorAll('tr').forEach(row => {
                const filterMatch = Object.entries(filters).every(([index, value]) =>
                                                                  !value || row.children[index]?.textContent.trim().toLowerCase() === value.toLowerCase()
                                                                 );

                const searchMatch = !manualSearchTerm || [1, 2, 3].some(index =>
                                                                        row.children[index]?.textContent.toLowerCase().includes(manualSearchTerm)
                                                                       );

                row.style.display = filterMatch && searchMatch ? '' : 'none';
            });
        }

        function updateSelectAllCheckboxState() {
            const selectableRows = [...tbody.querySelectorAll('tr')].filter(row => {
                if (row.style.display === 'none') return false;

                const cb = row.querySelector('.storage-checkbox');
                return cb && !cb.disabled;
            });

            if (selectableRows.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.disabled = true;
                return;
            }

            selectAllCheckbox.disabled = false;

            const allChecked = selectableRows.every(row => row.querySelector('.storage-checkbox').checked);
            const noneChecked = selectableRows.every(row => !row.querySelector('.storage-checkbox').checked);

            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
        }

        updateSelectAllCheckboxState();

        if (!storageGroups[currentGroupKey]) {
            storageGroups[currentGroupKey] = [];
        }

        group.forEach(({ building }) => {
            const baseKey = getBuildingTypeKey(building);
            const options = manualStorageRooms[baseKey];
            if (!options) return;

            const current = getStorageIds(building);
            const missingExtensions = [];

            options.forEach(opt => {
                const id = String(opt.id);
                if (current.has(id)) return;

                const storageKey = getStorageSettingKey(baseKey, opt.id, currentView === 'alliance');
                if (getExtensionSettings()[storageKey] === false) return;

                missingExtensions.push({
                    id: opt.id,
                    cost: opt.cost,
                    coins: opt.coins,
                    isStorage: true
                });
            });

            if (missingExtensions.length > 0) {
                storageGroups[currentGroupKey].push({ building, missingExtensions });
            }
        });

        return table;
    }
    function createLevelTable(group, userInfo) {
        function updateBuildButtons(building, selectedLevelId, creditCell, coinCell, levelList, currentLevel) {
            creditCell.replaceChildren();
            coinCell.replaceChildren();

            if (selectedLevelId === null) {
                const creditBtn = createButton('0 Credits', ['btn', 'btn-sm', 'credit-button']);
                const coinBtn = createButton('0 Coins', ['btn', 'btn-sm', 'coins-button']);
                creditBtn.disabled = true;
                coinBtn.disabled = true;

                creditCell.appendChild(creditBtn);
                coinCell.appendChild(coinBtn);
                return;
            }

            let totalCredits = 0;
            let totalCoins = 0;

            if (selectedLevelId >= currentLevel) {
                for (let levelId = currentLevel + 1; levelId <= selectedLevelId; levelId++) {
                    const stufe = levelList.find(level => level.id === levelId);
                    if (!stufe) continue;

                    totalCredits += stufe.cost || 0;
                    totalCoins += stufe.coins || 0;
                }
            }

            // Gemeinsamer Ablauf für Credits und Coins
            const buildWith = async (currency, available, total, notEnoughText, errorText) => {
                if (available < total) {
                    alert(notEnoughText);
                    return;
                }

                try {
                    await buildLevel(building.id, currency, selectedLevelId);

                    for (const b of group) {
                        selectedLevels[b.building.id] = getBuildingLevelInfo(b.building)?.currentLevel ?? 0;
                    }

                    fetchBuildingsAndRender();
                    updateSelectedAmounts(buildingsData);
                    updateBuildSelectedLevelsButtonState(group);
                } catch {
                    alert(errorText);
                }
            };

            const creditBtn = createButton(`${totalCredits.toLocaleString()} Credits`, ['btn', 'btn-sm', 'credit-button']);
            creditBtn.disabled = userInfo.credits < totalCredits || totalCredits === 0;
            creditBtn.onclick = () =>
            buildWith('credits', userInfo.credits, totalCredits, 'Nicht genug Credits!', 'Fehler beim Bauen mit Credits.');

            const coinBtn = createButton(`${totalCoins.toLocaleString()} Coins`, ['btn', 'btn-sm', 'coins-button']);
            coinBtn.disabled = userInfo.coins < totalCoins || totalCoins === 0;
            coinBtn.onclick = () =>
            buildWith('coins', userInfo.coins, totalCoins, 'Nicht genug Coins!', 'Fehler beim Bauen mit Coins.');

            creditCell.appendChild(creditBtn);
            coinCell.appendChild(coinBtn);
        }

        const table = document.createElement('table');

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Leitstelle</th>
                    <th>Wache</th>
                    <th>Stufe</th>
                    <th>Ausbaustufe wählen</th>
                    <th>Bauen mit Credits</th>
                    <th>Bauen mit Coins</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        const thead = table.querySelector('thead');

        const leitstelleOptions = [...new Set(group.map(({ building }) => getLeitstelleName(building)))].sort();
        const wacheOptions = [...new Set(group.map(({ building }) => building.caption || '-'))].sort();

        const stufeOptions = [...new Set(
            group
            .filter(({ building }) => {
                const info = getBuildingLevelInfo(building);
                if (!info) return false;

                const levelList = manualLevels[getBuildingTypeKey(building)];
                if (!levelList) return false;

                return info.currentLevel < levelList.length;
            })
            .map(({ building }) => {
                const info = getBuildingLevelInfo(building);
                return info ? info.currentLevel.toString() : null;
            })
            .filter(x => x !== null && x !== '-1')
        )].sort((a, b) => Number(a) - Number(b));

        const leitstelleSelect = createFilterSelect(leitstelleOptions, 'Leitstellen');
        const wacheSelect = createFilterSelect(wacheOptions, 'Wachen');
        const stufeSelect = createFilterSelect(stufeOptions, 'Stufe');

        // Globale Stufenauswahl
        const allLevelIds = new Set();

        group.forEach(({ building }) => {
            const levelList = manualLevels[getBuildingTypeKey(building)];
            if (levelList) levelList.forEach(level => allLevelIds.add(level.id));
        });

        const globalLevelSelect = createFilterSelect([], 'Globale Stufenauswahl', 'is-auto');

        [...allLevelIds].sort((a, b) => a - b).forEach(levelId => {
            const opt = document.createElement('option');
            opt.value = levelId;
            opt.textContent = `Stufe ${levelId}`;
            globalLevelSelect.appendChild(opt);
        });

        const clearLevelsBtn = createFilterButton('Stufenauswahl löschen', 'danger');
        const clearLevelsTh = createHeaderCell(clearLevelsBtn);
        clearLevelsTh.appendChild(globalLevelSelect);

        const resetBtn = createFilterButton('Filter zurücksetzen', 'primary');

        const filterRow = document.createElement('tr');
        filterRow.classList.add('lss-manager-filter-row');
        filterRow.append(
            createHeaderCell(leitstelleSelect),
            createHeaderCell(wacheSelect),
            createHeaderCell(stufeSelect),
            clearLevelsTh,
            createHeaderCell(),
            createHeaderCell(resetBtn)
        );

        // Suchzeile
        const searchInput = createSearchInput('Manuelle Suche: Leitstelle, Wache oder Stufe...');

        searchInput.addEventListener('input', () => {
            manualSearchTerm = searchInput.value.toLowerCase().trim();
            applyFilters();
        });

        thead.append(createSearchRow(searchInput, 6), filterRow);

        function applyFilters() {
            const selectedLeitstelle = leitstelleSelect.value;
            const selectedWache = wacheSelect.value;
            const selectedStufe = stufeSelect.value;

            tbody.querySelectorAll('tr').forEach(row => {
                const leitstelle = row.children[0]?.textContent.trim() || '';
                const wache = row.children[1]?.textContent.trim() || '';
                const stufe = row.children[2]?.textContent.trim() || '';

                const matchFilter =
                      (!selectedLeitstelle || leitstelle === selectedLeitstelle) &&
                      (!selectedWache || wache === selectedWache) &&
                      (!selectedStufe || stufe === selectedStufe);

                const matchSearch = !manualSearchTerm ||
                      leitstelle.toLowerCase().includes(manualSearchTerm) ||
                      wache.toLowerCase().includes(manualSearchTerm) ||
                      stufe.toLowerCase().includes(manualSearchTerm);

                row.style.display = matchFilter && matchSearch ? '' : 'none';
            });
        }

        [leitstelleSelect, wacheSelect, stufeSelect].forEach(select =>
                                                             select.addEventListener('change', applyFilters)
                                                            );

        resetBtn.onclick = () => {
            [leitstelleSelect, wacheSelect, stufeSelect].forEach(select => select.selectedIndex = 0);
            manualSearchTerm = '';
            searchInput.value = '';
            applyFilters();
        };

        clearLevelsBtn.onclick = () => {
            for (const id in selectedLevels) {
                selectedLevels[id] = null;
            }

            tbody.querySelectorAll('tr').forEach(row => {
                if (row.style.display === 'none') return;

                row.children[3]?.querySelectorAll('button').forEach(btn => {
                    btn.dataset.active = 'false';
                });

                const buildingData = group.find(g => g.building.id == row.dataset.buildingId);
                if (!buildingData) return;

                const levelInfo = getBuildingLevelInfo(buildingData.building);
                const levelList = manualLevels[getBuildingTypeKey(buildingData.building)];
                if (!levelInfo || !levelList) return;

                updateBuildButtons(
                    buildingData.building,
                    null,
                    row.children[4],
                    row.children[5],
                    levelList,
                    levelInfo.currentLevel
                );
            });

            updateSelectedAmounts(buildingsData);
            updateBuildSelectedLevelsButtonState(group);
        };

        globalLevelSelect.addEventListener('change', () => {
            const selectedLevelId = globalLevelSelect.value === '' ? null : Number(globalLevelSelect.value);
            if (selectedLevelId === null) return;

            tbody.querySelectorAll('tr').forEach(row => {
                if (row.style.display === 'none') return;

                const buildingData = group.find(g => g.building.id == row.dataset.buildingId);
                if (!buildingData) return;

                const levelInfo = getBuildingLevelInfo(buildingData.building);
                if (!levelInfo) return;

                const levelList = manualLevels[getBuildingTypeKey(buildingData.building)];
                if (!levelList) return;

                const maxLevel = Math.max(...levelList.map(level => Number(level.id)));

                if (selectedLevelId <= maxLevel && selectedLevelId > levelInfo.currentLevel) {
                    selectedLevels[buildingData.building.id] = selectedLevelId;

                    row.children[3].querySelectorAll('button').forEach(btn => {
                        btn.dataset.active = btn.getAttribute('level') == selectedLevelId ? 'true' : 'false';
                    });

                    updateBuildButtons(
                        buildingData.building,
                        selectedLevelId,
                        row.children[4],
                        row.children[5],
                        levelList,
                        levelInfo.currentLevel
                    );
                }
            });

            updateSelectedAmounts(buildingsData);
            updateBuildSelectedLevelsButtonState(group);
            globalLevelSelect.selectedIndex = 0;
        });

        // Zeilen
        group.forEach(({ building }) => {
            const levelInfo = getBuildingLevelInfo(building);
            if (!levelInfo) return;

            const currentLevel = levelInfo.currentLevel;
            const levelList = manualLevels[getBuildingTypeKey(building)];
            if (!levelList) return;

            const maxLevel = Math.max(...levelList.map(level => Number(level.id)));
            if (currentLevel >= maxLevel) return;

            selectedLevels[building.id] = null;

            const row = document.createElement('tr');
            row.dataset.buildingId = building.id;

            const levelChoiceCell = document.createElement('td');
            const creditCell = document.createElement('td');
            const coinCell = document.createElement('td');

            row.append(
                createTextCell(getLeitstelleName(building)),
                createTextCell(building.caption || '-'),
                createTextCell(currentLevel.toString()),
                levelChoiceCell,
                creditCell,
                coinCell
            );

            updateBuildButtons(building, null, creditCell, coinCell, levelList, currentLevel);

            levelList.forEach(stufe => {
                if (stufe.id <= currentLevel) return;

                const lvlBtn = document.createElement('button');
                lvlBtn.textContent = stufe.id.toString();
                lvlBtn.className = 'expand_direct level-choice-button';
                lvlBtn.setAttribute('level', stufe.id.toString());
                lvlBtn.dataset.active = 'false';

                lvlBtn.onclick = () => {
                    let totalCredits = 0;
                    let totalCoins = 0;

                    for (let levelId = currentLevel + 1; levelId <= stufe.id; levelId++) {
                        const s = levelList.find(level => level.id === levelId);
                        if (!s) continue;

                        totalCredits += s.cost || 0;
                        totalCoins += s.coins || 0;
                    }

                    const canPayWithCredits = userInfo.credits >= totalCredits && totalCredits > 0;
                    const canPayWithCoins = userInfo.coins >= totalCoins && totalCoins > 0;

                    if (!canPayWithCredits && !canPayWithCoins) {
                        alert('Nicht genug Credits oder Coins für diese Stufe!');
                        return;
                    }

                    levelChoiceCell.querySelectorAll('button').forEach(btn => {
                        btn.dataset.active = 'false';
                    });

                    lvlBtn.dataset.active = 'true';
                    selectedLevels[building.id] = stufe.id;

                    updateBuildButtons(building, stufe.id, creditCell, coinCell, levelList, currentLevel);
                    updateSelectedAmounts(buildingsData);
                    updateBuildSelectedLevelsButtonState(group);
                };

                levelChoiceCell.appendChild(lvlBtn);
            });

            // Auswahl zurücksetzen (Optik kommt von level-choice-button + btn-danger)
            const trashBtn = createButton('🗑️', ['btn-danger', 'level-choice-button']);
            trashBtn.title = 'Auswahl zurücksetzen';

            trashBtn.onclick = () => {
                selectedLevels[building.id] = null;

                levelChoiceCell.querySelectorAll('button').forEach(btn => {
                    btn.dataset.active = 'false';
                });

                updateBuildButtons(building, null, creditCell, coinCell, levelList, currentLevel);
                updateSelectedAmounts(buildingsData);
                updateBuildSelectedLevelsButtonState(group);
            };

            levelChoiceCell.appendChild(trashBtn);
            tbody.appendChild(row);
        });

        return table;
    }
    function createSpecialTable(group, userInfo, buildings) {
        const table = document.createElement('table');

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Alle An- / Abwählen</th>
                    <th>Leitstelle</th>
                    <th>Wache</th>
                    <th>Spezialisierung</th>
                    <th>Bauen mit Credits</th>
                    <th>Bauen mit Coins</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        const thead = table.querySelector('thead');
        const filters = {};
        const filterElements = {};
        let manualSearchTerm = '';

        function createDropdownFilter(options, placeholder, colIndex) {
            const select = createFilterSelect(
                [...new Set(options)].sort((a, b) => String(a).localeCompare(String(b))),
                placeholder
            );

            select.addEventListener('change', () => {
                filters[colIndex] = select.value || undefined;
                applyAllFilters();
                updateSelectAllCheckboxState();
            });

            filterElements[colIndex] = select;
            return createHeaderCell(select);
        }

        const specializationRows = [];

        group
            .map(item => item?.building)
            .filter(building => building && isSpecializationBuilding(building))
            .forEach(building => {
            getAvailableSpecializations(building).forEach(specialization => {
                specializationRows.push({
                    building,
                    leitstelle: getLeitstelleName(building),
                    wache: building.caption || '-',
                    specialization
                });
            });
        });

        if (!specializationRows.length) {
            const row = document.createElement('tr');
            const cell = createTextCell('Keine baubaren Spezialisierungen vorhanden.');
            cell.colSpan = 6;
            cell.classList.add('lss-empty');
            row.appendChild(cell);
            tbody.appendChild(row);
            return table;
        }

        // Filterzeile
        const filterRow = document.createElement('tr');
        filterRow.classList.add('lss-manager-filter-row');

        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = 'select-all-checkbox';
        selectAllCheckbox.dataset.group = 'specializations';

        const resetBtn = createFilterButton('Filter zurücksetzen', 'primary');
        const uncheckBtn = createFilterButton('Alle abwählen', 'warning');

        filterRow.append(
            createHeaderCell(selectAllCheckbox),
            createDropdownFilter(specializationRows.map(r => r.leitstelle), 'Leitstelle', 1),
            createDropdownFilter(specializationRows.map(r => r.wache), 'Wache', 2),
            createDropdownFilter(specializationRows.map(r => r.specialization.name), 'Spezialisierung', 3),
            createHeaderCell(resetBtn),
            createHeaderCell(uncheckBtn)
        );

        // Suchzeile
        const searchInput = createSearchInput('Manuelle Suche: Leitstelle, Wache oder Spezialisierung...');

        searchInput.addEventListener('input', () => {
            manualSearchTerm = searchInput.value.toLowerCase().trim();
            applyAllFilters();
            updateSelectAllCheckboxState();
        });

        thead.append(createSearchRow(searchInput, 6), filterRow);

        // Gemeinsame Aktualisierung nach Auswahländerungen
        const refreshSelection = () => {
            updateSpecializationPrices(buildings);
            updateSelectedAmounts(buildings);
            updateBuildSelectedButton();
            updateSelectedSpecializationButton();
            updateSelectAllCheckboxState();
        };

        resetBtn.onclick = () => {
            Object.values(filterElements).forEach(select => select.selectedIndex = 0);
            Object.keys(filters).forEach(key => delete filters[key]);
            manualSearchTerm = '';
            searchInput.value = '';
            applyAllFilters();
            updateSelectAllCheckboxState();
        };

        uncheckBtn.onclick = () => {
            tbody.querySelectorAll('tr').forEach(row => {
                if (row.style.display === 'none') return;

                const cb = row.querySelector('.extension-checkbox');
                if (cb && !cb.disabled) cb.checked = false;
            });

            refreshSelection();
        };

        selectAllCheckbox.addEventListener('change', () => {
            tbody.querySelectorAll('tr').forEach(row => {
                if (row.style.display === 'none') return;

                const cb = row.querySelector('.extension-checkbox');
                if (cb && !cb.disabled) cb.checked = selectAllCheckbox.checked;
            });

            refreshSelection();
        });

        // Zeilen
        specializationRows.forEach(({ building, leitstelle, wache, specialization }) => {
            const creditCost = getSpecializationCreditCost(buildings, specialization.apiType, building);

            const row = document.createElement('tr');
            row.dataset.buildingId = building.id;
            row.dataset.specializationType = specialization.apiType;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'extension-checkbox';

            Object.assign(checkbox.dataset, {
                buildingId: building.id,
                specializationType: specialization.type,
                apiType: specialization.apiType,
                creditCost,
                coinCost: Number(specialization.coins) || 0
            });

            const checkboxCell = document.createElement('td');
            checkboxCell.appendChild(checkbox);

            const createCurrencyButton = (currency, cost, className) => {
                const label = currency === 'credits' ? 'Credits' : 'Coins';
                const btn = createButton(`${formatNumber(cost)} ${label}`, ['btn', 'btn-xl', className]);

                btn.disabled = Number(userInfo?.[currency] || 0) < cost;

                if (btn.disabled) {
                    btn.title = `Benötigt ${formatNumber(cost)} ${label}`;
                }

                btn.onclick = async () => {
                    const currentCost = currency === 'credits'
                    ? Number(checkbox.dataset.creditCost) || cost
                    : cost;

                    if (Number(userInfo?.[currency] || 0) < currentCost) {
                        alert(`Du benötigst ${formatNumber(currentCost)} ${label} für diese Spezialisierung.`);
                        return;
                    }

                    btn.disabled = true;

                    const success = await buildSpecialization(building, specialization.apiType, currentCost, currency);

                    if (!success) {
                        btn.disabled = Number(userInfo?.[currency] || 0) < currentCost;
                        return;
                    }

                    await initUserCredits();
                    row.remove();
                    updateSelectedAmounts(buildings);
                    updateBuildSelectedButton();
                    updateSelectAllCheckboxState();
                };

                return btn;
            };

            const creditCell = document.createElement('td');
            creditCell.appendChild(createCurrencyButton('credits', creditCost, 'credits-button'));

            const coinsCell = document.createElement('td');
            coinsCell.appendChild(createCurrencyButton('coins', Number(specialization.coins) || 0, 'coins-button'));

            row.append(
                checkboxCell,
                createTextCell(leitstelle),
                createTextCell(wache),
                createTextCell(specialization.name),
                creditCell,
                coinsCell
            );

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    if (!checkbox.dataset.selectionOrder) {
                        checkbox.dataset.selectionOrder = ++specializationSelectionCounter;
                    }
                } else {
                    delete checkbox.dataset.selectionOrder;
                }

                refreshSelection();
            });

            tbody.appendChild(row);
        });

        function applyAllFilters() {
            tbody.querySelectorAll('tr').forEach(row => {
                const filterMatch = Object.entries(filters).every(([index, value]) =>
                                                                  !value ||
                                                                  row.children[index]?.textContent.trim().toLowerCase() === value.toLowerCase()
                                                                 );

                const searchMatch =
                      !manualSearchTerm ||
                      [1, 2, 3].some(index =>
                                     row.children[index]?.textContent.toLowerCase().includes(manualSearchTerm)
                                    );

                row.style.display = filterMatch && searchMatch ? '' : 'none';
            });
        }

        function updateSelectAllCheckboxState() {
            let total = 0;
            let checked = 0;

            tbody.querySelectorAll('tr').forEach(row => {
                if (row.style.display === 'none') return;

                const cb = row.querySelector('.extension-checkbox');

                if (cb && !cb.disabled) {
                    total++;
                    if (cb.checked) checked++;
                }
            });

            selectAllCheckbox.checked = total > 0 && total === checked;
            selectAllCheckbox.indeterminate = checked > 0 && checked < total;
            selectAllCheckbox.disabled = total === 0;
        }

        updateSelectedAmounts(buildings);
        updateSelectAllCheckboxState();

        return table;
    }

    // Funktion zur Prüfung der richtigen Baureihenfolge von Lagerräumen
    function canBuildStorageInOrder(buildingId, storageId) {
        const building = buildingsData.find(b => String(b.id) === String(buildingId));
        if (!building) return false;

        const storageList = manualStorageRooms[getBuildingTypeKey(building)] || [];
        const indexToBuild = storageList.findIndex(s => s.id === storageId);
        if (indexToBuild === -1) return true; // Lagerraum nicht in Liste => keine Einschränkung

        const currentState = getCurrentStorageState(buildingId);

        // Prüfen, ob alle vorherigen Lagerräume bereits gebaut sind
        for (let i = 0; i < indexToBuild; i++) {
            if (!currentState.includes(storageList[i].id)) {
                return false;
            }
        }
        return true;
    }
    function canBuildAllSelectedInOrder(buildingId, selectedStorages) {
        const building = buildingsData.find(b => String(b.id) === String(buildingId));
        if (!building) return false;

        const storageOrder = manualStorageRooms[getBuildingTypeKey(building)]?.map(s => s.id) || [];
        const builtStorages = new Set(getCurrentStorageState(buildingId));

        for (const storageId of selectedStorages) {
            const requiredIndex = storageOrder.indexOf(storageId);
            if (requiredIndex === -1) continue;

            const missing = storageOrder.slice(0, requiredIndex).some(prevId => !builtStorages.has(prevId));
            if (missing) return false;

            builtStorages.add(storageId);
        }
        return true;
    }

    // Schließen-Button-Funktionalität
    document.getElementById('close-extension-helper').addEventListener('click', () => {
        document.getElementById('extension-lightbox').style.display = 'none';

        // Setze die globalen Variablen zurück
        buildingGroups = {};
        buildingsData = [];
    });

    // ------------------------------------------------------------------------------------------------------------------------
    // Einzelbau in einem Gebäude

    // Funktion zum Bau einer Erweiterung
    async function buildExtension(building, extensionId, currency, amount, row, isAllianceBuild = false) {
        amount = Number(amount) || 0;

        // Guthaben prüfen
        if (isAllianceBuild) {
            if (currency !== 'credits') {
                console.error('Verbandsgebäude können ausschließlich mit Verbands-Credits gebaut werden.');
                return false;
            }

            const currentAllianceCredits = Number(allianceInfo?.credits_current || 0);

            if (currentAllianceCredits < amount) {
                showError(
                    'Nicht genügend Verbands-Credits vorhanden.\n\n' +
                    `Benötigt: ${formatNumber(amount)}\n` +
                    `Vorhanden: ${formatNumber(currentAllianceCredits)}`
                );
                return false;
            }
        } else {
            const userInfo = await getUserCredits();

            if (currency === 'credits' && userInfo.credits < amount) {
                showError(`Nicht genügend Credits vorhanden.\n\nBenötigt: ${formatNumber(amount)}`);
                return false;
            }

            if (currency === 'coins' && userInfo.coins < amount) {
                showError(`Nicht genügend Coins vorhanden.\n\nBenötigt: ${formatNumber(amount)}`);
                return false;
            }
        }

        const csrfToken = getCSRFToken();
        const buildUrl = `/buildings/${building.id}/extension/${currency}/${extensionId}`;

        // Blendet bei Kleinwachen die sich ausschließenden Erweiterungen aus
        const hideSiblingRows = ids => {
            document
                .querySelectorAll(ids.map(id => `.row-${building.id}-${id}`).join(','))
                .forEach(otherRow => {
                if (otherRow !== row) otherRow.style.display = 'none';
            });
        };

        return await new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: buildUrl,
                headers: {
                    'X-CSRF-Token': csrfToken,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                onload: async function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        if (row) {
                            const policeSmall = [10, 11, 12, 13, 16];
                            const fireSmall = [0, 6, 8, 13, 14, 16, 18, 19, 25, 30];

                            if (building.building_type === 6 && building.small_building && policeSmall.includes(extensionId)) {
                                hideSiblingRows(policeSmall);
                            }

                            if (building.building_type === 0 && building.small_building && fireSmall.includes(extensionId)) {
                                hideSiblingRows(fireSmall);
                            }

                            row.classList.add('built');
                            row.style.display = 'none';
                        }

                        // Guthaben nach erfolgreichem Bau aktualisieren
                        if (isAllianceBuild) {
                            allianceInfo = await getAllianceInfo();
                        }

                        resolve(true);
                    } else {
                        console.error(
                            `Fehler beim Bauen der Erweiterung ${extensionId}:`,
                            response.status,
                            response.responseText
                        );

                        showError(`Die Erweiterung konnte nicht gebaut werden.\n\nHTTP-Fehler: ${response.status}`);
                        resolve(false);
                    }
                },
                onerror: function(error) {
                    console.error(`Fehler beim Bauen der Erweiterung in Gebäude ${building.id}.`, error);
                    showError('Beim Bauen der Erweiterung ist ein Fehler aufgetreten.');
                    resolve(false);
                }
            });
        });
    }
    async function buildStorage(building, storageId, currency, cost, row) {
        const csrfToken = getCSRFToken();
        const buildUrl = `/buildings/${building.id}/storage_upgrade/${currency}/${storageId}?redirect_building_id=${building.id}`;

        await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: buildUrl,
                headers: {
                    'X-CSRF-Token': csrfToken,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: '',
                withCredentials: true,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 400) {
                        // UI aktualisieren
                        if (row) {
                            row.classList.add('built');
                            row.style.display = 'none';
                        }

                        // Lokale Queue aktualisieren, damit die Reihenfolge-Prüfung sofort weiß: "im Bau"
                        if (!storageBuildQueue[building.id]) {
                            storageBuildQueue[building.id] = [];
                        }
                        if (!storageBuildQueue[building.id].includes(storageId)) {
                            storageBuildQueue[building.id].push(storageId);
                        }
                    } else {
                        console.error(`Fehler beim Bau des Lagerraums in Gebäude ${building.id}`, response);
                    }
                    resolve(response);
                },
                onerror: function(error) {
                    console.error(`Netzwerkfehler beim Bau des Lagerraums in Gebäude ${building.id}`, error);
                    reject(error);
                }
            });
        });
    }
    async function buildLevel(buildingId, currency, level) {
        const buildLevelIndex = Number(level) - 1;
        const url = `/buildings/${buildingId}/expand_do/${currency}?level=${buildLevelIndex}`;
        const csrfToken = getCSRFToken();

        function doGetRequest(requestUrl) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: requestUrl,
                    withCredentials: true,
                    headers: {
                        'X-CSRF-Token': csrfToken,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    onload: resolve,
                    onerror: reject
                });
            });
        }

        try {
            const response = await doGetRequest(url);

            if (response.status === 302) {
                const locationHeader = (response.responseHeaders.match(/location:\s*(.+)/i) || [])[1];
                if (!locationHeader) throw new Error('Redirect ohne Location-Header');

                const response2 = await doGetRequest(locationHeader.trim());

                if (response2.status >= 200 && response2.status < 400) return response2;
                throw new Error(`Fehler nach Redirect: Status ${response2.status}`);
            }

            if (response.status >= 200 && response.status < 400) return response;

            throw new Error(`Fehler beim Ausbau: Status ${response.status}`);
        } catch (err) {
            console.error(err);
            throw err;
        }
    }
    async function buildSpecialization(building, specializationType, cost, currency = 'coins') {
        const csrfToken = getCSRFToken();

        if (!csrfToken) {
            showError('CSRF-Token konnte nicht ermittelt werden.');
            return false;
        }

        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'POST',
                url:
                `/building_specializations?building_id=${building.id}` +
                `&pay_with=${encodeURIComponent(currency)}` +
                `&type=${encodeURIComponent(specializationType)}`,
                headers: {
                    'X-CSRF-Token': csrfToken
                },
                onload: response => {
                    if (response.status >= 200 && response.status < 400) {
                        console.log(
                            '[Erweiterungs-Manager] Spezialisierung erfolgreich gebaut:',
                            specializationType,
                            currency,
                            building.id
                        );
                        resolve(true);
                    } else {
                        console.error(
                            '[Erweiterungs-Manager] Fehler beim Bau der Spezialisierung:',
                            response.status,
                            response.responseText
                        );
                        showError(`Fehler beim Bau der Spezialisierung (${response.status}).`);
                        resolve(false);
                    }
                },
                onerror: error => {
                    console.error('[Erweiterungs-Manager] Netzwerkfehler:', error);
                    showError('Beim Bau der Spezialisierung ist ein Netzwerkfehler aufgetreten.');
                    resolve(false);
                }
            });
        });
    }
    function showError(message) {
        const currencyContainer = document.getElementById('currency-container');
        if (currencyContainer) {
            currencyContainer.style.display = 'none';
        }

        const errorMessageDiv = document.getElementById('error-message');

        if (errorMessageDiv) {
            errorMessageDiv.textContent = message;
            errorMessageDiv.style.display = 'block';
        } else {
            alert(message);
            updateBuildSelectedButton();
        }
    }

    // ------------------------------------------------------------------------------------------------------------------------
    // Bau von ausgewählten Erweiterungen / Lagerräumen
    // Hilfsfunktion: ermittelt aktuelle Lagerzustände eines Gebäudes
    function getCurrentStorageState(buildingId) {
        const building = buildingsData.find(b => String(b.id) === String(buildingId));
        if (!building) return [];

        // Bereits gebaute Erweiterungen
        const builtExtensions = building.extensions ? building.extensions.map(e => e.type_id) : [];

        // Lager: sowohl fertig als auch im Bau (die API kennt beides)
        const builtStorages = new Set((building.storage_upgrades || []).map(s => s.type_id));

        // Lokale Queue für Zwischenschritte ebenfalls berücksichtigen
        if (storageBuildQueue[buildingId]) {
            storageBuildQueue[buildingId].forEach(s => builtStorages.add(s));
        }

        return Array.from(new Set([...builtExtensions, ...builtStorages]));
    }
    async function buildSelectedExtensions() {
        const selectedExtensions = document.querySelectorAll('.extension-checkbox:checked');
        const selectedStorages = document.querySelectorAll('.storage-checkbox:checked');

        const selectedExtensionsByBuilding = {};
        const selectedStoragesByBuilding = {};

        // Erweiterungen erfassen
        selectedExtensions.forEach(checkbox => {
            const buildingId = checkbox.dataset.buildingId;
            const extensionId = parseInt(checkbox.dataset.extensionId, 10);

            (selectedExtensionsByBuilding[buildingId] = selectedExtensionsByBuilding[buildingId] || []).push(extensionId);
        });

        // Lager erfassen
        selectedStorages.forEach(checkbox => {
            const buildingId = checkbox.dataset.buildingId;

            (selectedStoragesByBuilding[buildingId] = selectedStoragesByBuilding[buildingId] || [])
                .push(checkbox.dataset.storageType);
        });

        // Prüfung auf ungültige Erweiterungen für Kleinwachen
        const smallBuildingRules = {
            0: {
                invalid: [0, 6, 8, 13, 14, 16, 18, 19, 25, 30],
                message:
                'Information zu deinem Bauvorhaben:\n\n' +
                'Diese Erweiterungen für die Feuerwache (Kleinwache) ' +
                'können nicht zusammen gebaut werden.\n\n' +
                'Eine Erweiterung + 2 AB-Stellplätze sowie ' +
                '2 Anh-Stellplätze sind erlaubt.'
            },
            6: {
                invalid: [10, 11, 12, 13, 16],
                message:
                'Information zu deinem Bauvorhaben:\n\n' +
                'Diese Erweiterungen für die Polizeiwache (Kleinwache) ' +
                'können nicht zusammen gebaut werden.\n\n' +
                'Es ist maximal eine Erweiterung + 2 Zellen erlaubt.'
            }
        };

        for (const [buildingId, extensions] of Object.entries(selectedExtensionsByBuilding)) {
            const building = buildingsData.find(b => String(b.id) === String(buildingId));
            if (!building || !building.small_building) continue;

            const rule = smallBuildingRules[building.building_type];
            if (!rule) continue;

            if (extensions.filter(extId => rule.invalid.includes(extId)).length > 1) {
                showError(rule.message);

                document.querySelectorAll('.select-all-checkbox').forEach(cb => cb.checked = false);
                updateBuildSelectedButton();
                return;
            }
        }

        // Prüfung der Lagerreihenfolge (Verbandsgebäude haben keine Lager)
        if (currentView !== 'alliance') {
            for (const [buildingId, storageTypes] of Object.entries(selectedStoragesByBuilding)) {
                if (!canBuildAllSelectedInOrder(buildingId, storageTypes)) {
                    showError(
                        'Bitte beachte: Die Lagerräume müssen in der ' +
                        'vorgegebenen Reihenfolge gebaut werden.\n\n' +
                        'Reihenfolge:\n' +
                        '1. Lagerraum\n' +
                        '2. 1te zusätzlicher Lagerraum\n' +
                        '3. 2te zusätzlicher Lagerraum\n' +
                        '...'
                    );

                    updateBuildSelectedButton();
                    return;
                }
            }
        }

        // Währung auswählen und Bau starten
        const userInfo = currentView === 'alliance'
        ? { credits: Number(allianceInfo?.credits_current || 0), coins: 0, premium: false }
        : await getUserCredits();

        await showCurrencySelection(selectedExtensionsByBuilding, userInfo, selectedStoragesByBuilding);

        // Checkboxen zurücksetzen
        setTimeout(() => {
            [...selectedExtensions, ...selectedStorages].forEach(checkbox => {
                checkbox.checked = false;
            });

            document
                .querySelectorAll('.select-all-checkbox, .select-all-checkbox-lager')
                .forEach(cb => {
                cb.checked = false;
                cb.indeterminate = false;
                cb.dispatchEvent(new Event('change'));
            });

            updateBuildSelectedButton();
            updateSelectedAmounts(buildingsData);
        }, 100);
    }
    function updateBuildSelectedButton() {
        document.querySelectorAll('.button-container').forEach(container => {
            const buildSelectedButton = container.querySelector('.build-selected-button');
            if (!buildSelectedButton) return;

            const spoilerContent = container.nextElementSibling?.classList.contains('spoiler-content')
            ? container.nextElementSibling
            : null;

            const lagerWrapper = spoilerContent?.nextElementSibling?.classList.contains('lager-wrapper')
            ? spoilerContent.nextElementSibling
            : container.nextElementSibling?.classList.contains('lager-wrapper')
            ? container.nextElementSibling
            : null;

            const selectedExtensionCheckboxes = spoilerContent
            ? spoilerContent.querySelectorAll('.extension-checkbox:checked')
            : [];

            const selectedStorageCheckboxes = lagerWrapper
            ? lagerWrapper.querySelectorAll('.storage-checkbox:checked')
            : [];

            buildSelectedButton.disabled =
                selectedExtensionCheckboxes.length === 0 && selectedStorageCheckboxes.length === 0;
        });
    }
    async function showCurrencySelection(selectedExtensionsByBuilding, userInfo, selectedStoragesByBuilding) {
        const isAlliance = currentView === 'alliance';

        let totalCredits = 0;
        let totalCoins = 0;

        const extensionRows = [];
        const storageRows = [];

        // Erweiterungskosten sammeln
        for (const [buildingId, extensions] of Object.entries(selectedExtensionsByBuilding)) {
            for (const extensionId of extensions) {
                const row = document.querySelector(`.row-${buildingId}-${extensionId}`);
                if (!row) continue;

                const checkbox = row.querySelector('.extension-checkbox');
                if (!checkbox) continue;

                const extensionCost = Number(checkbox.dataset.creditCost || 0);
                const extensionCoins = isAlliance ? 0 : Number(checkbox.dataset.coinCost || 0);

                totalCredits += extensionCost;
                totalCoins += extensionCoins;

                extensionRows.push({ buildingId, extensionId, extensionCost, extensionCoins, row });
            }
        }

        // Lager nur bei eigenen Gebäuden
        if (!isAlliance) {
            for (const [buildingId, storageTypes] of Object.entries(selectedStoragesByBuilding)) {
                for (const storageType of storageTypes) {
                    const row = document.querySelector(`.storage-row-${buildingId}-${storageType}`);
                    if (!row) continue;

                    const checkbox = row.querySelector('.storage-checkbox');
                    if (!checkbox) continue;

                    const storageCost = Number(checkbox.dataset.creditCost || 0);
                    const storageCoins = Number(checkbox.dataset.coinCost || 0);

                    totalCredits += storageCost;
                    totalCoins += storageCoins;

                    storageRows.push({ buildingId, storageType, storageCost, storageCoins, row });
                }
            }
        }

        // Guthaben prüfen
        if (isAlliance) {
            const allianceCredits = Number(allianceInfo?.credits_current || 0);

            if (allianceCredits < totalCredits) {
                showError(
                    'Die Auswahl übersteigt das verfügbare Verbandsguthaben.\n\n' +
                    `Benötigte Verbands-Credits: ${formatNumber(totalCredits)}\n` +
                    `Verfügbare Verbands-Credits: ${formatNumber(allianceCredits)}\n` +
                    `Fehlende Verbands-Credits: ${formatNumber(totalCredits - allianceCredits)}`
                );
                return;
            }
        } else if (userInfo.credits < totalCredits && userInfo.coins < totalCoins) {
            showError(
                'Deine Auswahl übersteigt dein aktuelles Guthaben.\n\n' +
                `Fehlende Credits: ${formatNumber(Math.max(0, totalCredits - userInfo.credits))}\n` +
                `Fehlende Coins: ${formatNumber(Math.max(0, totalCoins - userInfo.coins))}`
            );
            return;
        }

        // Ausgewählte Gebäude bauen
        async function buildSelectedWithCurrency(currency, isAllianceBuild, dialog) {
            const totalTasks = extensionRows.length + (isAllianceBuild ? 0 : storageRows.length);
            const progress = createProgress(totalTasks, 'Erweiterungen');

            let done = 0;

            try {
                // Erweiterungen bauen
                for (const ext of extensionRows) {
                    const building = buildingsData.find(b => String(b.id) === String(ext.buildingId));

                    if (!building) {
                        console.warn(`Gebäude ${ext.buildingId} nicht gefunden.`);
                        continue;
                    }

                    await buildExtension(
                        building,
                        ext.extensionId,
                        currency,
                        currency === 'credits' ? ext.extensionCost : ext.extensionCoins,
                        ext.row,
                        isAllianceBuild
                    );

                    progress.update(++done);
                }

                // Lager nur bei eigenen Gebäuden
                if (!isAllianceBuild) {
                    for (const store of storageRows) {
                        const building = buildingsData.find(b => String(b.id) === String(store.buildingId));

                        if (!building) {
                            console.warn(`Gebäude ${store.buildingId} nicht gefunden.`);
                            continue;
                        }

                        await buildStorage(
                            building,
                            store.storageType,
                            currency,
                            currency === 'credits' ? store.storageCost : store.storageCoins,
                            store.row
                        );

                        progress.update(++done);
                    }
                }

                progress.close();
                dialog.remove();

                // Guthaben aktualisieren
                if (isAllianceBuild) {
                    allianceInfo = await getAllianceInfo();
                } else {
                    await initUserCredits();
                }

                // Gebäude neu laden
                await fetchBuildingsAndRender();
            } catch (error) {
                progress.close();

                console.error('Fehler beim Bauen der ausgewählten Gebäude:', error);
                showError('Beim Bauen der ausgewählten Gebäude ist ein Fehler aufgetreten.');
            }
        }

        // Bestätigungsfenster
        const html = isAlliance
        ? 'Möchtest du die ausgewählten Erweiterungen wirklich bauen?<br><br>'
        : applyCoinsButtonVisibility()
        ? 'Wähle zwischen <b class="is-credits">Credits (grün)</b> ' +
              'oder <b class="is-red">Coins (rot)</b><br><br>' +
              'Info:<br>' +
              'Sollte eine Währung <b>nicht</b> ausreichend vorhanden sein, ' +
              'kannst Du diese nicht auswählen.'
        : 'Du baust mit <b class="is-credits">Credits (grün)</b>.<br><br>' +
              'Info:<br>' +
              'Es werden ausschließlich Credits verwendet.';

        const actions = [
            {
                text: isAlliance
                ? `${formatNumber(totalCredits)} Verbands-Credits`
                : `${formatNumber(totalCredits)} Credits`,
                classes: ['currency-button', 'credits-button'],
                disabled: isAlliance
                ? Number(allianceInfo?.credits_current || 0) < totalCredits
                : userInfo.credits < totalCredits,
                onClick: dialog => {
                    lockDialog(dialog);
                    return buildSelectedWithCurrency('credits', isAlliance, dialog);
                }
            }
        ];

        if (!isAlliance) {
            actions.push({
                text: `${formatNumber(totalCoins)} Coins`,
                classes: ['currency-button', 'coins-button'],
                disabled: userInfo.coins < totalCoins,
                onClick: dialog => {
                    lockDialog(dialog);
                    return buildSelectedWithCurrency('coins', false, dialog);
                }
            });
        }

        actions.push({
            text: 'Abbrechen',
            classes: ['cancel-button'],
            onClick: dialog => dialog.remove()
        });

        showDialog({ html, actions });
    }
    document.addEventListener('click', (event) => {
        if (!event.target.classList.contains('extension-checkbox') &&
            !event.target.classList.contains('storage-checkbox')) {
            return;
        }

        const cb = event.target;
        const willBeChecked = !cb.checked;

        let totalCredits = 0;
        let totalCoins = 0;

        document.querySelectorAll('.extension-checkbox:checked, .storage-checkbox:checked').forEach(el => {
            totalCredits += Number(el.dataset.creditCost) || 0;
            totalCoins += Number(el.dataset.coinCost) || 0;
        });

        if (willBeChecked) {
            totalCredits += Number(cb.dataset.creditCost) || 0;
            totalCoins += Number(cb.dataset.coinCost) || 0;
        }

        if (currentCredits < totalCredits && currentCoins < totalCoins) {
            const missingCredits = Math.max(0, totalCredits - currentCredits);
            const missingCoins = Math.max(0, totalCoins - currentCoins);

            let message = 'Deine Auswahl übersteigt dein aktuelles Guthaben.\n\n';
            if (missingCredits > 0) message += `Fehlende Credits: ${formatNumber(missingCredits)}\n`;
            if (missingCoins > 0) message += `Fehlende Coins: ${missingCoins}\n`;

            alert(message);

            event.preventDefault();
            return;
        }

        setTimeout(() => updateSelectedAmounts(), 0);
        updateBuildSelectedButton();
    });

    // ------------------------------------------------------------------------------------------------------------------------
    // Bau von ausgewählten Stufen
    // Funktion zum Bau der ausgewählten Stufen
    async function buildSelectedLevelsAll(buildings) {
        let totalCredits = 0;
        let totalCoins = 0;
        const levelRows = [];

        for (const building of buildings) {
            const level = selectedLevels[building.id];
            if (level === undefined || level === null) continue;

            const levelList = manualLevels[getBuildingTypeKey(building)];
            if (!levelList) continue;

            const currentLevel = getBuildingLevelInfo(building)?.currentLevel ?? -1;

            // Startet bei der nächsten Stufe nach currentLevel (bei nicht vorhandenem Gebäude: Stufe 1)
            const startLevel = currentLevel >= 0 ? currentLevel + 1 : 1;
            const targetLevel = Number(level);

            // Nichts zu tun, wenn die ausgewählte Stufe nicht über der aktuellen liegt
            if (targetLevel < startLevel) continue;

            let buildingCredits = 0;
            let buildingCoins = 0;

            for (let levelId = startLevel; levelId <= targetLevel; levelId++) {
                const stufe = levelList.find(l => Number(l.id) === levelId);
                if (!stufe) continue;

                buildingCredits += Number(stufe.cost || 0);
                buildingCoins += Number(stufe.coins || 0);
            }

            if (buildingCredits === 0 && buildingCoins === 0) continue;

            totalCredits += buildingCredits;
            totalCoins += buildingCoins;

            levelRows.push({ buildingId: building.id, targetLevel, buildingCredits, buildingCoins });
        }

        if (levelRows.length === 0) {
            alert('Keine Leveländerungen ausgewählt.');
            return;
        }

        const runtimeUserInfo = currentView === 'alliance'
        ? { credits: allianceInfo ? Number(allianceInfo.credits_current || 0) : 0, coins: 0 }
        : { credits: currentCredits, coins: currentCoins };

        await showCurrencySelectionForLevelsAll(levelRows, runtimeUserInfo, totalCredits, totalCoins);
    }
    function updateBuildSelectedLevelsButtonState(group) {
        if (!group.length) {
            console.warn('⚠️ Gruppe ist leer');
            return;
        }

        const typeKey = getBuildingTypeKey(group[0].building);

        const container = document.querySelector(`.button-container[data-building-type="${typeKey}"]`);
        if (!container) {
            console.warn(`⚠️ Kein Button-Container für Typ ${typeKey} gefunden`);
            return;
        }

        const buildSelectedLevelsButton = container.querySelector('.build-selected-levels-button');
        if (!buildSelectedLevelsButton) {
            console.warn(`⚠️ Build-Selected-Level-Button für Typ ${typeKey} nicht gefunden`);
            return;
        }

        buildSelectedLevelsButton.disabled = !group.some(({ building }) => {
            const currentLevel = getBuildingLevelInfo(building)?.currentLevel ?? -1;
            const selectedLevel = selectedLevels[building.id] ?? null;

            return selectedLevel !== null && selectedLevel >= currentLevel;
        });
    }
    async function showCurrencySelectionForLevelsAll(levelRows, userInfo, totalCredits, totalCoins) {
        if (userInfo.credits < totalCredits && userInfo.coins < totalCoins) {
            alert(
                'Deine Auswahl übersteigt dein aktuelles Guthaben.\n\n' +
                ` - Fehlende Credits: ${formatNumber(Math.max(0, totalCredits - userInfo.credits))}\n` +
                ` - Fehlende Coins: ${formatNumber(Math.max(0, totalCoins - userInfo.coins))}`
            );
            return;
        }

        const buildAllLevels = async (currency, dialog) => {
            lockDialog(dialog);

            const progress = createProgress(levelRows.length, 'Gebäude');
            let done = 0;

            for (const lvl of levelRows) {
                await buildLevel(lvl.buildingId, currency, lvl.targetLevel);
                delete selectedLevels[lvl.buildingId];
                progress.update(++done);
            }

            progress.close();
            dialog.remove();
            initUserCredits();
            fetchBuildingsAndRender();
        };

        showDialog({
            html: applyCoinsButtonVisibility()
            ? 'Wähle zwischen <b class="is-credits">Credits (grün)</b> oder <b class="is-red">Coins (rot)</b><br><br>' +
            'Info:<br>Sollte eine Währung <b>nicht</b> ausreichend vorhanden sein,<br>kannst Du diese nicht auswählen'
            : 'Du baust mit <b class="is-credits">Credits (grün)</b>.<br><br>' +
            'Info:<br>Es werden ausschließlich Credits verwendet.',
            actions: [
                {
                    text: `${formatNumber(totalCredits)} Credits`,
                    classes: ['currency-button', 'credits-button'],
                    disabled: userInfo.credits < totalCredits,
                    onClick: dialog => buildAllLevels('credits', dialog)
                },
                {
                    text: `${formatNumber(totalCoins)} Coins`,
                    classes: ['currency-button', 'coins-button'],
                    disabled: userInfo.coins < totalCoins,
                    onClick: dialog => buildAllLevels('coins', dialog)
                },
                {
                    text: 'Abbrechen',
                    classes: ['cancel-button'],
                    onClick: dialog => dialog.remove()
                }
            ]
        });
    }

    // ------------------------------------------------------------------------------------------------------------------------
    // Bau von ausgewählten Spezialisierungen
    // Baut alle ausgewählten Spezialisierungen
    async function buildSelectedSpecializations(buildings) {
        const selected = [...document.querySelectorAll('.extension-checkbox:checked[data-specialization-type]')];

        if (!selected.length) {
            alert('Bitte wähle mindestens eine Spezialisierung aus.');
            return;
        }

        const items = selected
        .map(cb => {
            const building = buildings.find(b => String(b.id) === String(cb.dataset.buildingId));
            if (!building) return null;

            return {
                checkbox: cb,
                building,
                specializationType: cb.dataset.apiType,
                cost: Number(cb.dataset.creditCost) || 0
            };
        })
        .filter(Boolean);

        if (!items.length) return;

        const totalCredits = items.reduce((sum, item) => sum + item.cost, 0);

        if (Number(currentCredits || 0) < totalCredits) {
            alert(`Du benötigst ${formatNumber(totalCredits)} Credits für die ausgewählten Spezialisierungen.`);
            return;
        }

        if (!confirm(
            `Möchtest du ${items.length} ausgewählte Spezialisierung(en) für insgesamt ${formatNumber(totalCredits)} Credits bauen?`
        )) {
            return;
        }

        let successCount = 0;

        for (const item of items) {
            const success = await buildSpecialization(item.building, item.specializationType, item.cost, 'credits');

            if (success) {
                successCount++;
                item.checkbox.checked = false;
                item.checkbox.closest('tr')?.remove();
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        await initUserCredits();

        updateSelectedAmounts(buildings);
        updateBuildSelectedButton();
        updateSpecializationPrices(buildings);

        const selectAll = document.querySelector('.select-all-checkbox[data-group="specializations"]');

        if (selectAll) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        }

        if (successCount) {
            alert(`${successCount} von ${items.length} Spezialisierung(en) wurden gebaut.`);
        }
    }
    function updateSelectedSpecializationButton() {
        const button = document.querySelector('.build-selected-special-button');
        if (!button) return;

        button.disabled = !document.querySelector('.extension-checkbox:checked[data-specialization-type]');
    }

    // ------------------------------------------------------------------------------------------------------------------------
    // Konfiguration bei allen Wachen bauen
    // Währung auswählen und Bauvorhaben bestätigen
    async function showCurrencySelectionForAll(groupKey) {
        const isAlliance = currentView === 'alliance';

        const wachenGroup = buildingGroups[groupKey] || [];
        const lagerGroup = isAlliance ? [] : (storageGroups[groupKey] || []);
        const combinedGroup = [...wachenGroup, ...lagerGroup];

        if (combinedGroup.length === 0) {
            console.error(`Keine Erweiterungen für Gruppen-Key: ${groupKey}`);
            return;
        }

        let totalCredits = 0;
        let totalCoins = 0;
        let totalExtensions = 0;

        combinedGroup.forEach(({ building, missingExtensions }) => {
            missingExtensions.forEach(extension => {
                if (isExtensionLimitReached(building, extension.id)) return;

                totalExtensions++;
                totalCredits += Number(extension.cost) || 0;

                if (!isAlliance) {
                    totalCoins += Number(extension.coins) || 0;
                }
            });
        });

        if (totalExtensions === 0) {
            showError('Es sind keine baubaren Erweiterungen vorhanden.');
            return;
        }

        const userInfo = isAlliance
        ? { credits: Number(allianceInfo?.credits_current || 0), coins: 0 }
        : await getUserCredits();

        // Verbandsgebäude
        if (isAlliance) {
            if (userInfo.credits < totalCredits) {
                showError(
                    'Das Bauvorhaben kann nicht durchgeführt werden.\n\n' +
                    `Benötigte Verbands-Credits: ${formatNumber(totalCredits)}\n` +
                    `Verfügbare Verbands-Credits: ${formatNumber(userInfo.credits)}\n` +
                    `Fehlende Verbands-Credits: ${formatNumber(Math.max(0, totalCredits - userInfo.credits))}`
                );
                return;
            }

            showDialog({
                title: 'Bauvorhaben bestätigen',
                html:
                `Du möchtest <b>${totalExtensions}</b> Erweiterung(en) bauen.<br><br>` +
                'Gesamtkosten:<br>' +
                `<b class="is-credits">${formatNumber(totalCredits)} Verbands-Credits</b><br><br>` +
                'Die Erweiterungen werden ausschließlich mit <b>Verbands-Credits</b> gebaut.',
                actions: [
                    {
                        text: 'Ausbau bestätigen',
                        classes: ['currency-button', 'credits-button'],
                        onClick: async dialog => {
                            dialog.remove();
                            await buildAllExtensionsWithPause(groupKey, 'credits', true);
                        }
                    },
                    {
                        text: 'Ausbau Abbrechen',
                        classes: ['cancel-button'],
                        onClick: dialog => dialog.remove()
                    }
                ]
            });
            return;
        }

        // Eigene Gebäude
        if (userInfo.credits < totalCredits && userInfo.coins < totalCoins) {
            showError(
                'Deine Auswahl übersteigt dein aktuelles Guthaben.\n\n' +
                `Fehlende Credits: ${formatNumber(Math.max(0, totalCredits - userInfo.credits))}\n` +
                `Fehlende Coins: ${formatNumber(Math.max(0, totalCoins - userInfo.coins))}`
            );
            return;
        }

        showDialog({
            title: 'Bauvorhaben bestätigen',
            html: applyCoinsButtonVisibility()
            ? 'Wähle zwischen <b class="is-credits">Credits (grün)</b> oder <b class="is-red">Coins (rot)</b><br><br>' +
            'Info:<br>Sollte eine Währung <b>nicht</b> ausreichend vorhanden sein,<br>kannst Du diese nicht auswählen'
            : 'Du baust mit <b class="is-credits">Credits (grün)</b>.<br><br>' +
            'Info:<br>Es werden ausschließlich Credits verwendet.',
            actions: [
                {
                    text: `${formatNumber(totalCredits)} Credits`,
                    classes: ['currency-button', 'credits-button'],
                    disabled: userInfo.credits < totalCredits,
                    onClick: async dialog => {
                        dialog.remove();
                        await buildAllExtensionsWithPause(groupKey, 'credits', false);
                    }
                },
                {
                    text: `${formatNumber(totalCoins)} Coins`,
                    classes: ['currency-button', 'coins-button'],
                    disabled: userInfo.coins < totalCoins,
                    onClick: async dialog => {
                        dialog.remove();
                        await buildAllExtensionsWithPause(groupKey, 'coins', false);
                    }
                },
                {
                    text: 'Abbrechen',
                    classes: ['cancel-button'],
                    onClick: dialog => dialog.remove()
                }
            ]
        });
    }
    async function buildAllExtensionsWithPause(groupKey, currency, isAllianceBuild = false) {
        const wachenGroup = buildingGroups[groupKey] || [];

        // Verbandsgebäude haben keine Lager
        const lagerGroup = isAllianceBuild ? [] : (storageGroups[groupKey] || []);
        const combinedGroup = [...wachenGroup, ...lagerGroup];

        let totalExtensions = 0;
        let totalCost = 0;

        for (const { building, missingExtensions } of combinedGroup) {
            for (const extension of missingExtensions) {
                if (!isExtensionLimitReached(building, extension.id)) {
                    totalExtensions++;
                    totalCost += Number(extension.cost) || 0;
                }
            }
        }

        if (totalExtensions === 0) {
            showError('Es sind keine baubaren Erweiterungen vorhanden.');
            return;
        }

        // Letzte Guthabenprüfung unmittelbar vor dem Bau
        if (isAllianceBuild) {
            const allianceCredits = Number(allianceInfo?.credits_current || 0);

            if (currency !== 'credits') {
                showError('Verbandsgebäude können ausschließlich mit Verbands-Credits gebaut werden.');
                return;
            }

            if (allianceCredits < totalCost) {
                showError(
                    'Nicht genügend Verbands-Credits vorhanden.\n\n' +
                    `Benötigt: ${formatNumber(totalCost)}\n` +
                    `Vorhanden: ${formatNumber(allianceCredits)}`
                );
                return;
            }
        }

        const progress = createProgress(totalExtensions, 'Erweiterungen');
        let builtCount = 0;

        try {
            for (const { building, missingExtensions } of combinedGroup) {
                for (const extension of missingExtensions) {
                    if (isExtensionLimitReached(building, extension.id)) continue;

                    const isStorage = !isAllianceBuild && extension.isStorage === true;

                    const row = document.querySelector(
                        isStorage
                        ? `.storage-row-${building.id}-${extension.id}`
                        : `.row-${building.id}-${extension.id}`
                    );

                    const amount = Number(extension[currency]) || 0;

                    if (isStorage) {
                        await buildStorage(building, extension.id, currency, amount, row);
                    } else {
                        await buildExtension(building, extension.id, currency, amount, row, isAllianceBuild);
                    }

                    progress.update(++builtCount);

                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            if (isAllianceBuild) {
                allianceInfo = await getAllianceInfo();
            } else {
                await initUserCredits();
            }

            await fetchBuildingsAndRender();
        } catch (error) {
            console.error('Fehler beim Bauen aller Erweiterungen:', error);
            showError('Beim Bauen der Erweiterungen ist ein Fehler aufgetreten.');
        } finally {
            progress.close(500);
        }
    }
    function updateSelectedAmounts(buildings) {
        if (!Array.isArray(buildings)) return;

        const isAlliance = currentView === 'alliance';

        let totalCredits = 0;
        let totalCoins = 0;

        // Erweiterungen und Lager (Spezialisierungen werden separat berechnet)
        document.querySelectorAll('.extension-checkbox:checked, .storage-checkbox:checked').forEach(cb => {
            if (cb.dataset.specializationType) return;

            totalCredits += Number(cb.dataset.creditCost) || 0;

            if (!isAlliance) {
                totalCoins += Number(cb.dataset.coinCost) || 0;
            }
        });

        if (!isAlliance) {
            // Spezialisierungen
            const specializationCounts = {};

            // Bereits vorhandene Spezialisierungen
            buildings.forEach(building => {
                const type = building.specialization?.type;

                if (building.specialization?.active && type) {
                    specializationCounts[type] = (specializationCounts[type] || 0) + 1;
                }
            });

            // Ausgewählte Spezialisierungen in DOM-/Auswahlreihenfolge
            document.querySelectorAll('.extension-checkbox:checked[data-specialization-type]').forEach(cb => {
                const type = cb.dataset.apiType;
                const building = buildings.find(b => String(b.id) === String(cb.dataset.buildingId));

                if (!building || !type) return;

                specializationCounts[type] = (specializationCounts[type] || 0) + 1;

                const cost = getSpecializationCreditCostByCount(specializationCounts[type], building.small_building);
                cb.dataset.creditCost = cost;

                totalCredits += cost;
                totalCoins += Number(cb.dataset.coinCost) || 0;
            });

            // Level-Ausbau
            buildings.forEach(building => {
                const levelList = manualLevels[getBuildingTypeKey(building)];
                if (!levelList) return;

                const currentLevel = getBuildingLevelInfo(building)?.currentLevel ?? -1;
                const selectedLevel = selectedLevels[building.id] ?? null;

                if (selectedLevel === null || selectedLevel <= currentLevel) return;

                for (let levelId = currentLevel + 1; levelId <= selectedLevel; levelId++) {
                    const stufe = levelList.find(level => level.id === levelId);
                    if (!stufe) continue;

                    totalCredits += Number(stufe.cost) || 0;
                    totalCoins += Number(stufe.coins) || 0;
                }
            });
        }

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setText('selected-credits', isAlliance ? '0' : totalCredits.toLocaleString());
        setText('selected-coins', isAlliance ? '0' : totalCoins.toLocaleString());
        setText('selected-alliance-credits', isAlliance ? totalCredits.toLocaleString() : '0');
    }

    // ------------------------------------------------------------------------------------------------------------------------
    // Erweiterungen global de- und aktivieren
    function openExtensionToggleView() {
        if (!Array.isArray(buildingsData) || buildingsData.length === 0) {
            alert('Bitte lade zuerst die Gebäudedaten im Erweiterungs-Manager.');
            return;
        }

        const extensionList = document.getElementById('extension-list');
        const toggleContent = document.getElementById('extension-toggle-content');
        const toggleButton = document.getElementById('open-extension-toggle-manager');

        if (!extensionList || !toggleContent || !toggleButton) {
            console.error('Erweiterungs-Manager: Ansichtselemente nicht gefunden.');
            return;
        }

        extensionList.style.display = 'none';
        toggleContent.style.display = 'block';
        toggleButton.textContent = '← Zurück zur Übersicht';
        renderExtensionToggleTable();
    }
    function closeExtensionToggleView() {
        const extensionList = document.getElementById('extension-list');
        const toggleContent = document.getElementById('extension-toggle-content');
        const toggleButton = document.getElementById('open-extension-toggle-manager');
        const leitstelleSelect = document.getElementById('extension-toggle-leitstelle');

        if (toggleContent) toggleContent.style.display = 'none';
        if (extensionList) extensionList.style.display = '';
        if (toggleButton) toggleButton.textContent = 'Erweiterungen De-/Aktivieren';
        if (leitstelleSelect) {
            leitstelleSelect.selectedIndex = 0;
            leitstelleSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    function getExtensionTypeId(extension) {
        const id = extension.type_id ?? extension.typeId ?? extension.id;
        return id == null ? null : String(id);
    }
    function getExtensionName(extension) {
        return String(extension.caption ?? extension.name ?? '').trim();
    }
    function getExtensionGroupKey(building) {
        return `${building.building_type}${building.small_building ? '_small' : '_normal'}`;
    }
    function detectToggleableExtensions(buildings) {
        const toggleable = new Map();

        for (const building of buildings) {
            if (!Array.isArray(building.extensions)) continue;

            const groupKey = getExtensionGroupKey(building);
            const manualDefinitions = manualExtensions[groupKey];
            if (!Array.isArray(manualDefinitions)) continue;

            const definitionsById = new Map(
                manualDefinitions.map(extension => [String(extension.id), extension])
            );

            for (const extension of building.extensions) {
                const extensionId = getExtensionTypeId(extension);
                if (extensionId === null) continue;

                const definition = definitionsById.get(extensionId);
                if (!definition) continue;

                toggleable.set(
                    `${groupKey}::${extensionId}`,
                    definition.cannotDisable !== true
                );
            }
        }

        return toggleable;
    }
    async function getToggleableExtensions(buildings) {
        if (toggleableExtensionsCache && toggleableExtensionsCacheSource === buildings) {
            return toggleableExtensionsCache;
        }

        toggleableExtensionsCacheSource = buildings;
        toggleableExtensionsCache = detectToggleableExtensions(buildings);
        return toggleableExtensionsCache;
    }
    function ensureExtensionToggleLeitstellenSelect(list) {
        const parent = list.parentElement;
        if (!parent) return null;

        let wrapper = document.getElementById('extension-toggle-leitstelle-wrapper');
        let select = document.getElementById('extension-toggle-leitstelle');

        if (!wrapper || !select) {
            wrapper = document.createElement('div');
            wrapper.id = 'extension-toggle-leitstelle-wrapper';
            wrapper.className = 'form-group extension-toggle-leitstelle-wrapper';

            const label = document.createElement('label');
            label.htmlFor = 'extension-toggle-leitstelle';
            label.textContent = 'Leitstelle auswählen:';


            select = document.createElement('select');
            select.id = 'extension-toggle-leitstelle';
            select.className = 'extension-toggle-leitstelle-select';

            wrapper.append(label, select);
            parent.insertBefore(wrapper, list);

            select.addEventListener('change', () => {
                renderExtensionToggleTable();
            });
        }

        const previousValue = select.value || 'all';
        const leitstellen = new Map();
        let hasBuildingsWithoutLeitstelle = false;

        for (const building of buildingsData) {
            if (building.leitstelle_building_id == null) {
                hasBuildingsWithoutLeitstelle = true;
                continue;
            }

            const id = String(building.leitstelle_building_id);
            leitstellen.set(id, getLeitstelleName(building));
        }

        select.replaceChildren();
        select.add(new Option('Alle Leitstellen', 'all'));

        for (const [id, name] of [...leitstellen.entries()].sort((a, b) =>
                                                                 a[1].localeCompare(b[1], 'de', {
            sensitivity: 'base'
        })
                                                                )) {
            select.add(new Option(name, id));
        }

        if (hasBuildingsWithoutLeitstelle) {
            select.add(new Option('Keine Leitstelle', 'none'));
        }

        const valueExists = [...select.options].some(
            option => option.value === previousValue
        );

        select.value = valueExists ? previousValue : 'all';

        return select;
    }
    async function renderExtensionToggleTable() {
        const list = document.getElementById('extension-toggle-list');
        if (!list) return;

        const searchInput = document.getElementById('extension-toggle-search');
        const searchTerm = (searchInput?.value || '')
        .trim()
        .toLocaleLowerCase('de-DE');

        if (!Array.isArray(buildingsData) || buildingsData.length === 0) {
            list.textContent = 'Keine Gebäudedaten vorhanden.';
            return;
        }

        const leitstelleSelect = ensureExtensionToggleLeitstellenSelect(list);
        const selectedLeitstelleId = leitstelleSelect?.value || 'all';

        const scopedBuildings = buildingsData.filter(building => {
            if (selectedLeitstelleId === 'all') return true;
            if (selectedLeitstelleId === 'none') {
                return building.leitstelle_building_id == null;
            }

            return String(building.leitstelle_building_id) === selectedLeitstelleId;
        });

        const toggleableExtensions = await getToggleableExtensions(buildingsData);
        const groups = new Map();

        for (const building of scopedBuildings) {
            if (!Array.isArray(building.extensions)) continue;

            const typeKey = getExtensionGroupKey(building);
            const typeName = buildingTypeNames[typeKey] || `Typ ${building.building_type}`;

            if (!groups.has(typeKey)) {
                groups.set(typeKey, {
                    name: typeName,
                    extensions: new Map()
                });
            }

            const group = groups.get(typeKey);

            for (const extension of building.extensions) {
                if (!extension) continue;

                const extensionId = getExtensionTypeId(extension);
                const extensionName = getExtensionName(extension) || `Erweiterung ${extensionId ?? '?'}`;
                const extensionKey = String(extensionId ?? extensionName);
                const detectionKey = extensionId !== null ? `${typeKey}::${extensionId}` : null;

                if (detectionKey && toggleableExtensions.get(detectionKey) === false) {
                    continue;
                }

                if (!group.extensions.has(extensionKey)) {
                    group.extensions.set(extensionKey, {
                        name: extensionName,
                        buildings: []
                    });
                }

                group.extensions.get(extensionKey).buildings.push({
                    id: building.id,
                    name: building.caption || `Gebäude ${building.id}`,
                    extensionId,
                    isReady: typeof extension.enabled === 'boolean'
                    ? extension.enabled
                    : null,
                    sourceBuilding: building,
                    sourceExtension: extension
                });
            }
        }

        list.replaceChildren();
        window.extensionToggleEntries = new Map();

        const addActionButton = (
            container,
            label,
            action,
            typeKey,
            extensionKey,
            disabled = false
        ) => {
            const isDisableAction = action === 'disable-extension';

            const button = document.createElement('button');
            button.type = 'button';
            button.className = ['btn', 'btn-xs', 'extension-toggle-action', isDisableAction ? 'extension-toggle-disable' : 'extension-toggle-enable'].join(' ');
            button.textContent = label;
            button.disabled = disabled;
            button.title = disabled
                ? isDisableAction
                ? 'Diese Erweiterung ist bereits überall deaktiviert oder nicht verfügbar.'
            : 'Diese Erweiterung ist bereits überall aktiviert oder nicht verfügbar.'
            : isDisableAction
                ? 'Erweiterung in allen Gebäuden deaktivieren'
            : 'Erweiterung in allen Gebäuden aktivieren';

            button.dataset.action = action;
            button.dataset.buildingType = typeKey;
            button.dataset.extensionKey = extensionKey;
            button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();

                if (button.dataset.running === 'true') return;

                runExtensionToggleAction(
                    window.extensionToggleEntries.get(`${typeKey}::${extensionKey}`),
                    action,
                    button
                );
            });
            container.appendChild(button);
        };

        let visibleGroups = 0;
        for (const [typeKey, group] of groups) {
            const extensionEntries = [...group.extensions.entries()]
            .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'de', {
                sensitivity: 'base',
                numeric: true
            }));

            const matchesType = group.name
            .toLocaleLowerCase('de-DE')
            .includes(searchTerm);

            const matchingExtensions = extensionEntries.filter(([, extension]) =>
                                                               extension.name.toLocaleLowerCase('de-DE').includes(searchTerm)
                                                              );

            if (searchTerm && !matchesType && matchingExtensions.length === 0) {
                continue;
            }

            const extensionsToShow = searchTerm && !matchesType
            ? matchingExtensions
            : extensionEntries;

            if (!extensionsToShow.length) continue;

            const details = document.createElement('details');
            details.className = 'extension-toggle-spoiler';
            details.open = Boolean(searchTerm);

            const summary = document.createElement('summary');
            const count = extensionsToShow.length;

            summary.textContent = `${group.name} (${count} ${count === 1 ? 'Erweiterung' : 'Erweiterungen'})`;

            details.appendChild(summary);

            const table = document.createElement('table');
            table.className = 'extension-toggle-table';

            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');

            const nameHeader = document.createElement('th');
            nameHeader.scope = 'col';
            nameHeader.textContent = 'Erweiterung';

            const actionsHeader = document.createElement('th');
            actionsHeader.scope = 'col';
            actionsHeader.textContent = 'Aktionen';

            headerRow.append(nameHeader, actionsHeader);
            thead.appendChild(headerRow);

            const tbody = document.createElement('tbody');

            for (const [extensionKey, extension] of extensionsToShow) {
                const row = document.createElement('tr');
                row.dataset.buildingType = typeKey;
                row.dataset.extensionKey = extensionKey;

                const nameCell = document.createElement('td');
                nameCell.textContent = extension.name;

                const actionsCell = document.createElement('td');
                const actionsWrapper = document.createElement('div');
                actionsWrapper.className = 'extension-toggle-actions';

                window.extensionToggleEntries.set(
                    `${typeKey}::${extensionKey}`,
                    extension
                );

                // Nur verfügbare Erweiterungen mit bekanntem Zustand bewerten.
                const knownBuildings = extension.buildings.filter(building => building.sourceExtension?.available === true && typeof building.sourceExtension.enabled === 'boolean');
                const allEnabled = knownBuildings.length > 0 && knownBuildings.every(building => building.sourceExtension.enabled === true);
                const allDisabled = knownBuildings.length > 0 && knownBuildings.every(building => building.sourceExtension.enabled === false);
                const noKnownBuildings = knownBuildings.length === 0;
                const hasUnavailableBuildings = extension.buildings.some(building => building.sourceExtension?.available !== true);

                addActionButton(
                    actionsWrapper,
                    'Alle deaktivieren',
                    'disable-extension',
                    typeKey,
                    extensionKey,
                    allDisabled || noKnownBuildings
                );

                addActionButton(
                    actionsWrapper,
                    'Alle aktivieren',
                    'enable-extension',
                    typeKey,
                    extensionKey,
                    allEnabled || noKnownBuildings
                );

                actionsCell.appendChild(actionsWrapper);

                // Hinweis, wenn mindestens eine Erweiterung nicht verfügbar ist.
                if (hasUnavailableBuildings) {
                    const unavailableHint = document.createElement('div');
                    unavailableHint.className = 'extension-toggle-unavailable-hint';
                    unavailableHint.textContent = 'Hinweis: Mindestens eine Erweiterung befindet sich im Bau und kann deshalb nicht umgeschaltet werden.';
                    unavailableHint.style.marginTop = '6px';
                    unavailableHint.style.fontSize = '0.9em';
                    unavailableHint.style.opacity = '0.85';
                    unavailableHint.style.color = 'inherit';

                    actionsCell.appendChild(unavailableHint);
                }

                row.append(nameCell, actionsCell);
                tbody.appendChild(row);
            }

            table.append(thead, tbody);
            details.appendChild(table);
            list.appendChild(details);
            visibleGroups++;
        }

        if (visibleGroups === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'extension-toggle-empty';

            emptyMessage.textContent = selectedLeitstelleId === 'all'
                ? 'Keine passenden Gebäudetypen oder Erweiterungen gefunden.'
            : 'Für diese Leitstelle wurden keine passenden Erweiterungen gefunden.';

            list.appendChild(emptyMessage);
        }
    }
    async function setExtensionReadiness(buildingId, extensionId) {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

        if (!csrfToken) {
            throw new Error('CSRF-Token wurde nicht gefunden.');
        }

        const body = new URLSearchParams({
            utf8: '✓',
            authenticity_token: csrfToken
        });

        const response = await fetch(
            `/buildings/${buildingId}/extension_ready/${extensionId}/${buildingId}`,
            {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-CSRF-Token': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: body.toString()
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response;
    }
    async function runExtensionToggleAction(extension, action, button) {
        // Verhindert parallele Aufrufe im gesamten Fenster
        if (
            window.__extensionToggleActionRunning === true ||
            button.dataset.running === 'true'
        ) {
            return;
        }
        window.__extensionToggleActionRunning = true;
        button.dataset.running = 'true';

        const shouldBeReady = action === 'enable-extension';
        const actionLabel = shouldBeReady ? 'aktivieren' : 'deaktivieren';

        try {
            const targets = extension.buildings.filter(building => {
                const sourceExtension = building.sourceExtension;

                return building.id != null &&
                    building.extensionId != null &&
                    sourceExtension?.available === true &&
                    typeof sourceExtension.enabled === 'boolean' &&
                    sourceExtension.enabled !== shouldBeReady;
            });
            if (targets.length === 0) {
                alert(
                    `Keine Erweiterungen zum ${actionLabel} gefunden.\n` +
                    'Alle verfügbaren Erweiterungen befinden sich bereits im gewünschten Zustand.'
                );
                return;
            }
            const leitstelleSelect = document.getElementById('extension-toggle-leitstelle');
            const leitstelleLabel = leitstelleSelect?.selectedOptions?.[0]?.textContent;
            const confirmed = confirm(`Möchtest du wirklich alle ${targets.length} betroffenen Erweiterungen ${actionLabel}?\n\n` + 'Der Vorgang betrifft ausschließlich die Gebäude der gewählten Leitstelle.');
            if (!confirmed) return;
            const container = document.getElementById('extension-toggle-content');
            if (!container) {
                alert('Der Erweiterungsbereich wurde nicht gefunden.');
                return;
            }
            let progressContainer = document.getElementById('extension-toggle-progress-container');
            if (!progressContainer) {
                progressContainer = document.createElement('div');
                progressContainer.id = 'extension-toggle-progress-container';
                progressContainer.className = 'panel panel-default';

                progressContainer.innerHTML = `
                <div class="panel-body">
                    <div id="extension-toggle-progress-title"></div>
                    <div class="progress">
                        <div id="extension-toggle-progress-bar"
                             class="progress-bar progress-bar-striped active"
                             role="progressbar"
                             aria-valuemin="0"
                             aria-valuemax="100"
                             aria-valuenow="0"
                             style="width: 0%;">
                            0%
                        </div>
                    </div>
                    <div id="extension-toggle-progress-details" class="text-muted"></div>
                    <div style="margin-top: 10px; text-align: right;">
                        <button type="button"
                                id="extension-toggle-cancel"
                                class="btn btn-default">
                            Abbrechen
                        </button>
                    </div>
                </div>
            `;

                container.insertBefore(progressContainer, container.firstChild);
            }
            const title = progressContainer.querySelector('#extension-toggle-progress-title');
            const bar = progressContainer.querySelector('#extension-toggle-progress-bar');
            const details = progressContainer.querySelector('#extension-toggle-progress-details');
            const cancelButton = progressContainer.querySelector('#extension-toggle-cancel');
            let cancelRequested = false;
            cancelButton.onclick = () => {
                cancelRequested = true;
                cancelButton.disabled = true;
                cancelButton.textContent = 'Abbruch läuft …';
            };
            const originalText = button.textContent;
            const total = targets.length;
            let processed = 0;
            let successCount = 0;
            let errorCount = 0;
            button.disabled = true;
            button.textContent = 'Bitte warten …';
            const leitstelleSelectDuringAction = document.getElementById('extension-toggle-leitstelle');
            if (leitstelleSelectDuringAction) {leitstelleSelectDuringAction.disabled = true;}
            bar.style.width = '0%';
            bar.textContent = '0%';
            bar.setAttribute('aria-valuenow', '0');
            bar.classList.remove('progress-bar-success', 'progress-bar-warning');
            bar.classList.add('progress-bar-striped', 'active');
            progressContainer.style.display = 'block';
            title.textContent = `Erweiterungen werden ${actionLabel} …`;
            cancelRequested = false;
            cancelButton.disabled = false;
            cancelButton.textContent = 'Abbrechen';
            cancelButton.style.display = 'inline-block';
            const updateProgress = () => {
                const percentage = Math.round((processed / total) * 100);

                bar.style.width = `${percentage}%`;
                bar.textContent = `${percentage}%`;
                bar.setAttribute('aria-valuenow', String(percentage));

                details.textContent =
                    `${processed} von ${total} verarbeitet · ` +
                    `${successCount} erfolgreich · ${errorCount} Fehler`;
            };
            updateProgress();

            try {
                for (const building of targets) {
                    if (cancelRequested) break;

                    try {
                        await setExtensionReadiness(
                            building.id,
                            building.extensionId
                        );

                        building.sourceExtension.enabled = shouldBeReady;
                        building.isReady = shouldBeReady;

                        building.sourceBuilding?.extensions?.forEach(item => {
                            if (
                                String(item.type_id) ===
                                String(building.sourceExtension.type_id)
                            ) {
                                item.enabled = shouldBeReady;
                            }
                        });

                        successCount++;
                    } catch (error) {
                        errorCount++;

                        console.error(
                            '[Erweiterungs-Manager] Fehler beim Umschalten:',
                            building.name,
                            building.sourceExtension?.caption,
                            error
                        );
                    }

                    processed++; updateProgress();
                    if (processed < total && !cancelRequested) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            } finally {
                button.disabled = false;
                button.textContent = originalText;

                const select = document.getElementById(
                    'extension-toggle-leitstelle'
                );

                if (select) {
                    select.disabled = false;
                }
            }

            if (cancelRequested) {
                title.textContent = 'Vorgang abgebrochen';

                bar.classList.remove(
                    'active',
                    'progress-bar-striped',
                    'progress-bar-success'
                );

                bar.classList.add('progress-bar-warning');

                details.textContent =
                    `Abbruch nach ${processed} von ${total} Erweiterungen. ` +
                    `${successCount} erfolgreich · ${errorCount} Fehler.`;

                cancelButton.style.display = 'none';

                await renderExtensionToggleTable();
                progressContainer.style.display = 'none';
                return;
            }

            cancelButton.style.display = 'none';

            title.textContent = 'Vorgang abgeschlossen';

            bar.classList.remove('active', 'progress-bar-striped');
            bar.classList.add(
                errorCount > 0
                ? 'progress-bar-warning'
                : 'progress-bar-success'
            );

            details.textContent =
                `${successCount} von ${total} Erweiterungen erfolgreich ${actionLabel}.` +
                (errorCount > 0
                 ? ` Fehler: ${errorCount}. Details stehen in der Konsole.`
                 : '');

            // Tabelle mit dem aktuellen Stand aktualisieren
            await renderExtensionToggleTable();
            progressContainer.style.display = 'none';
            if (errorCount > 0) {
                alert(
                    'Der Vorgang wurde abgeschlossen.\n\n' +
                    `Erfolgreich: ${successCount}\n` +
                    `Fehlgeschlagen: ${errorCount}\n\n` +
                    'Weitere Informationen findest du in der Konsole.'
                );
            }
        } finally {
            // Sperre nach Abschluss, Abbruch oder Fehler wieder freigeben
            button.dataset.running = 'false';
            window.__extensionToggleActionRunning = false;
        }
    }
    document.getElementById('open-extension-toggle-manager')?.addEventListener('click', () => {
        const toggleContent = document.getElementById(
            'extension-toggle-content'
        );

        if (!toggleContent) {
            console.error(
                'Erweiterungs-Manager: Toggle-Ansicht nicht gefunden.'
            );
            return;
        }

        if (getComputedStyle(toggleContent).display !== 'none') {
            closeExtensionToggleView();
        } else {
            openExtensionToggleView();
        }
    });
    document.getElementById('extension-toggle-search')?.addEventListener('input', () => {
        renderExtensionToggleTable();
    });
    document.getElementById('extension-toggle-list')?.addEventListener('click', async event => {
        const button = event.target.closest(
            'button[data-action="disable-extension"], button[data-action="enable-extension"]'
        );

        if (!button || button.disabled || button.dataset.running === 'true') return;

        const { extensionKey, buildingType: typeKey } = button.dataset;

        if (!extensionKey || !typeKey) {
            console.error('[Erweiterungs-Manager] Schlüssel fehlen am Button.', { extensionKey, typeKey });
            return;
        }

        const entryKey = `${typeKey}::${extensionKey}`;
        const extension = window.extensionToggleEntries?.get(entryKey);

        if (!extension) {
            console.error('[Erweiterungs-Manager] Erweiterung nicht gefunden:', entryKey);
            return;
        }

        await runExtensionToggleAction(extension, button.dataset.action, button);
    });

    // ------------------------------------------------------------------------------------------------------------------------
    // Bereich für "Derzeit im Bau oder fertig gestellt"
    function getConstructionUrl(kind, buildingId, typeId) {
        if (kind === 'extension-ready') {
            return `/buildings/${buildingId}/extension_ready/${typeId}/${buildingId}`;
        }

        const action = kind === 'extension' ? 'extension_cancel' : 'storage_cancel';
        return `/buildings/${buildingId}/${action}/${typeId}?redirect_building_id=${buildingId}`;
    }
    async function postConstructionAction(url) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRF-Token': getCSRFToken()
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
    }
    async function fetchConstructionProjects() {
        try {
            const constructionList = document.getElementById('construction-list');
            constructionList.innerHTML = '';

            if (!Array.isArray(buildingsData) || buildingsData.length === 0) {
                throw new Error('Keine Gebäudedaten verfügbar');
            }

            buildingsData.forEach(building => {
                building.extensions?.forEach(ext => {
                    if (!ext.available && ext.available_at) {
                        addConstructionRow(building, ext.caption, new Date(ext.available_at), 'extension', ext.type_id);
                    }

                    if (ext.available && !ext.enabled) {
                        addConstructionRow(building, ext.caption, null, 'extension-ready', ext.type_id);
                    }
                });

                building.storage_upgrades?.forEach(stor => {
                    if (!stor.available && stor.available_at) {
                        addConstructionRow(building, stor.upgrade_type, new Date(stor.available_at), 'storage', stor.type_id);
                    }
                });
            });
        } catch (err) {
            console.error('fetchConstructionProjects:', err);

            document.getElementById('construction-list').innerHTML =
                '<tr><td colspan="5">Fehler beim Laden der Bauprojekte.</td></tr>';
        }
    }
    function openSobolModal() {
        if (document.getElementById('construction-lightbox')) return;

        const modal = document.createElement('div');
        modal.id = 'construction-lightbox';

        const container = document.createElement('div');
        container.className = 'construction-modal';

        const header = document.createElement('div');
        header.className = 'construction-header';

        const title = document.createElement('h3');
        title.className = 'construction-title';
        title.textContent = 'Laufende Bauprojekte';
        header.appendChild(title);

        // Buttons
        const btnContainer = document.createElement('div');
        btnContainer.className = 'construction-toolbar';

        const activateAllBtn = createButton('Alle aktivieren (0)', ['bau-btn', 'bau-btn-success']);
        const cancelAllBtn = createButton('Alle abbrechen (0)', ['bau-btn', 'bau-btn-danger']);
        const resetBtn = createButton('Filter zurücksetzen', ['bau-btn', 'bau-btn-warning']);
        const closeBtn = createButton('Schließen', ['bau-btn', 'bau-btn-danger']);

        // Gemeinsamer Ablauf für "Alle aktivieren" und "Alle abbrechen"
        async function runBulkAction(button, rows, barType, doneLabel) {
            const { wrapper, bar } = getOrCreateProgressBar(barType, container);
            const total = rows.length;

            if (total === 0) {
                bar.style.width = '100%';
                bar.textContent = `0 von 0 ${doneLabel}`;

                setTimeout(() => {
                    wrapper.style.display = 'none';
                }, 1500);

                return;
            }

            button.disabled = true;

            try {
                for (let i = 0; i < total; i++) {
                    const row = rows[i];

                    try {
                        await postConstructionAction(
                            getConstructionUrl(row.dataset.actionTypeDetail, row.dataset.buildingId, row.dataset.typeId)
                        );

                        if (row._countdownInterval) {
                            clearInterval(row._countdownInterval);
                        }

                        row.remove();
                    } catch (err) {
                        console.warn(`Fehler (${doneLabel}):`, err);
                    }

                    const done = i + 1;

                    bar.style.width = `${Math.round((done / total) * 100)}%`;
                    bar.textContent = `${done} von ${total} ${doneLabel}`;

                    updateConstructionButtonCounts();

                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            } finally {
                button.disabled = false;

                await fetchBuildingsAndRender();
                updateConstructionButtonCounts();

                setTimeout(() => {
                    wrapper.style.display = 'none';
                }, 1000);
            }
        }

        const getVisibleRows = actionType =>
        Array.from(modal.querySelectorAll('#construction-list tr')).filter(
            row => row.style.display !== 'none' && row.dataset.actionType === actionType
        );

        activateAllBtn.addEventListener('click', () => runBulkAction(activateAllBtn, getVisibleRows('activate'), 'activate', 'aktiviert'));
        cancelAllBtn.addEventListener('click', () => {
            if (!modal.querySelector('#construction-list')) return;

            // Von langer zu kurzer Restzeit sortieren
            sortConstructionByTime(false);

            const rows = getVisibleRows('cancel');
            if (!rows.length) return;

            runBulkAction(cancelAllBtn, rows, 'cancel', 'abgebrochen');
        });
        resetBtn.addEventListener('click', () => {
            modal.querySelectorAll('select').forEach(select => {
                select.value = '';
            });

            filterConstructionTable();
            updateConstructionButtonCounts();
        });
        closeBtn.addEventListener('click', () => {
            modal.querySelectorAll('#construction-list tr').forEach(row => {
                if (row._countdownInterval) {
                    clearInterval(row._countdownInterval);
                }
            });

            modal.remove();
        });

        btnContainer.append(activateAllBtn, cancelAllBtn, resetBtn, closeBtn);
        header.appendChild(btnContainer);

        // Filterbereich: unabhängig vom scrollenden Tabelleninhalt
        const filterHeaderWrapper = document.createElement('div');
        filterHeaderWrapper.className = 'construction-filters-wrapper';

        const filterTable = document.createElement('table');
        filterTable.className = 'construction-filter-table';

        // Gemeinsame Spaltenstruktur für Filter und Projektzeilen
        const createColGroup = () => {
            const colgroup = document.createElement('colgroup');

            for (let i = 0; i < 6; i++) {
                colgroup.appendChild(document.createElement('col'));
            }

            return colgroup;
        };

        filterTable.appendChild(createColGroup());

        // Filter-Header erstellen
        const createFilterHeader = (label, id) => {
            const th = document.createElement('th');

            const span = document.createElement('div');
            span.className = 'construction-filter-label';
            span.textContent = label;

            const select = document.createElement('select');
            select.id = id;

            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = label;
            select.appendChild(defaultOption);

            select.addEventListener('change', () => {
                filterConstructionTable();
                updateConstructionButtonCounts();
            });

            th.append(span, select);
            return th;
        };

        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');

        headRow.append(
            createFilterHeader('Leistellen', 'filter-leitstelle'),
            createFilterHeader('Wachenart', 'filter-wachentyp'),
            createFilterHeader('Wachen', 'filter-wache'),
            createFilterHeader('Erweiterungen', 'filter-erweiterung')
        );

        // Restzeit-Sortierung
        const thRestzeit = document.createElement('th');
        thRestzeit.textContent = 'Restzeit ▼';

        let sortAsc = true;

        thRestzeit.addEventListener('click', () => {
            sortConstructionByTime(sortAsc);
            thRestzeit.textContent = `Restzeit ${sortAsc ? '▲' : '▼'}`;
            sortAsc = !sortAsc;
        });

        headRow.appendChild(thRestzeit);

        // Aktionsfilter
        const thAktion = document.createElement('th');

        const actionLabel = document.createElement('div');
        actionLabel.className = 'construction-filter-label';
        actionLabel.textContent = 'Aktion';

        const actionFilter = document.createElement('select');
        actionFilter.id = 'filter-aktion';

        [
            { value: '', text: 'Auswahl' },
            { value: 'cancel', text: 'Im Bau' },
            { value: 'activate', text: 'Einsatzbereit schalten' }
        ].forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.text;
            actionFilter.appendChild(option);
        });

        actionFilter.addEventListener('change', () => {
            filterConstructionTable();
            updateConstructionButtonCounts();
        });

        thAktion.append(actionLabel, actionFilter);
        headRow.appendChild(thAktion);

        thead.appendChild(headRow);
        filterTable.appendChild(thead);
        filterHeaderWrapper.appendChild(filterTable);

        // Scrollbereich: nur Projektzeilen
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'construction-table-wrapper';

        const table = document.createElement('table');
        table.id = 'construction-data-table';
        table.appendChild(createColGroup());

        const tbody = document.createElement('tbody');
        tbody.id = 'construction-list';

        table.appendChild(tbody);
        tableWrapper.appendChild(table);

        // Horizontales Scrollen synchronisieren
        filterHeaderWrapper.addEventListener('scroll', () => {
            tableWrapper.scrollLeft = filterHeaderWrapper.scrollLeft;
        });

        tableWrapper.addEventListener('scroll', () => {
            filterHeaderWrapper.scrollLeft = tableWrapper.scrollLeft;
        });

        // Modal zusammenbauen
        container.append(header, filterHeaderWrapper, tableWrapper);
        modal.appendChild(container);
        document.body.appendChild(modal);

        // Beide Tabellen auf dieselbe Breite bringen (Breite ist berechnet, daher inline)
        requestAnimationFrame(() => {
            const sharedWidth = Math.max(filterHeaderWrapper.clientWidth, 1250);

            filterTable.style.width = `${sharedWidth}px`;
            table.style.width = `${sharedWidth}px`;
        });

        // Button-Zahlen aktualisieren
        function updateConstructionButtonCounts() {
            const rows = Array.from(modal.querySelectorAll('#construction-list tr'))
            .filter(row => row.style.display !== 'none');

            activateAllBtn.textContent =
                `Alle aktivieren (${rows.filter(row => row.dataset.actionType === 'activate').length})`;

            cancelAllBtn.textContent =
                `Alle abbrechen (${rows.filter(row => row.dataset.actionType === 'cancel').length})`;
        }

        // Bauprojekte laden
        fetchConstructionProjects().then(() => {
            updateConstructionButtonCounts();
        });
    }
    function addConstructionRow(building, caption, endTime, type, type_id) {
        const tbody = document.getElementById('construction-list');
        if (!tbody) return;

        const row = document.createElement('tr');

        // Wachentyp ermitteln
        const typeKey = building.building_type + (building.small_building ? '_small' : '_normal');
        const wachentypName = buildingTypeNames[typeKey] || `Typ ${building.building_type}`;

        // Filterdaten
        row.dataset.leitstelle = getLeitstelleName(building);
        row.dataset.wachentyp = wachentypName;
        row.dataset.wache = building.caption;
        row.dataset.erweiterung = caption;

        // Aktionstyp
        row.dataset.actionType = type === 'extension-ready' ? 'activate' : 'cancel';
        row.dataset.buildingId = building.id;
        row.dataset.typeId = type_id;
        row.dataset.actionTypeDetail = type;

        // Normale Tabellenzellen
        [
            row.dataset.leitstelle,
            row.dataset.wachentyp,
            row.dataset.wache,
            row.dataset.erweiterung
        ].forEach(text => row.appendChild(createTextCell(text)));

        // Countdown-Zelle
        const countdownTd = document.createElement('td');
        countdownTd.className = 'countdown';
        countdownTd.textContent = endTime ? '' : 'Ausbau fertiggestellt';
        row.appendChild(countdownTd);

        // Aktionszelle
        const actionTd = document.createElement('td');
        const isReadyAction = type === 'extension-ready';

        const actionButton = createButton(
            isReadyAction ? 'Einsatzbereit schalten' : 'Bau abbrechen',
            ['bau-btn', isReadyAction ? 'bau-btn-success' : 'bau-btn-danger']
        );

        actionButton.addEventListener('click', async () => {
            actionButton.disabled = true;

            try {
                await postConstructionAction(getConstructionUrl(type, building.id, type_id));

                if (row._countdownInterval) {
                    clearInterval(row._countdownInterval);
                }

                row.remove();

                if (isReadyAction) {
                    // Lokalen Datenstand anpassen, damit die Zeile beim Neuladen der Liste nicht wiederkommt
                    building.extensions?.forEach(ext => {
                        if (String(ext.type_id) === String(type_id)) ext.enabled = true;
                    });

                    await fetchConstructionProjects();
                } else {
                    await fetchBuildingsAndRender();
                }
            } catch (err) {
                console.warn(
                    isReadyAction ? 'Fehler beim Aktivieren der Erweiterung:' : 'Fehler beim Abbrechen:',
                    err
                );

                actionButton.disabled = false;
            }
        });

        actionTd.appendChild(actionButton);
        row.appendChild(actionTd);
        tbody.appendChild(row);

        // Countdown aktualisieren
        if (endTime) {
            const updateCountdown = () => {
                const remaining = new Date(endTime).getTime() - Date.now();

                if (remaining <= 0) {
                    countdownTd.textContent = 'Fertig!';

                    if (row._countdownInterval) {
                        clearInterval(row._countdownInterval);
                    }

                    row._countdownInterval = null;
                    return;
                }

                const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
                const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

                countdownTd.textContent =
                    `${days} Tag(e), ${hours} Stunde(n), ` +
                    `${minutes} Minute(n), ${seconds} Sekunde(n)`;
            };

            updateCountdown();
            row._countdownInterval = setInterval(updateCountdown, 1000);
        }

        // Filter-Dropdowns automatisch füllen
        const addOptionIfMissing = (selectId, value) => {
            const select = document.getElementById(selectId);
            if (!select) return;

            if (!Array.from(select.options).some(option => option.value === value)) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
            }
        };

        addOptionIfMissing('filter-leitstelle', row.dataset.leitstelle);
        addOptionIfMissing('filter-wachentyp', row.dataset.wachentyp);
        addOptionIfMissing('filter-wache', row.dataset.wache);
        addOptionIfMissing('filter-erweiterung', row.dataset.erweiterung);
    }
    function filterConstructionTable() {
        const leitstelle = document.getElementById('filter-leitstelle').value;
        const wachentyp = document.getElementById('filter-wachentyp').value;
        const wache = document.getElementById('filter-wache').value;
        const erweiterung = document.getElementById('filter-erweiterung').value;
        const aktion = document.getElementById('filter-aktion').value;

        const rows = Array.from(document.querySelectorAll('#construction-list tr'));

        // Sets zum Sammeln gültiger Optionen
        const validLeitstellen = new Set();
        const validWachentypen = new Set();
        const validWachen = new Set();
        const validErweiterungen = new Set();
        const validAktionen = new Set();

        rows.forEach(row => {
            const isVisible =
                  (!leitstelle || row.dataset.leitstelle === leitstelle) &&
                  (!wachentyp || row.dataset.wachentyp === wachentyp) &&
                  (!wache || row.dataset.wache === wache) &&
                  (!erweiterung || row.dataset.erweiterung === erweiterung) &&
                  (!aktion || row.dataset.actionType === aktion);

            row.style.display = isVisible ? '' : 'none';

            // Nur sichtbare Zeilen zählen für Dropdowns
            if (isVisible) {
                validLeitstellen.add(row.dataset.leitstelle);
                validWachentypen.add(row.dataset.wachentyp);
                validWachen.add(row.dataset.wache);
                validErweiterungen.add(row.dataset.erweiterung);
                validAktionen.add(row.dataset.actionType);
            }
        });

        // Dropdowns aktualisieren: nur gültige Optionen anzeigen
        updateDropdownOptions('filter-leitstelle', validLeitstellen, leitstelle);
        updateDropdownOptions('filter-wachentyp', validWachentypen, wachentyp);
        updateDropdownOptions('filter-wache', validWachen, wache);
        updateDropdownOptions('filter-erweiterung', validErweiterungen, erweiterung);
        updateDropdownOptions('filter-aktion', validAktionen, aktion);
    }
    function updateDropdownOptions(selectId, validSet, currentValue) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const preservedValue = validSet.has(currentValue) ? currentValue : '';
        select.innerHTML = '';

        const defaultLabels = {
            'filter-leitstelle': 'Alle Leitstellen',
            'filter-wachentyp': 'Alle Wachentypen',
            'filter-wache': 'Alle Wachen',
            'filter-erweiterung': 'Alle Erweiterungen',
            'filter-aktion': 'Auswahl'
        };

        const actionLabels = {
            cancel: 'Im Bau',
            activate: 'Einsatzbereit schalten'
        };

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = defaultLabels[selectId] || '';
        select.appendChild(defaultOption);

        Array.from(validSet).sort().forEach(val => {
            const option = document.createElement('option');
            option.value = val;
            option.textContent = selectId === 'filter-aktion' ? (actionLabels[val] || val) : val;
            select.appendChild(option);
        });

        select.value = preservedValue;
    }
    function sortConstructionByTime(asc = true) {
        const tbody = document.getElementById('construction-list');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        rows.sort((a, b) => {
            const aTime = getRemainingTime(a);
            const bTime = getRemainingTime(b);
            return asc ? aTime - bTime : bTime - aTime;
        });

        rows.forEach(row => tbody.appendChild(row));
    }
    function getRemainingTime(row) {
        const countdownCell = row.querySelector('.countdown');
        if (!countdownCell) return Number.MAX_SAFE_INTEGER;

        // Text parsen
        return parseTimeToSeconds(countdownCell.textContent) * 1000;
    }
    function parseTimeToSeconds(text) {
        if (!text || text.includes('Fertig')) return 0;

        const days = Number((text.match(/(\d+) Tag/) || [0, 0])[1]);
        const hours = Number((text.match(/(\d+) Stunde/) || [0, 0])[1]);
        const minutes = Number((text.match(/(\d+) Minute/) || [0, 0])[1]);
        const seconds = Number((text.match(/(\d+) Sekunde/) || [0, 0])[1]);

        return days * 86400 + hours * 3600 + minutes * 60 + seconds;
    }
    function getOrCreateProgressBar(type, container) {
        // Vorhandenen Fortschrittsbalken nur wiederverwenden, wenn er noch im Fenster hängt
        const existing = progressBars[type];

        if (existing && existing.wrapper.isConnected) {
            existing.wrapper.style.display = 'block';
            existing.bar.style.width = '0%';
            existing.bar.textContent = '';

            return existing;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'construction-progress';

        const bar = document.createElement('div');
        bar.className = 'construction-progress-bar';

        if (type === 'cancel') {
            bar.classList.add('cancel');
        }

        wrapper.appendChild(bar);

        // Zwischen Header und Tabelle platzieren
        const tableWrapper = container.querySelector('.construction-table-wrapper');

        if (tableWrapper) {
            container.insertBefore(wrapper, tableWrapper);
        } else {
            container.appendChild(wrapper);
        }

        progressBars[type] = { wrapper, bar };
        return progressBars[type];
    }
    document.getElementById('under-construction').addEventListener('click', openSobolModal);
    coinsTableObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    addMenuButton();
    initAllianceUI();
    applyCoinsButtonVisibility();
})();
