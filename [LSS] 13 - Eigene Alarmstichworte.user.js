// ==UserScript==
// @name         [LSS] 13 - Alarmstichworte
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Setzt eigene Alarmstichworte in der Einsatzliste
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Hier könnt Ihr eure eigenen Alarmstichworte erstellen und die entpsrechende ID des Einsatzes hinzufügen.
    // Finden könnt Ihr sämtliche Einsatz IDs hier > https://www.leitstellenspiel.de/einsaetze.json
    // Dies ist nur ein Beispiel, denn wie Ihr euch denken könnt, ist das je nach Region/Bundesland/Persönliches Empfinden alles unterschiedlich.
    
    const einsatzMapping = new Map([
        ["B: Klein", [0, 1, 2, ]],
        ["B: Mittel", [3, 4, 5]],
        ["B: Groß", [6, 7, 8]],
        ["T: Unfall", [9, 10, 11]],
        ["U: Gefahrgut", [12, 13, 14]],
        ["RD: Notfall", [20, 21, 22]],
        ["P: Polizei", [30, 31, 32]],
    ]);

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

        if (!element.dataset.updated || element.innerText !== `${neuesKürzel} `) {
            element.innerText = `${neuesKürzel} `;
            element.dataset.updated = "true";
        }
    }

    function updateAllMissions() {
        document.querySelectorAll('[id^="mission_caption_"]').forEach(updateMissionName);
    }

    updateAllMissions();

    const missionListIds = [
        "mission_list",
        "mission_list_krankentransporte",
        "mission_list_alliance",
        "mission_list_sicherheitswache_alliance",
        "mission_list_alliance_event",
        "mission_list_sicherheitswache"
    ];

    missionListIds.forEach(id => {
        const missionList = document.getElementById(id);
        if (missionList) {
            new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            const caption = node.querySelector('[id^="mission_caption_"]');
                            if (caption) updateMissionName(caption);
                        }
                    });
                    mutation.target.querySelectorAll('[id^="mission_caption_"]').forEach(updateMissionName);
                });
            }).observe(missionList, { childList: true, subtree: true, characterData: true });
        }
    });
})();
