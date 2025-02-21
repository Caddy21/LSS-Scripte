// ==UserScript==
// @name         [LSS] 14 - Aufgeräumtes Profil-Menü
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
    // True - Anzeigen
    // False - Ausblenden
    const settings = {
        "profile": true,
        // Profil
        "tasks": true,
        // Aufgaben und Events
        "level": true,
        // Dienstgrad
        "auszeichnungen": true,
        // Auszeichnungen
        "premiumaccount": true,
        // Premium Account
        "account": true,
        // Profil bearbeiten
        "weiterempfehlen": true,
        // Spiel weiterempfehlen
        "notizen": true,
        // Notizen
        "aao": true,
        // Alarm und Ausrückeordnung
        "geschwindigkeit": true,
        // Einsatzgeschwindigkeit
        "grafik": true,
        // Grafiksets
        "setting": true,
        // Einstellungen
        "logout": true,
        // Auslogen
        "divider": true,
        // Trennlinien
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
