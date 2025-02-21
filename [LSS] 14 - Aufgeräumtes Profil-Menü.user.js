// ==UserScript==
// @name         [LSS] Aufgeräumtes Profil-Menü
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Ausblenden von bestimmten Bereichen im Profil-Menü
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Einstellungen: True/False für das Ausblenden der jeweiligen Elemente
    const settings = {
        "profile": true,           // Profil (href="/profile
        "tasks": true,             // Aufgaben (href="/tasks/index")
        "level": true,             // Level (href="/level")
        "auszeichnungen": true,    // Auszeichnungen (href="/auszeichnungen")
        "premiumaccount": true,    // Premium Account (href="/premiumaccount")
        "account": true,           // Profil bearbeiten (href=/user/edit")
        "weiterempfehlen": true,   // Spiel weiterempfehlen (href="/referrals")
        "notizen": true,           // Notizen (href="/note")
        "aao": true,               // AAO (href="/aaos")
        "geschwindigkeit": true,   // Einsatzgeschwindigkeit (href="/settings/index?mission_speed=true")
        "grafik": true,            // Grafiksets (href="/vehicle_graphics")
        "setting": true,           // Einstellungen (href="/settings/index")
        "logout": true,            // Auslogen (href="/users/sign_out")
        "divider": true,           // Trennlinien
    };

    // Warten, bis das DOM vollständig geladen ist
    window.addEventListener('load', function() {

        // Dropdown-Menü Elemente finden
        const menuItems = document.querySelectorAll('.dropdown-menu a');

        menuItems.forEach(item => {
            // Überprüfen, ob das Item mit einer der angegebenen URLs übereinstimmt
            const href = item.getAttribute('href');

            // Elemente ausblenden, wenn sie in den Einstellungen auf 'true' gesetzt sind
            if (href === '/profile' && settings.profile === false) {
                item.style.display = 'none';
            }
            if (href === '/tasks/index' && settings.tasks === false) {
                item.style.display = 'none';
            }
            if (href === '/level' && settings.level === false) {
                item.style.display = 'none';
            }
            if (href === '/auszeichnungen' && settings.auszeichnungen === false) {
                item.style.display = 'none';
            }
            if (href === '/premiumaccount' && settings.premiumaccount === false) {
                item.style.display = 'none';
            }
            if (href === '/users/edit' && settings.account === false) {
                item.style.display = 'none';
            }
            if (href === '/referrals' && settings.weiterempfehlen === false) {
                item.style.display = 'none';
            }
            if (href === '/note' && settings.notizen === false) {
                item.style.display = 'none';
            }
            if (href === '/aaos' && settings.aao === false) {
                item.style.display = 'none';
            }
            if (href === '/settings/index?mission_speed=true' && settings.geschwindigkeit === false) {
                item.style.display = 'none';
            }
            if (href === '/vehicle_graphics' && settings.grafik === false) {
                item.style.display = 'none';
            }
            if (href === '/settings/index' && settings.setting === false) {
                item.style.display = 'none';
            }
            if (href === '/users/sign_out' && settings.logout === false) {
                item.style.display = 'none';
            }

        });

        // Divider Elemente finden und ausblenden, wenn in den Einstellungen auf 'false' gesetzt
        const dividers = document.querySelectorAll('.dropdown-menu .divider');
        dividers.forEach(divider => {
            if (settings.divider === false) {
                divider.style.display = 'none';
            }
        });
    });

})();
