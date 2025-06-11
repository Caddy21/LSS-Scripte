// ==UserScript==
// @name         [LSS] AAO schneller anlegen
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fügt im Einsatzfenster ein Button zum AAO-Anlegen ein.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // === Scriptstart, Log Initialisierung === \\
    console.log("[AAO-Button] Userscript geladen und aktiv.");

    function tryInjectButtonInDoc(doc) {
        // === Suche nach dem mission_header_info row-Container === \\
        const headerInfo = doc.querySelector('.mission_header_info.row');
        if (!headerInfo) {
            console.log("[AAO-Button] .mission_header_info.row NICHT gefunden (iframe-Modus).");
            return;
        }
        // === Prüfe, ob die Buttons bereits existieren === \\
        if (headerInfo.querySelector('.aao-custom-button')) {
            console.log("[AAO-Button] Buttons existieren bereits, kein Einfügen nötig.");
            return;
        }

        // === Button 1: AAO anlegen === \\
        const button1 = doc.createElement('button');
        button1.textContent = 'AAO anlegen';
        button1.className = 'btn btn-success btn-xs aao-custom-button';
        button1.style.marginLeft = '10px';
        button1.addEventListener('click', () => {
            window.open('https://www.leitstellenspiel.de/aaos/new', '_blank');
        });

        // === Buttons direkt ans Ende des Containers einfügen (ohne Flexbox, Standard-Flow) === \\
        headerInfo.appendChild(button1);

        console.log("[AAO-Button] Beide Buttons erfolgreich in .mission_header_info.row im Standard-Flow eingefügt.");
    }

    function watchIframe(iframe) {
        console.log("[AAO-Button] Beobachte Iframe:", iframe);

        function tryInject() {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                if (!doc) {
                    console.log("[AAO-Button] Kein Zugriff auf contentDocument.");
                    return;
                }
                const interval = setInterval(() => {
                    if (doc.readyState === "complete" || doc.readyState === "interactive") {
                        tryInjectButtonInDoc(doc);
                    }
                }, 400);
                setTimeout(() => clearInterval(interval), 10000);
            } catch (e) {
                console.log("[AAO-Button] Fehler beim Zugriff auf iframe-Dokument:", e);
            }
        }

        iframe.addEventListener('load', function () {
            console.log("[AAO-Button] Iframe geladen, versuche Buttons einzufügen.");
            tryInject();
        });

        if (iframe.contentDocument && (iframe.contentDocument.readyState === "complete" || iframe.contentDocument.readyState === "interactive")) {
            tryInject();
        }
    }

    const observer = new MutationObserver((mutationsList) => {
        mutationsList.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.tagName === "IFRAME" && node.id && /^lightbox_iframe_\d+$/.test(node.id)) {
                    console.log("[AAO-Button] Neue Lightbox-Iframe erkannt:", node);
                    watchIframe(node);
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    console.log("[AAO-Button] Haupt-Observer auf document.body gestartet.");

    document.querySelectorAll('iframe[id^="lightbox_iframe_"]').forEach(watchIframe);

})();
