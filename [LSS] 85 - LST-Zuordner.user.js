// ==UserScript==
// @name         [LSS] LST-Zuordner
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @author       Caddy21
// @description  Ordnet mehrere Gebäude gesammelt einer anderen Leitstelle zu.
// @match        https://www.leitstellenspiel.de/buildings/*
// @match        https://polizei.leitstellenspiel.de/buildings/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==
(() => {
    "use strict";
    // true = ausführliches Debugprotokoll, false = keine Konsolenausgaben
    const debug = false;
    const BUILDINGS_API = "https://api.lss-manager.de/de_DE/buildings";
    const EXCLUDED_TYPES = new Set(["7"]);
    const ASSIGN_DELAY = 400;
    const MENU_DELAY = 120;
    const PREFIX = "[LSS Massen-Zuordnung]";
    const startTime = performance.now();

    let buildingTypes = {};
    let leitstellen = [];
    let toolbar;
    let typeSelect;
    let targetSelect;
    let assignButton;
    let countLabel;
    let busy = false;
    let menuScanDone = false;

    function log(step, ...args) {
        if (!debug) return;
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`${PREFIX} [+${elapsed}s] ${step}`, ...args);
    }

    function warn(step, ...args) {
        if (!debug) return;
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.warn(`${PREFIX} [+${elapsed}s] ${step}`, ...args);
    }

    function error(step, err) {
        if (!debug) return;
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.error(`${PREFIX} [+${elapsed}s] ${step}`, err);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getRows() {
        return [...document.querySelectorAll(
            "tr.alliance_buildings_table_searchable"
        )].filter(row =>
                  row.querySelector('a[building_type][href*="/buildings/"]')
                 );
    }

    function getBuildingInfo(row) {
        const link = row.querySelector(
            'a[building_type][href*="/buildings/"]'
        );
        if (!link) return null;
        const match = link.href.match(/\/buildings\/(\d+)/);
        if (!match) return null;
        return {
            id: match[1],
            type: String(link.getAttribute("building_type")),
            name: link.textContent.trim(),
            row
        };
    }

    function updateCount() {
        const checkboxes = [
            ...document.querySelectorAll(".lss-bulk-checkbox")
        ];
        const checked = checkboxes.filter(box => box.checked).length;
        if (countLabel) {
            countLabel.textContent =
                `${checked} von ${checkboxes.length} ausgewählt`;
        }
        if (assignButton) {
            assignButton.disabled =
                busy || checked === 0 || !targetSelect?.value;
        }
        log("Auswahl aktualisiert", {insgesamt: checkboxes.length, ausgewaehlt: checked, zielLeitstelle: targetSelect?.value || null});
    }

    function addCheckboxes() {
        const rows = getRows();
        let added = 0;
        for (const row of rows) {
            const info = getBuildingInfo(row);
            if (!info || row.querySelector(".lss-bulk-checkbox")) {
                continue;
            }
            const firstCell = row.querySelector("td");
            if (!firstCell) continue;
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "lss-bulk-checkbox";
            checkbox.dataset.buildingId = info.id;
            checkbox.dataset.buildingType = info.type;
            checkbox.dataset.buildingName = info.name;
            checkbox.title = `${info.name} auswählen`;
            firstCell.prepend(checkbox);
            checkbox.addEventListener("change", updateCount);
            added++;
            log("Checkbox hinzugefügt", {gebaeude: info.name, gebaeudeId: info.id, wachentypId: info.type});
        }
        log("Gebäude-Tabelle geprüft", { zeilen: rows.length, neueCheckboxen: added});
        updateCount();
        return rows.length;
    }

    function addStyles() {
        if (document.getElementById("lss-bulk-style")) {
            log("Styles bereits vorhanden");
            return;
        }
        const style = document.createElement("style");
        style.id = "lss-bulk-style";
        style.textContent = `
            #lss-bulk-toolbar {
                display:flex;
                align-items:center;
                flex-wrap:wrap;
                gap:6px;
                margin:10px 0;
                padding:8px;
                border:1px solid var(--border-color, #ccc);
                border-radius:6px;
                background:var(--surface-color, #fff);
                color:var(--text-color, #222);
            }
            #lss-bulk-toolbar select {
                min-height:22px;
                padding:2px 5px;
                border:1px solid var(--border-color, #ccc);
                border-radius:4px;
                background:var(--surface-color, #fff);
                color:var(--text-color, #222);
            }
            #lss-bulk-toolbar button {
                padding:2px 6px;
                cursor:pointer;
            }
            #lss-bulk-toolbar button:disabled {
                cursor:not-allowed;
                opacity:.55;
            }
            #lss-bulk-toolbar .lss-bulk-count {
                font-size:12px;
                color:inherit;
            }
            .lss-bulk-checkbox {
                margin:0 8px 0 2px;
                vertical-align:middle;
                cursor:pointer;
                accent-color:#337ab7;
            }
            body.dark #lss-bulk-toolbar {
                background:#333;
                color:#fff;
                border-color:#444;
            }
            body.dark #lss-bulk-toolbar select {
                background:#444;
                color:#fff;
                border-color:#555;
            }
            body.dark #lss-bulk-toolbar select option {
                background:#444;
                color:#fff;
            }
        `;
        document.head.appendChild(style);
        log("CSS für helle und dunkle Darstellung eingefügt");
    }

    function createSelect(labelText) {
        const wrapper = document.createElement("label");
        wrapper.style.cssText =
            "display:flex;align-items:center;gap:6px;";
        const label = document.createElement("span");
        label.textContent = labelText;
        const select = document.createElement("select");
        wrapper.append(label, select);
        toolbar.appendChild(wrapper);
        log("Dropdown erstellt:", labelText);
        return select;
    }

    function fillSelect(select, entries, placeholder) {
        select.replaceChildren();
        const first = document.createElement("option");
        first.value = "";
        first.textContent = placeholder;
        select.appendChild(first);
        for (const entry of entries) {
            const option = document.createElement("option");
            option.value = entry.value;
            option.textContent = entry.label;
            select.appendChild(option);
        }
        log("Dropdown befüllt", {platzhalter: placeholder, eintraege: entries.length, werte: entries});
    }

    function createToolbar() {
        if (document.getElementById("lss-bulk-toolbar")) {
            log("Werkzeugleiste existiert bereits");
            return;
        }
        addStyles();
        toolbar = document.createElement("div");
        toolbar.id = "lss-bulk-toolbar";
        typeSelect = createSelect("Wachentyp:");
        targetSelect = createSelect("Zielleitstelle:");

        const allButton = document.createElement("button");
        allButton.type = "button";
        allButton.textContent = "Alle auswählen";
        allButton.className = "btn btn-default btn-xs";
        allButton.addEventListener("click", () => setAll(true));

        const noneButton = document.createElement("button");
        noneButton.type = "button";
        noneButton.textContent = "Auswahl aufheben";
        noneButton.className = "btn btn-default btn-xs";
        noneButton.addEventListener("click", () => setAll(false));

        assignButton = document.createElement("button");
        assignButton.type = "button";
        assignButton.textContent = "Ausgewählte Gebäude zuordnen";
        assignButton.className = "btn btn-primary btn-xs";
        assignButton.addEventListener("click", assignSelected);

        countLabel = document.createElement("span");
        countLabel.className = "lss-bulk-count";

        toolbar.append(allButton, noneButton, assignButton, countLabel
                      );

        const table = getRows()[0]?.closest("table");
        if (table?.parentElement) {
            table.parentElement.insertBefore(toolbar, table);
            log("Werkzeugleiste oberhalb der Gebäudetabelle eingefügt");
        } else {
            const tabs = document.querySelector("#tabs");
            if (tabs) {
                tabs.insertAdjacentElement("afterend", toolbar);
                log("Werkzeugleiste hinter #tabs eingefügt");
            } else {
                document.body.prepend(toolbar);
                warn("Kein Tabellencontainer und kein #tabs gefunden");
            }
        }
        typeSelect.addEventListener("change", selectByType);
        targetSelect.addEventListener("change", updateCount);
        log("Werkzeugleiste erstellt");
    }

    function setAll(checked) {
        let changed = 0;
        for (const checkbox of document.querySelectorAll(
            ".lss-bulk-checkbox"
        )) {
            const row = checkbox.closest("tr");
            if (row && row.style.display !== "none") {
                checkbox.checked = checked;
                changed++;
            }
        }
        log(
            checked ? "Alle sichtbaren Gebäude ausgewählt" :
            "Auswahl aller sichtbaren Gebäude aufgehoben",
            { anzahl: changed }
        );
        updateCount();
    }

    function selectByType() {
        const selectedType = typeSelect.value;
        let checkedCount = 0;
        log("Wachentyp geändert", {
            typId: selectedType || "alle",
            typName: typeSelect.selectedOptions[0]?.textContent
        });
        for (const checkbox of document.querySelectorAll(
            ".lss-bulk-checkbox"
        )) {
            const row = checkbox.closest("tr");
            const visible = row && row.style.display !== "none";
            const matches = !selectedType ||
                  checkbox.dataset.buildingType === selectedType;
            checkbox.checked = Boolean(visible && matches);
            if (checkbox.checked) checkedCount++;
        }
        log("Automatische Gebäudeauswahl abgeschlossen", {
            ausgewaehlt: checkedCount
        });
        updateCount();
    }

    async function loadBuildingTypes() {
        log("Lade Wachentypen", BUILDINGS_API);
        const response = await fetch(BUILDINGS_API);
        log("Antwort der Wachentyp-API", {
            status: response.status,
            ok: response.ok
        });
        if (!response.ok) {
            throw new Error(
                `Wachentyp-API antwortet mit HTTP ${response.status}`
            );
        }
        const data = await response.json();
        buildingTypes = data;
        log("API-Daten empfangen", data);

        const existingTypes = new Set(
            getRows()
            .map(row => getBuildingInfo(row))
            .filter(info => info !== null)
            .map(info => info.type)
        );

        const entries = Object.entries(data)
        .filter(([id, item]) =>
                existingTypes.has(String(id)) &&
                !EXCLUDED_TYPES.has(String(id)) &&
                item && item.caption
               )
        .map(([id, item]) => ({
            value: String(id),
            label: item.caption
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "de"));

        fillSelect(typeSelect, entries, "Alle Wachentypen");
        log("Vorhandene Wachentypen erfolgreich geladen", {
            anzahl: entries.length,
            typen: entries.map(entry => entry.label)
        });
    }

    function getLeitstellenFromMenu() {
        const found = new Map();
        const menu = document.querySelector(
            "#dc_dropdown_root .leitstelle-dropdown-menu"
        );
        if (!menu) {
            log("Kein geöffnetes Leitstellenmenü vorhanden");
            return found;
        }
        const links = menu.querySelectorAll(
            "a.building_leitstelle_set_dropdown_item[href]"
        );
        log("Leitstellenmenü gefunden", {
            eintraege: links.length,
            menu
        });
        links.forEach(link => {
            const match = link.href.match(
                /\/buildings\/\d+\/leitstelle-set\/(\d+)/
            );
            if (!match || match[1] === "0") {
                log("Leitstellenlink übersprungen", link.href);
                return;
            }
            const id = match[1];
            const name = link.textContent.trim();
            if (name) {
                found.set(id, name);
                log("Leitstelle im Menü gefunden", { id, name });
            }
        });
        return found;
    }

    function waitForElement(selector, timeout = 15000) {
        log("Warte auf Element", { selector, timeout });
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(selector);
            if (existing) {
                log("Element bereits vorhanden", selector);
                return resolve(existing);
            }
            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    clearTimeout(timer);
                    observer.disconnect();
                    log("Element dynamisch gefunden", selector);
                    resolve(element);
                }
            });
            const timer = setTimeout(() => {
                observer.disconnect();
                const err = new Error(`Element nicht gefunden: ${selector}`);
                error("Wartezeit abgelaufen", err);
                reject(err);
            }, timeout);
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        });
    }

    function getCurrentLeitstelleName() {
        const heading = document.querySelector(
            '.building-title h1[building_type="7"]'
        );

        if (!heading) {
            log("Keine aktuell geöffnete Leitstelle erkannt");
            return null;
        }

        // Überschrift klonen, damit fremde Skripte nicht beeinflusst werden.
        const clone = heading.cloneNode(true);

        // Eingefügte Buttons und andere interaktive Elemente entfernen.
        clone.querySelectorAll(
            "button, a, input, select, textarea, svg, img"
        ).forEach(element => element.remove());

        const name = clone.textContent
        .replace(/\s+/g, " ")
        .trim();

        log("Aktuell geöffnete Leitstelle erkannt", { name });

        return name || null;
    }

    async function loadLeitstellen() {
        log("Starte Ermittlung der Zielleitstellen");
        const button = await waitForElement(
            "button.building-leitstelle-dropdown"
        );
        const menuSelector =
              "#dc_dropdown_root .leitstelle-dropdown-menu";
        const menuAlreadyOpen = Boolean(
            document.querySelector(menuSelector)
        );
        log("Erstes Leitstellen-Dropdown gefunden", {
            button,
            bereitsGeoeffnet: menuAlreadyOpen
        });

        if (!menuAlreadyOpen) {
            button.click();
            log("Erstes Leitstellen-Dropdown geöffnet");
        }

        try {
            await waitForElement(menuSelector, 5000);
            await sleep(MENU_DELAY);
            const found = getLeitstellenFromMenu();
            const currentLeitstelleName = getCurrentLeitstelleName();

            leitstellen = [...found.entries()]
                .map(([value, label]) => ({ value, label }))
                .filter(entry => {
                // Außerhalb einer Leitstelle bleibt die Liste unverändert.
                if (!currentLeitstelleName) return true;

                // Die aktuell geöffnete Leitstelle nicht als Ziel anbieten.
                const isCurrent =
                      entry.label.trim().toLocaleLowerCase("de") ===
                      currentLeitstelleName.toLocaleLowerCase("de");

                if (isCurrent) {
                    log("Aktuelle Leitstelle aus Zielliste entfernt", {
                        name: entry.label,
                        id: entry.value
                    });
                }
                return !isCurrent;
            })
                .sort((a, b) => a.label.localeCompare(b.label, "de"));

            log("Leitstellen aus dem ersten Dropdown ausgelesen", {
                anzahl: leitstellen.length,
                leitstellen
            });

            if (!leitstellen.length) {
                throw new Error(
                    "Das erste Leitstellen-Dropdown enthält keine auslesbaren Leitstellen."
                );
            }

            fillSelect(
                targetSelect,
                leitstellen,
                "Zielleitstelle auswählen"
            );
            log("Zielleitstellen-Dropdown erfolgreich befüllt");
            updateCount();
        } finally {
            if (
                !menuAlreadyOpen &&
                document.querySelector(menuSelector)
            ) {
                button.click();
                log("Leitstellen-Dropdown wieder geschlossen");
            }
        }
    }

    function updateBuildingLeitstelle(buildingId, targetId, targetName) {
        const container = document.querySelector(
            `#building_${buildingId}_leit`
        );
        if (!container) {
            log("Leitstellenanzeige nicht gefunden", buildingId);
            return;
        }
        const currentLink = container.querySelector(
            ".building_leitstelle_set_current"
        );
        if (!currentLink) {
            log("Aktueller Leitstellenlink nicht gefunden", buildingId);
            return;
        }

        // Anzeige wie nach einer regulären Zuordnung aktualisieren
        currentLink.className =
            `btn btn-xs building_leitstelle_set ` +
            `building_leitstelle_set_${buildingId} btn-success ` +
            `building_${buildingId}_leitstelle_set_current ` +
            `building_leitstelle_set_current`;
        currentLink.href =
            `${location.origin}/buildings/${buildingId}/leitstelle-set/${targetId}`;
        currentLink.textContent = targetName;
        currentLink.dataset.buildingId = buildingId;
        currentLink.removeAttribute("building_id");
        log("Leitstellenanzeige aktualisiert", {
            buildingId,
            targetId,
            targetName
        });
    }

    async function assignSelected() {
        if (busy) {
            warn("Zuordnung ignoriert: Vorgang läuft bereits");
            return;
        }
        const targetId = targetSelect.value;
        const targetName =
              targetSelect.selectedOptions[0]?.textContent;
        const selected = [
            ...document.querySelectorAll(".lss-bulk-checkbox:checked")
        ];

        log("Zuordnung gestartet", {
            zielId: targetId,
            zielName: targetName,
            anzahl: selected.length,
            gebaeude: selected.map(box => ({
                id: box.dataset.buildingId,
                name: box.dataset.buildingName,
                typ: box.dataset.buildingType
            }))
        });

        if (!targetId || !selected.length) {
            warn("Zuordnung abgebrochen: Ziel oder Gebäude fehlen");
            return;
        }
        if (!confirm(
            `${selected.length} Gebäude der Leitstelle „${targetName}“ zuordnen?`
        )) {
            log("Zuordnung vom Benutzer abgebrochen");
            return;
        }

        busy = true;
        updateCount();
        let done = 0;
        let failed = 0;

        for (let i = 0; i < selected.length; i++) {
            const checkbox = selected[i];
            const id = checkbox.dataset.buildingId;
            const name = checkbox.dataset.buildingName;
            const url =
                  `${location.origin}/buildings/${id}/leitstelle-set/${targetId}`;

            log(`Zuordnung ${i + 1}/${selected.length} wird gesendet`, {
                gebaeudeId: id,
                gebaeudeName: name,
                zielId: targetId,
                url
            });

            try {
                const response = await fetch(url.toString(), {
                    method: "GET",
                    credentials: "same-origin",
                    redirect: "follow",
                    cache: "no-store"
                });

                log("Antwort der Zuordnungsanfrage", {
                    gebaeudeId: id,
                    status: response.status,
                    ok: response.ok,
                    redirected: response.redirected,
                    url: response.url
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                done++;
                updateBuildingLeitstelle(id, targetId, targetName);
                checkbox.checked = false;
                log("Zuordnungsanfrage erfolgreich beantwortet", {
                    gebaeudeId: id,
                    erledigt: done,
                    fehler: failed
                });
            } catch (err) {
                failed++;
                error(`Zuordnung fehlgeschlagen: ${name} (${id})`, err);
            }

            updateCount();
            await sleep(ASSIGN_DELAY);
        }

        busy = false;
        updateCount();

        log("Zuordnungslauf beendet", {
            erfolgreichBeantwortet: done,
            fehler: failed,
            zielId: targetId,
            hinweis: "HTTP-Erfolg bestätigt nicht zwingend die serverseitige Speicherung."
        });

        if (debug) {
            console.group(`${PREFIX} Ergebnis`);
            console.table({
                Bearbeitet: { Anzahl: done },
                Fehler: { Anzahl: failed },
                Zielleitstelle: { Anzahl: targetName }
            });
            console.groupEnd();
        }
    }

    async function init() {
        log("Skript gestartet", {
            url: location.href,
            domain: location.hostname,
            darkMode: document.body.classList.contains("dark"),
            debug
        });

        try {
            log("Warte auf Gebäudetabelle");
            await waitForElement(
                "tr.alliance_buildings_table_searchable"
            );

            const rowCount = addCheckboxes();
            if (!rowCount) {
                throw new Error("Keine Gebäudezeilen gefunden.");
            }

            createToolbar();

            // Neue Zeilen beobachten, die dynamisch zur Tabelle hinzukommen.
            const table = getRows()[0]?.closest("table");
            if (table) {
                log("MutationObserver für dynamische Tabellenzeilen eingerichtet");
                const observer = new MutationObserver(() => {
                    log("Änderung an der Gebäudetabelle erkannt");
                    addCheckboxes();
                });
                observer.observe(table, {
                    childList: true,
                    subtree: true
                });
            }

            await loadBuildingTypes();
            await loadLeitstellen();

            log("Initialisierung vollständig abgeschlossen", {
                gebaeude: getRows().length,
                wachentypen: Object.keys(buildingTypes).length,
                leitstellen: leitstellen.length
            });
        } catch (err) {
            error("Initialisierung fehlgeschlagen", err);
        }
    }

    log("Userscript geladen");
    init();
})();
