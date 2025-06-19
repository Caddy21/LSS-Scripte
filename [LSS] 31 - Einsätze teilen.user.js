// ==UserScript==
// @name         Einsatz-Teilen-Button ab Durchschnittsverdienst
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Fügt einen Teilen-Button bei lukrativen Einsätzen ein
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    "use strict";

    const MIN_CREDITS = 100; // Mindestdurchschnittsverdiens

    const MISSION_LIST_IDS = [
        "mission_list",
        "mission_list_krankentransporte",
        "mission_list_alliance",
        "mission_list_sicherheitswache_alliance",
        "mission_list_alliance_event",
        "mission_list_sicherheitswache",
    ];

    function createShareButton(missionId, avgCredits, alarmButton) {
        const button = document.createElement("a");
        button.href = "#";
        button.className = "btn btn-primary btn-xs mission-alarm-button";
        button.id = `custom_share_btn_${missionId}`;
        button.title = `Im Verband freigeben (ø ${avgCredits} Credits)`;
        button.style.marginLeft = "5px";
        button.innerHTML = '<span class="glyphicon glyphicon-share"></span>';

        button.addEventListener("click", (event) => {
            event.preventDefault();

            const shareUrl = `/missions/${missionId}/alliance?ift=kt_al_ae_sw&sd=a&sk=cr`;

            // Unsichtbares Iframe zur URL laden
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = shareUrl;
            document.body.appendChild(iframe);

            // Optional: iframe nach kurzer Zeit wieder entfernen
            setTimeout(() => {
                iframe.remove();
            }, 2000);

        });

        alarmButton.insertAdjacentElement("afterend", button);
    }

    async function getAverageCreditsData() {
        const CACHE_KEY = "einsaetze_average_cache_v2";
        const CACHE_TIME = 24 * 60 * 60 * 1000; // 24 Stunden

        const cached = await GM_getValue(CACHE_KEY, null);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < CACHE_TIME) {  
                    return parsed.data;
                }
            } catch (e) {
                console.warn("[Teilen-Button] Fehler beim Parsen des GM-Caches:", e);
            }
        }

        const res = await fetch("https://www.leitstellenspiel.de/einsaetze.json");
        const data = await res.json();

        const creditMap = {};
        data.forEach(entry => {
            creditMap[entry.id] = entry.average_credits;
        });

        await GM_setValue(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: creditMap
        }));
        return creditMap;
    }

    async function initShareButtons() {
        const averageCreditsData = await getAverageCreditsData();

        MISSION_LIST_IDS.forEach(listId => {
            const list = document.getElementById(listId);
            if (!list) return;

            const missions = list.querySelectorAll(".missionSideBarEntry");
            missions.forEach(entry => {
                const missionId = entry.getAttribute("mission_id");
                const missionTypeId = entry.getAttribute("mission_type_id");

                if (!missionId || !missionTypeId) return;
                if (document.getElementById(`custom_share_btn_${missionId}`)) return;

                const avgCredits = averageCreditsData[missionTypeId];
                if (!avgCredits || avgCredits < MIN_CREDITS) return;

                const alarmButton = document.getElementById(`alarm_button_${missionId}`);
                if (!alarmButton) return;

                createShareButton(missionId, avgCredits, alarmButton);
            });
        });
    }

    // Starte, wenn Seite fertig geladen ist
    const observer = new MutationObserver(() => initShareButtons());
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("load", () => {
        initShareButtons();
    });
})();
