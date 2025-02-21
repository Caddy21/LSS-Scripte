// ==UserScript==
// @name         [LSS] Spoiler für AAOs ohne Kategorie
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Fügt einen Spoiler-Button für AAO-Einträge ohne Kategorie ein
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Funktion, um den Button hinzuzufügen
    function addSpoilerButtonToIframe(iframe) {
        let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) return;

        let target = iframeDoc.getElementById("mission_aao_no_category");
        if (!target) return;

        // Prüfen, ob der Button bereits existiert
        if (target.dataset.spoilerAdded) return; // Wenn der Bereich schon ein Spoiler-Button hat

        // Markieren, dass der Spoiler schon hinzugefügt wurde
        target.dataset.spoilerAdded = "true";

        // Button erstellen
        let button = document.createElement("button");
        button.classList.add("btn", "btn-xl", "btn-primary");  // Bootstrap-Klassen für Button-Stil
        button.style.marginBottom = "10px"; // Etwas Abstand unten
        button.innerText = "Missionen anzeigen";

        // Bereich zuerst verstecken
        target.style.display = "none";

        // Klick-Event für den Button
        button.addEventListener("click", function() {
            if (target.style.display === "none") {
                target.style.display = "block";
                button.innerText = "Missionen ausblenden";
            } else {
                target.style.display = "none";
                button.innerText = "Missionen anzeigen";
            }
        });

        // Button vor den Bereich setzen
        target.parentNode.insertBefore(button, target);
    }

    // Beobachtet das Öffnen der Lightbox
    function observeLightbox() {
        const openButtons = document.querySelectorAll('.lightbox-open'); // Button zum Öffnen der Lightbox
        if (!openButtons.length) return;

        openButtons.forEach(button => {
            button.addEventListener('click', () => {
                setTimeout(() => {  // Warten, bis die Lightbox geöffnet wurde
                    checkForLightboxAndAddButton();
                }, 500);  // Warten, dass die Lightbox vollständig geladen ist
            });
        });
    }

    // Funktion, die auf die Lightbox wartet und dann den Spoiler hinzufügt
    function checkForLightboxAndAddButton() {
        let iframes = document.querySelectorAll('iframe[id^="lightbox_iframe_"]');
        if (iframes.length === 0) return;

        iframes.forEach(iframe => {
            addSpoilerButtonToIframe(iframe);
        });
    }

    // Beobachtet Änderungen am DOM, um zu erkennen, wann eine neue Lightbox geladen wird
    let observer = new MutationObserver(() => {
        checkForLightboxAndAddButton();
    });

    // Beobachtet das Hinzufügen von neuen Iframes und das Öffnen der Lightbox
    observer.observe(document.body, { childList: true, subtree: true });

    // Zu Beginn prüfen, ob ein Iframe da ist und Button hinzufügen
    checkForLightboxAndAddButton();

    // Lightbox-Öffnen und -Schließen beobachten
    observeLightbox();
})();
