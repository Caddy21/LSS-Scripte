// ==UserScript==
// @name         [LSS] Alarmstichworte
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Ändert die Originaleinsatznamen in Eure Alarmstichworte
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Funktion um eigene Alarmstichworte zu erstellen
    
    // Hier könnt Ihr eure eigenen Alarmstichworte erstellen und die entpsrechende ID des Einsatz hinzufügen.
    // Finden könnt Ihr sämtliche Einsatz IDs hier > https://v3.lss-manager.de/modules/lss-missionHelper/missions/de_DE.json
    // Dies ist nur ein Beispiel, denn wie Ihr euch denken könnt, ist das je nach Region/Bundesland alles unterschiedlich.
    const einsatzMapping = new Map([
        
        // Alarmstichwort   Einsaz ID
        ["B: Klein",        [0, 1, 2]],
        ["B: Mittel",       [3, 4, 5]],
        ["B: Groß",         [6, 7, 8]],
        ["T: Unfall",       [9, 10, 11]],
        ["U: Gefahrgut",    [12, 13, 14]],
        ["RD: Notfall",     [20, 21, 22]],
        ["P: Polizei",      [30, 31, 32]]
    ]);

    // Umgekehrte Map für schnelle ID-Suche
    const idZuStichwort = new Map();
    einsatzMapping.forEach((ids, stichwort) => {
        ids.forEach(id => idZuStichwort.set(id, stichwort));
    });

    function updateMissionName(element) {
        const parent = element.closest('.missionSideBarEntry');
        if (!parent) return;

        const typeId = parseInt(parent.getAttribute('mission_type_id'), 10);
        if (isNaN(typeId) || !idZuStichwort.has(typeId)) return;

        const neuesKürzel = idZuStichwort.get(typeId);
        if (!neuesKürzel) return;

        // Falls noch nicht aktualisiert wurde
        if (!element.dataset.updated) {
            element.innerText = `${neuesKürzel} `;
            element.dataset.updated = "true"; // Verhindert wiederholte Manipulation
        }
    }

    function updateAllMissions() {
        document.querySelectorAll('[id^="mission_caption_"]').forEach(updateMissionName);
    }

    // Direkt auf bestehende Einsätze anwenden
    updateAllMissions();

    // MutationObserver für neue Einsätze mit effizienterem Callback
    const missionList = document.getElementById('mission_list');
    if (missionList) {
        new MutationObserver(mutations => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Nur Elemente beachten
                        const caption = node.querySelector('[id^="mission_caption_"]');
                        if (caption) updateMissionName(caption);
                    }
                });
            }
        }).observe(missionList, { childList: true, subtree: true });
    }
})();
