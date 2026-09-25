// ==UserScript==
// @name         [LSS] 14 - Aufgeräumtes Profil-Menü
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Ausblenden von bestimmten Bereichen im Profil-Menü
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @match        https://polizei.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // True  - Anzeigen
    // False - Ausblenden
    const settings = {
        profile: false,          // Profil
        tasks: true,             // Aufgaben und Events
        level: false,            // Dienstgrad
        auszeichnungen: true,    // Auszeichnungen
        premiumaccount: true,    // Premium Account
        account: false,          // Profil bearbeiten
        weiterempfehlen: false,  // Spiel weiterempfehlen
        notizen: false,          // Notizen
        aao: true,               // Alarm und Ausrückeordnung
        geschwindigkeit: false,  // Einsatzgeschwindigkeit
        grafik: false,           // Grafiksets
        setting: true,           // Einstellungen
        logout: true,            // Ausloggen
        divider: false           // Trennlinien
    };

    window.addEventListener('load', function() {
        const menuItems = {
            profile: '#navbar_profile_link',
            tasks: 'a[href="/tasks/index"]',
            level: 'a[href="/level"]',
            auszeichnungen: 'a[href="/auszeichnungen"]',
            premiumaccount: 'a[href="/premiumaccount"]',
            account: 'a[href="/users/edit"]',
            weiterempfehlen: 'a[href="/referrals"]',
            notizen: 'a[href="/note"]',
            aao: 'a[href="/aaos"]',
            geschwindigkeit: 'a[href="/settings/index?mission_speed=true"]',
            grafik: 'a[href="/vehicle_graphics"]',
            setting: 'a[href="/settings/index"]',
            logout: 'a[href="/users/sign_out"]'
        };
        Object.entries(menuItems).forEach(([setting, selector]) => {
            if (settings[setting] === false) {
                const item = document.querySelector(selector);

                if (item) {
                    item.style.display = 'none';
                }
            }
        });
        if (settings.divider === false) {
            document.querySelectorAll('.dropdown-menu .divider').forEach(divider => {
                divider.style.display = 'none';
            });
        }
    });
})();
