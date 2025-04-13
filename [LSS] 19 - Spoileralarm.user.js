// ==UserScript==
// @name         [LSS] 15 - Spoiler für AAOs, Fahrzeuge und Patientenbereich (konfigurierbar)
// @namespace    https://www.leitstellenspiel.de/
// @version      1.7
// @description  Fügt Spoiler-Buttons für AAO-Einträge, Fahrzeug-Tabellen, Patientenbereich und weitere hinzu – alles individuell ein-/ausblendbar.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // === KONFIGURATION ===
    const ENABLE_AAO_SPOILER = true;                        // Einzelfahrzeuge (AAO ohne Kategorie) via Button ein-/ausblendbar machen
    const ENABLE_VEHICLE_SPOILER = true;                    // Fahrzeug-Tabelle & Anfahrende Fahrzeuge per Button ein-/ausblenden
    const ENABLE_PATIENT_SPOILER = true;                    // Patientenbereich ab X Patienten ein-/ausblenden
    const ENABLE_AVAILABLE_VEHICLE_LIST_SPOILER = true;     // "Freie Fahrzeugliste" in Lightbox per Button sichtbar
    const ENABLE_SUCCESS_ALERT = true;                      // Grüne Erfolgs-Meldung automatisch ausblenden
    const ENABLE_MISSING_ALERT = false;                     // Rote Warnung ("Fehlende Fahrzeuge") automatisch ausblenden
    const ENABLE_TABS_SPOILER = false;                       // Tabs und Tab-Inhalte (AAO-Tabs) per Button versteckbar
    const PATIENT_SPOILER_MIN_COUNT = 3;                    // Ab wie vielen Patienten der Button erscheinen soll
    // ======================

    // Funktion: Fügt Spoiler-Button im iFrame hinzu, um AAO-Einträge ohne Kategorie ein-/auszublenden
    function addSpoilerButtonToAAO(iframe) {
        let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) return;

        let target = iframeDoc.getElementById("mission_aao_no_category");
        if (!target || target.dataset.spoilerAdded) return;

        target.dataset.spoilerAdded = "true";

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

    // Funktion: Fügt Button hinzu, um Fahrzeug-Tabelle unter dem Einsatz per Button ein-/auszublenden
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

    // Funktion: Fügt Button hinzu, um anfahrende Fahrzeuge unter dem Einsatz ein-/auszublenden
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

    // Funktion: Fügt Button hinzu, um Patientenblöcke bei vielen Patienten sichtbar zu machen
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

    // Funktion: Blendet automatisch bestimmte Meldungs-Bereiche aus (z. B. grüne & rote Alerts)
    function hideOptionalElements() {
        if (!ENABLE_SUCCESS_ALERT) {
            document.querySelectorAll('.alert-success.fade.in').forEach(el => el.style.display = "none");
        }

        if (!ENABLE_MISSING_ALERT) {
            let missingText = document.getElementById('missing_text');
            if (missingText) missingText.style.display = "none";
        }
    }

    // Funktion: Fügt Button hinzu, um AAO-Tabs und Inhalte ein-/auszublenden
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

    // Funktion: Fügt grünen Button hinzu, um "Freie Fahrzeugliste" (in Lightbox) ein-/auszublenden
    function addSpoilerButtonForVehicleListStep() {
        if (!ENABLE_AVAILABLE_VEHICLE_LIST_SPOILER) return;

        const vehicleListStep = document.getElementById('vehicle_list_step');
        if (!vehicleListStep || document.getElementById('toggleVehicleListStepButton')) return;

        const button = document.createElement('button');
        button.id = 'toggleVehicleListStepButton';
        button.classList.add('btn', 'btn-xl', 'btn-success');
        button.style.marginBottom = '10px';
        button.innerText = 'Freie Fahrzeugliste anzeigen';

        vehicleListStep.style.display = 'none';

        button.addEventListener('click', function (e) {
            e.preventDefault();
            const visible = vehicleListStep.style.display !== 'none';
            vehicleListStep.style.display = visible ? 'none' : 'block';
            button.innerText = visible ? 'Freie Fahrzeugliste anzeigen' : 'Freie Fahrzeugliste ausblenden';
        });

        vehicleListStep.parentNode.insertBefore(button, vehicleListStep);
    }

    // Funktion: Fügt alle relevanten Spoiler-Buttons ein, wenn Lightbox oder Seite geladen wird
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
        hideOptionalElements();
        addSpoilerButtonForTabs();
        addSpoilerButtonForVehicleListStep();
    }

    // Funktion: Wartet auf Klick auf eine Lightbox, und führt Spoiler-Aktionen nach kurzem Delay aus
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

    // Initialer Check bei Ladezeit
    let vehicleTableCheckInterval = setInterval(() => {
        if (addSpoilerButtonForVehicleTable()) {
            clearInterval(vehicleTableCheckInterval);
        }
    }, 1000);

    // Beobachtet DOM-Änderungen (z. B. neue Tabs oder Inhalte) und wendet Spoiler automatisch an
    let observer = new MutationObserver(() => {
        checkForLightboxAndAddButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    checkForLightboxAndAddButton();
    observeLightbox();
})();
