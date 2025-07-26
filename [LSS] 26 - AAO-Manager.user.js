// ==UserScript==
// @name         [LSS] AAO-Manager
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Effizientes Verwalten deiner Alarm- und Ausrückeordnung (AAO): Fahrzeuge nachladen, AAO zurücksetzen, neu anlegen oder bearbeiten – alles mit einem Klick, in der optimalen Reihenfolge.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/missions/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Konfiguration: welche Buttons sollen angezeigt werden?
    const config = {
        showClearAaoBtn: true,
        showCreateAaoBtn: true,
        showLoadMissingBtn: true
    };

    // ID des eigenen Button-Containers
    const containerId = 'custom-aao-tools';

    // Erzeugt einen Bootstrap-kompatiblen Button mit gegebenen Eigenschaften
    function createButton(id, text, className, onClick) {
        const btn = document.createElement('button');
        btn.id = id;
        btn.className = `btn btn-xs ${className}`;
        btn.textContent = text;
        btn.style.marginLeft = '10px';
        btn.addEventListener('click', onClick);
        return btn;
    }

    // Fügt die benutzerdefinierten Buttons oberhalb der AAO-Leiste ein
    function insertButtons() {
        const progressDiv = document.querySelector('.mission_header_info_progress');
        if (!progressDiv) return; // Nur wenn Element vorhanden ist
        if (document.getElementById(containerId)) return; // Verhindert Duplikate

        const container = document.createElement('div');
        container.id = containerId;
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '6px';
        container.style.marginTop = '10px';

        // Button: Fehlende Fahrzeuge laden
        const missingBtn = document.querySelector('.btn.btn-xs.btn-warning.missing_vehicles_load.btn-block');
        if (config.showLoadMissingBtn && missingBtn) {
            const btn = createButton('btn-load-missing', 'Fehlende Fahrzeuge laden', 'btn-warning', () => missingBtn.click());
            container.appendChild(btn);
        }

        // Button: AAO Auswahl löschen (ID bitte bei Bedarf aktualisieren!)
        const aaoClearBtn = document.querySelector('#aao_67865212');
        if (config.showClearAaoBtn && aaoClearBtn) {
            const btn = createButton('btn-clear-aao', 'AAO Auswahl löschen', 'btn-danger', () => aaoClearBtn.click());
            container.appendChild(btn);
        }

        // Button: Neue AAO anlegen
        if (config.showCreateAaoBtn) {
            const btn = createButton('btn-create-aao', 'AAO anlegen', 'btn-success', () => {
                window.open('https://www.leitstellenspiel.de/aaos/new', '_blank');
            });
            container.appendChild(btn);
        }

        // Container nach dem Fortschrittsbalken einfügen
        progressDiv.insertAdjacentElement('afterend', container);
    }

    // Legt Tastenkürzel (Hotkeys) für bestimmte Aktionen fest
    function setupHotkeys() {
        window.addEventListener('keydown', function (e) {
            const tag = (e.target || e.srcElement).tagName;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return; // Kein Hotkey in Eingabefeldern

            // Taste R: Fehlende Fahrzeuge laden
            if (config.showLoadMissingBtn && e.key.toLowerCase() === 'r') {
                const missingBtn = document.querySelector('.btn.btn-xs.btn-warning.missing_vehicles_load.btn-block');
                if (missingBtn) missingBtn.click();
            }

            // Taste C: AAO Auswahl löschen
            if (config.showClearAaoBtn && e.key.toLowerCase() === 'c') {
                const aaoBtn = document.querySelector('#aao_67865212');
                if (aaoBtn) aaoBtn.click();
            }
        }, true); // Capture-Phase aktiviert – wichtig für Firefox
    }

    // Fügt Bearbeiten-Buttons (✎) zu allen AAO-Einträgen hinzu
    function addEditButtonsToAao() {
        const aaoGroup = document.getElementById('mission-aao-group');
        if (!aaoGroup) return;

        // Alle vorhandenen AAO-Buttons durchgehen
        const aaoButtons = aaoGroup.querySelectorAll('a.aao_btn[id^="aao_"]');

        aaoButtons.forEach(btn => {
            // Schon bearbeitet? Dann überspringen
            if (btn.querySelector('.aao-edit-icon')) return;

            // AAO-ID extrahieren
            const aaoId = btn.getAttribute('aao_id') || btn.id.replace('aao_', '');
            if (!aaoId) return;

            // ✎ Icon erzeugen
            const icon = document.createElement('span');
            icon.className = 'aao-edit-icon';
            icon.textContent = '✎';
            icon.title = 'AAO bearbeiten';
            icon.style.marginRight = '5px';
            icon.style.cursor = 'pointer';
            icon.style.userSelect = 'none';
            icon.style.color = '#aaa';

            // Bei Klick neues Bearbeitungsfenster öffnen
            icon.addEventListener('click', (e) => {
                e.stopPropagation(); // Verhindert normalen AAO-Klick
                e.preventDefault();
                window.open(`https://www.leitstellenspiel.de/aaos/${aaoId}/edit`, '_blank');
            });

            // Icon als erstes Element im AAO-Button einfügen
            btn.insertBefore(icon, btn.firstChild);
        });
    }

    // DOM-Änderungen beobachten und Buttons nachladen
    const observer = new MutationObserver(() => {
        insertButtons();          // Hauptbuttons einfügen
        addEditButtonsToAao();    // Bearbeiten-Icons ergänzen
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initialer Aufruf nach Seitenladen
    window.addEventListener('load', () => {
        insertButtons();
        setupHotkeys();
        addEditButtonsToAao();
    });

})();
