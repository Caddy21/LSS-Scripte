// ==UserScript==
// @name         [LSS] Hide Finish Now Button in LightBox
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Entfernt den Fahnenbutton in der Einsatzliste
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon            https://www.leitstellenspiel.de/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Funktion, um den Button auszublenden
    function hideFinishNowButton() {
        const button = document.getElementById('mission_finish_now_btn');
        if (button) {
            button.style.display = 'none';
        }
    }

    // MutationObserver, um auf Änderungen im DOM zu reagieren
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                hideFinishNowButton();
            }
        });
    });

    // Observer-Optionen
    const config = { childList: true, subtree: true };

    // Starte den Observer auf dem Body-Element
    observer.observe(document.body, config);

    // Rufe die Funktion auf, um den Button sofort auszublenden, falls er bereits vorhanden ist
    hideFinishNowButton();
})();
