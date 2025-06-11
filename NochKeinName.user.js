// ==UserScript==
// @name         AAO-Button bei Einsatz (zwei Buttons, Lightbox/iframe Support, Standard-Position)
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Fügt in Lightbox-Iframes zwei Buttons "AAO anlegen/bearbeiten" und "AAO-Bearbeiten" im normalen Flow von .mission_header_info.row ein
// @author       DeinName
// @match        https://www.leitstellenspiel.de/*
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
            alert('AAO anlegen');
        });

        // === Button 2: AAO bearbeiten === \\
        const button2 = doc.createElement('button');
        button2.textContent = 'AAO bearbeiten';
        button2.className = 'btn btn-warning btn-xs aao-custom-button';
        button2.style.marginLeft = '10px';
        button2.addEventListener('click', () => {
            alert('AAO-Bearbeiten');
        });

        // === Button 3: AAO löschen === \\
        const button3 = doc.createElement('button');
        button3.textContent = 'AAO löschen';
        button3.className = 'btn btn-danger btn-xs aao-custom-button';
        button3.style.marginLeft = '10px';
        button3.addEventListener('click', () => {
            alert('AAO-Löschen');
        });

        // === Buttons direkt ans Ende des Containers einfügen (ohne Flexbox, Standard-Flow) === \\
        headerInfo.appendChild(button1);
        headerInfo.appendChild(button2);
        headerInfo.appendChild(button3);

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
