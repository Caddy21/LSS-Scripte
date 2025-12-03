// ==UserScript==
// @name         LSS – Coins Dashboard Optimiert
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Coins Dashboard mit Cache, Retry, Monats-/Jahresstatistik, ohne Hintergrund, Ladebalken ausgeblendet nach Fertigstellung
// @match        https://www.leitstellenspiel.de/coins/list*
// @grant        GM_xmlhttpRequest
// @connect      leitstellenspiel.de
// ==/UserScript==

(function() {
    'use strict';

    const DB_NAME = "lss_coins_dashboard";
    const STORE_NAME = "pages";
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

    // ---------- IndexedDB ----------
    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: "page" });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function getCachedPage(db, page) {
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(page);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    }

    function setCachedPage(db, page, html) {
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            store.put({ page, html, time: Date.now() });
            tx.oncomplete = async () => {
                await new Promise(r => setTimeout(r, 50)); // kurze Pause
                resolve();
            };
        });
    }

    async function loadPageFromServer(page) {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://www.leitstellenspiel.de/coins/list?page=${page}`,
                onload: res => resolve(res.responseText),
                onerror: () => resolve(null),
            });
        });
    }

    async function loadPage(db, page) {
        const cached = await getCachedPage(db, page);
        if (cached && Date.now() - cached.time < CACHE_TTL) return cached.html;
        const html = await loadPageFromServer(page);
        await setCachedPage(db, page, html);
        return html;
    }

    async function loadPageWithRetry(db, page, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const html = await loadPage(db, page);
                if (html) return html;
            } catch (e) { console.warn(`Seite ${page} Laden fehlgeschlagen, Versuch ${i+1}`); }
            await new Promise(r => setTimeout(r, 500));
        }
        console.error(`Seite ${page} konnte nicht geladen werden.`);
        return null;
    }

    function extractValues(html) {
        if (!html) return { income: 0, expense: 0, entries: [] };
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const entries = [];
        doc.querySelectorAll("tr").forEach(tr => {
            const tdValue = tr.querySelector("td");
            if (!tdValue) return;
            const val = parseInt(tdValue.textContent.trim());
            if (isNaN(val)) return;
            const description = tr.querySelectorAll("td")[1]?.textContent.trim() || "";
            const dateAttr = tr.querySelectorAll("td")[2]?.getAttribute("data-logged-at") || "";
            const date = dateAttr ? new Date(dateAttr) : null;
            entries.push({ value: val, description, date });
        });
        return { entries };
    }

    function detectLastPageNumber() {
        const pageLinks = [...document.querySelectorAll("ul.pagination a")].map(a => {
            const n = parseInt(a.textContent.trim());
            return isNaN(n) ? null : n;
        }).filter(n => n !== null);
        return pageLinks.length ? Math.max(...pageLinks) : 1;
    }

    function calculateStats(entries) {
        const yearly = {};
        const monthly = {};
        entries.forEach(entry => {
            if (!entry.date) return;
            const y = entry.date.getFullYear();
            const m = entry.date.getMonth() + 1;
            if (!yearly[y]) yearly[y] = { income: 0, expense: 0, saldo: 0 };
            if (!monthly[y]) monthly[y] = {};
            if (!monthly[y][m]) monthly[y][m] = { income: 0, expense: 0, saldo: 0 };
            const val = entry.value;
            if (val > 0) { yearly[y].income += val; monthly[y][m].income += val; }
            else { yearly[y].expense += val; monthly[y][m].expense += val; }
            yearly[y].saldo += val;
            monthly[y][m].saldo += val;
        });
        return { yearly, monthly };
    }

    function calculateTotal(yearly) {
        let totalIncome = 0, totalExpense = 0, totalSaldo = 0;
        for (const y in yearly) { totalIncome += yearly[y].income; totalExpense += yearly[y].expense; totalSaldo += yearly[y].saldo; }
        return { income: totalIncome, expense: totalExpense, saldo: totalSaldo };
    }

    async function startDashboard() {
        const db = await openDB();
        const lastPage = detectLastPageNumber();

        const container = document.createElement("div");
        container.style.padding = "10px";
        container.style.margin = "10px 0";
        container.style.maxHeight = "600px";
        container.style.overflow = "auto";
        container.style.fontFamily = "Arial, sans-serif";
        container.style.fontSize = "14px";

        const title = document.createElement("h2");
        title.textContent = "📊 Coins Dashboard";
        container.prepend(title);
        document.querySelector("h1")?.after(container);

        const progressWrap = document.createElement("div");
        progressWrap.style.width = "100%";
        progressWrap.style.height = "12px";
        progressWrap.style.background = "#ddd";
        progressWrap.style.borderRadius = "6px";
        progressWrap.style.margin = "6px 0";
        const progressBar = document.createElement("div");
        progressBar.style.height = "100%";
        progressBar.style.width = "0%";
        progressBar.style.background = "#4caf50";
        progressBar.style.borderRadius = "6px";
        progressBar.style.transition = "width 0.2s linear";
        progressWrap.appendChild(progressBar);
        container.appendChild(progressWrap);

        const statusText = document.createElement("div");
        statusText.style.margin = "4px 0 8px 0";
        container.appendChild(statusText);

        // Alle Seiten laden
        let allEntries = [];
        for (let p = 1; p <= lastPage; p++) {
            statusText.textContent = `Lade Seite ${p} von ${lastPage} ...`;
            progressBar.style.width = ((p / lastPage) * 100).toFixed(1) + "%";
            const html = await loadPageWithRetry(db, p);
            if (!html) continue;
            const { entries } = extractValues(html);
            allEntries.push(...entries);
        }

        progressBar.style.display = "none"; // Ladebalken ausblenden
        statusText.textContent = `Daten geladen: ${allEntries.length} Einträge`;

        const stats = calculateStats(allEntries);
        const totalStats = calculateTotal(stats.yearly);

        // UI-Tabs
        const tabs = document.createElement("div");
        tabs.style.margin = "8px 0";
        const tabButtons = document.createElement("div");
        tabButtons.style.marginBottom = "8px";
        const contentArea = document.createElement("div");
        tabs.appendChild(tabButtons);
        tabs.appendChild(contentArea);
        container.appendChild(tabs);

        function createTable(headers, dataRows) {
            const table = document.createElement("table");
            table.style.borderCollapse = "collapse";
            table.style.width = "100%";
            table.style.marginBottom = "8px";
            const thead = document.createElement("thead");
            const trHead = document.createElement("tr");
            headers.forEach(h => { const th = document.createElement("th"); th.textContent = h; th.style.border = "1px solid #ccc"; th.style.padding = "4px 6px"; th.style.background = "#eee"; trHead.appendChild(th); });
            thead.appendChild(trHead);
            table.appendChild(thead);
            const tbody = document.createElement("tbody");
            dataRows.forEach(row => { const tr = document.createElement("tr"); row.forEach(cell => { const td = document.createElement("td"); td.textContent = cell; td.style.border = "1px solid #ccc"; td.style.padding = "4px 6px"; tr.appendChild(td); }); tbody.appendChild(tr); });
            table.appendChild(tbody);
            return table;
        }

        const tabsContent = {};
        tabsContent["Gesamt"] = createTable(["Einnahmen","Ausgaben","Saldo"], [[totalStats.income, totalStats.expense, totalStats.saldo]]);

        const yearlyRows = Object.keys(stats.yearly).sort().map(y => { const s = stats.yearly[y]; return [y,s.income,s.expense,s.saldo]; });
        tabsContent["Jahr"] = createTable(["Jahr","Einnahmen","Ausgaben","Saldo"], yearlyRows);

        const monthRows = [];
        Object.keys(stats.monthly).sort().forEach(y => { const months = stats.monthly[y]; for(let m=1;m<=12;m++){ if(months[m]){ const s=months[m]; monthRows.push([y+"-"+String(m).padStart(2,"0"),s.income,s.expense,s.saldo]);}}});
        tabsContent["Monat"] = createTable(["Monat","Einnahmen","Ausgaben","Saldo"], monthRows);

        let currentTab="Gesamt";
        function switchTab(name){
            contentArea.innerHTML="";
            contentArea.appendChild(tabsContent[name]);
            currentTab=name;
            Array.from(tabButtons.children).forEach(btn => { btn.style.background = btn.textContent===name?"#4caf50":"#eee"; btn.style.color = btn.textContent===name?"#fff":"#000"; });
        }

        ["Gesamt","Jahr","Monat"].forEach(name => { const btn=document.createElement("button"); btn.textContent=name; btn.style.marginRight="4px"; btn.style.padding="4px 8px"; btn.style.border="none"; btn.style.borderRadius="4px"; btn.style.cursor="pointer"; btn.style.background="#eee"; btn.addEventListener("click",()=>switchTab(name)); tabButtons.appendChild(btn); });
        switchTab(currentTab);
    }

    startDashboard();
})();
