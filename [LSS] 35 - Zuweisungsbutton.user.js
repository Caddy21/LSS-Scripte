// ==UserScript==
// @name         [LSS] Zuweisungsbutton
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fügt einen Zuweisungs-Button neben den Bearbeiten-Button in Fahrzeugtabellen ein.
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Hilfsfunktion: Button einfügen
    function addButtons(container=document) {
        container.querySelectorAll("tr").forEach(row => {
            const editBtn = row.querySelector("a[href*='/edit']");
            if (editBtn && !row.querySelector("a[href*='/zuweisung']")) {
                const href = editBtn.getAttribute("href");
                const match = href.match(/\/vehicles\/(\d+)\/edit/);

                if (match) {
                    const vehicleId = match[1];

                    const newBtn = document.createElement("a");
                    newBtn.className = "btn btn-default btn-xs";
                    newBtn.href = `/vehicles/${vehicleId}/zuweisung`;

                    const span = document.createElement("span");
                    span.className = "glyphicon glyphicon-user";
                    span.title = "Personalzuweisung";

                    newBtn.appendChild(span);

                    editBtn.parentNode.appendChild(newBtn);
                }
            }
        });
    }

    // Beobachter für neue Iframes
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.tagName === "IFRAME") {
                    if (node.id && node.id.startsWith("lightbox_iframe_")) {
                        node.addEventListener("load", () => {
                            try {
                                const doc = node.contentDocument || node.contentWindow.document;
                                if (doc) {
                                    addButtons(doc);

                                    // Auch innerhalb des iFrames Veränderungen beobachten
                                    const innerObserver = new MutationObserver(() => addButtons(doc));
                                    innerObserver.observe(doc.body, { childList: true, subtree: true });
                                }
                            } catch (e) {
                                console.warn("Kein Zugriff auf Iframe-Inhalt:", e);
                            }
                        });
                    }
                }
            });
        });
    });

    // Hauptseite beobachten → neue Lightbox-Iframes abfangen
    observer.observe(document.body, { childList: true, subtree: true });

})();
