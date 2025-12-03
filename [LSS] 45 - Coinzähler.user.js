// ==UserScript==
// @name         [LSS] 45 – Coinzähler
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Coins Dashboard für Leitstellenspiel: zeigt Gesamt-, Jahres- und Monatsstatistiken in übersichtlichen Tabs an
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/coins/list*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_xmlhttpRequest
// @connect      leitstellenspiel.de
// ==/UserScript==

(function() {
    'use strict';

    // Konfiguration
     
    const DB_NAME = "lss_coins_dashboard";
    const STORE_NAME = "pages";
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 Stunden

    // Dunkle Seite der Kekse
    function isDarkMode() {
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const rgb = bodyBg.match(/\d+/g);
        if (!rgb) return false;
        const r = parseInt(rgb[0]), g = parseInt(rgb[1]), b = parseInt(rgb[2]);
        const brightness = (r*299 + g*587 + b*114)/1000;
        return brightness < 128;
    }

    const darkMode = isDarkMode();

    const colors = {
        tabActive: darkMode ? "#4caf50" : "#4caf50",
        tabInactive: darkMode ? "#333" : "#eee",
        tabActiveText: darkMode ? "#fff" : "#fff",
        tabInactiveText: darkMode ? "#ddd" : "#000",
        reloadBg: darkMode ? "#1976d2" : "#2196f3",
        reloadText: "#fff",
        tableHeader: darkMode ? "#555" : "#eee",
        tableBorder: darkMode ? "#666" : "#ccc",
        containerBg: darkMode ? "#222" : "#fff",
        textColor: darkMode ? "#ddd" : "#000"
    };

    // Speicherfunktion
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

    // Daten beziehen
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
            } catch(e) {
                console.warn(`Seite ${page} Laden fehlgeschlagen, Versuch ${i+1}`);
            }
            await new Promise(r => setTimeout(r, 500));
        }
        console.error(`Seite ${page} konnte nicht geladen werden.`);
        return null;
    }

    // Daten verarbeiten
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
            if (!yearly[y]) yearly[y] = { income:0, expense:0, saldo:0 };
            if (!monthly[y]) monthly[y] = {};
            if (!monthly[y][m]) monthly[y][m] = { income:0, expense:0, saldo:0 };
            const val = entry.value;
            if (val > 0) { yearly[y].income += val; monthly[y][m].income += val; }
            else { yearly[y].expense += val; monthly[y][m].expense += val; }
            yearly[y].saldo += val;
            monthly[y][m].saldo += val;
        });
        return { yearly, monthly };
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

    // Alles schön machen
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

    // Dashboard starten
    async function startDashboard() {
        const db = await openDB();

        // Container
        const container = document.createElement("div");
        container.style.padding = "10px";
        container.style.margin = "10px 0";
        container.style.maxHeight = "600px";
        container.style.overflow = "auto";
        container.style.fontFamily = "Arial, sans-serif";
        container.style.fontSize = "14px";
        container.style.background = colors.containerBg;
        container.style.color = colors.textColor;

        // Titel + Button
        const titleWrap = document.createElement("div");
        titleWrap.style.display = "flex";
        titleWrap.style.alignItems = "center";
        titleWrap.style.justifyContent = "space-between";
        container.appendChild(titleWrap);

        const title = document.createElement("h2");
        title.textContent = "📊 Coins Dashboard";
        title.style.margin = "0";
        titleWrap.appendChild(title);

        const reloadBtn = document.createElement("button");
        reloadBtn.textContent = "🔄 Neu laden";
        reloadBtn.style.marginLeft = "10px";
        reloadBtn.style.padding = "4px 8px";
        reloadBtn.style.border = "none";
        reloadBtn.style.borderRadius = "4px";
        reloadBtn.style.cursor = "pointer";
        reloadBtn.style.background = colors.reloadBg;
        reloadBtn.style.color = colors.reloadText;
        titleWrap.appendChild(reloadBtn);

        document.querySelector("h1")?.after(container);

        // Ladebalken
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

        // Standardmäßig ausgeblendet
        progressBar.style.display = "none";
        progressWrap.style.display = "none";
        statusText.style.display = "none";

        // Letzte Seite erkennen
        const lastPage = detectLastPageNumber();

        // Alle Daten rendern
        function renderDashboard(allEntries) {
            const stats = calculateStats(allEntries);
            const totalStats = calculateTotal(stats.yearly);

            const oldTabs = container.querySelector(".tabs");
            if (oldTabs) oldTabs.remove();

            const tabs = document.createElement("div");
            tabs.className = "tabs";
            tabs.style.margin = "8px 0";
            container.appendChild(tabs);

            const mainTabButtons = document.createElement("div");
            mainTabButtons.style.marginBottom = "8px";
            tabs.appendChild(mainTabButtons);

            const mainContent = document.createElement("div");
            tabs.appendChild(mainContent);

            const mainTabsContent = {};

            // --- Gesamt Tab ---
            mainTabsContent["Gesamt"] = createTable(
                ["Einnahmen", "Ausgaben", "Saldo"],
                [[totalStats.income, totalStats.expense, totalStats.saldo]]
            );

            // --- Jahr Tab ---
            const yearContentWrapper = document.createElement("div");
            yearContentWrapper.style.marginTop = "8px";
            mainTabsContent["Jahr"] = yearContentWrapper;

            const yearTabButtons = document.createElement("div");
            yearTabButtons.style.marginBottom = "6px";
            yearContentWrapper.appendChild(yearTabButtons);

            const yearContentArea = document.createElement("div");
            yearContentWrapper.appendChild(yearContentArea);

            const years = Object.keys(stats.yearly).sort();

            years.forEach(y => {
                const yearBtn = document.createElement("button");
                yearBtn.textContent = y;
                yearBtn.style.marginRight = "4px";
                yearBtn.style.padding = "4px 8px";
                yearBtn.style.border = "none";
                yearBtn.style.borderRadius = "4px";
                yearBtn.style.cursor = "pointer";
                yearBtn.style.background = colors.tabInactive;
                yearBtn.style.color = colors.tabInactiveText;

                yearBtn.addEventListener("click", () => {
                    Array.from(yearTabButtons.children).forEach(b => {
                        b.style.background = colors.tabInactive;
                        b.style.color = colors.tabInactiveText;
                    });
                    yearBtn.style.background = colors.tabActive;
                    yearBtn.style.color = colors.tabActiveText;

                    // Untertabs: Gesamt + Monate
                    yearContentArea.innerHTML = "";
                    const months = stats.monthly[y];
                    const monthTabButtons = document.createElement("div");
                    monthTabButtons.style.marginBottom = "4px";
                    yearContentArea.appendChild(monthTabButtons);

                    const monthContentArea = document.createElement("div");
                    yearContentArea.appendChild(monthContentArea);

                    // Gesamt für das Jahr
                    const totalMonthBtn = document.createElement("button");
                    totalMonthBtn.textContent = "Gesamt";
                    totalMonthBtn.style.marginRight = "3px";
                    totalMonthBtn.style.padding = "2px 6px";
                    totalMonthBtn.style.border = "none";
                    totalMonthBtn.style.borderRadius = "4px";
                    totalMonthBtn.style.cursor = "pointer";
                    totalMonthBtn.style.background = colors.tabInactive;
                    totalMonthBtn.style.color = colors.tabInactiveText;
                    totalMonthBtn.addEventListener("click", () => {
                        Array.from(monthTabButtons.children).forEach(b => {
                            b.style.background = colors.tabInactive;
                            b.style.color = colors.tabInactiveText;
                        });
                        totalMonthBtn.style.background = colors.tabActive;
                        totalMonthBtn.style.color = colors.tabActiveText;
                        monthContentArea.innerHTML = "";
                        monthContentArea.appendChild(createTable(
                            ["Jahr","Einnahmen","Ausgaben","Saldo"],
                            [[y, stats.yearly[y].income, stats.yearly[y].expense, stats.yearly[y].saldo]]
                        ));
                    });
                    monthTabButtons.appendChild(totalMonthBtn);

                    // Monats-Tabs Jan–Dez
                    const monthNames = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
                    for(let m=1; m<=12; m++) {
                        if(!months[m]) continue;
                        const monthBtn = document.createElement("button");
                        monthBtn.textContent = monthNames[m-1];
                        monthBtn.style.marginRight = "3px";
                        monthBtn.style.padding = "2px 6px";
                        monthBtn.style.border = "none";
                        monthBtn.style.borderRadius = "4px";
                        monthBtn.style.cursor = "pointer";
                        monthBtn.style.background = colors.tabInactive;
                        monthBtn.style.color = colors.tabInactiveText;

                        monthBtn.addEventListener("click", () => {
                            Array.from(monthTabButtons.children).forEach(b => {
                                b.style.background = colors.tabInactive;
                                b.style.color = colors.tabInactiveText;
                            });
                            monthBtn.style.background = colors.tabActive;
                            monthBtn.style.color = colors.tabActiveText;

                            monthContentArea.innerHTML = "";
                            monthContentArea.appendChild(createTable(
                                ["Monat","Einnahmen","Ausgaben","Saldo"],
                                [[y+"-"+String(m).padStart(2,"0"), months[m].income, months[m].expense, months[m].saldo]]
                            ));
                        });
                        monthTabButtons.appendChild(monthBtn);
                    }

                    // ersten Untertab automatisch öffnen: Gesamt
                    monthTabButtons.firstChild?.click();
                });

                yearTabButtons.appendChild(yearBtn);
            });

            // Haupttab Switching
            function switchMainTab(name) {
                mainContent.innerHTML = "";
                mainContent.appendChild(mainTabsContent[name]);
                Array.from(mainTabButtons.children).forEach(btn => {
                    btn.style.background = btn.textContent === name ? colors.tabActive : colors.tabInactive;
                    btn.style.color = btn.textContent === name ? colors.tabActiveText : colors.tabInactiveText;
                });
            }

            ["Gesamt","Jahr"].forEach(name => {
                const btn = document.createElement("button");
                btn.textContent = name;
                btn.style.marginRight = "4px";
                btn.style.padding = "4px 8px";
                btn.style.border = "none";
                btn.style.borderRadius = "4px";
                btn.style.cursor = "pointer";
                btn.style.background = colors.tabInactive;
                btn.style.color = colors.tabInactiveText;
                btn.addEventListener("click", () => switchMainTab(name));
                mainTabButtons.appendChild(btn);
            });

            switchMainTab("Gesamt");
        }

        // Daten komplett laden
        async function loadAllPages() {
            let allEntries = [];
            progressBar.style.display = "block";
            progressWrap.style.display = "block";
            statusText.style.display = "block";

            for (let p = 1; p <= lastPage; p++) {
                statusText.textContent = `Lade Seite ${p} von ${lastPage} ...`;
                progressBar.style.width = ((p / lastPage) * 100).toFixed(1) + "%";
                const html = await loadPageWithRetry(db, p);
                if (!html) continue;
                const { entries } = extractValues(html);
                allEntries.push(...entries);
            }

            progressBar.style.display = "none";
            progressWrap.style.display = "none";
            statusText.style.display = "none";

            renderDashboard(allEntries);
        }

        // Gecachte Daten sofort anzeigen
        (async () => {
            let allEntries = [];
            for (let p = 1; p <= lastPage; p++) {
                const cached = await getCachedPage(db, p);
                if (!cached) continue;
                const { entries } = extractValues(cached.html);
                allEntries.push(...entries);
            }
            if (allEntries.length) renderDashboard(allEntries);
        })();

        reloadBtn.addEventListener("click", async () => {
            reloadBtn.disabled = true;
            reloadBtn.textContent = "⏳ Lädt...";
            await loadAllPages();
            reloadBtn.disabled = false;
            reloadBtn.textContent = "🔄 Neu laden";
        });
    }

    startDashboard();
})();
