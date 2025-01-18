// ==UserScript==
// @name         [LSS] SNR-Einsätze filtern
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Filtert einzig Seenotrettungseinsätze (SNR)
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        GM_addStyle
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// ==/UserScript==

GM_addStyle(`
    .filterShow {
        display: block;
    }
    .filterHide {
        display: none;
    }
`);

(function() {
    'use strict';

    // Funktion, um SNR-Missionen zu filtern
    function filterSNR() {
        const missions = $("#mission_list").find("div[class*='missionSideBarEntry missionSideBarEntrySearchable']");

        missions.each((index, mission) => {
            const missionElement = $(mission);
            const missionId = missionElement.attr("mission_type_id");

            // ID-Bereich für Seenotrettungseinsätze (885 bis 896)
            const snrMissionTypeIds = [885, 886, 887, 888, 889, 890, 891, 892, 893, 894, 895, 896];

            // Wenn die Mission eine Seenotrettung ist, zeigen wir sie an, ansonsten blenden wir sie aus
            if (snrMissionTypeIds.includes(parseInt(missionId))) {
                missionElement.removeClass("filterHide");
                missionElement.addClass("filterShow");
            } else {
                missionElement.removeClass("filterShow");
                missionElement.addClass("filterHide");
            }
        });
    }

    // Funktion, um den Filter-Button zu erstellen
    function createFilterButton() {
        let filterDiv = $("#search_input_field_missions");
        let html = `<div id="snr_filter_button">
                    <br /><b>Seenotrettung Filter</b>&nbsp;&nbsp;
                    <a id='filter_snr' class='btn btn-xs btn-default' href='' title='Grün = Zeigt Seenotrettungseinsätze an. Rot = Blendt sie aus.'>SNR Filter</a>
                    </div>`;

        filterDiv.before(html);

        // Listener für den Filter-Button
        $("#filter_snr").click(function(event) {
            event.preventDefault();
            toggleFilter();
        });
    }

    // Funktion zum Umschalten des Filters
    function toggleFilter() {
        const status = $("#filter_snr").attr("status");

        if (status === "active") {
            $("#filter_snr").removeClass("btn-success").addClass("btn-danger");
            $("#filter_snr").attr("status", "inactive");
            $(".missionSideBarEntry").removeClass("filterShow").addClass("filterHide"); // Verstecken aller
        } else {
            $("#filter_snr").removeClass("btn-danger").addClass("btn-success");
            $("#filter_snr").attr("status", "active");
            filterSNR(); // Zeige nur die Seenotrettungseinsätze
        }
    }

    // Initialisierung des Filters
    function init() {
        createFilterButton();
    }

    init();
})();
