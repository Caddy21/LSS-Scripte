// ==UserScript==
// @name         [LSS] Texthelfer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Lehrgangs-Posts inkl. Credits, Farben, Stunden und Lehrgang
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/alliance_threads/*
// @match        https://polizei.leitstellenspiel.de/alliance_threads/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// @run-at       document-idle
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

    function insertFields() {
        const postForm = document.getElementById("new_alliance_post");
        if (!postForm) return;

        const formActions = postForm.querySelector(".form-actions");
        if (!formActions) return;

        if (document.getElementById("lss-inputs")) return;

        console.info("[LSS] Füge Eingabefelder ein");

        const isDark = document.body.classList.contains("dark");
        const bgColor = isDark ? "#1e1e1e" : "#fff";
        const textColor = isDark ? "#ddd" : "#000";
        const borderColor = isDark ? "#555" : "#ccc";

        const html = `
            <div id="lss-inputs" style="margin-bottom:10px; padding:5px; background:${bgColor}; color:${textColor}; border:1px solid ${borderColor}; border-radius:4px;">
                Schule:
                <select id="lss-org" style="margin-right:5px; background:${bgColor}; color:${textColor}; border:1px solid ${borderColor};">
                    ${Object.keys(orgs).map(o => `<option>${o}</option>`).join("")}
                </select>
                Lehrgang:
                <input id="lss-title" type="text" placeholder="z.B. Fachgruppe Elektro" style="width:150px; margin-right:5px; background:${bgColor}; color:${textColor}; border:1px solid ${borderColor};">
                Plätze:
                <input id="lss-plaetze" type="number" style="width:50px; margin-right:5px; background:${bgColor}; color:${textColor}; border:1px solid ${borderColor};">
                Stunden:
                <input id="lss-stunden" type="number" style="width:50px; margin-right:5px; background:${bgColor}; color:${textColor}; border:1px solid ${borderColor};">
                Credits:
                <input id="lss-credits" type="number" style="width:60px; margin-right:5px; background:${bgColor}; color:${textColor}; border:1px solid ${borderColor};">
                <button id="lss-fill" type="button" style="background:${bgColor}; color:${textColor}; border:1px solid ${borderColor}; padding:2px 6px;">Einfügen</button>
            </div>
        `;

        formActions.insertAdjacentHTML('beforebegin', html);

        // Theme-Observer
        const themeObserver = new MutationObserver(() => {
            const isDark = document.body.classList.contains("dark");
            const bgColor = isDark ? "#1e1e1e" : "#fff";
            const textColor = isDark ? "#ddd" : "#000";
            const borderColor = isDark ? "#555" : "#ccc";

            const container = document.getElementById("lss-inputs");
            if (!container) return;

            container.style.background = bgColor;
            container.style.color = textColor;
            container.style.border = `1px solid ${borderColor}`;

            container.querySelectorAll("input, select, button").forEach(el => {
                el.style.background = bgColor;
                el.style.color = textColor;
                el.style.border = `1px solid ${borderColor}`;
            });
        });
        themeObserver.observe(document.body, { attributes:true, attributeFilter:['class'] });

        // localStorage
        ["org","title","plaetze","stunden","credits"].forEach(id => {
            const el = document.getElementById("lss-" + id);
            if (!el) return;
            if (localStorage.getItem("lss-" + id)) el.value = localStorage.getItem("lss-" + id);
            el.addEventListener("change", () => {
                localStorage.setItem("lss-" + id, el.value);
                console.info(`[LSS] Wert gespeichert: lss-${id} = ${el.value}`);
            });
        });

        // Button Klick
        const button = document.getElementById("lss-fill");
        button.onclick = function() {
            console.info("[LSS] Einfügen-Button geklickt");

            const org = document.getElementById("lss-org").value;
            const title = document.getElementById("lss-title").value || "Lehrgang";
            const p = document.getElementById("lss-plaetze").value;
            const s = document.getElementById("lss-stunden").value;
            const c = document.getElementById("lss-credits").value;

            if (!p || !s || !c) {
                alert("Bitte alles ausfüllen!");
                console.info("[LSS] Felder unvollständig");
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
            if (textarea) {
                textarea.value = html;
                console.info("[LSS] Text in Textarea eingefügt");
            }

            function fillIframe() {
                const iframe = document.querySelector(".sceditor-container iframe");
                if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
                    iframe.contentDocument.body.innerHTML = html;
                    console.info("[LSS] Text in SCEditor iframe eingefügt");
                } else {
                    setTimeout(fillIframe, 200);
                }
            }
            fillIframe();
        };
    }

    const formChecker = setInterval(() => {
        if (document.getElementById("new_alliance_post")) {
            insertFields();
            clearInterval(formChecker);
            console.info("[LSS] Eingabefelder eingefügt");
        }
    }, 300);

    console.info("[LSS] Script gestartet, warte auf Formular...");
})();
