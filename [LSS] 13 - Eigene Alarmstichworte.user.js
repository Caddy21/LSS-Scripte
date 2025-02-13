// ==UserScript==
// @name         [LSS] Eigene Alarmstichworte
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Verändert die Standarteinsatznamen in Eure eigenen Alarmstichworte
// @author       Dein Name
// @match        https://www.leitstellenspiel.de/
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Funktion um die Alarmstichworte zu erstellen
    
    // Hier könnt Ihr Eure eigenen Alarmstichworte hinterlegen und die Einsatz IDs zuordnen.
    // Seht es mir nach das dies hier nur ein Beispiel ist.
    const einsatzMapping = {
        "B: Klein": [0, 1, 2],        // Mülleimerbrand, Wohnungsbrand, Kleinbrand, Verschmutzte Fahrbahn
        "B: Mittel": [3, 4, 5],       // Mittelbrände
        "B: Groß": [6, 7, 8],         // Großbrände
        "T: Unfall": [9, 10, 11],     // Technische Hilfeleistung
        "U: Gefahrgut": [12, 13, 14], // Umweltgefahren
        "RD: Notfall": [20, 21, 22],  // Rettungsdienst
        "P: Polizei": [30, 31, 32]    // Polizeieinsätze
    };

    function updateMissionNames() {
        document.querySelectorAll('[id^="mission_caption_"]').forEach(element => {
            const parent = element.closest('.missionSideBarEntry');
            if (!parent) return;

            const typeId = parseInt(parent.getAttribute('mission_type_id'), 10);
            if (isNaN(typeId)) return;

            // Finde die passende Kategorie für diese ID
            let neuesKürzel = null;
            for (let [kürzel, idListe] of Object.entries(einsatzMapping)) {
                if (idListe.includes(typeId)) {
                    neuesKürzel = kürzel;
                    break;
                }
            }

            // Falls ein passendes Kürzel gefunden wurde, aktualisieren
            if (neuesKürzel) {
                element.innerText = `${neuesKürzel} `;
            }
        });
    }

    // Änderungen auf bestehende Einsätze anwenden
    updateMissionNames();

    // MutationObserver für neue Einsätze
    const missionList = document.getElementById('mission_list');
    if (missionList) {
        const observer = new MutationObserver(updateMissionNames);
        observer.observe(missionList, { childList: true, subtree: true });
    }
})();
