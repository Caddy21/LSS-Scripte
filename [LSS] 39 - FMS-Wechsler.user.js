// ==UserScript==
// @name         [LSS] FMS-Wechseler
// @namespace    Leitstellenspiel
// @version      1.0
// @description  Klick auf FMS-Zahl wechselt zwischen S2 und S6.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/buildings/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    console.info('[FMS] gestartet (3.2 redirect-safe)');

    function initFMSClicker() {
        const table = document.querySelector('#vehicle_table');
        if (!table) return;

        table.querySelectorAll('.building_list_fms').forEach(span => {
            if (span.dataset.fmsClickerBound === 'true') return;
            span.dataset.fmsClickerBound = 'true';

            const row = span.closest('tr');
            const vehicleLink = row?.querySelector('a[href^="/vehicles/"]');
            if (!vehicleLink) return;

            const idMatch = vehicleLink.href.match(/\/vehicles\/(\d+)/);
            if (!idMatch) return;
            const vehicleId = idMatch[1];

            span.style.cursor = 'pointer';
            span.title = 'Klicke, um Status zu wechseln (S2 ↔ S6)';

            span.addEventListener('click', async () => {
                const current = parseInt(span.textContent.trim(), 10);
                const next = current === 2 ? 6 : 2;

                console.info(`[FMS] ${vehicleId}: ${current} → ${next}`);
                span.style.opacity = '0.5';

                try {
                    await fetch(`/vehicles/${vehicleId}/set_fms/${next}`, {
                        method: 'GET',
                        credentials: 'same-origin',
                        redirect: 'manual' // 🔥 verhindert 302-Follow -> kein Reload, kein Freeze
                    });

                    // Optisches Update
                    span.textContent = next;
                    span.className = `building_list_fms building_list_fms_${next}`;
                } catch (err) {
                    console.error('[FMS] Fehler:', err);
                } finally {
                    span.style.opacity = '1';
                }
            });
        });

        console.info('[FMS] Clicker initialisiert');
    }

    // einmal beim Laden
    initFMSClicker();
    // falls Fahrzeuge nachgeladen werden (optional alle 5s prüfen)
    setInterval(initFMSClicker, 5000);
})();
