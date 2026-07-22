// ==UserScript==
// @name         [LSS] - Leitstellensortierer
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Sortiert das Leitstellen-Dropdown auf Schulgebäudeseiten alphabetisch.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/buildings/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function sortSelect() {
        const select = document.querySelector('#dispatch_center_filter');
        if (!select) return;

        const selected = select.value;

        const placeholder = [...select.options].filter(o => o.value === "");
        const options = [...select.options].filter(o => o.value !== "");

        options.sort((a, b) =>
            a.text.localeCompare(b.text, "de", {
                numeric: true,
                sensitivity: "base"
            })
        );

        select.innerHTML = "";
        [...placeholder, ...options].forEach(option => select.appendChild(option));

        select.value = selected;

        // Bootstrap-Select neu aufbauen
        if (window.jQuery) {
            $(select).selectpicker("refresh");
        }
    }

    const observer = new MutationObserver(() => {
        if (document.querySelector("#dispatch_center_filter")) {
            sortSelect();
            observer.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
