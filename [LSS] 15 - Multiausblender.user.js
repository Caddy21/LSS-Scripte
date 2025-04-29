// ==UserScript==
// @name         [LSS] 15 - Multiausblender
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Blendet im Einsatzfenster AAO-Einträge, Fahrzeug-Tabellen, Patientenbereich und weitere Dinge individuell ein oder aus.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // === KONFIGURATION ===
    // true = Spoilerbutton aktiv / Infobereiche werden ausgeblendet
    // false = Spoilerbutton deaktiviert / Infobereiche bleiben sichtbar

    const HIDE_EVENT_INFO = true; // Eventinfo in der Einsatzliste (Blaue Box) ein- oder ausblenden
    const ENABLE_BREADCRUMB = true; // Navigationsleiste ein- oder ausblenden (Leiste bei geplanten Einsätzen ganz oben [Leitstelle > Name des Einsatzes]
    const FIX_MISSION_HEADER_INFO = true; // Einsatzinfo (Name / Adresse) fixieren
    const ENABLE_SUCCESS_ALERT = true; // Erfolgs-Meldungen (Grüne Box) ein- oder ausblenden
    const ENABLE_MISSING_ALERT = true; // Fehlende Fahrzeuge (Rote Box) ein- oder ausblenden
    const ENABLE_SPEECH_REQUEST_INFOBOX = false; // Sprechwunsch (Blaue Box) ein- oder ausblenden
    const ENABLE_SPEECH_REQUEST_ALERT = true; // Fahrzeug hat ein Sprechwunsch (Rote Box) ein- oder ausblenden
    const ENABLE_CARE_AND_SUPPLY = false; // Betreuung und Verpflegung (Rote Box) ein- oder ausblenden
    const ENABLE_PATIENT_SPOILER = true; // Spoiler für Patientenbereich (ab X Patienten)
    const ENABLE_AAO_SPOILER = true; // Spoiler für AAO-Einträge ohne Kategorie
    const ENABLE_TABS_SPOILER = false; // Spoiler für AAO-Tabs & Inhalte
    const ENABLE_AAO_COLUMN_SPOILERS = false; // Spoiler für die einzelnen AAO-Einträge
    const ENABLE_MISSION_SHARED_INFOBOX = true; // Info-Box „Dieser Einsatz wurde von...“ ein - oder ausblenden
    const ENABLE_VEHICLE_SPOILER = true; // Spoiler für Fahrzeug-Tabelle und anfahrende Fahrzeuge
    const ENABLE_RELEASE_ALL_INFOBOX = true; // Info-Box „Wirklich alle entlassen?“ ein- oder ausblenden
    const ENABLE_AVAILABLE_VEHICLE_LIST_SPOILER = true; // Spoiler für "Freie Fahrzeugliste" rechte Seite

    const PATIENT_SPOILER_MIN_COUNT = 10; // Aab dieser Patientenanzahl Spoiler erstellen (Blendet ab 10 Patienten diese aus)
    // ======================

    // Funktion um die Eventbox in der Einsatzliste ein- oder auszublenden
    function observeAndToggleEventInfo() {
        // CSS-Regel dynamisch je nach Einstellung
        const existingStyle = document.getElementById('style-hide-eventInfo');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'style-hide-eventInfo';

        if (HIDE_EVENT_INFO) {
            style.textContent = `
            #eventInfo {
                display: none !important;
            }
        `;
        } else {
            style.textContent = `
            #eventInfo {
                display: block !important;
            }
        `;
        }

        document.head.appendChild(style);

        // Falls JS es zwischendurch umstellt
        const enforceDisplay = () => {
            const box = document.querySelector('#eventInfo');
            if (box) {
                box.style.setProperty('display', HIDE_EVENT_INFO ? 'none' : 'block', 'important');
            }
        };

        // Direkt bei Start
        enforceDisplay();

        // Beobachte DOM-Änderungen
        const observerTarget = document.getElementById('missions_outer') || document.body;
        const observer = new MutationObserver(() => {
            enforceDisplay();
        });

        observer.observe(observerTarget, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }

    // Funktion zum Ausblenden der Navigationsleiste
    function toggleBreadcrumb() {
        const breadcrumb = document.querySelector('.breadcrumb'); // ✅ Punkt gehört hier in Anführungszeichen
        if (!breadcrumb) return;

        if (!ENABLE_BREADCRUMB) {
            breadcrumb.style.removeProperty('display');
        } else {
            breadcrumb.style.setProperty('display', 'none', 'important');
        }
    }

    // Funktion zur fixierung der Einsatzkopfleiste
    function fixMissionHeaderInfo() {
        if (!FIX_MISSION_HEADER_INFO) return;

        const header = document.querySelector('.mission_header_info.row');
        if (!header || header.dataset.fixed === "true") return;

        header.style.position = "sticky";
        header.style.top = "0";
        header.style.zIndex = "10"; // Unter dem Lightbox-Schließen-Button bleiben
        header.dataset.fixed = "true";
    }

    // Funktion zum Ein- oder Ausblenden verschiedener Infoboxen
    function hideOptionalElements() {
        // Erfolgsmeldungen ausblenden
        if (ENABLE_SUCCESS_ALERT) {
            document.querySelectorAll('.alert-success').forEach(el => {
                el.style.display = "none";
            });
        }

        // Fehlende Fahrzeuge ausblenden
        if (ENABLE_MISSING_ALERT) {
            const missingTextElement = document.getElementById('missing_text');
            if (
                missingTextElement &&
                missingTextElement.classList.contains('alert-danger') &&
                missingTextElement.classList.contains('alert-missing-vehicles')
            ) {
                missingTextElement.style.display = "none";
            }
        }

        // Betreuung & Verpflegung ein-/ausblenden (eindeutig über Text identifiziert)
        document.querySelectorAll('.alert.alert-danger').forEach(el => {
            if (el.innerText.includes('Benötigte Betreuungs- und Verpflegungsausstattung')) {
                el.style.display = ENABLE_CARE_AND_SUPPLY ? "none" : "block";
            }

            // Sprechwunsch-Infobox (alert-danger) ein-/ausblenden
            if (el.innerText.includes('Ein Fahrzeug hat einen Sprechwunsch!')) {
                el.style.display = ENABLE_SPEECH_REQUEST_ALERT ? "none" : "block";
            }
        });

        // Sprechwunsch-Infobox (alert-info) separat ein-/ausblenden
        document.querySelectorAll('.alert.alert-info').forEach(el => {
    if (el.innerText.includes('Sprechwunsch')) {
        el.style.display = ENABLE_SPEECH_REQUEST_INFOBOX ? "none" : "block";
    }

    if (el.innerText.includes('Dieser Einsatz wurde von')) {
        el.style.display = ENABLE_MISSION_SHARED_INFOBOX ? "none" : "block";
    }

    if (el.innerText.includes('Wirklich alle entlassen?')) {
        el.style.display = ENABLE_RELEASE_ALL_INFOBOX ? "none" : "block";
    }
});
    }

    // Spoiler für Patienten-Blöcke bei Überschreitung eines bestimmten Limits
    function addSpoilerButtonForPatientBlocks() {
        if (!ENABLE_PATIENT_SPOILER) return;

        let patientBlocks = document.querySelectorAll('.mission_patient');
        if (patientBlocks.length < PATIENT_SPOILER_MIN_COUNT) return;
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

   // Spoiler für Einzelfahrzeuge (AAO ohne Kategorie)
    function addSpoilerButtonToAAO(iframe) {
        let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) return;

        let target = iframeDoc.getElementById("mission_aao_no_category");
        if (!target || target.dataset.spoilerAdded) return;
        target.dataset.spoilerAdded = "true";

        if (!ENABLE_AAO_SPOILER) return;

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

    // Spoiler für AAO-Tabs und Tab-Inhalte
    function addSpoilerButtonForTabs() {
        if (!ENABLE_TABS_SPOILER) return;

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

    // Spoiler für die einzelnen AAO-Spalten
    function addSpoilerButtonsToAaoColumns() {
        if (!ENABLE_AAO_COLUMN_SPOILERS) return;

        const columns = document.querySelectorAll('[id^="aao_category_"] .col-sm-2.col-xs-4');

        columns.forEach((col, index) => {
            if (col.dataset.spoilerAdded) return;
            col.dataset.spoilerAdded = 'true';

            const children = Array.from(col.children);
            if (children.length === 0) return;

            // Erstelle Button
            const button = document.createElement('button');
            button.classList.add('btn', 'btn-xs', 'btn-primary');
            button.style.marginBottom = '5px';
            button.innerText = 'Einträge anzeigen';

            // Wrapper für Inhalt erstellen
            const contentWrapper = document.createElement('div');
            contentWrapper.style.display = 'none';

            // Kinder in den Wrapper verschieben
            children.forEach(child => contentWrapper.appendChild(child));

            // Klick-Logik
            button.addEventListener('click', () => {
                const isVisible = contentWrapper.style.display !== 'none';
                contentWrapper.style.display = isVisible ? 'none' : 'block';
                button.innerText = isVisible ? 'Einträge anzeigen' : 'Einträge ausblenden';
            });

            // Elemente einfügen
            col.appendChild(button);
            col.appendChild(contentWrapper);
        });
    }

    // Spoiler für Fahrzeug-Tabelle unter dem Einsatz
    function addSpoilerButtonForVehicleTable() {
        if (!ENABLE_VEHICLE_SPOILER) return false;

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

    // Spoiler für anfahrende Fahrzeuge
    function addSpoilerButtonForDrivingVehicles() {
        if (!ENABLE_VEHICLE_SPOILER) return false;

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

    // Spoiler für „Freie Fahrzeugliste“ in Lightbox
    function addSpoilerButtonForVehicleListStep() {
        if (!ENABLE_AVAILABLE_VEHICLE_LIST_SPOILER) return;

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

    // Initiale Prüfung auf Seite/Lightbox und Hinzufügen der Spoiler
    function checkForLightboxAndAddButton() {
        let iframes = document.querySelectorAll('iframe[id^="lightbox_iframe_"]');
        if (ENABLE_AAO_SPOILER && iframes.length > 0) {
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
        addSpoilerButtonForVehicleListStep();

    }

    // Beobachtet Klicks auf Lightbox-Buttons und aktiviert Spoiler nach kurzer Verzögerung
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
                        .alert-success { display: ${ENABLE_SUCCESS_ALERT ? 'none' : 'block'} !important; }
                        #missing_text.alert-danger.alert-missing-vehicles { display: ${ENABLE_MISSING_ALERT ? 'none' : 'block'} !important; }
                        .alert-danger {
                            display: block !important;
                        }
                        .alert-danger:has(p:contains('Ein Fahrzeug hat einen Sprechwunsch!')) {
                            display: ${ENABLE_SPEECH_REQUEST_ALERT ? 'none' : 'block'} !important;
                        }
                        .alert-danger:has(p:contains('Benötigte Betreuungs- und Verpflegungsausstattung')) {
                            display: ${ENABLE_CARE_AND_SUPPLY ? 'none' : 'block'} !important;
                        }
                        .alert-info:has(p:contains('Sprechwunsch')) {
                            display: ${ENABLE_SPEECH_REQUEST_INFOBOX ? 'none' : 'block'} !important;
                        }
                    `;
                        iframeDoc.head.appendChild(style);

                        checkForLightboxAndAddButton(); // Danach die Buttons
                    } catch (err) {
                        console.warn("Fehler beim Injektion in Lightbox-iFrame:", err);
                    }
                });
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Intervall, um Fahrzeug-Tabelle bei Ladezeit zu erkennen
    let vehicleTableCheckInterval = setInterval(() => {
        if (addSpoilerButtonForVehicleTable()) {
            clearInterval(vehicleTableCheckInterval);
        }
    }, 1000);

    // DOM-Änderungen beobachten (z.B. bei AJAX-Content)
    let observer = new MutationObserver(() => {
        checkForLightboxAndAddButton();
        hideOptionalElements();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initialer Aufruf beim Laden
    checkForLightboxAndAddButton();
    observeAndToggleEventInfo();
    observeLightbox();
})();
