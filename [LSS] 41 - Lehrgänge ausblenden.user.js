// ==UserScript==
// @name         [LSS] Lehrgänge ausblenden
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Blendet Lehrgänge mit eigenen Beteiligung aus
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/schoolings*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Funktion zum Ausblenden
    function hideOwnSchoolings(doc) {
        const ownTable = doc.querySelector('#schooling_own_table');
        if (ownTable) {
            ownTable.style.display = 'none';
            console.log('Eigene Lehrgänge ausgeblendet.');
        }
    }

    // Zuerst auf Hauptseite prüfen
    hideOwnSchoolings(document);

    // Dann auf Lightbox-Frames warten
    const observer = new MutationObserver(() => {
        const iframes = document.querySelectorAll('iframe[id^="lightbox_iframe_"]');
        for (const frame of iframes) {
            try {
                if (frame.contentDocument) hideOwnSchoolings(frame.contentDocument);
            } catch (e) {
                // CORS-Schutz ignorieren, falls nötig
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
