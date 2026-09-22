// ==UserScript==
// @name         [LSS] 48 - Scriptmenü
// @namespace    https://www.leitstellenspiel.de/caddy
// @version      1.0
// @description  Zentraler Ort für die Menüeinträge vom Erweiterungs-Manager, Fahrzeug-Manager, Multiausblender, Personalübersicht und Massenbauer
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function ensureMenu() {
        if (window.CADDY_MENU) return window.CADDY_MENU;
        const profileLink = document.querySelector('#navbar_profile_link');
        if (!profileLink) return null;
        const parentLi = profileLink.closest('li');
        if (!parentLi) return null;
        
        const rootLi = document.createElement('li');
        rootLi.id = 'caddy_menu_root';
        rootLi.setAttribute('role', 'presentation');
        rootLi.classList.add('caddy-flyout');

        const rootA = document.createElement('a');
        rootA.href = '#';
        rootA.style.cursor = 'pointer';
        rootA.innerHTML = `
          <img src="https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png"
               style="width:27px; height:27px; margin-right:6px; object-fit:contain; vertical-align:middle;">
          Caddy's Scripte
          <span style="float:right;">▶</span>
        `;

        const subUl = document.createElement('ul');
        subUl.className = 'caddy-flyout-menu';

        rootLi.appendChild(rootA);
        rootLi.appendChild(subUl);
        parentLi.after(rootLi);

        const style = document.createElement('style');
        style.textContent = `
            .caddy-flyout { position: relative; }
            .caddy-flyout > a { display: flex; align-items: center; color: #fff; text-decoration: none; padding: 5px 12px; }
            .caddy-flyout > a:hover { background-color: #ac2925; }
            .caddy-flyout-menu {
                display: none;
                position: absolute;
                top: 0;
                left: 100%;
                margin: 0;
                padding: 0;
                list-style: none;
                background-color: #c9302c;
                min-width: 180px;
                z-index: 1000;
                border: 1px solid #ac2925;
            }
            .caddy-flyout:hover > .caddy-flyout-menu { display: block; }
            .caddy-flyout-menu li a {
                display: block;
                padding: 5px 12px;
                color: #fff;
                text-decoration: none;
                white-space: nowrap;
            }
            .caddy-flyout-menu li a:hover { background-color: #ac2925; }
        `;
        document.head.appendChild(style);

        window.CADDY_MENU = {
            addItem({ id, label, existingElement }) {
                if (subUl.querySelector('#' + id)) return;
                const li = document.createElement('li');
                li.id = id;
                li.setAttribute('role', 'presentation');
                li.appendChild(existingElement);
                subUl.appendChild(li);
            }
        };
        return window.CADDY_MENU;
    }

    function migrateButton(selector, id, label) {
        const menu = ensureMenu();
        const origBtn = document.querySelector(selector);
        if (!origBtn || !menu) return;
        menu.addItem({ id, label, existingElement: origBtn });
    }

    // Hier gibt es Buttons, die gibt es (noch) gar nicht!
    setTimeout(() => {
        migrateButton('#lss_mb_open', 'mass-builder-btn', 'Bau-Manager');
        migrateButton('#open-extension-helper', 'extension-manager-btn', 'Erweiterungs-Manager');
        migrateButton('#fahrzeug-manager-btn', 'fahrzeug-manager-btn', 'Fahrzeug-Manager');
        migrateButton('#open-trailer-manager', 'open-trailer-manager-btn', 'Anhänger-Manager');
        migrateButton('#Personalübersicht', 'personal-overview-btn', 'Personalübersicht');
        migrateButton('#open-alias-manager', 'open-alias-manager-btn', 'Wachenalias-Manager');
        migrateButton('#lssfm-open-menu', 'lssfm-open-menu-btn', 'Fleet Manager');
        migrateButton('#multiausblender-settings-btn', 'multiausblender-btn', 'Multiausblender');
        migrateButton('#open-icon-manager', 'open-icon-manager', 'Gebäudegrafiken');
        migrateButton('#open-thw-working-hours-manager', 'open-thw-working-hours-manager-btn', 'THW-Arbeitszeiten');
        migrateButton('#open-lss-massenbearbeiter', 'open-lss-massenbearbeiter', 'Wachen-Massenbearbeiter');     
    }, 10000);
})();
