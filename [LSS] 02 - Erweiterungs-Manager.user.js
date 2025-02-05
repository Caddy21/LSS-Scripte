// ==UserScript==
// @name         [LSS] Erweiterungs-Manager
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Listet Wachen auf, bei denen bestimmte Erweiterungen fehlen und ermöglicht das Hinzufügen dieser Erweiterungen.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        GM_xmlhttpRequest
// @connect      api.lss-manager.de
// @connect      leitstellenspiel.de
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @run-at       document-end
// ==/UserScript==

// ToDo-Liste

// Prüfen ob ein limitierter Ausbau gebaut werden kann
// Lagerausbau hinzufügen


(function() {
    'use strict';
    // Manuelle Konfiguration der Erweiterungen

    // Hier könnt Ihr auswählen welche Erweiterung in der Tabelle angezeigt werden soll, dafür die nicht benötigten einfach mit // ausklammern.
    const manualExtensions = {
        '0_normal': [ // Feuerwache (normal)
            { id: 0, name: 'Rettungsdienst', cost: 100000, coins: 20 },
            { id: 1, name: 'AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 2, name: 'AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 3, name: 'AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 4, name: 'AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 5, name: 'AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 6, name: 'Wasserrettung', cost: 400000, coins: 25 },
            { id: 7, name: 'AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 8, name: 'Flughafenfeuerwehr', cost: 300000, coins: 25 },
            { id: 9, name: 'Großwache', cost: 1000000, coins: 50 },
            { id: 10, name: 'AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 11, name: 'AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 12, name: 'AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 13, name: 'Werkfeuerwehr', cost: 100000, coins: 20 },
            { id: 14, name: 'Netzersatzanlage 50', cost: 100000, coins: 20 },
            { id: 15, name: 'Netzersatzanlage 200', cost: 100000, coins: 20 },
            { id: 16, name: 'Großlüfter', cost: 75000, coins: 25 },
            { id: 17, name: 'AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 18, name: 'Drohneneinheit', cost: 150000, coins: 25 },
            { id: 19, name: 'Verpflegungsdienst', cost: 200000, coins: 25 },
            { id: 20, name: 'Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 21, name: 'Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 22, name: 'Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 23, name: 'Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 24, name: 'Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 25, name: 'Bahnrettung', cost: 125000, coins: 25 },
        ],

        '1_normal': [ // Feuerwehrschule
            { id: 0, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
            { id: 1, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
            { id: 2, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 },
        ],

        '2_normal': [ // Rettungswache
            { id: 0, name: 'Großwache', cost: 1000000, coins: 50 }
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
            { id: 0, name: 'Windenrettung', cost: 200000, coins: 15 }
        ],

        '6_normal': [ // Polizeiwache
            { id: 0, name: 'Zelle', cost: 25000, coins: 5 },
            { id: 1, name: 'Zelle', cost: 25000, coins: 5 },
            { id: 2, name: 'Zelle', cost: 25000, coins: 5 },
            { id: 3, name: 'Zelle', cost: 25000, coins: 5 },
            { id: 4, name: 'Zelle', cost: 25000, coins: 5 },
            { id: 5, name: 'Zelle', cost: 25000, coins: 5 },
            { id: 6, name: 'Zelle', cost: 25000, coins: 5 },
            { id: 7, name: 'Zelle', cost: 25000, coins: 5 },
            { id: 8, name: 'Zelle', cost: 25000, coins: 5 },
            { id: 9, name: 'Zelle', cost: 25000, coins: 5 },
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
            { id: 2, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 }
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
            { id: 10, name: 'Lautsprecherkraftwagen', cost: 100000, coins: 10}
        ],

        '12_normal': [ // SEG
            { id: 0, name: 'Führung', cost: 25000, coins: 5 },
            { id: 1, name: 'Sanitätsdienst', cost: 25500, coins: 5 },
            { id: 2, name: 'Wasserrettung', cost: 500000, coins: 25 },
            { id: 3, name: 'Rettungshundestaffel', cost: 350000, coins: 25 },
            { id: 4, name: 'SEG-Drohne', cost: 50000, coins: 15 },
            { id: 5, name: 'Betreuungs- und Verpflegungsdienst', cost: 200000, coins: 25 }
        ],

        '13_normal': [ // Polizeihubschrauberstation
            { id: 0, name: 'Außenlastbehälter', cost: 200000, coins: 15 },
            { id: 1, name: 'Windenrettung', cost: 200000, coins: 15 }
        ],

        '17_normal': [ // Polizeisondereinheit
            { id: 0, name: 'SEK: 1. Zug', cost: 100000, coins: 10 },
            { id: 1, name: 'SEK: 2. Zug', cost: 100000, coins: 10 },
            { id: 2, name: 'MEK: 1. Zug', cost: 100000, coins: 10 },
            { id: 3, name: 'MEK: 2. Zug', cost: 100000, coins: 10 },
            { id: 4, name: 'Diensthundestaffel', cost: 100000, coins: 10 }
        ],
        '0_small': [ // Feuerwehr (Kleinwache)
            { id: 0, name: 'Rettungsdienst', cost: 100000, coins: 20 },
            { id: 1, name: 'AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 2, name: 'AB-Stellplatz', cost: 100000, coins: 20 },
            { id: 3, name: 'Wasserrettung', cost: 400000, coins: 25 },
            { id: 4, name: 'Flughafenfeuerwehr', cost: 300000, coins: 25 },
            { id: 5, name: 'Werkfeuerwehr', cost: 100000, coins: 20 },
            { id: 6, name: 'Netzersatzanlage 50', cost: 100000, coins: 20 },
            { id: 7, name: 'Großlüfter', cost: 75000, coins: 25 },
            { id: 8, name: 'Drohneneinheit', cost: 150000, coins: 25 },
            { id: 9, name: 'Verpflegungsdienst', cost: 200000, coins: 25 },
            { id: 10, name: 'Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 11, name: 'Anhänger Stellplatz', cost: 75000, coins: 15 },
            { id: 12, name: 'Bahnrettung', cost: 125000, coins: 25 }
        ],

        '6_small': [ // Polizei (Kleinwache)
            { id: 0, name: 'Zelle', cost: 25000, coins: 5 },
            { id: 1, name: 'Zelle', cost: 25000, coins: 5 },
            //            { id: 10, name: 'Diensthundestaffel', cost: 100000, coins: 10 },
            //            { id: 11, name: 'Kriminalpolizei', cost: 100000, coins: 20 },
            //            { id: 12, name: 'Dienstgruppenleitung', cost: 200000, coins: 25 },
            //            { id: 13, name: 'Motorradstaffel', cost: 75000, coins: 15 },
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
            { id: 2, name: 'Weiterer Klassenraum', cost: 400000, coins: 40 }
        ],

    };

    // Ab hier nichts mehr ändern! (Es sei denn Ihr wisst was Ihr tut)

    // Stile für das Interface
    const styles = `
   #extension-lightbox {
       position: fixed;
       top: 0;
       left: 0;
       width: 100%;
       height: 100%;
       background: rgba(0, 0, 0, 0.5);
       display: flex;
       justify-content: center;
       align-items: center;
       z-index: 10000;
   }
   #extension-lightbox #extension-lightbox-content {
       background: var(--background-color, white);
       color: var(--text-color, black);
       border: 1px solid var(--border-color, black);
       padding: 20px;
       width: 80%;
       max-width: 1200px;
       max-height: 90vh;
       overflow-y: auto;
       position: relative;
   }
   #extension-lightbox #extension-lightbox-content.dark {
       background: #2c2f33;
       color: #ffffff;
       border-color: #23272a;
   }
   #extension-lightbox #extension-lightbox-content.light {
       background: #ffffff;
       color: #000000;
       border-color: #dddddd;
   }
   #extension-lightbox #close-extension-helper {
       position: absolute;
       top: 10px;
       right: 10px;
       background: red;
       color: white;
       border: none;
       padding: 5px;
       cursor: pointer;
   }
   #extension-lightbox table {
       width: 100%;
       border-collapse: collapse;
       margin-top: 10px;
       font-size: 16px;
   }
   #extension-lightbox table th,
   #extension-lightbox table td {
       background-color: var(--background-color, #f2f2f2);
       color: var(--text-color, #000);
       border: 1px solid var(--border-color, black);
       padding: 8px;
       text-align: left;
   }
   #extension-lightbox table th {
       font-weight: bold;
   }
   #extension-lightbox .extension-button {
       background-color: var(--button-background-color, #007bff);
       color: var(--button-text-color, #ffffff);
       border: none;
       padding: 5px 10px;
       cursor: pointer;
       border-radius: 4px;
   }
   #extension-lightbox .extension-button:disabled {
       background-color: gray;
       cursor: not-allowed;
   }
   #extension-lightbox .extension-button:hover:enabled {
       background-color: var(--button-hover-background-color, #0056b3);
   }
   #extension-lightbox .build-all-button {
       background-color: var(--button-background-color, #ff0000);
       color: var(--button-text-color, #ffffff);
       border: none;
       padding: 5px 10px;
       cursor: pointer;
       border-radius: 4px;
       margin-top: 10px;
   }
   #extension-lightbox .build-all-button:disabled {
       background-color: gray;
       cursor: not-allowed;
   }
   #extension-lightbox .build-all-button:hover:enabled {
       background-color: var(--button-hover-background-color, #218838);
   }
   #extension-lightbox .spoiler-button {
       background-color: green;
       color: #ffffff;
       border: none;
       padding: 5px 10px;
       cursor: pointer;
       border-radius: 4px;
       margin-top: 10px;
   }
   #extension-lightbox .spoiler-content {
       display: none;
   }
   .currency-selection {
       position: fixed;
       top: 50%;
       left: 50%;
       transform: translate(-50%, -50%);
       background: white;
       border: 1px solid black;
       padding: 20px;
       z-index: 10001;
       display: flex;
       flex-direction: column;
       gap: 10px;
   }
   .currency-button {
       padding: 10px 20px;
       cursor: pointer;
       border-radius: 4px;
       border: none;
       color: #ffffff;
   }
   .credits-button {
       background-color: #28a745;
   }
   .coins-button {
       background-color: #dc3545;
   }
   .cancel-button {
       background-color: #6c757d;
       color: #ffffff;
       border: none;
       padding: 10px 20px;
       cursor: pointer;
       border-radius: 4px;
   }
   `;

    // Fügt die Stile hinzu
    const styleElement = document.createElement('style');
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);

    // Erstellt das Lightbox-Interface
    const lightbox = document.createElement('div');
    lightbox.id = 'extension-lightbox';
    lightbox.style.display = 'none';
    lightbox.innerHTML = `
        <div id="extension-lightbox-content">
            <button id="close-extension-helper">Schließen</button>
            <h2>Erweiterungshelfer<br><h5>Hier findet Ihr die Wachen wo noch Erweiterungen fehlen.
            <br>
            <br>Über den roten Button könnt Ihr bei allen Wachen gleichzeitig sämtliche Erweiterugen bauen, dies kann je nach Anzahl der Gebäude und fehlenden Erweiterungen ein wenig dauern.
            <br>Wenn Ihr auf den grünen Button klickt öffnet sich eine Tabelle wo Wachen mit fehlender Erweiterung aufgelistet werden. Dort könnt Ihr auch einzelne Ausbauten vornehmen.</h5>
            <div id="extension-list">Lade Daten...</div>
        </div>
    `;
    document.body.appendChild(lightbox);

    const lightboxContent = lightbox.querySelector('#extension-lightbox-content');

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

    // Funktion zur Prüfung von Premium und Hinweis
    function checkPremiumAndShowHint() {
        if (typeof user_premium !== 'undefined') {
            console.log("Die Variable 'user_premium' ist definiert."); // Debugging-Info

            if (!user_premium) {
                console.warn("Der Nutzer hat keinen Premium-Account.");
                alert("Hinweis: Als Nicht-Premium-Nutzer kannst du maximal 2 Ausbauten pro Gebäude starten:\n\n- 1 Ausbau aktiv\n- 1 Ausbau in der Warteschlange\n\nBei Kleinwachen kannst du maximal einen Ausbau haben");
            } else {
                console.log("Der Nutzer hat einen Premium-Account.");
            }
        } else {
            console.error("Die Variable 'user_premium' ist nicht definiert. Bitte prüfe, ob sie korrekt geladen wurde.");
        }
    }

    // Button im Profilmenü hinzufügen
    function addMenuButton() {
        const profileMenu = document.querySelector('#menu_profile + .dropdown-menu');
        if (profileMenu) {
            let menuButton = document.querySelector('#menu_profile + .dropdown-menu #open-extension-helper');
            if (!menuButton) {
                const divider = profileMenu.querySelector('li.divider');
                menuButton = document.createElement('li');
                menuButton.setAttribute('role', 'presentation');
                menuButton.innerHTML = `
                    <a href="#" id="open-extension-helper">
                        <span class="glyphicon glyphicon-wrench"></span>&nbsp;&nbsp; Erweiterungshelfer
                    </a>
            `;
                if (divider) {
                    profileMenu.insertBefore(menuButton, divider);
                } else {
                    profileMenu.appendChild(menuButton);
                }

                menuButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    checkPremiumAndShowHint(); // Hinweis überprüfen und anzeigen
                    fetchBuildingsAndRender(); // API-Daten abrufen, wenn das Script geöffnet wird
                    const lightbox = document.getElementById('extension-lightbox');
                    lightbox.style.display = 'flex';
                });
            }
        } else {
            console.error('Profilmenü (#menu_profile + .dropdown-menu) nicht gefunden. Der Button konnte nicht hinzugefügt werden.');
        }
    }

    // Schließen-Button-Funktionalität
    document.getElementById('close-extension-helper').addEventListener('click', () => {
        const lightbox = document.getElementById('extension-lightbox');
        lightbox.style.display = 'none';
    });

    // Initial den Button hinzufügen
    addMenuButton();

    // Funktion zur Prüfung von limitierten Ausbauten (Kleinwachen)
    function isExtensionLimitReached(building, extensionId) {

        const fireStationSmallAlwaysAllowed = [1, 2, 10, 11];
        const fireStationSmallLimited = [0, 3, 4, 5, 6, 7, 8, 9, 12];

        const policeStationSmallAlwaysAllowed = [0, 1];
        const policeStationSmallLimited = [10, 11, 12, 13];

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

        return false;
    }

    function renderMissingExtensions(buildings) {
        const list = document.getElementById('extension-list');
        list.innerHTML = '';

        buildings.sort((a, b) => {
            if (a.building_type === b.building_type) {
                return a.caption.localeCompare(b.caption);
            }
            return a.building_type - b.building_type;
        });

        const buildingGroups = {};

        buildings.forEach(building => {
            const buildingTypeKey = `${building.building_type}_${building.small_building ? 'small' : 'normal'}`;
            const extensions = manualExtensions[buildingTypeKey];
            if (!extensions) return;

            const existingExtensions = new Set(building.extensions.map(e => e.type_id));
            const missingExtensions = extensions.filter(extension => !existingExtensions.has(extension.id));

            if (missingExtensions.length > 0) {
                if (!buildingGroups[buildingTypeKey]) {
                    buildingGroups[buildingTypeKey] = [];
                }
                buildingGroups[buildingTypeKey].push({ building, missingExtensions });
            }
        });

        const buildingTypeNames = {
            '0_normal': 'Feuerwache (Normal)',
            '0_small': 'Feuerwache (Kleinwache)',
            '1_normal': 'Feuerwehrschule',
            '2_normal': 'Rettungswache',
            '3_normal': 'Rettungsschule',
            '4_normal': 'Krankenhaus',
            '5_normal': 'Rettungshubschrauber-Station',
            '6_normal': 'Polizeiwache',
            '6_small': 'Polizeiwache (Klein)',
            '8_normal': 'Polizeischule',
            '9_normal': 'THW',
            '10_normal': 'THW-Bundesschule',
            '11_normal': 'Bereitschaftspolizei',
            '12_normal': 'SEG',
            '13_normal': 'Polizeihubschrauberstation',
            '17_normal': 'Polizei-Sondereinheiten',
            '24_normal': 'Reiterstaffel',
            '25_normal': 'Bergrettungswache',
            '27_normal': 'Schule für Seefahrt und Seenotrettung',
        };

        Object.keys(buildingGroups).forEach(groupKey => {
            const group = buildingGroups[groupKey];
            const buildingType = buildingTypeNames[groupKey] || 'Unbekannt';

            // Überschrift für den Gebäudetyp
            const buildingHeader = document.createElement('h4');
            buildingHeader.textContent = `Typ: ${buildingType}`;
            list.appendChild(buildingHeader);

            const buildAllButton = document.createElement('button');
            buildAllButton.textContent = 'Erweiterung bei allen Wachen bauen';
            buildAllButton.classList.add('build-all-button');
            buildAllButton.onclick = () => confirmAndBuildAllExtensions(groupKey, group);
            list.appendChild(buildAllButton);

            const spoilerButton = document.createElement('button');
            spoilerButton.textContent = 'Details anzeigen';
            spoilerButton.classList.add('spoiler-button');
            list.appendChild(spoilerButton);

            // Wrapper für Tabelle und Suchleiste
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'spoiler-content';
            contentWrapper.style.display = 'none';

            // Suchleiste (wird erst sichtbar, wenn man auf "Details anzeigen" klickt)
            const searchInput = document.createElement('input');
            searchInput.type = "text";
            searchInput.placeholder = "🔍 Nach Wachennamen oder Erweiterungen suchen...";
            searchInput.style.width = "100%";
            searchInput.style.marginBottom = "10px";
            searchInput.style.padding = "5px";
            searchInput.style.fontSize = "14px";
            searchInput.style.display = 'none'; // Anfangs versteckt

            // Event-Listener für den Spoiler-Button
            spoilerButton.addEventListener('click', () => {
                const isHidden = contentWrapper.style.display === 'none';
                contentWrapper.style.display = isHidden ? 'block' : 'none';
                searchInput.style.display = isHidden ? 'block' : 'none'; // Suchleiste ein-/ausblenden
                spoilerButton.textContent = isHidden ? 'Details ausblenden' : 'Details anzeigen';
            });

            // Tabelle erstellen
            const table = document.createElement('table');
            table.innerHTML = `
            <thead>
                <tr>
                    <th>Wache</th>
                    <th>Fehlende Erweiterung</th>
                    <th>Credits</th>
                    <th>Coins</th>
                    <th>Aktion</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
            const tbody = table.querySelector('tbody');

            group.forEach(({ building, missingExtensions }) => {
                missingExtensions.forEach(extension => {
                    const row = document.createElement('tr');

                    const nameCell = document.createElement('td');
                    nameCell.textContent = building.caption;
                    row.appendChild(nameCell);

                    const extensionCell = document.createElement('td');
                    extensionCell.textContent = extension.name;
                    row.appendChild(extensionCell);

                    const costCell = document.createElement('td');
                    costCell.textContent = `${formatNumber(extension.cost)} Credits`;
                    row.appendChild(costCell);

                    const coinsCell = document.createElement('td');
                    coinsCell.textContent = `${extension.coins} Coins`;
                    row.appendChild(coinsCell);

                    const actionCell = document.createElement('td');
                    const buildButton = document.createElement('button');
                    buildButton.textContent = 'Bauen';
                    buildButton.classList.add('extension-button');
                    buildButton.disabled = isExtensionLimitReached(building, extension.id) || !missingExtensions.includes(extension);
                    buildButton.onclick = () => {
                        if (!buildButton.disabled) {
                            showCurrencySelection(building.id, extension.id, extension.cost, extension.coins);
                        }
                    };
                    actionCell.appendChild(buildButton);
                    row.appendChild(actionCell);

                    tbody.appendChild(row);
                });
            });

            // Elemente in den Content-Wrapper packen
            contentWrapper.appendChild(searchInput);
            contentWrapper.appendChild(table);

            // Alles in die Liste setzen
            list.appendChild(contentWrapper);

            // Event-Listener für die Suchleiste
            searchInput.addEventListener("input", function() {
                const searchTerm = searchInput.value.toLowerCase();
                filterTable(tbody, searchTerm);
            });
        });
    }

    // Funktion zur Filterung der Tabelle
    function filterTable(tbody, searchTerm) {
        const rows = tbody.querySelectorAll("tr");

        rows.forEach(row => {
            const wachenName = row.cells[0]?.textContent.toLowerCase() || "";
            const erweiterung = row.cells[1]?.textContent.toLowerCase() || "";

            if (wachenName.includes(searchTerm) || erweiterung.includes(searchTerm)) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    }

    // Funktion, um die Auswahl der Zahlungsmethode anzuzeigen
    function showCurrencySelection(buildingId, extensionId, cost, coins) {
        const selectionDiv = document.createElement('div');
        selectionDiv.className = 'currency-selection';

        const creditsButton = document.createElement('button');
        creditsButton.className = 'currency-button credits-button';
        creditsButton.textContent = `Credits: ${formatNumber(cost)}`;
        creditsButton.onclick = () => {
            confirmAndBuildExtension(buildingId, extensionId, cost, 'credits');
            document.body.removeChild(selectionDiv);
        };

        const coinsButton = document.createElement('button');
        coinsButton.className = 'currency-button coins-button';
        coinsButton.textContent = `Coins: ${coins}`;
        coinsButton.onclick = () => {
            confirmAndBuildExtension(buildingId, extensionId, coins);
            document.body.removeChild(selectionDiv);
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

    // Funktion um die aktuelle Credits und Coins des USERs abzurufen
    async function getUserCredits() {

        try {
            const response = await fetch('https://www.leitstellenspiel.de/api/userinfo');
            if (!response.ok) {
                throw new Error('Fehler beim Abrufen der Credits und Coins');
            }
            const data = await response.json();
            console.log('Benutzer Credits und Coins abgerufen:', data);
            return {
                credits: data.credits_user_current,
                coins: data.coins_user_current
            };
        } catch (error) {
            console.error('Fehler beim Abrufen der Credits und Coins:', error);
            throw error;
        }
    }

    // Funktion zum Abrufen der Gebäudedaten
    let buildingsData = []; // Globale Variable, um die abgerufenen Gebäudedaten zu speichern

    function fetchBuildingsAndRender() {

        fetch('https://www.leitstellenspiel.de/api/buildings')
            .then(response => {
            if (!response.ok) {
                throw new Error('Fehler beim Abrufen der Daten');
            }
            return response.json();
        })
            .then(data => {
            console.log('Abgerufene Gebäudedaten:', data); // Protokolliere die abgerufenen Daten
            buildingsData = data; // Speichern der Gebäudedaten in einer globalen Variablen
            renderMissingExtensions(data); // Weiterverarbeiten der abgerufenen Daten
        })
            .catch(error => {
            console.error('Es ist ein Fehler aufgetreten:', error);
            const list = document.getElementById('extension-list');
            list.innerHTML = 'Fehler beim Laden der Gebäudedaten.';
        });
    }

    // Funktion, um den Namen eines Gebäudes anhand der ID zu bekommen
    function getBuildingCaption(buildingId) {

        console.log('Übergebene buildingId:', buildingId);  // Überprüfen, welche ID übergeben wird
        const building = buildingsData.find(b => String(b.id) === String(buildingId));
        if (building) {
            console.log('Gefundenes Gebäude:', building);  // Protokolliere das gefundene Gebäude
            return building.caption; // Direkt den Gebäudennamen zurückgeben
        }
        console.log('Gebäude nicht gefunden. ID:', buildingId); // Wenn das Gebäude nicht gefunden wird
        return 'Unbekanntes Gebäude';
    }

    // Funktion, um eine Erweiterung in einem Gebäude zu bauen
    async function confirmAndBuildExtension(buildingId, extensionId, amount, currency) {
        try {
            const userInfo = await getUserCredits();
            const currencyText = currency === 'credits' ? 'Credits' : 'Coins';
            console.log(`Benutzer hat ${userInfo.credits} Credits und ${userInfo.coins} Coins`);

            if ((currency === 'credits' && userInfo.credits < amount) || (currency === 'coins' && userInfo.coins < amount)) {
                alert(`Nicht genügend ${currencyText}.`);
                console.log(`Nicht genügend ${currencyText}.`);
                return;
            }

            console.log('Übergebene buildingId:', buildingId);  // Ausgabe der übergebenen buildingId
            // Hier die Konsolenausgabe hinzufügen, um sicherzustellen, dass buildingsData vorhanden ist
            console.log('Aktuelle Gebäudedaten:', buildingsData);
            if (confirm(`Möchten Sie wirklich ${formatNumber(amount)} ${currencyText} für diese Erweiterung ausgeben?`)) {

                const buildingCaption = getBuildingCaption(buildingId); // Holen des Gebäudenamens
                console.log('Gefundener Gebäudename:', buildingCaption); // Ausgabe des abgerufenen Gebäudennamens
                buildExtension(buildingId, extensionId, currency, buildingCaption, true); // Hier setzen wir showPopup auf true für das manuelle Bauen
            }
        } catch (error) {
            console.error('Fehler beim Überprüfen der Credits und Coins:', error);
            alert('Fehler beim Überprüfen der Credits und Coins.');
        }
    }

    function buildExtension(buildingId, extensionId, currency, buildingCaption, progressText, progressFill) {
        const csrfToken = getCSRFToken();
        console.log(`CSRF Token: ${csrfToken}`);
        console.log(`Building Extension: Building ID=${buildingId}, Extension ID=${extensionId}, Currency=${currency}`);

        const buildUrl = `/buildings/${buildingId}/extension/${currency}/${extensionId}`;
        GM_xmlhttpRequest({
            method: 'POST',
            url: buildUrl,
            headers: {
                'X-CSRF-Token': csrfToken,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            onload: function(response) {
                console.log(`Erweiterung in Gebäude ${buildingCaption} gebaut. Response:`, response);

                completedExtensions++;  // Erhöhe den Zähler für den Fortschritt

                // Fortschrittsanzeige aktualisieren, wenn sie existiert
                if (progressText && progressFill) {
                    updateProgress(progressText, progressFill);  // Fortschritt aktualisieren
                }

                fetchBuildingsAndRender(); // Liste nach dem Bauen aktualisieren
            },
            onerror: function(error) {
                console.error(`Fehler beim Bauen der Erweiterung in Gebäude ${buildingCaption}.`, error);

                completedExtensions++;  // Auch bei Fehlern erhöhen wir den Zähler
                if (progressText && progressFill) {
                    updateProgress(progressText, progressFill);  // Fortschritt aktualisieren
                }

                fetchBuildingsAndRender(); // Liste nach dem Bauen aktualisieren
            }
        });
    }

    // Funktion, um eine Erweiterung in allen Gebäuden eines Typs zu bauen nach Bestätigung
    async function confirmAndBuildAllExtensions(buildingType, group) {
        try {
            const userInfo = await getUserCredits();
            const totalCost = group.reduce((sum, { missingExtensions }) => {
                return sum + missingExtensions.reduce((extSum, ext) => extSum + ext.cost, 0);
            }, 0);

            const totalCoins = group.reduce((sum, { missingExtensions }) => {
                return sum + missingExtensions.reduce((extSum, ext) => extSum + ext.coins, 0);
            }, 0);

            const selectionDiv = document.createElement('div');
            selectionDiv.className = 'currency-selection';

            const creditsButton = document.createElement('button');
            creditsButton.className = 'currency-button credits-button';
            creditsButton.textContent = `Credits: ${formatNumber(totalCost)}`;
            creditsButton.onclick = () => {
                if (userInfo.credits < totalCost) {
                    alert(`Nicht genügend Credits. Benötigt: ${formatNumber(totalCost)}, Verfügbar: ${formatNumber(userInfo.credits)}`);
                    return;
                }
                buildAllExtensions(buildingType, group, 'credits');
                document.body.removeChild(selectionDiv);
            };

            const coinsButton = document.createElement('button');
            coinsButton.className = 'currency-button coins-button';
            coinsButton.textContent = `Coins: ${totalCoins}`;
            coinsButton.onclick = () => {
                if (userInfo.coins < totalCoins) {
                    alert(`Nicht genügend Coins. Benötigt: ${totalCoins}, Verfügbar: ${userInfo.coins}`);
                    return;
                }
                buildAllExtensions(buildingType, group, 'coins');
                document.body.removeChild(selectionDiv);
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
        } catch (error) {
            console.error('Fehler beim Überprüfen der Credits und Coins:', error);
            alert('Fehler beim Überprüfen der Credits und Coins.');
        }
    }

    let completedExtensions = 0;  // Globale Variable zur Verfolgung des Fortschritts
    let totalExtensions = 0;      // Gesamtanzahl der Erweiterungen
    let progressContainer = null; // Fortschrittscontainer global definiert

    // Funktion zum Überprüfen des aktuellen Modus (Light- oder Darkmode)
    function getCurrentMode() {
        return document.body.classList.contains('dark-mode') || window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Funktion zum Aktualisieren des Fortschrittsbalkens
    function updateProgress(progressText, progressFill) {
        progressText.textContent = `${completedExtensions} / ${totalExtensions} Erweiterungen gebaut`;
        progressFill.style.width = `${(completedExtensions / totalExtensions) * 100}%`;

        // Wenn alle Erweiterungen gebaut wurden, schließe die Anzeige nach 1 Sekunde
        if (completedExtensions === totalExtensions) {
            setTimeout(() => {
                alert('Alle Erweiterungen wurden erfolgreich gebaut!');
                if (progressContainer) {
                    document.body.removeChild(progressContainer); // Fortschrittsanzeige schließen
                }
            }, 2000);
        }
    }

    // Funktion zum Starten des Bauens aller Erweiterungen
    function buildAllExtensions(buildingType, group, currency) {
        totalExtensions = group.reduce((sum, { missingExtensions }) => sum + missingExtensions.length, 0);
        completedExtensions = 0;  // Reset the progress count

        // Überprüfen, ob totalExtensions korrekt berechnet wird
        console.log("Total Extensions:", totalExtensions);

        // Fortschrittsanzeige erstellen
        progressContainer = document.createElement('div'); // Globale Referenz setzen
        progressContainer.className = 'progress-container';
        progressContainer.style.position = 'fixed';
        progressContainer.style.top = '50%';
        progressContainer.style.left = '50%';
        progressContainer.style.transform = 'translate(-50%, -50%)';
        progressContainer.style.background = '#333';  // Immer Darkmode
        progressContainer.style.padding = '20px';
        progressContainer.style.border = '1px solid #ccc';
        progressContainer.style.borderRadius = '10px';
        progressContainer.style.boxShadow = '0px 0px 10px rgba(0,0,0,0.2)';
        progressContainer.style.width = '300px';
        progressContainer.style.textAlign = 'center';
        progressContainer.style.zIndex = '10002'; // Sicherstellen, dass der Fortschrittsbalken oben bleibt

        const progressText = document.createElement('p');
        progressText.textContent = `0 / ${totalExtensions} Erweiterungen gebaut`;
        progressText.style.color = '#fff'; // Helle Schriftfarbe für den Text
        progressText.style.fontWeight = 'bold'; // Fettschrift für bessere Lesbarkeit
        progressText.style.fontSize = '16px'; // Größere Schrift für bessere Sichtbarkeit

        const progressBar = document.createElement('div');
        progressBar.style.width = '100%';
        progressBar.style.background = '#555';  // Dunklerer Hintergrund für die Progressbar
        progressBar.style.borderRadius = '5px';
        progressBar.style.marginTop = '10px';

        const progressFill = document.createElement('div');
        progressFill.style.width = '0%';
        progressFill.style.height = '20px';
        progressFill.style.background = '#4caf50';
        progressFill.style.borderRadius = '5px';

        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressText);
        progressContainer.appendChild(progressBar);
        document.body.appendChild(progressContainer);

        // Alle Erweiterungen bauen mit Fortschrittsupdate
        group.forEach(({ building, missingExtensions }, index) => {
            missingExtensions.forEach((extension, extIndex) => {
                setTimeout(() => {
                    buildExtension(building.id, extension.id, currency, building.caption, progressText, progressFill);
                }, (index * missingExtensions.length + extIndex) * 1000); // 1000ms Verzögerung
            });
        });
    }

})();

//Aktuellste Version
