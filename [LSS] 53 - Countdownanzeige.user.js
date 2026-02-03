// ==UserScript==
// @name         [LSS] Countdownanzeige
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @author       Caddy21
// @description  Zeigt den Countdown der geplanten Einsätzen im Panel-Header an
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function updateCountdowns() {
        const container = document.getElementById('mission_list_sicherheitswache');
        if (!container) return;

        container.querySelectorAll('.mission_overview_countdown').forEach(cd => {
            const timeText = cd.textContent.trim();

            const match = cd.id.match(/mission_overview_countdown_(\d+)/);
            if (!match) return;

            const missionId = match[1];
            const header = document.getElementById('mission_panel_heading_' + missionId);
            if (!header) return;

            let badge = header.querySelector('.tm-countdown-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'tm-countdown-badge';

                // Theme-aware Styling
                const headerStyle = window.getComputedStyle(header);

                badge.style.cssText = `
                    float: right;
                    font-weight: bold;
                    margin-left: 10px;
                    color: ${headerStyle.color};
                `;

                header.appendChild(badge);
            }

            badge.textContent = timeText;
        });
    }

    setInterval(updateCountdowns, 1000);
})();
