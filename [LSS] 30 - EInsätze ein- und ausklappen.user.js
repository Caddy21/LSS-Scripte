// ==UserScript==
// @name         [LSS] 30 - Einsätze ein-/ausklappen
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fügt lokale und globale Buttons zum Ein-/Ausklappen von Einsätzen hinzu
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const einsatzListenIDs = [
        "mission_list",
        "mission_list_krankentransporte",
        "mission_list_alliance",
        "mission_list_sicherheitswache_alliance",
        "mission_list_alliance_event",
        "mission_list_sicherheitswache"
    ];

    function addGlobalToggleButton() {
        //console.log("[LSS] addGlobalToggleButton gestartet");
        const existingButton = document.getElementById('mission_select_sicherheitswache');
        if (!existingButton || !existingButton.parentNode) {
            console.warn("[LSS] Button 'mission_select_sicherheitswache' nicht gefunden.");
            return;
        }

        const toggleButton = document.createElement('button');
        toggleButton.innerText = '⇳';
        toggleButton.title = 'Alle Einsätze ein-/ausblenden';
        toggleButton.className = 'btn btn-warning btn-xs';
        toggleButton.style.marginLeft = '0px';
        toggleButton.style.padding = '2px 8px';
        toggleButton.style.outline = 'none';
        toggleButton.style.boxShadow = 'none';
        toggleButton.style.border = 'none';

        let sichtbar = false;

        // Anfangszustand: eingeklappt
        einsatzListenIDs.forEach(listID => {
            const list = document.getElementById(listID);
            if (list) {
                const einsaetze = list.querySelectorAll('.missionSideBarEntry');
                einsaetze.forEach(einsatz => {
                    const row = einsatz.querySelector('.row');
                    const button = einsatz.querySelector('.einsatz-toggle-button');
                    if (row && button) {
                        row.style.display = 'none';
                        button.classList.remove('btn-success');
                        button.classList.add('btn-danger');
                    }
                });
            }
        });

        toggleButton.addEventListener('click', () => {
            sichtbar = !sichtbar;
            einsatzListenIDs.forEach(listID => {
                const list = document.getElementById(listID);
                if (list) {
                    const einsaetze = list.querySelectorAll('.missionSideBarEntry');
                    einsaetze.forEach(einsatz => {
                        const row = einsatz.querySelector('.row');
                        const button = einsatz.querySelector('.einsatz-toggle-button');
                        if (row && button) {
                            row.style.display = sichtbar ? '' : 'none';
                            button.classList.remove('btn-success', 'btn-danger');
                            button.classList.add(sichtbar ? 'btn-success' : 'btn-danger');
                        }
                    });
                }
            });
        });

        existingButton.parentNode.insertBefore(toggleButton, existingButton.nextSibling);
        //console.log("[LSS] Globaler Toggle-Button eingefügt");
    }

    function addLocalToggleButton(einsatzElement) {
        if (einsatzElement.classList.contains('row-toggle-added')) return;
        einsatzElement.classList.add('row-toggle-added');

        const row = einsatzElement.querySelector('.row');
        if (!row) return;

        row.style.display = 'none';

        const localButton = document.createElement('button');
        localButton.title = 'Einsatzinhalt ein-/ausblenden';
        localButton.className = 'btn btn-xs einsatz-toggle-button';
        localButton.innerText = '⇳';
        localButton.classList.add('btn-danger');

        localButton.style.marginRight = '6px';
        localButton.style.padding = '2px 6px';
        localButton.style.border = 'none';
        localButton.style.outline = 'none';
        localButton.style.boxShadow = 'none';
        localButton.style.verticalAlign = 'middle';
        localButton.style.fontSize = '14px';
        localButton.style.height = '20px';
        localButton.style.lineHeight = '1';
        localButton.style.display = 'inline-block';

        let visible = false;

        localButton.addEventListener('click', (e) => {
            e.stopPropagation();
            visible = !visible;
            row.style.display = visible ? '' : 'none';
            localButton.classList.remove('btn-success', 'btn-danger');
            localButton.classList.add(visible ? 'btn-success' : 'btn-danger');
        });

        const alarmButton = einsatzElement.querySelector('.mission-alarm-button');
        if (alarmButton && alarmButton.parentNode) {
            alarmButton.parentNode.insertBefore(localButton, alarmButton);
        } else {
            einsatzElement.appendChild(localButton);
        }
    }

    function observeEinsaetze() {
        //console.log("[LSS] Beobachtung aktiver Einsätze gestartet");
        einsatzListenIDs.forEach(id => {
            const list = document.getElementById(id);
            if (!list) return;

            const observer = new MutationObserver(() => {
                const einsaetze = list.querySelectorAll('.missionSideBarEntry');
                einsaetze.forEach(einsatz => addLocalToggleButton(einsatz));
            });

            observer.observe(list, { childList: true, subtree: true });

            const einsaetze = list.querySelectorAll('.missionSideBarEntry');
            einsaetze.forEach(einsatz => addLocalToggleButton(einsatz));
        });
    }

    function waitForElement(selector, callback) {
        const el = document.querySelector(selector);
        if (el) {
            //console.log(`[LSS] Element ${selector} sofort gefunden`);
            callback(el);
        } else {
            //console.log(`[LSS] Warte auf ${selector} ...`);
            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    //console.log(`[LSS] Element ${selector} gefunden!`);
                    observer.disconnect();
                    callback(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    // Initialisierung
    waitForElement('#mission_select_sicherheitswache', (el) => {
        //console.log("[LSS] Initialisierung gestartet");
        addGlobalToggleButton();
        observeEinsaetze();
    });

})();
