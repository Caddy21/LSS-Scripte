// ==UserScript==
// @name         [LSS] 41 - Lehrgänge ausblenden
// @namespace    https://leitstellenspiel.de/
// @version      1.2
// @description  Blendet Lehrgänge mit eigener Beteiligung aus + Toggle Button neben Überschrift
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/schoolings*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let hidden = true;

    // Tabelle ein-/ausblenden
    function toggleOwnSchoolings(doc) {
        const ownTable = doc.querySelector('#schooling_own_table');

        if (ownTable) {
            ownTable.style.display = hidden ? 'none' : '';
        }
    }

    // Button neben H3 einfügen
    function createToggleButton(doc) {

        // Schon vorhanden?
        if (doc.querySelector('#toggle-schoolings-btn')) return;

        const heading = [...doc.querySelectorAll('h3')]
            .find(h => h.textContent.includes('Lehrgänge mit eigenen Teilnehmern'));

        if (!heading) return;

        const btn = doc.createElement('button');

        btn.id = 'toggle-schoolings-btn';
        btn.innerText = 'Anzeigen';

        btn.className = 'btn btn-xs btn-primary';

        btn.style.marginLeft = '10px';

        btn.addEventListener('click', () => {
            hidden = !hidden;

            // Hauptseite
            toggleOwnSchoolings(document);

            // Lightboxen
            const iframes = document.querySelectorAll('iframe[id^="lightbox_iframe_"]');

            for (const frame of iframes) {
                try {
                    if (frame.contentDocument) {
                        toggleOwnSchoolings(frame.contentDocument);
                    }
                } catch (e) {}
            }

            btn.innerText = hidden
                ? 'Anzeigen'
                : 'Ausblenden';
        });

        heading.appendChild(btn);
    }

    // Initial ausblenden
    toggleOwnSchoolings(document);

    // Button auf Hauptseite
    createToggleButton(document);

    // Observer für Lightboxen
    const observer = new MutationObserver(() => {

        const iframes = document.querySelectorAll('iframe[id^="lightbox_iframe_"]');

        for (const frame of iframes) {
            try {
                if (frame.contentDocument) {

                    toggleOwnSchoolings(frame.contentDocument);
                    createToggleButton(frame.contentDocument);

                }
            } catch (e) {}
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
