// ==UserScript==
// @name         [LSS] 10 - Auszeichnungsverwalter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fügt Tabs bei den Auszeichnungen hinzu zur besseren Übersicht
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

// Aktueller Bug:
// VIP wird beim öffnen noch unter "Allgemein" angezeigt, beim Klick auf "VIP" allerdings dorthin verlagert und aus "Allgmeine" entfernt.

(function() {
    'use strict';

//    console.log("Skript gestartet.");

    // Funktion zum Überwachen des DOMs auf Änderungen
    const observer = new MutationObserver(() => {
        let iframe = document.querySelector("iframe[id^='lightbox_iframe_']");
        if (iframe && !iframe.hasAttribute('data-processed')) { // Verhindern, dass der iFrame mehrfach verarbeitet wird
//            console.log("iFrame gefunden:", iframe);
            iframe.onload = function() {
//                console.log("iFrame vollständig geladen.");
                processIframe(iframe); // Verarbeitet das iFrame, wenn es vollständig geladen ist
                iframe.setAttribute('data-processed', 'true'); // Markiert den iFrame als verarbeitet
            };
        } else {
//            console.log("Kein iFrame oder bereits verarbeitet.");
        }
    });

    // Beobachtung des DOMs starten
    observer.observe(document.body, { childList: true, subtree: true });

    // Beobachtung des DOMs starten
    observer.observe(document.body, { childList: true, subtree: true });

    // Funktion, die das iFrame verarbeitet und Tabs hinzufügt
    function processIframe(iframe) {
        let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

        // Warten, bis der Inhalt des iFrames vollständig geladen ist
        if (iframeDoc.readyState === "complete") {
//            console.log("iFrame-Dokument vollständig geladen.");
            addTabs(iframeDoc); // Tabs hinzufügen
        } else {
            iframe.onload = function() {
//                console.log("iFrame-Dokument vollständig geladen (onload).");
                addTabs(iframeDoc); // Wenn iFrame nachgeladen wird, füge Tabs hinzu
            };
        }
    }

    // Funktion zum Hinzufügen der Tabs mit Jahreszahlen, "Allgemein" und "VIP"
    function addTabs(iframeDoc) {
//        console.log("Beginne mit Tab-Erstellung...");

        let years = new Set();
        let generalItems = [];
        let vipItems = [];
        let goldItems = [];

        // Jahreszahlen auslesen
        let headers = iframeDoc.querySelectorAll(".grid-item-header .panel-title");
        if (headers.length === 0) {
//            console.warn("Keine Auszeichnungen im iFrame gefunden.");
        }

        headers.forEach(header => {
            let text = header.innerText.trim();
//            console.log(`Gefundener Text in Auszeichnung: ${text}`);

            // Überprüfen, ob eine Jahreszahl vorhanden ist
            let yearMatch = text.match(/\b(20\d{2})\b/); // Jahreszahlen suchen
            if (yearMatch) {
                years.add(yearMatch[1]);
//                console.log(`Jahreszahl gefunden: ${yearMatch[1]}`);
            } else if (text.includes("VIP")) {
                vipItems.push(header.closest(".grid-item"));
//                console.log(`"VIP" Auszeichnung gefunden, wird unter "VIP" angezeigt.`);
            } else {
                generalItems.push(header.closest(".grid-item"));
//                console.log(`Keine Jahreszahl gefunden, wird unter "Allgemein" angezeigt.`);
            }
        });


        // Suche nach "Gold"-Auszeichnungen und entferne sie aus "Allgemein"
        generalItems = generalItems.filter(item => {
            let goldLabel = item.querySelector(".grid-item-text .label-award-gold");

            if (goldLabel) {
                goldItems.push(item); // In den Gold-Tab verschieben
//                console.log(`Gold-Auszeichnung gefunden und in "Gold" verschoben: ${item.querySelector(".panel-title").innerText}`);
                return false; // Entferne aus "Allgemein"
            }
            return true; // Behalte in "Allgemein"
        });



        if (years.size === 0 && generalItems.length === 0 && vipItems.length === 0) {
//            console.warn("Keine Jahreszahlen, keine Allgemein-Auszeichnungen und keine VIP-Auszeichnungen gefunden, breche ab.");
            return;
        }

//        console.log(`Erkannte Jahreszahlen: ${Array.from(years).join(', ')}`);
//        console.log(`"Allgemein"-Auszeichnungen: ${generalItems.length}`);
//        console.log(`"VIP"-Auszeichnungen: ${vipItems.length}`);

        // Prüfen, ob der Tab-Container im iFrame bereits existiert, falls nicht, erstellen
        let tabContainer = iframeDoc.querySelector("#year-tabs");
        if (!tabContainer) {
            // Tab-Container erstellen
            tabContainer = iframeDoc.createElement("div");
            tabContainer.id = "year-tabs";
            tabContainer.className = "tabs";

            // Tab-Navigation (ul)
            let tabNav = iframeDoc.createElement("ul");
            tabNav.className = "nav nav-tabs";
            tabNav.setAttribute("role", "tablist");
            tabNav.id = "tabs";

            // "Allgemein"-Tab hinzufügen
            let generalTab = iframeDoc.createElement("li");
            generalTab.setAttribute("role", "presentation");
            generalTab.classList.add("active");
            generalTab.innerHTML = `<a href="#general" aria-controls="general" role="tab" data-toggle="tab" aria-expanded="true">Allgemein</a>`;
            tabNav.appendChild(generalTab);

            // "VIP"-Tab hinzufügen
            let vipTab = iframeDoc.createElement("li");
            vipTab.setAttribute("role", "presentation");
            vipTab.innerHTML = `<a href="#vip" aria-controls="vip" role="tab" data-toggle="tab" aria-expanded="false">VIP</a>`;
            tabNav.appendChild(vipTab);

            // "Gold"-Tab hinzufügen
            let goldTab = iframeDoc.createElement("li");
            goldTab.setAttribute("role", "presentation");
            goldTab.innerHTML = `<a href="#gold" aria-controls="gold" role="tab" data-toggle="tab" aria-expanded="false">Gold</a>`;
            tabNav.appendChild(goldTab);

            // Jahreszahl-Tabs hinzufügen
            years = Array.from(years).sort().reverse(); // Sortieren absteigend
            years.forEach(year => {
                let tab = iframeDoc.createElement("li");
                tab.setAttribute("role", "presentation");
                tab.innerHTML = `<a href="#profile_${year}" aria-controls="profile_${year}" role="tab" data-toggle="tab" aria-expanded="false">${year}</a>`;
                tabNav.appendChild(tab);
            });

            tabContainer.appendChild(tabNav);

            // Tab-Content (div)
            let tabContent = iframeDoc.createElement("div");
            tabContent.className = "tab-content";

            // "Allgemein"-Tab-Inhalt hinzufügen
            let generalTabContent = iframeDoc.createElement("div");
            generalTabContent.id = "general";
            generalTabContent.className = "tab-pane active";
            generalTabContent.innerHTML = generalItems.map(item => item.outerHTML).join('');
            tabContent.appendChild(generalTabContent);

            // "VIP"-Tab-Inhalt hinzufügen
            let vipTabContent = iframeDoc.createElement("div");
            vipTabContent.id = "vip";
            vipTabContent.className = "tab-pane";
            vipTabContent.innerHTML = vipItems.map(item => item.outerHTML).join('');
            tabContent.appendChild(vipTabContent);

            // "Gold"-Tab-Inhalt hinzufügen
            let goldTabContent = iframeDoc.createElement("div");
            goldTabContent.id = "gold";
            goldTabContent.className = "tab-pane";
            goldTabContent.innerHTML = goldItems.map(item => item.outerHTML).join('');
            tabContent.appendChild(goldTabContent);

            // Jahreszahl-Inhalte hinzufügen
            years.forEach(year => {
                let yearItems = [];
                headers.forEach(header => {
                    let text = header.innerText.trim();
                    let yearCheck = text.match(/\b(20\d{2})\b/);
                    if (yearCheck && yearCheck[0] === year) {
                        yearItems.push(header.closest(".grid-item"));
                    }
                });

                let yearTabContent = iframeDoc.createElement("div");
                yearTabContent.id = `profile_${year}`;
                yearTabContent.className = "tab-pane";
                yearTabContent.innerHTML = yearItems.map(item => item.outerHTML).join('');
                tabContent.appendChild(yearTabContent);
            });

            // Tabs und Inhalte in den iFrame einfügen
            let header = iframeDoc.querySelector("#iframe-inside-container > div.page-header");
            if (header) {
                header.insertAdjacentElement("afterend", tabContainer);
                header.insertAdjacentElement("afterend", tabContent);
//                console.log("[Tampermonkey] Tabs erfolgreich eingefügt!");
            } else {
                console.warn("Kein Header gefunden, Tabs wurden nicht eingefügt.");
            }

            // Standardmäßig den "Allgemein"-Tab aktivieren
            generalTab.classList.add("active");
            generalTabContent.classList.add("active");

            // Alle Auszeichnungen zu Beginn verstecken
            let allItems = iframeDoc.querySelectorAll(".grid-item");
            allItems.forEach(item => item.style.display = "none");

            // Auszeichnungen im "Allgemein"-Tab anzeigen
            generalItems.forEach(item => item.style.display = "block");

            // Auszeichnungen im "VIP"-Tab anzeigen
            vipItems.forEach(item => item.style.display = "block");

            $(tabNav).find("li").on("click", function(event) {
                let targetTabId = $(this).find("a").attr("href").substr(1); // Tab-ID extrahieren
                $(tabNav).find("li").removeClass("active"); // Entferne "active" von allen Tabs
                $(this).addClass("active"); // Füge "active" zum geklickten Tab hinzu
                $(tabContent).find(".tab-pane").removeClass("active"); // Entferne "active" von allen Inhalten
                $("#" + targetTabId).addClass("active"); // Füge "active" dem gewählten Inhalt hinzu

                // Alle Auszeichnungen verstecken
                allItems.forEach(item => item.style.display = "none");

                // Logik für verschiedene Tabs
                if (targetTabId === "general") {
                    generalItems.forEach(item => item.style.display = "block");
                } else if (targetTabId === "vip") {
                    vipItems.forEach(item => item.style.display = "block");
                } else if (targetTabId === "gold") {
                    goldItems.forEach(item => item.style.display = "block");
                } else {
                    let selectedYear = targetTabId.replace("profile_", "");
                    let yearItems = [];
                    headers.forEach(header => {
                        let text = header.innerText.trim();
                        let yearCheck = text.match(/\b(20\d{2})\b/);
                        if (yearCheck && yearCheck[0] === selectedYear) {
                            yearItems.push(header.closest(".grid-item"));
                        }
                    });
                    yearItems.forEach(item => item.style.display = "block");
                }
            });
        } else {
//            console.log("Tab-Container existiert bereits.");
        }
    }
})();
