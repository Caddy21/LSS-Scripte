// ==UserScript==
// @name         [LSS] – Coinzähler
// @namespace    http://tampermonkey.net/
// @version      1.0
// @author       Caddy21
// @description  Summiert alle jemals erhaltenen Coins
// @match        https://www.leitstellenspiel.de/coins/list*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_xmlhttpRequest
// @connect      leitstellenspiel.de
// ==/UserScript==

(function() {
    'use strict';

    // ---------- Tools ----------
    function loadPage(page) {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://www.leitstellenspiel.de/coins/list?page=${page}`,
                onload: res => resolve(res.responseText),
                onerror: () => resolve(null)
            });
        });
    }

    function extractCoinSum(html) {
        if (!html) return 0;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        let sum = 0;
        doc.querySelectorAll("td.text-success").forEach(td => {
            const val = parseInt(td.textContent.trim());
            if (!isNaN(val)) sum += val;
        });

        return sum;
    }

    function detectLastPageNumber() {
        const pageLinks = [...document.querySelectorAll("ul.pagination a")]
            .map(a => {
                const params = new URL(a.href).searchParams;
                return parseInt(params.get("page"));
            })
            .filter(n => !isNaN(n));

        if (pageLinks.length === 0) return null;

        return Math.max(...pageLinks);
    }


    // ---------- Main ----------
    async function start() {

        // Ausgabe-Element
        const info = document.createElement("div");
        info.style.fontSize = "18px";
        info.style.fontWeight = "bold";
        info.style.color = "#333";
        info.style.margin = "10px 0";
        document.querySelector("h1")?.after(info);

        info.textContent = "Ermittle Seitenanzahl ...";

        // letzte Seite erkennen
        const lastPage = detectLastPageNumber();

        if (!lastPage) {
            info.textContent = "❌ Fehler: Seitenzahl konnte nicht ermittelt werden.";
            return;
        }

        info.textContent = `Gefunden: ${lastPage} Seiten. Lade Daten ...`;

        let total = 0;

        // Alle Seiten abrufen
        for (let p = 1; p <= lastPage; p++) {
            info.textContent = `Lade Seite ${p} von ${lastPage} ...`;
            const html = await loadPage(p);
            total += extractCoinSum(html);
        }

        info.textContent = `Gesamt erhaltene Coins: ${total}`;
    }

    start();

})();
