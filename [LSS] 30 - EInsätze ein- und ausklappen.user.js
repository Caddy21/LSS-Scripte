// ==UserScript==
// @name         [LSS] 30 - Einsätze ein-/ausklappen
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fügt lokale und globale Buttons zum Ein-/Ausklappen von Einsätzen hinzu
// @author       DeinName
// @match        https://www.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
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
        const existingButton = document.getElementById('mission_select_sicherheitswache');
        if (!existingButton || !existingButton.parentNode) return;

        const toggleButton = document.createElement('button');
        toggleButton.innerText = '⇳'; // Glyphon als Textsymbol
        toggleButton.title = 'Alle Einsätze ein-/ausblenden';
        toggleButton.className = 'btn btn-warning btn-xs';
        toggleButton.style.marginLeft = '0px';
        toggleButton.style.padding = '2px 8px';

        // Weißer Rahmen entfernen
        toggleButton.style.outline = 'none';
        toggleButton.style.boxShadow = 'none';
        toggleButton.style.border = 'none'; // falls Rahmen stört

        let sichtbar = false; // Start: Einsätze sind eingeklappt

        // Initial Zustand setzen (alle Einsätze eingeklappt, Buttons rot)
        einsatzListenIDs.forEach(listID => {
            const list = document.getElementById(listID);
            if (list) {
                const einsaetze = list.querySelectorAll('.missionSideBarEntry');
                einsaetze.forEach(einsatz => {
                    const row = einsatz.querySelector('.row');
                    const button = einsatz.querySelector('.einsatz-toggle-button');
                    if (row && button) {
                        row.style.display = 'none'; // eingeklappt
                        button.classList.remove('btn-success');
                        button.classList.add('btn-danger'); // rot
                    }
                });
            }
        });

        toggleButton.addEventListener('click', () => {
            sichtbar = !sichtbar; // zuerst Status umschalten
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
    }

    function addLocalToggleButton(einsatzElement) {
        if (einsatzElement.classList.contains('row-toggle-added')) return;
        einsatzElement.classList.add('row-toggle-added');

        const row = einsatzElement.querySelector('.row');
        if (!row) return;

        row.style.display = 'none'; // Bereich eingeklappt

        const localButton = document.createElement('button');
        localButton.title = 'Einsatzinhalt ein-/ausblenden';
        localButton.className = 'btn btn-xs einsatz-toggle-button';
        localButton.innerText = '⇳';

        // Button initial auf ROT setzen, da Bereich eingeklappt ist
        localButton.classList.add('btn-danger');

        // Styles für vertikale Ausrichtung neben Alarmbutton
        localButton.style.marginRight = '6px';
        localButton.style.padding = '2px 6px';
        localButton.style.border = 'none';
        localButton.style.outline = 'none';
        localButton.style.boxShadow = 'none';
        localButton.style.verticalAlign = 'middle';
        localButton.style.fontSize = '14px';
        localButton.style.height = '24px';
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

    window.addEventListener('load', () => {
        const initInterval = setInterval(() => {
            const ready = document.getElementById('mission_select_sicherheitswache');
            if (ready) {
                clearInterval(initInterval);
                addGlobalToggleButton();
                observeEinsaetze();
            }
        }, 500);
    });
})();
