// ==UserScript==
// @name         [LSS] Kleinwachen ausblender
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Blendet Kleinwachen in Eigenen- und Verbandsschulen aus.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      leitstellenspiel.de
// ==/UserScript==

(function () {
    'use strict';

    const DEBUG = false;
    const STORAGE_KEY = "hideSmallBuildings";

    function log(...args) {
        if (DEBUG) console.log("[Kleinwachen-Script]", ...args);
    }

    let smallBuildingIds = new Set();
    let hideEnabled = GM_getValue(STORAGE_KEY, true);
    let accordionObserver = null;
    let bodyObserver = null;

    // Lädt alle Gebäude über die API und speichert die IDs der Kleinwachen im GM_Speicher
    function loadBuildings() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://www.leitstellenspiel.de/api/buildings",
                onload: function (response) {
                    try {
                        const buildings = JSON.parse(response.responseText);
                        buildings
                            .filter(b => b.small_building === true)
                            .forEach(b => smallBuildingIds.add(String(b.id)));

                        log("Kleinwachen geladen:", smallBuildingIds.size);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: reject
            });
        });
    }

    // Fügt eine CSS-Klasse ein, die Kleinwachen ausblendet
    function injectCSS() {
        const style = document.createElement("style");
        style.id = "lss-small-building-style";
        style.innerHTML = `
        .lss-hide-small {
            display: none !important;
        }
    `;
        document.head.appendChild(style);
    }

    // Prüft alle geladenen Panels und blendet Kleinwachen aus
    function processAllPanels() {
    // 1️⃣ Normale Schulen
    document.querySelectorAll('#accordion .building_list').forEach(panel => {
        const buildingId = panel.getAttribute("building_id");
        if (!buildingId) return;

        if (smallBuildingIds.has(buildingId)) {
            if (hideEnabled) {
                panel.classList.add("lss-hide-small");
            } else {
                panel.classList.remove("lss-hide-small");
            }
        }
    });

    // 2️⃣ Verbandsschulen
    document.querySelectorAll('#accordion .panel-heading.personal-select-heading').forEach(panelHeading => {
        const buildingId = panelHeading.getAttribute("building_id");
        if (!buildingId) return;

        const panel = panelHeading.closest('.panel'); // das ganze Panel ausblenden
        if (!panel) return;

        if (smallBuildingIds.has(buildingId)) {
            if (hideEnabled) {
                panel.classList.add("lss-hide-small");
            } else {
                panel.classList.remove("lss-hide-small");
            }
        }
    });

    log("Panels verarbeitet (inkl. Verbandsschulen)");
}

    // Beobachtet Änderungen bei den Panels
    function attachAccordionObserver() {
        const accordion = document.querySelector("#accordion");
        if (!accordion) return;

        if (accordionObserver) accordionObserver.disconnect();

        accordionObserver = new MutationObserver(() => {
            processAllPanels();
        });

        accordionObserver.observe(accordion, {
            childList: true,
            subtree: true
        });

        log("Accordion Observer aktiv.");
    }

    // Erkennt, wenn das Accordion komplett neu erzeugt wird und bindet Observer neu
    function watchForAccordionReplacement() {
        bodyObserver = new MutationObserver(() => {
            if (document.querySelector("#accordion")) {
                attachAccordionObserver();
                processAllPanels();
            }
        });

        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        log("Body Observer aktiv (Rebind-Schutz).");
    }

    // Reagiert auf Lehrgangwechsel und stößt erneute Panel-Verarbeitung an
    function attachEducationListener() {
        const select = document.querySelector("#education_select");
        if (!select) return;

        select.addEventListener("change", () => {
            log("Lehrgang geändert → reprocess");
            setTimeout(processAllPanels, 500);
        });

        log("Education Listener aktiv.");
    }

    // Erstellt Button neben "Personal auswählen"
   function createToggleButton() {

    const accordion = document.querySelector("#accordion");
    if (!accordion) return;

    const h3 = accordion.previousElementSibling;
    if (!h3 || h3.tagName !== "H3") return;

    if (h3.querySelector(".lss-toggle-btn")) return;

    // Falls eigenes Schul-Layout mit rechtem Button-Block existiert
    const rightBlock = h3.querySelector("#global-schooling-assigner");

    // Wrapper für linken Bereich (Text + Toggle)
    let leftWrapper = h3.querySelector(".lss-left-wrapper");

    if (!leftWrapper) {
        leftWrapper = document.createElement("span");
        leftWrapper.className = "lss-left-wrapper";
        leftWrapper.style.display = "flex";
        leftWrapper.style.alignItems = "center";
        leftWrapper.style.gap = "10px";

        // Textnode sichern
        const textNode = Array.from(h3.childNodes)
            .find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);

        if (textNode) {
            leftWrapper.appendChild(textNode);
        }

        h3.insertBefore(leftWrapper, h3.firstChild);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-warning btn-xs lss-toggle-btn";
    btn.textContent = hideEnabled
        ? "Kleinwachen anzeigen"
        : "Kleinwachen ausblenden";

    btn.addEventListener("click", () => {
        hideEnabled = !hideEnabled;
        GM_setValue(STORAGE_KEY, hideEnabled);
        btn.textContent = hideEnabled
            ? "Kleinwachen anzeigen"
            : "Kleinwachen ausblenden";
        processAllPanels();
    });

    leftWrapper.appendChild(btn);

    // Falls kein Flex gesetzt ist (Verbandsschulen)
    if (!rightBlock) {
        h3.style.display = "flex";
        h3.style.alignItems = "center";
        h3.style.gap = "10px";
    }

    log("Toggle Button links neben H3-Text eingefügt.");
}

    // Startet das Script
    function init() {
        injectCSS();
        const wait = setInterval(() => {
            if (document.querySelector("#accordion")) {
                clearInterval(wait);

                loadBuildings().then(() => {
                    processAllPanels();
                    attachAccordionObserver();
                    watchForAccordionReplacement();
                    attachEducationListener();
                    createToggleButton();
                });
            }
        }, 500);
    }

    init();

})();
