// ==UserScript==
// @name         [LSS] Einsätze anzeigen
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Blendet Einsätze basierend auf individuellen Kategorien und Einsatzarten aus.
// @match        https://www.leitstellenspiel.de/einsaetze*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    // Grün hinterlegte Einsätze
    let hideSuccess = loadSettings('einsatzHideSuccess', false);

    // --- Moduserkennung ---
    function getCurrentThemeMode() {
        // Prüft, ob body oder html die Klasse 'dark' enthält
        return (document.body.classList.contains('dark') || document.documentElement.classList.contains('dark')) ? 'dark' : 'light';
    }
    function getThemeColors() {
        const mode = getCurrentThemeMode();
        if (mode === 'dark') {
            return {
                background: '#1e1e1e',
                text: '#ffffff',
                border: '#555',
                shadow: '#000',
                buttonBackground: '#333',
                buttonText: '#fff',
                checkboxBorder: '#ccc'
            };
        } else {
            return {
                background: '#ffffff',
                text: '#000000',
                border: '#ccc',
                shadow: '#999',
                buttonBackground: '#f0f0f0',
                buttonText: '#000',
                checkboxBorder: '#555'
            };
        }
    }

    // --- Speicherung mit GM Storage (Fallback auf localStorage falls nicht vorhanden) ---
    function saveSettings(key, value) {
        if (typeof GM_setValue === 'function') {
            GM_setValue(key, value);
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }
    function loadSettings(key, defaultValue) {
        if (typeof GM_getValue === 'function') {
            return GM_getValue(key, defaultValue);
        } else {
            const val = localStorage.getItem(key);
            if (val === null) return defaultValue;
            try {
                return JSON.parse(val);
            } catch(e) {
                return defaultValue;
            }
        }
    }

    // --- Filterdaten ---

    // Voraussetzungen (Schlagwörter -> Optionen)
    const keywordMap = {
        "Bahnrettungs-Erweiterung": false,
        "Bereitschaftspolizeiwache": false,
        "Bergrettungswache": false,
        "Betreuungs- und Verpflegungsdienst": false,
        "Dienstgruppenleitung": false,
        "Drohnen-Erweiterung": false,
        "Erweiterung für Sonderfahrzeug: Gefangenenkraftwagen": false,
        "Feuerwache": false,
        "Hubschrauberstationen (Seenotrettung)": false,
        "Lautsprecherkraftwagen-Erweiterung": false,
        "Lüfter-Erweiterung": false,
        "MEK-Wache": false,
        "NEA200-Erweiterung": false,
        "NEA50-Erweiterung": false,
        "Polizeihubschrauberstation": false,
        "Polizei-Motorradstaffel": false,
        "Polizeiwache": false,
        "Reiterstaffel": false,
        "Rettungshundestaffel": false,
        "Rettungswache": false,
        "SEK-Wache": false,
        "Seenotrettungswache": false,
        "THW: Fachgruppe Notversorgung": false,
        "THW: Fachgruppe Räumen": false,
        "THW: Fachgruppe SB": false,
        "THW: Zugtrupp": false,
        "THW-Ortsverband": false,
        "Technischer Zuge: Wasserwerfer": false,
        "Verpflegungsdienst-Erweiterung": false,
        "Wasserrettungswache": false,
        "Werkfeuerwehr": false,
        "Windenrettungs-Erweiterungen": false,
        "Züge der 1. Hundertschaft": false
    };

    // Einsatzarten (Filteroptionen)
    const missionTypes = {
        "Bergrettungseinsätze": false,
        "Bereitschaftspolizei-Einsätze": false,
        "Feuerwehreinsätze": false,
        "Flughafenfeuerwehr-Einsätze": false,
        "Flughafenfeuerwehr-Einsätze (Spezialisierung)": false,
        "Kriminalpolizei-Einsätze": false,
        "NEA200-Einsätze": false,
        "NEA50-Einsätze": false,
        "Polizeieinsätze": false,
        "Rettungseinsätze": false,
        "SEG-Einsätze": false,
        "SEG-Sanitätsdienst-Einsätze": false,
        "Seenotrettungseinsätze": false,
        "THW-Einsätze": false,
        "Wasserrettungs-Einsätze": false,
        "Werkfeuerwehr-Einsätze": false
    };

    // Einstellungen laden
    let filterOptions = loadSettings('einsatzFilterOptions', keywordMap);
    let missionTypeOptions = loadSettings('einsatzMissionTypeOptions', missionTypes);

    // --- Helfer zum Speichern nach UI-Änderung ---
    function saveAllSettings() {
        saveSettings('einsatzFilterOptions', filterOptions);
        saveSettings('einsatzMissionTypeOptions', missionTypeOptions);
        hideMissions();
    }

    // --- Einsätze ausblenden / anzeigen ---
    function hideMissions() {
        document.querySelectorAll('.mission_type_index_searchable').forEach(el => {
            let text = el.textContent || el.innerText;

            // Erfolgreiche Einsätze ausblenden
            if (hideSuccess && el.classList.contains('success')) {
                el.style.display = 'none';
                return;
            }

            // Voraussetzungsfilter
            for (const [keyword, shouldHide] of Object.entries(filterOptions)) {
                if (shouldHide && text.includes(keyword)) {
                    el.style.display = 'none';
                    return;
                }
            }

            // Einsatzartenfilter
            for (const [typ, shouldHide] of Object.entries(missionTypeOptions)) {
                if (shouldHide && text.includes(typ)) {
                    el.style.display = 'none';
                    return;
                }
            }

            // Sonst anzeigen
            el.style.display = '';
        });
    }

    // --- Modal UI erzeugen ---
    function showModal() {
        if(document.getElementById('einsatzFilterModal')) return;

        const theme = getThemeColors();

        const modal = document.createElement('div');
        modal.id = 'einsatzFilterModal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.backgroundColor = theme.background;
        modal.style.color = theme.text;
        modal.style.border = `1px solid ${theme.border}`;
        modal.style.boxShadow = `0 0 20px ${theme.shadow}`;
        modal.style.padding = '16px';
        modal.style.borderRadius = '8px';
        modal.style.zIndex = '9999';
        modal.style.maxHeight = '80vh';
        modal.style.overflowY = 'auto';
        modal.style.minWidth = '320px';

        // Überschrift
        const title = document.createElement('h3');
        title.innerText = 'Einsätze filtern';
        modal.appendChild(title);

        // 🟩 Erfolgreiche Einsätze ausblenden Checkbox
        const hideSuccessLabel = document.createElement('label');
        hideSuccessLabel.style.display = 'block';
        hideSuccessLabel.style.margin = '12px 0';
        hideSuccessLabel.style.cursor = 'pointer';

        const hideSuccessCheckbox = document.createElement('input');
        hideSuccessCheckbox.type = 'checkbox';
        hideSuccessCheckbox.checked = hideSuccess;
        hideSuccessCheckbox.style.marginRight = '8px';
        hideSuccessCheckbox.style.cursor = 'pointer';
        hideSuccessCheckbox.style.accentColor = theme.text;
        hideSuccessCheckbox.style.border = `1px solid ${theme.checkboxBorder}`;
        hideSuccessCheckbox.onchange = () => {
            hideSuccess = hideSuccessCheckbox.checked;
            saveAllSettings();
        };

        hideSuccessLabel.appendChild(hideSuccessCheckbox);
        hideSuccessLabel.appendChild(document.createTextNode('Grün hinterlegte Einsätze ausblenden'));
        modal.appendChild(hideSuccessLabel);

        // Container für die beiden Filter
        const filterContainer = document.createElement('div');
        filterContainer.style.display = 'flex';
        filterContainer.style.gap = '24px';
        filterContainer.style.flexWrap = 'wrap';
        filterContainer.style.justifyContent = 'space-between';

        const voraussetzungenSection = createFilterSection('Voraussetzungen', filterOptions, (key, checked) => {
            filterOptions[key] = checked;
            saveAllSettings();
        });
        voraussetzungenSection.style.flex = '1 1 45%';

        const einsatzartenSection = createFilterSection('Einsatzarten', missionTypeOptions, (key, checked) => {
            missionTypeOptions[key] = checked;
            saveAllSettings();
        });
        einsatzartenSection.style.flex = '1 1 45%';

        filterContainer.appendChild(voraussetzungenSection);
        filterContainer.appendChild(einsatzartenSection);
        modal.appendChild(filterContainer);

        // Footer mit Schließen Button
        const footer = document.createElement('div');
        footer.style.textAlign = 'right';
        footer.style.marginTop = '12px';

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'Schließen';
        closeBtn.className = 'btn btn-danger';
        closeBtn.style.border = 'none';
        closeBtn.style.padding = '6px 12px';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => {
            modal.remove();
            themeObserver.disconnect();
        };
        footer.appendChild(closeBtn);

        modal.appendChild(footer);
        document.body.appendChild(modal);

        // Live Theme Observer für Modal
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    // Hilfsfunktion: Einen Filterbereich mit Checkboxen erzeugen
    function createFilterSection(titleText, optionsObj, onChangeCallback) {
        const theme = getThemeColors();

        const section = document.createElement('section');
        section.style.marginBottom = '12px';

        const title = document.createElement('h4');
        title.innerText = titleText;
        title.style.marginBottom = '6px';
        section.appendChild(title);

        for (const [key, checked] of Object.entries(optionsObj).sort((a, b) => a[0].localeCompare(b[0]))) {
            const label = document.createElement('label');
            label.style.display = 'block';
            label.style.marginBottom = '4px';
            label.style.cursor = 'pointer';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = checked;
            checkbox.style.marginRight = '8px';
            checkbox.style.cursor = 'pointer';
            checkbox.style.accentColor = theme.text; // modernes Farbthema
            checkbox.style.outline = 'none';
            checkbox.style.border = `1px solid ${theme.checkboxBorder}`;

            checkbox.onchange = () => {
                onChangeCallback(key, checkbox.checked);
            };

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(key));
            section.appendChild(label);
        }

        return section;
    }

    // --- Button im Formular neben dem vorhandenen Button einfügen ---
    function insertButton() {
        // Button nur einmal einfügen
        if(document.getElementById('einsatzFilterOpenButton')) return;

        // Suche Formular (action="/einsaetze")
        const form = document.querySelector('form[action="/einsaetze"]');
        if(!form) {
            console.log('[LSS-EinsatzFilter] Formular nicht gefunden!');
            return;
        }

        // Suche existierenden Button mit class btn-group bootstrap-select als Bezug
        const btnGroup = form.querySelector('.btn-group.bootstrap-select');
        if(!btnGroup) {
            console.log('[LSS-EinsatzFilter] Bezug-Button nicht gefunden!');
            return;
        }

        // Erzeuge neuen Button
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'einsatzFilterOpenButton';
        button.innerText = 'Einsätze filtern';
        button.className = 'btn btn-default';
        button.style.marginLeft = '8px';
        button.onclick = showModal;

        // Button neben den Bezug-Button einfügen
        btnGroup.parentNode.insertBefore(button, btnGroup.nextSibling);
    }

    // --- Theme Observer für Live-Update des Modal ---
    const themeObserver = new MutationObserver(() => {
        const modal = document.getElementById('einsatzFilterModal');
        if(!modal) return;
        const theme = getThemeColors();
        modal.style.backgroundColor = theme.background;
        modal.style.color = theme.text;
        modal.style.border = `1px solid ${theme.border}`;
        modal.style.boxShadow = `0 0 20px ${theme.shadow}`;

        modal.querySelectorAll('button').forEach(btn => {
            btn.style.backgroundColor = theme.buttonBackground;
            btn.style.color = theme.buttonText;
        });

        modal.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.style.border = `1px solid ${theme.checkboxBorder}`;
            cb.style.accentColor = theme.text;
        });
    });

    // --- Haupt-Logik ---
    function init() {
        insertButton();

        // Mutation Observer um Buttons nachzuladen (falls dynamisch neu geladen)
        const mainObserver = new MutationObserver(() => {
            insertButton();
            hideMissions();
        });
        mainObserver.observe(document.body, { childList: true, subtree: true });

        // Erste Ausführung
        hideMissions();
    }

    // Starte Script
    init();

})();
