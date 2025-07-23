// ==UserScript==
// @name         [LSS] 02 - Erweiterungs-Manager
// @namespace    http://tampermonkey.net/
// @version      1.3.1
// @description  Ermöglicht das einfache Verwalten und Hinzufügen von fehlenden Erweiterungen und Lagerräumen für deine Wachen und Gebäude.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        GM_xmlhttpRequest
// @connect      api.lss-manager.de
// @connect      leitstellenspiel.de
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
        --text-color: #000;
        --border-color: #ccc;
        --button-background-color: #007bff;
        --button-hover-background-color: #0056b3;
        --button-text-color: #ffffff;
        --warning-color: #fd7e14;
        --warning-hover: #e96b00;
        --credits-color: #28a745;
        --coins-color: #dc3545;
        --cancel-color: #6c757d;
        }

        #extension-lightbox {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        }

        #extension-lightbox-content {
        background: var(--background-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        padding: 20px;
        width: 80%;
        max-width: 1500px;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        text-align: center;
        border-radius: 10px;
        }

        #close-extension-helper {
        position: absolute;
        top: 10px; right: 10px;
        background: red;
        color: white;
        border: none;
        padding: 5px 10px;
        cursor: pointer;
        border-radius: 4px;
        }

        #extension-lightbox table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        font-size: 16px;
        }

        #extension-lightbox th,
        #extension-lightbox td {
        text-align: center;
        vertical-align: middle;
        }

        #extension-lightbox td {
        background-color: var(--background-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        padding: 10px;
        }

        #extension-lightbox thead {
        background-color: var(--background-color);
        font-weight: bold;
        border-bottom: 2px solid var(--border-color);
        }

        /* === Buttons === */
        #extension-lightbox button,
        .currency-button,
        .cancel-button {
        border: none;
        padding: 5px 10px;
        cursor: pointer;
        border-radius: 4px;
        font-size: 14px;
        color: var(--button-text-color);
        transition: background-color 0.2s ease-in-out;
        }

        #extension-lightbox .extension-button        { background-color: var(--button-background-color); }
        #extension-lightbox .extension-button:hover:enabled { background-color: var(--button-hover-background-color); }

        #extension-lightbox .build-selected-button   { background-color: blue; }
        #extension-lightbox .build-all-button        { background-color: red; }
        #extension-lightbox .spoiler-button          { background-color: green; }
        #extension-lightbox .lager-button            { background-color: var(--warning-color); }
        #extension-lightbox .lager-button:hover:enabled { background-color: var(--warning-hover); }

        #extension-lightbox .build-selected-button:hover:enabled,
        #extension-lightbox .build-all-button:hover:enabled {
        filter: brightness(90%);
        }

        #extension-lightbox .extension-button:disabled,
        #extension-lightbox .build-selected-button:disabled,
        #extension-lightbox .build-all-button:disabled {
        background-color: gray !important;
        cursor: not-allowed;
        }

        /* Neue Flexbox-Regel für Button-Container mit Abständen */
        #extension-lightbox .button-container {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 8px 5px;
        }

        /* Alte margin bei Buttons entfernen */
        #extension-lightbox .button-container > button {
        margin: 0;
        }

        #extension-lightbox .spoiler-content {
        display: none;
        }

        #extension-lightbox .extension-search {
        width: 100%;
        padding: 8px;
        margin: 10px 0;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        font-size: 14px;
        }

        /* === Currency Modal === */
        .currency-selection {
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid black;
        padding: 20px;
        z-index: 10001;
        display: flex;
        flex-direction: column;
        gap: 10px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .currency-button.credits-button { background-color: var(--credits-color); }
        .currency-button.coins-button   { background-color: var(--coins-color); }
        .cancel-button                  { background-color: var(--cancel-color); }

        #open-extension-helper {
        cursor: pointer;
        }

        .active-button {
        background-color: #007bff;
        color: white;
        font-weight: bold;
        }

        `;

    // Globale Variablen von Erweiterungen / Lager / Gebäudenamen
    const manualExtensions = {
        '0_normal': [ // Feuerwache (normal)
            { id: 0, name: 'Rettungsdienst', cost: 100000, coins: 20 },
            { id: 1, name: '1te AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 2, name: '2te AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 3, name: '3te AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 4, name: '4te AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 5, name: '5te AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 6, name: 'Wasserrettung', cost: 400000, coins: 25 },
            { id: 7, name: '6te AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 8, name: 'Flughafenfeuerwehr', cost: 300000, coins: 25 },
            { id: 9, name: 'Großwache', cost: 1000000, coins: 50 },
            { id: 10, name: '7te AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 11, name: '8te AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 12, name: '9te AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 13, name: 'Werkfeuerwehr', cost: 100000, coins: 20 },
            { id: 14, name: 'Netzersatzanlage 50', cost: 100000, coins: 20 },
            { id: 15, name: 'Netzersatzanlage 200', cost: 100000, coins: 20 },
            { id: 16, name: 'Großlüfter', cost: 75000, coins: 15 },
            { id: 17, name: '10te AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 18, name: 'Drohneneinheit', cost: 150000, coins: 25 },
            { id: 19, name: 'Verpflegungsdienst', cost: 200000, coins: 25 },
            { id: 20, name: '1te Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 21, name: '2te Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 22, name: '3te Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 23, name: '4te Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 24, name: '5te Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 25, name: 'Bahnrettung', cost: 125000, coins: 25 },
            { id: 26, name: '11te Ab-Stellplatz', cost: 150000, coins: 20 },
            { id: 27, name: '12te Ab-Stellplatz', cost: 150000, coins: 20 },
        ],

        '1_normal': [ // Feuerwehrschule
            { id: 0, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
            { id: 1, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
            { id: 2, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
        ],

        '2_normal': [ // Rettungswache
            { id: 0, name: 'Großwache', cost: 1000000, coins: 50 },
        ],

        '3_normal': [ // Rettungsschule
            { id: 0, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
            { id: 1, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
            { id: 2, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
        ],

        '4_normal': [ // Krankenhaus
            { id: 0, name: 'Allgemeine Innere', cost: 10000, coins: 10 },
            { id: 1, name: 'Allgemeine Chirugie', cost: 10000, coins: 10 },
            { id: 2, name: 'Gynäkologie', cost: 70000, coins: 15 },
            { id: 3, name: 'Urologie', cost: 70000, coins: 15 },
            { id: 4, name: 'Unfallchirugie', cost: 70000, coins: 15 },
            { id: 5, name: 'Neurologie', cost: 70000, coins: 15 },
            { id: 6, name: 'Neurochirugie', cost: 70000, coins: 15 },
            { id: 7, name: 'Kardiologie', cost: 70000, coins: 15 },
            { id: 8, name: 'Kardiochirugie', cost: 70000, coins: 15 },
            { id: 9, name: 'Großkrankenhaus', cost: 200000, coins: 50 },
        ],

        '5_normal': [ // Rettungshubschrauber-Station
            { id: 0, name: 'Windenrettung', cost: 200000, coins: 15 },
        ],

        '6_normal': [ // Polizeiwache
            { id: 0, name: '1te Zelle', cost: 25000, coins: 5 },
            { id: 1, name: '2te Zelle', cost: 25000, coins: 5 },
            { id: 2, name: '3te Zelle', cost: 25000, coins: 5 },
            { id: 3, name: '4te Zelle', cost: 25000, coins: 5 },
            { id: 4, name: '5te Zelle', cost: 25000, coins: 5 },
            { id: 5, name: '6te Zelle', cost: 25000, coins: 5 },
            { id: 6, name: '7te Zelle', cost: 25000, coins: 5 },
            { id: 7, name: '8te Zelle', cost: 25000, coins: 5 },
            { id: 8, name: '9te Zelle', cost: 25000, coins: 5 },
            { id: 9, name: '10te Zelle', cost: 25000, coins: 5 },
            { id: 10, name: 'Diensthundestaffel', cost: 100000, coins: 10 },
            { id: 11, name: 'Kriminalpolizei', cost: 100000, coins: 20 },
            { id: 12, name: 'Dienstgruppenleitung', cost: 200000, coins: 25 },
            { id: 13, name: 'Motorradstaffel', cost: 75000, coins: 15 },
            { id: 14, name: 'Großwache', cost: 1000000, coins: 50 },
            { id: 15, name: 'Großgewahrsam', cost: 200000, coins: 50 },
        ],

        '8_normal': [ // Polizeischule
            { id: 0, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
            { id: 1, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
            { id: 2, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
        ],

        '9_normal': [ // THW
            { id: 0, name: '1. Technischer Zug: Fachgruppe Bergung/Notinstandsetzung', cost: 25000, coins: 5 },
            { id: 1, name: '1. Technischer Zug: Zugtrupp', cost: 25000, coins: 5 },
            { id: 2, name: 'Fachgruppe Räumen', cost: 25000, coins: 5 },
            { id: 3, name: 'Fachgruppe Wassergefahren', cost: 500000, coins: 15 },
            { id: 4, name: '2. Technischer Zug - Bergungsgruppe', cost: 25000, coins: 5 },
            { id: 5, name: '2. Technischer Zug: Fachgruppe Bergung/Notinstandsetzung', cost: 25000, coins: 5 },
            { id: 6, name: '2. Technischer Zug: Zugtrupp', cost: 25000, coins: 5 },
            { id: 7, name: 'Fachgruppe Ortung', cost: 450000, coins: 25 },
            { id: 8, name: 'Fachgruppe Wasserschaden/Pumpen', cost: 200000, coins: 25 },
            { id: 9, name: 'Fachruppe Schwere Bergung', cost: 200000, coins: 25 },
            { id: 10, name: 'Fachgruppe Elektroversorgung', cost: 200000, coins: 25 },
            { id: 11, name: 'Ortsverband-Mannschaftstransportwagen', cost: 50000, coins: 15 },
            { id: 12, name: 'Trupp Unbenannte Luftfahrtsysteme', cost: 50000, coins: 15 },
            { id: 13, name: 'Fachzug Führung und Kommunikation', cost: 300000, coins: 25 },
        ],

        '10_normal': [ // THW-Bundesschule
            { id: 0, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
            { id: 1, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
            { id: 2, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
        ],

        '11_normal': [ // Bereitschaftspolizei
            { id: 0, name: '2. Zug der 1. Hundertschaft', cost: 25000, coins: 5 },
            { id: 1, name: '3. Zug der 1. Hundertschaft', cost: 25000, coins: 5 },
            { id: 2, name: 'Sonderfahrzeug: Gefangenenkraftwagen', cost: 25000, coins: 5 },
            { id: 3, name: 'Technischer Zug: Wasserwerfer', cost: 25000, coins: 5 },
            { id: 4, name: 'SEK: 1. Zug', cost: 100000, coins: 10 },
            { id: 5, name: 'SEK: 2. Zug', cost: 100000, coins: 10 },
            { id: 6, name: 'MEK: 1. Zug', cost: 100000, coins: 10 },
            { id: 7, name: 'MEK: 2. Zug', cost: 100000, coins: 10 },
            { id: 8, name: 'Diensthundestaffel', cost: 100000, coins: 10 },
            { id: 9, name: 'Reiterstaffel', cost: 300000, coins: 25},
            { id: 10, name: 'Lautsprecherkraftwagen', cost: 100000, coins: 10},
        ],

        '12_normal': [ // SEG
            { id: 0, name: 'Führung', cost: 25000, coins: 5 },
            { id: 1, name: 'Sanitätsdienst', cost: 25500, coins: 5 },
            { id: 2, name: 'Wasserrettung', cost: 500000, coins: 25 },
            { id: 3, name: 'Rettungshundestaffel', cost: 350000, coins: 25 },
            { id: 4, name: 'SEG-Drohne', cost: 50000, coins: 15 },
            { id: 5, name: 'Betreuungs- und Verpflegungsdienst', cost: 200000, coins: 25 },
        ],

        '13_normal': [ // Polizeihubschrauberstation
            { id: 0, name: 'Außenlastbehälter', cost: 200000, coins: 15 },
            { id: 1, name: 'Windenrettung', cost: 200000, coins: 15 },
        ],

        '17_normal': [ // Polizeisondereinheit
            { id: 0, name: 'SEK: 1. Zug', cost: 100000, coins: 10 },
            { id: 1, name: 'SEK: 2. Zug', cost: 100000, coins: 10 },
            { id: 2, name: 'MEK: 1. Zug', cost: 100000, coins: 10 },
            { id: 3, name: 'MEK: 2. Zug', cost: 100000, coins: 10 },
            { id: 4, name: 'Diensthundestaffel', cost: 100000, coins: 10 },

        ],

        '0_small': [ // Feuerwehr (Kleinwache)
            { id: 0, name: 'Rettungsdienst', cost: 100000, coins: 20 },
            { id: 1, name: '1te AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 2, name: '2te AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 6, name: 'Wasserrettung', cost: 400000, coins: 25 },
            { id: 8, name: 'Flughafenfeuerwehr', cost: 300000, coins: 25 },
            { id: 13, name: 'Werkfeuerwehr', cost: 100000, coins: 20 },
            { id: 14, name: 'Netzersatzanlage 50', cost: 100000, coins: 20 },
            { id: 16, name: 'Großlüfter', cost: 75000, coins: 25 },
            { id: 18, name: 'Drohneneinheit', cost: 150000, coins: 25 },
            { id: 19, name: 'Verpflegungsdienst', cost: 200000, coins: 25 },
            { id: 20, name: '1te Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 21, name: '2te Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 25, name: 'Bahnrettung', cost: 125000, coins: 25 },
        ],

        '6_small': [ // Polizei (Kleinwache)
            { id: 0, name: '1te Zelle', cost: 25000, coins: 5 },
            { id: 1, name: '2te Zelle', cost: 25000, coins: 5 },
            { id: 10, name: 'Diensthundestaffel', cost: 100000, coins: 10 },
            { id: 11, name: 'Kriminalpolizei', cost: 100000, coins: 20 },
            { id: 12, name: 'Dienstgruppenleitung', cost: 200000, coins: 25 },
            { id: 13, name: 'Motorradstaffel', cost: 75000, coins: 15 },
        ],

        '24_normal': [ // Reiterstaffel
            { id: 0, name: 'Reiterstaffel', cost: 300000, coins: 25 },
            { id: 1, name: 'Reiterstaffel', cost: 300000, coins: 25 },
            { id: 2, name: 'Reiterstaffel', cost: 300000, coins: 25 },
            { id: 3, name: 'Reiterstaffel', cost: 300000, coins: 25 },
            { id: 4, name: 'Reiterstaffel', cost: 300000, coins: 25 },
            { id: 5, name: 'Reiterstaffel', cost: 300000, coins: 25 },
        ],

        '25_normal': [ // Bergrettungswache
            { id: 0, name: 'Höhenrettung', cost: 50000, coins: 25 },
            { id: 1, name: 'Drohneneinheit', cost: 75000, coins: 25 },
            { id: 2, name: 'Rettungshundestaffel', cost: 350000, coins: 25 },
            { id: 3, name: 'Rettungsdienst', cost: 100000, coins: 20 },
        ],

        '27_normal': [ // Schule für Seefahrt und Seenotrettung
            { id: 0, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
            { id: 1, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
            { id: 2, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
        ],

    };
    const manualStorageRooms = {
        '0_normal': [
            { id: 'initial_containers', name: 'Lagerraum', cost: 25000, coins: 10, additionalStorage: 40 },
            { id: 'additional_containers_1', name: '1te Zusätzlicher Lagerraum', cost: 50000, coins: 12, additionalStorage: 30 },
            { id: 'additional_containers_2', name: '2te Zusätzlicher Lagerraum', cost: 50000, coins: 12, additionalStorage: 30 },
            { id: 'additional_containers_3', name: '3te Zusätzlicher Lagerraum', cost: 100000, coins: 15, additionalStorage: 30 },
            { id: 'additional_containers_4', name: '4te Zusätzlicher Lagerraum', cost: 100000, coins: 15, additionalStorage: 30 },
            { id: 'additional_containers_5', name: '5te Zusätzlicher Lagerraum', cost: 100000, coins: 15, additionalStorage: 30 },
            { id: 'additional_containers_6', name: '6te Zusätzlicher Lagerraum', cost: 100000, coins: 15, additionalStorage: 30 },
            { id: 'additional_containers_7', name: '7te Zusätzlicher Lagerraum', cost: 100000, coins: 15, additionalStorage: 30 },
        ],

        '0_small': [
            { id: 'initial_containers', name: 'Lagerraum', cost: 25000, coins: 10, additionalStorage: 40 },
            { id: 'additional_containers_1', name: '1te Zusätzlicher Lagerraum', cost: 50000, coins: 10, additionalStorage: 30 },
            { id: 'additional_containers_2', name: '2te Zusätzlicher Lagerraum', cost: 50000, coins: 10, additionalStorage: 30 },
        ],

        '5_normal': [
            { id: 'initial_containers', name: 'Lagerraum', cost: 25000, coins: 10, additionalStorage: 40 },
        ],
    };
    const buildingTypeNames = {
        '0_normal': 'Feuerwache (Normal)',
        '0_small': 'Feuerwache (Kleinwache)',
        '1_normal': 'Feuerwehrschule',
        '2_normal': 'Rettungswache',
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
        '17_normal': 'Polizei-Sondereinheiten',
        '24_normal': 'Reiterstaffel',
        '25_normal': 'Bergrettungswache',
        '27_normal': 'Schule für Seefahrt und Seenotrettung',
    };

    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Bereich für das Userinterface

    const SETTINGS_KEY = 'enabledExtensions';
    const defaultExtensionSettings = {};

    // Extensions in default settings
    for (const category in manualExtensions) {
        for (const ext of manualExtensions[category]) {
            defaultExtensionSettings[`${category}_${ext.id}`] = true;
        }
    }

    // Lagerräume in default settings
    for (const category in manualStorageRooms) {
        for (const room of manualStorageRooms[category]) {
            const key = `${category}_storage_${room.name.replace(/\s+/g, '_')}`;
            defaultExtensionSettings[key] = true;
        }
    }

    // Funktion um Einstellungen zu speichern
    function saveExtensionSettings(settings) {
        GM_setValue(SETTINGS_KEY, settings);
    }

    // Funktion zum beziehen der gespeicherten Einstellungen
    function getExtensionSettings() {
        return { ...defaultExtensionSettings, ...GM_getValue(SETTINGS_KEY, {}) };
    }

    // Funktion um das Overlay anzuzeigen
    function openExtensionSettingsOverlay() {
        const settings = getExtensionSettings();

        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10001,
            overflowY: 'auto',
        });

        const panel = document.createElement('div');
        Object.assign(panel.style, {
            margin: '50px auto',
            padding: '20px',
            background: 'var(--background-color, #fff)',
            color: 'var(--text-color, #000)',
            borderRadius: '10px',
            maxWidth: '800px',
            boxShadow: '0 0 10px rgba(0,0,0,0.25)',
        });

        // Beschreibung
        const description = document.createElement('div');
        description.style.marginBottom = '20px';

        const descHeading = document.createElement('h4');
        Object.assign(descHeading.style, {
            marginBottom: '10px',
            fontSize: '1.2em',
            lineHeight: '1.4',
        });
        descHeading.textContent = '🛠️ Erweiterungen & Lagerräume anpassen';

        description.appendChild(descHeading);

        const descText = document.createElement('p');
        descText.textContent = 'Gestalte deine Wachen individuell: Bestimme, welche Erweiterungen und Lagerräume du je Gebäude-Typ sehen möchtest. Deine Einstellungen werden gespeichert und beibehalten!';
        descText.style.lineHeight = '1.6';
        descText.style.margin = '0';

        description.appendChild(descText);
        panel.appendChild(description);

        // Tabs Buttons
        const btnGroup = document.createElement('div');
        btnGroup.style.marginBottom = '10px';

        const extBtn = document.createElement('button');
        extBtn.id = 'tab-ext-btn';
        extBtn.className = 'tab-btn active';
        extBtn.textContent = 'Erweiterungen';
        Object.assign(extBtn.style, {
            background: '#007bff',
            color: 'white',
            padding: '6px 12px',
            marginRight: '6px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
        });

        const storageBtn = document.createElement('button');
        storageBtn.id = 'tab-storage-btn';
        storageBtn.className = 'tab-btn';
        storageBtn.textContent = 'Lagerräume';
        Object.assign(storageBtn.style, {
            background: 'transparent',
            color: 'var(--text-color, #000)',
            padding: '6px 12px',
            marginRight: '6px',
            border: '1px solid var(--border-color, #ccc)',
            borderRadius: '4px',
            cursor: 'pointer',
        });

        btnGroup.appendChild(extBtn);
        btnGroup.appendChild(storageBtn);
        panel.appendChild(btnGroup);

        // Container für Tab-Inhalte
        const tabContent = document.createElement('div');
        tabContent.id = 'settings-tab-content';
        tabContent.style.margin = '20px 0';
        panel.appendChild(tabContent);

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
                gap: '6px',
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

        function createExtensionForm() {
    const form = document.createElement('form');

    for (const category in manualExtensions) {
        const fieldset = document.createElement('fieldset');
        fieldset.style.marginBottom = '12px';

        const { legend, arrow } = createSpoilerLegend(buildingTypeNames[category] || category);

        const content = document.createElement('div');
        content.style.display = 'none';
        content.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
        content.style.gap = '8px';
        content.style.padding = '8px 0';

        const allLabel = document.createElement('label');
        allLabel.style.gridColumn = '1 / -1';
        allLabel.style.display = 'flex';
        allLabel.style.alignItems = 'center';
        allLabel.style.gap = '6px';
        allLabel.style.fontWeight = '500';

        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';

        const selectAllText = document.createElement('span');
        selectAllText.textContent = 'Alle Erweiterungen an-/abwählen';
        selectAllText.style.fontWeight = 'bold';
        selectAllText.style.color = 'var(--primary-color, #007bff)';

        allLabel.appendChild(selectAllCheckbox);
        allLabel.appendChild(selectAllText);
        content.appendChild(allLabel);

        const checkboxes = [];

        manualExtensions[category]
            .slice()
            .sort((a, b) => {
                const aAlpha = /^[A-Za-z]/.test(a.name);
                const bAlpha = /^[A-Za-z]/.test(b.name);

                if (aAlpha && !bAlpha) return -1;
                if (!aAlpha && bAlpha) return 1;

                return a.name.localeCompare(b.name, 'de', { numeric: true });
            })
            .forEach(ext => {
                const key = `${category}_${ext.id}`;
                const label = document.createElement('label');
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.gap = '6px';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = settings[key];
                checkbox.dataset.key = key;

                checkbox.addEventListener('change', () => {
                    settings[key] = checkbox.checked;
                    const allChecked = checkboxes.every(cb => cb.checked);
                    selectAllCheckbox.checked = allChecked;
                });

                label.appendChild(checkbox);
                label.append(` ${ext.name}`);
                content.appendChild(label);
                checkboxes.push(checkbox);
            });

        selectAllCheckbox.checked = checkboxes.every(cb => cb.checked);
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
    }

    return form;
}


        function createStorageForm() {
            const form = document.createElement('form');

            for (const category in manualStorageRooms) {
                const fieldset = document.createElement('fieldset');
                fieldset.style.marginBottom = '12px';

                const {legend, arrow} = createSpoilerLegend(buildingTypeNames[category] || category);

                const content = document.createElement('div');
                content.style.display = 'none';
                content.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
                content.style.gap = '8px';
                content.style.padding = '8px 0';

                // Alle an-/abwählen Checkbox
                const allLabel = document.createElement('label');
                allLabel.style.gridColumn = '1 / -1';
                allLabel.style.display = 'flex';
                allLabel.style.alignItems = 'center';
                allLabel.style.gap = '6px';
                allLabel.style.fontWeight = '500';

                const selectAllCheckbox = document.createElement('input');
                selectAllCheckbox.type = 'checkbox';

                const selectAllText = document.createElement('span');
                selectAllText.textContent = 'Alle Lagerräume an-/abwählen';
                selectAllText.style.fontWeight = 'bold';
                selectAllText.style.color = 'var(--primary-color, #007bff)';

                allLabel.appendChild(selectAllCheckbox);
                allLabel.appendChild(selectAllText);
                content.appendChild(allLabel);

                const checkboxes = [];

                manualStorageRooms[category].forEach(room => {
                    const key = `${category}_storage_${room.name.replace(/\s+/g, '_')}`;
                    const label = document.createElement('label');
                    label.style.display = 'flex';
                    label.style.alignItems = 'center';
                    label.style.gap = '6px';

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = settings[key];
                    checkbox.dataset.key = key;

                    checkbox.addEventListener('change', () => {
                        settings[key] = checkbox.checked;
                        const allChecked = checkboxes.every(cb => cb.checked);
                        selectAllCheckbox.checked = allChecked;
                    });

                    label.appendChild(checkbox);
                    label.append(` ${room.name}`);
                    content.appendChild(label);
                    checkboxes.push(checkbox);
                });

                selectAllCheckbox.checked = checkboxes.every(cb => cb.checked);
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
            }

            return form;
        }

        function setActiveTab(tabName) {
            if (tabName === 'extensions') {
                extBtn.classList.add('active');
                Object.assign(extBtn.style, {background: '#007bff', color: 'white', border: 'none'});
                storageBtn.classList.remove('active');
                Object.assign(storageBtn.style, {background: 'transparent', color: 'var(--text-color, #000)', border: '1px solid var(--border-color, #ccc)'});
                tabContent.innerHTML = '';
                tabContent.appendChild(createExtensionForm());
            } else {
                storageBtn.classList.add('active');
                Object.assign(storageBtn.style, {background: '#007bff', color: 'white', border: 'none'});
                extBtn.classList.remove('active');
                Object.assign(extBtn.style, {background: 'transparent', color: 'var(--text-color, #000)', border: '1px solid var(--border-color, #ccc)'});
                tabContent.innerHTML = '';
                tabContent.appendChild(createStorageForm());
            }
        }

        extBtn.addEventListener('click', () => setActiveTab('extensions'));
        storageBtn.addEventListener('click', () => setActiveTab('storage'));
        setActiveTab('extensions');

        // Gemeinsamer Button-Bereich unten (inkl. Schließen)
        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '20px',
        });

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Speichern';
        Object.assign(saveBtn.style, {
            background: '#28a745',
            color: 'white',
            padding: '6px 12px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
        });
        saveBtn.addEventListener('click', () => {
            saveExtensionSettings(settings);
            alert('Deine Einstellungen wurden gespeichert. Die Seite wird neu geladen, um diese zu übernehmen.');
            overlay.remove();
            location.reload();
        });

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Schließen';
        Object.assign(closeBtn.style, {
            backgroundColor: '#dc3545',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
        });
        closeBtn.addEventListener('click', () => overlay.remove());

        buttonContainer.appendChild(saveBtn);
        buttonContainer.appendChild(closeBtn);
        panel.appendChild(buttonContainer);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);
    }

    // Ende des Userinterfaces

    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Funktion zum Abrufen der Benutzereinstellungen vom API
    async function getUserMode() {
        try {
            const response = await fetch('https://www.leitstellenspiel.de/api/settings');
            const data = await response.json();
            return data; // Gibt die vollständige Antwort zurück
        } catch (error) {
            console.error("Fehler beim Abrufen der Einstellungen: ", error);
            return null;
        }
    }

    // Funktion zum Anwenden des Dark- oder Light-Modus basierend auf der API-Antwort
    async function applyMode() {
        const userSettings = await getUserMode();
        if (!userSettings) {
            return;
        }

        const mode = userSettings.design_mode; // Benutze jetzt "design_mode" anstelle von "mode"
        // Warten auf das Lightbox-Element
        const lightboxContent = document.getElementById('extension-lightbox-content');
        if (!lightboxContent) {
            return;
        }

        // Entferne alle möglichen Modus-Klassen
        lightboxContent.classList.remove('dark', 'light');

        // Modus anwenden
        if (mode === 1 || mode === 4) { // Dunkelmodus
            lightboxContent.classList.add('dark');

            // Dark Mode für Tabelle
            document.documentElement.style.setProperty('--background-color', '#333');
            document.documentElement.style.setProperty('--text-color', '#fff');
            document.documentElement.style.setProperty('--border-color', '#444');
        } else if (mode === 2 || mode === 3) { // Hellmodus
            lightboxContent.classList.add('light');

            // Light Mode für Tabelle
            document.documentElement.style.setProperty('--background-color', '#f2f2f2');
            document.documentElement.style.setProperty('--text-color', '#000');
            document.documentElement.style.setProperty('--border-color', '#ccc');
        } else { // Standardmodus (wenn der Modus unbekannt ist)
            lightboxContent.classList.add('light'); // Standardmäßig hell

            // Standard Light Mode für Tabelle
            document.documentElement.style.setProperty('--background-color', '#f2f2f2');
            document.documentElement.style.setProperty('--text-color', '#000');
            document.documentElement.style.setProperty('--border-color', '#ccc');
        }
    }

    // Funktion zur Beobachtung der Lightbox auf Änderungen (für dynamisch geladene Elemente)
    function observeLightbox() {
        const lightboxContainer = document.getElementById('extension-lightbox');
        if (!lightboxContainer) {
            return;
        }

        const observer = new MutationObserver(() => {
            // Überprüfe, ob das Content-Element in der Lightbox existiert
            const lightboxContent = document.getElementById('extension-lightbox-content');
            if (lightboxContent) {
                applyMode(); // Wenn das Lightbox-Inhalt gefunden wird, Modus anwenden
                observer.disconnect(); // Beende die Beobachtung, wenn die Lightbox gefunden wurde
            }
        });

        // Beobachte das Hinzufügen von neuen Kindelementen (wie die Lightbox-Inhalte)
        observer.observe(lightboxContainer, { childList: true, subtree: true });
    }

    // Wende den Modus an, wenn das DOM bereit ist
    window.addEventListener('load', () => {
        applyMode();
        observeLightbox(); // Beobachtet dynamische Änderungen
    });

    // Fügt die Stile hinzu
    const styleElement = document.createElement('style');
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);

    const lightbox = document.createElement('div');
    lightbox.id = 'extension-lightbox';
    lightbox.style.display = 'none';
    lightbox.innerHTML = `
        <div id="extension-lightbox-content">
        <button id="close-extension-helper">Schließen</button>
        <h3>🚒🏗️ <strong>Herzlich willkommen beim ultimativen Ausbau-Assistenten für eure Wachen!</strong> 🚒🏗️</h3>
        <h2>
        <br>Dem Erweiterungs-Manager
        </h2>
        <h5>
        <br>
        <br>Dieses kleine Helferlein zeigt euch genau, wo noch Platz in euren Wachen ist: Welche <strong>Erweiterungen</strong> und <strong>Lagerräume</strong> noch möglich sind – und mit nur ein paar Klicks geht’s direkt in den Ausbau. Einfacher wird’s nicht!
        <br>
        <br>Und das Beste: Über den
        <button id="open-extension-settings" style="
        font-weight: 600;
        color: #fff;
        background-color: var(--primary-color, #007bff);
        border: none;
        padding: 6px 14px;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        margin: 0 5px;
        ">
        Einstellungen
        </button>
        -Button könnt ihr festlegen, welche Erweiterungen und Lagerräume euch pro Wachen-Typ angezeigt werden – ganz nach eurem Geschmack. Einmal gespeichert, für immer gemerkt.
        <br>
        <br>Kleiner Hinweis am Rande: Feedback, Verbesserungsvorschläge oder Kritik zum Skript sind jederzeit im
        <a href="https://forum.leitstellenspiel.de/index.php?thread/27856-script-erweiterungs-manager/" target="_blank" style="color:#007bff; text-decoration:none;">
        <strong>Forum</strong>
        </a> willkommen. 💌
        <br>
        <br>
        <br>Und nun viel Spaß beim Credits oder Coins ausgeben!
        <br>
        <br>
        <div id="extension-list">
        Einen Moment Geduld bitte …
        <br><br>
        Gebäudedaten werden geladen, Kaffee kocht – gleich geht's los!
        </div>
        </h5>
        </div>
        `;

    document.body.appendChild(lightbox);

    const openBtn = document.getElementById('open-extension-settings');
    const lightboxContent = lightbox.querySelector('#extension-lightbox-content');

    openBtn.addEventListener('mouseenter', () => {
        openBtn.style.backgroundColor = '#0056b3'; // dunkleres Blau beim Hover
    });
    openBtn.addEventListener('mouseleave', () => {
        openBtn.style.backgroundColor = 'var(--primary-color, #007bff)';
    });
    openBtn.addEventListener('click', () => {
        openExtensionSettingsOverlay();
    });

    // Darkmode oder Whitemode anwenden
    function applyTheme() {
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        lightboxContent.classList.toggle('dark', isDarkMode);
        lightboxContent.classList.toggle('light', !isDarkMode);
    }

    // Event-Listener für Theme-Änderungen
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

    // Theme initial anwenden
    applyTheme();

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

        // Prüfen, ob der Button bereits existiert
        if (profileMenu.querySelector('#open-extension-helper')) return;

        // <li>-Element erstellen
        const menuButton = document.createElement('li');
        menuButton.setAttribute('role', 'presentation');

        // <a>-Element erstellen (wie bei den anderen Einträgen)
        const link = document.createElement('a');
        link.id = 'open-extension-helper';
        link.href = '#'; // notwendig, damit Styles greifen
        link.innerHTML = `
        <span class="glyphicon glyphicon-wrench"></span>&nbsp;&nbsp; Erweiterungs-Manager
    `;

        // Verhalten wie bei einem normalen Menü-Eintrag
        link.addEventListener('click', (e) => {
            e.preventDefault(); // verhindert Navigation
            checkPremiumAndShowHint(); // deine Funktion
        });

        // Elemente zusammenbauen
        menuButton.appendChild(link);

        // Einfügen vor Divider oder am Ende
        const divider = profileMenu.querySelector('li.divider');
        if (divider) {
            profileMenu.insertBefore(menuButton, divider);
        } else {
            profileMenu.appendChild(menuButton);
        }
    }

    // Initial den Button hinzufügen
    addMenuButton();

    // Globale Variable definieren
    var user_premium = false;

    // Funktion, um den Premium-Status zu überprüfen
    function checkPremiumStatus() {
        // Suchen Sie nach dem Skript-Tag, das die Variable user_premium setzt
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var scriptContent = scripts[i].textContent;
            var premiumMatch = scriptContent.match(/var user_premium\s*=\s*(true|false);/);
            if (premiumMatch) {
                user_premium = (premiumMatch[1] === 'true');
                break;
            }
        }

        // Fallback, falls die Variable nicht gefunden wird
        if (typeof user_premium === 'undefined') {
            console.error("Die Variable 'user_premium' ist nicht definiert. Bitte prüfen Sie die HTML-Struktur.");
            user_premium = false; // Standardwert setzen
        }
    }

    // Rufen Sie die Funktion auf, um den Status zu überprüfen
    checkPremiumStatus();

    // Funktion zur Prüfung von Premium und Hinweis
    async function checkPremiumAndShowHint() {
        const userSettings = await getUserMode();
        const isDarkMode = userSettings && (userSettings.design_mode === 1 || userSettings.design_mode === 4);

        function createCustomAlert(message, isDarkMode, callback) {
            const alertDiv = document.createElement('div');
            alertDiv.style.position = 'fixed';
            alertDiv.style.top = '50%';
            alertDiv.style.left = '50%';
            alertDiv.style.transform = 'translate(-50%, -50%)';
            alertDiv.style.padding = '20px';
            alertDiv.style.border = '1px solid';
            alertDiv.style.borderRadius = '10px';
            alertDiv.style.boxShadow = '0px 0px 10px rgba(0,0,0,0.2)';
            alertDiv.style.width = '300px';
            alertDiv.style.textAlign = 'center';
            alertDiv.style.zIndex = '10002';

            alertDiv.style.background = isDarkMode ? '#333' : '#fff';
            alertDiv.style.color = isDarkMode ? '#fff' : '#000';
            alertDiv.style.borderColor = isDarkMode ? '#444' : '#ccc';

            const alertText = document.createElement('p');
            alertText.textContent = message;
            alertDiv.appendChild(alertText);

            const closeButton = document.createElement('button');
            closeButton.textContent = 'OK';
            closeButton.style.marginTop = '10px';
            closeButton.style.padding = '5px 10px';
            closeButton.style.border = 'none';
            closeButton.style.cursor = 'pointer';
            closeButton.style.borderRadius = '4px';
            closeButton.style.backgroundColor = isDarkMode ? '#444' : '#007bff';
            closeButton.style.color = isDarkMode ? '#fff' : '#fff';
            closeButton.onclick = () => {
                document.body.removeChild(alertDiv);
                callback();
            };
            alertDiv.appendChild(closeButton);

            document.body.appendChild(alertDiv);
        }

        if (typeof user_premium !== 'undefined') {

            if (!user_premium) {
                createCustomAlert("Du kannst dieses Script nur mit Einschränkungen nutzen da du keinen Premium-Account hast.", isDarkMode, () => {
                    const lightbox = document.getElementById('extension-lightbox');
                    lightbox.style.display = 'flex';
                    fetchBuildingsAndRender(); // API-Daten abrufen, wenn das Script geöffnet wird
                });
            } else {
                const lightbox = document.getElementById('extension-lightbox');
                lightbox.style.display = 'flex';
                fetchBuildingsAndRender(); // API-Daten abrufen, wenn das Script geöffnet wird
            }
        } else {
            console.error("Die Variable 'user_premium' ist nicht definiert. Bitte prüfe, ob sie korrekt geladen wurde.");
        }
    }

    // Funktion, um den Namen eines Gebäudes anhand der ID zu bekommen
    function getBuildingCaption(buildingId) {
        const building = buildingsData.find(b => String(b.id) === String(buildingId));
        if (building) {

            return building.caption; // Direkt den Gebäudennamen zurückgeben
        }

        return 'Unbekanntes Gebäude';
    }

    let buildingsData = []; // Globale Variable, um die abgerufenen Gebäudedaten zu speichern
    let buildingGroups = {}; // Globale Definition
    const storageGroups = {};

    // Funktion zum Abrufen der Gebäudedaten
    function fetchBuildingsAndRender() {
        fetch('https://www.leitstellenspiel.de/api/buildings')
            .then(response => {
            if (!response.ok) {
                throw new Error('Fehler beim Abrufen der Daten');
            }
            return response.json();
        })
            .then(data => {
            buildingsData = data; // Speichern der Gebäudedaten in einer globalen Variablen
            renderMissingExtensions(data); // Weiterverarbeiten der abgerufenen Daten
        })
            .catch(error => {
            const list = document.getElementById('extension-list');
            list.innerHTML = 'Fehler beim Laden der Gebäudedaten.';
        });
    }

    // Funktion, um den Namen der zugehörigen Leitstelle zu ermitteln
    function getLeitstelleName(building) {
        if (!building.leitstelle_building_id) return 'Keine Leitstelle';

        const leitstelle = buildingsData.find(b => b.id === building.leitstelle_building_id);
        return leitstelle ? leitstelle.caption : 'Unbekannt';
    }

    // Funktion um die aktuelle Credits und Coins des Users abzurufen
    async function getUserCredits() {
        try {
            const response = await fetch('https://www.leitstellenspiel.de/api/userinfo');
            if (!response.ok) {
                throw new Error('Fehler beim Abrufen der Credits und Coins');
            }
            const data = await response.json();
            return {
                credits: data.credits_user_current,
                coins: data.coins_user_current,
                premium: data.premium // Fügen Sie diese Zeile hinzu, um den Premium-Status zurückzugeben
            };
        } catch (error) {
            console.error('Fehler beim Abrufen der Credits und Coins:', error);
            throw error;
        }
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

                const storageKey = `${baseKey}_storage_${opt.name.replace(/\s+/g, '_')}`;
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

    // Funktion um die Tabellen mit Daten zu füllen
    async function renderMissingExtensions(buildings) {
        const userInfo = await getUserCredits();
        const list = document.getElementById('extension-list');
        list.innerHTML = '';

        buildingGroups = {};
        buildingsData = buildings;

        buildings.sort((a, b) =>
                       a.building_type === b.building_type
                       ? a.caption.localeCompare(b.caption)
                       : a.building_type - b.building_type
                      );

        const settings = getExtensionSettings();

        // Gruppiere Gebäude nach Typ & filtere erlaubte Erweiterungen
        buildings.forEach(building => {
            const baseKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            const extensions = manualExtensions[baseKey];
            const storageOptions = manualStorageRooms[baseKey];
            if (!extensions && !storageOptions) return;

            const existingExtensions = new Set(building.extensions.map(e => e.type_id));
            const existingStorages = new Set((building.storage_upgrades || []).map(u => Object.keys(u)[0]));

            const allowedExtensions = (extensions || []).filter(ext => {
                const key = `${baseKey}_${ext.id}`;
                if (!settings[key] || isExtensionLimitReached(building, ext.id)) return false;

                // Ergänzung: Bereits gebaute Erweiterung immer ausblenden!
                if (existingExtensions.has(ext.id)) return false;

                const isForbidden = (forbiddenIds) =>
                forbiddenIds.some(id => existingExtensions.has(id)) && !forbiddenIds.includes(ext.id);

                if (building.building_type === 6 && building.small_building) {
                    return !isForbidden([10, 11, 12, 13]);
                }

                if (building.building_type === 0 && building.small_building) {
                    return !isForbidden([0, 6, 8, 13, 14, 16, 18, 19, 25]);
                }

                return true;
            });

            const enabledStorages = (storageOptions || []).filter(opt => {
                const key = `${baseKey}_storage_${opt.name.replace(/\s+/g, '_')}`;
                return settings[key] !== false && !existingStorages.has(opt.id.toString());
            });

            // Nur Gebäude einfügen, wenn Erweiterungen oder Lager fehlen
            if (allowedExtensions.length === 0 && enabledStorages.length === 0) return;

            buildingGroups[baseKey] = buildingGroups[baseKey] || [];
            buildingGroups[baseKey].push({ building, missingExtensions: allowedExtensions });

            // Lagergruppen vorbereiten
            if (enabledStorages.length > 0) {
                prepareStorageGroup(baseKey, [{ building }], settings);
            }
        });

        // Für jede Gruppe UI erzeugen
        Object.entries(buildingGroups).forEach(([groupKey, group]) => {
            const buildingType = buildingTypeNames[groupKey] || 'Unbekannt';

            const header = createHeader(buildingType);
            const buttons = createButtonContainer(groupKey, group);

            const hasEnabledStorage = group.some(({ building }) => {
                const baseKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
                const options = manualStorageRooms[baseKey];
                if (!options) return false;

                return options.some(opt => {
                    const key = `${baseKey}_storage_${opt.name.replace(/\s+/g, '_')}`;
                    return settings[key] !== false;
                });
            });

            if (buttons.lagerButton) {
                buttons.lagerButton.disabled = !hasEnabledStorage;
                buttons.lagerButton.style.opacity = hasEnabledStorage ? '1' : '0.5';
                buttons.lagerButton.style.cursor = hasEnabledStorage ? 'pointer' : 'not-allowed';
                if (!hasEnabledStorage) {
                    buttons.lagerButton.title = 'Keine Lager-Erweiterung für diese Gruppe aktiviert';
                }
            }

            // Erweiterungen prüfen
            const hasExtensions = group.some(({ missingExtensions }) => missingExtensions.length > 0);

            if (buttons.spoilerButton) {
                buttons.spoilerButton.disabled = !hasExtensions;
                buttons.spoilerButton.style.opacity = hasExtensions ? '1' : '0.5';
                buttons.spoilerButton.style.cursor = hasExtensions ? 'pointer' : 'not-allowed';
                if (!hasExtensions) {
                    buttons.spoilerButton.title = 'Keine Erweiterungen zum Ausbau oder ausgewählt';
                }
            }

            // Spoiler-Wrapper erzeugen (analog Lager-Wrapper)
            const spoilerWrapper = hasExtensions
            ? createSpoilerContentWrapper(buttons.spoilerButton)
            : null;

            if (spoilerWrapper) {
                const table = createExtensionTable(groupKey, group, userInfo, buttons.buildSelectedButton);
                spoilerWrapper.appendChild(table);
            }

            const lagerWrapper = buttons.lagerButton && hasEnabledStorage
            ? createLagerContentWrapper(buttons.lagerButton, group, userInfo, buttons.buildSelectedButton)
            : null;

            list.append(header, buttons.container);

            if (spoilerWrapper) {
                list.appendChild(spoilerWrapper);
            }

            if (lagerWrapper) {
                list.appendChild(lagerWrapper);
            }

            if (spoilerWrapper && lagerWrapper) {
                spoilerWrapper.otherWrapper = lagerWrapper;
                lagerWrapper.otherWrapper = spoilerWrapper;
            }
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

        const spoilerButton = createButton('Erweiterungen anzeigen', ['btn', 'spoiler-button']);

        const canBuildStorage = group.some(({ building }) => {
            const key = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            return manualStorageRooms.hasOwnProperty(key);
        });

        let lagerButton = null;
        if (canBuildStorage) {
            lagerButton = createButton('Lager anzeigen', ['btn','lager-button']);

        }

        const buildSelectedButton = createButton('Ausgewählte Erweiterungen/Lager bauen', ['btn', 'build-selected-button']);
        buildSelectedButton.disabled = true;
        buildSelectedButton.onclick = () => buildSelectedExtensions();

        const buildAllButton = createButton('Sämtliche Erweiterungen/Lager bei allen Wachen bauen', ['btn', 'build-all-button']);
        buildAllButton.onclick = () => showCurrencySelectionForAll(groupKey);

        [spoilerButton, lagerButton, buildSelectedButton, buildAllButton]
            .filter(Boolean)
            .forEach(btn => container.appendChild(btn));

        return {
            container,
            spoilerButton,
            lagerButton,
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

    // Funktion um die Spoiler-Inhalte zu erstellen (Erweiterung/Lager)
    function createSpoilerContentWrapper(spoilerButton) {
        const wrapper = document.createElement('div');
        wrapper.className = 'spoiler-content';
        wrapper.style.display = 'none';

        spoilerButton.addEventListener('click', () => {
            const show = wrapper.style.display !== 'block';

            // Erst alle anderen Wrapper schließen, wenn vorhanden
            if (wrapper.otherWrapper) {
                wrapper.otherWrapper.style.display = 'none';
                const otherButton = wrapper.otherWrapper.associatedButton;
                if (otherButton) otherButton.textContent = 'Lager anzeigen';
            }

            wrapper.style.display = show ? 'block' : 'none';
            spoilerButton.textContent = show ? 'Erweiterungen ausblenden' : 'Erweiterungen anzeigen';
            spoilerButton.classList.toggle('active-button', show);

            // Gegenstück deaktivieren, falls vorhanden
            if (wrapper.otherWrapper && wrapper.otherWrapper.associatedButton) {
                wrapper.otherWrapper.associatedButton.classList.remove('active-button');
            }
        });

        // Referenz für später (zum Rücksetzen anderer Buttons)
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

            // Erst anderen Wrapper schließen, falls vorhanden
            if (wrapper.otherWrapper) {
                wrapper.otherWrapper.style.display = 'none';
                const otherButton = wrapper.otherWrapper.associatedButton;
                if (otherButton) otherButton.textContent = 'Erweiterungen anzeigen';
            }

            wrapper.style.display = show ? 'block' : 'none';
            lagerButton.textContent = show ? 'Lager ausblenden' : 'Lager anzeigen';
            lagerButton.classList.toggle('active-button', show);

            // Gegenstück deaktivieren, falls vorhanden
            if (wrapper.otherWrapper && wrapper.otherWrapper.associatedButton) {
                wrapper.otherWrapper.associatedButton.classList.remove('active-button');
            }
        });

        // Referenz speichern
        wrapper.associatedButton = lagerButton;

        return wrapper;
    }

    // Funktion zur Prüfung der richtigen Baureihenfolge von Lagerräumen
    function canBuildStorageInOrder(storageId, buildingType, builtStorages) {
        const storageList = manualStorageRooms[buildingType];
        if (!storageList) return true;

        const indexToBuild = storageList.findIndex(s => s.id === storageId);
        if (indexToBuild === -1) return true;

        for (let i = 0; i < indexToBuild; i++) {
            if (!builtStorages.includes(storageList[i].id)) {

                return false;
            }
        }

        return true;
    }
    function canBuildAllSelectedInOrder(selectedStorages, buildingType, builtStorages) {
        const storageList = manualStorageRooms[buildingType];
        if (!storageList) return true;

        const allBuilt = new Set(builtStorages);

        for (let i = 0; i < storageList.length; i++) {
            const currentStorageId = storageList[i].id;

            if (selectedStorages.includes(currentStorageId)) {
                // Prüfe: sind alle vorherigen gebaut?
                for (let j = 0; j < i; j++) {
                    const prevStorageId = storageList[j].id;
                    if (!allBuilt.has(prevStorageId)) {
                        // Nicht erlaubt, weil vorherige Lager fehlen
                        return false;
                    }
                }

                // Temporär als "gebaut" markieren, um Reihenfolge in dieser Session zu tracken
                allBuilt.add(currentStorageId);
            }
        }

        return true;
    }

    // Funktion um die Tabelle für Erweiterung und Lager zu erstellen
    function createExtensionTable(groupKey, group, userInfo, buildSelectedButton) {
        const table = document.createElement('table');
        table.innerHTML = `
        <thead style="background-color: #f2f2f2; font-weight: bold; border-bottom: 2px solid #ccc;">
            <tr>
                <th style="padding: 10px; text-align: center;">Alle An- / Abwählen</th>
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
        const filters = {};
        const filterRow = document.createElement('tr');
        const filterElements = {};

        // Checkbox für „Alle auswählen“
        const selectAllCell = document.createElement('th');
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = 'select-all-checkbox';
        selectAllCheckbox.dataset.group = groupKey;
        selectAllCell.appendChild(selectAllCheckbox);
        filterRow.appendChild(selectAllCell);

        // Hilfsfunktion für Dropdown-Filter
        function createDropdownFilter(options, placeholder, colIndex) {
            const th = document.createElement('th');
            const select = document.createElement('select');
            select.innerHTML = `<option value="">🔽 ${placeholder}</option>`;
            [...new Set(options)].sort().forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
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

        // Sammle Filteroptionen
        const leitstellen = group.map(g => getLeitstelleName(g.building));
        const wachen = group.map(g => g.building.caption);
        const erweiterungen = group.flatMap(g => g.missingExtensions.map(e => e.name));

        filterRow.appendChild(createDropdownFilter(leitstellen, 'Leitstelle', 1));
        filterRow.appendChild(createDropdownFilter(wachen, 'Wache', 2));
        filterRow.appendChild(createDropdownFilter(erweiterungen, 'Erweiterung', 3));

        // Filter zurücksetzen
        const resetCell = document.createElement('th');
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Filter zurücksetzen';
        resetBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        resetBtn.style.padding = '2px 6px';
        resetBtn.style.fontSize = '0.8em';
        resetBtn.onclick = () => {
            Object.values(filterElements).forEach(select => select.selectedIndex = 0);
            Object.keys(filters).forEach(k => delete filters[k]);
            applyAllFilters();
            updateSelectAllCheckboxState();
        };
        resetCell.appendChild(resetBtn);
        filterRow.appendChild(resetCell);

        filterRow.appendChild(document.createElement('th')); // leer lassen
        table.querySelector('thead').appendChild(filterRow);

        selectAllCheckbox.addEventListener('change', () => {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                if (row.style.display !== 'none') {
                    const cb = row.querySelector('.extension-checkbox');
                    if (cb && !cb.disabled) cb.checked = selectAllCheckbox.checked;
                }
            });
            updateBuildSelectedButton();
            updateSelectAllCheckboxState();
        });

        group.forEach(({ building, missingExtensions }) => {
            missingExtensions.forEach(extension => {
                if (isExtensionLimitReached(building, extension.id)) return;

                const row = document.createElement('tr');
                row.classList.add(`row-${building.id}-${extension.id}`);

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'extension-checkbox';
                checkbox.dataset.buildingId = building.id;
                checkbox.dataset.extensionId = extension.id;
                checkbox.disabled = userInfo.credits < extension.cost && userInfo.coins < extension.coins;
                checkbox.addEventListener('change', () => {
                    updateBuildSelectedButton();
                });

                row.innerHTML = `
                <td></td>
                <td>${getLeitstelleName(building)}</td>
                <td>${building.caption}</td>
                <td>${extension.name}</td>
            `;

                row.children[0].appendChild(checkbox);

                // Credits-Button
                const creditCell = document.createElement('td');
                const creditBtn = document.createElement('button');
                creditBtn.textContent = `${formatNumber(extension.cost)} Credits`;
                creditBtn.classList.add('btn', 'btn-xl', 'credit-button');
                creditBtn.style.backgroundColor = '#28a745';
                creditBtn.style.color = 'white';
                creditBtn.disabled = userInfo.credits < extension.cost;
                creditBtn.onclick = () => buildExtension(building, extension.id, 'credits', extension.cost, row);
                creditCell.appendChild(creditBtn);
                row.appendChild(creditCell);

                // Coins-Button
                const coinsCell = document.createElement('td');
                const coinBtn = document.createElement('button');
                coinBtn.textContent = `${extension.coins} Coins`;
                coinBtn.classList.add('btn', 'btn-xl', 'coins-button');
                coinBtn.style.backgroundColor = '#dc3545';
                coinBtn.style.color = 'white';
                coinBtn.disabled = userInfo.coins < extension.coins;
                coinBtn.onclick = () => buildExtension(building, extension.id, 'coins', extension.coins, row);
                coinsCell.appendChild(coinBtn);
                row.appendChild(coinsCell);

                tbody.appendChild(row);
            });
        });

        function applyAllFilters() {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                let visible = true;
                Object.entries(filters).forEach(([i, val]) => {
                    const text = row.children[i]?.textContent.toLowerCase().trim();
                    if (val && text !== val.toLowerCase()) visible = false;
                });
                row.style.display = visible ? '' : 'none';
            });
        }

        function updateSelectAllCheckboxState() {
            const rows = tbody.querySelectorAll('tr');
            let total = 0, checked = 0;
            rows.forEach(row => {
                if (row.style.display !== 'none') {
                    const cb = row.querySelector('.extension-checkbox');
                    if (cb && !cb.disabled) {
                        total++;
                        if (cb.checked) checked++;
                    }
                }
            });
            selectAllCheckbox.checked = total > 0 && total === checked;
            selectAllCheckbox.indeterminate = checked > 0 && checked < total;
        }

        return table;
    }
    function createLagerTable(group, userInfo, buildSelectedButton, currentGroupKey) {
        const settings = getExtensionSettings();

        const table = document.createElement('table');
        table.innerHTML = `
        <thead style="background-color: #f2f2f2; font-weight: bold; border-bottom: 2px solid #ccc;">
            <tr>
                <th style="padding: 10px; text-align: center;">Alle An- / Abwählen</th>
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
        const filters = {};
        const filterElements = {};
        const filterRow = document.createElement('tr');

        const selectAllCell = document.createElement('th');
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = 'select-all-checkbox-lager';
        selectAllCell.appendChild(selectAllCheckbox);
        filterRow.appendChild(selectAllCell);

        function createDropdownFilter(options, placeholder, colIndex) {
            const th = document.createElement('th');
            const select = document.createElement('select');
            select.innerHTML = `<option value="">🔽 ${placeholder}</option>`;
            [...new Set(options)].sort().forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
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

            const current = new Set((building.storage_upgrades || []).map(u => u.type_id));

            options.forEach(opt => {
                const id = opt.id;

                if (current.has(id)) return;
                const storageKey = `${baseKey}_storage_${opt.name.replace(/\s+/g, '_')}`;
                if (settings[storageKey] === false) return;

                leitstellen.push(getLeitstelleName(building));
                wachen.push(building.caption);
                lagerArten.push(opt.name);

                const row = document.createElement('tr');
                row.classList.add(`storage-row-${building.id}-${id}`);

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'storage-checkbox';
                checkbox.dataset.buildingId = building.id;
                checkbox.dataset.storageType = id;
                checkbox.disabled = userInfo.credits < opt.cost && userInfo.coins < opt.coins;
                checkbox.addEventListener('change', () => {
                    updateBuildSelectedButton();
                });

                const checkboxCell = document.createElement('td');
                checkboxCell.appendChild(checkbox);
                row.appendChild(checkboxCell);

                [getLeitstelleName(building), building.caption, opt.name, `+${opt.additionalStorage}`].forEach(text => {
                    const td = document.createElement('td');
                    td.textContent = text;
                    row.appendChild(td);
                });

                const creditCell = document.createElement('td');
                const creditBtn = document.createElement('button');
                creditBtn.textContent = `${formatNumber(opt.cost)} Credits`;
                creditBtn.classList.add('btn', 'btn-xl', 'credit-button');
                creditBtn.style.backgroundColor = '#28a745';
                creditBtn.style.color = 'white';
                creditBtn.disabled = userInfo.credits < opt.cost;
                creditBtn.onclick = () => {
                    const baseKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
                    const built = (building.storage_upgrades || []).map(u => Object.keys(u)[0]);

                    if (!canBuildStorageInOrder(id, baseKey, built)) {
                        alert("Bitte beachte: Die Lagerräume müssen in der vorgegebenen Reihenfolge gebaut werden.\n\nReihenfolge:\n1. Lagerraum\n2. 1te zusätzlicher Lagerraum\n3. 2te zusätzlicher Lagerraum\n4. 3te zusätzlicher Lagerraum\n5. 4te zusätzlicher Lagerraum\n6. 5te zusätzlicher Lagerraum.\n7. 6te zusätzlicher Lagerraum\n8. 7te zusätzlicher Lagerraum");

                        return;
                    }

                    buildStorage(building, id, 'credits', opt.cost, row);
                };
                creditCell.appendChild(creditBtn);
                row.appendChild(creditCell);

                const coinsCell = document.createElement('td');
                const coinBtn = document.createElement('button');
                coinBtn.textContent = `${opt.coins} Coins`;
                coinBtn.classList.add('btn', 'btn-xl', 'coins-button');
                coinBtn.style.backgroundColor = '#dc3545';
                coinBtn.style.color = 'white';
                coinBtn.disabled = userInfo.coins < opt.coins;
                coinBtn.onclick = () => {
                    const baseKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
                    const built = (building.storage_upgrades || []).map(u => Object.keys(u)[0]);

                    if (!canBuildStorageInOrder(id, baseKey, built)) {
                        alert("Bitte beachte: Die Lagerräume müssen in der vorgegebenen Reihenfolge gebaut werden.\n\nReihenfolge:\n1. Lagerraum\n2. 1te zusätzlicher Lagerraum\n3. 2te zusätzlicher Lagerraum\n4. 3te zusätzlicher Lagerraum\n5. 4te zusätzlicher Lagerraum\n6. 5te zusätzlicher Lagerraum\nusw.");

                        return;
                    }

                    buildStorage(building, id, 'coins', opt.coins, row);
                };
                coinsCell.appendChild(coinBtn);
                row.appendChild(coinsCell);

                tbody.appendChild(row);
            });
        });

        // Filterzeile ergänzen
        filterRow.appendChild(createDropdownFilter(leitstellen, 'Leitstelle', 1));
        filterRow.appendChild(createDropdownFilter(wachen, 'Wache', 2));
        filterRow.appendChild(createDropdownFilter(lagerArten, 'Erweiterung', 3));

        const resetCell = document.createElement('th');
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Filter zurücksetzen';
        resetBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        resetBtn.style.padding = '2px 6px';
        resetBtn.style.fontSize = '0.8em';
        resetBtn.onclick = () => {
            Object.values(filterElements).forEach(select => select.selectedIndex = 0);
            Object.keys(filters).forEach(k => delete filters[k]);
            applyAllFilters();
            updateSelectAllCheckboxState();
        };
        resetCell.appendChild(resetBtn);
        filterRow.appendChild(resetCell);
        filterRow.appendChild(document.createElement('th')); // Coins-Spalte leer lassen

        table.querySelector('thead').appendChild(filterRow);

        selectAllCheckbox.addEventListener('change', () => {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                if (row.style.display !== 'none') {
                    const cb = row.querySelector('.storage-checkbox');
                    if (cb && !cb.disabled) cb.checked = selectAllCheckbox.checked;
                }
            });
            updateSelectAllCheckboxState()
            updateBuildSelectedButton();
        });

        function applyAllFilters() {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                let visible = true;
                Object.entries(filters).forEach(([i, val]) => {
                    const text = row.children[i]?.textContent.toLowerCase().trim();
                    if (val && text !== val.toLowerCase()) visible = false;
                });
                row.style.display = visible ? '' : 'none';
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
            selectAllCheckbox.disabled = false;
            const allChecked = visibleRows.every(row => row.querySelector('.storage-checkbox').checked || row.querySelector('.storage-checkbox').disabled);
            const noneChecked = visibleRows.every(row => !row.querySelector('.storage-checkbox').checked);
            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
        }

        updateSelectAllCheckboxState();

        // Speichere die Lagerdaten für die Bau-Funktion
        if (!storageGroups[currentGroupKey]) storageGroups[currentGroupKey] = [];

        group.forEach(({ building }) => {
            const baseKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            const options = manualStorageRooms[baseKey];
            if (!options) return;

            const current = new Set((building.storage_upgrades || []).map(u => Object.keys(u)[0]));

            const missingExtensions = [];

            options.forEach(opt => {
                const id = opt.id;
                if (current.has(id)) return;

                const storageKey = `${baseKey}_storage_${opt.name.replace(/\s+/g, '_')}`;
                if (getExtensionSettings()[storageKey] === false) return;

                missingExtensions.push({
                    id,
                    cost: opt.cost,
                    coins: opt.coins,
                    isStorage: true // <- Markiere es als Lager
                });
            });

            if (missingExtensions.length > 0) {
                storageGroups[currentGroupKey].push({ building, missingExtensions });
            }
        });

        return table;
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
            const isBuilt = row.classList.contains("built"); // Prüft, ob bereits gebaut

            if (isBuilt) {
                row.style.display = "none"; // Gebaute Zeilen bleiben unsichtbar
            } else if (leitstelle.includes(searchTerm) || wachenName.includes(searchTerm) || erweiterung.includes(searchTerm)) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    }

    // Funktion zur Unterscheidung der Erweiterungswarteschlange zwischen Premium und Nicht Premium User
    function isExtensionLimitReached(building, extensionId) {
        const fireStationSmallAlwaysAllowed = [1, 2, 10, 11];
        const fireStationSmallLimited = [0, 6, 8, 13, 14, 16, 18, 19, 25];

        const policeStationSmallAlwaysAllowed = [0, 1];
        const policeStationSmallLimited = [10, 11, 12, 13];

        const thwAllExtensions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]; // Alle THW-Erweiterungen
        const bpolAllExtensions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Alle BPol-Erweiterungen
        const polSonderEinheitAllExtensions = [0, 1, 2, 3, 4]; // Alle PolSondereinheit-Erweiterungen
        const KhAllExtensions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // Alle Krankenhaus-Erweiterungen

        // Falls Premium aktiv ist, gibt es keine Einschränkungen für THW, B-Pol, Schulen und Pol-Sondereinheit
        if (typeof !user_premium !== "undefined" && user_premium) {
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
            const thwRestrictedUntilFirstTwo = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13];
            const thwAlwaysAllowed = [11];

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

    // Schließen-Button-Funktionalität
    document.getElementById('close-extension-helper').addEventListener('click', () => {
        const lightbox = document.getElementById('extension-lightbox');
        lightbox.style.display = 'none';

        // Setze die globalen Variablen zurück
        buildingGroups = {};
        buildingsData = [];
    });

    // Initial den Button hinzufügen
    addMenuButton();

    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Anfang des Bereichs für den Bau einer Erweiterung in einem Gebäude

    // Funktion zum Bau einer Erweiterung, eines Lagerraumes
    async function buildExtension(building, extensionId, currency, amount, row) {
        const userInfo = await getUserCredits();

        // Die Erweiterung wird direkt gebaut
        const csrfToken = getCSRFToken();
        const buildUrl = `/buildings/${building.id}/extension/${currency}/${extensionId}`;

        await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: buildUrl,
                headers: {
                    'X-CSRF-Token': csrfToken,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                onload: function(response) {
                    // Überprüfen, ob die Zeile existiert
                    if (row) {
                        // Wenn es sich um eine Polizei-Kleinwache handelt und Erweiterungen 10, 11, 12 oder 13 betroffen sind
                        if (building.building_type === 6 && building.small_building && [10, 11, 12, 13].includes(extensionId)) {
                            // Alle Erweiterungen der Polizei-Kleinwache ausblenden, die noch nicht gebaut wurden
                            const allRows = document.querySelectorAll(
                                `.row-${building.id}-10,
                         .row-${building.id}-11,
                         .row-${building.id}-12,
                         .row-${building.id}-13`
                            );
                            allRows.forEach(otherRow => {
                                if (otherRow !== row) {
                                    otherRow.style.display = 'none'; // Alle anderen Zeilen ausblenden
                                }
                            });
                        }

                        // Wenn es sich um eine Feuerwehr-Kleinwache handelt und Erweiterungen 0, 3, 4, 5, 6, 7, 8, 9 oder 12 betroffen sind
                        if (building.building_type === 0 && building.small_building && [0, 6, 8, 13, 14, 16, 18, 19, 25].includes(extensionId)) {
                            // Alle Erweiterungen der Feuerwehr-Kleinwache ausblenden, die noch nicht gebaut wurden
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
                                    otherRow.style.display = 'none'; // Alle anderen Zeilen ausblenden
                                }
                            });
                        }

                        if (row) {
                            row.classList.add("built"); // Markiert die Zeile als gebaut
                            row.style.display = "none"; // Blendet sie weiterhin aus
                        }

                        row.style.display = 'none'; // Die ausgebaute Zeile wird ausgeblendet
                    }

                    resolve(response);
                },
                onerror: function(error) {
                    console.error(`Fehler beim Bauen der Erweiterung in Gebäude ${building.id}.`, error);
                    reject(error);
                }
            });
        });
    }

    async function buildStorage(building, storageId, currency, cost, row) {
        const csrfToken = getCSRFToken();
        const buildUrl = `https://www.leitstellenspiel.de/buildings/${building.id}/storage_upgrade/${currency}/${storageId}?redirect_building_id=${building.id}`;

        await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: buildUrl,
                headers: {
                    'X-CSRF-Token': csrfToken,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: '', // kein body nötig
                withCredentials: true, // <-- wichtig
                onload: function(response) {
                    if (response.status >= 200 && response.status < 400) {
                        if (row) {
                            row.classList.add("built");
                            row.style.display = "none";
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

    fetchBuildingsAndRender();

    // Ende des Bereichs für den Bau * einer Erweiterung * in einem Gebäude

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
                if ([10, 11, 12, 13].includes(extensionId)) {
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

    // Funktion zum Bau der ausgewählten Erweiterungen
    async function buildSelectedExtensions() {
        const selectedExtensions = document.querySelectorAll('.extension-checkbox:checked');
        const selectedStorages = document.querySelectorAll('.storage-checkbox:checked');

        const selectedExtensionsByBuilding = {};
        const selectedStoragesByBuilding = {};

        // Erweiterungen erfassen
        selectedExtensions.forEach(checkbox => {
            const buildingId = checkbox.dataset.buildingId;
            const extensionId = checkbox.dataset.extensionId;

            if (!selectedExtensionsByBuilding[buildingId]) {
                selectedExtensionsByBuilding[buildingId] = [];
            }
            selectedExtensionsByBuilding[buildingId].push(parseInt(extensionId, 10));
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

        // Regeln für Kleinwachen prüfen
        for (const [buildingId, extensions] of Object.entries(selectedExtensionsByBuilding)) {
            const building = buildingsData.find(b => String(b.id) === String(buildingId));
            if (!building) continue;

            if (building.small_building) {
                if (building.building_type === 0) {
                    const invalid = [0, 6, 8, 13, 14, 16, 18, 19, 25];
                    if (extensions.filter(id => invalid.includes(id)).length > 1) {
                        showError("Information zu deinem Bauvorhaben:\n\nDiese Erweiterungen für die Feuerwehr-Kleinwache können nicht zusammen gebaut werden.\n\nBitte wähle nur eine Erweiterung aus.");
                        updateBuildSelectedButton();
                        return;
                    }
                }

                if (building.building_type === 6) {
                    const invalid = [10, 11, 12, 13];
                    if (extensions.filter(id => invalid.includes(id)).length > 1) {
                        showError("Information zu deinem Bauvorhaben:\n\nDiese Erweiterungen für die Polizei-Kleinwache können nicht zusammen gebaut werden.\n\nBitte wähle nur eine Erweiterung aus.");
                        updateBuildSelectedButton();
                        return;
                    }
                }
            }
        }

        // Prüfung Lagerreihenfolge
        for (const [buildingId, selectedStorageTypes] of Object.entries(selectedStoragesByBuilding)) {
            const building = buildingsData.find(b => String(b.id) === String(buildingId));
            if (!building) continue;

            const buildingTypeKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            const builtStorages = building.extensions || [];

            if (!canBuildAllSelectedInOrder(selectedStorageTypes, buildingTypeKey, builtStorages)) {
                showError(`Bitte beachte: Die Lagerräume müssen in der vorgegebenen Reihenfolge für das Gebäude ${getBuildingCaption(buildingId)} gebaut werden.\n\nReihenfolge:\n1. Lagerraum\n2. 1te zusätzlicher Lagerraum\n3. 2te zusätzlicher Lagerraum\n4. 3te zusätzlicher Lagerraum\n5. 4te zusätzlicher Lagerraum\n6. 5te zusätzlicher Lagerraum.\n7. 6te zusätzlicher Lagerraum\n8. 7te zusätzlicher Lagerraum'
`);
                updateBuildSelectedButton();
                return;
            }
        }

        const userInfo = await getUserCredits();
        if (!user_premium) {
            for (const [buildingId, extensions] of Object.entries(selectedExtensionsByBuilding)) {
                if (extensions.length > 2) {
                    alert(`Zu viele Erweiterungen für Gebäude ${getBuildingCaption(buildingId)} ausgewählt.\n\nOhne Premium-Account sind maximal 2 Ausbauten möglich.`);
                    updateBuildSelectedButton();
                    return;
                }
            }
        }

        let totalCredits = 0;
        let totalCoins = 0;

        // Erweiterungen berechnen
        for (const [buildingId, extensions] of Object.entries(selectedExtensionsByBuilding)) {
            extensions.forEach(extensionId => {
                const row = document.querySelector(`.row-${buildingId}-${extensionId}`);
                if (!row) return;

                const creditElement = row.querySelector('.credit-button');
                const coinElement = row.querySelector('.coins-button');

                if (creditElement) {
                    totalCredits += parseInt(creditElement.innerText.replace(/\D/g, '') || '0', 10);
                }
                if (coinElement) {
                    totalCoins += parseInt(coinElement.innerText.replace(/\D/g, '') || '0', 10);
                }
            });
        }

        // Lager berechnen
        for (const [buildingId, storageTypes] of Object.entries(selectedStoragesByBuilding)) {
            const building = buildingsData.find(b => String(b.id) === String(buildingId));
            if (!building) continue;

            const buildingTypeKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            const storageDefs = manualStorageRooms[buildingTypeKey];
            if (!storageDefs) {
                console.warn(`⚠️ Keine Lagerdefinitionen für Gebäudetyp ${buildingTypeKey}`);
                continue;
            }

            storageTypes.forEach(storageType => {
                const storageDef = storageDefs.find(s => s.id === storageType);
                if (!storageDef) {
                    console.warn(`⚠️ Keine Lagerdefinition für Typ "${storageType}" in ${buildingTypeKey}`);
                    return;
                }

                totalCredits += storageDef.cost || 0;
                totalCoins += storageDef.coins || 0;
            });
        }

        // Zeige Coin/Credit-Auswahl inkl. Lager
        showCurrencySelection(selectedExtensionsByBuilding, userInfo, selectedStoragesByBuilding);

        // Checkboxen zurücksetzen
        setTimeout(() => {
            [...selectedExtensions, ...selectedStorages].forEach(checkbox => {
                checkbox.checked = false;
            });

            document.querySelectorAll('.select-all-checkbox, .select-all-checkbox-lager').forEach(checkbox => {
                checkbox.checked = false;
                checkbox.dispatchEvent(new Event('change'));
            });

            updateBuildSelectedButton();
        }, 100);
    }

    // Funktion zur Auswahl der Zahlmöglichkeit sowie Prüfung der ausgewählten Erweiterungen
    async function showCurrencySelection(selectedExtensionsByBuilding, userInfo, selectedStoragesByBuilding) {
        const userSettings = await getUserMode();
        const isDarkMode = userSettings && (userSettings.design_mode === 1 || userSettings.design_mode === 4);

        let totalCredits = 0;
        let totalCoins = 0;

        const extensionRows = [];
        const storageRows = [];

        // Erweiterungskosten sammeln
        for (const [buildingId, extensions] of Object.entries(selectedExtensionsByBuilding)) {
            for (const extensionId of extensions) {
                const row = document.querySelector(`.row-${buildingId}-${extensionId}`);
                if (row) {
                    const extensionCost = parseInt(row.querySelector('.credit-button')?.innerText.replace(/\D/g, '') || '0', 10);
                    const extensionCoins = parseInt(row.querySelector('.coins-button')?.innerText.replace(/\D/g, '') || '0', 10);
                    totalCredits += extensionCost;
                    totalCoins += extensionCoins;
                    extensionRows.push({ buildingId, extensionId, extensionCost, extensionCoins, row });
                }
            }
        }

        // Lagerkosten sammeln
        for (const [buildingId, storageTypes] of Object.entries(selectedStoragesByBuilding)) {
            for (const storageType of storageTypes) {
                const row = document.querySelector(`.storage-row-${buildingId}-${storageType}`);
                if (row) {
                    const storageCost = parseInt(row.querySelector('.credit-button')?.innerText.replace(/\D/g, '') || '0', 10);
                    const storageCoins = parseInt(row.querySelector('.coins-button')?.innerText.replace(/\D/g, '') || '0', 10);
                    totalCredits += storageCost;
                    totalCoins += storageCoins;
                    storageRows.push({ buildingId, storageType, storageCost, storageCoins, row });
                }
            }
        }

        const fehlendeCredits = Math.max(0, totalCredits - userInfo.credits);
        const fehlendeCoins = Math.max(0, totalCoins - userInfo.coins);

        if (userInfo.credits < totalCredits && userInfo.coins < totalCoins) {
            alert(`Du hast nicht genug Ressourcen!\n\n- Fehlende Credits: ${formatNumber(fehlendeCredits)}\n- Fehlende Coins: ${formatNumber(fehlendeCoins)}`);
            return;
        }

        const selectionDiv = document.createElement('div');
        selectionDiv.className = 'currency-selection';
        selectionDiv.style.position = 'fixed';
        selectionDiv.style.top = '50%';
        selectionDiv.style.left = '50%';
        selectionDiv.style.transform = 'translate(-50%, -50%)';
        selectionDiv.style.zIndex = '10001';
        selectionDiv.style.background = isDarkMode ? '#333' : '#fff';
        selectionDiv.style.color = isDarkMode ? '#fff' : '#000';
        selectionDiv.style.border = `1px solid ${isDarkMode ? '#444' : '#ccc'}`;
        selectionDiv.style.padding = '20px';
        selectionDiv.style.borderRadius = '8px';
        selectionDiv.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
        selectionDiv.style.minWidth = '320px';
        selectionDiv.style.textAlign = 'center';

        const totalText = document.createElement('p');
        totalText.innerHTML = `Wähle zwischen <b style="color:green">Credits (grün)</b> oder <b style="color:red">Coins (rot)</b><br><br>Info:<br>Sollte eine Währung <b>nicht</b> ausreichend vorhanden sein,<br>kannst Du diese nicht auswählen`;
        selectionDiv.appendChild(totalText);

        function showProgress() {
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
            container.style.zIndex = '10002';
            container.style.background = isDarkMode ? '#333' : '#fff';
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
            progressText.textContent = '0 von 0 Erweiterungen gebaut';

            container.appendChild(progressBar);
            container.appendChild(progressText);

            document.body.appendChild(container);

            return {
                container,
                update: (done, total) => {
                    progressFill.style.width = `${(done / total) * 100}%`;
                    progressText.textContent = `${done} von ${total} Erweiterungen gebaut`;
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
            const totalTasks = extensionRows.length + storageRows.length;
            let done = 0;

            for (const ext of extensionRows) {
                await buildExtension({ id: ext.buildingId }, ext.extensionId, 'credits', ext.extensionCost, ext.row);
                done++;
                progress.update(done, totalTasks);
            }

            for (const store of storageRows) {
                await buildStorage({ id: store.buildingId }, store.storageType, 'credits', store.storageCost, store.row);
                done++;
                progress.update(done, totalTasks);
            }

            progress.close();
            document.body.removeChild(selectionDiv);
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
            const totalTasks = extensionRows.length + storageRows.length;
            let done = 0;

            for (const ext of extensionRows) {
                await buildExtension({ id: ext.buildingId }, ext.extensionId, 'coins', ext.extensionCoins, ext.row);
                done++;
                progress.update(done, totalTasks);
            }

            for (const store of storageRows) {
                await buildStorage({ id: store.buildingId }, store.storageType, 'coins', store.storageCoins, store.row);
                done++;
                progress.update(done, totalTasks);
            }

            progress.close();
            document.body.removeChild(selectionDiv);
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

    // Funktion um den "Ausgewählte Erweiterungen bauen"-Button zu aktivieren
    function updateBuildSelectedButton() {
        const buttonContainers = document.querySelectorAll('.button-container');

        buttonContainers.forEach(container => {
            const buildSelectedButton = container.querySelector('.build-selected-button');
            if (!buildSelectedButton) return;

            // Nächstes .spoiler-content und .lager-wrapper-Element im DOM
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

    // Funktiom um eine Fehlermeldung auszugeben
    function showError(message) {
        // Verstecke den Währungscontainer, falls er existiert
        const currencyContainer = document.getElementById('currency-container');
        if (currencyContainer) {
            currencyContainer.style.display = 'none';
        }

        // Fehlercontainer abrufen
        const errorMessageDiv = document.getElementById('error-message');

        if (errorMessageDiv) {
            errorMessageDiv.textContent = message; // Fehlermeldung setzen
            errorMessageDiv.style.display = 'block'; // Sichtbar machen
        } else {
            alert(message); // Falls das Element nicht existiert, nutze ein Alert
            updateBuildSelectedButton();

        }
    }

    // Event-Listener für Checkbox-Änderungen hinzufügen
    document.addEventListener('change', (event) => {
        if (event.target.classList.contains('extension-checkbox') || event.target.classList.contains('storage-checkbox')) {
            updateBuildSelectedButton();
        }
    });

    // Ende der Funktion für * Bau von ausgewählten Erweiterungen *

    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Anfang der Funktion * Alle Erweiterungen * in einem Gebäude bauen

    // Funktion zur Auswahl der Währung und Prüfung der Credit/Coins vorhandenheit
    async function showCurrencySelectionForAll(groupKey) {
        const userSettings = await getUserMode();
        const isDarkMode = userSettings && (userSettings.design_mode === 1 || userSettings.design_mode === 4);

        const wachenGroup = buildingGroups[groupKey] || [];
        const lagerGroup = storageGroups[groupKey] || [];
        const combinedGroup = [...wachenGroup, ...lagerGroup];

        if (combinedGroup.length === 0) {
            console.error(`Keine Erweiterungen für Gruppen-Key: ${groupKey}`);
            return;
        }

        let totalCredits = 0;
        let totalCoins = 0;

        combinedGroup.forEach(({ missingExtensions }) => {
            missingExtensions.forEach(extension => {
                totalCredits += extension.cost;
                totalCoins += extension.coins;
            });
        });

        const userInfo = await getUserCredits();
        const fehlendeCredits = Math.max(0, totalCredits - userInfo.credits);
        const fehlendeCoins = Math.max(0, totalCoins - userInfo.coins);

        if (userInfo.credits < totalCredits && userInfo.coins < totalCoins) {
            alert(`Du hast nicht genug Ressourcen!\n\n- Fehlende Credits: ${formatNumber(fehlendeCredits)}\n- Fehlende Coins: ${formatNumber(fehlendeCoins)}`);
            return;
        }

        const selectionDiv = document.createElement('div');
        selectionDiv.className = 'currency-selection';
        selectionDiv.style.background = isDarkMode ? '#333' : '#fff';
        selectionDiv.style.color = isDarkMode ? '#fff' : '#000';
        selectionDiv.style.borderColor = isDarkMode ? '#444' : '#ccc';

        const totalText = document.createElement('p');
        totalText.innerHTML = `Wähle zwischen <b>Credits (grün)</b> oder <b>Coins (rot)</b><br><br>Info:<br>Sollte eine Währung <b>nicht</b> ausreichend vorhanden sein,<br>kannst Du diese nicht auswählen`;
        selectionDiv.appendChild(totalText);

        const creditsButton = document.createElement('button');
        creditsButton.className = 'currency-button credits-button';
        creditsButton.textContent = `${formatNumber(totalCredits)} Credits`;
        creditsButton.disabled = userInfo.credits < totalCredits;
        creditsButton.onclick = async () => {
            document.body.removeChild(selectionDiv);
            await buildAllExtensionsWithPause(groupKey, 'credits');
        };

        const coinsButton = document.createElement('button');
        coinsButton.className = 'currency-button coins-button';
        coinsButton.textContent = `${formatNumber(totalCoins)} Coins`;
        coinsButton.disabled = userInfo.coins < totalCoins;
        coinsButton.onclick = async () => {
            document.body.removeChild(selectionDiv);
            await buildAllExtensionsWithPause(groupKey, 'coins');
        };

        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-button';
        cancelButton.textContent = 'Abbrechen';
        cancelButton.onclick = () => {
            document.body.removeChild(selectionDiv);
        };

        selectionDiv.appendChild(creditsButton);
        selectionDiv.appendChild(coinsButton);
        selectionDiv.appendChild(cancelButton);

        document.body.appendChild(selectionDiv);
    }

    // Funktion um die Gesamtkosten zu errechnen
    async function calculateAndBuildAllExtensions(groupKey, currency) {
        const wachenGroup = buildingGroups[groupKey] || [];
        const lagerGroup = storageGroups[groupKey] || [];
        const combinedGroup = [...wachenGroup, ...lagerGroup];

        const totalExtensions = combinedGroup.reduce((sum, { missingExtensions }) => sum + missingExtensions.length, 0);
        const totalCost = combinedGroup.reduce((sum, { missingExtensions }) => {
            return sum + missingExtensions.reduce((extSum, extension) => extSum + extension[currency], 0);
        }, 0);

        try {
            const userInfo = await getUserCredits();
            if ((currency === 'credits' && userInfo.credits < totalCost) || (currency === 'coins' && userInfo.coins < totalCost)) {
                alert(`Nicht genügend ${currency === 'credits' ? 'Credits' : 'Coins'}. Der Bauversuch wird abgebrochen.`);
                return;
            }

            const { progressContainer, progressText, progressFill } = await createProgressBar(totalExtensions);
            let builtCount = 0;

            for (const { building, missingExtensions } of combinedGroup) {
                for (const extension of missingExtensions) {
                    if (!isExtensionLimitReached(building, extension.id)) {
                        const isStorage = extension.isStorage === true;

                        if (isStorage) {
                            await buildStorage(building, extension.id, currency, extension[currency]);
                        } else {
                            await buildExtension(building, extension.id, currency, extension[currency]);
                        }

                        builtCount++;
                        updateProgress(builtCount, totalExtensions, progressText, progressFill);
                    }
                }
            }

            removeProgressBar(progressContainer);

            // Tabelle aktualisieren
            renderMissingExtensions(buildingsData);
        } catch (error) {
            console.error('Fehler beim Abrufen der Credits und Coins:', error);
            alert('Fehler beim Abrufen der Credits und Coins.');
        }
    }

    // Funktion zur Erstellung der Fortschrittsanzeige
    async function createProgressBar(totalExtensions) {
        const userSettings = await getUserMode();
        const isDarkMode = userSettings && (userSettings.design_mode === 1 || userSettings.design_mode === 4);

        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        progressContainer.style.position = 'fixed';
        progressContainer.style.top = '50%';
        progressContainer.style.left = '50%';
        progressContainer.style.transform = 'translate(-50%, -50%)';
        progressContainer.style.padding = '20px';
        progressContainer.style.border = '1px solid #ccc';
        progressContainer.style.borderRadius = '10px';
        progressContainer.style.boxShadow = '0px 0px 10px rgba(0,0,0,0.2)';
        progressContainer.style.width = '300px';
        progressContainer.style.textAlign = 'center';
        progressContainer.style.zIndex = '10002'; // Sicherstellen, dass der Fortschrittsbalken oben bleibt

        // Set background color based on mode
        progressContainer.style.background = isDarkMode ? '#333' : '#fff';
        progressContainer.style.color = isDarkMode ? '#fff' : '#000';

        const progressText = document.createElement('p');
        progressText.textContent = `0 / ${totalExtensions} Erweiterungen gebaut`;
        progressText.style.fontWeight = 'bold'; // Fettschrift für bessere Lesbarkeit
        progressText.style.fontSize = '16px'; // Größere Schrift für bessere Sichtbarkeit

        const progressBar = document.createElement('div');
        progressBar.style.width = '100%';
        progressBar.style.background = isDarkMode ? '#555' : '#ddd';  // Hintergrund für die Progressbar
        progressBar.style.borderRadius = '5px';
        progressBar.style.marginTop = '10px';
        progressBar.style.overflow = 'hidden'; // Hinzugefügt um sicherzustellen, dass der Fortschrittsbalken den Container nicht verlässt

        const progressFill = document.createElement('div');
        progressFill.style.width = '0%';
        progressFill.style.height = '20px';
        progressFill.style.background = '#4caf50';
        progressFill.style.borderRadius = '5px';

        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressText);
        progressContainer.appendChild(progressBar);
        document.body.appendChild(progressContainer);

        return { progressContainer, progressText, progressFill };
    }

    // Funktion zur Aktualisierung des Fortschritts
    function updateProgress(builtCount, totalExtensions, progressText, progressFill) {
        progressText.textContent = `${builtCount} / ${totalExtensions} Erweiterungen gebaut`;
        progressFill.style.width = Math.min(100, (builtCount / totalExtensions) * 100) + '%'; // Math.min hinzugefügt, um sicherzustellen, dass die Breite nicht 100% überschreitet
    }

    // Funktion zum Entfernen der Fortschrittsanzeige mit 500ms Verzögerung
    function removeProgressBar(progressContainer) {
        setTimeout(() => {
            document.body.removeChild(progressContainer);
        }, 500); // 500ms Pause bevor die Fortschrittsanzeige entfernt wird
    }

    async function buildAllExtensionsWithPause(groupKey, currency) {
        const wachenGroup = buildingGroups[groupKey] || [];
        const lagerGroup = storageGroups[groupKey] || [];
        const combinedGroup = [...wachenGroup, ...lagerGroup];

        let totalExtensions = combinedGroup.reduce((sum, { missingExtensions }) => sum + missingExtensions.length, 0);
        let builtCount = 0;

        const { progressContainer, progressText, progressFill } = await createProgressBar(totalExtensions);

        for (const { building, missingExtensions } of combinedGroup) {
            for (const extension of missingExtensions) {
                if (!isExtensionLimitReached(building, extension.id)) {
                    const isStorage = extension.isStorage === true;

                    const row = document.querySelector(
                        isStorage
                        ? `.storage-row-${building.id}-${extension.id}`
                        : `.row-${building.id}-${extension.id}`
                    );

                    if (isStorage) {
                        await buildStorage(building, extension.id, currency, extension[currency], row);
                    } else {
                        await buildExtensionWithPause(building, extension.id, currency, extension[currency], row);
                    }

                    await new Promise(resolve => setTimeout(resolve, 500));
                    builtCount++;
                    updateProgress(builtCount, totalExtensions, progressText, progressFill);
                }
            }
        }

        removeProgressBar(progressContainer);
    }

})();
