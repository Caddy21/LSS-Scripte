// ==UserScript==
// @name         [LSS] Einsätze teilen
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Fügt einen Teilen-Button bei lukrativen Einsätzen ein
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    "use strict";

    const MIN_CREDITS = 5000;

    const MISSION_LIST_IDS = [
        "mission_list",
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

            const shareUrl = `/missions/${missionId}/alliance`;

            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = shareUrl;
            document.body.appendChild(iframe);

            // Entferne iFrame nach kurzer Zeit
            setTimeout(() => {
                iframe.remove();
            }, 2000);

            // Button ausblenden
            button.style.display = "none";
        });

        alarmButton.insertAdjacentElement("afterend", button);
    }

    function initShareButtons() {
        MISSION_LIST_IDS.forEach(listId => {
            const list = document.getElementById(listId);
            if (!list) return;

            const missions = list.querySelectorAll(".missionSideBarEntry");
            missions.forEach(entry => {
                const missionId = entry.getAttribute("mission_id");
                if (!missionId) return;
                if (document.getElementById(`custom_share_btn_${missionId}`)) return;

                const sortableDataStr = entry.getAttribute("data-sortable-by");
                if (!sortableDataStr) return;

                let avgCredits = null;
                try {
                    const sortableData = JSON.parse(sortableDataStr);
                    avgCredits = sortableData.average_credits;
                } catch (e) {
                    return;
                }

                if (!avgCredits || avgCredits < MIN_CREDITS) return;

                const alarmButton = document.getElementById(`alarm_button_${missionId}`);
                if (!alarmButton) return;

                createShareButton(missionId, avgCredits, alarmButton);
            });
        });
    }

    const observer = new MutationObserver(() => initShareButtons());
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("load", () => {
        initShareButtons();
    });

})();
