// ==UserScript==
// @name         [LSS] Editorhelfer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Öffnet alle sichtbaren Editbutton und fügt die gewünschte Zahl ein, speichert im Anschluss die Eingabe
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/buildings/*
// @match        https://polizei.leitstellenspiel.de/buildings/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function insertUI() {
        if (document.getElementById('editAllBtn')) return;

        const container = document.querySelector("#autoFilterToggle")?.parentNode
                       || document.querySelector(".search_input_field")?.parentNode;
        if (!container) return console.warn("⚠️ Kein geeigneter Button-Container gefunden.");

        // Eingabefeld
        let inputField = document.createElement("input");
        inputField.id = "editAllInput";
        inputField.type = "number";
        inputField.placeholder = "Zahl einfügen";
        inputField.style.width = "80px";
        inputField.style.marginRight = "8px";
        inputField.style.padding = "4px";

        // Edit-Button
        const editBtn = document.createElement("button");
        editBtn.id = "editAllBtn";
        editBtn.textContent = "🟠 Edit klicken";
        editBtn.className = "btn btn-default";
        editBtn.style.marginRight = "8px";
        editBtn.style.padding = "4px 8px";
        editBtn.style.fontWeight = "bold";

        // Save-Button
        const saveBtn = document.createElement("button");
        saveBtn.id = "saveAllBtn";
        saveBtn.textContent = "💾 Alles speichern";
        saveBtn.className = "btn btn-success";
        saveBtn.style.marginRight = "8px";
        saveBtn.style.padding = "4px 8px";
        saveBtn.style.fontWeight = "bold";

        // Reihenfolge: Input → Edit → Save
        container.insertBefore(saveBtn, container.firstChild);
        container.insertBefore(editBtn, saveBtn);
        container.insertBefore(inputField, editBtn);

        console.log("✅ UI eingefügt: Eingabefeld → Edit → Speichern");

        const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

        // Edit-Formulare per AJAX laden & Zahl einfügen
        editBtn.addEventListener("click", () => {
            const valueToInsert = inputField.value;
            const editButtons = Array.from(document.querySelectorAll('#tab_buildings a.personal_count_target_edit_button'))
                                     .filter(el => el.offsetParent !== null);

            if (!editButtons.length) return alert("Momentan keine sichtbaren Edit-Buttons vorhanden!");

            editButtons.forEach((btn, idx) => {
                setTimeout(() => {
                    const buildingId = btn.getAttribute('building_id');
                    const href = btn.href;

                    $.get(href, data => {
                        const targetDiv = document.getElementById(`building_personal_count_target_${buildingId}`);
                        if (targetDiv) {
                            targetDiv.innerHTML = data;
                            if (valueToInsert) {
                                const inputInForm = targetDiv.querySelector('input[type="number"]');
                                if (inputInForm) inputInForm.value = valueToInsert;
                            }
                        }
                    });
                }, idx * 600);
            });

            setTimeout(() => alert("Alle Edit-Formulare wurden geladen und Zahl eingefügt!"), editButtons.length * 600);
        });

        // Save-Formulare per AJAX POST korrekt
        saveBtn.addEventListener("click", () => {
            const saveForms = Array.from(document.querySelectorAll('form'))
                                   .filter(f => f.querySelector('input.btn.btn-success[name="commit"][type="submit"]'));

            if (!saveForms.length) return alert("Keine Speichern-Formulare gefunden!");

            saveForms.forEach((form, idx) => {
    setTimeout(() => {
        // Zahl ins Formular schreiben
        const inputInForm = form.querySelector('input[type="number"]');
        const valueToInsert = document.getElementById('editAllInput').value;
        if (inputInForm && valueToInsert) inputInForm.value = valueToInsert;

        const formData = new FormData(form);
        const method = (form.method || 'POST').toUpperCase();
        const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

        // ❌ Prüfen, ob URL bereits den Parameter enthält
        let action = form.action;
        if (!action.includes('personal_count_target_only=1')) {
            action += (action.includes('?') ? '&' : '?') + 'personal_count_target_only=1';
        }

        fetch(action, {
            method: method,
            body: formData,
            credentials: 'same-origin',
            headers: {
                'X-CSRF-Token': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(res => res.text())
        .then(data => {
            const targetDiv = form.closest('div[id^="building_personal_count_target_"]');
            if (targetDiv) targetDiv.innerHTML = data;
        })
        .catch(err => console.error('Fehler beim Speichern:', err));
    }, idx * 400);
});

            setTimeout(() => alert("Alle Formulare wurden per AJAX gespeichert!"), saveForms.length * 400);
        });
    }

    insertUI();

    // Beobachter für dynamisches Nachladen
    const observer = new MutationObserver(insertUI);
    observer.observe(document.body, { childList: true, subtree: true });

})();
