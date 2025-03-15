// ==UserScript==
// @name         [LSS] Einsätze anzeigen
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Zeigt die Einsätze an wo noch Wachen fehlen
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function hideSuccessMissions() {
        document.querySelectorAll('.mission_type_index_searchable.success').forEach(el => {
            el.style.display = 'none';
        });
    }

    const observer = new MutationObserver(hideSuccessMissions);
    observer.observe(document.body, { childList: true, subtree: true });

    hideSuccessMissions();
})();
