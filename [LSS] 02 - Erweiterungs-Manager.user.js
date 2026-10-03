// ==UserScript==
// @name         [LSS] Erweiterungs-Manager
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Ermöglicht das einfache Verwalten und Bauen von fehlenden Erweiterungen, Lagerräumen, Ausbaustufen und Spezialisierungen für eigene Wachen/Gebäude sowie Verbandsgebäude.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @match        https://polizei.leitstellenspiel.de/
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

    // Funktion um die Lightbox und Stile zu erstellen
    const styles = `
    :root {
        --background-color: #f2f2f2;
        --surface-color: #ffffff;
        --text-color: #000000;
        --border-color: #ccc;

        --button-background-color: #007bff;
        --button-hover-background-color: #0056b3;
        --button-text-color: #ffffff;

        --level-button-background: #e0e0e0;
        --level-button-hover: #ccc;
        --level-button-text: #000;

        --warning-color: #fd7e14;
        --warning-hover: #e96b00;
        --credits-color: #28a745;
        --coins-color: #dc3545;
        --cancel-color: #6c757d;

        --progress-background: #e0e0e0;
        --progress-fill: #4caf50;

        --input-background: #fff;
        --input-text: #000;

        --shadow-color: rgba(0, 0, 0, 0.25);
        --overlay-color: rgba(0, 0, 0, 0.55);

        --radius-small: 4px;
        --radius-medium: 6px;
        --radius-large: 10px;
    }

    body.dark {
        --background-color: #333;
        --surface-color: #3b3b3b;
        --text-color: #fff;
        --border-color: #444;

        --level-button-background: #444;
        --level-button-hover: #666;
        --level-button-text: #fff;

        --progress-background: #444;

        --input-background: #2f2f2f;
        --input-text: #fff;

        --shadow-color: rgba(0, 0, 0, 0.5);
    }

    #extension-lightbox {
        position: fixed;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--overlay-color);
        z-index: 10000;
    }

    #extension-lightbox-modal {
        width: 100%;
        max-width: 1700px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: var(--background-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-large);
        box-shadow: 0 8px 30px var(--shadow-color);
    }

    #extension-lightbox-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        padding: 10px 15px;
        background: var(--background-color);
        color: var(--text-color);
        border-bottom: 1px solid var(--border-color);
        z-index: 2;
    }

    #extension-lightbox-content {
        padding: 20px;
        overflow-y: auto;
        text-align: center;
        background: var(--background-color);
        color: var(--text-color);
    }

    #extension-lightbox-header #close-extension-helper {
        font-weight: 600;
        padding: 6px 14px;
        background: #ff4d4d;
        color: #fff;
        border: none;
        border-radius: var(--radius-medium);
        cursor: pointer;
        transition: filter 0.2s ease;
    }

    #extension-lightbox-header #close-extension-helper:hover {
        filter: brightness(0.9);
    }

    #extension-lightbox table {
        width: 100%;
        margin-top: 10px;
        border-collapse: collapse;
        font-size: 16px;
    }

    #extension-lightbox th,
    #extension-lightbox td {
        padding: 10px;
        text-align: center;
        vertical-align: middle;
    }

    #extension-lightbox td {
        background: var(--background-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
    }

    #extension-lightbox thead {
        background: var(--background-color);
        color: var(--text-color);
        font-weight: bold;
        border-bottom: 2px solid var(--border-color);
    }

    #extension-lightbox #loading-overlay {
        padding: 15px;
        margin-bottom: 15px;
        background: var(--background-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-medium);
    }

    #extension-lightbox .extension-search {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        margin: 10px 0;
        background: var(--input-background);
        color: var(--input-text);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-medium);
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    #extension-lightbox .extension-search:focus {
        border-color: var(--button-background-color);
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.15);
    }

    #extension-lightbox button,
    .currency-button,
    .cancel-button {
        border: none;
        padding: 6px 10px;
        cursor: pointer;
        border-radius: var(--radius-small);
        font-size: 14px;
        color: var(--button-text-color);
        transition: filter 0.2s ease, transform 0.1s ease;
    }

    #extension-lightbox button:hover:not(:disabled),
    .currency-button:hover:not(:disabled),
    .cancel-button:hover:not(:disabled) {
        filter: brightness(0.9);
    }

    #extension-lightbox button:active:not(:disabled),
    .currency-button:active:not(:disabled),
    .cancel-button:active:not(:disabled) {
        transform: translateY(1px);
    }

    #extension-lightbox .spoiler-button {
        background: #198754;
    }

    #extension-lightbox .lager-button {
        background: #EE9A00;
    }

    #extension-lightbox .level-button {
        background: #CD661D;
    }

    #extension-lightbox .build-selected-button {
        background: #0d6efd;
    }

    #extension-lightbox .special-button {
        background: #408080;
    }

    #extension-lightbox .build-selected-special-button {
        background: #ee6a50;
    }

    #extension-lightbox .build-all-button {
        background: #dc3545;
    }

    #extension-lightbox .build-selected-levels-button {
        background: #6f42c1;
    }

    #extension-lightbox .extension-button:disabled,
    #extension-lightbox .build-selected-button:disabled,
    #extension-lightbox .build-selected-levels-button:disabled,
    #extension-lightbox .build-selected-special-button:disabled,
    #extension-lightbox .build-all-button:disabled {
        background: #777 !important;
        color: #ddd !important;
        cursor: not-allowed;
        filter: none !important;
        transform: none !important;
    }

    #extension-lightbox button.btn-danger,
    #extension-lightbox button.btn-danger:hover,
    #extension-lightbox button.btn-danger:focus,
    #extension-lightbox button.btn-danger:active {
        background: var(--coins-color) !important;
        border-color: var(--coins-color) !important;
        color: #fff !important;
        box-shadow: none !important;
        filter: none !important;
        transition: none !important;
    }

    #extension-lightbox .button-container {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }

    #extension-lightbox .button-container > button {
        margin: 0;
    }

    #extension-lightbox .spoiler-content {
        display: none;
    }

    #extension-lightbox .level-choice-button {
        display: inline-block;
        padding: 3px 7px;
        margin: 0 2px;
        font-size: 11px;
        font-weight: bold;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        background: var(--level-button-background);
        color: var(--level-button-text);
        transition: background-color 0.2s ease, color 0.2s ease;
    }

    #extension-lightbox .level-choice-button:hover:not([data-active="true"]) {
        background: var(--level-button-hover);
    }

    #extension-lightbox .level-choice-button[data-active="true"] {
        background: var(--credits-color);
        color: #fff;
    }

    .active-button {
        background: var(--button-background-color);
        color: #fff;
        font-weight: bold;
    }

    #open-extension-helper {
        cursor: pointer;
    }

    .currency-selection {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 220px;
        padding: 20px;
        z-index: 10001;
        background: var(--background-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-large);
        box-shadow: 0 8px 25px var(--shadow-color);
    }

    .currency-button.credits-button {
        background: var(--credits-color);
    }

    .currency-button.coins-button {
        background: var(--coins-color);
    }

    .cancel-button {
        background: var(--cancel-color);
    }

    #construction-lightbox .bau-btn {
        padding: 5px 9px;
        border: none;
        border-radius: var(--radius-small);
        font-size: 13px;
        cursor: pointer;
        color: #fff;
        transition: filter 0.2s ease, transform 0.1s ease;
    }

    #construction-lightbox .bau-btn:hover {
        filter: brightness(0.9);
    }

    #construction-lightbox .bau-btn:active {
        transform: translateY(1px);
    }

    #construction-lightbox .bau-btn-danger {
        background: var(--coins-color);
    }

    #construction-lightbox .bau-btn-success {
        background: var(--credits-color);
    }

    #construction-lightbox .bau-btn-warning {
        background: var(--warning-color);
    }

    #open-alliance-buildings {
        background: #e83e8c;
        color: #fff;
    }

    #open-alliance-buildings:hover {
        filter: brightness(0.9);
    }

    .progress-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        min-width: 280px;
        padding: 20px;
        z-index: 10002;
        text-align: center;
        background: var(--background-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-large);
        box-shadow: 0 8px 25px var(--shadow-color);
    }

    .progress-container .progress-bar {
        width: 100%;
        height: 10px;
        margin-top: 10px;
        overflow: hidden;
        background: var(--progress-background);
        border-radius: 5px;
    }

    .progress-container .progress-fill {
        width: 0%;
        height: 100%;
        background: var(--progress-fill);
        border-radius: 5px;
        transition: width 0.2s ease;
    }

    .progress-container .progress-text {
        margin: 8px 0 0;
    }

    .extension-custom-alert {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        min-width: 280px;
        max-width: 500px;
        padding: 20px;
        z-index: 10003;
        text-align: center;
        background: var(--background-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-large);
        box-shadow: 0 8px 25px var(--shadow-color);
    }

    .extension-custom-alert button {
        margin-top: 15px;
        background: var(--button-background-color);
        color: var(--button-text-color);
    }

    #open-extension-settings {
    margin: 0 5px;
    padding: 6px 14px;
    font-weight: 600;
    color: var(--button-text-color);
    background: var(--button-background-color);
    border: none;
    border-radius: var(--radius-medium);
    cursor: pointer;
    transition: filter 0.2s ease, transform 0.1s ease;
    }

    #open-extension-settings:hover {
        filter: brightness(0.9);
    }

    #open-extension-settings:active {
        transform: translateY(1px);
    }
`;

    // Fügt die Stile hinzu
    const styleElement = document.createElement('style');
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);

    // Erstelle die Lightbox
    const lightbox = document.createElement('div');
    lightbox.id = 'extension-lightbox';
    lightbox.style.display = 'none';
    lightbox.innerHTML = `
        <div id="extension-lightbox-modal">
          <div id="extension-lightbox-header" style="display:flex; justify-content:space-between; align-items:center; padding:10px;">
            <div id="user-balance" style="display:flex; gap:20px; text-align:left;">
             <div id="alliance-balance" style="display:flex; gap:20px; text-align:left;">
              <div>
                <div>Aktuelle Credits: <span id="current-credits" style="color: var(--credits-color); font-weight:bold;">...</span></div>
                <div>Aktuelle Coins: <span id="current-coins" style="color: var(--coins-color); font-weight:bold;">...</span></div>
              </div>
              <div>
                <div>Ausgewählte Credits: <span id="selected-credits" style="color: var(--credits-color); font-weight:bold;">0</span></div>
                <div>Ausgewählte Coins: <span id="selected-coins" style="color: var(--coins-color); font-weight:bold;">0</span></div>
              </div>
            </div>
            <div id="alliance-info" style="display:none;">
               <div>Aktuelle Verbands-Credits: <span id="current-alliance-credits" style="color: deeppink; font-weight:bold;">...</span><br>
               Ausgewählte Verbands-Credits: <span id="selected-alliance-credits" style="color: deeppink; font-weight:bold;">0</span></div>
             </div>
            </div>
            <div style="display:flex; gap:10px;">
              <button id="under-construction" style="background-color:#17a2b8; color:white; border:none; border-radius:4px; padding:5px 10px;">
                Aktuell Im Bau oder Fertiggestellt
              </button>
              <button id="open-alliance-buildings" style="background-color: deeppink; color:white; border:none; border-radius:4px; padding:5px 10px; display:none;">
                Verbandsgebäude
              </button>
              <button id="close-extension-helper" style="padding:5px 10px;">Schließen</button>
            </div>
          </div>
          <div id="extension-lightbox-content">
            <h3>🚒🏗️ <strong>Herzlich willkommen beim ultimativen Ausbau-Assistenten für Eure Wachen!</strong> 🚒🏗️</h3>
            <br>
                <h2 style="margin:0;">Dem Erweiterungs-Manager</h2>
            <h5>
              <br><br>Dieses kleine Helferlein zeigt euch genau, wo noch Platz in euren Wachen ist: Welche <strong>Erweiterungen, Lagerräume</strong> und <strong>Ausbaustufen</strong> noch möglich sind – und mit nur ein paar Klicks geht’s direkt in den Ausbau.
              <br><br>Einfacher wird’s nicht!
              <br><br>Und das Beste: Über den
              <button id="open-extension-settings">Einstellungen</button>
              -Button könnt ihr festlegen, welche Erweiterungen und Lagerräume euch pro Wachen-Typ angezeigt werden – ganz nach eurem Geschmack. Einmal gespeichert, für immer gemerkt.
              <br><br>Kleiner Hinweis am Rande: Feedback, Verbesserungsvorschläge oder Kritik zum Skript sind jederzeit im
              <a href="https://forum.leitstellenspiel.de/index.php?thread/27856-script-erweiterungs-manager/" target="_blank" style="color:#007bff; text-decoration:none;">
                <strong>Forum</strong>
              </a> willkommen. 💌
              <br><br><br>Und nun viel Spaß beim Credits oder Coins ausgeben!
              <br><br>
              <div id="loading-container" style="display:none; padding:20px; text-align:center;">
                 <div id="loading-text" style="font-weight:bold; font-size:16px;">Lade Daten</div>
                 <div id="loading-progress" style="margin-top:6px; font-size:13px; opacity:0.75;"></div>
              </div>
              <div id="extension-list"></div>
            </h5>
          </div>
        </div>
        `;

    document.body.appendChild(lightbox);

    // Alliance info anzeigen & Button ggf. sichtbar machen
    getAllianceInfo().then(info => {
        allianceInfo = info;

        const allianceBtn = document.getElementById('open-alliance-buildings');
        const allianceInfoDiv = document.getElementById('alliance-info');
        const allianceCreditsSpan = document.getElementById('current-alliance-credits');

        if (!info) {
            if (allianceBtn) allianceBtn.style.display = 'none';
            if (allianceInfoDiv) allianceInfoDiv.style.display = 'none';
            return;
        }

        const hasRights = Boolean(info.admin) || Boolean(info.coadmin) || Boolean(info.finance);

        if (hasRights) {
            // Verbandscredits anzeigen
            if (allianceCreditsSpan) allianceCreditsSpan.textContent = (info.credits_current || 0).toLocaleString();
            if (allianceInfoDiv) allianceInfoDiv.style.display = 'flex';

            // Button sichtbar machen und Handler anhängen
            if (allianceBtn) {
                allianceBtn.style.display = 'inline-block';
                allianceBtn.textContent = 'Verbandsgebäude';
                allianceBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (currentView === 'alliance') {
                        currentView = 'personal';
                        allianceBtn.textContent = 'Verbandsgebäude';
                        setLightboxTitleForView();
                        await fetchBuildingsAndRender();
                    } else {
                        currentView = 'alliance';
                        allianceBtn.textContent = 'Eigene Wachen';
                        setLightboxTitleForView();
                        await fetchAllianceBuildingsAndRender();
                    }
                });
            }
        } else {
            // Keine Rechte: verstecken
            if (allianceBtn) allianceBtn.style.display = 'none';
            if (allianceInfoDiv) allianceInfoDiv.style.display = 'none';
        }
    }).catch(err => {
        console.warn('Allianzinfo konnte nicht geladen werden', err);
    });
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Globale Variablen
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

    const buildingCountLimits = {
        0: {
            9: {
                requiredBuildings: 10,
                countSmallBuildings: true
            },
            8: {
                requiredBuildings: 10,
                countSmallBuildings: true
            }
        },
        2: {
            0: {
                requiredBuildings: 10,
                countSmallBuildings: true
            }
        },
        6: {
            14: {
                requiredBuildings: 10,
                countSmallBuildings: true
            },
            15: {
                requiredBuildings: 10,
                countSmallBuildings: true
            }
        },
        4: {
            9: {
                requiredBuildings: 5,
                countSmallBuildings: true
            }
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
        '0_small': 18,
        '1_normal': 1,
        '2_normal': 2,
        '2_small': 20,
        '3_normal': 3,
        '4_normal': 4,
        '5_normal': 5,
        '6_normal': 6,
        '6_small': 19,
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
        '29_normal': 'Autobahnpolizei',
    };
    const allowedBuildings = new Set([
        '0_normal', // Feuerwache (Normal)
        '0_small', // Feuerwache (Kleinwache)
        '4_normal', // Krankenhaus
        '6_normal', // Polizeiwache (Normal)
        '6_small', // Polizeiwache (Kleinwache)
        '2_normal', // Rettungswache (Normal)
        '2_small', // Rettungswache (Kleinwache)
        '15_normal', // Wasserrettung
        '25_normal', // Bergrettungswache
        '26_normal', // Seenotrettungswache
        '29_normal', // Autobahnpolizei
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
    const defaultExtensionSettings = {};

    // Erweiterungen & Lagerräume in default settings laden
    for (const category in manualExtensions) {
        for (const ext of manualExtensions[category]) {
            defaultExtensionSettings[`${category}_${ext.id}`] = true;
        }
    }
    for (const category in manualStorageRooms) {
        for (const room of manualStorageRooms[category]) {
            const key = `${category}_storage_${room.name.replace(/\s+/g, '_')}`;
            defaultExtensionSettings[key] = true;
        }
    }
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // Verbandsgebäude
    // Ruft die Verbandsinformationen ab und ermittelt Guthaben sowie Berechtigungen
    async function getAllianceInfo() {
        try {
            const resp = await fetch('/api/allianceinfo');
            if (!resp.ok) {
                console.warn('getAllianceInfo: /api/allianceinfo returned', resp.status);
                return null;
            }

            const data = await resp.json();
            let credits_current = Number(data.credits_current ?? data.credits ?? 0);
            let admin = false, coadmin = false, finance = false;
            if (typeof data.admin !== 'undefined' || typeof data.coadmin !== 'undefined' || typeof data.finance !== 'undefined') {
                admin = Boolean(data.admin);
                coadmin = Boolean(data.coadmin);
                finance = Boolean(data.finance);
            }
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
                }

                if (currentUserId !== null) {
                    const me = members.find(m => Number(m.id) === Number(currentUserId) || Number(m.user_id) === Number(currentUserId) || m.name === (window.current_user_name || ''));
                    if (me) {
                        if (me.role_flags && typeof me.role_flags === 'object') {
                            admin = admin || Boolean(me.role_flags.admin);
                            coadmin = coadmin || Boolean(me.role_flags.coadmin);
                            finance = finance || Boolean(me.role_flags.finance);
                        }
                        admin = admin || Boolean(me.admin || me.is_admin);
                        coadmin = coadmin || Boolean(me.coadmin);
                        finance = finance || Boolean(me.finance);
                        const anyAdmin = members.find(m => (m.role_flags && m.role_flags.admin) || m.admin || m.role === 'Verbands-Admin');
                        if (anyAdmin) {
                        }
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

            if (!info) return;

            const hasRights = Boolean(info.admin) || Boolean(info.coadmin) || Boolean(info.finance);

            if (!hasRights) {
                if (allianceBtn) allianceBtn.style.display = 'none';
                if (allianceInfoDiv) allianceInfoDiv.style.display = 'none';
                return;
            }

            if (allianceCreditsSpan) allianceCreditsSpan.textContent = (info.credits_current || 0).toLocaleString();
            const selAllianceSpan = document.getElementById('selected-alliance-credits');
            if (selAllianceSpan) selAllianceSpan.textContent = '0';
            if (allianceInfoDiv) allianceInfoDiv.style.display = 'flex';

            if (allianceBtn) {
                allianceBtn.style.display = 'inline-block';
                allianceBtn.textContent = 'Verbandsgebäude';
                allianceBtn.replaceWith(allianceBtn.cloneNode(true));
                const newBtn = document.getElementById('open-alliance-buildings');

                newBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (currentView === 'alliance') {
                        currentView = 'personal';
                        newBtn.textContent = 'Verbandsgebäude';
                        setLightboxTitleForView();
                        await fetchBuildingsAndRender();
                    } else {
                        currentView = 'alliance';
                        newBtn.textContent = 'Eigene Wachen';
                        setLightboxTitleForView();
                        await fetchAllianceBuildingsAndRender();
                    }
                });
            }
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
        function stopLoadingAnimation() { clearInterval(dotInterval); }

        if (loadingContainer) loadingContainer.style.display = 'block';
        if (extensionList) extensionList.style.display = 'none';
        startLoadingAnimation();

        try {
            const response = await fetch('/api/alliance_buildings');
            if (!response.ok) throw new Error('Fehler beim Abrufen der Verbandsgebäude');
            const buildingsData = await response.json();

            // Speichern
            allianceBuildingsData = buildingsData;
            if (!allianceInfo) {
                allianceInfo = await getAllianceInfo();
            }
            const hasRights = allianceInfo && (allianceInfo.admin || allianceInfo.coadmin || allianceInfo.finance);

            if (hasRights && allianceInfo && document.getElementById('current-alliance-credits')) {
                document.getElementById('current-alliance-credits').textContent = (allianceInfo.credits_current || 0).toLocaleString();
                const allianceInfoDiv = document.getElementById('alliance-info');
                if (allianceInfoDiv) allianceInfoDiv.style.display = 'flex';
            }
            const allianceUserInfo = {
                credits: allianceInfo ? (allianceInfo.credits_current || 0) : 0,
                coins: 0,
                premium: false
            };
            await renderMissingExtensions(buildingsData, allianceUserInfo);

            stopLoadingAnimation();
            if (loadingContainer) loadingContainer.style.display = 'none';
            if (extensionList) extensionList.style.display = 'block';

        } catch (error) {
            stopLoadingAnimation();
            if (loadingContainer) loadingContainer.style.display = 'none';
            if (extensionList) extensionList.style.display = 'block';
            if (extensionList) extensionList.innerHTML = 'Fehler beim Laden der Verbandsgebäude.';
            console.error(error);
        }
    }

    // Passt den Titel des Erweiterungs-Managers an die aktuell angezeigte Ansicht an
    function setLightboxTitleForView() {
        const titleEl = document.querySelector('#extension-lightbox-content h2');
        if (!titleEl) return;
        if (currentView === 'alliance') {
            titleEl.textContent = 'Verbandsgebäude - Erweiterungs-Manager';
        } else {
            titleEl.textContent = 'Dem Erweiterungs-Manager';
        }
    }

    // Prüft, ob der aktuelle Benutzer über Berechtigungen zum Bauen von Verbandsgebäuden verfügt
    function hasAllianceBuildingRights() {
        return allianceInfo && (
            Boolean(allianceInfo.admin) ||
            Boolean(allianceInfo.coadmin) ||
            Boolean(allianceInfo.finance)
        );
    }

    // Prüft, ob die angegebene Gebäudekategorie zu den Verbandsgebäuden gehört
    function isAllianceBuildingCategory(category) {
        return [
            '1_normal',
            '3_normal',
            '4_normal',
            '8_normal',
            '10_normal',
            '16_normal'
        ].includes(category);
    }
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Bereich für die Einstellungen
    // Funktion um Einstellungen zu speichern
    function saveExtensionSettings(settings) {
        GM_setValue(SETTINGS_KEY, settings);
    }

    // Funktion zum beziehen der gespeicherten Einstellungen
    function getExtensionSettings() {
        return { ...defaultExtensionSettings, ...GM_getValue(SETTINGS_KEY, {}) };
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

    // Funktion um das Overlay anzuzeigen
    function openExtensionSettingsOverlay() {
        const settings = getExtensionSettings();
        const allianceRights = hasAllianceBuildingRights();

        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10001,
            overflowY: 'auto'
        });

        const panel = document.createElement('div');

        Object.assign(panel.style, {
            margin: '30px auto',
            background: 'var(--background-color, #fff)',
            color: 'var(--text-color, #000)',
            borderRadius: '10px',
            maxWidth: '900px',
            height: 'calc(100vh - 80px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 0 10px rgba(0,0,0,0.25)'
        });

        // Beschreibung
        const description = document.createElement('div');

        Object.assign(description.style, {
            padding: '20px 20px 0',
            marginBottom: '20px',
            flexShrink: '0'
        });

        const descHeading = document.createElement('h4');
        Object.assign(descHeading.style, {
            marginBottom: '10px',
            fontSize: '1.2em',
            lineHeight: '1.4'
        });
        descHeading.textContent = '🛠️ Erweiterungen & Lagerräume anpassen';

        const descText = document.createElement('p');
        descText.textContent =
            'Bestimme, welche Erweiterungen und Lagerräume in den jeweiligen Gebäudearten angezeigt werden. Eigene Gebäude und Verbandsgebäude können unabhängig voneinander konfiguriert werden.';
        Object.assign(descText.style, {
            lineHeight: '1.6',
            margin: '0'
        });

        description.appendChild(descHeading);
        description.appendChild(descText);
        panel.appendChild(description);

        // Tabs
        const btnGroup = document.createElement('div');
        Object.assign(btnGroup.style, {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            margin: '0 20px 15px',
            paddingBottom: '10px',
            borderBottom: '1px solid var(--border-color, #ccc)',
            flexShrink: '0'
        });

        const tabButtons = {};

        function createTabButton(id, text) {
            const btn = document.createElement('button');

            btn.id = id;
            btn.className = 'tab-btn';
            btn.type = 'button';
            btn.textContent = text;

            Object.assign(btn.style, {
                background: 'transparent',
                color: 'var(--text-color, #000)',
                padding: '7px 14px',
                border: '1px solid var(--border-color, #ccc)',
                borderRadius: '4px',
                cursor: 'pointer'
            });

            tabButtons[id] = btn;
            btnGroup.appendChild(btn);

            return btn;
        }

        const ownBtn = createTabButton(
            'tab-own-btn',
            'Eigene Wachen / Gebäude'
        );

        const storageBtn = createTabButton(
            'tab-storage-btn',
            'Lagerräume'
        );

        let allianceBtn = null;

        if (allianceRights) {
            allianceBtn = createTabButton(
                'tab-alliance-btn',
                'Verbandsgebäude'
            );
        }

        panel.appendChild(btnGroup);

        // Tab-Inhalt
        const tabContent = document.createElement('div');
        tabContent.id = 'settings-tab-content';

        Object.assign(tabContent.style, {
            flex: '1',
            minHeight: '0',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '0 20px',
            margin: '0'
        });

        panel.appendChild(tabContent);

        panel.appendChild(tabContent);

        function activateTab(button) {
            Object.values(tabButtons).forEach(btn => {
                Object.assign(btn.style, {
                    background: 'transparent',
                    color: 'var(--text-color, #000)',
                    border: '1px solid var(--border-color, #ccc)'
                });
            });

            if (button) {
                Object.assign(button.style, {
                    background: '#007bff',
                    color: 'white',
                    border: 'none'
                });
            }
        }

        function createSpoilerLegend(text) {
            const legend = document.createElement('legend');

            Object.assign(legend.style, {
                color: 'var(--text-color, #000)',
                borderBottom: '1px solid var(--border-color, #ccc)',
                padding: '6px 10px',
                marginBottom: '6px',
                cursor: 'pointer',
                userSelect: 'none',
                fontWeight: '600',
                fontSize: '0.95em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            });

            const arrow = document.createElement('span');
            arrow.textContent = '▶';
            arrow.style.transition = 'transform 0.2s ease';

            const labelText = document.createElement('span');
            labelText.textContent = text;

            legend.appendChild(arrow);
            legend.appendChild(labelText);

            return {legend, arrow};
        }

        function categoryHasExtensions(category) {
            return Array.isArray(manualExtensions[category]) &&
                manualExtensions[category].length > 0;
        }

        function categoryHasStorage(category) {
            return Array.isArray(manualStorageRooms[category]) &&
                manualStorageRooms[category].length > 0;
        }

        function createExtensionForm(categories, isAlliance = false) {
            const form = document.createElement('form');
            let visibleCategories = 0;

            categories.forEach(category => {
                const extensions = Array.isArray(manualExtensions[category])
                ? manualExtensions[category]
                : [];

                if (extensions.length === 0) return;

                const fieldset = document.createElement('fieldset');
                fieldset.style.marginBottom = '12px';

                const {legend, arrow} = createSpoilerLegend(
                    buildingTypeNames[category] || category
                );

                const content = document.createElement('div');

                Object.assign(content.style, {
                    display: 'none',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '8px',
                    padding: '8px 0'
                });

                const allLabel = document.createElement('label');

                Object.assign(allLabel.style, {
                    gridColumn: '1 / -1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '500'
                });

                const selectAllCheckbox = document.createElement('input');
                selectAllCheckbox.type = 'checkbox';

                const selectAllText = document.createElement('span');
                selectAllText.textContent =
                    'Alle Erweiterungen an-/abwählen';

                Object.assign(selectAllText.style, {
                    fontWeight: 'bold',
                    color: 'var(--primary-color, #007bff)'
                });

                allLabel.appendChild(selectAllCheckbox);
                allLabel.appendChild(selectAllText);
                content.appendChild(allLabel);

                const checkboxes = [];

                extensions
                    .slice()
                    .sort((a, b) => {
                    const aAlpha = /^[A-Za-z]/.test(a.name);
                    const bAlpha = /^[A-Za-z]/.test(b.name);

                    if (aAlpha && !bAlpha) return -1;
                    if (!aAlpha && bAlpha) return 1;

                    return a.name.localeCompare(b.name, 'de', {
                        numeric: true
                    });
                })
                    .forEach(ext => {
                    const key = getExtensionSettingKey(
                        category,
                        ext.id,
                        isAlliance
                    );

                    const label = document.createElement('label');

                    Object.assign(label.style, {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    });

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = settings[key] ?? true;
                    checkbox.dataset.key = key;

                    checkbox.addEventListener('change', () => {
                        settings[key] = checkbox.checked;

                        selectAllCheckbox.checked =
                            checkboxes.length > 0 &&
                            checkboxes.every(cb => cb.checked);
                    });

                    label.appendChild(checkbox);
                    label.append(` ${ext.name}`);

                    content.appendChild(label);
                    checkboxes.push(checkbox);
                });

                selectAllCheckbox.checked =
                    checkboxes.length > 0 &&
                    checkboxes.every(cb => cb.checked);

                selectAllCheckbox.addEventListener('change', () => {
                    checkboxes.forEach(cb => {
                        cb.checked = selectAllCheckbox.checked;
                        settings[cb.dataset.key] = cb.checked;
                    });
                });

                legend.addEventListener('click', () => {
                    const open = content.style.display === 'grid';

                    content.style.display = open ? 'none' : 'grid';
                    arrow.textContent = open ? '▶' : '▼';
                });

                fieldset.appendChild(legend);
                fieldset.appendChild(content);
                form.appendChild(fieldset);

                visibleCategories++;
            });

            return {
                form,
                visibleCategories
            };
        }

        function createStorageForm(categories, isAlliance = false) {
            const form = document.createElement('form');
            let visibleCategories = 0;

            categories.forEach(category => {
                const storageRooms = Array.isArray(manualStorageRooms[category])
                ? manualStorageRooms[category]
                : [];

                if (storageRooms.length === 0) return;

                const fieldset = document.createElement('fieldset');
                fieldset.style.marginBottom = '12px';

                const {legend, arrow} = createSpoilerLegend(
                    buildingTypeNames[category] || category
                );

                const content = document.createElement('div');

                Object.assign(content.style, {
                    display: 'none',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '8px',
                    padding: '8px 0'
                });

                const allLabel = document.createElement('label');

                Object.assign(allLabel.style, {
                    gridColumn: '1 / -1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '500'
                });

                const selectAllCheckbox = document.createElement('input');
                selectAllCheckbox.type = 'checkbox';

                const selectAllText = document.createElement('span');
                selectAllText.textContent =
                    'Alle Lagerräume an-/abwählen';

                Object.assign(selectAllText.style, {
                    fontWeight: 'bold',
                    color: 'var(--primary-color, #007bff)'
                });

                allLabel.appendChild(selectAllCheckbox);
                allLabel.appendChild(selectAllText);
                content.appendChild(allLabel);

                const checkboxes = [];

                storageRooms.forEach(room => {
                    const key = getStorageSettingKey(
                        category,
                        room.id,
                        isAlliance
                    );

                    const label = document.createElement('label');

                    Object.assign(label.style, {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    });

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = settings[key] ?? true;
                    checkbox.dataset.key = key;

                    checkbox.addEventListener('change', () => {
                        settings[key] = checkbox.checked;

                        selectAllCheckbox.checked =
                            checkboxes.length > 0 &&
                            checkboxes.every(cb => cb.checked);
                    });

                    label.appendChild(checkbox);
                    label.append(` ${room.name}`);

                    content.appendChild(label);
                    checkboxes.push(checkbox);
                });

                selectAllCheckbox.checked =
                    checkboxes.length > 0 &&
                    checkboxes.every(cb => cb.checked);

                selectAllCheckbox.addEventListener('change', () => {
                    checkboxes.forEach(cb => {
                        cb.checked = selectAllCheckbox.checked;
                        settings[cb.dataset.key] = cb.checked;
                    });
                });

                legend.addEventListener('click', () => {
                    const open = content.style.display === 'grid';

                    content.style.display = open ? 'none' : 'grid';
                    arrow.textContent = open ? '▶' : '▼';
                });

                fieldset.appendChild(legend);
                fieldset.appendChild(content);
                form.appendChild(fieldset);

                visibleCategories++;
            });

            return {
                form,
                visibleCategories
            };
        }

        function appendSectionHeading(text) {
            const heading = document.createElement('h5');

            Object.assign(heading.style, {
                margin: '20px 0 10px',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--border-color, #ccc)'
            });

            heading.textContent = text;
            tabContent.appendChild(heading);
        }

        function appendEmptyMessage(text) {
            const message = document.createElement('div');

            Object.assign(message.style, {
                padding: '15px',
                textAlign: 'center',
                opacity: '0.7',
                fontStyle: 'italic'
            });

            message.textContent = text;
            tabContent.appendChild(message);
        }

        // Eigene Wachen / Gebäude
        function createOwnTab() {
            tabContent.innerHTML = '';
            activateTab(ownBtn);

            const categories = Object.keys(buildingTypeNames).filter(category => {
                if (category === '16_normal') return false;

                return categoryHasExtensions(category);
            });

            const result = createExtensionForm(categories, false);

            if (result.visibleCategories === 0) {
                appendEmptyMessage(
                    'Für eigene Gebäude sind keine Erweiterungen konfigurierbar.'
                );
                return;
            }

            tabContent.appendChild(result.form);
        }

        // Eigene Lagerräume
        function createStorageTab() {
            tabContent.innerHTML = '';
            activateTab(storageBtn);

            const categories = Object.keys(buildingTypeNames).filter(category => {
                if (category === '16_normal') return false;

                return categoryHasStorage(category);
            });

            if (categories.length === 0) {
                appendEmptyMessage(
                    'Für eigene Gebäude sind keine Lagerräume konfigurierbar.'
                );
                return;
            }

            const result = createStorageForm(
                categories,
                false
            );

            tabContent.appendChild(result.form);
        }

        // Verbandsgebäude
        function createAllianceTab() {
            tabContent.innerHTML = '';
            activateTab(allianceBtn);

            if (!allianceRights) {
                appendEmptyMessage(
                    'Du besitzt keine Berechtigung zur Verwaltung von Verbandsgebäuden.'
                );
                return;
            }

            // Im Verbandsbereich ausschließlich Krankenhäuser, Schulen und Verbandszellen
            const allianceCategories = [
                '1_normal',
                '3_normal',
                '4_normal',
                '8_normal',
                '10_normal',
                '16_normal'
            ].filter(category => categoryHasExtensions(category));

            const result = createExtensionForm(
                allianceCategories,
                true
            );

            if (result.visibleCategories === 0) {
                appendEmptyMessage(
                    'Für Verbandsgebäude sind keine Erweiterungen konfigurierbar.'
                );
                return;
            }

            tabContent.appendChild(result.form);
        }

        ownBtn.addEventListener('click', createOwnTab);
        storageBtn.addEventListener('click', createStorageTab);

        if (allianceBtn) {
            allianceBtn.addEventListener('click', createAllianceTab);
        }
        createOwnTab();

        // Buttons
        const buttonContainer = document.createElement('div');

        Object.assign(buttonContainer.style, {
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color, #ccc)',
            background: 'var(--background-color, #fff)',
            flexShrink: '0'
        });

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.textContent = 'Speichern';

        Object.assign(saveBtn.style, {
            background: '#28a745',
            color: 'white',
            padding: '6px 12px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
        });

        saveBtn.addEventListener('click', () => {
            saveExtensionSettings(settings);

            alert(
                'Deine Einstellungen wurden gespeichert. Die Seite wird neu geladen, um diese zu übernehmen.'
            );

            overlay.remove();
            location.reload();
        });

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = 'Schließen';

        Object.assign(closeBtn.style, {
            backgroundColor: '#dc3545',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer'
        });

        closeBtn.addEventListener('click', () => overlay.remove());

        buttonContainer.appendChild(saveBtn);
        buttonContainer.appendChild(closeBtn);
        panel.appendChild(buttonContainer);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);
    }
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Funktion zum Formatieren der Zahl
    function formatNumber(number) {
        return new Intl.NumberFormat('de-DE').format(number);
    }

    // Funktion zum Abrufen des CSRF-Tokens
    function getCSRFToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
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

            checkPremiumAndShowHint();
            loadManualDataFromLSSM();
            checkPremiumStatus();
            getAllianceInfo();
            initAllianceUI();
            initUserCredits();
            fetchBuildingsAndRender();
            updateBuildSelectedButton();
            startConstructionCountdowns();
        });

        menuButton.appendChild(link);

        const divider = profileMenu.querySelector('li.divider');

        if (divider) {
            profileMenu.insertBefore(menuButton, divider);
        } else {
            profileMenu.appendChild(menuButton);
        }

        const openBtn = document.getElementById('open-extension-settings');

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                openExtensionSettingsOverlay();
            });
        }
    }

    // Funktion, um den Premium-Status zu überprüfen
    function checkPremiumStatus() {
        const scripts = document.getElementsByTagName('script');
        for (const script of scripts) {
            const scriptContent = script.textContent || '';
            const premiumMatch = scriptContent.match(
                /\buser_premium\s*=\s*(true|false)\s*;/
            );
            if (premiumMatch) {
                const premium = premiumMatch[1] === 'true';
                return premium;
            }
        }
        console.error(
            "[Erweiterungs-Manager] 'user_premium' wurde im HTML nicht gefunden."
        );

        return false;
    }

    // Funktion zur Prüfung von Premium und Hinweis
    async function checkPremiumAndShowHint() {
        function createCustomAlert(message, callback) {
            const alertDiv = document.createElement('div');

            Object.assign(alertDiv.style, {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                padding: '20px',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                boxShadow: '0 0 10px rgba(0,0,0,0.2)',
                width: '300px',
                textAlign: 'center',
                zIndex: '10002',
                background: 'var(--background-color)',
                color: 'var(--text-color)'
            });

            const alertText = document.createElement('p');
            alertText.textContent = message;
            alertDiv.appendChild(alertText);

            const closeButton = document.createElement('button');
            closeButton.textContent = 'OK';

            Object.assign(closeButton.style, {
                marginTop: '10px',
                padding: '5px 10px',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
                backgroundColor: 'var(--button-background-color)',
                color: 'var(--button-text-color)'
            });

            closeButton.onclick = () => {
                alertDiv.remove();
                callback();
            };

            alertDiv.appendChild(closeButton);
            document.body.appendChild(alertDiv);
        }

        const isPremium = checkPremiumStatus();

        if (!isPremium) {
            createCustomAlert(
                'Du kannst dieses Script nur mit Einschränkungen nutzen da du keinen Premium-Account hast.',
                () => {
                    const lightbox = document.getElementById('extension-lightbox');

                    if (lightbox) {
                        lightbox.style.display = 'flex';
                        fetchBuildingsAndRender();
                    }
                }
            );

            return;
        }

        const lightbox = document.getElementById('extension-lightbox');

        if (lightbox) {
            lightbox.style.display = 'flex';
            fetchBuildingsAndRender();
        }
    }

    // Daten vom der LSSM API beziehen
    async function loadManualDataFromLSSM() {
        const response = await fetch(
            'https://api.lss-manager.de/de_DE/buildings',
            {
                method: 'GET',
                cache: 'no-store'
            }
        );

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
        const specializationsData = {};

        for (const [key, apiId] of Object.entries(buildingTypeApiMapping)) {
            const building = buildings[String(apiId)];

            if (!building) {
                console.warn(
                    `[LSSM] Gebäudetyp ${apiId} für "${key}" wurde nicht gefunden.`
                );
                continue;
            }

            if (Array.isArray(building.extensions)) {
                extensionsData[key] = building.extensions
                    .map((extension, id) => {
                    if (!extension) return null;

                    return {
                        id,
                        name: extension.caption ?? `Erweiterung ${id}`,
                        cost: Number(extension.credits ?? 0),
                        coins: Number(extension.coins ?? 0)
                    };
                })
                    .filter(Boolean);
            }
            if (
                building.storageUpgrades &&
                typeof building.storageUpgrades === 'object'
            ) {
                storageData[key] = Object.entries(building.storageUpgrades)
                    .map(([id, storage]) => {
                    if (!storage) return null;

                    return {
                        id,
                        name: storage.caption ?? id,
                        cost: Number(storage.credits ?? 0),
                        coins: Number(storage.coins ?? 0),
                        additionalStorage: Number(
                            storage.additionalStorage ?? 0
                        )
                    };
                })
                    .filter(Boolean);
            }

            if (
                building.levelPrices &&
                Array.isArray(building.levelPrices.credits)
            ) {
                const credits = building.levelPrices.credits;

                const coins = Array.isArray(building.levelPrices.coins)
                ? building.levelPrices.coins
                : [];

                levelsData[key] = credits.map((cost, id) => ({
                    id: id + 1,
                    name: String(id + 1),
                    cost: Number(cost ?? 0),
                    coins: Number(coins[id] ?? 0)
                }));
            }
        }

        // Die drei bestehenden Variablen befüllen
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

        let dotInterval;

        function startLoadingAnimation() {
            let dots = 0;

            if (loadingText) {
                loadingText.textContent =
                    'Lade die Gebäudedaten, je nach Anzahl der Gebäude und Serverlast kann dies einen Augenblick dauern';
            }

            dotInterval = setInterval(() => {
                dots = (dots + 1) % 4;

                if (loadingText) {
                    loadingText.textContent =
                        'Lade die Gebäudedaten, je nach Anzahl der Gebäude und Serverlast kann dies einen Augenblick dauern' +
                        '.'.repeat(dots);
                }
            }, 500);
        }

        function stopLoadingAnimation() {
            clearInterval(dotInterval);
        }

        loadingContainer.style.display = 'block';
        extensionList.style.display = 'none';

        if (loadingProgress) {
            loadingProgress.textContent = '';
        }

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
                            nextPage +
                            (nextPage.includes('?') ? '&' : '?') +
                            'ts=' + Date.now(),
                            {
                                credentials: 'same-origin',
                                cache: 'no-store',
                                headers: {
                                    'Accept': 'application/json'
                                }
                            }
                        );

                        if (response && response.ok) {
                            break;
                        }
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
                    throw new Error(
                        'Fehler beim Abrufen der Gebäudedaten'
                    );
                }

                const data = await response.json();

                if (!data || !Array.isArray(data.result)) {
                    throw new Error(
                        'Ungültige Antwort der Gebäude-V2-API'
                    );
                }

                // Gesamtanzahl aus der API übernehmen
                if (
                    expectedTotal === null &&
                    data.paging?.count_total != null
                ) {
                    expectedTotal = Number(data.paging.count_total);
                }

                // Gebäude dieser Seite hinzufügen
                allBuildings.push(...data.result);

                // Separater Fortschritt unterhalb des normalen Ladetextes
                if (loadingProgress) {
                    if (expectedTotal !== null) {
                        loadingProgress.textContent =
                            `${allBuildings.length} von ${expectedTotal} Gebäuden geladen`;
                    } else {
                        loadingProgress.textContent =
                            `${allBuildings.length} Gebäude geladen`;
                    }
                }

                // Nächste Seite direkt von der API übernehmen
                nextPage = data.paging?.next_page || null;
            }

            // Prüfen, ob tatsächlich alle Gebäude geladen wurden
            if (
                expectedTotal !== null &&
                allBuildings.length !== expectedTotal
            ) {
                console.warn(
                    `[Erweiterungs-Manager] Die API meldet ${expectedTotal} Gebäude, ` +
                    `geladen wurden jedoch nur ${allBuildings.length}.`
                );
            }

            // Vollständigen Datenbestand global speichern
            buildingsData = allBuildings;
            buildingsData.forEach(building => {
                getBuildingLevelInfo(building);
            });

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

            if (loadingProgress) {
                loadingProgress.textContent = '';
            }

            extensionList.innerHTML =
                'Fehler beim Laden der Gebäudedaten.';

            console.error(
                '[Erweiterungs-Manager] Fehler beim Laden der Gebäudedaten:',
                error
            );
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
        const key = `${type}_${size}`;
        const levelData = manualLevels[key];
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

    // Funktion, um den Namen eines Gebäudes anhand der ID zu bekommen
    function getBuildingCaption(buildingId) {
        const building = buildingsData.find(b => String(b.id) === String(buildingId));
        if (building) {

            return building.caption;
        }
        return 'Unbekanntes Gebäude';
    }

    // Funktion um die Building ID zu beziehen
    function getBuildingTypeKey(building) {
        return `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
    }

    // Funktion zur Ermittlung von Wachen mit Spezialisierungen
    function getAvailableSpecializations(building) {
        if (
            building.specialization?.active ||
            building.specialization?.available === false
        ) {
            return [];
        }

        const buildingTypeKey =
              `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;

        const finishedExtensions = new Set(
            (building.extensions || [])
            .filter(extension =>
                    extension.available === true &&
                    extension.available_at == null
                   )
            .map(extension => Number(extension.type_id))
        );

        return Object.entries(specializationDefinitions)
            .filter(([type, definition]) =>
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

    // Funktion für die Berechnung der Creditkosten für Spezialisierungen
    function getSpecializationCount(buildings, specializationType) {
        return buildings.filter(
            building =>
            building.specialization?.active === true &&
            building.specialization.type === specializationType
        ).length;
    }

    // Ermittelt die Credit-Kosten für die nächste Spezialisierung eines Gebäudes
    function getSpecializationCreditCost(buildings, specializationType, building) {
        const count =
              getSpecializationCount(
                  buildings,
                  specializationType
              ) + 1;

        return getSpecializationCreditCostByCount(
            count,
            building.small_building
        );
    }

    // Berechnet die Credit-Kosten anhand der bisherigen Anzahl an Spezialisierungen
    function getSpecializationCreditCostByCount(count) {
        let cost = count <= 3
        ? 50000
        : Math.round(
            50000 +
            100000 * Math.log2(count - 2)
        );

        // Event-Rabatt auf Spezialisierungen
        const discount = getSpecializationCreditDiscount();
        if (discount > 0) {
            cost = Math.round(
                cost * (1 - discount / 100)
            );
        }
        return cost;
    }

    // Aktualisiert die angezeigten Spezialisierungspreise anhand der aktuellen Auswahl
    function updateSpecializationPrices(buildings) {
        if (!Array.isArray(buildings)) return;

        const counts = {};
        const rowsByType = {};

        // Bereits gebaute Spezialisierungen zählen
        buildings.forEach(building => {
            const type = building.specialization?.type;

            if (building.specialization?.active && type) {
                counts[type] = (counts[type] || 0) + 1;
            }
        });

        // Alle Spezialisierungszeilen nach Typ sammeln
        document.querySelectorAll(
            '.extension-checkbox[data-specialization-type]'
        ).forEach(cb => {
            const type = cb.dataset.apiType;

            if (!type) return;

            if (!rowsByType[type]) {
                rowsByType[type] = [];
            }

            rowsByType[type].push(cb);
        });

        // Preise je Spezialisierungstyp berechnen
        Object.entries(rowsByType).forEach(([type, checkboxes]) => {
            const selected = checkboxes
            .filter(cb => cb.checked)
            .sort(
                (a, b) =>
                Number(a.dataset.selectionOrder || 0) -
                Number(b.dataset.selectionOrder || 0)
            );

            let position = counts[type] || 0;

            // Ausgewählte Spezialisierungen bekommen ihre feste Position
            selected.forEach(cb => {
                const building = buildings.find(
                    b => String(b.id) === String(cb.dataset.buildingId)
                );

                if (!building) return;

                position++;

                const cost = getSpecializationCreditCostByCount(
                    position,
                    building.small_building
                );

                cb.dataset.creditCost = cost;

                const row = cb.closest('tr');
                const creditBtn = row?.querySelector('.credits-button');

                if (!creditBtn) return;

                creditBtn.textContent =
                    `${formatNumber(cost)} Credits`;

                const canAfford =
                      Number(currentCredits ?? 0) >= cost;

                creditBtn.disabled = !canAfford;
                creditBtn.title = canAfford
                    ? ''
                : `Benötigt ${formatNumber(cost)} Credits`;
            });

            // Alle nicht ausgewählten Zeilen zeigen den nächsten Preis
            const nextPosition = position + 1;

            checkboxes
                .filter(cb => !cb.checked)
                .forEach(cb => {
                const building = buildings.find(
                    b => String(b.id) === String(cb.dataset.buildingId)
                );

                if (!building) return;

                const cost = getSpecializationCreditCostByCount(
                    nextPosition,
                    building.small_building
                );

                cb.dataset.creditCost = cost;

                const row = cb.closest('tr');
                const creditBtn = row?.querySelector('.credits-button');

                if (!creditBtn) return;

                creditBtn.textContent =
                    `${formatNumber(cost)} Credits`;

                const canAfford =
                      Number(currentCredits ?? 0) >= cost;

                creditBtn.disabled = !canAfford;
                creditBtn.title = canAfford
                    ? ''
                : `Benötigt ${formatNumber(cost)} Credits`;
            });
        });
    }

    // Ermittelt einen aktuell aktiven Event-Rabatt auf Spezialisierungen
    function getSpecializationCreditDiscount() {
        const events = document.querySelectorAll(
            '[data-original-title], [title]'
        );

        for (const event of events) {
            const title =
                  event.getAttribute('data-original-title') ||
                  event.getAttribute('title') ||
                  '';

            const match = title.match(
                /Credits-Rabatt für Spezialisierungen:\s*-(\d+)%\s*auf Spezialisierungskosten/i
            );

            if (match) {
                return Number(match[1]);
            }
        }

        return 0;
    }

    // Funktion um fehlende Lagererweiterungen für eine Gebäudegruppe zu ermitteln
    function prepareStorageGroup(groupKey, group, settings) {
        if (!storageGroups[groupKey]) storageGroups[groupKey] = [];

        group.forEach(({ building }) => {
            const baseKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            const options = manualStorageRooms[baseKey];
            if (!options) return;

            const current = new Set((building.storage_upgrades || []).map(u => u.type_id));
            const missingExtensions = [];

            options.forEach(opt => {
                const id = opt.id;
                if (current.has(id)) return;

                const storageKey = getStorageSettingKey(baseKey, opt.id, currentView === 'alliance');
                if (settings[storageKey] === false) return;

                missingExtensions.push({
                    id,
                    cost: opt.cost,
                    coins: opt.coins,
                    isStorage: true
                });
            });

            if (missingExtensions.length > 0) {
                storageGroups[groupKey].push({ building, missingExtensions });
            }
        });
    }

    // Prüft Erweiterungen anhand der Gesamtanzahl der Gebäude
    function isBuildingCountLimitReached(buildings, building, extensionId) {
        const buildingType = Number(building.building_type);
        const extensionConfig =
              buildingCountLimits[buildingType]?.[Number(extensionId)];

        if (!extensionConfig) {
            return false;
        }

        const requiredBuildings =
              Number(extensionConfig.requiredBuildings) || 0;

        if (requiredBuildings <= 0) {
            return false;
        }

        const countSmallBuildings =
              extensionConfig.countSmallBuildings !== false;

        const buildingCount = buildings.filter(b =>
                                               Number(b.building_type) === buildingType &&
                                               (countSmallBuildings || !b.small_building)
                                              ).length;

        const allowedCount = Math.floor(
            buildingCount / requiredBuildings
        );

        const alreadyBuiltCount = buildings.reduce((count, b) => {
            return count + (b.extensions || []).filter(ext =>
                                                       Number(ext.type_id) === Number(extensionId)
                                                      ).length;
        }, 0);

        return alreadyBuiltCount >= allowedCount;
    }

    // Funktion zur Unterscheidung der Erweiterungswarteschlange zwischen Premium und Nicht Premium User
    function isExtensionLimitReached(building, extensionId) {
        const fireStationSmallAlwaysAllowed = [1, 2, 20, 21];
        const fireStationSmallLimited = [0, 6, 8, 13, 14, 16, 18, 19, 25];

        const policeStationSmallAlwaysAllowed = [0, 1];
        const policeStationSmallLimited = [10, 11, 12, 13, 16];

        const thwAllExtensions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // Alle THW-Erweiterungen
        const bpolAllExtensions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Alle BPol-Erweiterungen
        const polSonderEinheitAllExtensions = [0, 1, 2, 3, 4]; // Alle PolSondereinheit-Erweiterungen
        const KhAllExtensions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // Alle Krankenhaus-Erweiterungen

        // Falls Premium aktiv ist, gibt es keine Einschränkungen für THW, B-Pol, Schulen und Pol-Sondereinheit
        if (typeof user_premium !== "undefined" && user_premium) {
            return false; // Keine Einschränkungen für Premium-Nutzer
        }

        // Falls es sich um eine Schule handelt und der Benutzer kein Premium hat
        if (building.building_type === 1 || building.building_type === 3 || building.building_type === 8 || building.building_type === 10 || building.building_type === 27) {
            // Erweiterung 0 und 1 sind immer erlaubt
            if (extensionId === 0 || extensionId === 1) return false;

            // Erweiterung 2 nur erlaubt, wenn Erweiterung 0 bereits gebaut wurde
            if (extensionId === 2) {
                const hasExtension0 = building.extensions.some(ext => ext.type_id === 0);
                if (!hasExtension0) return true; // Blockiere Erweiterung 2, wenn Erweiterung 0 noch nicht gebaut wurde
            }
        }

        if (building.building_type === 0 && building.small_building) {
            // Feuerwache (Kleinwache): Prüfen, ob die Erweiterung limitiert ist
            if (fireStationSmallAlwaysAllowed.includes(extensionId)) return false;
            return building.extensions.some(ext => fireStationSmallLimited.includes(ext.type_id));
        }

        if (building.building_type === 6 && building.small_building) {
            // Polizeiwache (Kleinwache): Prüfen, ob die Erweiterung limitiert ist
            if (policeStationSmallAlwaysAllowed.includes(extensionId)) return false;
            return building.extensions.some(ext => policeStationSmallLimited.includes(ext.type_id));
        }

        if (building.building_type === 4) {
            // Krankenhaus
            const khRequiredFirst = [0, 1];
            const khRestrictedUntilFirstTwo = [2, 3, 4, 5, 6, 7, 8];
            const khAlwaysAllowed = [9];

            if (khAlwaysAllowed.includes(extensionId)) return false;

            const hasRequiredFirstExtensions = khRequiredFirst.every(reqId =>
                                                                     building.extensions.some(ext => ext.type_id === reqId)
                                                                    );

            if (khRestrictedUntilFirstTwo.includes(extensionId) && !hasRequiredFirstExtensions) {
                return true;
            }

            return false;
        }

        if (building.building_type === 9) {
            // THW
            const thwRequiredFirst = [0, 1];
            const thwRestrictedUntilFirstTwo = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 15];
            const thwAlwaysAllowed = [11, 14];

            if (thwAlwaysAllowed.includes(extensionId)) return false;

            const hasRequiredFirstExtensions = thwRequiredFirst.every(reqId =>
                                                                      building.extensions.some(ext => ext.type_id === reqId)
                                                                     );

            if (thwRestrictedUntilFirstTwo.includes(extensionId) && !hasRequiredFirstExtensions) {
                return true;
            }

            return false;
        }

        if (building.building_type === 11) {
            // BPol
            const bpolAlwaysAllowed = [0, 3, 4, 6, 8, 9, 10];
            const bpolConditional = { 1: 0, 2: 1, 5: 4, 7: 8 };

            if (bpolAlwaysAllowed.includes(extensionId)) return false;
            if (bpolConditional[extensionId] !== undefined) {
                return !building.extensions.some(ext => ext.type_id === bpolConditional[extensionId]);
            }

            return false;
        }

        if (building.building_type === 17) {
            // PolSonderEinheit
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

    // Funktion um die Tabellen mit Daten zu füllen
    async function renderMissingExtensions(buildings, userInfoOverride = null) {
        const isAllianceView = currentView === 'alliance';
        const userInfo = userInfoOverride
        ? userInfoOverride
        : isAllianceView
        ? {
            credits: Number(allianceInfo?.credits_current || 0),
            coins: 0,
            premium: false
        }
        : await getUserCredits();

        const list = document.getElementById('extension-list');
        if (!list) return;

        list.innerHTML = '';
        buildingGroups = {};
        buildingsData = buildings;

        const settings = getExtensionSettings();
        const allianceInfo = isAllianceView ? await getAllianceInfo() : null;

        // Verbandsrechte prüfen
        if (isAllianceView && !hasAllianceBuildingRights()) {
            list.innerHTML = '<div style="padding:15px;text-align:center;opacity:.7;">Keine Berechtigung für Verbandsgebäude.</div>';
            return;
        }

        buildings.sort((a, b) =>
                       a.building_type === b.building_type
                       ? a.caption.localeCompare(b.caption)
                       : a.building_type - b.building_type
                      );

        buildings.forEach(building => {
            const baseKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;

            // Verbandszellen nur im Verbandsbereich
            if (baseKey === '16_normal' && !isAllianceView) return;

            const extensions = Array.isArray(manualExtensions[baseKey])
            ? manualExtensions[baseKey]
            : [];
            const storageOptions = Array.isArray(manualStorageRooms[baseKey])
            ? manualStorageRooms[baseKey]
            : [];
            const ignoresLevelUpgrade = ignoreLevels.includes(baseKey);
            const hasLevelUpgrade =
                  !isAllianceView &&
                  !ignoresLevelUpgrade &&
                  !!getBuildingLevelInfo(building)?.next;

            const existingExtensions = new Set(
                (building.extensions || []).map(e => Number(e.type_id))
            );
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
                ids.some(id => existingExtensions.has(Number(id))) &&
                      !ids.includes(Number(ext.id));

                if (building.building_type === 0 && building.small_building) {
                    const limited = [0, 6, 8, 13, 14, 16, 18, 19, 25];
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

        // UI erzeugen
        Object.entries(buildingGroups).forEach(([groupKey, group]) => {
            const buildingType = buildingTypeNames[groupKey] || 'Unbekannt';
            const header = createHeader(buildingType);
            const buttons = createButtonContainer(groupKey, group, userInfo);

            buttons.container.dataset.buildingType = groupKey;

            // Lager prüfen
            const hasEnabledStorage = group.some(
                ({ enabledStorages }) =>
                Array.isArray(enabledStorages) && enabledStorages.length > 0
            );

            if (buttons.lagerButton) {
                buttons.lagerButton.disabled = !hasEnabledStorage;
                buttons.lagerButton.style.opacity = hasEnabledStorage ? '1' : '0.5';
                buttons.lagerButton.style.cursor = hasEnabledStorage ? 'pointer' : 'not-allowed';
                buttons.lagerButton.title = hasEnabledStorage
                    ? ''
                : 'Keine aktivierten Lagerräume verfügbar';
            }

            // Erweiterungen prüfen
            const hasExtensions = group.some(
                ({ missingExtensions }) =>
                Array.isArray(missingExtensions) && missingExtensions.length > 0
            );

            if (buttons.spoilerButton) {
                buttons.spoilerButton.disabled = !hasExtensions;
                buttons.spoilerButton.style.opacity = hasExtensions ? '1' : '0.5';
                buttons.spoilerButton.style.cursor = hasExtensions ? 'pointer' : 'not-allowed';
                buttons.spoilerButton.title = hasExtensions
                    ? ''
                : 'Keine aktivierten Erweiterungen verfügbar';
            }

            let spoilerWrapper = null;

            if (buttons.spoilerButton && hasExtensions) {
                spoilerWrapper = createSpoilerContentWrapper(buttons.spoilerButton);

                const table = createExtensionTable(
                    groupKey,
                    group,
                    userInfo,
                    buttons.buildSelectedButton,
                    isAllianceView,
                    allianceInfo,
                    buildings
                );

                spoilerWrapper.appendChild(table);
            }

            // Lager
            const lagerWrapper =
                  buttons.lagerButton && hasEnabledStorage
            ? createLagerContentWrapper(
                buttons.lagerButton,
                group,
                userInfo,
                buttons.buildSelectedButton
            )
            : null;

            // Ausbaustufen
            const ignoresLevelUpgrade = ignoreLevels.includes(groupKey);
            const hasLevelUpgrades =
                  !isAllianceView &&
                  !ignoresLevelUpgrade &&
                  group.some(({ building }) => !!getBuildingLevelInfo(building)?.next);

            let levelWrapper = null;

            if (buttons.levelButton) {
                buttons.levelButton.disabled = !hasLevelUpgrades;
                buttons.levelButton.style.opacity = hasLevelUpgrades ? '1' : '0.5';
                buttons.levelButton.style.cursor = hasLevelUpgrades ? 'pointer' : 'not-allowed';
                buttons.levelButton.title = hasLevelUpgrades
                    ? ''
                : 'Keine weiteren Ausbaustufen verfügbar';

                if (hasLevelUpgrades) {
                    levelWrapper = createLevelContentWrapper(
                        buttons.levelButton,
                        group,
                        userInfo
                    );
                }
            }

            // Spezialisierungen
            const hasSpecializations = group.some(
                ({ building }) =>
                isSpecializationBuilding(building) &&
                getAvailableSpecializations(building).length > 0
            );

            if (buttons.specialButton) {
                buttons.specialButton.disabled = !hasSpecializations;
                buttons.specialButton.style.opacity = hasSpecializations ? '1' : '0.5';
                buttons.specialButton.style.cursor = hasSpecializations ? 'pointer' : 'not-allowed';
                buttons.specialButton.title = hasSpecializations
                    ? ''
                : 'Keine Spezialisierungen verfügbar';
            }

            const specialWrapper =
                  buttons.specialButton && hasSpecializations
            ? createSpecialContentWrapper(
                buttons.specialButton,
                group,
                userInfo,
                buildings
            )
            : null;

            // Alles einfügen
            list.append(header, buttons.container);
            if (spoilerWrapper) list.appendChild(spoilerWrapper);
            if (lagerWrapper) list.appendChild(lagerWrapper);
            if (levelWrapper) list.appendChild(levelWrapper);
            if (specialWrapper) list.appendChild(specialWrapper);

            // Wrapper gegenseitig bekannt machen
            const wrappers = [
                spoilerWrapper,
                lagerWrapper,
                levelWrapper,
                specialWrapper
            ].filter(Boolean);

            wrappers.forEach(wrapper => {
                wrapper.otherWrappers = wrappers.filter(
                    other => other !== wrapper
                );
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
    function createButtonContainer(groupKey, group, userInfo) {
        const container = document.createElement('div');
        container.classList.add('button-container');

        const spoilerButton = createButton('Erweiterungen', ['btn', 'spoiler-button']);

        const showLevelButton = group.some(({ building }) => {
            const key = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            return allowedBuildings.has(key);
        });

        let levelButton = null;
        if (showLevelButton) levelButton = createButton('Ausbaustufen', ['btn', 'level-button']);

        const canBuildStorage = group.some(({ building }) => {
            const key = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            return manualStorageRooms.hasOwnProperty(key);
        });

        let lagerButton = null;
        if (canBuildStorage) lagerButton = createButton('Lagerräume', ['btn', 'lager-button']);

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

        const hasSpecializationBuildings = group.some(({ building }) =>
                                                      isSpecializationBuilding(building)
                                                     );

        let specialButton = null;
        let buildSelectedSpecialButton = null;

        if (hasSpecializationBuildings) {
            specialButton = createButton('Spezialisierung', ['btn', 'special-button']);

            buildSelectedSpecialButton = createButton(
                'Ausgewählte Spezialisierungen bauen',
                ['btn', 'special-button', 'build-selected-special-button']
            );
            buildSelectedSpecialButton.disabled = true;
            buildSelectedSpecialButton.onclick = () =>
            buildSelectedSpecializations(buildingsData);
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

    // Funktion um die Buttons zu erstellen
    function createButton(text, classes = []) {
        const btn = document.createElement('button');
        btn.textContent = text;
        classes.forEach(cls => btn.classList.add(cls));
        return btn;
    }

    // Funktion um die Spoiler-Inhalte zu erstellen (Erweiterung/Lager/Stufenausbau)
    function createSpoilerContentWrapper(spoilerButton) {
        const wrapper = document.createElement('div');
        wrapper.className = 'spoiler-content';
        wrapper.style.display = 'none';

        spoilerButton.addEventListener('click', () => {
            const show = wrapper.style.display !== 'block';

            if (wrapper.otherWrappers) {
                wrapper.otherWrappers.forEach(other => {
                    other.style.display = 'none';
                    if (other.associatedButton) {
                        other.associatedButton.classList.remove('active-button');
                        resetButtonText(other);
                    }
                });
            }

            wrapper.style.display = show ? 'block' : 'none';
            spoilerButton.textContent = show ? 'Erweiterungen ausblenden' : 'Erweiterungen';
            spoilerButton.classList.toggle('active-button', show);
        });

        wrapper.associatedButton = spoilerButton;
        return wrapper;
    }
    function createLagerContentWrapper(lagerButton, group, userInfo, buildSelectedButton) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('lager-wrapper');
        wrapper.style.display = 'none';
        wrapper.style.marginTop = '10px';

        const lagerTable = createLagerTable(group, userInfo, buildSelectedButton);
        wrapper.appendChild(lagerTable);

        lagerButton.addEventListener('click', () => {
            const show = wrapper.style.display !== 'block';

            if (wrapper.otherWrappers) {
                wrapper.otherWrappers.forEach(other => {
                    other.style.display = 'none';
                    if (other.associatedButton) {
                        other.associatedButton.classList.remove('active-button');
                        resetButtonText(other);
                    }
                });
            }

            wrapper.style.display = show ? 'block' : 'none';
            lagerButton.textContent = show ? 'Lagerräume ausblenden' : 'Lagerräume';
            lagerButton.classList.toggle('active-button', show);
        });

        wrapper.associatedButton = lagerButton;
        return wrapper;
    }
    function createLevelContentWrapper(levelButton, group, userInfo, buildSelectedButton) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('level-wrapper');
        wrapper.style.display = 'none';
        wrapper.style.marginTop = '10px';

        const levelTable = createLevelTable(group, userInfo);
        wrapper.appendChild(levelTable);

        levelButton.addEventListener('click', () => {
            const show = wrapper.style.display !== 'block';

            if (wrapper.otherWrappers) {
                wrapper.otherWrappers.forEach(other => {
                    other.style.display = 'none';
                    if (other.associatedButton) {
                        other.associatedButton.classList.remove('active-button');
                        resetButtonText(other);
                    }
                });
            }
            wrapper.style.display = show ? 'block' : 'none';
            levelButton.textContent = show ? 'Ausbaustufen ausblenden' : 'Ausbaustufen';
            levelButton.classList.toggle('active-button', show);
        });

        wrapper.associatedButton = levelButton;
        return wrapper;
    }
    function createSpecialContentWrapper(specialButton, group, userInfo, buildings) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('special-wrapper');
        Object.assign(wrapper.style, {
            display: 'none',
            marginTop: '10px'
        });

        wrapper.appendChild(
            createSpecialTable(group, userInfo, buildings)
        );

        specialButton.addEventListener('click', () => {
            if (specialButton.disabled) return;

            const show = wrapper.style.display !== 'block';

            if (wrapper.otherWrappers) {
                wrapper.otherWrappers.forEach(other => {
                    other.style.display = 'none';

                    if (other.associatedButton) {
                        other.associatedButton.classList.remove('active-button');
                        resetButtonText(other);
                    }
                });
            }

            wrapper.style.display = show ? 'block' : 'none';
            specialButton.textContent =
                show ? 'Spezialisierung ausblenden' : 'Spezialisierung';
            specialButton.classList.toggle('active-button', show);
        });

        wrapper.associatedButton = specialButton;
        return wrapper;
    }

    // Funktion für den Buttontext
    function resetButtonText(wrapper) {
        if (!wrapper.associatedButton) return;

        if (wrapper.classList.contains('spoiler-content')) {
            wrapper.associatedButton.textContent = 'Erweiterungen';

        } else if (wrapper.classList.contains('lager-wrapper')) {
            wrapper.associatedButton.textContent = 'Lagerräume';

        } else if (wrapper.classList.contains('level-wrapper')) {
            wrapper.associatedButton.textContent = 'Ausbaustufen';

        } else if (wrapper.classList.contains('special-wrapper')) {
            wrapper.associatedButton.textContent = 'Spezialisierung';
        }
    }

    // Funktion um die Tabelle für Erweiterung, Lager und Ausbaustufen zu erstellen
    function createExtensionTable(groupKey, group, userInfo, buildSelectedButton, isAlliance = false, allianceInfo = null, buildings = []) {
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.backgroundColor = 'var(--background-color)';
        table.style.color = 'var(--text-color)';

        table.innerHTML = `
        <thead>
            <tr>
                <th style="padding:10px;text-align:center;border-bottom:2px solid var(--border-color);">Alle An- / Abwählen</th>
                <th style="border-bottom:2px solid var(--border-color);">Leitstelle</th>
                <th style="border-bottom:2px solid var(--border-color);">Wache/Gebäude</th>
                <th style="border-bottom:2px solid var(--border-color);">Baubare Erweiterungen</th>
                <th style="border-bottom:2px solid var(--border-color);">Bauen mit Credits</th>
                <th style="border-bottom:2px solid var(--border-color);">Bauen mit Coins</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

        const tbody = table.querySelector('tbody');
        const thead = table.querySelector('thead');
        const filters = {};
        const filterElements = {};
        let manualSearchTerm = '';

        function applyCellStyle(cell) {
            cell.style.borderColor = 'var(--border-color)';
            cell.style.color = 'var(--text-color)';
        }

        function createDropdownFilter(options, placeholder, colIndex) {
            const th = document.createElement('th');
            th.style.padding = '4px 8px';
            applyCellStyle(th);

            const select = document.createElement('select');
            select.classList.add('btn', 'btn-sm');
            select.style.width = '100%';
            select.style.fontSize = '0.8em';
            select.style.padding = '2px 6px';
            select.style.verticalAlign = 'middle';
            select.style.cursor = 'pointer';
            select.style.backgroundColor = 'var(--background-color)';
            select.style.color = 'var(--text-color)';
            select.style.border = '1px solid var(--border-color)';
            select.innerHTML = `<option value="">🔽 ${placeholder}</option>`;

            [...new Set(options)].sort().forEach(optionText => {
                const option = document.createElement('option');
                option.value = optionText;
                option.textContent = optionText;
                select.appendChild(option);
            });

            select.addEventListener('change', () => {
                filters[colIndex] = select.value || undefined;
                applyAllFilters();
                updateSelectAllCheckboxState();
            });

            filterElements[colIndex] = select;
            th.appendChild(select);
            return th;
        }

        const currentSettings = getExtensionSettings();

        function isExtensionEnabledByConfig(building, extension) {
            const baseKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            const storageOptions = manualStorageRooms[baseKey];

            if (Array.isArray(storageOptions)) {
                const storage = storageOptions.find(opt =>
                                                    String(opt.id) === String(extension.id)
                                                   );

                if (storage) {
                    const storageKey = getStorageSettingKey(
                        baseKey,
                        storage.id,
                        isAlliance
                    );

                    return currentSettings[storageKey] !== false;
                }
            }

            const extensionKey = getExtensionSettingKey(
                groupKey,
                extension.id,
                isAlliance
            );

            return currentSettings[extensionKey] !== false;
        }

        const activeGroup = group
        .map(g => {
            const activeExtensions = Array.isArray(g.missingExtensions)
            ? g.missingExtensions.filter(extension => {
                if (!isExtensionEnabledByConfig(g.building, extension)) {
                    return false;
                }

                if (isExtensionLimitReached(g.building, extension.id)) {
                    return false;
                }

                if (isBuildingCountLimitReached(buildings, g.building, extension.id)) {
                    return false;
                }

                return true;
            })
            : [];

            return {
                ...g,
                missingExtensions: activeExtensions
            };
        })
        .filter(g => g.missingExtensions.length > 0);

        const leitstellen = activeGroup.map(g => getLeitstelleName(g.building));
        const wachen = activeGroup.map(g => g.building.caption);
        const erweiterungen = activeGroup.flatMap(g =>
                                                  g.missingExtensions.map(e => e.name)
                                                 );

        const filterRow = document.createElement('tr');
        filterRow.classList.add('lss-manager-filter-row');

        const selectAllCell = document.createElement('th');
        selectAllCell.style.padding = '4px 8px';
        applyCellStyle(selectAllCell);

        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = 'select-all-checkbox';
        selectAllCheckbox.dataset.group = groupKey;

        selectAllCell.appendChild(selectAllCheckbox);
        filterRow.appendChild(selectAllCell);
        filterRow.appendChild(createDropdownFilter(leitstellen, 'Leitstelle', 1));
        filterRow.appendChild(createDropdownFilter(wachen, 'Wache', 2));
        filterRow.appendChild(createDropdownFilter(erweiterungen, 'Erweiterung', 3));

        const resetCell = document.createElement('th');
        resetCell.style.padding = '4px 8px';
        resetCell.style.textAlign = 'center';
        applyCellStyle(resetCell);

        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Filter zurücksetzen';
        resetBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        resetBtn.style.padding = '2px 6px';
        resetBtn.style.fontSize = '0.8em';

        resetCell.appendChild(resetBtn);
        filterRow.appendChild(resetCell);

        const uncheckAllCell = document.createElement('th');
        uncheckAllCell.style.textAlign = 'center';
        uncheckAllCell.style.padding = '4px 8px';
        applyCellStyle(uncheckAllCell);

        const uncheckAllBtn = document.createElement('button');
        uncheckAllBtn.textContent = 'Alle abwählen';
        uncheckAllBtn.classList.add('btn', 'btn-sm', 'btn-warning');
        uncheckAllBtn.style.padding = '2px 6px';
        uncheckAllBtn.style.fontSize = '0.8em';

        uncheckAllCell.appendChild(uncheckAllBtn);
        filterRow.appendChild(uncheckAllCell);

        const searchRow = document.createElement('tr');
        const searchCell = document.createElement('th');
        searchCell.colSpan = 6;
        searchCell.style.padding = '6px 10px';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'form-control';
        searchInput.placeholder = 'Manuelle Suche: Leitstelle, Wache/Gebäude oder Erweiterung...';
        searchInput.autocomplete = 'off';
        searchInput.style.width = '100%';
        searchInput.style.backgroundColor = 'var(--background-color)';
        searchInput.style.color = 'var(--text-color)';
        searchInput.style.border = '1px solid var(--border-color)';

        searchInput.addEventListener('input', () => {
            manualSearchTerm = searchInput.value.toLowerCase().trim();
            applyAllFilters();
            updateSelectAllCheckboxState();
        });

        searchCell.appendChild(searchInput);
        searchRow.appendChild(searchCell);
        thead.appendChild(searchRow);
        thead.appendChild(filterRow);

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
                const canPayWithCredits = availableCredits >= totalCredits;
                const canPayWithCoins = availableCoins >= totalCoins;

                canPayAll = canPayWithCredits || canPayWithCoins;
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

                    if (missingCredits > 0) {
                        message += `Fehlende Credits: ${formatNumber(missingCredits)}\n`;
                    }

                    if (missingCoins > 0) {
                        message += `Fehlende Coins: ${formatNumber(missingCoins)}\n`;
                    }
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

        activeGroup.forEach(({ building, missingExtensions }) => {
            missingExtensions.forEach(extension => {
                if (isExtensionLimitReached(building, extension.id)) return;

                const buildingCountLimitReached =
                      isBuildingCountLimitReached(buildings, building, extension.id);

                const row = document.createElement('tr');

                row.classList.add(`row-${building.id}-${extension.id}`);
                row.style.borderBottom = '1px solid var(--border-color)';

                if (buildingCountLimitReached) {
                    row.style.opacity = '0.55';
                    row.title = 'Gebäudeanzahl-Limit für diese Erweiterung erreicht';
                }

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'extension-checkbox';
                checkbox.dataset.buildingId = building.id;
                checkbox.dataset.extensionId = extension.id;
                checkbox.dataset.creditCost = Number(extension.cost) || 0;
                checkbox.dataset.coinCost = isAlliance ? 0 : Number(extension.coins) || 0;

                if (buildingCountLimitReached) {
                    checkbox.disabled = true;
                    checkbox.title = 'Gebäudeanzahl-Limit für diese Erweiterung erreicht';
                } else if (isAlliance) {
                    checkbox.disabled =
                        Number(allianceInfo?.credits_current || 0) <
                        Number(extension.cost || 0);
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

                const leitstelleCell = document.createElement('td');
                leitstelleCell.textContent = getLeitstelleName(building);

                const buildingCell = document.createElement('td');
                buildingCell.textContent = building.caption;

                const extensionCell = document.createElement('td');
                extensionCell.textContent = extension.name;

                [checkboxCell, leitstelleCell, buildingCell, extensionCell].forEach(cell => {
                    cell.style.borderColor = 'var(--border-color)';
                    cell.style.color = 'var(--text-color)';
                });

                row.appendChild(checkboxCell);
                row.appendChild(leitstelleCell);
                row.appendChild(buildingCell);
                row.appendChild(extensionCell);

                const creditCell = document.createElement('td');
                creditCell.style.textAlign = 'center';

                const creditBtn = document.createElement('button');
                creditBtn.textContent = `${formatNumber(extension.cost)} Credits`;
                creditBtn.classList.add('btn', 'btn-xl', 'credit-button');
                creditBtn.style.backgroundColor = '#28a745';
                creditBtn.style.color = 'white';

                if (buildingCountLimitReached) {
                    creditBtn.disabled = true;
                    creditBtn.title = 'Gebäudeanzahl-Limit für diese Erweiterung erreicht';
                } else if (isAlliance) {
                    creditBtn.disabled =
                        Number(allianceInfo?.credits_current || 0) <
                        Number(extension.cost || 0);
                } else {
                    creditBtn.disabled =
                        Number(userInfo?.credits || 0) <
                        Number(extension.cost || 0);
                }

                creditBtn.onclick = async () => {
                    await buildExtension(
                        building,
                        extension.id,
                        'credits',
                        extension.cost,
                        row,
                        isAlliance
                    );

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

                const coinsCell = document.createElement('td');
                coinsCell.style.textAlign = 'center';

                if (isAlliance) {
                    coinsCell.textContent = 'Nicht verfügbar';
                    coinsCell.style.opacity = '0.6';
                } else {
                    const coinBtn = document.createElement('button');
                    coinBtn.textContent = `${formatNumber(extension.coins)} Coins`;
                    coinBtn.classList.add('btn', 'btn-xl', 'coins-button');
                    coinBtn.style.backgroundColor = '#dc3545';
                    coinBtn.style.color = 'white';

                    if (buildingCountLimitReached) {
                        coinBtn.disabled = true;
                        coinBtn.title = 'Gebäudeanzahl-Limit für diese Erweiterung erreicht';
                    } else {
                        coinBtn.disabled =
                            Number(userInfo?.coins || 0) <
                            Number(extension.coins || 0);
                    }

                    coinBtn.onclick = async () => {
                        await buildExtension(
                            building,
                            extension.id,
                            'coins',
                            extension.coins,
                            row,
                            false
                        );

                        const cb = row.querySelector('.extension-checkbox');
                        if (cb) cb.checked = false;

                        await initUserCredits();

                        updateBuildSelectedButton();
                        updateSelectedAmounts(buildingsData);
                        updateSelectAllCheckboxState();
                    };

                    coinsCell.appendChild(coinBtn);
                }

                coinsCell.style.borderColor = 'var(--border-color)';
                coinsCell.style.color = 'var(--text-color)';
                row.appendChild(coinsCell);

                tbody.appendChild(row);
            });
        });

        function applyAllFilters() {
            tbody.querySelectorAll('tr').forEach(row => {
                const filterMatch = Object.entries(filters).every(([index, value]) =>
                                                                  !value ||
                                                                  row.children[index]?.textContent.trim().toLowerCase() ===
                                                                  value.toLowerCase()
                                                                 );

                const searchMatch =
                      !manualSearchTerm ||
                      [1, 2, 3].some(index =>
                                     row.children[index]?.textContent
                                     .toLowerCase()
                                     .includes(manualSearchTerm)
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

                    if (checkbox.checked) {
                        checked++;
                    }
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
        const settings = getExtensionSettings();
        const liveBuiltStorages = {};
        const currentCredits = Number(userInfo?.credits || 0);
        const currentCoins = Number(userInfo?.coins || 0);

        group.forEach(({ building }) => {
            liveBuiltStorages[building.id] = new Set(
                (building.storage_upgrades || []).map(u => {
                    if (u.type_id !== undefined) return String(u.type_id);
                    const key = Object.keys(u)[0];
                    return key !== undefined ? String(key) : '';
                })
            );
        });

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.backgroundColor = 'var(--background-color)';
        table.style.color = 'var(--text-color)';

        table.innerHTML = `
        <thead>
            <tr>
                <th style="padding:10px;text-align:center;border-bottom:2px solid var(--border-color);">Alle An- / Abwählen</th>
                <th style="border-bottom:2px solid var(--border-color);">Leitstelle</th>
                <th style="border-bottom:2px solid var(--border-color);">Wache</th>
                <th style="border-bottom:2px solid var(--border-color);">Baubare Lager</th>
                <th style="border-bottom:2px solid var(--border-color);">Lagerkapazität</th>
                <th style="border-bottom:2px solid var(--border-color);">Credits</th>
                <th style="border-bottom:2px solid var(--border-color);">Coins</th>
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
            const th = document.createElement('th');
            th.style.padding = '4px 8px';
            th.style.borderColor = 'var(--border-color)';
            th.style.color = 'var(--text-color)';

            const select = document.createElement('select');
            select.classList.add('btn', 'btn-sm');
            select.style.width = '100%';
            select.style.fontSize = '0.8em';
            select.style.padding = '2px 6px';
            select.style.verticalAlign = 'middle';
            select.style.cursor = 'pointer';
            select.style.backgroundColor = 'var(--background-color)';
            select.style.color = 'var(--text-color)';
            select.style.border = '1px solid var(--border-color)';
            select.innerHTML = `<option value="">🔽 ${placeholder}</option>`;

            [...new Set(options)].sort().forEach(optionText => {
                const option = document.createElement('option');
                option.value = optionText;
                option.textContent = optionText;
                select.appendChild(option);
            });

            select.addEventListener('change', () => {
                filters[colIndex] = select.value || undefined;
                applyAllFilters();
                updateSelectAllCheckboxState();
            });

            filterElements[colIndex] = select;
            th.appendChild(select);
            return th;
        }

        const leitstellen = [];
        const wachen = [];
        const lagerArten = [];

        group.forEach(({ building }) => {
            const baseKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
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
                row.style.borderBottom = '1px solid var(--border-color)';

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
                row.appendChild(checkboxCell);

                const cells = [
                    getLeitstelleName(building),
                    building.caption,
                    opt.name,
                    `+${opt.additionalStorage}`
                ];

                cells.forEach(text => {
                    const td = document.createElement('td');
                    td.textContent = text;
                    td.style.borderColor = 'var(--border-color)';
                    td.style.color = 'var(--text-color)';
                    row.appendChild(td);
                });

                const creditCell = document.createElement('td');
                creditCell.style.textAlign = 'center';

                const creditBtn = document.createElement('button');
                creditBtn.textContent = `${formatNumber(opt.cost)} Credits`;
                creditBtn.classList.add('btn', 'btn-xl', 'credit-button');
                creditBtn.style.backgroundColor = '#28a745';
                creditBtn.style.color = 'white';
                creditBtn.disabled = currentCredits < Number(opt.cost || 0);

                creditBtn.onclick = async () => {
                    if (!canBuildStorageInOrder(building.id, opt.id)) {
                        alert(
                            "Bitte beachte: Die Lagerräume müssen in der vorgegebenen Reihenfolge gebaut werden.\n\n" +
                            "Reihenfolge:\n" +
                            "1. Lagerraum\n" +
                            "2. 1te zusätzlicher Lagerraum\n" +
                            "3. 2te zusätzlicher Lagerraum\n" +
                            "4. 3te zusätzlicher Lagerraum\n" +
                            "5. 4te zusätzlicher Lagerraum\n" +
                            "6. 5te zusätzlicher Lagerraum\n" +
                            "7. 6te zusätzlicher Lagerraum\n" +
                            "8. 7te zusätzlicher Lagerraum"
                        );
                        return;
                    }

                    await buildStorage(building, opt.id, 'credits', opt.cost, row);
                    liveBuiltStorages[building.id].add(String(opt.id));

                    creditBtn.disabled = true;
                    coinBtn.disabled = true;
                    checkbox.disabled = true;

                    await initUserCredits();
                    updateBuildSelectedButton();
                    updateSelectedAmounts(buildingsData);
                    updateSelectAllCheckboxState();
                };

                creditCell.appendChild(creditBtn);
                row.appendChild(creditCell);

                const coinsCell = document.createElement('td');
                coinsCell.style.textAlign = 'center';

                const coinBtn = document.createElement('button');
                coinBtn.textContent = `${formatNumber(opt.coins)} Coins`;
                coinBtn.classList.add('btn', 'btn-xl', 'coins-button');
                coinBtn.style.backgroundColor = '#dc3545';
                coinBtn.style.color = 'white';
                coinBtn.disabled = currentCoins < Number(opt.coins || 0);

                coinBtn.onclick = async () => {
                    if (!canBuildStorageInOrder(building.id, opt.id)) {
                        alert(
                            "Bitte beachte: Die Lagerräume müssen in der vorgegebenen Reihenfolge gebaut werden.\n\n" +
                            "Reihenfolge:\n" +
                            "1. Lagerraum\n" +
                            "2. 1te zusätzlicher Lagerraum\n" +
                            "3. 2te zusätzlicher Lagerraum\n" +
                            "4. 3te zusätzlicher Lagerraum\n" +
                            "5. 4te zusätzlicher Lagerraum\n" +
                            "6. 5te zusätzlicher Lagerraum\n" +
                            "7. 6te zusätzlicher Lagerraum\n" +
                            "8. 7te zusätzlicher Lagerraum"
                        );
                        return;
                    }

                    await buildStorage(building, opt.id, 'coins', opt.coins, row);
                    liveBuiltStorages[building.id].add(String(opt.id));

                    creditBtn.disabled = true;
                    coinBtn.disabled = true;
                    checkbox.disabled = true;

                    await initUserCredits();
                    updateBuildSelectedButton();
                    updateSelectedAmounts(buildingsData);
                    updateSelectAllCheckboxState();
                };

                coinsCell.appendChild(coinBtn);
                row.appendChild(coinsCell);
                tbody.appendChild(row);
            });
        });

        const filterRow = document.createElement('tr');

        const selectAllCell = document.createElement('th');
        selectAllCell.style.padding = '4px 8px';

        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = 'select-all-checkbox-lager';

        selectAllCell.appendChild(selectAllCheckbox);
        filterRow.appendChild(selectAllCell);
        filterRow.appendChild(createDropdownFilter(leitstellen, 'Leitstelle', 1));
        filterRow.appendChild(createDropdownFilter(wachen, 'Wache', 2));
        filterRow.appendChild(createDropdownFilter(lagerArten, 'Lager', 3));

        const resetCell = document.createElement('th');
        resetCell.style.textAlign = 'center';
        resetCell.style.padding = '4px 8px';

        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Filter zurücksetzen';
        resetBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        resetBtn.style.padding = '2px 6px';
        resetBtn.style.fontSize = '0.8em';

        resetCell.appendChild(resetBtn);
        filterRow.appendChild(resetCell);

        const uncheckAllCell = document.createElement('th');
        uncheckAllCell.style.textAlign = 'center';
        uncheckAllCell.style.padding = '4px 8px';

        const uncheckAllBtn = document.createElement('button');
        uncheckAllBtn.textContent = 'Alle abwählen';
        uncheckAllBtn.classList.add('btn', 'btn-sm', 'btn-warning');
        uncheckAllBtn.style.padding = '2px 6px';
        uncheckAllBtn.style.fontSize = '0.8em';

        uncheckAllCell.appendChild(uncheckAllBtn);
        filterRow.appendChild(uncheckAllCell);
        const searchRow = document.createElement('tr');
        const searchCell = document.createElement('th');
        searchCell.colSpan = 7;
        searchCell.style.padding = '6px 10px';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'form-control';
        searchInput.placeholder = 'Manuelle Suche: Leitstelle, Wache oder Lager...';
        searchInput.autocomplete = 'off';
        searchInput.style.width = '100%';
        searchInput.style.backgroundColor = 'var(--background-color)';
        searchInput.style.color = 'var(--text-color)';
        searchInput.style.border = '1px solid var(--border-color)';

        searchInput.addEventListener('input', () => {
            manualSearchTerm = searchInput.value.toLowerCase().trim();
            applyAllFilters();
            updateSelectAllCheckboxState();
        });

        searchCell.appendChild(searchInput);
        searchRow.appendChild(searchCell);
        thead.appendChild(searchRow);
        thead.appendChild(filterRow);

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

            if (isChecked) {
                const canPayAllWithCredits = currentCredits >= totalCredits;
                const canPayAllWithCoins = currentCoins >= totalCoins;

                if (!canPayAllWithCredits && !canPayAllWithCoins) {
                    const missingCredits = Math.max(0, totalCredits - currentCredits);
                    const missingCoins = Math.max(0, totalCoins - currentCoins);

                    let message = 'Deine Auswahl übersteigt dein aktuelles Guthaben.\n\n';

                    if (missingCredits > 0) {
                        message += `Fehlende Credits: ${formatNumber(missingCredits)}\n`;
                    }

                    if (missingCoins > 0) {
                        message += `Fehlende Coins: ${formatNumber(missingCoins)}\n`;
                    }

                    alert(message);
                    selectAllCheckbox.checked = false;
                    return;
                }
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
            const visibleRows = [...tbody.querySelectorAll('tr')].filter(row => row.style.display !== 'none');

            if (visibleRows.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.disabled = true;
                return;
            }

            const selectableRows = visibleRows.filter(row => {
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
            const baseKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            const options = manualStorageRooms[baseKey];
            if (!options) return;

            const current = new Set(
                (building.storage_upgrades || []).map(u => {
                    if (u.type_id !== undefined) return String(u.type_id);
                    const key = Object.keys(u)[0];
                    return key !== undefined ? String(key) : '';
                })
            );

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
            let totalCredits = 0;
            let totalCoins = 0;

            if (selectedLevelId === null) {
                creditCell.innerHTML = '';
                coinCell.innerHTML = '';

                const creditBtn = document.createElement('button');
                creditBtn.textContent = '0 Credits';
                creditBtn.classList.add('btn', 'btn-sm');
                creditBtn.style.backgroundColor = '#28a745';
                creditBtn.style.color = 'white';
                creditBtn.disabled = true;
                creditCell.appendChild(creditBtn);

                const coinBtn = document.createElement('button');
                coinBtn.textContent = '0 Coins';
                coinBtn.classList.add('btn', 'btn-sm');
                coinBtn.style.backgroundColor = '#dc3545';
                coinBtn.style.color = 'white';
                coinBtn.disabled = true;
                coinCell.appendChild(coinBtn);
                return;
            }

            if (selectedLevelId >= currentLevel) {
                for (let levelId = currentLevel + 1; levelId <= selectedLevelId; levelId++) {
                    const stufe = levelList.find(level => level.id === levelId);
                    if (!stufe) continue;

                    totalCredits += stufe.cost || 0;
                    totalCoins += stufe.coins || 0;
                }
            }

            creditCell.innerHTML = '';

            const creditBtn = document.createElement('button');
            creditBtn.textContent = `${totalCredits.toLocaleString()} Credits`;
            creditBtn.classList.add('btn', 'btn-sm');
            creditBtn.style.backgroundColor = '#28a745';
            creditBtn.style.color = 'white';
            creditBtn.disabled = userInfo.credits < totalCredits || totalCredits === 0;

            creditBtn.onclick = async () => {
                if (userInfo.credits < totalCredits) {
                    alert('Nicht genug Credits!');
                    return;
                }

                try {
                    await buildLevel(building.id, 'credits', selectedLevelId);

                    for (const b of group) {
                        const currentLevel = getBuildingLevelInfo(b.building)?.currentLevel ?? 0;
                        selectedLevels[b.building.id] = currentLevel;
                    }

                    fetchBuildingsAndRender();
                    updateSelectedAmounts(buildingsData);
                    updateBuildSelectedLevelsButtonState(group);
                } catch {
                    alert('Fehler beim Bauen mit Credits.');
                }
            };

            creditCell.appendChild(creditBtn);

            coinCell.innerHTML = '';

            const coinBtn = document.createElement('button');
            coinBtn.textContent = `${totalCoins.toLocaleString()} Coins`;
            coinBtn.classList.add('btn', 'btn-sm');
            coinBtn.style.backgroundColor = '#dc3545';
            coinBtn.style.color = 'white';
            coinBtn.disabled = userInfo.coins < totalCoins || totalCoins === 0;

            coinBtn.onclick = async () => {
                if (userInfo.coins < totalCoins) {
                    alert('Nicht genug Coins!');
                    return;
                }

                try {
                    await buildLevel(building.id, 'coins', selectedLevelId);

                    for (const b of group) {
                        const currentLevel = getBuildingLevelInfo(b.building)?.currentLevel ?? 0;
                        selectedLevels[b.building.id] = currentLevel;
                    }

                    fetchBuildingsAndRender();
                    updateSelectedAmounts(buildingsData);
                    updateBuildSelectedLevelsButtonState(group);
                } catch {
                    alert('Fehler beim Bauen mit Coins.');
                }
            };

            coinCell.appendChild(coinBtn);
        }

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.backgroundColor = 'var(--background-color)';
        table.style.color = 'var(--text-color)';

        table.innerHTML = `
        <thead>
            <tr>
                <th style="padding:10px;text-align:center;border-bottom:2px solid var(--border-color);">Leitstelle</th>
                <th style="padding:10px;text-align:center;border-bottom:2px solid var(--border-color);">Wache</th>
                <th style="padding:10px;text-align:center;border-bottom:2px solid var(--border-color);">Stufe</th>
                <th style="padding:10px;text-align:center;border-bottom:2px solid var(--border-color);">Ausbaustufe wählen</th>
                <th style="padding:10px;text-align:center;border-bottom:2px solid var(--border-color);">Bauen mit Credits</th>
                <th style="padding:10px;text-align:center;border-bottom:2px solid var(--border-color);">Bauen mit Coins</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

        const tbody = table.querySelector('tbody');
        const thead = table.querySelector('thead');

        const leitstelleOptions = [...new Set(
            group.map(({ building }) => getLeitstelleName(building))
        )].sort();

        const wacheOptions = [...new Set(
            group.map(({ building }) => building.caption || '-')
        )].sort();

        const stufeOptions = [...new Set(
            group.filter(({ building }) => {
                const info = getBuildingLevelInfo(building);
                if (!info) return false;

                const key = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
                const levelList = manualLevels[key];
                if (!levelList) return false;

                return info.currentLevel < levelList.length;
            }).map(({ building }) => {
                const info = getBuildingLevelInfo(building);
                return info ? info.currentLevel.toString() : null;
            }).filter(x => x !== null && x !== '-1')
        )].sort((a, b) => Number(a) - Number(b));

        function createFilterCell(options, placeholder) {
            const th = document.createElement('th');
            th.style.padding = '4px 8px';

            const select = document.createElement('select');
            select.classList.add('btn', 'btn-sm');
            select.style.width = '100%';
            select.style.fontSize = '0.8em';
            select.style.padding = '2px 6px';
            select.style.verticalAlign = 'middle';
            select.style.cursor = 'pointer';
            select.style.backgroundColor = 'var(--background-color)';
            select.style.color = 'var(--text-color)';
            select.style.border = '1px solid var(--border-color)';
            select.innerHTML = `<option value="">🔽 ${placeholder}</option>`;

            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                select.appendChild(option);
            });

            th.appendChild(select);
            return { th, select };
        }

        const leitstelleFilter = createFilterCell(leitstelleOptions, 'Leitstellen');
        const wacheFilter = createFilterCell(wacheOptions, 'Wachen');
        const ausbaustufeFilter = createFilterCell(stufeOptions, 'Stufe');

        const filterRow = document.createElement('tr');
        filterRow.appendChild(leitstelleFilter.th);
        filterRow.appendChild(wacheFilter.th);
        filterRow.appendChild(ausbaustufeFilter.th);

        const clearLevelsTh = document.createElement('th');
        clearLevelsTh.style.textAlign = 'center';
        clearLevelsTh.style.padding = '4px 8px';

        const clearLevelsBtn = document.createElement('button');
        clearLevelsBtn.textContent = 'Stufenauswahl löschen';
        clearLevelsBtn.classList.add('btn', 'btn-sm', 'btn-danger');
        clearLevelsBtn.style.padding = '2px 6px';
        clearLevelsBtn.style.fontSize = '0.8em';
        clearLevelsBtn.style.marginRight = '6px';

        const globalLevelSelect = document.createElement('select');
        globalLevelSelect.classList.add('btn', 'btn-sm');
        globalLevelSelect.style.fontSize = '0.8em';
        globalLevelSelect.style.padding = '2px 6px';
        globalLevelSelect.style.verticalAlign = 'middle';
        globalLevelSelect.style.cursor = 'pointer';
        globalLevelSelect.style.backgroundColor = 'var(--background-color)';
        globalLevelSelect.style.color = 'var(--text-color)';
        globalLevelSelect.style.border = '1px solid var(--border-color)';

        const allLevelIds = new Set();

        group.forEach(({ building }) => {
            const key = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            const levelList = manualLevels[key];

            if (levelList) {
                levelList.forEach(level => allLevelIds.add(level.id));
            }
        });

        const sortedLevels = [...allLevelIds].sort((a, b) => a - b);
        globalLevelSelect.innerHTML = `<option value="">🔽 Globale Stufenauswahl</option>`;

        sortedLevels.forEach(levelId => {
            const opt = document.createElement('option');
            opt.value = levelId;
            opt.textContent = `Stufe ${levelId}`;
            globalLevelSelect.appendChild(opt);
        });

        clearLevelsTh.appendChild(clearLevelsBtn);
        clearLevelsTh.appendChild(globalLevelSelect);
        filterRow.appendChild(clearLevelsTh);
        filterRow.appendChild(document.createElement('th'));

        const resetTh = document.createElement('th');
        resetTh.style.textAlign = 'center';
        resetTh.style.padding = '4px 8px';

        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Filter zurücksetzen';
        resetBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        resetBtn.style.padding = '2px 6px';
        resetBtn.style.fontSize = '0.8em';

        resetTh.appendChild(resetBtn);
        filterRow.appendChild(resetTh);

        const searchRow = document.createElement('tr');
        const searchCell = document.createElement('th');
        searchCell.colSpan = 6;
        searchCell.style.padding = '6px 10px';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'form-control';
        searchInput.placeholder = 'Manuelle Suche: Leitstelle, Wache oder Stufe...';
        searchInput.autocomplete = 'off';
        searchInput.style.width = '100%';
        searchInput.style.backgroundColor = 'var(--background-color)';
        searchInput.style.color = 'var(--text-color)';
        searchInput.style.border = '1px solid var(--border-color)';

        searchInput.addEventListener('input', () => {
            manualSearchTerm = searchInput.value.toLowerCase().trim();
            applyFilters();
        });

        searchCell.appendChild(searchInput);
        searchRow.appendChild(searchCell);
        thead.appendChild(searchRow);
        thead.appendChild(filterRow);

        function applyFilters() {
            const selectedLeitstelle = leitstelleFilter.select.value;
            const selectedWache = wacheFilter.select.value;
            const selectedStufe = ausbaustufeFilter.select.value;

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

        leitstelleFilter.select.addEventListener('change', applyFilters);
        wacheFilter.select.addEventListener('change', applyFilters);
        ausbaustufeFilter.select.addEventListener('change', applyFilters);

        resetBtn.onclick = () => {
            leitstelleFilter.select.selectedIndex = 0;
            wacheFilter.select.selectedIndex = 0;
            ausbaustufeFilter.select.selectedIndex = 0;
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

                const levelChoiceCell = row.children[3];

                if (levelChoiceCell) {
                    levelChoiceCell.querySelectorAll('button').forEach(btn => {
                        btn.dataset.active = 'false';
                    });
                }

                const buildingId = row.dataset.buildingId;
                const buildingData = group.find(g => g.building.id == buildingId);
                if (!buildingData) return;

                const levelInfo = getBuildingLevelInfo(buildingData.building);
                const key = `${buildingData.building.building_type}_${buildingData.building.small_building ? 'small' : 'normal'}`;
                const levelList = manualLevels[key];

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

                const buildingId = row.dataset.buildingId;
                const buildingData = group.find(g => g.building.id == buildingId);
                if (!buildingData) return;

                const levelInfo = getBuildingLevelInfo(buildingData.building);
                if (!levelInfo) return;

                const key = `${buildingData.building.building_type}_${buildingData.building.small_building ? 'small' : 'normal'}`;
                const levelList = manualLevels[key];
                if (!levelList) return;

                const maxLevel = Math.max(...levelList.map(level => Number(level.id)));

                if (selectedLevelId <= maxLevel && selectedLevelId > levelInfo.currentLevel) {
                    selectedLevels[buildingData.building.id] = selectedLevelId;

                    const levelChoiceCell = row.children[3];

                    levelChoiceCell.querySelectorAll('button').forEach(btn => {
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

        group.forEach(({ building }) => {
            const levelInfo = getBuildingLevelInfo(building);
            if (!levelInfo) return;

            const leitstelleName = getLeitstelleName(building);
            const wache = building.caption || '-';
            const currentLevel = levelInfo.currentLevel;
            const key = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            const levelList = manualLevels[key];

            if (!levelList) return;

            const maxLevel = Math.max(...levelList.map(level => Number(level.id)));
            if (currentLevel >= maxLevel) return;

            selectedLevels[building.id] = null;

            const row = document.createElement('tr');
            row.dataset.buildingId = building.id;
            row.style.borderBottom = '1px solid var(--border-color)';

            function createCell(text, center = true) {
                const td = document.createElement('td');
                td.style.padding = '8px';
                td.style.borderColor = 'var(--border-color)';
                td.style.color = 'var(--text-color)';
                if (center) td.style.textAlign = 'center';
                td.textContent = text;
                return td;
            }

            const leitstelleCell = createCell(leitstelleName);
            const wacheCell = createCell(wache);
            const currentLevelCell = createCell(currentLevel.toString());

            const levelChoiceCell = document.createElement('td');
            levelChoiceCell.style.padding = '8px';
            levelChoiceCell.style.textAlign = 'center';
            levelChoiceCell.style.borderColor = 'var(--border-color)';

            const creditCell = document.createElement('td');
            creditCell.style.textAlign = 'center';
            creditCell.style.borderColor = 'var(--border-color)';

            const coinCell = document.createElement('td');
            coinCell.style.textAlign = 'center';
            coinCell.style.borderColor = 'var(--border-color)';

            row.appendChild(leitstelleCell);
            row.appendChild(wacheCell);
            row.appendChild(currentLevelCell);
            row.appendChild(levelChoiceCell);
            row.appendChild(creditCell);
            row.appendChild(coinCell);

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

                    updateBuildButtons(
                        building,
                        stufe.id,
                        creditCell,
                        coinCell,
                        levelList,
                        currentLevel
                    );

                    updateSelectedAmounts(buildingsData);
                    updateBuildSelectedLevelsButtonState(group);
                };

                levelChoiceCell.appendChild(lvlBtn);
            });

            const trashBtn = document.createElement('button');
            trashBtn.innerHTML = '🗑️';
            trashBtn.title = 'Auswahl zurücksetzen';
            trashBtn.classList.add('btn', 'btn-sm', 'btn-danger');
            trashBtn.style.display = 'inline-block';
            trashBtn.style.padding = '2px 6px';
            trashBtn.style.margin = '0 2px';
            trashBtn.style.fontSize = '11px';
            trashBtn.style.borderRadius = '12px';
            trashBtn.style.border = 'none';
            trashBtn.style.cursor = 'pointer';
            trashBtn.style.fontWeight = 'bold';

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
        Object.assign(table.style, {
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'var(--background-color)',
            color: 'var(--text-color)'
        });

        table.innerHTML = `
        <thead><tr>
            <th style="padding:10px;text-align:center;border-bottom:2px solid var(--border-color);">Alle An- / Abwählen</th>
            <th style="border-bottom:2px solid var(--border-color);">Leitstelle</th>
            <th style="border-bottom:2px solid var(--border-color);">Wache</th>
            <th style="border-bottom:2px solid var(--border-color);">Spezialisierung</th>
            <th style="border-bottom:2px solid var(--border-color);">Bauen mit Credits</th>
            <th style="border-bottom:2px solid var(--border-color);">Bauen mit Coins</th>
        </tr></thead>
        <tbody></tbody>`;

        const tbody = table.querySelector('tbody');
        const thead = table.querySelector('thead');
        const filters = {}, filterElements = {};
        let manualSearchTerm = '';

        function applyCellStyle(cell) {
            cell.style.borderColor = 'var(--border-color)';
            cell.style.color = 'var(--text-color)';
        }

        function createDropdownFilter(options, placeholder, colIndex) {
            const th = document.createElement('th');
            Object.assign(th.style, { padding: '4px 8px' });
            applyCellStyle(th);

            const select = document.createElement('select');
            select.classList.add('btn', 'btn-sm');
            Object.assign(select.style, {
                width: '100%',
                fontSize: '0.8em',
                padding: '2px 6px',
                verticalAlign: 'middle',
                cursor: 'pointer',
                backgroundColor: 'var(--background-color)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)'
            });

            select.innerHTML = `<option value="">🔽 ${placeholder}</option>`;
            [...new Set(options)]
                .sort((a, b) => String(a).localeCompare(String(b)))
                .forEach(option => {
                const element = document.createElement('option');
                element.value = element.textContent = option;
                select.appendChild(element);
            });

            select.addEventListener('change', () => {
                filters[colIndex] = select.value || undefined;
                applyAllFilters();
                updateSelectAllCheckboxState();
            });

            filterElements[colIndex] = select;
            th.appendChild(select);
            return th;
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
            const cell = document.createElement('td');
            Object.assign(cell.style, {
                padding: '15px',
                textAlign: 'center',
                opacity: '0.7',
                color: 'var(--text-color)'
            });
            cell.colSpan = 6;
            cell.textContent = 'Keine baubaren Spezialisierungen vorhanden.';
            row.appendChild(cell);
            tbody.appendChild(row);
            return table;
        }

        const filterRow = document.createElement('tr');
        filterRow.classList.add('lss-manager-filter-row');

        const selectAllCell = document.createElement('th');
        selectAllCell.style.padding = '4px 8px';
        applyCellStyle(selectAllCell);

        const selectAllCheckbox = Object.assign(
            document.createElement('input'),
            {
                type: 'checkbox',
                className: 'select-all-checkbox'
            }
        );
        selectAllCheckbox.dataset.group = 'specializations';
        selectAllCell.appendChild(selectAllCheckbox);
        filterRow.appendChild(selectAllCell);

        [
            [specializationRows.map(r => r.leitstelle), 'Leitstelle', 1],
            [specializationRows.map(r => r.wache), 'Wache', 2],
            [specializationRows.map(r => r.specialization.name), 'Spezialisierung', 3]
        ].forEach(args => filterRow.appendChild(createDropdownFilter(...args)));

        const resetCell = document.createElement('th');
        Object.assign(resetCell.style, {
            padding: '4px 8px',
            textAlign: 'center'
        });
        applyCellStyle(resetCell);

        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Filter zurücksetzen';
        resetBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        Object.assign(resetBtn.style, {
            padding: '2px 6px',
            fontSize: '0.8em'
        });
        resetCell.appendChild(resetBtn);
        filterRow.appendChild(resetCell);

        const uncheckCell = document.createElement('th');
        Object.assign(uncheckCell.style, {
            padding: '4px 8px',
            textAlign: 'center'
        });
        applyCellStyle(uncheckCell);

        const uncheckBtn = document.createElement('button');
        uncheckBtn.textContent = 'Alle abwählen';
        uncheckBtn.classList.add('btn', 'btn-sm', 'btn-warning');
        Object.assign(uncheckBtn.style, {
            padding: '2px 6px',
            fontSize: '0.8em'
        });
        uncheckCell.appendChild(uncheckBtn);
        filterRow.appendChild(uncheckCell);

        const searchRow = document.createElement('tr');
        const searchCell = document.createElement('th');
        searchCell.colSpan = 6;
        searchCell.style.padding = '6px 10px';

        const searchInput = Object.assign(
            document.createElement('input'),
            {
                type: 'text',
                className: 'form-control',
                placeholder: 'Manuelle Suche: Leitstelle, Wache oder Spezialisierung...',
                autocomplete: 'off'
            }
        );

        Object.assign(searchInput.style, {
            width: '100%',
            backgroundColor: 'var(--background-color)',
            color: 'var(--text-color)',
            border: '1px solid var(--border-color)'
        });

        searchInput.addEventListener('input', () => {
            manualSearchTerm = searchInput.value.toLowerCase().trim();
            applyAllFilters();
            updateSelectAllCheckboxState();
        });

        searchCell.appendChild(searchInput);
        searchRow.appendChild(searchCell);
        thead.append(searchRow, filterRow);

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

            updateSpecializationPrices(buildings);
            updateSelectedAmounts(buildings);
            updateBuildSelectedButton();
            updateSelectedSpecializationButton();
            updateSelectAllCheckboxState();
        };

        selectAllCheckbox.addEventListener('change', () => {
            tbody.querySelectorAll('tr').forEach(row => {
                if (row.style.display === 'none') return;
                const cb = row.querySelector('.extension-checkbox');
                if (cb && !cb.disabled) cb.checked = selectAllCheckbox.checked;
            });

            updateSpecializationPrices(buildings);
            updateSelectedAmounts(buildings);
            updateBuildSelectedButton();
            updateSelectedSpecializationButton();
            updateSelectAllCheckboxState();
        });

        specializationRows.forEach(({ building, leitstelle, wache, specialization }) => {
            const creditCost = getSpecializationCreditCost(
                buildings,
                specialization.apiType,
                building
            );

            const row = document.createElement('tr');
            row.dataset.buildingId = building.id;
            row.dataset.specializationType = specialization.apiType;
            row.style.borderBottom = '1px solid var(--border-color)';

            const checkbox = Object.assign(
                document.createElement('input'),
                {
                    type: 'checkbox',
                    className: 'extension-checkbox'
                }
            );

            Object.assign(checkbox.dataset, {
                buildingId: building.id,
                specializationType: specialization.type,
                apiType: specialization.apiType,
                creditCost,
                coinCost: Number(specialization.coins) || 0
            });

            const checkboxCell = document.createElement('td');
            checkboxCell.style.textAlign = 'center';
            checkboxCell.appendChild(checkbox);

            const cells = [checkboxCell];

            [leitstelle, wache, specialization.name].forEach(text => {
                const cell = document.createElement('td');
                cell.textContent = text;
                applyCellStyle(cell);
                cells.push(cell);
            });

            const createCurrencyButton = (currency, cost, color, className) => {
                const btn = document.createElement('button');
                btn.textContent = `${formatNumber(cost)} ${currency === 'credits' ? 'Credits' : 'Coins'}`;
                btn.classList.add('btn', 'btn-xl', className);
                Object.assign(btn.style, {
                    backgroundColor: color,
                    color: 'white'
                });

                const balance = Number(userInfo?.[currency] || 0);
                btn.disabled = balance < cost;

                if (btn.disabled) {
                    btn.title = `Benötigt ${formatNumber(cost)} ${currency === 'credits' ? 'Credits' : 'Coins'}`;
                }

                btn.onclick = async () => {
                    const currentCost =
                          currency === 'credits'
                    ? Number(checkbox.dataset.creditCost) || cost
                    : cost;

                    const currentBalance = Number(userInfo?.[currency] || 0);

                    if (currentBalance < currentCost) {
                        alert(
                            `Du benötigst ${formatNumber(currentCost)} ${currency === 'credits' ? 'Credits' : 'Coins'} für diese Spezialisierung.`
                        );
                        return;
                    }

                    btn.disabled = true;

                    const success = await buildSpecialization(
                        building,
                        specialization.apiType,
                        currentCost,
                        currency
                    );

                    if (!success) {
                        btn.disabled =
                            Number(userInfo?.[currency] || 0) < currentCost;
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

            cells.forEach(applyCellStyle);

            const creditCell = document.createElement('td');
            creditCell.style.textAlign = 'center';
            applyCellStyle(creditCell);
            creditCell.appendChild(
                createCurrencyButton(
                    'credits',
                    creditCost,
                    '#28a745',
                    'credits-button'
                )
            );

            const coinCost = Number(specialization.coins) || 0;
            const coinsCell = document.createElement('td');
            coinsCell.style.textAlign = 'center';
            applyCellStyle(coinsCell);
            coinsCell.appendChild(
                createCurrencyButton(
                    'coins',
                    coinCost,
                    '#dc3545',
                    'coins-button'
                )
            );

            row.append(...cells, creditCell, coinsCell);

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    if (!checkbox.dataset.selectionOrder) {
                        checkbox.dataset.selectionOrder =
                            ++specializationSelectionCounter;
                    }
                } else {
                    delete checkbox.dataset.selectionOrder;
                }

                updateSpecializationPrices(buildings);
                updateSelectedAmounts(buildings);
                updateBuildSelectedButton();
                updateSelectedSpecializationButton();
                updateSelectAllCheckboxState();
            });

            tbody.appendChild(row);
        });

        function applyAllFilters() {
            tbody.querySelectorAll('tr').forEach(row => {
                const filterMatch = Object.entries(filters).every(
                    ([index, value]) =>
                    !value ||
                    row.children[index]?.textContent
                    .trim()
                    .toLowerCase() === value.toLowerCase()
                );

                const searchMatch =
                      !manualSearchTerm ||
                      [1, 2, 3].some(index =>
                                     row.children[index]?.textContent
                                     .toLowerCase()
                                     .includes(manualSearchTerm)
                                    );

                row.style.display =
                    filterMatch && searchMatch ? '' : 'none';
            });
        }

        function updateSelectAllCheckboxState() {
            let total = 0, checked = 0;

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

        const buildingTypeKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
        const storageList = manualStorageRooms[buildingTypeKey] || [];
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

        const buildingTypeKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
        const storageOrder = manualStorageRooms[buildingTypeKey]?.map(s => s.id) || [];
        const builtStorages = new Set(getCurrentStorageState(buildingId));

        for (let i = 0; i < selectedStorages.length; i++) {
            const storageId = selectedStorages[i];
            const requiredIndex = storageOrder.indexOf(storageId);
            if (requiredIndex === -1) continue;

            const missing = storageOrder
            .slice(0, requiredIndex)
            .some(prevId => !builtStorages.has(prevId));

            if (missing) {
                return false;
            }
            builtStorages.add(storageId);
        }
        return true;
    }

    // Filterfunktion über Dropdowns
    function filterTableByDropdown(table, columnIndex, filterValue) {
        const tbody = table.querySelector('tbody');
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const cell = row.children[columnIndex];
            const cellText = cell?.textContent.toLowerCase() || '';
            const match = !filterValue || cellText === filterValue.toLowerCase();
            row.style.display = match ? '' : 'none';
        });
    }

    // Funktion zur Filterungen der Tabelleninhalten
    function filterTable(tbody, searchTerm) {
        const rows = tbody.querySelectorAll("tr");

        rows.forEach(row => {
            const leitstelle = row.cells[1]?.textContent.toLowerCase() || "";
            const wachenName = row.cells[2]?.textContent.toLowerCase() || "";
            const erweiterung = row.cells[3]?.textContent.toLowerCase() || "";
            const isBuilt = row.classList.contains("built");

            if (isBuilt) {
                row.style.display = "none";
            } else if (leitstelle.includes(searchTerm) || wachenName.includes(searchTerm) || erweiterung.includes(searchTerm)) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    }

    // Schließen-Button-Funktionalität
    document.getElementById('close-extension-helper').addEventListener('click', () => {
        const lightbox = document.getElementById('extension-lightbox');
        lightbox.style.display = 'none';

        // Setze die globalen Variablen zurück
        buildingGroups = {};
        buildingsData = [];
    });
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Anfang des Bereichs für den Einzelbau in einem Gebäude
    // Funktion zum Bau einer Erweiterung, eines Lagerraumes
    async function buildExtension(building, extensionId, currency, amount, row, isAllianceBuild = false) {
        amount = Number(amount) || 0;

        // Guthaben prüfen
        if (isAllianceBuild) {
            if (currency !== 'credits') {
                console.error(
                    'Verbandsgebäude können ausschließlich mit Verbands-Credits gebaut werden.'
                );
                return false;
            }

            const currentAllianceCredits =
                  Number(allianceInfo?.credits_current || 0);

            if (currentAllianceCredits < amount) {
                showError(
                    `Nicht genügend Verbands-Credits vorhanden.\n\n` +
                    `Benötigt: ${formatNumber(amount)}\n` +
                    `Vorhanden: ${formatNumber(currentAllianceCredits)}`
                );
                return false;
            }
        } else {
            const userInfo = await getUserCredits();

            if (currency === 'credits' && userInfo.credits < amount) {
                showError(
                    `Nicht genügend Credits vorhanden.\n\n` +
                    `Benötigt: ${formatNumber(amount)}`
                );
                return false;
            }

            if (currency === 'coins' && userInfo.coins < amount) {
                showError(
                    `Nicht genügend Coins vorhanden.\n\n` +
                    `Benötigt: ${formatNumber(amount)}`
                );
                return false;
            }
        }

        const csrfToken = getCSRFToken();
        const buildUrl =
              `/buildings/${building.id}/extension/${currency}/${extensionId}`;

        return await new Promise((resolve, reject) => {
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
                            // Polizei-Kleinwache
                            if (
                                building.building_type === 6 &&
                                building.small_building &&
                                [10, 11, 12, 13, 16].includes(extensionId)
                            ) {
                                const allRows = document.querySelectorAll(
                                    `.row-${building.id}-10,
                                 .row-${building.id}-11,
                                 .row-${building.id}-12,
                                 .row-${building.id}-13,
                                 .row-${building.id}-16`
                                );

                                allRows.forEach(otherRow => {
                                    if (otherRow !== row) {
                                        otherRow.style.display = 'none';
                                    }
                                });
                            }

                            // Feuerwehr-Kleinwache
                            if (
                                building.building_type === 0 &&
                                building.small_building &&
                                [0, 6, 8, 13, 14, 16, 18, 19, 25].includes(extensionId)
                            ) {
                                const allRows = document.querySelectorAll(
                                    `.row-${building.id}-0,
                                 .row-${building.id}-6,
                                 .row-${building.id}-8,
                                 .row-${building.id}-13,
                                 .row-${building.id}-14,
                                 .row-${building.id}-16,
                                 .row-${building.id}-18,
                                 .row-${building.id}-19,
                                 .row-${building.id}-25`
                                );

                                allRows.forEach(otherRow => {
                                    if (otherRow !== row) {
                                        otherRow.style.display = 'none';
                                    }
                                });
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

                        showError(
                            `Die Erweiterung konnte nicht gebaut werden.\n\n` +
                            `HTTP-Fehler: ${response.status}`
                        );

                        resolve(false);
                    }
                },
                onerror: function(error) {
                    console.error(
                        `Fehler beim Bauen der Erweiterung in Gebäude ${building.id}.`,
                        error
                    );

                    showError(
                        'Beim Bauen der Erweiterung ist ein Fehler aufgetreten.'
                    );

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
                            row.classList.add("built");
                            row.style.display = "none";
                        }

                        // Lokale Queue aktualisieren, damit Reihenfolge-Prüfung sofort weiß: "im Bau"
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
        const buildLevel = Number(level) - 1;
        const url = `/buildings/${buildingId}/expand_do/${currency}?level=${buildLevel}`;
        const csrfToken = getCSRFToken();

        function doGetRequest(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url,
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

                const redirectUrl = locationHeader.trim();
                const response2 = await doGetRequest(redirectUrl);

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
                        showError(
                            `Fehler beim Bau der Spezialisierung (${response.status}).`
                        );
                        resolve(false);
                    }
                },
                onerror: error => {
                    console.error(
                        '[Erweiterungs-Manager] Netzwerkfehler:',
                        error
                    );
                    showError(
                        'Beim Bau der Spezialisierung ist ein Netzwerkfehler aufgetreten.'
                    );
                    resolve(false);
                }
            });
        });
    }
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Anfang der Funktion für * Bau von ausgewählten Erweiterungen *
    // Funktion zum Überprüfen der maximalen Erweiterungen für Kleinwachen
    function checkMaxExtensions(buildingId, selectedExtensions) {
        const building = buildingsData.find(b => String(b.id) === String(buildingId));
        if (!building) return false;

        if (building.building_type === 0 && building.small_building) {
            // Feuerwehr Kleinwache: maximal 1 Erweiterung + 2 AB-Stellplätze + 2 Anhänger-Stellplätze
            const maxExtensions = 1;
            const maxABStellplatz = 2;
            const maxAnhStellplatz = 2;

            let extensionCount = 0;
            let abStellplatzCount = 0;
            let anhStellplatzCount = 0;

            selectedExtensions.forEach(extensionId => {
                if ([0, 6, 8, 13, 14, 16, 18, 19, 25].includes(extensionId)) {
                    extensionCount++;
                } else if (extensionId === 1) {
                    abStellplatzCount++;
                } else if (extensionId === 20) {
                    anhStellplatzCount++;
                }
            });

            if (extensionCount > maxExtensions || abStellplatzCount > maxABStellplatz || anhStellplatzCount > maxAnhStellplatz) {
                return false;
            }
        }

        if (building.building_type === 6 && building.small_building) {
            // Polizei Kleinwache: maximal 1 Erweiterung + 2 Zellen
            const maxExtensions = 1;
            const maxZellen = 2;

            let extensionCount = 0;
            let zellenCount = 0;

            selectedExtensions.forEach(extensionId => {
                if ([10, 11, 12, 13, 16].includes(extensionId)) {
                    extensionCount++;
                } else if (extensionId === 0) {
                    zellenCount++;
                }
            });

            if (extensionCount > maxExtensions || zellenCount > maxZellen) {
                return false;
            }
        }

        return true;
    }

    // Hilfsfunktion: ermittelt aktuelle Lagerzustände eines Gebäudes
    function getCurrentStorageState(buildingId) {
        const building = buildingsData.find(b => String(b.id) === String(buildingId));
        if (!building) return [];

        // Bereits gebaute Erweiterungen
        const builtExtensions = building.extensions ? building.extensions.map(e => e.type_id) : [];

        // Lager: sowohl fertig als auch im Bau (API kennt beides)
        const builtStorages = new Set(
            (building.storage_upgrades || [])
            // verfügbar = fertig, !verfügbar = im Bau → beides soll gezählt werden
            .map(s => s.type_id)
        );

        // Falls du noch eine lokale Queue für Zwischenschritte hast, ebenfalls reinnehmen
        if (storageBuildQueue[buildingId]) {
            storageBuildQueue[buildingId].forEach(s => builtStorages.add(s));
        }

        return Array.from(new Set([...builtExtensions, ...builtStorages]));
    }

    // Funktion zum Bau der ausgewählten Erweiterungen
    async function buildSelectedExtensions() {
        const selectedExtensions =
              document.querySelectorAll('.extension-checkbox:checked');

        const selectedStorages =
              document.querySelectorAll('.storage-checkbox:checked');

        const selectedExtensionsByBuilding = {};
        const selectedStoragesByBuilding = {};

        // Erweiterungen erfassen
        selectedExtensions.forEach(checkbox => {
            const buildingId = checkbox.dataset.buildingId;
            const extensionId = parseInt(
                checkbox.dataset.extensionId,
                10
            );

            if (!selectedExtensionsByBuilding[buildingId]) {
                selectedExtensionsByBuilding[buildingId] = [];
            }

            selectedExtensionsByBuilding[buildingId].push(extensionId);
        });

        // Lager erfassen
        selectedStorages.forEach(checkbox => {
            const buildingId = checkbox.dataset.buildingId;
            const storageType = checkbox.dataset.storageType;

            if (!selectedStoragesByBuilding[buildingId]) {
                selectedStoragesByBuilding[buildingId] = [];
            }

            selectedStoragesByBuilding[buildingId].push(storageType);
        });

        // Prüfung auf ungültige Erweiterungen für Kleinwachen
        for (const [buildingId, extensions] of Object.entries(
            selectedExtensionsByBuilding
        )) {
            const building = buildingsData.find(
                b => String(b.id) === String(buildingId)
            );

            if (!building || !building.small_building) {
                continue;
            }

            // Feuerwehr-Kleinwache
            if (building.building_type === 0) {
                const invalidCombinationsFeuerwache = [
                    0, 6, 8, 13, 14, 16, 18, 19, 25
                ];

                const selectedInvalidExtensions =
                      extensions.filter(extId =>
                                        invalidCombinationsFeuerwache.includes(extId)
                                       );

                if (selectedInvalidExtensions.length > 1) {
                    showError(
                        'Information zu deinem Bauvorhaben:\n\n' +
                        'Diese Erweiterungen für die Feuerwache (Kleinwache) ' +
                        'können nicht zusammen gebaut werden.\n\n' +
                        'Eine Erweiterung + 2 AB-Stellplätze sowie ' +
                        '2 Anh-Stellplätze sind erlaubt.'
                    );

                    document
                        .querySelectorAll('.select-all-checkbox')
                        .forEach(cb => cb.checked = false);

                    updateBuildSelectedButton();
                    return;
                }
            }

            // Polizei-Kleinwache
            if (building.building_type === 6) {
                const invalidCombinationsPolizei = [
                    10, 11, 12, 13, 16
                ];

                const selectedInvalidExtensions =
                      extensions.filter(extId =>
                                        invalidCombinationsPolizei.includes(extId)
                                       );

                if (selectedInvalidExtensions.length > 1) {
                    showError(
                        'Information zu deinem Bauvorhaben:\n\n' +
                        'Diese Erweiterungen für die Polizeiwache (Kleinwache) ' +
                        'können nicht zusammen gebaut werden.\n\n' +
                        'Es ist maximal eine Erweiterung + 2 Zellen erlaubt.'
                    );

                    document
                        .querySelectorAll('.select-all-checkbox')
                        .forEach(cb => cb.checked = false);

                    updateBuildSelectedButton();
                    return;
                }
            }
        }

        // Prüfung der Lagerreihenfolge
        // Bei Verbandsgebäuden gibt es keine Lager und damit auch nichts zu prüfen.
        if (currentView !== 'alliance') {
            for (const [
                buildingId,
                storageTypes
            ] of Object.entries(selectedStoragesByBuilding)) {
                if (!canBuildAllSelectedInOrder(
                    buildingId,
                    storageTypes
                )) {
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
        let userInfo;

        if (currentView === 'alliance') {
            userInfo = {
                credits: Number(
                    allianceInfo?.credits_current || 0
                ),
                coins: 0,
                premium: false
            };
        } else {
            userInfo = await getUserCredits();
        }

        await showCurrencySelection(
            selectedExtensionsByBuilding,
            userInfo,
            selectedStoragesByBuilding
        );

        // Checkboxen zurücksetzen
        setTimeout(() => {
            [
                ...selectedExtensions,
                ...selectedStorages
            ].forEach(checkbox => {
                checkbox.checked = false;
            });

            document
                .querySelectorAll(
                '.select-all-checkbox, .select-all-checkbox-lager'
            )
                .forEach(cb => {
                cb.checked = false;
                cb.indeterminate = false;
                cb.dispatchEvent(
                    new Event('change')
                );
            });

            updateBuildSelectedButton();
            updateSelectedAmounts(buildingsData);
        }, 100);
    }

    // Funktion zum Aktivieren/Deaktivieren des "Ausgewählte Erweiterungen/Lagern bauen"-Buttons
    function updateBuildSelectedButton() {
        const buttonContainers = document.querySelectorAll('.button-container');

        buttonContainers.forEach(container => {
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

            const isAnySelected = selectedExtensionCheckboxes.length > 0 || selectedStorageCheckboxes.length > 0;
            buildSelectedButton.disabled = !isAnySelected;
        });
    }

    // Event Listener für alle Checkboxen, damit der Button immer aktuell ist
    document.querySelectorAll('.extension-checkbox, .storage-checkbox').forEach(cb => {
        cb.addEventListener('change', updateBuildSelectedButton);
    });

    // Funktion zur Auswahl der Zahlmöglichkeit sowie Prüfung der ausgewählten Erweiterungen
    async function showCurrencySelection(selectedExtensionsByBuilding, userInfo, selectedStoragesByBuilding) {

        const isAlliance = currentView === 'alliance';

        let totalCredits = 0;
        let totalCoins = 0;

        const extensionRows = [];
        const storageRows = [];

        // Erweiterungskosten sammeln
        for (const [buildingId, extensions] of Object.entries(selectedExtensionsByBuilding)) {
            for (const extensionId of extensions) {
                const row = document.querySelector(
                    `.row-${buildingId}-${extensionId}`
                );

                if (!row) continue;

                const checkbox = row.querySelector('.extension-checkbox');

                if (!checkbox) continue;

                const extensionCost = Number(
                    checkbox.dataset.creditCost || 0
                );

                const extensionCoins = isAlliance
                ? 0
                : Number(checkbox.dataset.coinCost || 0);

                totalCredits += extensionCost;
                totalCoins += extensionCoins;

                extensionRows.push({
                    buildingId,
                    extensionId,
                    extensionCost,
                    extensionCoins,
                    row
                });
            }
        }

        // Lager nur bei eigenen Gebäuden
        if (!isAlliance) {
            for (const [buildingId, storageTypes] of Object.entries(selectedStoragesByBuilding)) {
                for (const storageType of storageTypes) {
                    const row = document.querySelector(
                        `.storage-row-${buildingId}-${storageType}`
                    );

                    if (!row) continue;

                    const checkbox = row.querySelector('.storage-checkbox');

                    if (!checkbox) continue;

                    const storageCost = Number(
                        checkbox.dataset.creditCost || 0
                    );

                    const storageCoins = Number(
                        checkbox.dataset.coinCost || 0
                    );

                    totalCredits += storageCost;
                    totalCoins += storageCoins;

                    storageRows.push({
                        buildingId,
                        storageType,
                        storageCost,
                        storageCoins,
                        row
                    });
                }
            }
        }

        // Guthaben prüfen
        if (isAlliance) {
            const allianceCredits = Number(
                allianceInfo?.credits_current || 0
            );

            if (allianceCredits < totalCredits) {
                const missingCredits =
                      totalCredits - allianceCredits;

                showError(
                    'Die Auswahl übersteigt das verfügbare Verbandsguthaben.\n\n' +
                    `Benötigte Verbands-Credits: ${formatNumber(totalCredits)}\n` +
                    `Verfügbare Verbands-Credits: ${formatNumber(allianceCredits)}\n` +
                    `Fehlende Verbands-Credits: ${formatNumber(missingCredits)}`
                );

                return;
            }
        } else {
            const missingCredits = Math.max(
                0,
                totalCredits - userInfo.credits
            );

            const missingCoins = Math.max(
                0,
                totalCoins - userInfo.coins
            );

            if (
                userInfo.credits < totalCredits &&
                userInfo.coins < totalCoins
            ) {
                showError(
                    'Deine Auswahl übersteigt dein aktuelles Guthaben.\n\n' +
                    `Fehlende Credits: ${formatNumber(missingCredits)}\n` +
                    `Fehlende Coins: ${formatNumber(missingCoins)}`
                );

                return;
            }
        }

        // Bestätigungsfenster
        const selectionDiv = document.createElement('div');

        selectionDiv.className = 'currency-selection';

        Object.assign(selectionDiv.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: '10001',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            minWidth: '320px',
            textAlign: 'center'
        });

        const totalText = document.createElement('p');

        if (isAlliance) {
            totalText.innerHTML =
                `Möchtest du die ausgewählten Erweiterungen wirklich bauen?<br><br>`
        } else {
            totalText.innerHTML =
                `Wähle zwischen <b style="color:green">Credits (grün)</b> ` +
                `oder <b style="color:red">Coins (rot)</b><br><br>` +
                `Info:<br>` +
                `Sollte eine Währung <b>nicht</b> ausreichend vorhanden sein, ` +
                `kannst Du diese nicht auswählen.`;
        }

        selectionDiv.appendChild(totalText);

        // Credits-Button
        const creditsButton = document.createElement('button');

        creditsButton.className =
            'currency-button credits-button';

        creditsButton.textContent = isAlliance
            ? `${formatNumber(totalCredits)} Verbands-Credits`
        : `${formatNumber(totalCredits)} Credits`;

        creditsButton.disabled = isAlliance
            ? Number(allianceInfo?.credits_current || 0) < totalCredits
        : userInfo.credits < totalCredits;

        Object.assign(creditsButton.style, {
            margin: '5px',
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: creditsButton.disabled
            ? 'not-allowed'
            : 'pointer'
        });

        // Coins-Button nur für eigene Gebäude
        let coinsButton = null;

        if (!isAlliance) {
            coinsButton = document.createElement('button');

            coinsButton.className =
                'currency-button coins-button';

            coinsButton.textContent =
                `${formatNumber(totalCoins)} Coins`;

            coinsButton.disabled =
                userInfo.coins < totalCoins;

            Object.assign(coinsButton.style, {
                margin: '5px',
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: coinsButton.disabled
                ? 'not-allowed'
                : 'pointer'
            });
        }

        // Abbrechen-Button
        const cancelButton = document.createElement('button');

        cancelButton.className = 'cancel-button';
        cancelButton.textContent = 'Abbrechen';

        Object.assign(cancelButton.style, {
            margin: '5px',
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
        });

        // Credits bauen
        creditsButton.onclick = async () => {
            creditsButton.disabled = true;

            if (coinsButton) {
                coinsButton.disabled = true;
            }

            cancelButton.disabled = true;

            await buildSelectedWithCurrency(
                extensionRows,
                isAlliance ? [] : storageRows,
                'credits',
                isAlliance,
                selectionDiv
            );
        };

        // Coins bauen
        if (coinsButton) {
            coinsButton.onclick = async () => {
                creditsButton.disabled = true;
                coinsButton.disabled = true;
                cancelButton.disabled = true;

                await buildSelectedWithCurrency(
                    extensionRows,
                    storageRows,
                    'coins',
                    false,
                    selectionDiv
                );
            };
        }

        // Abbrechen
        cancelButton.onclick = () => {
            selectionDiv.remove();
        };

        selectionDiv.appendChild(creditsButton);

        if (coinsButton) {
            selectionDiv.appendChild(coinsButton);
        }

        selectionDiv.appendChild(cancelButton);

        document.body.appendChild(selectionDiv);

        // Ausgewählte Gebäude bauen
        async function buildSelectedWithCurrency(extensionRows, storageRows, currency, isAllianceBuild, modal) {
            const progress = showProgress();

            const totalTasks =
                  extensionRows.length +
                  storageRows.length;

            let done = 0;

            try {
                // Erweiterungen bauen
                for (const ext of extensionRows) {
                    const building = buildingsData.find(
                        b => String(b.id) === String(ext.buildingId)
                    );

                    if (!building) {
                        console.warn(
                            `Gebäude ${ext.buildingId} nicht gefunden.`
                        );
                        continue;
                    }

                    await buildExtension(
                        building,
                        ext.extensionId,
                        currency,
                        currency === 'credits'
                        ? ext.extensionCost
                        : ext.extensionCoins,
                        ext.row,
                        isAllianceBuild
                    );

                    done++;
                    progress.update(done, totalTasks);
                }

                // Lager nur bei eigenen Gebäuden
                if (!isAllianceBuild) {
                    for (const store of storageRows) {
                        const building = buildingsData.find(
                            b => String(b.id) === String(store.buildingId)
                        );

                        if (!building) {
                            console.warn(
                                `Gebäude ${store.buildingId} nicht gefunden.`
                            );
                            continue;
                        }

                        await buildStorage(
                            building,
                            store.storageType,
                            currency,
                            currency === 'credits'
                            ? store.storageCost
                            : store.storageCoins,
                            store.row,
                            false
                        );

                        done++;
                        progress.update(done, totalTasks);
                    }
                }

                progress.close();

                if (modal) {
                    modal.remove();
                }

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

                console.error(
                    'Fehler beim Bauen der ausgewählten Gebäude:',
                    error
                );

                showError(
                    'Beim Bauen der ausgewählten Gebäude ist ein Fehler aufgetreten.'
                );
            }
        }

        // Fortschrittsanzeige
        function showProgress() {
            const container = document.createElement('div');
            container.className = 'progress-container';
            container.innerHTML = 'Bitte warten...';

            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';

            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';

            progressBar.appendChild(progressFill);

            const progressText = document.createElement('p');
            progressText.className = 'progress-text';
            progressText.textContent = '0 von 0 Erweiterungen gebaut';

            container.appendChild(progressBar);
            container.appendChild(progressText);
            document.body.appendChild(container);

            return {
                container,
                update: (done, total) => {
                    const percentage = total > 0
                    ? (done / total) * 100
                    : 100;

                    progressFill.style.width = `${percentage}%`;
                    progressText.textContent =
                        `${done} von ${total} Erweiterungen gebaut`;
                },
                close: () => {
                    container.remove();
                }
            };
        }
    }

    // Funktiom um eine Fehlermeldung auszugeben
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

    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('extension-checkbox') ||
            event.target.classList.contains('storage-checkbox')) {

            const cb = event.target;
            const willBeChecked = !cb.checked;

            let totalCredits = 0;
            let totalCoins = 0;

            document.querySelectorAll('.extension-checkbox:checked, .storage-checkbox:checked')
                .forEach(el => {
                totalCredits += Number(el.dataset.creditCost) || 0;
                totalCoins += Number(el.dataset.coinCost) || 0;
            });

            if (willBeChecked) {
                totalCredits += Number(cb.dataset.creditCost) || 0;
                totalCoins += Number(cb.dataset.coinCost) || 0;
            }

            const canPayAllWithCredits = currentCredits >= totalCredits;
            const canPayAllWithCoins = currentCoins >= totalCoins;

            if (!canPayAllWithCredits && !canPayAllWithCoins) {

                const missingCredits = Math.max(0, totalCredits - currentCredits);
                const missingCoins = Math.max(0, totalCoins - currentCoins);

                let message = "Deine Auswahl übersteigt dein aktuelles Guthaben.\n\n";

                if (missingCredits > 0) {
                    message += `Fehlende Credits: ${formatNumber(missingCredits)}\n`;
                }

                if (missingCoins > 0) {
                    message += `Fehlende Coins: ${missingCoins}\n`;
                }

                alert(message);

                event.preventDefault();
                return;
            }

            setTimeout(() => updateSelectedAmounts(), 0);
            updateBuildSelectedButton();
        }
    });
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Anfang der Funktion für * Bau von ausgewählten Stufen *
    // Funktion zum Bau der ausgewählten Stufen
    async function buildSelectedLevelsAll(buildingsData, userInfo) {

        let totalCredits = 0;
        let totalCoins = 0;
        const levelRows = [];

        for (const building of buildingsData) {
            const level = selectedLevels[building.id];
            if (level === undefined || level === null) continue;

            const key = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            const levelList = manualLevels[key];
            if (!levelList) continue;

            const currentLevel = getBuildingLevelInfo(building)?.currentLevel ?? -1;

            // Startet bei der nächsten Stufe nach currentLevel (bei nicht vorhandenem Gebäude: Stufe 1)
            const startLevel = currentLevel >= 0 ? currentLevel + 1 : 1;
            const targetLevel = Number(level);

            // Falls nichts zu tun (z.B. ausgewählte Stufe <= aktuelles Level), überspringen
            if (targetLevel < startLevel) continue;

            let buildingCredits = 0;
            let buildingCoins = 0;

            // Summiere Levelkosten anhand der Level-IDs (nicht Array-Indizes)
            for (let levelId = startLevel; levelId <= targetLevel; levelId++) {
                const stufe = levelList.find(l => Number(l.id) === levelId);
                if (!stufe) continue;
                buildingCredits += Number(stufe.cost || 0);
                buildingCoins += Number(stufe.coins || 0);
            }

            if (buildingCredits === 0 && buildingCoins === 0) continue;

            totalCredits += buildingCredits;
            totalCoins += buildingCoins;

            levelRows.push({
                buildingId: building.id,
                targetLevel,
                buildingCredits,
                buildingCoins
            });
        }
        if (levelRows.length === 0) {
            alert("Keine Leveländerungen ausgewählt.");
            return;
        }

        // Übergabe von userInfo wie bisher
        let runtimeUserInfo;
        if (currentView === 'alliance') {
            runtimeUserInfo = { credits: allianceInfo ? Number(allianceInfo.credits_current || 0) : 0, coins: 0 };
        } else {
            runtimeUserInfo = { credits: currentCredits, coins: currentCoins };
        }
        await showCurrencySelectionForLevelsAll(levelRows, runtimeUserInfo, totalCredits, totalCoins);
    }

    // Funktion um den Ausgewählte Stufen Button zu aktivieren
    function updateBuildSelectedLevelsButtonState(group) {
        if (!group.length) {
            console.warn('⚠️ Gruppe ist leer');
            return;
        }

        const typeKey = `${group[0].building.building_type}_${group[0].building.small_building ? 'small' : 'normal'}`;

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

        let hasSelectedLevels = false;

        for (const { building } of group) {
            const currentLevel = getBuildingLevelInfo(building)?.currentLevel ?? -1;
            const selectedLevel = selectedLevels[building.id] ?? null;

            if (selectedLevel !== null && selectedLevel >= currentLevel) {
                hasSelectedLevels = true;
                break;
            }
        }

        buildSelectedLevelsButton.disabled = !hasSelectedLevels;
    }

    // Auswahlfenster für Level-Ausbau
    async function showCurrencySelectionForLevelsAll(levelRows, userInfo, totalCredits, totalCoins) {

        const fehlendeCredits = Math.max(0, totalCredits - userInfo.credits);
        const fehlendeCoins = Math.max(0, totalCoins - userInfo.coins);

        if (userInfo.credits < totalCredits && userInfo.coins < totalCoins) {
            alert(`Deine Auswahl übersteigt dein aktuelles Guthaben.\n\n - Fehlende Credits: ${formatNumber(fehlendeCredits)}\n - Fehlende Coins: ${formatNumber(fehlendeCoins)}`);
            return;
        }

        const selectionDiv = document.createElement('div');
        selectionDiv.className = 'currency-selection';
        selectionDiv.style.position = 'fixed';
        selectionDiv.style.top = '50%';
        selectionDiv.style.left = '50%';
        selectionDiv.style.transform = 'translate(-50%, -50%)';
        selectionDiv.style.zIndex = '10001';
        selectionDiv.style.padding = '20px';
        selectionDiv.style.borderRadius = '8px';
        selectionDiv.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
        selectionDiv.style.minWidth = '320px';
        selectionDiv.style.textAlign = 'center';

        const totalText = document.createElement('p');
        totalText.innerHTML = `Wähle zwischen <b style="color:green">Credits (grün)</b> oder <b style="color:red">Coins (rot)</b><br><br>
        Info:<br>Sollte eine Währung <b>nicht</b> ausreichend vorhanden sein,<br>kannst Du diese nicht auswählen`;
        selectionDiv.appendChild(totalText);

        function showProgress() {
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
            container.style.zIndex = '10002';
            container.style.padding = '20px';
            container.style.borderRadius = '8px';
            container.style.textAlign = 'center';
            container.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
            container.innerHTML = 'Bitte warten...';

            const progressBar = document.createElement('div');
            progressBar.style.height = '10px';
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#e0e0e0';
            progressBar.style.marginTop = '10px';
            progressBar.style.borderRadius = '5px';

            const progressFill = document.createElement('div');
            progressFill.style.height = '100%';
            progressFill.style.width = '0%';
            progressFill.style.backgroundColor = '#76c7c0';
            progressFill.style.borderRadius = '5px';
            progressBar.appendChild(progressFill);

            const progressText = document.createElement('p');
            progressText.style.marginTop = '8px';
            progressText.textContent = `0 von ${levelRows.length} Gebäude gebaut`;

            container.appendChild(progressBar);
            container.appendChild(progressText);

            document.body.appendChild(container);

            return {
                container,
                update: (done) => {
                    progressFill.style.width = `${(done / levelRows.length) * 100}%`;
                    progressText.textContent = `${done} von ${levelRows.length} Gebäude gebaut`;
                },
                close: () => {
                    document.body.removeChild(container);
                }
            };
        }

        const creditsButton = document.createElement('button');
        creditsButton.className = 'currency-button credits-button';
        creditsButton.textContent = `${formatNumber(totalCredits)} Credits`;
        creditsButton.disabled = userInfo.credits < totalCredits;
        creditsButton.style.margin = '5px';
        creditsButton.style.padding = '10px 20px';
        creditsButton.style.backgroundColor = '#28a745';
        creditsButton.style.color = 'white';
        creditsButton.style.border = 'none';
        creditsButton.style.borderRadius = '5px';
        creditsButton.style.cursor = creditsButton.disabled ? 'not-allowed' : 'pointer';

        creditsButton.onclick = async () => {
            const progress = showProgress();
            let done = 0;

            for (const lvl of levelRows) {
                await buildLevel(lvl.buildingId, 'credits', lvl.targetLevel);
                delete selectedLevels[lvl.buildingId];
                done++;
                progress.update(done);
            }
            progress.close();
            document.body.removeChild(selectionDiv);
            initUserCredits();       // aktualisiert globale Werte
            fetchBuildingsAndRender(); // rendert alles neu
        };

        const coinsButton = document.createElement('button');
        coinsButton.className = 'currency-button coins-button';
        coinsButton.textContent = `${formatNumber(totalCoins)} Coins`;
        coinsButton.disabled = userInfo.coins < totalCoins;
        coinsButton.style.margin = '5px';
        coinsButton.style.padding = '10px 20px';
        coinsButton.style.backgroundColor = '#dc3545';
        coinsButton.style.color = 'white';
        coinsButton.style.border = 'none';
        coinsButton.style.borderRadius = '5px';
        coinsButton.style.cursor = coinsButton.disabled ? 'not-allowed' : 'pointer';

        coinsButton.onclick = async () => {
            const progress = showProgress();
            let done = 0;

            for (const lvl of levelRows) {
                await buildLevel(lvl.buildingId, 'coins', lvl.targetLevel);
                delete selectedLevels[lvl.buildingId];
                done++;
                progress.update(done);
            }

            progress.close();
            selectionDiv.remove();
            initUserCredits();
            fetchBuildingsAndRender();
        };

        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-button';
        cancelButton.textContent = 'Abbrechen';
        cancelButton.style.margin = '5px';
        cancelButton.style.padding = '10px 20px';
        cancelButton.style.backgroundColor = '#6c757d';
        cancelButton.style.color = 'white';
        cancelButton.style.border = 'none';
        cancelButton.style.borderRadius = '5px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.onclick = () => {
            document.body.removeChild(selectionDiv);
        };

        selectionDiv.appendChild(creditsButton);
        selectionDiv.appendChild(coinsButton);
        selectionDiv.appendChild(cancelButton);

        document.body.appendChild(selectionDiv);
    }
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Funktion * Bau von ausgewählten Spezialisierungen *
    // Baut alle ausgewählten Spezialisierungen
    async function buildSelectedSpecializations(buildings) {
        const selected = [...document.querySelectorAll(
            '.extension-checkbox:checked[data-specialization-type]'
        )];

        if (!selected.length) {
            alert('Bitte wähle mindestens eine Spezialisierung aus.');
            return;
        }

        const items = selected
        .map(cb => {
            const building = buildings.find(
                b => String(b.id) === String(cb.dataset.buildingId)
            );

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

        const totalCredits = items.reduce(
            (sum, item) => sum + item.cost,
            0
        );

        if (Number(currentCredits || 0) < totalCredits) {
            alert(
                `Du benötigst ${formatNumber(totalCredits)} Credits für die ausgewählten Spezialisierungen.`
            );
            return;
        }

        if (!confirm(
            `Möchtest du ${items.length} ausgewählte Spezialisierung(en) für insgesamt ${formatNumber(totalCredits)} Credits bauen?`
        )) {
            return;
        }

        const button = document.querySelector(
            '#build-selected-specializations'
        );

        if (button) button.disabled = true;

        let successCount = 0;

        for (const item of items) {
            const success = await buildSpecialization(
                item.building,
                item.specializationType,
                item.cost,
                'credits'
            );

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

        const selectAll = document.querySelector(
            '.select-all-checkbox[data-group="specializations"]'
        );

        if (selectAll) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        }

        if (button) button.disabled = false;

        if (successCount) {
            alert(
                `${successCount} von ${items.length} Spezialisierung(en) wurden gebaut.`
            );
        }
    }

    // Gesamtkostenprüfung der Spezialisierungen
    function updateSelectedSpecializationButton() {
        const button = document.querySelector('.build-selected-special-button');
        if (!button) return;

        button.disabled = !document.querySelector(
            '.extension-checkbox:checked[data-specialization-type]'
        );
    }
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

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

        combinedGroup.forEach(({ missingExtensions }) => {
            missingExtensions.forEach(extension => {
                if (isExtensionLimitReached(
                    combinedGroup.find(g =>
                                       g.missingExtensions.includes(extension)
                                      )?.building,
                    extension.id
                )) {
                    return;
                }

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

        let userInfo;

        if (isAlliance) {
            userInfo = {
                credits: Number(allianceInfo?.credits_current || 0),
                coins: 0
            };
        } else {
            userInfo = await getUserCredits();
        }

        // Verbandsgebäude
        if (isAlliance) {
            const missingCredits = Math.max(
                0,
                totalCredits - userInfo.credits
            );

            if (userInfo.credits < totalCredits) {
                showError(
                    'Das Bauvorhaben kann nicht durchgeführt werden.\n\n' +
                    `Benötigte Verbands-Credits: ${formatNumber(totalCredits)}\n` +
                    `Verfügbare Verbands-Credits: ${formatNumber(userInfo.credits)}\n` +
                    `Fehlende Verbands-Credits: ${formatNumber(missingCredits)}`
                );
                return;
            }

            // Einheitliches Bestätigungsfenster
            const selectionDiv = document.createElement('div');
            selectionDiv.className = 'currency-selection';

            Object.assign(selectionDiv.style, {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: '10001',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                minWidth: '350px',
                maxWidth: '500px',
                textAlign: 'center'
            });

            const title = document.createElement('h4');
            title.textContent = 'Bauvorhaben bestätigen';
            title.style.marginTop = '0';

            const info = document.createElement('p');
            info.innerHTML =
                `Du möchtest <b>${totalExtensions}</b> Erweiterung(en) bauen.<br><br>` +
                `Gesamtkosten:<br>` +
                `<b style="color:#28a745;">${formatNumber(totalCredits)} Verbands-Credits</b><br><br>` +
                `Die Erweiterungen werden ausschließlich mit ` +
                `<b>Verbands-Credits</b> gebaut.`;

            selectionDiv.appendChild(title);
            selectionDiv.appendChild(info);

            const buildButton = document.createElement('button');
            buildButton.className = 'btn btn-success';
            buildButton.textContent = `Ausbau bestätigen`;

            Object.assign(buildButton.style, {
                margin: '5px',
                padding: '10px 20px'
            });

            buildButton.onclick = async () => {
                selectionDiv.remove();
                await buildAllExtensionsWithPause(
                    groupKey,
                    'credits',
                    true
                );
            };

            const cancelButton = document.createElement('button');
            cancelButton.className = 'btn btn-danger';
            cancelButton.textContent = 'Ausbau Abbrechen';

            Object.assign(cancelButton.style, {
                margin: '5px',
                padding: '10px 20px'
            });

            cancelButton.onclick = () => {
                selectionDiv.remove();
            };

            selectionDiv.appendChild(buildButton);
            selectionDiv.appendChild(cancelButton);

            document.body.appendChild(selectionDiv);
            return;
        }

        // Eigene Gebäude
        const fehlendeCredits = Math.max(
            0,
            totalCredits - userInfo.credits
        );

        const fehlendeCoins = Math.max(
            0,
            totalCoins - userInfo.coins
        );

        if (
            userInfo.credits < totalCredits &&
            userInfo.coins < totalCoins
        ) {
            showError(
                'Deine Auswahl übersteigt dein aktuelles Guthaben.\n\n' +
                `Fehlende Credits: ${formatNumber(fehlendeCredits)}\n` +
                `Fehlende Coins: ${formatNumber(fehlendeCoins)}`
            );
            return;
        }

        // Einheitliches Bestätigungsfenster
        const selectionDiv = document.createElement('div');
        selectionDiv.className = 'currency-selection';

        Object.assign(selectionDiv.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: '10001',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            minWidth: '350px',
            maxWidth: '500px',
            textAlign: 'center'
        });

        const title = document.createElement('h4');
        title.textContent = 'Bauvorhaben bestätigen';
        title.style.marginTop = '0';

        const info = document.createElement('p');
        info.innerHTML =
            `Du möchtest <b>${totalExtensions}</b> Erweiterung(en) bauen.<br><br>` +
            `Gesamtkosten:<br>` +
            `<b style="color:#28a745;">${formatNumber(totalCredits)} Credits</b><br>` +
            `<b style="color:#dc3545;">${formatNumber(totalCoins)} Coins</b><br><br>` +
            `Wähle anschließend die gewünschte Währung.`;

        selectionDiv.appendChild(title);
        selectionDiv.appendChild(info);

        const creditsButton = document.createElement('button');
        creditsButton.className = 'btn btn-success';
        creditsButton.textContent =
            `${formatNumber(totalCredits)} Credits`;

        creditsButton.disabled =
            userInfo.credits < totalCredits;

        Object.assign(creditsButton.style, {
            margin: '5px',
            padding: '10px 20px'
        });

        creditsButton.onclick = async () => {
            selectionDiv.remove();

            await buildAllExtensionsWithPause(
                groupKey,
                'credits',
                false
            );
        };

        const coinsButton = document.createElement('button');
        coinsButton.className = 'btn btn-danger';
        coinsButton.textContent =
            `${formatNumber(totalCoins)} Coins`;

        coinsButton.disabled =
            userInfo.coins < totalCoins;

        Object.assign(coinsButton.style, {
            margin: '5px',
            padding: '10px 20px'
        });

        coinsButton.onclick = async () => {
            selectionDiv.remove();

            await buildAllExtensionsWithPause(
                groupKey,
                'coins',
                false
            );
        };

        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn btn-secondary';
        cancelButton.textContent = 'Abbrechen';

        Object.assign(cancelButton.style, {
            margin: '5px',
            padding: '10px 20px'
        });

        cancelButton.onclick = () => {
            selectionDiv.remove();
        };

        selectionDiv.appendChild(creditsButton);
        selectionDiv.appendChild(coinsButton);
        selectionDiv.appendChild(cancelButton);

        document.body.appendChild(selectionDiv);
    }

    // Gesamtkosten prüfen und anschließend alle Erweiterungen bauen
    async function calculateAndBuildAllExtensions(groupKey, currency, isAllianceBuild = false) {
        const wachenGroup = buildingGroups[groupKey] || [];
        const lagerGroup = isAllianceBuild
        ? []
        : (storageGroups[groupKey] || []);

        const combinedGroup = [
            ...wachenGroup,
            ...lagerGroup
        ];

        let totalExtensions = 0;
        let totalCost = 0;

        for (const { building, missingExtensions } of combinedGroup) {
            for (const extension of missingExtensions) {
                if (isExtensionLimitReached(building, extension.id)) {
                    continue;
                }

                totalExtensions++;
                totalCost += Number(extension[currency]) || 0;
            }
        }

        if (totalExtensions === 0) {
            showError('Es sind keine baubaren Erweiterungen vorhanden.');
            return;
        }

        if (isAllianceBuild) {
            const allianceCredits = Number(
                allianceInfo?.credits_current || 0
            );

            if (currency !== 'credits') {
                showError(
                    'Verbandsgebäude können ausschließlich mit Verbands-Credits gebaut werden.'
                );
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
        } else {
            const userInfo = await getUserCredits();

            if (
                currency === 'credits' &&
                userInfo.credits < totalCost
            ) {
                showError(
                    `Nicht genügend Credits vorhanden.\n\n` +
                    `Benötigt: ${formatNumber(totalCost)}`
                );
                return;
            }

            if (
                currency === 'coins' &&
                userInfo.coins < totalCost
            ) {
                showError(
                    `Nicht genügend Coins vorhanden.\n\n` +
                    `Benötigt: ${formatNumber(totalCost)}`
                );
                return;
            }
        }

        const {
            progressContainer,
            progressText,
            progressFill
        } = await createProgressBar(totalExtensions);

        let builtCount = 0;

        try {
            for (const { building, missingExtensions } of combinedGroup) {
                for (const extension of missingExtensions) {
                    if (isExtensionLimitReached(building, extension.id)) {
                        continue;
                    }

                    const isStorage =
                          !isAllianceBuild &&
                          extension.isStorage === true;

                    const row = document.querySelector(
                        isStorage
                        ? `.storage-row-${building.id}-${extension.id}`
                        : `.row-${building.id}-${extension.id}`
                    );

                    if (isStorage) {
                        await buildStorage(
                            building,
                            extension.id,
                            currency,
                            Number(extension[currency]) || 0,
                            row,
                            false
                        );
                    } else {
                        await buildExtension(
                            building,
                            extension.id,
                            currency,
                            Number(extension[currency]) || 0,
                            row,
                            isAllianceBuild
                        );
                    }

                    builtCount++;

                    updateProgress(
                        builtCount,
                        totalExtensions,
                        progressText,
                        progressFill
                    );

                    await new Promise(resolve =>
                                      setTimeout(resolve, 500)
                                     );
                }
            }

            if (isAllianceBuild) {
                allianceInfo = await getAllianceInfo();
            } else {
                await initUserCredits(true);
            }

            await fetchBuildingsAndRender();

        } catch (error) {
            console.error(
                'Fehler beim Bauen der ausgewählten Erweiterungen:',
                error
            );
            showError(
                'Beim Bauen der Erweiterungen ist ein Fehler aufgetreten.'
            );
        } finally {
            removeProgressBar(progressContainer);
        }
    }

    // Fortschrittsanzeige erstellen
    async function createProgressBar(totalExtensions) {

        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';

        Object.assign(progressContainer.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            width: '300px',
            textAlign: 'center',
            zIndex: '10002'
        });

        const progressText = document.createElement('p');
        progressText.textContent =
            `0 / ${totalExtensions} Erweiterungen gebaut`;

        progressText.style.fontWeight = 'bold';
        progressText.style.fontSize = '16px';

        const progressBar = document.createElement('div');

        Object.assign(progressBar.style, {
            width: '100%',
            borderRadius: '5px',
            marginTop: '10px',
            overflow: 'hidden'
        });

        const progressFill = document.createElement('div');

        Object.assign(progressFill.style, {
            width: '0%',
            height: '20px',
            background: '#4caf50',
            borderRadius: '5px'
        });

        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressText);
        progressContainer.appendChild(progressBar);

        document.body.appendChild(progressContainer);

        return {
            progressContainer,
            progressText,
            progressFill
        };
    }

    // Fortschritt aktualisieren
    function updateProgress(builtCount, totalExtensions, progressText, progressFill) {
        const percentage = totalExtensions > 0
        ? Math.min(
            100,
            (builtCount / totalExtensions) * 100
        )
        : 100;

        progressText.textContent =
            `${builtCount} / ${totalExtensions} Erweiterungen gebaut`;

        progressFill.style.width = `${percentage}%`;
    }

    // Fortschrittsanzeige entfernen
    function removeProgressBar(progressContainer) {
        setTimeout(() => {
            if (progressContainer?.parentNode) {
                progressContainer.remove();
            }
        }, 500);
    }

    // Alle Erweiterungen einer Gruppe bauen
    async function buildAllExtensionsWithPause(groupKey, currency, isAllianceBuild = false) {
        const wachenGroup = buildingGroups[groupKey] || [];

        // Verbandsgebäude haben keine Lager
        const lagerGroup = isAllianceBuild
        ? []
        : (storageGroups[groupKey] || []);

        const combinedGroup = [
            ...wachenGroup,
            ...lagerGroup
        ];

        let totalExtensions = 0;

        for (const { building, missingExtensions } of combinedGroup) {
            for (const extension of missingExtensions) {
                if (!isExtensionLimitReached(building, extension.id)) {
                    totalExtensions++;
                }
            }
        }

        if (totalExtensions === 0) {
            showError('Es sind keine baubaren Erweiterungen vorhanden.');
            return;
        }

        // Letzte Guthabenprüfung unmittelbar vor dem Bau
        if (isAllianceBuild) {
            const allianceCredits = Number(
                allianceInfo?.credits_current || 0
            );

            if (currency !== 'credits') {
                showError(
                    'Verbandsgebäude können ausschließlich mit Verbands-Credits gebaut werden.'
                );
                return;
            }

            let totalCost = 0;

            for (const { building, missingExtensions } of combinedGroup) {
                for (const extension of missingExtensions) {
                    if (!isExtensionLimitReached(building, extension.id)) {
                        totalCost += Number(extension.cost) || 0;
                    }
                }
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

        const {
            progressContainer,
            progressText,
            progressFill
        } = await createProgressBar(totalExtensions);

        let builtCount = 0;

        try {
            for (const { building, missingExtensions } of combinedGroup) {
                for (const extension of missingExtensions) {
                    if (isExtensionLimitReached(building, extension.id)) {
                        continue;
                    }

                    const isStorage =
                          !isAllianceBuild &&
                          extension.isStorage === true;

                    const row = document.querySelector(
                        isStorage
                        ? `.storage-row-${building.id}-${extension.id}`
                        : `.row-${building.id}-${extension.id}`
                    );

                    if (isStorage) {
                        await buildStorage(
                            building,
                            extension.id,
                            currency,
                            Number(extension[currency]) || 0,
                            row,
                            false
                        );
                    } else {
                        await buildExtension(
                            building,
                            extension.id,
                            currency,
                            Number(extension[currency]) || 0,
                            row,
                            isAllianceBuild
                        );
                    }

                    builtCount++;

                    updateProgress(
                        builtCount,
                        totalExtensions,
                        progressText,
                        progressFill
                    );

                    await new Promise(resolve =>
                                      setTimeout(resolve, 500)
                                     );
                }
            }

            if (isAllianceBuild) {
                allianceInfo = await getAllianceInfo();
            } else {
                await initUserCredits();
            }

            await fetchBuildingsAndRender();

        } catch (error) {
            console.error(
                'Fehler beim Bauen aller Erweiterungen:',
                error
            );
            showError(
                'Beim Bauen der Erweiterungen ist ein Fehler aufgetreten.'
            );
        } finally {
            removeProgressBar(progressContainer);
        }
    }

    // Funktion zur Gesamtkostenberechnung
    function updateSelectedAmounts(buildingsData) {
        if (!Array.isArray(buildingsData)) {
            return;
        }

        let totalCredits = 0;
        let totalCoins = 0;

        // Erweiterungen und Lager
        document.querySelectorAll(
            '.extension-checkbox:checked, .storage-checkbox:checked'
        ).forEach(cb => {
            // Spezialisierungen werden separat berechnet
            if (cb.dataset.specializationType) return;

            totalCredits += Number(cb.dataset.creditCost) || 0;

            if (currentView !== 'alliance') {
                totalCoins += Number(cb.dataset.coinCost) || 0;
            }
        });

        // Spezialisierungen
        if (currentView !== 'alliance') {
            const specializationCounts = {};

            // Bereits vorhandene Spezialisierungen
            buildingsData.forEach(building => {
                const type = building.specialization?.type;

                if (building.specialization?.active && type) {
                    specializationCounts[type] =
                        (specializationCounts[type] || 0) + 1;
                }
            });

            // Ausgewählte Spezialisierungen in DOM-/Auswahlreihenfolge
            document.querySelectorAll(
                '.extension-checkbox:checked[data-specialization-type]'
            ).forEach(cb => {
                const type = cb.dataset.apiType;

                const building = buildingsData.find(
                    b => String(b.id) === String(cb.dataset.buildingId)
                );

                if (!building || !type) return;

                specializationCounts[type] =
                    (specializationCounts[type] || 0) + 1;

                const cost =
                      getSpecializationCreditCostByCount(
                          specializationCounts[type],
                          building.small_building
                      );

                cb.dataset.creditCost = cost;

                totalCredits += cost;
                totalCoins += Number(cb.dataset.coinCost) || 0;
            });
        }

        // Level-Ausbau
        if (currentView !== 'alliance') {
            buildingsData.forEach(building => {
                const key =
                      `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;

                const levelList = manualLevels[key];

                if (!levelList) {
                    return;
                }

                const currentLevel =
                      getBuildingLevelInfo(building)?.currentLevel ?? -1;

                const selectedLevel =
                      selectedLevels[building.id] ?? null;

                if (
                    selectedLevel === null ||
                    selectedLevel <= currentLevel
                ) {
                    return;
                }

                for (
                    let levelId = currentLevel + 1;
                    levelId <= selectedLevel;
                    levelId++
                ) {
                    const stufe = levelList.find(
                        level => level.id === levelId
                    );

                    if (!stufe) {
                        continue;
                    }

                    totalCredits +=
                        Number(stufe.cost) || 0;

                    totalCoins +=
                        Number(stufe.coins) || 0;
                }
            });
        }

        const selectedCreditsSpan =
              document.getElementById('selected-credits');

        const selectedCoinsSpan =
              document.getElementById('selected-coins');

        const selectedAllianceCreditsSpan =
              document.getElementById('selected-alliance-credits');

        if (currentView === 'alliance') {
            if (selectedAllianceCreditsSpan) {
                selectedAllianceCreditsSpan.textContent =
                    totalCredits.toLocaleString();
            }

            if (selectedCreditsSpan) {
                selectedCreditsSpan.textContent = '0';
            }

            if (selectedCoinsSpan) {
                selectedCoinsSpan.textContent = '0';
            }

            return;
        }

        if (selectedCreditsSpan) {
            selectedCreditsSpan.textContent =
                totalCredits.toLocaleString();
        }

        if (selectedAllianceCreditsSpan) {
            selectedAllianceCreditsSpan.textContent = '0';
        }

        if (selectedCoinsSpan) {
            selectedCoinsSpan.textContent =
                totalCoins.toLocaleString();
        }
    }
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Anfang des Bereiches * Im Bau *
    // Funktion um im Bau befindliche Erweiterungen zu laden
    async function fetchConstructionProjects() {
        try {
            const constructionList = document.getElementById("construction-list");
            constructionList.innerHTML = "";
            if (!Array.isArray(buildingsData) || buildingsData.length === 0) {
                throw new Error("Keine Gebäudedaten verfügbar");
            }

            buildingsData.forEach(building => {
                building.extensions?.forEach(ext => {

                    if (!ext.available && ext.available_at) {
                        addConstructionRow(
                            building,
                            ext.caption,
                            new Date(ext.available_at),
                            "extension",
                            ext.type_id
                        );
                    }
                    if (ext.available && !ext.enabled) {
                        addConstructionRow(
                            building,
                            ext.caption,
                            null,
                            "extension-ready",
                            ext.type_id
                        );
                    }
                });
                building.storage_upgrades?.forEach(stor => {

                    if (!stor.available && stor.available_at) {
                        addConstructionRow(
                            building,
                            stor.upgrade_type,
                            new Date(stor.available_at),
                            "storage",
                            stor.type_id
                        );
                    }
                });
            });

        } catch (err) {
            console.error("fetchConstructionProjects:", err);

            document.getElementById("construction-list").innerHTML =
                `<tr>
                <td colspan="5">Fehler beim Laden der Bauprojekte.</td>
            </tr>`;
        }
    }

    // Funktion für das Modal mit Tabelle & Filter
    function openConstructionModal() {
        const modal = document.createElement("div");
        modal.id = "construction-lightbox";
        Object.assign(modal.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            paddingTop: "20px",
            zIndex: "10001"
        });

        const container = document.createElement("div");
        Object.assign(container.style, {
            background: "var(--background-color)",
            color: "var(--text-color)",
            border: "1px solid var(--border-color)",
            padding: "15px",
            width: "100%",
            maxWidth: "2000px",
            maxHeight: "85vh",
            overflowY: "auto",
            overflowX: "hidden",
            borderRadius: "6px"
        });

        // HEADER
        const header = document.createElement("div");
        Object.assign(header.style, {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px"
        });

        const title = document.createElement("h3");
        title.textContent = "Laufende Bauprojekte";
        title.style.margin = "0";

        header.appendChild(title);

        // BUTTONS
        const btnContainer = document.createElement("div");
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "10px";

        // Alle aktivieren
        const activateAllBtn = createButton("Alle aktivieren (0)", ["bau-btn", "bau-btn-success"]);
        activateAllBtn.addEventListener("click", async () => {
            const rows = Array.from(document.querySelectorAll("#construction-list tr"))
            .filter(row => row.style.display !== "none" && row.dataset.actionType === "activate");

            const { wrapper, bar } = getOrCreateProgressBar("activate", container, "#4caf50");
            const total = rows.length;

            if (total === 0) {
                bar.style.width = "100%";
                bar.textContent = "0 von 0 aktiviert";
                setTimeout(() => wrapper.style.display = "none", 1500);
                return;
            }

            for (let i = 0; i < total; i++) {
                const row = rows[i];
                const buildingId = row.dataset.buildingId;
                const typeId = row.dataset.typeId;
                const csrfToken = getCSRFToken();

                try {
                    await fetch(`/buildings/${buildingId}/extension_ready/${typeId}/${buildingId}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded", "X-CSRF-Token": csrfToken },
                        credentials: "same-origin"
                    });
                    row.remove();
                } catch (err) {
                    console.warn("Fehler beim Aktivieren:", err);
                }

                const done = i + 1;
                const percent = Math.round((done / total) * 100);
                bar.style.width = `${percent}%`;
                bar.textContent = `${done} von ${total} aktiviert`;

                await new Promise(resolve => setTimeout(resolve, 300));
            }

            fetchBuildingsAndRender();
            updateConstructionButtonCounts();

            setTimeout(() => wrapper.style.display = "none", 1000);
        });
        btnContainer.appendChild(activateAllBtn);

        // Alle abbrechen
        const cancelAllBtn = createButton("Alle abbrechen (0)", ["bau-btn", "bau-btn-danger"]);
        cancelAllBtn.addEventListener("click", async () => {
            const tbody = document.getElementById("construction-list");

            // Vor dem Abbruch sortieren (von lang -> kurz)
            sortConstructionByTime(false);

            let rows = Array.from(tbody.querySelectorAll("tr"))
            .filter(row => row.style.display !== "none" && row.dataset.actionType === "cancel");

            if (!rows.length) return;

            const { wrapper, bar } = getOrCreateProgressBar("cancel", container, "#f44336");
            const total = rows.length;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const typeId = row.dataset.typeId;
                const type = row.dataset.actionTypeDetail;
                const buildingId = row.dataset.buildingId;
                const csrfToken = getCSRFToken();

                const url = type === "extension"
                ? `/buildings/${buildingId}/extension_cancel/${typeId}?redirect_building_id=${buildingId}`
                : `/buildings/${buildingId}/storage_cancel/${typeId}?redirect_building_id=${buildingId}`;

                try {
                    await fetch(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            "X-CSRF-Token": csrfToken
                        },
                        credentials: "same-origin"
                    });
                    row.remove();
                } catch (err) {
                    console.warn("Fehler beim Abbrechen:", err);
                }

                const done = i + 1;
                const percent = Math.round((done / total) * 100);
                bar.style.width = `${percent}%`;
                bar.textContent = `${done} von ${total} abgebrochen`;

                await new Promise(resolve => setTimeout(resolve, 300));
            }

            fetchBuildingsAndRender();
            updateConstructionButtonCounts();

            setTimeout(() => wrapper.style.display = "none", 1000);
        });
        btnContainer.appendChild(cancelAllBtn);

        // Reset-Button
        const resetBtn = createButton("Filter zurücksetzen", ["bau-btn", "bau-btn-warning"]);
        resetBtn.addEventListener("click", () => {
            document.querySelectorAll("#construction-lightbox select").forEach(select => select.value = "");
            filterConstructionTable();
            updateConstructionButtonCounts();
        });
        btnContainer.appendChild(resetBtn);

        // Schließen-Button
        const closeBtn = createButton("Schließen", ["bau-btn", "bau-btn-danger"]);
        closeBtn.addEventListener("click", () => modal.remove());
        btnContainer.appendChild(closeBtn);

        header.appendChild(btnContainer);

        // TABELLE
        const table = document.createElement("table");
        Object.assign(table.style, {
            width: "100%",
            minWidth: "900px",
            borderCollapse: "collapse",
            fontSize: "14px",
            textAlign: "center",
            tableLayout: "auto"
        });

        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        const createFilterHeader = (label, id) => {
            const th = document.createElement("th");
            Object.assign(th.style, {
                border: "1px solid var(--border-color)",
                padding: "6px",
                background: "var(--background-color)",
                textAlign: "center",
                verticalAlign: "middle",
                whiteSpace: "nowrap"
            });

            const span = document.createElement("div");
            span.textContent = label;
            span.style.marginBottom = "4px";

            const select = document.createElement("select");
            select.id = id;
            select.innerHTML = `<option value="">${label}</option>`;
            select.style.width = "80%";
            select.addEventListener("change", () => {
                filterConstructionTable();
                updateConstructionButtonCounts();
            });

            th.appendChild(span);
            th.appendChild(select);
            return th;
        };

        headRow.appendChild(createFilterHeader("Alle Leitstellen", "filter-leitstelle"));
        headRow.appendChild(createFilterHeader("Alle Wachentypen", "filter-wachentyp"));
        headRow.appendChild(createFilterHeader("Alle Wachen", "filter-wache"));
        headRow.appendChild(createFilterHeader("Alle Erweiterungen", "filter-erweiterung"));

        const thRestzeit = document.createElement("th");
        thRestzeit.textContent = "Restzeit ▼";
        Object.assign(thRestzeit.style, {
            border: "1px solid var(--border-color)",
            padding: "6px",
            background: "var(--background-color)",
            textAlign: "center",
            cursor: "pointer",
            userSelect: "none"
        });
        let sortAsc = true;
        thRestzeit.addEventListener("click", () => {
            sortConstructionByTime(sortAsc);
            thRestzeit.textContent = `Restzeit ${sortAsc ? "▲" : "▼"}`;
            sortAsc = !sortAsc;
        });

        const thAktion = document.createElement("th");
        Object.assign(thAktion.style, {
            border: "1px solid var(--border-color)",
            padding: "6px",
            background: "var(--background-color)",
            textAlign: "center",
            verticalAlign: "middle"
        });

        const actionLabel = document.createElement("div");
        actionLabel.textContent = "Aktion";
        actionLabel.style.marginBottom = "4px";

        const actionFilter = document.createElement("select");
        actionFilter.id = "filter-aktion";
        actionFilter.innerHTML = `
        <option value="">Auswahl</option>
        <option value="cancel">Im Bau</option>
        <option value="activate">Einsatzbereit schalten</option>
    `;
        actionFilter.style.width = "50%";
        actionFilter.addEventListener("change", () => {
            filterConstructionTable();
            updateConstructionButtonCounts();
        });

        thAktion.appendChild(actionLabel);
        thAktion.appendChild(actionFilter);

        headRow.appendChild(thRestzeit);
        headRow.appendChild(thAktion);
        thead.appendChild(headRow);

        const tbody = document.createElement("tbody");
        tbody.id = "construction-list";

        table.appendChild(thead);
        table.appendChild(tbody);

        container.appendChild(header);
        container.appendChild(table);
        modal.appendChild(container);
        document.body.appendChild(modal);

        // --- Funktion zum Update der Button-Zahlen ---
        function updateConstructionButtonCounts() {
            const rows = Array.from(document.querySelectorAll("#construction-list tr"))
            .filter(row => row.style.display !== "none");
            const activateCount = rows.filter(row => row.dataset.actionType === "activate").length;
            const cancelCount = rows.filter(row => row.dataset.actionType === "cancel").length;

            activateAllBtn.textContent = `Alle aktivieren (${activateCount})`;
            cancelAllBtn.textContent = `Alle abbrechen (${cancelCount})`;
        }

        // Bauprojekte laden
        fetchConstructionProjects().then(() => {
            updateConstructionButtonCounts();
        });
    }

    // Funktion um die Ausbauten hinzufügen
    function addConstructionRow(building, caption, endTime, type, type_id) {
        const tbody = document.getElementById("construction-list");
        const row = document.createElement("tr");

        // Wachentyp ermitteln (Mapping-Key bilden)
        const typeKey = building.building_type + (building.small_building ? '_small' : '_normal');
        const wachentypName = buildingTypeNames[typeKey] || `Typ ${building.building_type}`;

        // Daten für Filter speichern
        row.dataset.leitstelle = getLeitstelleName(building);
        row.dataset.wachentyp = wachentypName;
        row.dataset.wache = building.caption;
        row.dataset.erweiterung = caption;

        if (type === "extension" || type === "storage") row.dataset.actionType = "cancel";
        else if (type === "extension-ready") row.dataset.actionType = "activate";

        row.dataset.buildingId = building.id;
        row.dataset.typeId = type_id;
        row.dataset.actionTypeDetail = type;

        // Reihenfolge der sichtbaren Spalten: Leitstelle → Wachentyp → Wache → Erweiterung
        const values = [
            row.dataset.leitstelle,
            row.dataset.wachentyp,
            row.dataset.wache,
            row.dataset.erweiterung
        ];

        values.forEach(txt => {
            const td = document.createElement("td");
            td.textContent = txt;
            Object.assign(td.style, {
                border: "1px solid var(--border-color)",
                padding: "6px",
                textAlign: "center",
                verticalAlign: "middle",
                whiteSpace: "nowrap"
            });
            row.appendChild(td);
        });

        // Countdown-Zelle
        const countdownTd = document.createElement("td");
        countdownTd.classList.add("countdown"); // <-- neu
        Object.assign(countdownTd.style, {
            border: "1px solid var(--border-color)",
            padding: "6px",
            textAlign: "center",
            verticalAlign: "middle",
            whiteSpace: "nowrap"
        });

        countdownTd.textContent = endTime ? "" : "Ausbau fertiggestellt";
        row.appendChild(countdownTd);

        // Action-Zelle
        const actionTd = document.createElement("td");
        Object.assign(actionTd.style, {
            border: "1px solid var(--border-color)",
            padding: "6px",
            textAlign: "center",
            verticalAlign: "middle",
            whiteSpace: "nowrap"
        });

        if (type === "extension" || type === "storage") {
            const cancelButton = createButton("Bau abbrechen", ["bau-btn", "bau-btn-danger"]);
            cancelButton.onclick = async () => {
                cancelButton.disabled = true;
                const csrfToken = getCSRFToken();
                try {
                    const url = type === "extension"
                    ? `/buildings/${building.id}/extension_cancel/${type_id}?redirect_building_id=${building.id}`
                    : `/buildings/${building.id}/storage_cancel/${type_id}?redirect_building_id=${building.id}`;
                    await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-CSRF-Token": csrfToken }, credentials: "same-origin" });
                    row.remove();
                    fetchBuildingsAndRender();
                } catch (err) {
                    console.warn("Fehler beim Abbrechen:", err);
                    cancelButton.disabled = false;
                }
            };
            actionTd.appendChild(cancelButton);
        } else if (type === "extension-ready") {
            const activateButton = createButton("Einsatzbereit schalten", ["bau-btn", "bau-btn-success"]);
            activateButton.onclick = async () => {
                activateButton.disabled = true;
                const csrfToken = getCSRFToken();
                try {
                    const url = `/buildings/${building.id}/extension_ready/${type_id}/${building.id}`;
                    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-CSRF-Token": csrfToken }, credentials: "same-origin" });
                    if (!res.ok) throw new Error("Fehler beim Aktivieren der Erweiterung");
                    row.remove();
                    fetchConstructionProjects();
                } catch (err) {
                    console.warn("Fehler beim Aktivieren der Erweiterung:", err);
                    activateButton.disabled = false;
                }
            };
            actionTd.appendChild(activateButton);
        }

        row.appendChild(actionTd);
        tbody.appendChild(row);

        // Countdown nur für Bauprojekte
        if (endTime) {
            function updateCountdown() {
                const now = new Date();
                const remaining = endTime - now;
                if (remaining <= 0) {
                    countdownTd.textContent = "Fertig!";
                    clearInterval(interval);
                    return;
                }
                const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
                const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                countdownTd.textContent = `${days} Tag(e), ${hours} Stunde(n), ${minutes} Minute(n), ${seconds} Sekunde(n)`;
            }
            updateCountdown();
            const interval = setInterval(updateCountdown, 1000);
        }

        // Dropdowns automatisch füllen
        const addOptionIfMissing = (selectId, value) => {
            const select = document.getElementById(selectId);
            if (!select) return;
            if (!Array.from(select.options).some(opt => opt.value === value)) {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
            }
        };
        addOptionIfMissing("filter-leitstelle", row.dataset.leitstelle);
        addOptionIfMissing("filter-wachentyp", row.dataset.wachentyp);
        addOptionIfMissing("filter-wache", row.dataset.wache);
        addOptionIfMissing("filter-erweiterung", row.dataset.erweiterung);
    }

    // Filterfunktion
    function filterConstructionTable() {
        const leitstelle = document.getElementById("filter-leitstelle").value;
        const wachentyp = document.getElementById("filter-wachentyp").value;
        const wache = document.getElementById("filter-wache").value;
        const erweiterung = document.getElementById("filter-erweiterung").value;
        const aktion = document.getElementById("filter-aktion").value;

        const rows = Array.from(document.querySelectorAll("#construction-list tr"));

        // Sets zum Sammeln gültiger Optionen
        const validLeitstellen = new Set();
        const validWachentypen = new Set();
        const validWachen = new Set();
        const validErweiterungen = new Set();
        const validAktionen = new Set();

        rows.forEach(row => {
            const matchLeitstelle = !leitstelle || row.dataset.leitstelle === leitstelle;
            const matchWachentyp = !wachentyp || row.dataset.wachentyp === wachentyp;
            const matchWache = !wache || row.dataset.wache === wache;
            const matchErweiterung = !erweiterung || row.dataset.erweiterung === erweiterung;
            const matchAktion = !aktion || row.dataset.actionType === aktion;

            const isVisible = matchLeitstelle && matchWachentyp && matchWache && matchErweiterung && matchAktion;
            row.style.display = isVisible ? "" : "none";

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
        updateDropdownOptions("filter-leitstelle", validLeitstellen, leitstelle);
        updateDropdownOptions("filter-wachentyp", validWachentypen, wachentyp);
        updateDropdownOptions("filter-wache", validWachen, wache);
        updateDropdownOptions("filter-erweiterung", validErweiterungen, erweiterung);
        updateDropdownOptions("filter-aktion", validAktionen, aktion);
    }

    // Funktion um die Pulldowns der Filterungen anzupassen
    function updateDropdownOptions(selectId, validSet, currentValue) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const preservedValue = validSet.has(currentValue) ? currentValue : "";
        select.innerHTML = "";

        // Default-Optionen Mapping
        const defaultLabels = {
            "filter-leitstelle": "Alle Leitstellen",
            "filter-wachentyp": "Alle Wachentypen",
            "filter-wache": "Alle Wachen",
            "filter-erweiterung": "Alle Erweiterungen",
            "filter-aktion": "Auswahl"
        };

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = defaultLabels[selectId] || "";
        select.appendChild(defaultOption);

        // Mapping für Aktions-Pulldown
        const actionLabels = {
            cancel: "Im Bau",
            activate: "Einsatzbereit schalten"
        };

        Array.from(validSet).sort().forEach(val => {
            const option = document.createElement("option");
            option.value = val;

            if (selectId === "filter-aktion") {
                option.textContent = actionLabels[val] || val;
            } else {
                option.textContent = val;
            }

            select.appendChild(option);
        });
        select.value = preservedValue;
    }

    // Sortierfunktion Restzeit
    function sortConstructionByTime(asc = true) {
        const tbody = document.getElementById("construction-list");
        const rows = Array.from(tbody.querySelectorAll("tr"));

        rows.sort((a, b) => {
            const aTime = getRemainingTime(a);
            const bTime = getRemainingTime(b);
            return asc ? aTime - bTime : bTime - aTime;
        });

        rows.forEach(row => tbody.appendChild(row));
    }

    // Funktion um die restliche Zeit zu holen
    function getRemainingTime(row) {
        const countdownCell = row.querySelector(".countdown");
        if (!countdownCell) return Number.MAX_SAFE_INTEGER;

        if (countdownCell.dataset.endTime) {
            return new Date(countdownCell.dataset.endTime).getTime() - Date.now();
        }

        // Fallback: Text parsen
        return parseTimeToSeconds(countdownCell.textContent) * 1000;
    }

    // Funktion um die Zeiten zu parsen
    function parseTimeToSeconds(text) {
        if (!text || text.includes("Fertig")) return 0;
        const days = (text.match(/(\d+) Tag/) || [0,0])[1];
        const hours = (text.match(/(\d+) Stunde/) || [0,0])[1];
        const minutes = (text.match(/(\d+) Minute/) || [0,0])[1];
        const seconds = (text.match(/(\d+) Sekunde/) || [0,0])[1];
        return days*86400 + hours*3600 + minutes*60 + +seconds;
    }

    // Countdown-Funktion
    function startConstructionCountdowns() {
        const countdownCells = document.querySelectorAll("#construction-list .countdown");

        function updateCountdown() {
            const now = new Date();

            countdownCells.forEach(cell => {
                const endTime = new Date(cell.dataset.endTime);
                let diff = Math.floor((endTime - now) / 1000); // Sekunden

                if (diff <= 0) {
                    cell.textContent = "Fertig";
                    return;
                }

                const days = Math.floor(diff / 86400);
                diff %= 86400;
                const hours = Math.floor(diff / 3600);
                diff %= 3600;
                const minutes = Math.floor(diff / 60);
                const seconds = diff % 60;

                cell.textContent = `${days} Tag(e), ${hours} Stunde(n), ${minutes} Minute(n), ${seconds} Sekunde(n)`;
            });
        }
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // Mittig platzierte Fortschrittsbalken
    function getOrCreateProgressBar(type, container, color) {
        if (progressBars[type]) {
            // existierender Balken wieder sichtbar machen & zurücksetzen
            progressBars[type].wrapper.style.display = "flex";
            progressBars[type].bar.style.width = "0%";
            progressBars[type].bar.textContent = "";
            return progressBars[type];
        }

        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, {
            width: "80%",
            maxWidth: "400px",
            height: "25px",
            background: "#f0f0f0",
            border: "1px solid #aaa",
            borderRadius: "6px",
            overflow: "hidden",
            margin: "15px auto",
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            fontSize: "14px",
            color: "#fff",
            fontWeight: "bold",
            textAlign: "center",
            transition: "all 0.3s"
        });

        const bar = document.createElement("div");
        Object.assign(bar.style, {
            height: "100%",
            width: "0%",
            background: color,
            lineHeight: "25px",
            textAlign: "center",
            transition: "width 0.3s"
        });
        wrapper.appendChild(bar);

        container.insertBefore(wrapper, container.firstChild);
        progressBars[type] = { wrapper, bar };
        return progressBars[type];
    }

    // Event
    document.getElementById("under-construction").addEventListener("click", () => {
        openConstructionModal();
    });

    // Initiale Aufrufe
    addMenuButton();
})();
