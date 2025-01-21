// ==UserScript==
// @name         LSS Mission Filter for SNR (Seenotrettung)
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Filtert einzig SNR Einsätze
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        GM_addStyle
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// ==/UserScript==

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
                    <br /><b>SNR-Einsätze</b>&nbsp;&nbsp;
                    <a id='filter_snr' class='btn btn-xs' href='' title='Klicken, um zwischen den Filtermodi zu wechseln.'>SNR</a>
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

        if (status === "show_snr") {
            // SNR ausblenden
            $("#filter_snr").css(getButtonStyles('hide'));
            $("#filter_snr").attr("status", "hide_snr");
            $(".missionSideBarEntry").removeClass("filterShow").addClass("filterHide"); // Verstecken aller SNR-Missionen
        } else if (status === "hide_snr") {
            // Alle Einsätze anzeigen
            $("#filter_snr").css(getButtonStyles('all'));
            $("#filter_snr").attr("status", "all");
            $(".missionSideBarEntry").removeClass("filterHide").addClass("filterShow"); // Alle anzeigen
        } else {
            // Nur SNR anzeigen
            $("#filter_snr").css(getButtonStyles('show'));
            $("#filter_snr").attr("status", "show_snr");
            filterSNR(); // Zeige nur die Seenotrettungseinsätze
        }
    }

    // Funktion, um die Button-Stile anzupassen (auf Basis von Dark oder Light Mode)
    function getButtonStyles(state) {
        const isDarkMode = $("body").hasClass("dark-theme");
        let backgroundColor, color, borderColor;

        // Farbdefinitionen für Dark und Light Mode
        if (state === 'show') {
            backgroundColor = isDarkMode ? '#28a745' : '#28a745'; // Grün (für SNR anzeigen)
            color = 'white';
            borderColor = isDarkMode ? '#218838' : '#218838'; // Dunkleres Grün
        } else if (state === 'hide') {
            backgroundColor = isDarkMode ? '#dc3545' : '#dc3545'; // Rot (für SNR ausblenden)
            color = 'white';
            borderColor = isDarkMode ? '#c82333' : '#c82333'; // Dunkleres Rot
        } else {
            backgroundColor = isDarkMode ? '#6c757d' : '#6c757d'; // Grauer Hintergrund (für alle anzeigen)
            color = 'white';
            borderColor = isDarkMode ? '#5a6268' : '#5a6268'; // Dunkleres Grau
        }

        return {
            "background-color": backgroundColor,
            "color": color,
            "border": `1px solid ${borderColor}`
        };
    }

    // Initialisierung des Filters
    function init() {
        // Überprüfe den aktuellen Status aus dem localStorage (falls verfügbar)
        const savedStatus = localStorage.getItem("snr_filter_status") || "all";
        $("#filter_snr").attr("status", savedStatus);
        // Wende den gespeicherten Status an
        $("#filter_snr").css(getButtonStyles(savedStatus));

        // Button erstellen und initialisieren
        createFilterButton();

        // Je nach Status die Einsätze filtern
        if (savedStatus === "show_snr") {
            filterSNR();
        } else if (savedStatus === "hide_snr") {
            $(".missionSideBarEntry").removeClass("filterShow").addClass("filterHide"); // SNR-Missionen ausblenden
        } else {
            $(".missionSideBarEntry").removeClass("filterHide").addClass("filterShow"); // Alle anzeigen
        }
    }

    init();

})();
