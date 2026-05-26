// ==UserScript==
// @name         [LSS] Lehrgänge filtern
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Blendet Lehrgänge im Dropdown der eigenen Schulen aus
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/buildings/*
// @match        https://polizei.leitstellenspiel.de/buildings/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// ==/UserScript==

(function () {
    'use strict';

    // true = anzeigen
    // false = ausblenden
    const courses = {

        // Feuerwehr
        "railway_fire:18": true,                 // Bahnrettung
        "dekon_p:5": true,                       // Dekon-P
        "fire_drone:15": false,                  // Drohnen-Schulung
        "elw2:3": true,                          // ELW 2
        "fire_care_service:16": false,           // Feuerwehr Betreuungsdienst
        "fwk:6": true,                           // Feuerwehrkran
        "arff:10": true,                         // Flughafenfeuerwehr
        "gw_gefahrgut:1": true,                  // GW-Gefahrgut
        "gw_messtechnik:0": true,                // GW-Messtechnik
        "gw_taucher:8": false,                   // GW-Taucher
        "gw_wasserrettung:7": false,             // GW-Wasserrettung
        "gw_hoehenrettung:2": true,              // Höhenrettung
        "intensive_care:13": false,              // Intensivpflege
        "energy_supply:14": false,               // Energieversorgung
        "notarzt:9": false,                      // Notarzt
        "rettungstreppe:11": true,               // Rettungstreppe
        "care_service_equipment:17": false,      // Verpflegungshelfer
        "wechsellader:4": true,                  // Wechsellader
        "werkfeuerwehr:12": true,                // Werkfeuerwehr

        // Rettungsdienst
        "care_service:10": true,                 // Betreuungsdienst
        "seg_drone:9": false,                    // Drohnenoperator
        "mountain_command:14": false,             // Einsatzleiter Bergrettung
        "gw_taucher:6": true,                    // GW-Taucher Lehrgang
        "gw_wasserrettung:5": true,              // GW-Wasserrettung Lehrgang
        "mountain_height_rescue:12": false,       // Höhenretter
        "intensive_care:8": false,               // Intensivpflege
        "lna:1": true,                           // LNA-Ausbildung
        "notarzt:0": true,                       // Notarzt-Ausbildung
        "orgl:2": true,                          // OrgL-Ausbildung
        "seg_rescue_dogs:7": false,              // Rettungshundeführer
        "seg_elw:3": true,                       // SEG - Einsatzleitung
        "seg_gw_san:4": true,                    // SEG - GW-San
        "disaster_response_technology:15": true, // Technik und Sicherheit
        "care_service_equipment:11": false,      // Verpflegungshelfer
        "rescue_helicopter_lift:13": true,       // Windenoperator

        // THW
        "gw_taucher:3": true,                    // Fachgruppe Bergungstaucher
        "thw_bridge_construction:12": true,      // Fachgruppe Brückenbau
        "thw_energy_supply:7": true,             // Fachgruppe Elektroversorgung
        "thw_rescue_dogs:4": false,              // Fachgruppe Rettungshundeführer
        "thw_raumen:1": true,                    // Fachgruppe Räumen
        "heavy_rescue:6": true,                  // Fachgruppe Schwere Bergung
        "gw_wasserrettung:2": true,              // Fachgruppe Wassergefahren
        "water_damage_pump:5": true,             // Fachgruppe Wasserschaden/Pumpen
        "thw_command:9": true,                   // Fachzug Führung und Kommunikation
        "thw_bridge_construction_crane:13": true,// Kranführer
        "thw_care_service:10": false,            // Logistik-Verpflegung
        "thw_drone:8": false,                    // Trupp Unbemannte Luftfahrtsysteme
        "care_service_equipment:11": false,      // Verpflegungshelfer
        "thw_zugtrupp:0": true,                  // Zugtrupp

        // Polizei
        "highway_police:14": true,               // Autobahnpolizei
        "police_firefighting:8": true,           // Brandbekämpfung
        "police_service_group_leader:10": true,  // Dienstgruppenleitung
        "k9:6": true,                            // Hundeführer (Schutzhund)
        "police_fukw:1": true,                   // Hundertschaftsführer (FüKW)
        "criminal_investigation:9": true,        // Kriminalpolizei
        "police_speaker_operator:13": true,      // Lautsprecheroperator
        "police_mek:5": true,                    // MEK
        "police_motorcycle:7": true,             // Motorradstaffel
        "polizeihubschrauber:2": true,           // Polizeihubschrauber
        "police_horse:11": true,                 // Reiterstaffel
        "police_sek:4": true,                    // SEK
        "police_wasserwerfer:3": true,           // Wasserwerfer
        "police_helicopter_lift:12": false,       // Windenoperator
        "police_einsatzleiter:0": true           // Zugführer (leBefKw)
    };

    function filterCourses() {
        const select = document.getElementById("education_select");
        if (!select) return;

        // Aktuellen Wert merken
        const currentValue = select.value;

        // Kurse filtern
        [...select.options].forEach(option => {

            // Falls Kurs auf false steht → ausblenden
            if (courses[option.value] === false) {
                option.hidden = true;
            }

        });

        // Optionen holen
        const options = [...select.options];

        // Standardoption holen
        const defaultOption = options.find(option => option.value === "");

        // Lehrgänge sortieren
        const sortedOptions = options
        .filter(option => option.value !== "")
        .sort((a, b) => {

            const numA = parseInt(a.value.split(":")[1] || 0);
            const numB = parseInt(b.value.split(":")[1] || 0);

            return numA - numB;
        });

        // Select komplett leeren
        select.innerHTML = "";

        // Standardoption zuerst
        if (defaultOption) {
            select.appendChild(defaultOption);
        }

        // Danach sortierte Lehrgänge
        sortedOptions.forEach(option => {
            select.appendChild(option);
        });

        // Auswahl wiederherstellen
        if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
            select.value = currentValue;
        } else {
            // Sonst Standardoption auswählen
            select.value = "";
        }
    }

    filterCourses();

})();
