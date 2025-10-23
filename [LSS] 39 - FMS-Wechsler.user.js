// ==UserScript==
// @name         [LSS] FMS-Wechseler
// @namespace    Leitstellenspiel
// @version      1.0
// @description  Erlaubt das schnelle Wechseln zwischen FMS 2 und 6 in der Fahrzeugübersicht durch Klick auf den FMS-Status.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/buildings/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Warte, bis die Tabelle vorhanden ist
    function initFMSClicker() {
        const table = document.querySelector('#vehicle_table');
        if (!table) return; // Tabelle noch nicht da

        // Alle FMS-Felder finden
        table.querySelectorAll('.building_list_fms').forEach(span => {
            // Fahrzeug-ID aus den Nachbarn extrahieren
            const row = span.closest('tr');
            const vehicleLink = row.querySelector('a[href^="/vehicles/"]');
            if (!vehicleLink) return;
            const vehicleIdMatch = vehicleLink.href.match(/\/vehicles\/(\d+)/);
            if (!vehicleIdMatch) return;

            const vehicleId = vehicleIdMatch[1];
            const currentStatus = parseInt(span.textContent.trim(), 10);

            // Cursor ändern und Tooltip setzen
            span.style.cursor = 'pointer';
            span.title = 'Klicke, um Status zu wechseln (S2 ↔ S6)';

            // Klick-Event hinzufügen
            span.addEventListener('click', async () => {
                let newStatus = currentStatus === 2 ? 6 : 2;
                const url = `/vehicles/${vehicleId}/set_fms/${newStatus}`;

                // Optisches Feedback
                span.style.opacity = '0.5';

                try {
                    await fetch(url, { method: 'GET', credentials: 'same-origin' });
                    span.textContent = newStatus;
                    span.className = `building_list_fms building_list_fms_${newStatus}`;
                    span.style.opacity = '1';
                } catch (e) {
                    console.error('Fehler beim Setzen des Status:', e);
                    span.style.opacity = '1';
                }
            });
        });
    }

    // Beobachte Änderungen im DOM (bei AJAX-Nachladen)
    const observer = new MutationObserver(() => initFMSClicker());
    observer.observe(document.body, { childList: true, subtree: true });

    // Initialer Start
    initFMSClicker();
})();
