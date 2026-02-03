// ==UserScript==
// @name         [LSS] LST Dropdown
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Ersetzt die Leitstellen-Buttons durch ein Dropdown in der Gebäudeübersicht.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/buildings*
// @match        https://polizei.leitstellenspiel.de/buildings*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const isDarkMode = document.body.classList.contains('dark');

    function applyThemeStyles(select) {
        // gemeinsame Styles
        select.style.width = 'auto';
        select.style.minWidth = '220px';
        select.style.maxWidth = '320px';
        select.style.display = 'inline-block';
        select.style.marginTop = '2px';

        if (isDarkMode) {
            // Dark Mode – an LSS angelehnt
            select.style.backgroundColor = '#2b2b2b';
            select.style.color = '#e0e0e0';
            select.style.border = '1px solid #555';
        }
        // White Mode → absichtlich KEINE Styles setzen
    }

    function replaceButtonGroups() {
        document.querySelectorAll('#building_table tr').forEach(row => {
            const btnGroup = row.querySelector('.building_leitstelle_set')?.closest('.btn-group');
            if (!btnGroup || btnGroup.dataset.converted) return;

            const buttons = btnGroup.querySelectorAll('a.building_leitstelle_set');
            if (!buttons.length) return;

            const select = document.createElement('select');
            select.className = 'form-control input-sm';

            applyThemeStyles(select);

            let currentValue = null;

            buttons.forEach(btn => {
                const option = document.createElement('option');
                option.textContent = btn.textContent.trim();
                option.value = btn.href;

                if (btn.classList.contains('btn-success')) {
                    currentValue = btn.href;
                }

                select.appendChild(option);
            });

            if (currentValue) {
                select.value = currentValue;
            }

            select.addEventListener('change', () => {
                if (select.value) {
                    window.location.href = select.value;
                }
            });

            btnGroup.style.display = 'none';
            btnGroup.dataset.converted = 'true';

            btnGroup.parentElement.appendChild(select);
        });
    }

    replaceButtonGroups();
    new MutationObserver(replaceButtonGroups)
        .observe(document.body, { childList: true, subtree: true });
})();
