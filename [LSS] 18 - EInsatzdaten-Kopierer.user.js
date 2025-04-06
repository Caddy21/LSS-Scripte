// ==UserScript==
// @name         LSS Einsatzdaten-Kopierer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fügt für jede Mission einen Button zum Kopieren der Einsatzdaten hinzu (Einsatzname, EinsatzID, Mission Type ID)
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
    'use strict';

    console.log('[📋 LSS-Kopierer] Skript gestartet');

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

            // Versuch, die Mission ID aus dem Mission Panel zu extrahieren
            const missionId = missionEntry.id.replace('mission_panel_heading_', '');
            if (!missionId) {
                console.warn('[📋 LSS-Kopierer] Keine Mission ID gefunden für Mission:', missionEntry);
                return;
            }

            // Die Mission Type ID aus dem entsprechenden mission_list-Element extrahieren
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

            console.log(`[📋 LSS-Kopierer] Mission Type ID aus mission_list extrahiert: ${missionTypeId}`);

            // EinsatzID extrahieren
            const alarmButton = missionEntry.querySelector('[id^="alarm_button_"]');
            if (!alarmButton) {
                console.warn('[📋 LSS-Kopierer] Kein Alarm-Button gefunden für Mission:', missionEntry);
                return;
            }

            const einsatzId = alarmButton.id.replace('alarm_button_', '');

            // Einsatzname extrahieren (aus dem Caption-Tag), ohne die Adresse zu kopieren
            const missionNameElement = missionEntry.querySelector('[id^="mission_caption_"]');
            const missionName = missionNameElement ? missionNameElement.textContent.split(',')[0].trim() : 'Unbekannter Einsatzname'; // Nur den Einsatznamen ohne die Adresse

            // Button erstellen
            const button = document.createElement('button');
            button.id = 'copyMissionBtn';
            button.textContent = '📋 Einsatz kopieren';
            button.classList.add('btn', 'btn-primary', 'btn-xs'); // Die Klassen für einen kleinen Button hinzufügen
            button.style.marginLeft = '10px';
            button.style.cursor = 'pointer';

            // Klick-Event zum Kopieren
            button.addEventListener('click', () => {
                // Text zum Kopieren: Einsatzname, EinsatzID und Mission Type ID
                const textToCopy = `Einsatzname: ${missionName}\tEinsatzID: ${einsatzId}\tMission Type ID: ${missionTypeId}`;
                console.log(`[📋 LSS-Kopierer] 📎 Kopiere: "${textToCopy}"`);
                GM_setClipboard(textToCopy);
                alert('✅ Einsatzdaten kopiert:\n' + textToCopy);
            });

            // Button direkt neben den Alarm-Button einfügen
            alarmButton.parentNode.appendChild(button);
            console.log(`[📋 LSS-Kopierer] ✅ Button für Mission ${einsatzId} eingefügt`);
        });
    }

    // Überprüfen, ob Missionseinträge bereits vorhanden sind
    const missionEntries = document.querySelectorAll('[id^="mission_panel_heading_"]');
    if (missionEntries.length > 0) {
        console.log('[📋 LSS-Kopierer] Missionseinträge gefunden!');
        insertCopyButtonForEachMission();
    } else {
        // Warten auf Änderungen im DOM, um sicherzustellen, dass Missionen geladen werden
        const observer = new MutationObserver(() => {
            const missionEntries = document.querySelectorAll('[id^="mission_panel_heading_"]');
            if (missionEntries.length > 0) {
                console.log('[📋 LSS-Kopierer] Missionseinträge gefunden!');
                insertCopyButtonForEachMission();
                observer.disconnect(); // Beobachtung stoppen, wenn alle Buttons eingefügt wurden
            }
        });

        // Beobachtungsoptionen für MutationObserver
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('[📋 LSS-Kopierer] ⏱ Warten auf Missionseinträge...');
    }

})();
