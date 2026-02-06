// ==UserScript==
// @name         [LSS] Wachenfahrzeuge Toggler
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @author       Caddy21
// @description  Globaler Button zum Ein-/Ausblenden aller Fahrzeuge in der Gebäudeliste
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let vehiclesHidden = false;

    function addGlobalToggleButton() {
        const header = document.getElementById('building-list-header-buttons');
        if (!header) return;

        if (document.getElementById('global_vehicle_toggle')) return;

        const btn = document.createElement('a');
        btn.href = '#';
        btn.id = 'global_vehicle_toggle';
        btn.className = 'btn btn-xs btn-default';
        btn.style.marginLeft = '5px';
        btn.textContent = 'Fahrzeuge';
        btn.title = 'Alle Fahrzeuge ausblenden';

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            toggleAllVehicles();
        });

        header.appendChild(btn);
    }

    function toggleAllVehicles() {
        const icons = document.querySelectorAll('.building_marker_image');

        icons.forEach(icon => {
            const buildingId = icon.getAttribute('building_id');
            const hiddenSpan = document.getElementById('hidden_vehicle_list_caption_' + buildingId);

            const isHidden = hiddenSpan && hiddenSpan.style.display !== 'none';

            if (!vehiclesHidden && !isHidden) {
                icon.click(); // ausblenden
            } else if (vehiclesHidden && isHidden) {
                icon.click(); // einblenden
            }
        });

        vehiclesHidden = !vehiclesHidden;

        const btn = document.getElementById('global_vehicle_toggle');
        if (btn) {
            btn.title = vehiclesHidden
                ? 'Alle Fahrzeuge einblenden'
                : 'Alle Fahrzeuge ausblenden';
    }

    }

    const observer = new MutationObserver(() => {
        addGlobalToggleButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(addGlobalToggleButton, 2000);

})();
