// ==UserScript==
// @name         [LSS] 61- Bewerbungsstarter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fügt einen Button hinzu, der alle sichtbaren "Automatisch"-Buttons in der Tabelle klickt
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/buildings/*
// @match        https://polizei.leitstellenspiel.de/buildings/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Warten bis das DOM vollständig geladen ist
    function waitForElement(selector, callback) {
        const el = document.querySelector(selector);
        if(el) {
            callback(el);
        } else {
            const observer = new MutationObserver(() => {
                const el2 = document.querySelector(selector);
                if(el2) {
                    callback(el2);
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    // Button erstellen
    waitForElement("#autoFilterToggle", (filterToggle) => {
        const autoClickerButton = document.createElement("button");
        autoClickerButton.textContent = "🔵 Bewerbungen starten";
        autoClickerButton.style.marginRight = "8px";
        autoClickerButton.style.padding = "4px 8px";
        autoClickerButton.style.fontWeight = "bold";
        autoClickerButton.className = "btn btn-default";

        filterToggle.parentNode.insertBefore(autoClickerButton, filterToggle.nextSibling);

        // Funktion, die alle sichtbaren Automatisch-Buttons klickt
        async function clickAllAutoButtons() {
            // Alle sichtbaren <a> mit Text "Automatisch" in der aktiven Tabelle
            const visibleButtons = Array.from(document.querySelectorAll('#tab_buildings table tr td .btn-group a.btn-hire'))
                .filter(btn => btn.textContent.trim() === "Automatisch" && btn.offsetParent !== null);

            if(visibleButtons.length === 0) {
                console.log("Keine sichtbaren 'Automatisch'-Buttons gefunden.");
                return;
            }

            for(const btn of visibleButtons) {
                btn.click();
                console.log("Geklickt:", btn.href);
                await new Promise(resolve => setTimeout(resolve, 500)); // kurze Pause
            }

            console.log("Alle sichtbaren Automatisch-Buttons wurden geklickt!");
        }

        // Event Listener für den neuen Button
        autoClickerButton.addEventListener("click", clickAllAutoButtons);
    });
})();
