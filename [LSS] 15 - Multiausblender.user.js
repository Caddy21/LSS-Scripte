// ==UserScript==
// @name         [LSS] 15 - Multiausblender
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Blendet verschiedene Sachen wie AAO-Einträge, Fahrzeug-Tabellen, Patientenbereich und weitere Dinge individuell ein oder aus, permanent oder per Spoilerbutton
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // === OPTIONEN-DEFINITION === \\
    const OPTIONS = [

        // === Alarmfenster === \\
        {key: 'FIX_MISSION_HEADER_INFO', label: 'Einsatzinfo fixieren', default: true, category: 'alarm'},
        {key: 'ENABLE_SUCCESS_ALERT', label: 'Erfolgreiche Alamierung ausblenden', default: true, category: 'alarm'},
        {key: 'ENABLE_MISSING_ALERT', label: 'Fehlende Fahrzeuge am Einsatzort ausblenden', default: true, category: 'alarm'},
        {key: 'ENABLE_SPEECH_REQUEST_ALERT', label: 'Sprechwunsch-Infobox (rot) ausblenden', default: true, category: 'alarm'},
        {key: 'ENABLE_CARE_AND_SUPPLY', label: 'Betreuung und Verpflegung ausblenden', default: false, category: 'alarm'},
        {key: 'HIDE_PATIENT_BUTTON_FORM', label: 'Patienten-Button-Bereich ausblenden', default: false, category: 'alarm'},
        {key: 'ENABLE_PATIENT_SPOILER', label: 'Spoiler für Patientenbereich (ab X Patienten) erzeugen', default: false, category: 'alarm'},
        {key: 'PATIENT_SPOILER_MIN_COUNT', label: 'Spoiler ab so vielen Patienten (Zahl)', default: 10, type: 'number', category: 'alarm'},
        {key: 'ENABLE_AAO_SPOILER', label: 'Spoiler für AAO-Einträge ohne Kategorie erzeugen', default: true, category: 'alarm'},
        {key: 'ENABLE_TABS_SPOILER', label: 'Spoiler für AAO-Tabs erzeugen', default: false, category: 'alarm'},
        {key: 'ENABLE_AAO_COLUMN_SPOILERS', label: 'Spoiler für die AAO-Einträge erzeugen', default: false, category: 'alarm'},
        {key: 'ENABLE_MISSION_SHARED_INFOBOX', label: 'Info-Box „Einsatz geteilt von...“ ausblenden', default: true, category: 'alarm'},
        {key: 'HIDE_PULLRIGHT_BUTTON', label: 'Anfahrten abbrechen Button ausblenden', default: false, category: 'alarm' },
        {key: 'ENABLE_VEHICLE_SPOILER', label: 'Spoiler für anfahrende Fahrzeuge und Fahrzeuge am Einsatzort erzeugen', default: true, category: 'alarm'},
        {key: 'HIDE_BUTTON_GROUP_PULL_RIGHT', label: 'Buttons "Alle Fahrzeuge Rückalamieren" und "Eigenen RD Rückalamieren" ausblenden', default: true, category: 'alarm'},
        {key: 'ENABLE_MAX_DISTANCE_GROUP_SPOILER', label: 'Spoiler für "Maximale Entfernung" erzeugen', default: true, category: 'alarm'},
        {key: 'ENABLE_RELEASE_ALL_INFOBOX', label: 'Info-Box „Wirklich alle entlassen?“ ausblenden', default: true, category: 'alarm'},
        {key: 'ENABLE_AVAILABLE_VEHICLE_LIST_SPOILER', label: 'Spoiler für „Freie Fahrzeugliste“ erzeugen', default: true, category: 'alarm'},

        // === Sonstiges === \\
        {key: 'HIDE_EVENT_INFO', label: 'Eventinfo in der Einsatzliste ausblenden', default: true, category: 'other'},
        {key: 'ENABLE_BREADCRUMB', label: 'Navigationsleiste ausblenden', default: false, category: 'other'},
        {key: 'HIDE_PRISONERS_INFOBOX', label: 'Gewahrsamsbereich (Infobox) ausblenden', default: true, category: 'other'},
        {key: 'HIDE_PRISONERS_TABLE', label: 'Gewahrsamsbereich (Tabelle Wachenansicht) ausblenden', default: true, category: 'other'},
        {key: 'ENABLE_VEHICLE_TABLE_SPOILER', label: 'Spoiler für Fahrzeugtabelle (Wachenübersicht) erzeugen', default: false, category: 'other'},
        {key: 'HIDE_KTW_NO_TRANSPORTS', label: 'Info-Box „Keine KTW-Transporte vorhanden“ ausblenden', default: true, category: 'other'},
        {key: 'HIDE_RENAME_BUTTONS_SECTION', label: 'Buttons im LSSM V3 Renamemanager ausblenden', default: true, category: 'other'},
        {key: 'HIDE_NAME_TOO_LONG_SECTION', label: 'Hinweis bei zu langem Namen (LSSM V3 Renamemanger) ausblenden', default: true, category: 'other'},
        {key: 'ENABLE_SPEECH_REQUEST_INFOBOX', label: 'Sprechwunsch-Infobox (blau) ausblenden', default: false, category: 'other'},
    ];

    // === EINSTELLUNGEN LADEN/SPEICHERN === \\
    function loadSettings() {
        const saved = JSON.parse(localStorage.getItem('multiausblender_settings') || '{}');
        OPTIONS.forEach(opt => {
            if (typeof saved[opt.key] !== 'undefined') {
                window[opt.key] = saved[opt.key];
            } else {
                window[opt.key] = opt.default;
            }
        });
    }

    function saveSettings() {
        const settings = {};
        OPTIONS.forEach(opt => settings[opt.key] = window[opt.key]);
        localStorage.setItem('multiausblender_settings', JSON.stringify(settings));
    }

    // === Farbschema erkennen & setzen === \\
    function getColorMode() {
        // 1. User-Einstellung prüfen
        let mode = localStorage.getItem('multiausblender_ui_mode');
        if (mode === 'dark' || mode === 'light') return mode;
        // 2. Systemeinstellung prüfen
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function setColorMode(mode) {
        localStorage.setItem('multiausblender_ui_mode', mode);
    }

    function getModalStyles(mode) {
        if (mode === 'dark') {
            return {
                background: '#18181c',
                foreground: '#fff',
                border: '#333',
                overlay: 'rgba(0,0,0,.8)',
                inputBg: '#23232a'
            };
        } else {
            return {
                background: '#fff',
                foreground: '#18181c',
                border: '#ccc',
                overlay: 'rgba(0,0,0,.5)',
                inputBg: '#f8f8fa'
            };
        }
    }

    // === GUI: EINSTELLUNGSFENSTER === \\
    function createSettingsGUI() {
        let navbarRight = document.querySelector('.flex-row.flex-nowrap.hidden-xs.navbar-right');
        if (!navbarRight) return;
        if (document.getElementById('multiausblender-settings-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'multiausblender-settings-btn';
        btn.type = 'button';
        btn.className = 'btn btn-default btn-xs navbar-btn hidden-xs';
        btn.style.marginRight = '8px';
        btn.innerHTML = '<span class="glyphicon glyphicon-cog"></span> Multiausblender';

        const helpBtn = navbarRight.querySelector('#mission_help');
        if (helpBtn) {
            navbarRight.insertBefore(btn, helpBtn);
        } else {
            navbarRight.appendChild(btn);
        }

        btn.onclick = () => {
            let modal = document.getElementById('multiausblender-modal');
            if (modal) {
                modal.style.display = 'flex';
                return;
            }

            const colorMode = getColorMode();
            const style = getModalStyles(colorMode);

            modal = document.createElement('div');
            modal.id = 'multiausblender-modal';
            modal.style = `
            position:fixed;
            top:0;left:0;
            width:100vw;
            height:100vh;
            z-index:10000;
            display:flex;
            align-items:center;
            justify-content:center;
            background:${style.overlay};
        `;

            let html = `
            <div id="multiausblender-modal-content" style="
                background:${style.background};
                color:${style.foreground};
                padding:24px;
                border-radius:8px;
                min-width:320px;
                max-width:96vw;
                max-height:90vh;
                overflow-y:auto;
                border:1px solid ${style.border};
                box-shadow: 0 2px 16px 0 ${style.overlay};
            ">
            <h3 style="margin-top:0;">Multiausblender Einstellungen</h3>
            <form id="multiausblender-form">
                <fieldset style="margin-bottom:15px;">
                    <legend style="font-size:16px;font-weight:bold;margin-bottom:10px;color:${style.foreground};">
                         🚨 Alarmmaske
                    </legend>`;

            OPTIONS.filter(opt => opt.category === 'alarm').forEach(opt => {
                const id = 'multiausblender_' + opt.key;
                html += opt.type === 'number'
                    ? `
                <div style="margin-bottom:10px;">
                    <label for="${id}">${opt.label}:</label>
                    <input type="number" id="${id}" value="${window[opt.key]}" min="1"
                        style="width:60px;background:${style.inputBg};color:${style.foreground};border:1px solid ${style.border};" />
                </div>`
                : `
                <div style="margin-bottom:5px;">
                    <input type="checkbox" id="${id}" ${window[opt.key] ? 'checked' : ''} />
                    <label for="${id}">${opt.label}</label>
                </div>`;
            });

            html += `
                </fieldset>
                <fieldset>
                    <legend style="font-size:16px;font-weight:bold;margin-bottom:10px;color:${style.foreground};">
                           📝 Sonstiges
                    </legend>`;

            OPTIONS.filter(opt => opt.category === 'other').forEach(opt => {
                const id = 'multiausblender_' + opt.key;
                html += opt.type === 'number'
                    ? `
                <div style="margin-bottom:10px;">
                    <label for="${id}">${opt.label}:</label>
                    <input type="number" id="${id}" value="${window[opt.key]}" min="1"
                        style="width:60px;background:${style.inputBg};color:${style.foreground};border:1px solid ${style.border};" />
                </div>`
                : `
                <div style="margin-bottom:5px;">
                    <input type="checkbox" id="${id}" ${window[opt.key] ? 'checked' : ''} />
                    <label for="${id}">${opt.label}</label>
                </div>`;
            });

            html += `
                </fieldset>
            </form>
            <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <label style="font-size:13px;cursor:pointer;">
                        <input type="radio" name="ui_mode" value="auto" ${!localStorage.getItem('multiausblender_ui_mode') ? 'checked' : ''} style="vertical-align:middle;">
                        System
                    </label>
                    <label style="font-size:13px;cursor:pointer;margin-left:7px;">
                        <input type="radio" name="ui_mode" value="light" ${localStorage.getItem('multiausblender_ui_mode') === 'light' ? 'checked' : ''} style="vertical-align:middle;">
                        Hell
                    </label>
                    <label style="font-size:13px;cursor:pointer;margin-left:7px;">
                        <input type="radio" name="ui_mode" value="dark" ${localStorage.getItem('multiausblender_ui_mode') === 'dark' ? 'checked' : ''} style="vertical-align:middle;">
                        Dunkel
                    </label>
                </div>
                <div>
                    <button id="multiausblender-save" class="btn btn-success">Speichern</button>
                    <button id="multiausblender-cancel" class="btn btn-danger" type="button">Abbrechen</button>
                </div>
            </div>
        </div>`;

            modal.innerHTML = html;
            document.body.appendChild(modal);

            // Farbschema-Umschalter
            modal.querySelectorAll('input[name="ui_mode"]').forEach(radio => {
                radio.onchange = e => {
                    const val = e.target.value;
                    if (val === 'auto') {
                        localStorage.removeItem('multiausblender_ui_mode');
                    } else {
                        setColorMode(val);
                    }
                    modal.remove();
                    btn.onclick(); // Neu öffnen mit neuem Style
                };
            });

            // Speichern
            modal.querySelector('#multiausblender-save').onclick = e => {
                e.preventDefault();
                OPTIONS.forEach(opt => {
                    const id = 'multiausblender_' + opt.key;
                    if (opt.type === 'number') {
                        const val = parseInt(modal.querySelector('#' + id).value, 10);
                        window[opt.key] = isNaN(val) ? opt.default : val;
                    } else {
                        window[opt.key] = !!modal.querySelector('#' + id).checked;
                    }
                });
                saveSettings();
                modal.style.display = 'none';
                window.top.location.reload();
            };

            // Abbrechen
            modal.querySelector('#multiausblender-cancel').onclick = () => {
                modal.style.display = 'none';
            };
        };
    }

    // === HILFSFUNKTIONEN FÜR ALLE OPTIONEN === \\
    function observeAndToggleEventInfo() {
        const existingStyle = document.getElementById('style-hide-eventInfo');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'style-hide-eventInfo';

        if (window.HIDE_EVENT_INFO) {
            style.textContent = `#eventInfo { display: none !important; }`;
        } else {
            style.textContent = `#eventInfo { display: block !important; }`;
        }
        document.head.appendChild(style);

        const enforceDisplay = () => {
            const box = document.querySelector('#eventInfo');
            if (box) {
                box.style.setProperty('display', window.HIDE_EVENT_INFO ? 'none' : 'block', 'important');
            }
        };

        enforceDisplay();
        const observerTarget = document.getElementById('missions_outer') || document.body;
        const observer = new MutationObserver(() => { enforceDisplay(); });
        observer.observe(observerTarget, {childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class']});
    }

    function toggleBreadcrumb() {
        const breadcrumb = document.querySelector('.breadcrumb');
        if (!breadcrumb) return;
        if (!window.ENABLE_BREADCRUMB) {
            breadcrumb.style.removeProperty('display');
        } else {
            breadcrumb.style.setProperty('display', 'none', 'important');
        }
    }

    function fixMissionHeaderInfo() {
        if (!window.FIX_MISSION_HEADER_INFO) return;
        const header = document.querySelector('.mission_header_info.row');
        if (!header || header.dataset.fixed === "true") return;
        header.style.position = "sticky";
        header.style.top = "0";
        header.style.zIndex = "10";
        header.dataset.fixed = "true";
    }

    function hideOptionalElements() {
        // Erfolgsmeldungen ausblenden
        if (window.ENABLE_SUCCESS_ALERT) {
            document.querySelectorAll('.alert-success').forEach(el => {
                el.style.display = "none";
            });
        }

        // Fehlende Fahrzeuge ausblenden
        document.querySelectorAll('.alert.alert-danger').forEach(el => {
            if (el.innerText.includes('Fehlende Fahrzeuge')) {
                el.style.display = window.ENABLE_MISSING_ALERT ? "none" : "block";
            }

        });

        // Betreuung & Verpflegung ein-/ausblenden
        document.querySelectorAll('.alert.alert-danger').forEach(el => {
            if (el.innerText.includes('Benötigte Betreuungs- und Verpflegungsausstattung')) {
                el.style.display = window.ENABLE_CARE_AND_SUPPLY ? "none" : "block";
            }

            // Sprechwunsch-Infobox (alert-danger)
            if (el.innerText.includes('Ein Fahrzeug hat einen Sprechwunsch!')) {
                el.style.display = window.ENABLE_SPEECH_REQUEST_ALERT ? "none" : "block";
            }
        });

        // Sprechwunsch-Infoboxen (alert-info)
        document.querySelectorAll('.alert.alert-info').forEach(el => {
            if (el.innerText.includes('Sprechwunsch')) {
                el.style.display = window.ENABLE_SPEECH_REQUEST_INFOBOX ? "none" : "block";
            }
            if (el.innerText.includes('Dieser Einsatz wurde von')) {
                el.style.display = window.ENABLE_MISSION_SHARED_INFOBOX ? "none" : "block";
            }
            if (el.innerText.includes('Wirklich alle entlassen?')) {
                el.style.display = window.ENABLE_RELEASE_ALL_INFOBOX ? "none" : "block";
            }
        });


        // Zusätzliche DIV-Bereiche ein-/ausblenden
        const renameButtons = document.getElementById('lssm_renameFzSettings_buttons');
        if (renameButtons) {
            renameButtons.style.display = window.HIDE_RENAME_BUTTONS_SECTION ? 'none' : 'block';
        }

        // Bereich: Name zu lang Hinweis
        const nameTooLongDiv = document.getElementById('lssm_renameFzSettings_nameToLongDiv');
        if (nameTooLongDiv && nameTooLongDiv.classList.contains('alert-danger')) {
            if (window.HIDE_NAME_TOO_LONG_SECTION) {
                nameTooLongDiv.style.setProperty('display', 'none', 'important');
            } else {
                nameTooLongDiv.style.removeProperty('display');
            }
        }

        // Bereich: "prisoners" - Infobox (alert-info)
        if (window.HIDE_PRISONERS_INFOBOX) {
            const prisonersBox = document.querySelector('#prisoners .alert.alert-info');
            if (prisonersBox) prisonersBox.style.display = "none";
        }

        // Bereich: "prisoners" - Tabelle (table-striped)
        if (window.HIDE_PRISONERS_TABLE) {
            const prisonersTable = document.querySelector('#prisoners .table.table-striped');
            if (prisonersTable) prisonersTable.style.display = "none";
        }

        // Bereich: "ktw_no_transports" - Hinweisbox
        const ktwNoTransportsBox = document.getElementById('ktw_no_transports');
        if (ktwNoTransportsBox && ktwNoTransportsBox.classList.contains('alert-info')) {
            ktwNoTransportsBox.style.display = window.HIDE_KTW_NO_TRANSPORTS ? 'none' : 'block';
        }

        // Patienten-Spoiler-Button-Bereich ausblenden
        const patientButtonForm = document.getElementById('patient_button_form');
        if (patientButtonForm) {
            patientButtonForm.style.display = window.HIDE_PATIENT_BUTTON_FORM ? 'none' : 'block';
        }

        // Patienten-Anforderungen (rote Box) zusätzlich unabhängig ausblenden
        const patientRequirementsBox = document.getElementById('patient_missing_requirements');
        if (patientRequirementsBox) {
            patientRequirementsBox.style.setProperty('display', window.HIDE_PATIENT_BUTTON_FORM ? 'none' : 'block', 'important');
        }

        // Einzelnen Button (z. B. "btn-default btn-xs pull-right") ein-/ausblenden
        const rightButton = document.querySelector('.btn.btn-default.btn-xs.pull-right');
        if (rightButton) {
            rightButton.style.display = window.HIDE_PULLRIGHT_BUTTON ? 'none' : 'inline-block';
        }

        document.querySelectorAll('.btn-group.pull-right').forEach(el => {
            const textContent = el.innerText.toLowerCase();
            if (textContent.includes('rückalarmieren')) {
                el.style.display = window.HIDE_BUTTON_GROUP_PULL_RIGHT ? 'none' : 'block';
            }
        });

    }

    function addSpoilerButtonForPatientBlocks() {
        if (!window.ENABLE_PATIENT_SPOILER) return;
        let patientBlocks = document.querySelectorAll('.mission_patient');
        if (patientBlocks.length < window.PATIENT_SPOILER_MIN_COUNT) return;
        if (document.getElementById('togglePatientBlockButton')) return;

        let parent = patientBlocks[0].parentNode;
        let wrapper = document.createElement("div");
        wrapper.style.marginBottom = "10px";

        let button = document.createElement("button");
        button.id = "togglePatientBlockButton";
        button.classList.add("btn", "btn-xl", "btn-primary");
        button.innerText = "Patienten anzeigen";

        patientBlocks.forEach(block => block.style.display = "none");

        button.addEventListener("click", function () {
            const visible = patientBlocks[0].style.display !== "none";
            patientBlocks.forEach(block => block.style.display = visible ? "none" : "block");
            button.innerText = visible ? "Patienten anzeigen" : "Patienten ausblenden";
        });

        wrapper.appendChild(button);
        parent.insertBefore(wrapper, patientBlocks[0]);
    }

    function addSpoilerButtonToAAO(iframe) {
        let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) return;
        let target = iframeDoc.getElementById("mission_aao_no_category");
        if (!target || target.dataset.spoilerAdded) return;
        target.dataset.spoilerAdded = "true";

        if (!window.ENABLE_AAO_SPOILER) return;

        let button = document.createElement("button");
        button.classList.add("btn", "btn-xl", "btn-primary");
        button.style.marginBottom = "10px";
        button.innerText = "Einzelfahrzeuge anzeigen";

        target.style.display = "none";

        button.addEventListener("click", function () {
            const visible = target.style.display !== "none";
            target.style.display = visible ? "none" : "block";
            button.innerText = visible ? "Einzelfahrzeuge anzeigen" : "Einzelfahrzeuge ausblenden";
        });

        target.parentNode.insertBefore(button, target);
    }

    function addSpoilerButtonForTabs() {
        if (!window.ENABLE_TABS_SPOILER) return;
        let tabs = document.getElementById("aao-tabs");
        let content = document.querySelector(".tab-content");
        if (!tabs || !content || document.getElementById("toggleTabsButton")) return;

        let button = document.createElement("button");
        button.id = "toggleTabsButton";
        button.classList.add("btn", "btn-xl", "btn-primary");
        button.style.marginBottom = "10px";
        button.innerText = "AAO-Tabs anzeigen";

        tabs.style.display = "none";
        content.style.display = "none";

        button.addEventListener("click", function () {
            const visible = tabs.style.display !== "none";
            tabs.style.display = content.style.display = visible ? "none" : "block";
            button.innerText = visible ? "AAO-Tabs anzeigen" : "AAO-Tabs ausblenden";
        });

        tabs.parentNode.insertBefore(button, tabs);
    }

    function addSpoilerButtonsToAaoColumns() {
        if (!window.ENABLE_AAO_COLUMN_SPOILERS) return;
        const columns = document.querySelectorAll('[id^="aao_category_"] .col-sm-2.col-xs-4');
        columns.forEach((col, index) => {
            if (col.dataset.spoilerAdded) return;
            col.dataset.spoilerAdded = 'true';
            const children = Array.from(col.children);
            if (children.length === 0) return;
            const button = document.createElement('button');
            button.classList.add('btn', 'btn-xs', 'btn-primary');
            button.style.marginBottom = '5px';
            button.innerText = 'Einträge anzeigen';
            const contentWrapper = document.createElement('div');
            contentWrapper.style.display = 'none';
            children.forEach(child => contentWrapper.appendChild(child));
            button.addEventListener('click', () => {
                const isVisible = contentWrapper.style.display !== 'none';
                contentWrapper.style.display = isVisible ? 'none' : 'block';
                button.innerText = isVisible ? 'Einträge anzeigen' : 'Einträge ausblenden';
            });
            col.appendChild(button);
            col.appendChild(contentWrapper);
        });
    }

    function addSpoilerButtonForVehicleTable() {
        if (!window.ENABLE_VEHICLE_SPOILER) return false;
        let vehicleTable = document.getElementById('mission_vehicle_at_mission');
        if (!vehicleTable || vehicleTable.dataset.spoilerAdded) return false;
        vehicleTable.dataset.spoilerAdded = "true";
        let button = document.createElement("button");
        button.classList.add("btn", "btn-xl", "btn-primary");
        button.style.marginBottom = "10px";
        button.innerText = "Fahrzeuge anzeigen";
        vehicleTable.style.display = "none";
        button.addEventListener("click", function () {
            const visible = vehicleTable.style.display !== "none";
            vehicleTable.style.display = visible ? "none" : "table";
            button.innerText = visible ? "Fahrzeuge anzeigen" : "Fahrzeuge ausblenden";
        });
        vehicleTable.parentNode.insertBefore(button, vehicleTable);
        return true;
    }

    function addSpoilerButtonForDrivingVehicles() {
        if (!window.ENABLE_VEHICLE_SPOILER) return false;
        let drivingBlock = document.getElementById('mission_vehicle_driving');
        if (!drivingBlock || drivingBlock.dataset.spoilerAdded) return false;
        drivingBlock.dataset.spoilerAdded = "true";
        let button = document.createElement("button");
        button.classList.add("btn", "btn-xl", "btn-primary");
        button.style.marginBottom = "10px";
        button.innerText = "Fahrzeuge anzeigen";
        drivingBlock.style.display = "none";
        button.addEventListener("click", function () {
            const visible = drivingBlock.style.display !== "none";
            drivingBlock.style.display = visible ? "none" : "block";
            button.innerText = visible ? "Fahrzeuge anzeigen" : "Fahrzeuge ausblenden";
        });
        drivingBlock.parentNode.insertBefore(button, drivingBlock);
        return true;
    }

    function addSpoilerButtonForMaxDistanceGroup() {
        if (!window.ENABLE_MAX_DISTANCE_GROUP_SPOILER) return;
        const group = document.getElementById('group_max_distance');
        if (!group || group.dataset.spoilerAdded) return;
        group.dataset.spoilerAdded = "true";
        const wrapper = document.createElement("div");
        group.parentNode.insertBefore(wrapper, group);
        wrapper.appendChild(group);
        const button = document.createElement("button");
        button.classList.add("btn", "btn-xl", "btn-primary");
        button.style.marginBottom = "5px";
        button.innerText = "Max-Distanz-Buttons anzeigen";
        wrapper.insertBefore(button, group);
        group.style.display = "none";
        button.addEventListener("click", () => {
            const visible = group.style.display !== "none";
            group.style.display = visible ? "none" : "inline-block";
            button.innerText = visible ? "Max-Distanz-Buttons anzeigen" : "Max-Distanz-Buttons ausblenden";
        });
        return true;
    }

    function addSpoilerButtonForVehicleListStep() {
        if (!window.ENABLE_AVAILABLE_VEHICLE_LIST_SPOILER) return;
        const vehicleListStep = document.getElementById('vehicle_list_step');
        const dispatchButtons = document.getElementById('dispatch_buttons');
        if (!vehicleListStep || !dispatchButtons || document.getElementById('toggleVehicleListStepButton')) return;
        const button = document.createElement('button');
        button.id = 'toggleVehicleListStepButton';
        button.classList.add('btn', 'btn-success');
        button.innerText = 'Fahrzeugliste anzeigen';
        vehicleListStep.style.display = 'none';
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const visible = vehicleListStep.style.display !== 'none';
            vehicleListStep.style.display = visible ? 'none' : 'block';
            button.innerText = visible ? 'Fahrzeuge anzeigen' : 'Fahrzeuge ausblenden';
        });
        dispatchButtons.insertBefore(button, dispatchButtons.firstChild);
    }

    function addSpoilerButtonForVehicleTableGeneral() {
        if (!window.ENABLE_VEHICLE_TABLE_SPOILER) return false;
        const vehicleTable = document.getElementById('vehicle_table');
        if (!vehicleTable || vehicleTable.dataset.spoilerAdded) return false;
        vehicleTable.dataset.spoilerAdded = "true";
        const button = document.createElement("button");
        button.classList.add("btn", "btn-xl", "btn-primary");
        button.style.marginBottom = "10px";
        button.innerText = "Fahrzeugtabelle anzeigen";
        vehicleTable.style.display = "none";
        button.addEventListener("click", function () {
            const visible = vehicleTable.style.display !== "none";
            vehicleTable.style.display = visible ? "none" : "table";
            button.innerText = visible ? "Fahrzeuge anzeigen" : "Fahrzeuge ausblenden";
        });
        vehicleTable.parentNode.insertBefore(button, vehicleTable);
        return true;
    }

    function checkForLightboxAndAddButton() {
        let iframes = document.querySelectorAll('iframe[id^="lightbox_iframe_"]');
        if (window.ENABLE_AAO_SPOILER && iframes.length > 0) {
            iframes.forEach(iframe => addSpoilerButtonToAAO(iframe));
        }
        if (addSpoilerButtonForVehicleTable()) {
            clearInterval(vehicleTableCheckInterval);
        }
        toggleBreadcrumb();
        fixMissionHeaderInfo();
        addSpoilerButtonForPatientBlocks();
        addSpoilerButtonForTabs();
        addSpoilerButtonsToAaoColumns();
        addSpoilerButtonForDrivingVehicles();
        addSpoilerButtonForMaxDistanceGroup();
        addSpoilerButtonForVehicleListStep();
        addSpoilerButtonForVehicleTableGeneral();
    }

    function observeLightbox() {
        const observer = new MutationObserver(() => {
            const iframe = document.querySelector('iframe[id^="lightbox_iframe_"]');
            if (iframe && !iframe.dataset.styleInjected) {
                iframe.dataset.styleInjected = "true";
                iframe.addEventListener('load', () => {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        if (!iframeDoc) return;
                        const style = iframeDoc.createElement('style');
                        style.textContent = `
                        .alert-success { display: ${window.ENABLE_SUCCESS_ALERT ? 'none' : 'block'} !important; }
                        #missing_text.alert-danger.alert-missing-vehicles { display: ${window.ENABLE_MISSING_ALERT ? 'none' : 'block'} !important; }
                        .alert-danger { display: block !important; }
                        .alert-danger:has(p:contains('Ein Fahrzeug hat einen Sprechwunsch!')) { display: ${window.ENABLE_SPEECH_REQUEST_ALERT ? 'none' : 'block'} !important; }
                        .alert-danger:has(p:contains('Benötigte Betreuungs- und Verpflegungsausstattung')) { display: ${window.ENABLE_CARE_AND_SUPPLY ? 'none' : 'block'} !important; }
                        .alert-info:has(p:contains('Sprechwunsch')) { display: ${window.ENABLE_SPEECH_REQUEST_INFOBOX ? 'none' : 'block'} !important; }
                        `;
                        iframeDoc.head.appendChild(style);
                        checkForLightboxAndAddButton();
                    } catch (err) {
                        console.warn("Fehler beim Injektion in Lightbox-iFrame:", err);
                    }
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // === INITIALISIERUNG === \\
    loadSettings();
    createSettingsGUI();

    let vehicleTableCheckInterval = setInterval(() => {
        if (addSpoilerButtonForVehicleTable()) {
            clearInterval(vehicleTableCheckInterval);
        }
    }, 1000);

    let observer = new MutationObserver(() => {
        checkForLightboxAndAddButton();
        hideOptionalElements();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    checkForLightboxAndAddButton();
    observeAndToggleEventInfo();
    observeLightbox();
})();
