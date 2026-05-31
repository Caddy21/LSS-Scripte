// ==UserScript==
// @name         [LSS] BePo-Personalbeschaffer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Wählt freie BePo-Mitarbeiter ohne Ausbildung und Fahrzeugbindung aus
// @author       BOS-Ernie, abgewandelt von Caddy21 auf seine Bedürfnisse
// @match        https://www.leitstellenspiel.de/buildings/*/hire
// @match        https://polizei.leitstellenspiel.de/buildings/*/hire
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const loadedBuildings = window.loadedBuildings || (window.loadedBuildings = []);

    function getPanelHeading(buildingId) {
        return document.querySelector(`.personal-select-heading[building_id="${buildingId}"]`);
    }

    function getPanelBody(buildingId) {
        return document.querySelector(`.panel-body[building_id="${buildingId}"]`);
    }

    function getOriginalCount(buildingId) {
        const heading = getPanelHeading(buildingId);
        if (!heading) return 0;

        const span = [...heading.querySelectorAll("span")]
            .find(s => s.textContent.includes("Derzeit"));

        if (!span) return 0;

        const match = span.textContent.match(/Derzeit:\s*(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    async function loadBuilding(buildingId) {
        const heading = getPanelHeading(buildingId);
        const body = getPanelBody(buildingId);

        if (!heading || !body) return false;

        const href = heading.outerHTML.match(/href="([^"]+)"/)?.[1];
        if (!href) return false;

        if (loadedBuildings.includes(href)) return true;

        loadedBuildings.push(href);

        await $.get(href, function (data) {
            body.innerHTML = data;
        });

        body.querySelectorAll(".schooling_select_available")
            .forEach(el => el.parentElement?.remove());

        return true;
    }

    async function selectFreePersonnel(buildingId, amount = 50) {
        await loadBuilding(buildingId);

        const body = getPanelBody(buildingId);
        if (!body) return 0;

        let selected = 0;

        const rows = body.querySelectorAll("tr");

        for (const row of rows) {

            if (selected >= amount) break;

            const checkbox = row.querySelector("input.schooling_checkbox");
            if (!checkbox || checkbox.checked) continue;

            const cells = row.querySelectorAll("td");
            if (cells.length < 4) continue;

            const education = cells[2].innerHTML.replace(/\s/g, "");
            const vehicle = cells[3].innerHTML.replace(/\s/g, "");

            if (education.length === 0 && vehicle.length === 0) {
                checkbox.click();
                selected++;
            }
        }

        return selected;
    }

    async function resetPersonnel(buildingId) {
        await loadBuilding(buildingId);

        const body = getPanelBody(buildingId);

        body.querySelectorAll("input.schooling_checkbox:checked")
            .forEach(cb => cb.click());
    }

    function handleSelect(buildingId, amount, state) {
        selectFreePersonnel(buildingId, amount).then(newly => {

            const original = getOriginalCount(buildingId);

            state.selected += newly;

            state.selectedLabel.textContent = `${state.selected} ausgewählt`;

            const remaining = Math.max(original - state.selected, 0);
            state.remainingLabel.textContent = `${remaining} verbleibend`;
        });
    }

    function createButtonGroup(buildingId) {
        const state = {
            selected: 0,
            selectedLabel: null,
            remainingLabel: null
        };

        const wrapper = document.createElement("span");

        // 🟦 verbleibend
        const remainingLabel = document.createElement("span");
        remainingLabel.className = "label label-primary";
        remainingLabel.style.marginRight = "6px";

        // 🟨 ausgewählt
        const selectedLabel = document.createElement("span");
        selectedLabel.className = "label label-success";
        selectedLabel.style.marginRight = "6px";
        selectedLabel.textContent = "0 ausgewählt";

        state.remainingLabel = remainingLabel;
        state.selectedLabel = selectedLabel;

        const group = document.createElement("div");
        group.className = "btn-group btn-group-xs";

        const reset = document.createElement("button");
        reset.className = "btn btn-danger btn-xs";
        reset.innerHTML = '<span class="glyphicon glyphicon-trash"></span>';

        reset.addEventListener("click", async (e) => {

            e.preventDefault();
            e.stopPropagation();

            await resetPersonnel(buildingId);

            state.selected = 0;
            selectedLabel.textContent = "0 ausgewählt";

            const original = getOriginalCount(buildingId);
            remainingLabel.textContent = `${original} verbleibend`;
        });

        const btn = (text, amount) => {
            const b = document.createElement("button");
            b.className = "btn btn-default btn-xs";
            b.textContent = text;

            b.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(buildingId, amount, state);
            });

            return b;
        };

        const main = document.createElement("button");
        main.className = "btn btn-default btn-xs";
        main.textContent = "Freie auswählen";

        main.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSelect(buildingId, 50, state);
        });

        group.appendChild(reset);
        group.appendChild(btn("+1", 1));
        group.appendChild(btn("+2", 2));
        group.appendChild(btn("+5", 5));
        group.appendChild(main);

        wrapper.appendChild(remainingLabel);
        wrapper.appendChild(selectedLabel);
        wrapper.appendChild(group);

        return wrapper;
    }

    function addButtons() {
        document.querySelectorAll(
            '.panel-heading.personal-select-heading.personnel_pannel_heading'
        ).forEach(header => {

            if (header.dataset.freeAdded) return;
            header.dataset.freeAdded = "1";

            const id = header.getAttribute("building_id");

            const right = [...header.querySelectorAll("span")]
                .find(s => s.textContent.includes("Derzeit"));

            const group = createButtonGroup(id);

            if (right) {
                right.parentNode.insertBefore(group, right);
            } else {
                header.appendChild(group);
            }
        });
    }

    function main() {
        const h1 = document.querySelector("h1[building_type]");
        if (!h1 || h1.getAttribute("building_type") !== "11") return;

        addButtons();

        new MutationObserver(addButtons)
            .observe(document.body, {
                childList: true,
                subtree: true
            });
    }

    main();

})();
