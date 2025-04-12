// ==UserScript==
// @name         [LSS] Spoileralarm
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Fügt optional Spoiler-Buttons für AAO-Einträge ohne Kategorie, Fahrzeuge auf Anfahrt oder am Einsatort, Freie Fahrzeuge sowie Patienten ein.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // === KONFIGURATION === \\ true = Spoiler da, false = Spoiler weg
    const ENABLE_AAO_SPOILER = true;
    const ENABLE_VEHICLE_SPOILER = true;
    const ENABLE_PATIENT_SPOILER = true;
    const ENABLE_VEHICLE_LIST_SPOILER = true;
    const PATIENT_SPOILER_MIN_COUNT = 10;
    // ==== Ende der Konfiguration === \\

    // === AAO-Spoiler in Lightbox ===
    function addSpoilerButtonToAAO(iframe) {
        if (!ENABLE_AAO_SPOILER) return;

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        const target = iframeDoc.getElementById("mission_aao_no_category");
        if (!target || target.dataset.spoilerAdded) return;

        target.dataset.spoilerAdded = "true";

        const button = document.createElement("button");
        button.classList.add("btn", "btn-xl", "btn-primary");
        button.style.marginBottom = "10px";
        button.innerText = "Einzelfahrzeuge anzeigen";

        target.style.display = "none";

        button.addEventListener("click", () => {
            const visible = target.style.display !== "none";
            target.style.display = visible ? "none" : "block";
            button.innerText = visible ? "Einzelfahrzeuge anzeigen" : "Einzelfahrzeuge ausblenden";
        });

        target.parentNode.insertBefore(button, target);
    }

    // === Fahrzeuge am Einsatzort ===
    function addSpoilerButtonForVehicleTable() {
        if (!ENABLE_VEHICLE_SPOILER) return false;

        const table = document.getElementById("mission_vehicle_at_mission");
        if (!table || table.dataset.spoilerAdded) return false;

        table.dataset.spoilerAdded = "true";

        const button = document.createElement("button");
        button.classList.add("btn", "btn-xl", "btn-primary");
        button.style.marginBottom = "10px";
        button.innerText = "Fahrzeuge am Einsatzort anzeigen";

        table.style.display = "none";

        button.addEventListener("click", () => {
            const visible = table.style.display !== "none";
            table.style.display = visible ? "none" : "table";
            button.innerText = visible ? "Fahrzeuge am Einsatzort anzeigen" : "Fahrzeuge am Einsatzort ausblenden";
        });

        table.parentNode.insertBefore(button, table);
        return true;
    }

    // === Fahrzeuge auf Anfahrt ===
    function addSpoilerButtonForDrivingVehicles() {
        if (!ENABLE_VEHICLE_SPOILER) return false;

        const block = document.getElementById("mission_vehicle_driving");
        if (!block || block.dataset.spoilerAdded) return false;

        block.dataset.spoilerAdded = "true";

        const button = document.createElement("button");
        button.classList.add("btn", "btn-xl", "btn-primary");
        button.style.marginBottom = "10px";
        button.innerText = "Anfahrende Fahrzeuge anzeigen";

        block.style.display = "none";

        button.addEventListener("click", () => {
            const visible = block.style.display !== "none";
            block.style.display = visible ? "none" : "block";
            button.innerText = visible ? "Anfahrende Fahrzeuge anzeigen" : "Anfahrende Fahrzeuge ausblenden";
        });

        block.parentNode.insertBefore(button, block);
        return true;
    }

    // === Patienten-Spoiler ===
    function addSpoilerButtonForPatientBlocks() {
        if (!ENABLE_PATIENT_SPOILER) return;

        const blocks = document.querySelectorAll(".mission_patient");
        if (blocks.length < PATIENT_SPOILER_MIN_COUNT) return;

        if (document.getElementById("togglePatientBlockButton")) return;

        const parent = blocks[0].parentNode;

        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "10px";

        const button = document.createElement("button");
        button.id = "togglePatientBlockButton";
        button.classList.add("btn", "btn-xl", "btn-primary");
        button.innerText = "Patienten anzeigen";

        blocks.forEach(b => b.style.display = "none");

        button.addEventListener("click", () => {
            const visible = blocks[0].style.display !== "none";
            blocks.forEach(b => b.style.display = visible ? "none" : "block");
            button.innerText = visible ? "Patienten anzeigen" : "Patienten ausblenden";
        });

        wrapper.appendChild(button);
        parent.insertBefore(wrapper, blocks[0]);
    }

    // === Freie Fahrzeugliste (oben rechts) ===
    function addSpoilerButtonForVehicleList() {
        if (!ENABLE_VEHICLE_LIST_SPOILER) return false;

        const vehicleList = document.getElementById("vehicle_list_step");
        const dispatchButtons = document.getElementById("dispatch_buttons");

        if (!vehicleList || !dispatchButtons) return false;
        if (document.getElementById("toggleFreeVehicleListButton")) return true;

        const button = document.createElement("button");
        button.id = "toggleFreeVehicleListButton";
        button.classList.add("btn", "btn-success", "btn-xl");
        button.style.marginRight = "0";
        button.innerText = "Fahrzeugliste anzeigen";
        button.type = 'button';

        // Unsichtbar machen (aber Platz behalten vermeiden wir per absolute)
        vehicleList.style.visibility = "hidden";
        vehicleList.style.position = "absolute";

        button.addEventListener("click", (e) => {
            e.stopPropagation();

            const isVisible = vehicleList.style.visibility === "hidden";

            if (isVisible) {
                vehicleList.style.visibility = "visible";
                vehicleList.style.position = "static";
                button.innerText = "Fahrzeugliste ausblenden";
            } else {
                vehicleList.style.visibility = "hidden";
                vehicleList.style.position = "absolute";
                button.innerText = "Fahrzeugliste anzeigen";
            }
        });

        const parent = dispatchButtons.closest(".pull-right");
        if (parent) {
            parent.insertBefore(button, dispatchButtons);
            return true;
        }

        return false;
    }

    // === Hauptfunktion zum Hinzufügen aller Spoilerbuttons ===
    function checkForLightboxAndAddButton() {
        const iframes = document.querySelectorAll('iframe[id^="lightbox_iframe_"]');

        iframes.forEach(iframe => {
            // Sofort prüfen, ob bereits geladen
            if (iframe.contentDocument?.readyState === "complete") {
                addSpoilerButtonToAAO(iframe);
            }

            // Alternativ: auf "load"-Event warten
            iframe.addEventListener("load", () => {
                addSpoilerButtonToAAO(iframe);
            });
        });

        addSpoilerButtonForDrivingVehicles();
        addSpoilerButtonForPatientBlocks();
        addSpoilerButtonForVehicleList();
    }

    // === Wiederholte Prüfung, ob Fahrzeuglisten sichtbar sind ===
    let vehicleSpoilerCheckInterval = setInterval(() => {
        const vehicleTableReady = addSpoilerButtonForVehicleTable();
        const vehicleListReady = addSpoilerButtonForVehicleList();

        if (vehicleTableReady && vehicleListReady) {
            clearInterval(vehicleSpoilerCheckInterval);
        }
    }, 1000);

    // === DOM-Änderungen beobachten ===
    let observer = new MutationObserver(() => {
        checkForLightboxAndAddButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // === Initialer Aufruf ===
    checkForLightboxAndAddButton();

})();
