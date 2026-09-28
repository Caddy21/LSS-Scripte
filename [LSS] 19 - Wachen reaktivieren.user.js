// ==UserScript==
// @name         [LSS] Wachen reaktivieren
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Zeigt deaktivierte Wachen gruppiert an und ermöglicht das komfortable Reaktivieren.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      www.leitstellenspiel.de
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// ==/UserScript==

(function () {
    'use strict';

    const MODAL_ID = 'lss-disabled-buildings-modal';
    const BUTTON_ID = 'lss-disabled-buildings-button';

    let disabledBuildings = [];
    let activeFilter = 'all';

    const BUILDING_TYPES = {
        0: {
            name: 'Feuerwache',
            category: 'fire',
            icon: 'glyphicon-fire'
        },
        2: {
            name: 'Rettungswache',
            category: 'rescue',
            icon: 'glyphicon-plus-sign'
        },
        5: {
            name: 'Rettungshubschrauber-Station',
            category: 'rescue',
            icon: 'glyphicon-plane'
        },
        6: {
            name: 'Polizeiwache',
            category: 'police',
            icon: 'glyphicon-screenshot'
        },
        8: {
            name: 'Polizeihubschrauber-Station',
            category: 'police',
            icon: 'glyphicon-plane'
        },
        9: {
            name: 'THW',
            category: 'thw',
            icon: 'glyphicon-wrench'
        },
        12: {
            name: 'SEG',
            category: 'seg',
            icon: 'glyphicon-plus-sign'
        },
        15: {
            name: 'Wasserrettungswache',
            category: 'water',
            icon: 'glyphicon-tint'
        },
        25: {
            name: 'Bergrettungswache',
            category: 'mountain',
            icon: 'glyphicon-tree-conifer'
        },
        26: {
            name: 'Seenotrettungswache',
            category: 'snr',
            icon: 'glyphicon-tint'
        },
        28: {
            name: 'Seenotrettungshubschrauber-Station',
            category: 'snr',
            icon: 'glyphicon-plane'
        },
        29: {
            name: 'Autobahnpolizei',
            category: 'police',
            icon: 'glyphicon-road'
        }
    };

    const CATEGORIES = {
        fire: {
            name: 'Feuerwehr',
            icon: 'glyphicon-fire',
            order: 1
        },
        rescue: {
            name: 'Rettungsdienst',
            icon: 'glyphicon-plus-sign',
            order: 2
        },
        police: {
            name: 'Polizei',
            icon: 'glyphicon-screenshot',
            order: 3
        },
        thw: {
            name: 'THW',
            icon: 'glyphicon-wrench',
            order: 4
        },
        seg: {
            name: 'SEG',
            icon: 'glyphicon-plus-sign',
            order: 5
        },
        water: {
            name: 'Wasserrettung',
            icon: 'glyphicon-tint',
            order: 6
        },
        mountain: {
            name: 'Bergrettung',
            icon: 'glyphicon-tree-conifer',
            order: 7
        },
        snr: {
        name: 'SNR',
        order: 8
        },
    };

    function getBuildingType(building) {
        const type = BUILDING_TYPES[building.building_type];

        if (!type) {
            return null;
        }

        return {
            ...type,
            small: building.small_building === true
        };
    }

    function getTypeName(building) {
        const type = getBuildingType(building);

        if (!type) {
            return null;
        }

        return type.small
            ? `${type.name} (Kleinwache)`
        : type.name;
    }

    async function loadBuildings() {
        const allBuildings = [];
        const limit = 4000;
        let after = null;

        while (true) {
            const url = new URL(
                'https://www.leitstellenspiel.de/api/v2/buildings'
            );

            url.searchParams.set('limit', limit);

            if (after !== null) {
                url.searchParams.set('after', after);
            }

            const buildings = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url.toString(),
                    onload: response => {
                        if (response.status < 200 || response.status >= 300) {
                            reject(new Error(`HTTP ${response.status}`));
                            return;
                        }

                        try {
                            const data = JSON.parse(response.responseText);

                            if (!Array.isArray(data.result)) {
                                reject(new Error('Unerwartetes API-Format.'));
                                return;
                            }

                            resolve(data);
                        } catch (error) {
                            console.error(
                                '[LSS] Fehler beim Parsen der Buildings-API:',
                                error
                            );

                            reject(
                                new Error(
                                    'Die API-Antwort konnte nicht verarbeitet werden.'
                                )
                            );
                        }
                    },
                    onerror: () => {
                        reject(
                            new Error(
                                'Verbindung zur Gebäude-API fehlgeschlagen.'
                            )
                        );
                    }
                });
            });

            allBuildings.push(...buildings.result);
          
            if (
                !buildings.result.length ||
                buildings.result.length < limit
            ) {
                break;
            }

            const lastBuilding =
                  buildings.result[buildings.result.length - 1];

            if (!lastBuilding?.id) {
                console.warn(
                    '[LSS] Keine gültige ID für die nächste Pagination gefunden.'
                );
                break;
            }

            after = lastBuilding.id;
        }

        return allBuildings;
    }

    function activateBuilding(id) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://www.leitstellenspiel.de/buildings/${id}/active`,
                onload: response => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: () => {
                    reject(new Error('Die Wache konnte nicht aktiviert werden.'));
                }
            });
        });
    }

    function insertButton() {
        if (document.getElementById(BUTTON_ID)) {
            return;
        }

        const buildingPanelBody = document.querySelector('#building_panel_body');

        if (!buildingPanelBody) {
            return;
        }

        const buttons = buildingPanelBody.querySelectorAll('button');

        const s6Button = Array.from(buttons).find(button =>
                                                  button.textContent.includes('Fahrzeuge im S6')
                                                 );

        const button = document.createElement('button');

        button.id = BUTTON_ID;
        button.type = 'button';
        button.className = 'btn btn-danger';

        button.innerHTML = `
            <span class="glyphicon glyphicon-off"></span>
            <span class="lss-disabled-buildings-button-text">
                Inaktive Wachen
            </span>
        `;

        button.addEventListener('click', openModal);

        if (s6Button?.parentNode) {
            s6Button.parentNode.insertBefore(
                button,
                s6Button.nextSibling
            );
        } else {
            buildingPanelBody.appendChild(button);
        }

        updateButtonCount();
    }

    async function updateButtonCount() {
        try {
            const buildings = await loadBuildings();

            const count = buildings.filter(building =>
                                           building.enabled === false &&
                                           getBuildingType(building)
                                          ).length;

            const button = document.getElementById(BUTTON_ID);

            if (!button) {
                return;
            }

            const text = button.querySelector(
                '.lss-disabled-buildings-button-text'
            );

            if (!text) {
                return;
            }

            text.textContent = count > 0
                ? `Inaktive Wachen (${count})`
            : 'Inaktive Wachen';

            button.classList.toggle('btn-danger', count > 0);
            button.classList.toggle('btn-default', count === 0);
        } catch (error) {
            console.warn(
                '[LSS] Wachen reaktivieren:',
                error
            );
        }
    }

    function createModal() {
        const existingModal = document.getElementById(MODAL_ID);

        if (existingModal) {
            existingModal.remove();
        }

        activeFilter = 'all';

        const modal = document.createElement('div');

        modal.id = MODAL_ID;
        modal.className = 'lss-disabled-buildings-modal';

        modal.innerHTML = `
            <div class="lss-disabled-buildings-backdrop"></div>

            <div class="lss-disabled-buildings-dialog"
                 role="dialog"
                 aria-modal="true">

                <div class="lss-disabled-buildings-header">

                    <div>
                        <div class="lss-disabled-buildings-title">
                            <span class="glyphicon glyphicon-off"></span>
                            Inaktive Wachen
                        </div>

                        <div class="lss-disabled-buildings-subtitle">
                            Deaktivierte Wachen können hier wieder aktiviert werden.
                        </div>
                    </div>

                    <button type="button"
                            class="lss-disabled-buildings-close"
                            title="Schließen"
                            aria-label="Schließen">
                        <span class="glyphicon glyphicon-remove"></span>
                    </button>

                </div>

                <div class="lss-disabled-buildings-toolbar">

                    <div class="lss-disabled-buildings-filters"></div>

                    <div class="lss-disabled-buildings-search">
                        <span class="glyphicon glyphicon-search"></span>

                        <input type="search"
                               class="lss-disabled-buildings-search-input"
                               placeholder="Wache suchen..."
                               autocomplete="off">
                    </div>

                </div>

                <div class="lss-disabled-buildings-content">

                    <div class="lss-disabled-buildings-loading">
                        <span class="glyphicon glyphicon-refresh lss-spin"></span>
                        <span>Wachen werden geladen...</span>
                    </div>

                    <div class="lss-disabled-buildings-list"></div>

                    <div class="lss-disabled-buildings-empty">
                        <span class="glyphicon glyphicon-ok-circle"></span>
                        <strong>Keine inaktiven Wachen</strong>
                        <span>Alle unterstützten Wachen sind aktuell aktiviert.</span>
                    </div>

                    <div class="lss-disabled-buildings-error">
                        <span class="glyphicon glyphicon-warning-sign"></span>
                        <strong>Fehler beim Laden</strong>
                        <span class="lss-disabled-buildings-error-text"></span>

                        <button type="button"
                                class="btn btn-default btn-sm lss-disabled-buildings-retry">
                            Erneut versuchen
                        </button>
                    </div>

                </div>

                <div class="lss-disabled-buildings-footer">

                    <div class="lss-disabled-buildings-footer-info"></div>

                    <button type="button"
                            class="btn btn-default lss-disabled-buildings-footer-close">
                        Schließen
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.lss-disabled-buildings-backdrop')
            .addEventListener('click', closeModal);

        modal.querySelector('.lss-disabled-buildings-close')
            .addEventListener('click', closeModal);

        modal.querySelector('.lss-disabled-buildings-footer-close')
            .addEventListener('click', closeModal);

        modal.querySelector('.lss-disabled-buildings-retry')
            .addEventListener('click', loadDisabledBuildings);

        modal.querySelector('.lss-disabled-buildings-search-input')
            .addEventListener('input', event => {
            renderBuildings(event.target.value);
        });

        document.addEventListener(
            'keydown',
            handleEscape
        );

        requestAnimationFrame(() => {
            modal.classList.add('is-visible');
        });

        return modal;
    }

    function handleEscape(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    }

    function closeModal() {
        const modal = document.getElementById(MODAL_ID);

        if (!modal) {
            return;
        }

        modal.classList.remove('is-visible');

        document.removeEventListener(
            'keydown',
            handleEscape
        );

        setTimeout(() => {
            modal.remove();
        }, 180);
    }

    async function openModal() {
        createModal();
        await loadDisabledBuildings();
    }

    async function loadDisabledBuildings() {
        const modal = document.getElementById(MODAL_ID);

        if (!modal) {
            return;
        }

        const loading = modal.querySelector(
            '.lss-disabled-buildings-loading'
        );

        const list = modal.querySelector(
            '.lss-disabled-buildings-list'
        );

        const empty = modal.querySelector(
            '.lss-disabled-buildings-empty'
        );

        const error = modal.querySelector(
            '.lss-disabled-buildings-error'
        );

        loading.style.display = 'flex';
        list.style.display = 'none';
        empty.style.display = 'none';
        error.style.display = 'none';

        try {
            const buildings = await loadBuildings();

            disabledBuildings = buildings
                .filter(building =>
                        building.enabled === false &&
                        getBuildingType(building)
                       )
                .sort((a, b) =>
                      String(a.caption || '').localeCompare(
                String(b.caption || ''),
                'de',
                {
                    sensitivity: 'base'
                }
            )
                     );

            loading.style.display = 'none';

            buildFilterButtons();

            if (disabledBuildings.length === 0) {
                empty.style.display = 'flex';
                updateFooter();
                updateButtonCount();
                return;
            }

            list.style.display = 'flex';

            renderBuildings();
            updateButtonCount();

        } catch (errorObject) {
            console.error(
                '[LSS] Wachen reaktivieren:',
                errorObject
            );

            loading.style.display = 'none';
            error.style.display = 'flex';

            modal.querySelector(
                '.lss-disabled-buildings-error-text'
            ).textContent =
                errorObject.message ||
                'Unbekannter Fehler.';
        }
    }

    function buildFilterButtons() {
        const modal = document.getElementById(MODAL_ID);

        if (!modal) {
            return;
        }

        const container = modal.querySelector(
            '.lss-disabled-buildings-filters'
        );

        container.innerHTML = '';

        const counts = {};

        disabledBuildings.forEach(building => {
            const type = getBuildingType(building);

            if (!type) {
                return;
            }

            counts[type.category] =
                (counts[type.category] || 0) + 1;
        });

        const allButton = createFilterButton(
            'all',
            `Alle (${disabledBuildings.length})`,
            'glyphicon-list'
        );

        container.appendChild(allButton);

        Object.entries(CATEGORIES)
            .sort(([, a], [, b]) => a.order - b.order)
            .forEach(([key, category]) => {
            if (!counts[key]) {
                return;
            }

            container.appendChild(
                createFilterButton(
                    key,
                    `${category.name} (${counts[key]})`,
                    category.icon
                )
            );
        });
    }

    function createFilterButton(key, label, icon) {
        const button = document.createElement('button');

        button.type = 'button';

        button.className =
            'btn btn-default btn-sm lss-disabled-filter';

        if (key === activeFilter) {
            button.classList.add('active');
        }

        button.dataset.filter = key;

        button.innerHTML = `
            <span class="glyphicon ${icon}"></span>
            ${escapeHtml(label)}
        `;

        button.addEventListener('click', () => {
            activeFilter = key;

            document.querySelectorAll(
                '.lss-disabled-filter'
            ).forEach(filterButton => {
                filterButton.classList.toggle(
                    'active',
                    filterButton.dataset.filter === key
                );
            });

            const searchInput = document.querySelector(
                '.lss-disabled-buildings-search-input'
            );

            renderBuildings(
                searchInput?.value || ''
            );
        });

        return button;
    }

    function renderBuildings(searchTerm = '') {
        const modal = document.getElementById(MODAL_ID);

        if (!modal) {
            return;
        }

        const list = modal.querySelector(
            '.lss-disabled-buildings-list'
        );

        const search = searchTerm
        .trim()
        .toLocaleLowerCase('de');

        const filteredBuildings = disabledBuildings.filter(
            building => {
                const type = getBuildingType(building);

                if (!type) {
                    return false;
                }

                if (
                    activeFilter !== 'all' &&
                    type.category !== activeFilter
                ) {
                    return false;
                }

                if (!search) {
                    return true;
                }

                const caption = String(
                    building.caption || ''
                ).toLocaleLowerCase('de');

                const typeName = String(
                    getTypeName(building) || ''
                ).toLocaleLowerCase('de');

                return (
                    caption.includes(search) ||
                    typeName.includes(search)
                );
            }
        );

        list.innerHTML = '';

        if (filteredBuildings.length === 0) {
            list.style.display = 'block';

            list.innerHTML = `
                <div class="lss-disabled-buildings-no-results">
                    <span class="glyphicon glyphicon-search"></span>
                    <span>Keine passende Wache gefunden.</span>
                </div>
            `;

            updateFooter(0);
            return;
        }

        list.style.display = 'flex';

        const groups = groupBuildings(
            filteredBuildings
        );

        Object.values(groups)
            .sort((a, b) => {
            if (a.categoryOrder !== b.categoryOrder) {
                return a.categoryOrder - b.categoryOrder;
            }

            return a.typeName.localeCompare(
                b.typeName,
                'de',
                {
                    sensitivity: 'base'
                }
            );
        })
            .forEach(group => {
            list.appendChild(
                createBuildingGroup(group)
            );
        });

        updateFooter(filteredBuildings.length);
    }

    function groupBuildings(buildings) {
        const groups = {};

        buildings.forEach(building => {
            const type = getBuildingType(building);

            if (!type) {
                return;
            }

            const typeName = getTypeName(building);

            const key =
                  `${type.category}_${building.building_type}_${type.small}`;

            if (!groups[key]) {
                groups[key] = {
                    category: type.category,
                    categoryName: CATEGORIES[type.category].name,
                    categoryIcon: CATEGORIES[type.category].icon,
                    categoryOrder: CATEGORIES[type.category].order,
                    typeName,
                    typeIcon: type.icon,
                    buildings: []
                };
            }

            groups[key].buildings.push(building);
        });

        return groups;
    }

    function createBuildingGroup(group) {
        const wrapper = document.createElement('div');

        wrapper.className =
            'lss-disabled-building-group';

        const header = document.createElement('div');

        header.className =
            'lss-disabled-building-group-header';

        header.innerHTML = `
            <div class="lss-disabled-building-group-title">

                <div class="lss-disabled-building-type-icon">
                    <span class="glyphicon ${group.typeIcon}"></span>
                </div>

                <div>
                    <strong>${escapeHtml(group.typeName)}</strong>

                    <span>
                        ${group.buildings.length}
                        ${group.buildings.length === 1 ? 'Wache' : 'Wachen'}
                    </span>
                </div>
            </div>

            <button type="button"
                    class="btn btn-default btn-xs lss-activate-group">
                <span class="glyphicon glyphicon-ok"></span>
                Alle aktivieren
            </button>
        `;

        const list = document.createElement('div');

        list.className =
            'lss-disabled-building-group-list';

        group.buildings.forEach(building => {
            list.appendChild(
                createBuildingRow(building)
            );
        });

        const groupButton = header.querySelector(
            '.lss-activate-group'
        );

        groupButton.addEventListener(
            'click',
            () => activateGroup(
                group.buildings,
                groupButton,
                list
            )
        );

        wrapper.appendChild(header);
        wrapper.appendChild(list);

        return wrapper;
    }

    function createBuildingRow(building) {
        const row = document.createElement('div');

        row.className =
            'lss-disabled-building-row';

        row.dataset.id = building.id;

        row.innerHTML = `
            <div class="lss-disabled-building-info">

                <div class="lss-disabled-building-icon">
                    <span class="glyphicon glyphicon-home"></span>
                </div>

                <div class="lss-disabled-building-name">
                    <strong>
                        ${escapeHtml(
            building.caption ||
            'Unbekannte Wache'
        )}
                    </strong>

                    <span>
                        Wache #${building.id}
                    </span>
                </div>

            </div>

            <button type="button"
                    class="btn btn-success lss-disabled-building-activate">
                <span class="glyphicon glyphicon-ok"></span>
                Aktivieren
            </button>
        `;

        const button = row.querySelector(
            '.lss-disabled-building-activate'
        );

        button.addEventListener(
            'click',
            () => handleActivation(
                building,
                row,
                button
            )
        );

        return row;
    }

    async function activateGroup(
    buildings,
     groupButton,
     list
    ) {
        if (groupButton.disabled) {
            return;
        }

        groupButton.disabled = true;

        groupButton.innerHTML = `
            <span class="glyphicon glyphicon-refresh lss-spin"></span>
            Aktiviere...
        `;

        const buttons = list.querySelectorAll(
            '.lss-disabled-building-activate'
        );

        buttons.forEach(button => {
            button.disabled = true;
        });

        for (const building of buildings) {
            const row = list.querySelector(
                `[data-id="${building.id}"]`
            );

            const button = row?.querySelector(
                '.lss-disabled-building-activate'
            );

            if (!row || !button) {
                continue;
            }

            try {
                await activateBuilding(building.id);

                removeBuildingFromState(
                    building.id
                );

                row.classList.add(
                    'is-activated'
                );

                button.classList.remove(
                    'btn-success'
                );

                button.classList.add(
                    'btn-default'
                );

                button.innerHTML = `
                    <span class="glyphicon glyphicon-ok"></span>
                    Aktiviert
                `;

                setTimeout(() => {
                    row.remove();
                }, 250);

            } catch (error) {
                console.error(
                    '[LSS] Aktivierung fehlgeschlagen:',
                    building.id,
                    error
                );

                button.disabled = false;
                button.classList.remove(
                    'btn-success'
                );

                button.classList.add(
                    'btn-danger'
                );

                button.innerHTML = `
                    <span class="glyphicon glyphicon-warning-sign"></span>
                    Fehler
                `;
            }
        }

        groupButton.innerHTML = `
            <span class="glyphicon glyphicon-ok"></span>
            Aktiviert
        `;

        updateButtonCount();
        updateFooter();

        setTimeout(() => {
            renderBuildings(
                document.querySelector(
                    '.lss-disabled-buildings-search-input'
                )?.value || ''
            );
        }, 350);
    }

    async function handleActivation(
    building,
     row,
     button
    ) {
        if (button.disabled) {
            return;
        }

        button.disabled = true;

        button.classList.remove(
            'btn-success'
        );

        button.classList.add(
            'btn-default'
        );

        button.innerHTML = `
            <span class="glyphicon glyphicon-refresh lss-spin"></span>
            Aktiviere...
        `;

        try {
            await activateBuilding(
                building.id
            );

            removeBuildingFromState(
                building.id
            );

            row.classList.add(
                'is-activated'
            );

            button.classList.remove(
                'btn-default'
            );

            button.classList.add(
                'btn-success'
            );

            button.innerHTML = `
                <span class="glyphicon glyphicon-ok"></span>
                Aktiviert
            `;

            updateButtonCount();
            updateFooter();

            setTimeout(() => {
                renderBuildings(
                    document.querySelector(
                        '.lss-disabled-buildings-search-input'
                    )?.value || ''
                );
            }, 350);

        } catch (error) {
            console.error(
                '[LSS] Aktivierung fehlgeschlagen:',
                error
            );

            button.disabled = false;

            button.classList.remove(
                'btn-default'
            );

            button.classList.add(
                'btn-danger'
            );

            button.innerHTML = `
                <span class="glyphicon glyphicon-warning-sign"></span>
                Fehler
            `;

            setTimeout(() => {
                if (!button.isConnected) {
                    return;
                }

                button.classList.remove(
                    'btn-danger'
                );

                button.classList.add(
                    'btn-success'
                );

                button.innerHTML = `
                    <span class="glyphicon glyphicon-ok"></span>
                    Erneut versuchen
                `;
            }, 1800);
        }
    }

    function removeBuildingFromState(id) {
        disabledBuildings =
            disabledBuildings.filter(
            building => building.id !== id
        );
    }

    function updateFooter(count = disabledBuildings.length) {
        const footerInfo = document.querySelector(
            '.lss-disabled-buildings-footer-info'
        );

        if (!footerInfo) {
            return;
        }

        footerInfo.textContent =
            `${count} ${count === 1 ? 'Wache' : 'Wachen'} angezeigt`;
    }

    function escapeHtml(value) {
        const div = document.createElement('div');

        div.textContent = value;

        return div.innerHTML;
    }

    function applyStyles() {
        GM_addStyle(`
            #${MODAL_ID} {
                --lss-db-bg: #fff;
                --lss-db-header: #f7f7f7;
                --lss-db-text: #222;
                --lss-db-muted: #777;
                --lss-db-border: #ddd;
                --lss-db-row: #fff;
                --lss-db-row-hover: #f5f5f5;
                --lss-db-input-bg: #fff;
                --lss-db-input-border: #ccc;

                position: fixed;
                inset: 0;
                z-index: 100000;

                display: flex;
                align-items: center;
                justify-content: center;

                padding: 20px;

                opacity: 0;
                pointer-events: none;

                transition: opacity .18s ease;
            }

            body.dark #${MODAL_ID} {
                --lss-db-bg: #202124;
                --lss-db-header: #292a2d;
                --lss-db-text: #eee;
                --lss-db-muted: #aaa;
                --lss-db-border: #414247;
                --lss-db-row: #292a2d;
                --lss-db-row-hover: #323338;
                --lss-db-input-bg: #1b1c1f;
                --lss-db-input-border: #4a4b50;
            }

            #${MODAL_ID}.is-visible {
                opacity: 1;
                pointer-events: auto;
            }

            .lss-disabled-buildings-backdrop {
                position: absolute;
                inset: 0;

                background: rgba(0, 0, 0, .68);

                backdrop-filter: blur(2px);
            }

            .lss-disabled-buildings-dialog {
                position: relative;

                width: min(900px, 100%);
                max-height: min(
                    850px,
                    calc(100vh - 40px)
                );

                display: flex;
                flex-direction: column;

                overflow: hidden;

                border-radius: 10px;

                background: var(--lss-db-bg);
                color: var(--lss-db-text);

                border: 1px solid var(--lss-db-border);

                box-shadow:
                    0 20px 60px rgba(0, 0, 0, .4);

                transform:
                    translateY(12px)
                    scale(.98);

                transition:
                    transform .18s ease;
            }

            #${MODAL_ID}.is-visible
            .lss-disabled-buildings-dialog {
                transform:
                    translateY(0)
                    scale(1);
            }

            .lss-disabled-buildings-header {
                display: flex;
                align-items: center;
                justify-content: space-between;

                gap: 15px;

                padding: 18px 20px;

                border-bottom:
                    1px solid var(--lss-db-border);

                background:
                    var(--lss-db-header);
            }

            .lss-disabled-buildings-title {
                font-size: 19px;
                font-weight: 600;
            }

            .lss-disabled-buildings-title
            .glyphicon {
                margin-right: 8px;
            }

            .lss-disabled-buildings-subtitle {
                margin-top: 4px;

                font-size: 12px;

                color:
                    var(--lss-db-muted);
            }

            .lss-disabled-buildings-close {
                width: 34px;
                height: 34px;

                padding: 0;

                border: 0;
                border-radius: 6px;

                background: transparent;
                color: inherit;

                opacity: .65;

                cursor: pointer;

                font-size: 16px;
            }

            .lss-disabled-buildings-close:hover {
                opacity: 1;

                background:
                    rgba(127, 127, 127, .15);
            }

            .lss-disabled-buildings-toolbar {
                display: flex;
                align-items: center;

                gap: 12px;

                padding: 12px 20px;

                border-bottom:
                    1px solid var(--lss-db-border);
            }

            .lss-disabled-buildings-filters {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;

                flex: 1;
            }

            .lss-disabled-filter {
                white-space: nowrap;
            }

            .lss-disabled-filter.active {
                background: #337ab7;
                border-color: #286090;
                color: #fff;
            }

            .lss-disabled-buildings-search {
                position: relative;

                width: 250px;
                max-width: 100%;
            }

            .lss-disabled-buildings-search
            > .glyphicon {
                position: absolute;

                left: 11px;
                top: 50%;

                transform:
                    translateY(-50%);

                opacity: .55;

                pointer-events: none;
            }

            .lss-disabled-buildings-search-input {
                width: 100%;
                height: 34px;

                padding:
                    6px 10px 6px 32px;

                border:
                    1px solid
                    var(--lss-db-input-border);

                border-radius: 6px;

                outline: none;

                background:
                    var(--lss-db-input-bg);

                color:
                    var(--lss-db-text);
            }

            .lss-disabled-buildings-search-input:focus {
                border-color: #337ab7;

                box-shadow:
                    0 0 0 2px
                    rgba(51, 122, 183, .18);
            }

            .lss-disabled-buildings-content {
                flex: 1;

                min-height: 0;

                overflow-y: auto;

                padding: 12px;
            }

            .lss-disabled-buildings-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .lss-disabled-building-group {
                overflow: hidden;

                border:
                    1px solid
                    var(--lss-db-border);

                border-radius: 8px;

                background:
                    var(--lss-db-row);
            }

            .lss-disabled-building-group-header {
                display: flex;
                align-items: center;
                justify-content: space-between;

                gap: 10px;

                padding: 10px 12px;

                border-bottom:
                    1px solid
                    var(--lss-db-border);

                background:
                    var(--lss-db-header);
            }

            .lss-disabled-building-group-title {
                display: flex;
                align-items: center;

                gap: 10px;

                min-width: 0;
            }

            .lss-disabled-building-group-title > div:last-child {
                display: flex;
                flex-direction: column;

                gap: 2px;
            }

            .lss-disabled-building-group-title
            strong {
                font-size: 14px;
            }

            .lss-disabled-building-group-title
            span:last-child {
                font-size: 11px;

                color:
                    var(--lss-db-muted);
            }

            .lss-disabled-building-type-icon {
                display: flex;
                align-items: center;
                justify-content: center;

                width: 34px;
                height: 34px;

                border-radius: 7px;

                background:
                    rgba(51, 122, 183, .12);

                color: #337ab7;
            }

            .lss-disabled-building-group-list {
                display: flex;
                flex-direction: column;
            }

            .lss-disabled-building-row {
                display: flex;
                align-items: center;
                justify-content: space-between;

                gap: 15px;

                padding: 9px 12px;

                background:
                    var(--lss-db-row);

                transition:
                    background .15s ease,
                    opacity .3s ease;
            }

            .lss-disabled-building-row +
            .lss-disabled-building-row {
                border-top:
                    1px solid
                    var(--lss-db-border);
            }

            .lss-disabled-building-row:hover {
                background:
                    var(--lss-db-row-hover);
            }

            .lss-disabled-building-row.is-activated {
                opacity: .45;
            }

            .lss-disabled-building-info {
                min-width: 0;

                display: flex;
                align-items: center;

                gap: 11px;
            }

            .lss-disabled-building-icon {
                flex: 0 0 32px;

                width: 32px;
                height: 32px;

                display: flex;
                align-items: center;
                justify-content: center;

                border-radius: 7px;

                background:
                    rgba(220, 53, 69, .12);

                color: #dc3545;
            }

            .lss-disabled-building-name {
                min-width: 0;

                display: flex;
                flex-direction: column;

                gap: 2px;
            }

            .lss-disabled-building-name strong {
                overflow: hidden;

                text-overflow: ellipsis;

                white-space: nowrap;
            }

            .lss-disabled-building-name span {
                font-size: 10px;

                color:
                    var(--lss-db-muted);
            }

            .lss-disabled-building-activate {
                flex: 0 0 auto;

                min-width: 105px;
            }

            .lss-disabled-buildings-loading,
            .lss-disabled-buildings-empty,
            .lss-disabled-buildings-error {
                min-height: 180px;

                display: flex;

                align-items: center;
                justify-content: center;

                flex-direction: column;

                gap: 8px;

                text-align: center;

                color:
                    var(--lss-db-muted);
            }

            .lss-disabled-buildings-empty
            .glyphicon,
            .lss-disabled-buildings-error
            .glyphicon {
                font-size: 30px;

                margin-bottom: 5px;
            }

            .lss-disabled-buildings-empty
            .glyphicon {
                color: #28a745;
            }

            .lss-disabled-buildings-error
            .glyphicon {
                color: #dc3545;
            }

            .lss-disabled-buildings-error-text {
                max-width: 500px;

                font-size: 12px;
            }

            .lss-disabled-buildings-retry {
                margin-top: 8px;
            }

            .lss-disabled-buildings-no-results {
                padding: 40px 15px;

                text-align: center;

                color:
                    var(--lss-db-muted);
            }

            .lss-disabled-buildings-no-results
            .glyphicon {
                margin-right: 6px;
            }

            .lss-disabled-buildings-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;

                gap: 10px;

                padding: 12px 20px;

                border-top:
                    1px solid
                    var(--lss-db-border);

                background:
                    var(--lss-db-header);
            }

            .lss-disabled-buildings-footer-info {
                font-size: 11px;

                color:
                    var(--lss-db-muted);
            }

            .lss-spin {
                animation:
                    lss-disabled-buildings-spin
                    .8s linear infinite;
            }

            @keyframes lss-disabled-buildings-spin {
                from {
                    transform: rotate(0deg);
                }

                to {
                    transform: rotate(360deg);
                }
            }

            @media (max-width: 800px) {
                #${MODAL_ID} {
                    padding: 10px;
                }

                .lss-disabled-buildings-dialog {
                    max-height:
                        calc(100vh - 20px);
                }

                .lss-disabled-buildings-toolbar {
                    align-items: stretch;
                    flex-direction: column;
                }

                .lss-disabled-buildings-search {
                    width: 100%;
                }
            }

            @media (max-width: 600px) {
                .lss-disabled-buildings-header {
                    padding: 14px;
                }

                .lss-disabled-buildings-subtitle {
                    display: none;
                }

                .lss-disabled-building-group-header {
                    align-items: flex-start;
                    flex-direction: column;
                }

                .lss-activate-group {
                    width: 100%;
                }

                .lss-disabled-building-row {
                    align-items: flex-start;
                    flex-direction: column;
                }

                .lss-disabled-building-activate {
                    width: 100%;
                }

                .lss-disabled-buildings-footer {
                    padding: 10px 14px;
                }
            }
        `);
    }

    function init() {
        applyStyles();
        insertButton();
    }

    const observer = new MutationObserver(() => {
        if (document.querySelector('#building_panel_body')) {
            insertButton();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            init
        );
    } else {
        init();
    }

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
