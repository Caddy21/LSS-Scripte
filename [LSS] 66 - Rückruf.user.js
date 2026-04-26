// ==UserScript==
// @name         [LSS] Rückruf
// @version      1.0
// @description  Fügt einen Rückruf-Button pro Wache hinzu
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        htttp://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function addRecallButtons() {
        document.querySelectorAll('.building_list_caption').forEach(caption => {
            // Verhindern, dass mehrfach Buttons erstellt werden
            if (caption.querySelector('.recall-all-btn')) return;

            const buildingId = caption.id.split('_').pop();

            const detailButton = caption.querySelector('.lightbox-open');

            if (!detailButton) return;

            // Button erstellen
            const recallBtn = document.createElement('a');
            recallBtn.className = 'btn btn-xs btn-default recall-all-btn pull-right';
            recallBtn.textContent = 'Rückruf';
            recallBtn.style.marginRight = '5px';

            // Klick-Event
            recallBtn.addEventListener('click', function (e) {
                e.preventDefault();

                const vehicleList = document.querySelector(`#vehicle_building_${buildingId}`);
                if (!vehicleList) return;

                const backalarmButtons = vehicleList.querySelectorAll('.backalarm');

                backalarmButtons.forEach((btn, index) => {
                    // kleiner Delay, um Server nicht zu fluten
                    setTimeout(() => {
                        fetch(btn.href, {
                            method: 'GET',
                            credentials: 'include'
                        });
                    }, index * 200);
                });
            });

            // Button vor "Details" einfügen
            detailButton.insertAdjacentElement('beforebegin', recallBtn);
        });
    }

    // Initial + bei Änderungen (z.B. Nachladen)
    const observer = new MutationObserver(addRecallButtons);
    observer.observe(document.body, { childList: true, subtree: true });

    addRecallButtons();
})();
