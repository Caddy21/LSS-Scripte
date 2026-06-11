// ==UserScript==
// @name         [LSS] Spezialgebietsfilter
// @version      1.0
// @description  Blendet auf der Spezialgebietseite alle Wachen bis auf Autobahnpolizei, Seenotrettung und Bergwacht aus.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/buildings/*/set_mission_spawn_area*
// @match        https://polizei.leitstellenspiel.de/buildings/*/set_mission_spawn_area*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const DEBUG = false;

    let currentFilter = 'all';

    function log(...args) {
        if (DEBUG) {
            console.info('[LSS Spezialfilter]', ...args);
        }
    }

    function shouldKeep(src) {

        switch (currentFilter) {

            case 'highway':
                return src.includes('building_highway_police'); // Bei eigenen Grafiken hier die src anpassen!

            case 'coastal':
                return src.includes('building_coastal_rescue'); // Bei eigenen Grafiken hier die src anpassen!

            case 'mountain':
                return src.includes('building_mountain_rescue'); // Bei eigenen Grafiken hier die src anpassen!

            case 'all':
            default:
                return (
                    src.includes('building_highway_police') || // Bei eigenen Grafiken hier die src anpassen!
                    src.includes('building_coastal_rescue') || // Bei eigenen Grafiken hier die src anpassen!
                    src.includes('building_mountain_rescue') // Bei eigenen Grafiken hier die src anpassen!
                );
        }
    }

    function filterMarkers() {

        let total = 0;
        let visible = 0;

        document.querySelectorAll('.leaflet-marker-pane').forEach(pane => {

            pane.querySelectorAll('img').forEach(img => {

                total++;

                const src = img.src || '';
                const isControlMarker =
                      src.includes('/leaflet/images/marker-icon.png');

                const keep = isControlMarker || shouldKeep(src);

                img.style.display = keep ? '' : 'none';
                if (keep) {
                    visible++;
                }
            });

        });

        log(`Filter: ${currentFilter} | Marker: ${total} | sichtbar: ${visible}`);
    }

    function createFilterUI() {

        // 🧹 alte UI entfernen
        document.getElementById('lss-special-filter')?.remove();
        document.getElementById('lss-special-filter-inline')?.remove();

        const heading = document.querySelector('.panel-heading');
        if (!heading) return;

        heading.style.display = 'flex';
        heading.style.alignItems = 'center';

        const isDarkMode =
              document.body.classList.contains('dark') ||
              document.body.classList.contains('bigMapDark');

        const container = document.createElement('div');
        container.id = 'lss-special-filter-inline';

        Object.assign(container.style, {
            display: 'inline-flex',
            gap: '6px',
            marginLeft: '10px',
            alignItems: 'center'
        });

        const filters = [
            { key: 'all', label: 'Alle Spezialgebiets-Wachen' },
            { key: 'highway', label: '🚔 Autobahnpolizei' },
            { key: 'coastal', label: '🚤 Seenotrettung' },
            { key: 'mountain', label: '⛰️ Bergwacht' }
        ];

        function styleBtn(btn) {
            Object.assign(btn.style, {
                padding: '4px 8px',
                fontSize: '12px',
                borderRadius: '6px',
                cursor: 'pointer',
                border: isDarkMode ? '1px solid #444' : '1px solid #ccc',
                background: isDarkMode ? '#2a2a2a' : '#fff',
                color: isDarkMode ? '#e6e6e6' : '#000',
                textAlign: 'left'
            });
        }

        filters.forEach(f => {

            const btn = document.createElement('button');
            btn.textContent = f.label;
            btn.dataset.filter = f.key;

            styleBtn(btn);

            btn.addEventListener('click', () => {

                currentFilter = f.key;
                filterMarkers();

                container.querySelectorAll('button').forEach(b => {
                    const active = b.dataset.filter === currentFilter;

                    b.dataset.active = active ? '1' : '';

                    b.style.background = active
                        ? '#4caf50'
                    : (isDarkMode ? '#2a2a2a' : '#fff');

                    b.style.color = active
                        ? '#fff'
                    : (isDarkMode ? '#e6e6e6' : '#000');
                });

                log('Neuer Filter:', currentFilter);
            });

            container.appendChild(btn);
        });

        heading.appendChild(container);

        container.querySelector('[data-filter="all"]').click();
    }

    const observedPanes = new WeakSet();

    function observePanes() {

        document.querySelectorAll('.leaflet-marker-pane').forEach(pane => {

            if (observedPanes.has(pane)) {
                return;
            }

            observedPanes.add(pane);

            log('Observer an neue Map gehängt');

            new MutationObserver(() => {
                filterMarkers();
            }).observe(pane, {
                childList: true,
                subtree: true
            });
        });
    }

    createFilterUI();

    setInterval(() => {
        observePanes();
        filterMarkers();
    }, 1000);

})();
