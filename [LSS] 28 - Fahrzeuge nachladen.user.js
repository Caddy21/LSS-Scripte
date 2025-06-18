// ==UserScript==
// @name         [LSS] Fahrzeuge nachladen
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Fügt Button "Fehlende Farhzeuge" unter den Einsatzcountdown ein und macht ihn über Taste R auslösbar
// @author       Dein Name
// @match        https://www.leitstellenspiel.de/missions/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function insertMissingVehiclesButton() {
        const originalBtn = document.querySelector('.btn.btn-xs.btn-warning.missing_vehicles_load.btn-block');
        const headerRow = document.querySelector('.mission_header_info.row');

        if (originalBtn && headerRow && !document.querySelector('#missingVehiclesHotkeyBtn')) {
            const newBtn = document.createElement('button');
            newBtn.id = 'missingVehiclesHotkeyBtn';
            newBtn.className = 'btn btn-xs btn-warning';
            newBtn.style.marginLeft = '10px';
            newBtn.textContent = 'Fahrzeuganzeige begrenzt! Fehlende Fahrzeuge laden!';
            newBtn.onclick = () => originalBtn.click();

            headerRow.appendChild(newBtn);
        }
    }

    function setupHotkey() {
        document.addEventListener('keydown', function (e) {
            if (e.key.toLowerCase() === 'r') {
                const active = document.activeElement;
                const isInputFocused = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

                if (!isInputFocused) {
                    const originalBtn = document.querySelector('.btn.btn-xs.btn-warning.missing_vehicles_load.btn-block');
                    if (originalBtn) originalBtn.click();
                }
            }
        });
    }

    const observer = new MutationObserver(() => {
        const btn = document.querySelector('.btn.btn-xs.btn-warning.missing_vehicles_load.btn-block');
        const headerRow = document.querySelector('.mission_header_info.row');

        if (btn && headerRow) {
            insertMissingVehiclesButton();
            setupHotkey();
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
