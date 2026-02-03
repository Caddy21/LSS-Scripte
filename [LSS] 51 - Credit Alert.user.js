// ==UserScript==
// @name         [LSS] Credit Alert
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Meldet bei jedem Meilenstein an Credits und zeigt Tage seit Registrierung
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const API_URL = 'https://www.leitstellenspiel.de/api/userinfo';
    const CHECK_INTERVAL = 12 * 60 * 60 * 1000; // alle 12 Stunden
    const MILESTONE = 100_000_000; // z.B. jede 100. Million, für jede Milliarde: 1_000_000_000
    const START_DATE = new Date('2022-01-18T00:00:00'); // Registrierungsdatum

    const STORAGE_KEY = 'lss_last_notified_credits';

    function daysSinceStart() {
        const now = new Date();
        return Math.floor((now - START_DATE) / (1000 * 60 * 60 * 24));
    }

    function checkCredits() {
        fetch(API_URL)
            .then(response => response.json())
            .then(data => {
                const currentCredits = data.credits_user_total;

                let lastCredits = localStorage.getItem(STORAGE_KEY);
                if (!lastCredits) {
                    localStorage.setItem(STORAGE_KEY, currentCredits);
                    return;
                }

                lastCredits = parseInt(lastCredits, 10);

                // Prüfen, ob ein neuer Meilenstein erreicht wurde
                if (Math.floor(currentCredits / MILESTONE) > Math.floor(lastCredits / MILESTONE)) {
                    const days = daysSinceStart();
                    const gained = currentCredits - lastCredits;

                    alert(
                        `💰 Leitstellenspiel\n\n` +
                        `+${gained.toLocaleString()} Credits erreicht!\n` +
                        `Tage seit ${START_DATE.toLocaleDateString()}: ${days}`
                    );

                    localStorage.setItem(STORAGE_KEY, currentCredits);
                }
            })
            .catch(e => console.error('LSS Script Fehler:', e));
    }

    // Start
    checkCredits();
    setInterval(checkCredits, CHECK_INTERVAL);
})();
