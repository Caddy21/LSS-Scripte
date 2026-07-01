// ==UserScript==
// @name         [LSS] Gebäudelöschbutton
// @namespace    https://tampermonkey.net/
// @version      1.0
// @author       Caddy21
// @description  Fügt in der Gebäudeübersicht einen Abriss-Button neben dem Details-Button ein.
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function addDeleteButtons() {
        document.querySelectorAll('#building_list li.building_list').forEach(li => {
            if (li.querySelector('.lss-delete-building')) return;
            const detailsButton = li.querySelector('a[id^="building_button_"]');
            if (!detailsButton) return;
            const match = detailsButton.href.match(/\/buildings\/(\d+)/);
            if (!match) return;
            const buildingId = match[1];
            const deleteBtn = document.createElement('a');
            deleteBtn.href = '#';
            deleteBtn.className = 'btn btn-xs btn-danger pull-right lss-delete-building';
            deleteBtn.style.marginRight = '4px';
            deleteBtn.title = 'Abreißen';
            deleteBtn.innerHTML = '<span class="glyphicon glyphicon-trash"></span>';
            deleteBtn.addEventListener('click', e => {
                e.preventDefault();
                if (!confirm('Wirklich das Gebäude abreißen? Die Wachen, Personal und Fahrzeuge sind davon NICHT betroffen. Du bekommst keine Rückerstattung!')) return;
                const formData = new URLSearchParams();
                formData.append('_method', 'delete');
                formData.append('authenticity_token', document.querySelector('meta[name="csrf-token"]').content);
                fetch(`/buildings/${buildingId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: formData.toString(),
                    credentials: 'same-origin'
                }).then(r => {
                    if (!r.ok) throw new Error();
                    li.remove();
                }).catch(() => alert('Das Gebäude konnte nicht gelöscht werden.'));
            });
            detailsButton.parentNode.insertBefore(deleteBtn, detailsButton);
        });
    }

    addDeleteButtons();

    new MutationObserver(addDeleteButtons).observe(document.getElementById('building_list'), {
        childList: true,
        subtree: true
    });
})();
