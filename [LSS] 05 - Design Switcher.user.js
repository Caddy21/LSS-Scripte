// ==UserScript==
// @name         [LSS] Design Switcher
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Wechsel zwischen verschiedenen Desings
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Funktion, die das aktuelle Design über die API abruft
    async function getCurrentDesign() {
        try {
            const response = await fetch('/api/settings', {
                method: 'GET',
                credentials: 'same-origin',
            });

            if (!response.ok) {
                console.error('Fehler beim Abrufen der aktuellen Einstellungen:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('Komplette API-Antwort:', data); // Debugging: Volle API-Antwort ausgeben

            // Überprüfung auf das Feld "design_mode"
            if (data && data.design_mode !== undefined) {
                const design = String(data.design_mode); // Konvertiere zu String
                console.log('Aktuelles Design von API abgerufen:', design);
                return design; // Rückgabe der Design-ID als String
            } else {
                console.error('Das Feld "design_mode" wurde in der API-Antwort nicht gefunden.');
                return null;
            }
        } catch (error) {
            console.error('Fehler beim Abrufen der API-Einstellungen:', error);
            return null;
        }
    }

    // Funktion, die das Design umschaltet
    async function toggleDesign() {
        const currentDesign = await getCurrentDesign();
        if (currentDesign === null) {
            alert('Aktuelles Design konnte nicht ermittelt werden.');
            return;
        }

        // Neues Design basierend auf dem aktuellen Design bestimmen
        let newDesign = '';
        if (currentDesign === '0') {
            newDesign = '4'; // Wechsel zu Fenster-Design - Dunkel
        } else if (currentDesign === '4') {
            newDesign = '0'; // Wechsel zurück zu Standard-Design
        } else {
            console.warn(`Unbekanntes Design erkannt: ${currentDesign}. Wechsel wird abgebrochen.`);
            alert(`Unbekanntes Design erkannt: ${currentDesign}. Wechsel nicht möglich.`);
            return;
        }

        const newUrl = `/design/${newDesign}`;
        console.log(`Versuch: Wechsel von Design ${currentDesign} zu Design ${newDesign}`);

        // Designwechsel durchführen
        try {
            const response = await fetch(newUrl, {
                method: 'GET',
                credentials: 'same-origin',
            });
            if (response.ok) {
                console.log(`Design erfolgreich gewechselt auf ${newDesign}`);
                // Bestätigen, dass das Design korrekt gewechselt wurde
                const updatedDesign = await getCurrentDesign();
                if (updatedDesign === newDesign) {
                    console.log(`Designwechsel bestätigt: Aktuelles Design ist jetzt ${updatedDesign}`);
                    window.location.reload(); // Seite neu laden
                } else {
                    console.error(`Designwechsel fehlgeschlagen. Erwartet: ${newDesign}, aber gefunden: ${updatedDesign}`);
                    alert('Designwechsel fehlgeschlagen. Bitte erneut versuchen.');
                }
            } else {
                console.error('Fehler beim Wechseln des Designs:', response.status);
                alert('Fehler beim Wechseln des Designs.');
            }
        } catch (error) {
            console.error('Fehler beim Wechseln des Designs:', error);
            alert('Fehler beim Wechseln des Designs.');
        }
    }

    // Text-Link erstellen
    const toggleText = document.createElement('li');
    toggleText.className = 'nav-item';
    toggleText.innerHTML = `
        <a href="#" id="design-toggle" class="nav-link">Design wechseln</a>
    `;

    // Event-Listener hinzufügen
    toggleText.querySelector('#design-toggle').addEventListener('click', (e) => {
        e.preventDefault();
        toggleDesign();
    });

    // Text-Link in die Navbar einfügen
    const navbarNav = document.querySelector('.navbar-nav');
    if (navbarNav) {
        navbarNav.appendChild(toggleText);
    } else {
        console.error('Navbar konnte nicht gefunden werden.');
    }
})();
