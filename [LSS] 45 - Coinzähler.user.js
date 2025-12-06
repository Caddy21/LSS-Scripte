// ==UserScript==
// @name         [LSS] Coinzähler
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Coins Dashboard für Leitstellenspiel: zeigt Gesamt-, Jahres- und Monatsstatistiken inkl. detaillierter Aufschlüsselung nach Ereignissen
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/coins/list*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_xmlhttpRequest
// @connect      leitstellenspiel.de
// ==/UserScript==

(function() {
    'use strict';

    const DB_NAME = "lss_coins_dashboard";
    const STORE_NAME = "pages";
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

    const darkMode = isDarkMode();
    const colors = {
        tabActive: "#4caf50",
        tabInactive: darkMode ? "#333" : "#eee",
        tabActiveText: "#fff",
        tabInactiveText: darkMode ? "#ddd" : "#000",
        reloadBg: darkMode ? "#1976d2" : "#2196f3",
        reloadText: "#fff",
        tableHeader: darkMode ? "#555" : "#eee",
        tableBorder: darkMode ? "#666" : "#ccc",
        containerBg: darkMode ? "#222" : "#fff",
        textColor: darkMode ? "#ddd" : "#000"
    };

    const h1 = document.querySelector("h1");
    if (h1 && h1.textContent.trim() === "Coins") h1.style.display = "none";

    function isDarkMode() {
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const rgb = bodyBg.match(/\d+/g);
        if (!rgb) return false;
        const r = parseInt(rgb[0]), g = parseInt(rgb[1]), b = parseInt(rgb[2]);
        const brightness = (r*299 + g*587 + b*114)/1000;
        return brightness < 128;
    }

    // IndexedDB
    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_NAME))
                    db.createObjectStore(STORE_NAME, { keyPath: "page" });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function getCachedPage(db, page) {
        return new Promise(resolve => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(page);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    }

    function setCachedPage(db, page, html) {
        return new Promise(resolve => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            store.put({ page, html, time: Date.now() });
            tx.oncomplete = async () => { await new Promise(r => setTimeout(r,50)); resolve(); };
        });
    }

    async function loadPageFromServer(page) {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://www.leitstellenspiel.de/coins/list?page=${page}`,
                onload: res => resolve(res.responseText),
                onerror: () => resolve(null)
            });
        });
    }

    async function loadPage(db, page) {
        const cached = await getCachedPage(db, page);
        if (cached && Date.now() - cached.time < CACHE_TTL) return cached.html;
        const html = await loadPageFromServer(page);
        if (html) await setCachedPage(db, page, html);
        return html;
    }

    async function loadPageWithRetry(db, page, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const html = await loadPage(db, page);
                if (html) return html;
            } catch(e) {}
            await new Promise(r => setTimeout(r, 500));
        }
        return null;
    }

    function extractValues(html) {
        if (!html) return { entries: [] };
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
        const nums = [...document.querySelectorAll("ul.pagination a")]
            .map(a => parseInt(a.textContent.trim()))
            .filter(n => !isNaN(n));
        return nums.length ? Math.max(...nums) : 1;
    }

    function calculateStats(entries) {
        const yearly = {};
        const monthly = {};
        const byDescription = {};

        entries.forEach(entry => {
            if (!entry.date) return;
            const y = entry.date.getFullYear();
            const m = entry.date.getMonth() + 1;
            const val = entry.value;
            const desc = entry.description || "Unbekannt";

            if (!yearly[y]) yearly[y] = { income:0, expense:0, saldo:0 };
            if (val > 0) yearly[y].income += val;
            else yearly[y].expense += val;
            yearly[y].saldo += val;

            if (!monthly[y]) monthly[y] = {};
            if (!monthly[y][m]) monthly[y][m] = { income:0, expense:0, saldo:0 };
            if (val > 0) monthly[y][m].income += val;
            else monthly[y][m].expense += val;
            monthly[y][m].saldo += val;

            if (!byDescription[y]) byDescription[y] = {};
            if (!byDescription[y][m]) byDescription[y][m] = {};
            if (!byDescription[y][m][desc])
                byDescription[y][m][desc] = { income:0, expense:0, saldo:0 };

            if (val > 0) byDescription[y][m][desc].income += val;
            else byDescription[y][m][desc].expense += val;
            byDescription[y][m][desc].saldo += val;
        });

        return { yearly, monthly, byDescription };
    }

    function calculateTotal(yearly) {
        let income = 0, expense = 0, saldo = 0;
        for (const y in yearly) {
            income += yearly[y].income;
            expense += yearly[y].expense;
            saldo += yearly[y].saldo;
        }
        return { income, expense, saldo };
    }

    function createTable(headers, dataRows) {
        const table = document.createElement("table");
        table.style.borderCollapse = "collapse";
        table.style.width = "100%";
        table.style.marginBottom = "8px";

        const thead = document.createElement("thead");
        const trHead = document.createElement("tr");
        headers.forEach(h => {
            const th = document.createElement("th");
            th.textContent = h;
            th.style.border = `1px solid ${colors.tableBorder}`;
            th.style.padding = "4px 6px";
            th.style.background = colors.tableHeader;
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        dataRows.forEach(row => {
            const tr = document.createElement("tr");
            row.forEach(cell => {
                const td = document.createElement("td");
                td.textContent = cell;
                td.style.border = `1px solid ${colors.tableBorder}`;
                td.style.padding = "4px 6px";
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        return table;
    }

    // Normalisierung für Gesamt/Jahr
    function normalizeDesc(desc) {
        if (!desc) return "Unbekannt";
        desc = desc.trim();
        if (desc.startsWith("Erfüllte Aufgabe")) return "Erfüllte Aufgabe";
        if (desc.startsWith("Erledige")) return "Erledigte Aufgaben";
        if (desc.includes("Event-Aufgaben")) return "Event-Aufgaben";
        if (/^Gib\s+\d+/.test(desc) || desc.includes("Coins aus")) return "Gib Coins aus";
        if (/^Kaufe\s+\d+/.test(desc) || desc.startsWith("Kaufe ")) return "Kaufe Coins";
        if (desc.includes("InApp") || desc.includes("Premium")) return "InApp / Premium";
        if (desc.startsWith("Einsatz fertiggestellt (Verband)")) return "Einsatz (Verband)";
        if (desc.startsWith("Einsatz fertiggestellt")) return "Einsatz fertiggestellt";
        if (desc.startsWith("Level Upgrade")) return "Level Upgrade";
        if (desc.startsWith("Täglicher Login-Bonus")) return "Täglicher Login-Bonus";
        if (desc.startsWith("Belohnung für das Beenden des Tutorials")) return "Tutorial Belohnung";
        if (desc.startsWith("Event Calendar")) return "Event Calendar";
        if (desc.startsWith("Großeinsatz")) return "Großeinsatz starten";
        if (desc.startsWith("Personal eingestellt")) return "Personal eingestellt";
        if (desc.includes("Wache erweitert") || desc.includes("Wachenerweiterung") || desc.includes("erweitert (von Kleinwache)")) return "Wache erweitert";
        desc = desc.replace(/^[A-Za-zÄÖÜäöüß\s\-]+ - /, "");
        desc = desc.replace(/"\s*[^"]*"\s*/g, " ").replace(/\d+/g, "").replace(/\s+/g, " ").trim();
        return desc || "Unbekannt";
    }

    async function startDashboard() {
        const db = await openDB();

        const container = document.createElement("div");
        container.style.padding = "10px";
        container.style.margin = "10px 0";
        container.style.maxHeight = "600px";
        container.style.overflow = "auto";
        container.style.background = colors.containerBg;
        container.style.color = colors.textColor;
        container.style.fontFamily = "Arial, sans-serif";

        const titleWrap = document.createElement("div");
        titleWrap.style.display = "flex";
        titleWrap.style.justifyContent = "space-between";
        titleWrap.style.alignItems = "center";
        container.appendChild(titleWrap);

        const title = document.createElement("h2");
        title.textContent = "📊 Coins Dashboard";
        title.style.margin = "0";
        titleWrap.appendChild(title);

        const reloadBtn = document.createElement("button");
        reloadBtn.textContent = "🔄 Neu laden";
        reloadBtn.style.padding = "4px 8px";
        reloadBtn.style.background = colors.reloadBg;
        reloadBtn.style.color = colors.reloadText;
        reloadBtn.style.border = "none";
        reloadBtn.style.borderRadius = "4px";
        reloadBtn.style.cursor = "pointer";
        titleWrap.appendChild(reloadBtn);

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
        statusText.style.margin = "4px 0";
        container.appendChild(statusText);

        progressWrap.style.display = "none";
        progressBar.style.display = "none";
        statusText.style.display = "none";

        const lastPage = detectLastPageNumber();

        function renderDashboard(entries) {
            const stats = calculateStats(entries);
            const totals = calculateTotal(stats.yearly);

            const oldTabs = container.querySelector(".tabs");
            if (oldTabs) oldTabs.remove();

            const tabs = document.createElement("div");
            tabs.className = "tabs";
            container.appendChild(tabs);

            const tabButtons = document.createElement("div");
            tabButtons.style.marginBottom = "8px";
            tabs.appendChild(tabButtons);

            const tabContent = document.createElement("div");
            tabs.appendChild(tabContent);

            // --- Gesamt-Tab ---
            const descTotal = {};
            entries.forEach(entry => {
                if (!entry.description) return;
                const norm = normalizeDesc(entry.description);
                if (!descTotal[norm]) descTotal[norm] = { income: 0, expense: 0, saldo: 0 };
                const val = entry.value;
                if (val > 0) descTotal[norm].income += val;
                else descTotal[norm].expense += val;
                descTotal[norm].saldo += val;
            });

            const totalRows = Object.entries(descTotal)
                .map(([desc, vals]) => [desc, vals.income, vals.expense, vals.saldo])
                .sort((a, b) => b[3] - a[3]);

            const totalDiv = document.createElement("div");
            totalDiv.appendChild(
                createTable(
                    ["Einnahmen", "Ausgaben", "Saldo"],
                    [[totals.income, totals.expense, totals.saldo]]
                )
            );
            totalDiv.appendChild(
                createTable(
                    ["Beschreibung", "Einnahmen", "Ausgaben", "Saldo"],
                    totalRows
                )
            );

            const mainTabs = {
                "Gesamt": totalDiv,
                "Jahr": document.createElement("div")
            };

            // --- Jahr-Tab (wie vorher) ---
            const yearWrapper = mainTabs["Jahr"];
            const yearButtons = document.createElement("div");
            yearButtons.style.marginBottom = "6px";
            yearWrapper.appendChild(yearButtons);

            const yearContent = document.createElement("div");
            yearWrapper.appendChild(yearContent);

            const years = Object.keys(stats.yearly).sort();

            years.forEach(y => {
                const yBtn = document.createElement("button");
                yBtn.textContent = y;
                yBtn.style.marginRight = "4px";
                yBtn.style.padding = "4px 8px";
                yBtn.style.border = "none";
                yBtn.style.borderRadius = "4px";
                yBtn.style.background = colors.tabInactive;
                yBtn.style.color = colors.tabInactiveText;
                yBtn.style.cursor = "pointer";

                yBtn.addEventListener("click", () => {
                    [...yearButtons.children].forEach(b => {
                        b.style.background = colors.tabInactive;
                        b.style.color = colors.tabInactiveText;
                    });
                    yBtn.style.background = colors.tabActive;
                    yBtn.style.color = colors.tabActiveText;

                    yearContent.innerHTML = "";

                    const monthButtons = document.createElement("div");
                    monthButtons.style.marginBottom = "4px";
                    yearContent.appendChild(monthButtons);

                    const monthContent = document.createElement("div");
                    yearContent.appendChild(monthContent);

                    // Gesamt fürs Jahr
                    const totalBtn = document.createElement("button");
                    totalBtn.textContent = "Gesamt";
                    totalBtn.style.marginRight = "3px";
                    totalBtn.style.padding = "2px 6px";
                    totalBtn.style.border = "none";
                    totalBtn.style.borderRadius = "4px";
                    totalBtn.style.background = colors.tabInactive;
                    totalBtn.style.color = colors.tabInactiveText;
                    totalBtn.style.cursor = "pointer";

                    totalBtn.addEventListener("click", () => {
                        [...monthButtons.children].forEach(b => {
                            b.style.background = colors.tabInactive;
                            b.style.color = colors.tabInactiveText;
                        });
                        totalBtn.style.background = colors.tabActive;
                        totalBtn.style.color = colors.tabActiveText;

                        monthContent.innerHTML = "";
                        monthContent.appendChild(
                            createTable(
                                ["Jahr","Einnahmen","Ausgaben","Saldo"],
                                [[y, stats.yearly[y].income, stats.yearly[y].expense, stats.yearly[y].saldo]]
                            )
                        );

                        // Jahresbeschreibung normalisiert
                        const descYear = {};
                        if (stats.byDescription[y]) {
                            for (const m in stats.byDescription[y]) {
                                for (const desc in stats.byDescription[y][m]) {
                                    const norm = normalizeDesc(desc);
                                    if (!descYear[norm]) descYear[norm] = { income:0, expense:0, saldo:0 };
                                    const vals = stats.byDescription[y][m][desc];
                                    descYear[norm].income += vals.income;
                                    descYear[norm].expense += vals.expense;
                                    descYear[norm].saldo += vals.saldo;
                                }
                            }
                        }
                        const rows = Object.entries(descYear)
                            .map(([desc, vals]) => [desc, vals.income, vals.expense, vals.saldo])
                            .sort((a,b)=>b[3]-a[3]);

                        monthContent.appendChild(
                            createTable(["Beschreibung","Einnahmen","Ausgaben","Saldo"], rows)
                        );
                    });

                    monthButtons.appendChild(totalBtn);

                    const monthNames = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
                    for (let m=1; m<=12; m++) {
                        if (!stats.monthly[y][m]) continue;
                        const mBtn = document.createElement("button");
                        mBtn.textContent = monthNames[m-1];
                        mBtn.style.marginRight = "3px";
                        mBtn.style.padding = "2px 6px";
                        mBtn.style.border = "none";
                        mBtn.style.borderRadius = "4px";
                        mBtn.style.background = colors.tabInactive;
                        mBtn.style.color = colors.tabInactiveText;
                        mBtn.style.cursor = "pointer";

                        mBtn.addEventListener("click", () => {
                            [...monthButtons.children].forEach(b => {
                                b.style.background = colors.tabInactive;
                                b.style.color = colors.tabInactiveText;
                            });
                            mBtn.style.background = colors.tabActive;
                            mBtn.style.color = colors.tabActiveText;

                            monthContent.innerHTML = "";
                            monthContent.appendChild(
                                createTable(
                                    ["Monat","Einnahmen","Ausgaben","Saldo"],
                                    [[`${y}-${String(m).padStart(2,"0")}`, stats.monthly[y][m].income, stats.monthly[y][m].expense, stats.monthly[y][m].saldo]]
                                )
                            );

                            const descStats = stats.byDescription[y][m];
                            const rows = Object.entries(descStats).map(([desc, vals]) => [desc, vals.income, vals.expense, vals.saldo]);
                            monthContent.appendChild(
                                createTable(["Beschreibung","Einnahmen","Ausgaben","Saldo"], rows)
                            );
                        });

                        monthButtons.appendChild(mBtn);
                    }

                    monthButtons.firstChild?.click();
                });

                yearButtons.appendChild(yBtn);
            });

            function switchTab(name) {
                tabContent.innerHTML = "";
                tabContent.appendChild(mainTabs[name]);
                [...tabButtons.children].forEach(b => {
                    b.style.background = colors.tabInactive;
                    b.style.color = colors.tabInactiveText;
                });
                const btn = [...tabButtons.children].find(b=>b.textContent===name);
                if(btn) { btn.style.background=colors.tabActive; btn.style.color=colors.tabActiveText; }
            }

            ["Gesamt","Jahr"].forEach(name => {
                const btn = document.createElement("button");
                btn.textContent = name;
                btn.style.marginRight = "4px";
                btn.style.padding = "4px 8px";
                btn.style.border = "none";
                btn.style.borderRadius = "4px";
                btn.style.background = colors.tabInactive;
                btn.style.color = colors.tabInactiveText;
                btn.style.cursor = "pointer";

                btn.addEventListener("click", ()=>switchTab(name));
                tabButtons.appendChild(btn);
            });

            switchTab("Gesamt");
        }

        async function loadAllPages() {
            let entries=[];
            progressWrap.style.display="block";
            progressBar.style.display="block";
            statusText.style.display="block";

            for(let p=1;p<=lastPage;p++){
                statusText.textContent=`Lade Seite ${p} von ${lastPage} ...`;
                progressBar.style.width=((p/lastPage)*100).toFixed(1)+"%";
                const html=await loadPageWithRetry(db,p);
                if(!html) continue;
                const {entries:e}=extractValues(html);
                entries.push(...e);
            }

            progressWrap.style.display="none";
            progressBar.style.display="none";
            statusText.style.display="none";

            renderDashboard(entries);
        }

        (async()=>{
            let cachedEntries=[];
            for(let p=1;p<=lastPage;p++){
                const cached=await getCachedPage(db,p);
                if(!cached) continue;
                const {entries:e}=extractValues(cached.html);
                cachedEntries.push(...e);
            }
            renderDashboard(cachedEntries.length?cachedEntries:[]);
        })();

        reloadBtn.addEventListener("click", async()=>{
            reloadBtn.disabled=true;
            reloadBtn.textContent="⏳ Lädt...";
            await loadAllPages();
            reloadBtn.disabled=false;
            reloadBtn.textContent="🔄 Neu laden";
        });
    }

    startDashboard();
})();
