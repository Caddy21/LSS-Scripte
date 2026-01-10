// ==UserScript==
// @name         [LSS] - Credit Alert
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Meldet, wenn 1.500.000 Credits verdient worden sind und zeigt die Anzahl der Tag seit Registrierung an.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// ==/UserScript==

(function () {
    'use strict';

    const API_URL = 'https://www.leitstellenspiel.de/api/userinfo';
    const CHECK_INTERVAL = 5 * 60 * 1000; // alle 10 Minuten
    const MILLION = 1_500_000; // <- Verdienst anpassen
    const START_DATE = new Date('2022-01-18T00:00:00');

    const STORAGE_KEY = 'lss_last_notified_credits';

    function daysSinceStart() {
        const now = new Date();
        return Math.floor((now - START_DATE) / (1000 * 60 * 60 * 24));
    }

    function checkCredits() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: API_URL,
            onload: function (response) {
                try {
                    const data = JSON.parse(response.responseText);
                    const currentCredits = data.credits_user_total;

                    let lastCredits = localStorage.getItem(STORAGE_KEY);
                    if (!lastCredits) {
                        localStorage.setItem(STORAGE_KEY, currentCredits);
                        return;
                    }

                    lastCredits = parseInt(lastCredits, 10);

                    if (currentCredits >= lastCredits + MILLION) {
                        const days = daysSinceStart();
                        const gained = currentCredits - lastCredits;

                        GM_notification({
                            title: '💰 Leitstellenspiel',
                            text: `+${gained.toLocaleString()} Credits erreicht!\nTage seit 18.01.2022: ${days}`, // Hier Reg-Datum eintragen
                            timeout: 10000
                        });

                        localStorage.setItem(STORAGE_KEY, currentCredits);
                    }
                } catch (e) {
                    console.error('Leitstellenspiel Script Fehler:', e);
                }
            }
        });
    }

    // Start
    checkCredits();
    setInterval(checkCredits, CHECK_INTERVAL);
})();
