// ==UserScript==
// @name         VGSL Einsatzanforderung
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Zeigt benötigte Fahrzeuge für die VGSL an.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    async function fetchGermanVehicleList(einsatzId) {
        try {
            const response = await fetch(`https://www.leitstellenspiel.de/einsaetze/${einsatzId}`);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const tableHeader = Array.from(doc.querySelectorAll('th'))
            .find(th => th.textContent.includes('Benötigte Fahrzeuge und Personal'));
            if (!tableHeader) return null;

            const rows = tableHeader.closest('table').querySelectorAll('tbody tr');
            if (!rows.length) return null;

            const fahrzeugeList = [];

            rows.forEach(row => {
                const cols = row.querySelectorAll('td');
                if (cols.length !== 2) return;

                const nameRaw = cols[0].textContent.trim();
                const valueRaw = cols[1].textContent.trim();

                // Ignoriere Zeilen mit "Anforderungswahrscheinlichkeit"
                if (/Anforderungswahrscheinlichkeit/i.test(nameRaw)) {
                    return;
                }

                let fahrzeug = nameRaw;
                if (fahrzeug.toLowerCase().startsWith('benötigte ')) {
                    fahrzeug = fahrzeug.substring(9).trim();
                }
                fahrzeugeList.push(`${valueRaw}x ${fahrzeug}`);
            });

            return fahrzeugeList.length ? fahrzeugeList : null;

        } catch (e) {
            console.warn('Fehler beim Abrufen der Einsatzdetails:', e);
            return null;
        }
    }

    function createAlertButton(einsatzId) {
        const button = document.createElement('button');
        button.textContent = 'Hilfe zum Einsatz';
        button.title = 'Hilfe zum Einsatz';
        button.className = 'btn btn-default btn-xs einsatzhilfe-button';
        button.type = 'button';

        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const fahrzeuge = await fetchGermanVehicleList(einsatzId);
            const list = fahrzeuge || ['Keine Info verfügbar'];
            alert(`Benötigte Fahrzeuge:\n\n- ${list.join('\n- ')}`);
        });

        return button;
    }

    function addInfoButtons() {
        const inputs = document.querySelectorAll('.radioButtonMissionTypeId');

        inputs.forEach(input => {
            const label = input.closest('label');
            if (!label || label.querySelector('.einsatzhilfe-button')) return;

            const id = parseInt(input.value);

            const leftContainer = document.createElement('span');
            while (label.firstChild) {
                leftContainer.appendChild(label.firstChild);
            }

            const rightContainer = document.createElement('span');
            rightContainer.style.marginLeft = '10px';
            rightContainer.style.display = 'flex';
            rightContainer.style.alignItems = 'center';

            const infoBtn = createAlertButton(id);
            rightContainer.appendChild(infoBtn);

            label.style.display = 'flex';
            label.style.justifyContent = 'space-between';
            label.style.alignItems = 'center';

            label.appendChild(leftContainer);
            label.appendChild(rightContainer);
        });
    }

    const observer = new MutationObserver(() => {
        addInfoButtons();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    addInfoButtons();
})();
