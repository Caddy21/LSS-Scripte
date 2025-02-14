// ==UserScript==
// @name         [LSS] 13 - Alarmstichworte
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Setzt eigene Alarmstichworte in der Einsatzliste
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        none
// ==/UserScript==

    // Hier könnt Ihr eure eigenen Alarmstichworte erstellen und die entpsrechende ID des Einsatzes hinzufügen.
    // Finden könnt Ihr sämtliche Einsatz IDs hier > https://v3.lss-manager.de/modules/lss-missionHelper/missions/de_DE.json
    // Dies ist nur ein Beispiel, denn wie Ihr euch denken könnt, ist das je nach Region/Bundesland/Persönliches Empfinden alles unterschiedlich.

(function () {
    'use strict';

    // Alarmstichworte Mapping mit einem Map-Objekt für schnellen Zugriff
    const einsatzMapping = new Map([
        ["B: Klein", [0, 1, 2, 436]],
        ["B: Mittel", [3, 4, 5]],
        ["B: Groß", [6, 7, 8, 168]],
        ["T: Unfall", [9, 10, 11]],
        ["U: Gefahrgut", [12, 13, 14]],
        ["RD: Notfall", [20, 21, 22, 417, 881]],
        ["P: Polizei", [30, 31, 32, 123]],
        ["TH: Umweltschaden", [174]],
    ]);

    // Umgekehrte Map für schnellen ID-zu-Stichwort-Zugriff
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

        // Setze das Alarmstichwort nur, wenn es noch nicht aktualisiert wurde oder es überschrieben wurde
        if (!element.dataset.updated || element.innerText !== `${neuesKürzel} `) {
            element.innerText = `${neuesKürzel} `;
            element.dataset.updated = "true"; // Markierung zur Verhinderung unnötiger Änderungen
        }
    }

    function updateAllMissions() {
        document.querySelectorAll('[id^="mission_caption_"]').forEach(updateMissionName);
    }

    // Direkt auf bestehende Einsätze anwenden
    updateAllMissions();

    // MutationObserver für neue Einsätze und Änderungen
    const missionList = document.getElementById('mission_list');
    if (missionList) {
        new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Nur Elemente beachten
                        const caption = node.querySelector('[id^="mission_caption_"]');
                        if (caption) updateMissionName(caption);
                    }
                });

                // Beobachtet Änderungen an bestehenden Einsätzen (z. B. nach Alarmierung)
                mutation.target.querySelectorAll('[id^="mission_caption_"]').forEach(updateMissionName);
            });
        }).observe(missionList, { childList: true, subtree: true, characterData: true });
    }
})();
