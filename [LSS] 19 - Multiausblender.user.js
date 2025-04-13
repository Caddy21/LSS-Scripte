// ==UserScript==
// @name         [LSS] 15 - Multiausblender
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Blendet AAO-Einträge, Fahrzeug-Tabellen, Patientenbereich und weitere Dinge individuell ein oder aus.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // === KONFIGURATION ===
    // true = Spoilerbutton aktiv / Infobereiche beim Laden ausgeblendet
    // false = Spoilerbutton deaktiviert / Infobereiche beim Laden sichtbar
    const ENABLE_SUCCESS_ALERT = true;                      // Erfolgs-Meldungen ein- oder ausblenden
    const ENABLE_MISSING_ALERT = true;                      // Fehlende Fahrzeuge ein- oder ausblenden
    const ENABLE_CARE_AND_SUPPLY = false;                    // Betreuung und Verpflegung ein- oder ausblenden
    const ENABLE_PATIENT_SPOILER = true;                    // Spoiler für Patientenbereich (ab X Patienten)
    const ENABLE_AAO_SPOILER = true;                        // Spoiler für AAO-Einträge ohne Kategorie
    const ENABLE_TABS_SPOILER = false;                       // Spoiler für AAO-Tabs & Inhalte
    const ENABLE_VEHICLE_SPOILER = true;                    // Spoiler für Fahrzeug-Tabelle und anfahrende Fahrzeuge
    const ENABLE_AVAILABLE_VEHICLE_LIST_SPOILER = true;     // Spoiler für "Freie Fahrzeugliste" (Lightbox)

    const PATIENT_SPOILER_MIN_COUNT = 10;                    // Spoiler ab dieser Patientenanzahl aktiv
    // ======================

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
                el.style.display = ENABLE_CARE_AND_SUPPLY ? "block" : "none";
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

    // Fügt Spoiler-Button für Einzelfahrzeuge (AAO ohne Kategorie) im Lightbox-iFrame ein
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

    // Spoiler-Button für Fahrzeug-Tabelle unter dem Einsatz
    function addSpoilerButtonForVehicleTable() {
        if (!ENABLE_VEHICLE_SPOILER) return false;

        let vehicleTable = document.getElementById('mission_vehicle_at_mission');
        if (!vehicleTable || vehicleTable.dataset.spoilerAdded) return false;
        vehicleTable.dataset.spoilerAdded = "true";

        let button = document.createElement("button");
        button.classList.add("btn", "btn-xl", "btn-primary");
        button.style.marginBottom = "10px";
        button.innerText = "Fahrzeug-Tabelle anzeigen";

        vehicleTable.style.display = "none";

        button.addEventListener("click", function () {
            const visible = vehicleTable.style.display !== "none";
            vehicleTable.style.display = visible ? "none" : "table";
            button.innerText = visible ? "Fahrzeug-Tabelle anzeigen" : "Fahrzeug-Tabelle ausblenden";
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
        button.innerText = "Anfahrende Fahrzeuge anzeigen";

        drivingBlock.style.display = "none";

        button.addEventListener("click", function () {
            const visible = drivingBlock.style.display !== "none";
            drivingBlock.style.display = visible ? "none" : "block";
            button.innerText = visible ? "Anfahrende Fahrzeuge anzeigen" : "Anfahrende Fahrzeuge ausblenden";
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
        button.innerText = 'Freie Fahrzeugliste anzeigen';

        vehicleListStep.style.display = 'none';

        button.addEventListener('click', function (e) {
            e.preventDefault();
            const visible = vehicleListStep.style.display !== 'none';
            vehicleListStep.style.display = visible ? 'none' : 'block';
            button.innerText = visible ? 'Freie Fahrzeugliste anzeigen' : 'Freie Fahrzeugliste ausblenden';
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

        addSpoilerButtonForDrivingVehicles();
        addSpoilerButtonForPatientBlocks();
        addSpoilerButtonForTabs();
        addSpoilerButtonForVehicleListStep();
    }

    // Beobachtet Klicks auf Lightbox-Buttons und aktiviert Spoiler nach kurzer Verzögerung
    function observeLightbox() {
        const openButtons = document.querySelectorAll('.lightbox-open');
        openButtons.forEach(button => {
            button.addEventListener('click', () => {
                setTimeout(() => {
                    checkForLightboxAndAddButton();
                }, 500);
            });
        });
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
    observeLightbox();
})();
