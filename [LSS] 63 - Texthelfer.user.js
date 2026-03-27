// ==UserScript==
// @name         [LSS] Texthelfer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Lehrgangs-Posts inkl. Credits, Farben, Stunden und Lehrgang
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const orgs = {
        "Feuerwehr": "#ff0000",
        "Polizei": "#0044cc",
        "Rettungsdienst": "#009933",
        "THW": "#c14700",
        "Seenotrettung": "#ff8800"
    };

    function createUI() {
        if (document.getElementById("lss-helper-box")) return;

        const box = document.createElement("div");
        box.id = "lss-helper-box";
        box.style.position = "fixed";
        box.style.top = "100px";
        box.style.right = "20px";
        box.style.border = "1px solid #ccc";
        box.style.padding = "10px";
        box.style.zIndex = 9999;
        box.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
        box.style.fontSize = "12px";
        box.style.width = "200px";

        box.innerHTML = `
            <b>Lehrgangs-Post</b><br><br>

            Schule:<br>
            <select id="lss-org">
                ${Object.keys(orgs).map(o => `<option>${o}</option>`).join("")}
            </select><br><br>

            Lehrgang:<br>
            <input id="lss-title" type="text" placeholder="z.B. Fachgruppe Elektro"><br><br>

            Freie Plätze:<br>
            <input id="lss-plaetze" type="number" style="width:60px"><br><br>

            Stunden bis zum Start:<br>
            <input id="lss-stunden" type="number" style="width:60px"><br><br>

            Credits:<br>
            <input id="lss-credits" type="number" style="width:80px"><br><br>

            <button id="lss-fill">Einfügen</button>
        `;

        document.body.appendChild(box);

        const button = document.getElementById("lss-fill");

        function applyTheme() {
            const isDark = document.body.classList.contains("dark");
            box.style.background = isDark ? "#1e1e1e" : "#fff";
            box.style.color = isDark ? "#ddd" : "#000";
            box.style.border = isDark ? "1px solid #555" : "1px solid #ccc";

            button.style.background = isDark ? "#333" : "#4CAF50";
            button.style.color = isDark ? "#fff" : "#fff";
            button.style.border = "none";
            button.style.padding = "5px 10px";
            button.style.cursor = "pointer";
        }

        applyTheme();

        // Beobachten auf Theme-Wechsel
        const themeObserver = new MutationObserver(applyTheme);
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        // Letzte Werte merken
        ["org","title","plaetze","stunden","credits"].forEach(id => {
            const el = document.getElementById("lss-" + id);
            if (localStorage.getItem("lss-" + id)) el.value = localStorage.getItem("lss-" + id);
            el.addEventListener("change", () => localStorage.setItem("lss-" + id, el.value));
        });

        button.onclick = function() {
            const org = document.getElementById("lss-org").value;
            const title = document.getElementById("lss-title").value || "Lehrgang";
            const p = document.getElementById("lss-plaetze").value;
            const s = document.getElementById("lss-stunden").value;
            const c = document.getElementById("lss-credits").value;

            if (!p || !s || !c) {
                alert("Bitte alles ausfüllen!");
                return;
            }

            const color = orgs[org];

            const html = `
                <p><b><font color="${color}">${org}</font> - ${title}</b><br></p>
                <div>Es sind noch <b>${p} Plätze</b> frei.<br></div>
                <div>Start in <b>${s} Stunden.</b></div><br>
                <div><b>${c} Credits</b> pro Tag/pro Person<br></div>
                `;

            const textarea = document.querySelector("#alliance_post_content");
            if (textarea) textarea.value = html;

            const iframe = document.querySelector(".sceditor-container iframe");
            if (iframe) iframe.contentDocument.body.innerHTML = html;
        };
    }

    const observer = new MutationObserver(() => {
        if (document.querySelector("#alliance_post_content")) {
            createUI();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
