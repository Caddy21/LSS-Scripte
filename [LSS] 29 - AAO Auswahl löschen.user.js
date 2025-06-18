// ==UserScript==
// @name         [LSS] 29 - AAO Auswahl löschen
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Fügt Button AAO Auswahl löschen Missions-Header ein und aktiviert ihn per Taste C.
// @author       Dein Name
// @match        https://www.leitstellenspiel.de/missions/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let hotkeySet = false;

    function insertAaoShortcutButton() {
        const originalAaoBtn = document.querySelector('#aao_36563457');
        const targetContainer = document.querySelector('.mission_header_info.row');

        if (originalAaoBtn && targetContainer && !document.querySelector('#customAaoBtn')) {
            const newBtn = document.createElement('button');
            newBtn.id = 'customAaoBtn';
            newBtn.className = 'btn btn-xs btn-danger';
            newBtn.textContent = 'AAO Auswahl löschen';
            newBtn.style.marginLeft = '10px';

            newBtn.onclick = () => originalAaoBtn.click();

            targetContainer.appendChild(newBtn);
        }
    }

    function setupHotkey() {
        if (hotkeySet) return;
        hotkeySet = true;

        document.addEventListener('keydown', function (e) {
            if (e.key.toLowerCase() === 'c') {
                const active = document.activeElement;
                const isInputFocused = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

                if (!isInputFocused) {
                    const aaoBtn = document.querySelector('#aao_36563457');
                    if (aaoBtn) aaoBtn.click();
                }
            }
        });
    }

    const observer = new MutationObserver(() => {
        const aao = document.querySelector('#aao_36563457');
        const container = document.querySelector('.mission_header_info.row');

        if (aao && container) {
            insertAaoShortcutButton();
            setupHotkey();
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
