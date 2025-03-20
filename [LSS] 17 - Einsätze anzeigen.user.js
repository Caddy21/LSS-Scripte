// ==UserScript==
// @name         [LSS] Einsätze anzeigen
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Blendet Einsätze basierend auf individuellen Kategorien aus unter "Mögliche Einsätze"
// @match        https://www.leitstellenspiel.de/einsaetze*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const hideSuccess = true;  // Erfolgreiche Einsätze ausblenden
    // Konfigurierbare Optionen (true = ausblenden, false = anzeigen)
    const filterOptions = {
        feuerwachen: true,
        rettungswachen: false,
        wasserrettungswachen: false,
        polizeiwachen: false,
        thwOrtsverbaende: false,
        rettungshundestaffeln: false,
        dienstgruppenleitung: false,
        thwNotversorgung: false,
        thwRaeumen: false,
        thwZugtrupps: false,
        thwSB: false,
        drohnenErweiterungen: false,
        betreuungsVerpflegung: false,
        bereitschaftspolizei: false,
        gefangenenkraftwagen: false,
        hundertschaft: false,
        verpflegungsdienst: false,
        lautsprecherkraftwagen: false,
        motorradstaffel: false,
        polizeihubschrauber: false,
        wasserwerfer: false,
        mekWache: false,
        sekWache: false,
        nea50: false,
        nea200: false,
        bergrettungswache: false,
        seenotrettungswache: false,
        seenothubschrauber: false,
        reiterstaffel: false,
        bahnrettung: false,
        lüfter: false,
        windenrettung: false,
        werkfeuerwehr: false
    };

    // Schlagwörter und zugehörige Optionen
    const keywords = {
        "Feuerwache": filterOptions.feuerwachen,
        "Rettungswache": filterOptions.rettungswachen,
        "Wasserrettungswache": filterOptions.wasserrettungswachen,
        "Polizeiwache": filterOptions.polizeiwachen,
        "THW-Ortsverband": filterOptions.thwOrtsverbaende,
        "Rettungshundestaffel": filterOptions.rettungshundestaffeln,
        "Dienstgruppenleitung": filterOptions.dienstgruppenleitung,
        "THW: Fachgruppe Notversorgung": filterOptions.thwNotversorgung,
        "THW: Fachgruppe Räumen": filterOptions.thwRaeumen,
        "THW: Zugtrupp": filterOptions.thwZugtrupps,
        "THW: Fachgruppe SB": filterOptions.thwSB,
        "Drohnen-Erweiterung": filterOptions.drohnenErweiterungen,
        "Betreuungs- und Verpflegungsdienst": filterOptions.betreuungsVerpflegung,
        "Bereitschaftspolizeiwache": filterOptions.bereitschaftspolizei,
        "Erweiterung für Sonderfahrzeug: Gefangenenkraftwagen": filterOptions.gefangenenkraftwagen,
        "Züge der 1. Hundertschaft": filterOptions.hundertschaft,
        "Verpflegungsdienst-Erweiterung": filterOptions.verpflegungsdienst,
        "Lautsprecherkraftwagen-Erweiterung": filterOptions.lautsprecherkraftwagen,
        "Polizei-Motorradstaffel": filterOptions.motorradstaffel,
        "Polizeihubschrauberstation": filterOptions.polizeihubschrauber,
        "Technischer Zuge: Wasserwerfer": filterOptions.wasserwerfer,
        "MEK-Wache": filterOptions.mekWache,
        "SEK-Wache": filterOptions.sekWache,
        "NEA50-Erweiterung": filterOptions.nea50,
        "NEA200-Erweiterung": filterOptions.nea200,
        "Bergrettungswache": filterOptions.bergrettungswache,
        "Seenotrettungswache": filterOptions.seenotrettungswache,
        "Hubschrauberstationen (Seenotrettung)": filterOptions.seenothubschrauber,
        "Reiterstaffel": filterOptions.reiterstaffel,
        "Bahnrettungs-Erweiterung": filterOptions.bahnrettung,
        "Lüfter-Erweiterung": filterOptions.lüfter,
        "Windenrettungs-Erweiterungen": filterOptions.windenrettung,
        "Werkfeuerwehr": filterOptions.werkfeuerwehr
    };

    function hideMissions() {
        document.querySelectorAll('.mission_type_index_searchable').forEach(el => {
            let text = el.textContent || el.innerText;
            // Erfolgreiche Einsätze ausblenden
            if (hideSuccess && el.classList.contains('success')) {
                el.style.display = 'none';
                return;
            }

            // Prüfe alle Schlüsselwörter und deren Status
            for (const [keyword, shouldHide] of Object.entries(keywords)) {
                if (shouldHide && text.includes(keyword)) {
                    el.style.display = 'none';
                    return;
                }
            }
        });
    }

    // MutationObserver für dynamische Änderungen
    const observer = new MutationObserver(hideMissions);
    observer.observe(document.body, { childList: true, subtree: true });

    // Direkt ausführen
    hideMissions();
})();
