// ==UserScript==
// @name         [LSS] Verbandsgebäude Button
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fügt einen Button "Gebäude" in der Gebäudeübersicht ein
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Funktion zum Einfügen des Buttons
    function addGebaeudeButton() {
        const container = document.getElementById('building-list-header-buttons');
        if (!container) return;

        // Prüfen, ob der Button schon existiert
        if (document.getElementById('verband_gebaeude')) return;

        // Button erstellen
        const gebaeudeButton = document.createElement('a');
        gebaeudeButton.className = 'lightbox-open btn btn-xs btn-default';
        gebaeudeButton.href = '/verband/gebauede';
        gebaeudeButton.id = 'verband_gebaeude';
        gebaeudeButton.textContent = 'Verbandsgebäude';

        // Optional: rechts ausrichten wie "Alle Anzeigen"
        gebaeudeButton.style.marginLeft = 'auto';

        // Button einfügen
        container.appendChild(gebaeudeButton);
    }

    // Script immer wieder versuchen, bis die Seite geladen ist
    const interval = setInterval(() => {
        if (document.readyState === 'complete') {
            addGebaeudeButton();
            clearInterval(interval);
        }
    }, 500);
})();
