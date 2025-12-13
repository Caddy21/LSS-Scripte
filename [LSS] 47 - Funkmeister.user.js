// ==UserScript==
// @name         [LSS] 47 - Funkmeister
// @namespace    https://tampermonkey.net/
// @version      1.0
// @author       Caddy21
// @description  Prüft beim Start und regelmäßig auf Status 5 und öffnet den Sprechwunsch in einem neuem Tab.
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Einstellungen
    const CHECK_INTERVAL_MINUTES = 10;
    const STATUS_TO_CHECK = '5';
    const CHECK_INTERVAL_MS = CHECK_INTERVAL_MINUTES * 60 * 1000;

    let lastOpenedVehicle = null;
    let lastTab = null;

    // Funktion zur Prüfung ob SW vorhanden sind
    function checkForStatus5(trigger = 'interval') {
        const container = document.querySelector('#radio_messages_important');
        if (!container) {
            return;
        }

        const messages = container.querySelectorAll('li');
        let found = false;

        for (const msg of messages) {
            const statusSpan = msg.querySelector('.building_list_fms');
            if (!statusSpan) continue;

            const status = statusSpan.textContent.trim();
            if (status !== STATUS_TO_CHECK) continue;

            // Fahrzeug-Link holen
            const vehicleLink = msg.querySelector('a[href^="/vehicles/"]');
            if (!vehicleLink) continue;

            const url = vehicleLink.href;

            if (url !== lastOpenedVehicle) {
                lastOpenedVehicle = url;

                // Tab öffnen, falls noch nicht offen
                if (!lastTab || lastTab.closed) {
                    lastTab = window.open(url, '_blank');
                }
            }

            found = true;
            break; // nur den ERSTEN Status 5 nehmen
        }

        // Wenn keine SW mehr offen ist, Tab schließen
        if (!found && lastTab && !lastTab.closed) {
            lastTab.close();
            lastTab = null;
            lastOpenedVehicle = null;
        }
    }

    // START-CHECK mit MutationObserver
    const observer = new MutationObserver((mutations, obs) => {
        const container = document.querySelector('#radio_messages_important');
        if (container) {
            checkForStatus5('start');
            obs.disconnect(); // nur einmal ausführen
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Intervallprüfung
    setInterval(() => checkForStatus5('interval'), CHECK_INTERVAL_MS);

})();
