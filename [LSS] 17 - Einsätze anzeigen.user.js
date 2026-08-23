// ==UserScript==
// @name         [LSS] Einsätze anzeigen
// @namespace    http://tampermonkey.net/
// @version      1.5
// @author       Caddy21
// @description  Blendet Einsätze basierend auf individuellen Einstellungen aus.
// @match        https://www.leitstellenspiel.de/einsaetze*
// @match        https://polizei.leitstellenspiel.de/einsaetze*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    // Da lasst ihr lieber die Finger von
    let successFilterMode = loadSettings('einsatzSuccessFilterMode', loadSettings('einsatzHideSuccess', true) ? 'hide' : 'none');
    let initialGameFilterTriggered = false;
    let activeSection = 'requirements';
    let themeObserver = null;

    // Hier macht was ihr wollt gebt mir nur nicht die Schuld für Fehler. :D
    const keywordMap = {
        "Autobahnpolizeiwache": false,
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
    }; // Voraussetzungen
    const missionTypes = {
        "Autobahnpolizei-Einsätze": false,
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
        "Tierrettungs-Einsätze": false,
        "Wasserrettungs-Einsätze": false,
        "Werkfeuerwehr-Einsätze": false
    }; // Einsatzarten

    let filterOptions = {
        ...keywordMap,
        ...loadSettings('einsatzFilterOptions', {})
    };
    let missionTypeOptions = {
        ...missionTypes,
        ...loadSettings('einsatzMissionTypeOptions', {})
    };

    // Hier überwache ich eure Einstellungen
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
        }

        const value = localStorage.getItem(key);

        if (value === null) {
            return defaultValue;
        }

        try {
            return JSON.parse(value);
        } catch (e) {
            return defaultValue;
        }
    }
    function saveAllSettings() {
        saveSettings('einsatzFilterOptions', filterOptions);
        saveSettings('einsatzMissionTypeOptions', missionTypeOptions);
        saveSettings('einsatzSuccessFilterMode', successFilterMode);

        hideMissions();
        updateModalCounters();
    }

    // Darkside of Cookies bzw let the Sun shine
    function getCurrentThemeMode() {
        return (
            document.body.classList.contains('dark') ||
            document.documentElement.classList.contains('dark')
        ) ? 'dark' : 'light';
    }

    // Einsätze verschwindebus
    function hideMissions() {
        const searchInput = document.getElementById(
            'search_input_field_possible_mission'
        );

        const searchTerm = searchInput
            ? searchInput.value.toLowerCase()
            : '';

        document.querySelectorAll('.mission_type_index_searchable').forEach(el => {
            const text = el.textContent || el.innerText || '';
            const textLower = text.toLowerCase();

            let visible = true;
            const isSuccess = el.classList.contains('success');

            // Erfolgsstatus filtern
            if (successFilterMode === 'hide' && isSuccess) {
                visible = false;
            }

            if (successFilterMode === 'only' && !isSuccess) {
                visible = false;
            }

            // Voraussetzungen prüfen
            if (visible) {
                for (const [keyword, shouldHide] of Object.entries(filterOptions)) {
                    if (shouldHide && text.includes(keyword)) {
                        visible = false;
                        break;
                    }
                }
            }

            // Einsatzarten prüfen
            if (visible) {
                for (const [type, shouldHide] of Object.entries(missionTypeOptions)) {
                    if (shouldHide && text.includes(type)) {
                        visible = false;
                        break;
                    }
                }
            }

            // Spielinterne Suche berücksichtigen
            if (visible && searchTerm !== '' && !textLower.includes(searchTerm)) {
                visible = false;
            }

            el.style.display = visible ? '' : 'none';
        });

        // Spoiler-Überschriften ausblenden, wenn kein Einsatz sichtbar ist
        document.querySelectorAll('.mission-group-header').forEach(header => {
            const onclick = header.getAttribute('onclick');

            if (!onclick) {
                return;
            }

            const match = onclick.match(
                /toggleRow\(['"][^'"]+['"],\s*['"]([^'"]+)['"]\)/
            );

            if (!match) {
                return;
            }

            const childSelector = match[1];
            const children = document.querySelectorAll(childSelector);

            const hasVisibleChild = Array.from(children).some(child => {
                return child.style.display !== 'none';
            });

            header.style.display = hasVisibleChild ? '' : 'none';

            if (!hasVisibleChild) {
                return;
            }

            const arrow = header.querySelector('.expand-arrow');

            if (!arrow) {
                return;
            }

            const isExpanded = arrow.getAttribute('aria-expanded') === 'true';

            if (!isExpanded) {
                arrow.click();
            }
        });
    }

    // Irgendwas läuft hier automagisch
    function triggerInitialGameFilter() {
        if (initialGameFilterTriggered) {
            return;
        }

        const checkbox = document.getElementById(
            'requirements_checkbox_possible_mission'
        );

        if (!checkbox) {
            return;
        }

        initialGameFilterTriggered = true;

        console.log(
            '[LSS-EinsatzFilter] Starte initiale Anforderungsprüfung...'
        );

        // Anforderungen prüfen aktivieren
        if (!checkbox.checked) {
            checkbox.checked = true;
        }

        checkbox.dispatchEvent(new Event('change', {
            bubbles: true
        }));

        // Kurz warten, damit LSS die Änderung verarbeiten kann
        setTimeout(() => {
            const buttons = Array.from(
                document.querySelectorAll(
                    'button, input[type="button"], input[type="submit"]'
                )
            );

            const applyButton = buttons.find(button => {
                const text = (
                    button.innerText ||
                    button.value ||
                    button.textContent ||
                    ''
                ).trim().toLowerCase();

                return text.includes('filter anwenden');
            });

            if (applyButton) {
                console.log(
                    '[LSS-EinsatzFilter] "Filter anwenden" wird automatisch ausgeführt.'
                );

                applyButton.click();
            } else {
                console.warn(
                    '[LSS-EinsatzFilter] Button "Filter anwenden" wurde nicht gefunden.'
                );

                initialGameFilterTriggered = false;
            }
        }, 100);
    }

    // Freund von Sobol
    function showModal() {
        if (document.getElementById('einsatzFilterModal')) {
            return;
        }

        injectStyles();

        const modal = document.createElement('div');
        modal.id = 'einsatzFilterModal';

        const overlay = document.createElement('div');
        overlay.className = 'einsatz-filter-overlay';

        overlay.onclick = event => {
            if (event.target === overlay) {
                closeModal();
            }
        };

        const app = document.createElement('div');
        app.className = 'einsatz-filter-app';

        // Header
        const header = document.createElement('div');
        header.className = 'einsatz-filter-header';

        const headerLeft = document.createElement('div');
        headerLeft.className = 'einsatz-filter-header-left';

        const icon = document.createElement('div');
        icon.className = 'einsatz-filter-main-icon';
        icon.innerHTML = '🚒';

        const headerText = document.createElement('div');

        const title = document.createElement('div');
        title.className = 'einsatz-filter-title';
        title.textContent = 'Einsätze filtern';

        const subtitle = document.createElement('div');
        subtitle.className = 'einsatz-filter-subtitle';
        subtitle.textContent =
            'Passe die Anzeige deiner Einsätze individuell an.';

        headerText.appendChild(title);
        headerText.appendChild(subtitle);

        headerLeft.appendChild(icon);
        headerLeft.appendChild(headerText);

        const closeButton = document.createElement('button');
        closeButton.className = 'einsatz-filter-close';
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Schließen';
        closeButton.onclick = closeModal;

        header.appendChild(headerLeft);
        header.appendChild(closeButton);

        app.appendChild(header);

        // Status
        const statusBar = document.createElement('div');
        statusBar.className = 'einsatz-filter-status';

        const statusIcon = document.createElement('span');
        statusIcon.textContent = '✓';

        const statusText = document.createElement('span');
        statusText.id = 'einsatzFilterStatusText';

        statusBar.appendChild(statusIcon);
        statusBar.appendChild(statusText);

        app.appendChild(statusBar);

        // Navigation
        const navigation = document.createElement('div');
        navigation.className = 'einsatz-filter-navigation';

        const requirementsCard = createNavigationCard(
            'requirements',
            '⚙️',
            'Voraussetzungen'
        );

        const missionCard = createNavigationCard(
            'missions',
            '🚨',
            'Einsatzkategorien'
        );

        navigation.appendChild(requirementsCard);
        navigation.appendChild(missionCard);

        app.appendChild(navigation);

        // Content
        const content = document.createElement('div');
        content.id = 'einsatzFilterContent';
        content.className = 'einsatz-filter-content';

        app.appendChild(content);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'einsatz-filter-footer';

        const successWrapper = document.createElement('div');
        successWrapper.className = 'einsatz-filter-success-toggle';

        const successText = document.createElement('span');

        const successStrong = document.createElement('strong');
        successStrong.textContent = 'Grüne Einsätze';

        const successSmall = document.createElement('small');
        successSmall.textContent =
            'Anzeige bereits erfolgreich bearbeiteter Einsätze';

        successText.appendChild(successStrong);
        successText.appendChild(successSmall);

        const successSelect = document.createElement('select');
        successSelect.className = 'einsatz-filter-success-select';

        const successOptions = [
            ['none', 'Normal anzeigen'],
            ['hide', 'Grüne ausblenden'],
            ['only', 'Nur grüne anzeigen']
        ];

        successOptions.forEach(([value, text]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            successSelect.appendChild(option);
        });

        successSelect.value = successFilterMode;

        successSelect.onchange = () => {
            successFilterMode = successSelect.value;
            saveAllSettings();
        };

        successWrapper.appendChild(successText);
        successWrapper.appendChild(successSelect);

        const closeFooterButton = document.createElement('button');
        closeFooterButton.className = 'einsatz-filter-footer-close';
        closeFooterButton.textContent = 'Schließen';
        closeFooterButton.onclick = closeModal;

        footer.appendChild(successWrapper);
        footer.appendChild(closeFooterButton);

        app.appendChild(footer);

        overlay.appendChild(app);
        modal.appendChild(overlay);

        document.body.appendChild(modal);

        renderActiveSection();

        document.addEventListener('keydown', modalEscHandler);

        themeObserver = new MutationObserver(() => {
            updateTheme();
        });

        themeObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });

        updateTheme();
    }

    // Wechsel zwischen Bereichen
    function createNavigationCard(section, icon, title) {
        const card = document.createElement('button');
        card.className = 'einsatz-filter-nav-card';
        card.dataset.section = section;

        const iconElement = document.createElement('div');
        iconElement.className = 'einsatz-filter-nav-icon';
        iconElement.textContent = icon;

        const text = document.createElement('div');
        text.className = 'einsatz-filter-nav-text';

        const titleElement = document.createElement('strong');
        titleElement.textContent = title;

        const counter = document.createElement('span');
        counter.id = section === 'requirements'
            ? 'requirementsCounter'
            : 'missionsCounter';

        text.appendChild(titleElement);
        text.appendChild(counter);

        const arrow = document.createElement('div');
        arrow.className = 'einsatz-filter-nav-arrow';
        arrow.textContent = '›';

        card.appendChild(iconElement);
        card.appendChild(text);
        card.appendChild(arrow);

        card.onclick = () => {
            activeSection = section;
            renderActiveSection();
        };

        return card;
    }

    // Ausgewählten Bereich anzeigen
    function renderActiveSection() {
        const content = document.getElementById('einsatzFilterContent');

        if (!content) {
            return;
        }

        content.innerHTML = '';

        document.querySelectorAll('.einsatz-filter-nav-card').forEach(card => {
            card.classList.toggle(
                'active',
                card.dataset.section === activeSection
            );
        });

        if (activeSection === 'requirements') {
            content.appendChild(
                createFilterPanel(
                    'Voraussetzungen',
                    '⚙️',
                    filterOptions,
                    'requirements'
                )
            );
        } else {
            content.appendChild(
                createFilterPanel(
                    'Einsatzkategorien',
                    '🚨',
                    missionTypeOptions,
                    'missions'
                )
            );
        }

        updateModalCounters();
        updateStatus();
    }

    // Filterpanel erstellen
    function createFilterPanel(titleText, icon, options, type) {
        const panel = document.createElement('div');
        panel.className = 'einsatz-filter-panel';

        const panelHeader = document.createElement('div');
        panelHeader.className = 'einsatz-filter-panel-header';

        const panelTitle = document.createElement('div');
        panelTitle.className = 'einsatz-filter-panel-title';

        panelTitle.innerHTML =
            `<span>${icon}</span>` +
            `<div>` +
            `<strong>${titleText}</strong>` +
            `<small>Wähle aus, was ausgeblendet werden soll.</small>` +
            `</div>`;

        const actions = document.createElement('div');
        actions.className = 'einsatz-filter-actions';

        const allOn = document.createElement('button');
        allOn.textContent = 'Alle an';

        allOn.onclick = () => {
            Object.keys(options).forEach(key => {
                options[key] = true;
            });

            saveAllSettings();
            renderActiveSection();
        };

        const allOff = document.createElement('button');
        allOff.textContent = 'Alle aus';

        allOff.onclick = () => {
            Object.keys(options).forEach(key => {
                options[key] = false;
            });

            saveAllSettings();
            renderActiveSection();
        };

        actions.appendChild(allOn);
        actions.appendChild(allOff);

        panelHeader.appendChild(panelTitle);
        panelHeader.appendChild(actions);

        panel.appendChild(panelHeader);

        // Suche
        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'einsatz-filter-search';
        searchWrapper.innerHTML = '🔍';

        const search = document.createElement('input');
        search.type = 'search';
        search.placeholder = type === 'requirements'
            ? 'Voraussetzung suchen...'
            : 'Einsatzkategorie suchen...';

        searchWrapper.appendChild(search);
        panel.appendChild(searchWrapper);

        // Liste
        const list = document.createElement('div');
        list.className = 'einsatz-filter-list';

        const entries = Object.entries(options).sort((a, b) =>
            a[0].localeCompare(b[0], 'de')
        );

        entries.forEach(([key, checked]) => {
            const item = document.createElement('label');
            item.className = 'einsatz-filter-item';
            item.dataset.search = key.toLowerCase();

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = checked;

            const checkmark = document.createElement('span');
            checkmark.className = 'einsatz-filter-checkmark';

            const labelText = document.createElement('span');
            labelText.className = 'einsatz-filter-item-text';
            labelText.textContent = key;

            checkbox.onchange = () => {
                options[key] = checkbox.checked;

                saveAllSettings();

                item.classList.toggle(
                    'checked',
                    checkbox.checked
                );
            };

            if (checked) {
                item.classList.add('checked');
            }

            item.appendChild(checkbox);
            item.appendChild(checkmark);
            item.appendChild(labelText);

            list.appendChild(item);
        });

        search.addEventListener('input', () => {
            const term = search.value.toLowerCase().trim();

            list.querySelectorAll('.einsatz-filter-item').forEach(item => {
                item.style.display = item.dataset.search.includes(term)
                    ? ''
                    : 'none';
            });
        });

        panel.appendChild(list);

        return panel;
    }

    // Zahlen/Daten/Fakten
    function updateModalCounters() {
        const requirementsCounter = document.getElementById(
            'requirementsCounter'
        );

        const missionsCounter = document.getElementById(
            'missionsCounter'
        );

        const requirementActive = Object.values(filterOptions)
            .filter(Boolean)
            .length;

        const missionActive = Object.values(missionTypeOptions)
            .filter(Boolean)
            .length;

        if (requirementsCounter) {
            requirementsCounter.textContent =
                `${requirementActive} von ${Object.keys(filterOptions).length} aktiv`;
        }

        if (missionsCounter) {
            missionsCounter.textContent =
                `${missionActive} von ${Object.keys(missionTypeOptions).length} aktiv`;
        }

        updateStatus();
    }

    // Status aktualisieren
    function updateStatus() {
        const status = document.getElementById(
            'einsatzFilterStatusText'
        );

        if (!status) {
            return;
        }

        const requirementActive = Object.values(filterOptions)
            .filter(Boolean)
            .length;

        const missionActive = Object.values(missionTypeOptions)
            .filter(Boolean)
            .length;

        const total = requirementActive + missionActive;

        let statusMode = '';

        if (successFilterMode === 'hide') {
            statusMode = ' · Grüne ausgeblendet';
        } else if (successFilterMode === 'only') {
            statusMode = ' · Nur grüne';
        }

        status.textContent = total === 0
            ? `Keine Filter aktiv${statusMode}`
            : `${total} Filter aktiv${statusMode}`;
    }

    // Modal mit Escape schließen
    function modalEscHandler(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    }

    // Modal entfernen
    function closeModal() {
        const modal = document.getElementById(
            'einsatzFilterModal'
        );

        if (modal) {
            modal.remove();
        }

        document.removeEventListener(
            'keydown',
            modalEscHandler
        );

        if (themeObserver) {
            themeObserver.disconnect();
            themeObserver = null;
        }
    }

    // Theme
    function updateTheme() {
        const modal = document.getElementById(
            'einsatzFilterModal'
        );

        if (!modal) {
            return;
        }

        modal.dataset.theme = getCurrentThemeMode();
    }

    // CSS (Nicht Counterstrike Source falls ihr das denkt)
    function injectStyles() {
        if (document.getElementById('einsatzFilterModernStyles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'einsatzFilterModernStyles';

        style.textContent = `
            .einsatz-filter-overlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(0, 0, 0, .55);
                backdrop-filter: blur(7px);
                -webkit-backdrop-filter: blur(7px);
                animation: einsatzFadeIn .18s ease;
            }

            .einsatz-filter-app {
                width: min(900px, 100%);
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border-radius: 18px;
                background: #ffffff;
                color: #1f2937;
                box-shadow: 0 25px 70px rgba(0, 0, .35);
                animation: einsatzModalIn .22s ease;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-app {
                background: #17191d;
                color: #f3f4f6;
            }

            .einsatz-filter-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 22px 24px;
                border-bottom: 1px solid #e5e7eb;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-header {
                border-color: #30343b;
            }

            .einsatz-filter-header-left {
                display: flex;
                align-items: center;
                gap: 14px;
            }

            .einsatz-filter-main-icon {
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 14px;
                font-size: 25px;
                background: linear-gradient(135deg, #ef4444, #f97316);
                box-shadow: 0 5px 15px rgba(239, 68, 68, .25);
            }

            .einsatz-filter-title {
                font-size: 20px;
                font-weight: 700;
            }

            .einsatz-filter-subtitle {
                margin-top: 3px;
                font-size: 13px;
                color: #6b7280;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-subtitle {
                color: #9ca3af;
            }

            .einsatz-filter-close {
                width: 38px;
                height: 38px;
                border: 0;
                border-radius: 10px;
                background: transparent;
                color: #6b7280;
                font-size: 27px;
                line-height: 1;
                cursor: pointer;
                transition: background .15s, color .15s;
            }

            .einsatz-filter-close:hover {
                background: #f3f4f6;
                color: #111827;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-close:hover {
                background: #292d34;
                color: white;
            }

            .einsatz-filter-status {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 18px 24px 4px;
                padding: 9px 12px;
                border-radius: 9px;
                font-size: 12px;
                font-weight: 600;
                background: #f0fdf4;
                color: #15803d;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-status {
                background: #14261a;
                color: #86efac;
            }

            .einsatz-filter-navigation {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                padding: 12px 24px 18px;
            }

            .einsatz-filter-nav-card {
                position: relative;
                display: flex;
                align-items: center;
                gap: 13px;
                padding: 14px;
                border: 1px solid #e5e7eb;
                border-radius: 13px;
                background: #fafafa;
                color: inherit;
                text-align: left;
                cursor: pointer;
                transition: transform .15s, border .15s, background .15s, box-shadow .15s;
            }

            .einsatz-filter-nav-card:hover {
                transform: translateY(-1px);
                border-color: #d1d5db;
                box-shadow: 0 5px 15px rgba(0, 0, 0, .06);
            }

            .einsatz-filter-nav-card.active {
                border-color: #ef4444;
                background: linear-gradient(135deg, #fff7f7, #fff);
                box-shadow: 0 4px 16px rgba(239, 68, 68, .12);
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-nav-card {
                border-color: #30343b;
                background: #202329;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-nav-card.active {
                border-color: #ef4444;
                background: linear-gradient(135deg, #291b1d, #202329);
            }

            .einsatz-filter-nav-icon {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                border-radius: 11px;
                background: #f3f4f6;
                font-size: 20px;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-nav-icon {
                background: #2b2f36;
            }

            .einsatz-filter-nav-text {
                display: flex;
                flex-direction: column;
                gap: 3px;
                min-width: 0;
            }

            .einsatz-filter-nav-text strong {
                font-size: 14px;
            }

            .einsatz-filter-nav-text span {
                font-size: 11px;
                color: #6b7280;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-nav-text span {
                color: #9ca3af;
            }

            .einsatz-filter-nav-arrow {
                margin-left: auto;
                font-size: 25px;
                color: #9ca3af;
            }

            .einsatz-filter-content {
                min-height: 0;
                flex: 1;
                overflow-y: auto;
                padding: 0 24px 18px;
            }

            .einsatz-filter-panel {
                animation: einsatzContentIn .18s ease;
            }

            .einsatz-filter-panel-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 15px;
                margin-bottom: 12px;
            }

            .einsatz-filter-panel-title {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .einsatz-filter-panel-title > span {
                font-size: 20px;
            }

            .einsatz-filter-panel-title > div {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .einsatz-filter-panel-title strong {
                font-size: 15px;
            }

            .einsatz-filter-panel-title small {
                font-size: 11px;
                color: #6b7280;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-panel-title small {
                color: #9ca3af;
            }

            .einsatz-filter-actions {
                display: flex;
                gap: 6px;
            }

            .einsatz-filter-actions button {
                padding: 6px 10px;
                border: 1px solid #d1d5db;
                border-radius: 7px;
                background: #fff;
                color: #374151;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: background .15s, border .15s;
            }

            .einsatz-filter-actions button:hover {
                background: #f3f4f6;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-actions button {
                border-color: #3b4048;
                background: #252930;
                color: #e5e7eb;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-actions button:hover {
                background: #30343c;
            }

            .einsatz-filter-search {
                display: flex;
                align-items: center;
                gap: 8px;
                height: 40px;
                margin-bottom: 10px;
                padding: 0 12px;
                border: 1px solid #e5e7eb;
                border-radius: 9px;
                background: #f9fafb;
                color: #9ca3af;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-search {
                border-color: #30343b;
                background: #202329;
            }

            .einsatz-filter-search input {
                width: 100%;
                border: 0;
                outline: 0;
                background: transparent;
                color: inherit;
                font-size: 13px;
            }

            .einsatz-filter-list {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 5px;
                padding-right: 3px;
            }

            .einsatz-filter-item {
                display: flex;
                align-items: center;
                gap: 10px;
                min-height: 42px;
                padding: 7px 10px;
                border: 1px solid transparent;
                border-radius: 9px;
                cursor: pointer;
                transition: background .12s, border .12s;
            }

            .einsatz-filter-item:hover {
                background: #f3f4f6;
            }

            .einsatz-filter-item.checked {
                border-color: #fecaca;
                background: #fff5f5;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-item:hover {
                background: #24282e;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-item.checked {
                border-color: #59282b;
                background: #291b1d;
            }

            .einsatz-filter-item input {
                position: absolute;
                opacity: 0;
                pointer-events: none;
            }

            .einsatz-filter-checkmark {
                width: 19px;
                height: 19px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                border: 2px solid #cbd5e1;
                border-radius: 6px;
                background: white;
                transition: background .15s, border .15s;
            }

            .einsatz-filter-item.checked .einsatz-filter-checkmark {
                border-color: #ef4444;
                background: #ef4444;
            }

            .einsatz-filter-item.checked .einsatz-filter-checkmark::after {
                content: '✓';
                color: white;
                font-size: 13px;
                font-weight: 800;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-checkmark {
                border-color: #4b5563;
                background: #1f2329;
            }

            .einsatz-filter-item-text {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-size: 12px;
            }

            .einsatz-filter-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 15px;
                padding: 14px 24px;
                border-top: 1px solid #e5e7eb;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-footer {
                border-color: #30343b;
            }

            .einsatz-filter-success-toggle {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .einsatz-filter-success-toggle span {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .einsatz-filter-success-toggle strong {
                font-size: 12px;
            }

            .einsatz-filter-success-toggle small {
                font-size: 10px;
                color: #6b7280;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-success-toggle small {
                color: #9ca3af;
            }

            .einsatz-filter-success-select {
                min-width: 170px;
                padding: 7px 30px 7px 10px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                background: #fff;
                color: #374151;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                outline: none;
            }

            .einsatz-filter-success-select:focus {
                border-color: #ef4444;
                box-shadow: 0 0 0 2px rgba(239, 68, 68, .12);
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-success-select {
                border-color: #3b4048;
                background: #252930;
                color: #e5e7eb;
            }

            #einsatzFilterModal[data-theme="dark"] .einsatz-filter-success-select:focus {
                border-color: #ef4444;
            }

            .einsatz-filter-footer-close {
                padding: 9px 16px;
                border: 0;
                border-radius: 8px;
                background: #ef4444;
                color: white;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: background .15s, transform .15s;
            }

            .einsatz-filter-footer-close:hover {
                background: #dc2626;
                transform: translateY(-1px);
            }

            @keyframes einsatzFadeIn {
                from {
                    opacity: 0;
                }

                to {
                    opacity: 1;
                }
            }

            @keyframes einsatzModalIn {
                from {
                    opacity: 0;
                    transform: translateY(12px) scale(.98);
                }

                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            @keyframes einsatzContentIn {
                from {
                    opacity: 0;
                    transform: translateX(5px);
                }

                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            @media (max-width: 650px) {
                .einsatz-filter-overlay {
                    padding: 8px;
                }

                .einsatz-filter-app {
                    max-height: 96vh;
                    border-radius: 14px;
                }

                .einsatz-filter-navigation {
                    grid-template-columns: 1fr;
                }

                .einsatz-filter-list {
                    grid-template-columns: 1fr;
                }

                .einsatz-filter-panel-header {
                    align-items: flex-start;
                    flex-direction: column;
                }

                .einsatz-filter-footer {
                    align-items: stretch;
                    flex-direction: column;
                }

                .einsatz-filter-success-toggle {
                    align-items: stretch;
                    flex-direction: column;
                }

                .einsatz-filter-success-select {
                    width: 100%;
                }

                .einsatz-filter-footer-close {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Button des Glücks erzeugen
    function insertButton() {
        if (document.getElementById('einsatzFilterOpenButton')) {
            return;
        }

        const header = document.getElementById('filter_panel_header');

        if (!header) {
            return;
        }

        const buttonContainer = header.querySelector(
            '.flex.flex-row.flex-wrap'
        );

        if (!buttonContainer) {
            return;
        }

        const selectContainer = buttonContainer.querySelector('.select');

        if (!selectContainer) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'select';
        wrapper.style.marginRight = '10px';

        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'einsatzFilterOpenButton';
        button.innerText = 'Einsätze filtern';
        button.title = 'Einsatzfilter von Caddy21';
        button.className = 'btn btn-default';
        button.onclick = showModal;

        wrapper.appendChild(button);

        buttonContainer.insertBefore(
            wrapper,
            selectContainer
        );
    }

    // Starte den Bums!
    function init() {
        insertButton();

        // LSS-Filter beobachten, bis der Filter vorhanden ist
        const initialFilterObserver = new MutationObserver(() => {
            triggerInitialGameFilter();

            if (initialGameFilterTriggered) {
                initialFilterObserver.disconnect();
            }
        });

        initialFilterObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Falls der Filter beim Scriptstart bereits vorhanden ist
        triggerInitialGameFilter();

        // Hauptbeobachter für neue/geänderte Einsätze
        const mainObserver = new MutationObserver(() => {
            insertButton();
            hideMissions();
        });

        mainObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Spielinterne Suche überwachen
        const searchInput = document.getElementById(
            'search_input_field_possible_mission'
        );

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                setTimeout(hideMissions, 50);
            });
        }

        // Initial filtern
        hideMissions();
    }

    init();
})();
