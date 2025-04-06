// ==UserScript==
// @name         LSS Einsatzdaten-Kopierer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fügt für jede Mission einen Button zum Kopieren der Einsatzdaten hinzu (Einsatzname, EinsatzID, Mission Type ID)
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
    'use strict';

    // Funktion zum Einfügen des Kopier-Buttons
    function insertCopyButtonForEachMission() {
        const missionEntries = document.querySelectorAll('[id^="mission_panel_heading_"]');

        if (missionEntries.length === 0) {
            console.warn('[📋 LSS-Kopierer] Keine Missionen gefunden!');
            return;
        }

        missionEntries.forEach((missionEntry) => {
            // Überprüfen, ob der Button bereits existiert
            if (missionEntry.querySelector('#copyMissionBtn')) return;
            
            const missionId = missionEntry.id.replace('mission_panel_heading_', '');
            if (!missionId) {
                console.warn('[📋 LSS-Kopierer] Keine Mission ID gefunden für Mission:', missionEntry);
                return;
            }

            const missionListElement = document.querySelector(`#mission_${missionId}`);
            if (!missionListElement) {
                console.warn('[📋 LSS-Kopierer] Kein mission_list-Element für Mission gefunden:', missionId);
                return;
            }

            const missionTypeId = missionListElement.getAttribute('mission_type_id');
            if (!missionTypeId) {
                console.warn('[📋 LSS-Kopierer] Keine Mission Type ID gefunden für Mission:', missionId);
                return;
            }

            // EinsatzID extrahieren
            const alarmButton = missionEntry.querySelector('[id^="alarm_button_"]');
            if (!alarmButton) {
                console.warn('[📋 LSS-Kopierer] Kein Alarm-Button gefunden für Mission:', missionEntry);
                return;
            }

            const einsatzId = alarmButton.id.replace('alarm_button_', '');

            // Einsatzname extrahieren (aus dem Caption-Tag)
            const missionNameElement = missionEntry.querySelector('[id^="mission_caption_"]');
            const missionName = missionNameElement ? missionNameElement.textContent.split(',')[0].trim() : 'Unbekannter Einsatzname';

            // Button erstellen
            const button = document.createElement('button');
            button.id = 'copyMissionBtn';
            button.textContent = '📋 Daten kopieren';
            button.classList.add('btn', 'btn-primary', 'btn-xs');
            button.style.marginLeft = '10px';
            button.style.cursor = 'pointer';

            // Klick-Event zum Kopieren
            button.addEventListener('click', () => {
                // Text zum Kopieren: Einsatzname, EinsatzID und Mission Type ID
                const textToCopy = `${missionName}\t ${einsatzId}\t ${missionTypeId}`;
                GM_setClipboard(textToCopy);
                alert('✅ Einsatzdaten kopiert:\n' + textToCopy);
            });

            // Button direkt neben den Alarm-Button einfügen
            alarmButton.parentNode.appendChild(button);
        });
    }

    // Überwacht dynamisch neu erstellte Einsätze
    const observer = new MutationObserver(() => {
        const missionEntries = document.querySelectorAll('[id^="mission_panel_heading_"]');
        missionEntries.forEach((missionEntry) => {
            // Button nur hinzufügen, wenn er noch nicht existiert
            if (!missionEntry.querySelector('#copyMissionBtn')) {
                insertCopyButtonForEachMission();
            }
        });
    });

    // Beobachtungsoptionen für MutationObserver
    observer.observe(document.body, { childList: true, subtree: true });
})();
