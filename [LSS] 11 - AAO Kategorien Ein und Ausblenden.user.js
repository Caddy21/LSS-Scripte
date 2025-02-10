// ==UserScript==
// @name         [LSS] AAO-Kategorien de-/aktivieren
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  AAO-Kategorien schneller ein- oder ausblenden über einen Button
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function getTheme() {
        return document.body.classList.contains("dark") ? "dark" : "light";
    }

    function updateButtonStyle(button, isActive) {
        const theme = getTheme();

        button.style.padding = "10px 16px"; // Etwas größer für besseres Klicken
        button.style.fontSize = "14px";
        button.style.fontWeight = "bold";
        button.style.borderRadius = "5px"; // Weniger rund = moderner Look
        button.style.cursor = "pointer";
        button.style.transition = "all 0.2s ease-in-out"; // Sanfter Übergang
        button.style.boxShadow = "0px 2px 4px rgba(0, 0, 0, 0.1)"; // Dezenter Schatten
        button.style.border = "none"; // Kein Rand für modernes Design

        if (isActive) {
            button.innerText = "Aktiv";
            button.classList.remove("inactive");
            button.classList.add("active");
            button.style.backgroundColor = theme === "dark" ? "#2ECC71" : "#27AE60"; // Grün
            button.style.color = "#FFFFFF";
        } else {
            button.innerText = "Inaktiv";
            button.classList.remove("active");
            button.classList.add("inactive");
            button.style.backgroundColor = theme === "dark" ? "#E74C3C" : "#C0392B"; // Rot
            button.style.color = "#FFFFFF";
        }

        // Hover-Effekt für eine moderne UI
        button.addEventListener("mouseenter", function () {
            button.style.opacity = "0.85";
        });

        button.addEventListener("mouseleave", function () {
            button.style.opacity = "1";
        });
    }

    async function toggleStatus(button, categoryId) {
        const editUrl = `https://www.leitstellenspiel.de/aao_categorys/${categoryId}/edit`;

        try {


            const response = await fetch(editUrl);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, "text/html");

            const hiddenCheckbox = doc.querySelector("#aao_category_hidden");
            const form = doc.querySelector("form");

            if (!hiddenCheckbox || !form) {
                console.error("❌ Checkbox oder Formular nicht gefunden!");
                return;
            }

            // Status umschalten
            const newStatus = !hiddenCheckbox.checked;
            hiddenCheckbox.checked = newStatus;


            // Formulardaten sammeln
            const formData = new FormData(form);
            formData.set("aao_category[hidden]", newStatus ? "1" : "0");

            // Änderung speichern
            const saveResponse = await fetch(form.action, {
                method: "POST",
                body: formData,
                headers: {
                    "X-Requested-With": "XMLHttpRequest"
                }
            });

            if (saveResponse.ok) {


                // Button sofort aktualisieren
                updateButtonStyle(button, !newStatus);
            } else {
                console.error("❌ Fehler beim Speichern!");
            }
        } catch (error) {
            console.error("❌ Fehler beim Abrufen der Seite:", error);
        }
    }

    function addStatusButtons() {
        const table = document.getElementById("aao_category_index_table");
        if (!table) {

            return;
        }

        const rows = table.getElementsByTagName("tr");

        if (table.querySelector(".status-column")) {

            return;
        }

        // Spaltenkopf für "Aktiv/Inaktiv" hinzufügen
        const headerRow = table.querySelector("thead tr");
        if (headerRow) {
            const th = document.createElement("th");
            th.innerText = "Aktiv/Inaktiv";
            th.classList.add("status-column");
            headerRow.appendChild(th);
        }

        // Buttons für jede Zeile hinzufügen
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const td = document.createElement("td");

            const categoryIdMatch = row.innerHTML.match(/aao_categorys\/(\d+)\/edit/);
            if (!categoryIdMatch) {
                console.warn(`⚠ Konnte die Kategorie-ID für Zeile ${i} nicht ermitteln.`);
                continue;
            }

            const categoryId = categoryIdMatch[1];

            const button = document.createElement("button");
            button.innerText = "Laden...";
            button.classList.add("status-button");

            updateButtonStyle(button, false); // Standard: Inaktiv

            // Status der Checkbox abrufen
            (async () => {
                try {
                    const response = await fetch(`https://www.leitstellenspiel.de/aao_categorys/${categoryId}/edit`);
                    const text = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(text, "text/html");

                    const hiddenCheckbox = doc.querySelector("#aao_category_hidden");

                    if (hiddenCheckbox) {
                        updateButtonStyle(button, !hiddenCheckbox.checked);
                    } else {
                        console.error(`❌ Konnte den Status für Kategorie ${categoryId} nicht abrufen.`);
                        button.innerText = "Fehler";
                    }
                } catch (error) {
                    console.error(`❌ Fehler beim Laden des Status für Kategorie ${categoryId}:`, error);
                    button.innerText = "Fehler";
                }
            })();

            button.addEventListener("click", function () {
                toggleStatus(button, categoryId);
            });

            td.appendChild(button);
            row.appendChild(td);
        }
    }

    // MutationObserver für dynamische Änderungen
    const observer = new MutationObserver(() => {
        addStatusButtons();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    addStatusButtons();
})();
