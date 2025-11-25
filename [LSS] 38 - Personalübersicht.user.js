// ==UserScript==
// @name         [LSS] 38 - Personalübersicht
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Zeigt Wachen mit Personaldefiziten und unterbesetzte Fahrzeuge an
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ============================ DARK/LIGHT MODE DETECTION ============================
    function isDarkMode() {
        return document.body.classList.contains('dark') || document.body.classList.contains('bigMapDark');
    }

    function getColors() {
        const dark = isDarkMode();

        return dark
            ? {
            bg: 'var(--bs-body-bg, #1e1e1e)',
            text: 'var(--bs-body-color, #eee)',
            border: '#666',
            tableBorder: '#666',
            shadow: '0 6px 20px rgba(0,0,0,0.6)',
            diffPos: '#28a745',
            diffNeg: '#dc3545',
            diffZero: '#ffc107',
        }
        : {
            bg: 'var(--bs-body-bg, #ffffff)',
            text: 'var(--bs-body-color, #111)',
            border: '#ccc',
            tableBorder: '#ccc',
            shadow: '0 6px 20px rgba(0,0,0,0.3)',
            diffPos: '#1a7f1a',
            diffNeg: '#c33',
            diffZero: '#d97706',
        };
    }

    // ============================ MENÜ BUTTON ============================
    const MENU_SELECTORS = [
        '#menu_profile + ul.dropdown-menu',
    ];

    function createMenuButtonElement() {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.id = 'Personalübersicht';
        a.className = 'dropdown-item';
        a.innerHTML = '<span class="glyphicon glyphicon-user"></span>&nbsp;&nbsp; Personalübersicht';
        a.addEventListener('click', async (e) => {
            e.preventDefault();
            openModalAndLoad();
        });
        li.appendChild(a);
        return li;
    }

    function tryInsertButtonNow() {
        if (document.getElementById('Personalübersicht')) return true;

        for (const sel of MENU_SELECTORS) {
            const menus = document.querySelectorAll(sel);
            if (!menus.length) continue;

            for (const menu of menus) {
                try {
                    const divider = menu.querySelector('li.divider');
                    const btnLi = createMenuButtonElement();
                    if (divider) menu.insertBefore(btnLi, divider);
                    else menu.appendChild(btnLi);
                    return true;
                } catch (err) {
                    console.warn('[LSS Personalzuweiser] Fehler beim Einfügen in Menü', err);
                }
            }
        }
        return false;
    }

    (async () => {
        const inserted = tryInsertButtonNow();
        if (inserted) return;
        const observer = new MutationObserver((_, obs) => {
            if (tryInsertButtonNow()) obs.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 10000);
    })();

    // ============================ MODAL ERSTELLEN ============================
    function createModal() {
        const existing = document.getElementById('personalzuweiserModal');
        if (existing) return existing;

        const colors = getColors();

        const modal = document.createElement('div');
        modal.id = 'personalzuweiserModal';
        Object.assign(modal.style, {
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '2500px',
            maxHeight: '80vh',
            overflowY: 'auto',
            background: colors.bg,
            color: colors.text,
            zIndex: 20000,
            padding: '16px',
            border: `1px solid ${colors.border}`,
            boxShadow: colors.shadow,
            borderRadius: '10px',
            fontSize: '1.5rem', // ⬆️ leicht vergrößert (vorher 0.9em)
            lineHeight: '1.4',
        });

        modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h3 style="margin:0;font-size:2.0rem;">Personalübersicht</h3>
        <div style="display:flex;gap:8px;">
          <button id="pz-reload" class="btn btn-primary" style="padding:6px 10px;font-size:0.95em;">🔄 Aktualisieren</button>
          <button id="pz-close" class="btn btn-danger" style="padding:6px 10px;font-size:0.95em;">✖ Schließen</button>
        </div>
      </div>

      <div id="pz-description" style="
          margin-bottom:10px;
          font-size:0.95em;
          border-bottom:1px solid ${colors.tableBorder};
          padding-bottom:6px;
      ">
        Zeigt Wachen mit Personaldefiziten und unterbesetzte Fahrzeuge an.<br>
        Du kannst nach <strong>Leitstelle</strong> und/oder <strong>Wache</strong> filtern.
      </div>

      <!-- 🔹 Filterbereich -->
      <div id="pz-filters" style="
          display:flex;
          flex-wrap:wrap;
          align-items:center;
          gap:16px;
          margin-bottom:14px;
      ">
        <div style="display:flex;align-items:center;gap:6px;">
          <label for="filter-leitstelle" style="white-space:nowrap;font-weight:500;">Leitstelle(n):</label>
          <select id="filter-leitstelle" style="
              min-width:230px;
              padding:6px 8px;
              border:1px solid ${colors.tableBorder};
              border-radius:5px;
              background:${isDarkMode() ? '#222' : '#fff'};
              color:${colors.text};
              font-size:0.95em;
          ">
            <option value="">Alle Leitstellen</option>
          </select>
        </div>

        <div style="display:flex;align-items:center;gap:6px;">
          <label for="filter-wache" style="white-space:nowrap;font-weight:500;">Wache(n):</label>
          <select id="filter-wache" style="
              min-width:270px;
              padding:6px 8px;
              border:1px solid ${colors.tableBorder};
              border-radius:5px;
              background:${isDarkMode() ? '#222' : '#fff'};
              color:${colors.text};
              font-size:0.95em;
          ">
            <option value="">Alle Wachen</option>
          </select>
        </div>
      </div>

      <div id="pz-status" style="margin-bottom:10px;font-size:0.95em;">Bereit</div>

      <table id="pz-table" style="
          width:100%;
          border-collapse:collapse;
          border:1px solid ${colors.tableBorder};
          text-align:center;
          font-size:0.95em; /* ⬆️ etwas größer */
      ">
        <thead>
          <tr style="background:${isDarkMode() ? '#333' : '#f2f2f2'};">
            <th rowspan="2" style="border:1px solid ${colors.tableBorder};padding:8px;text-align:center;">Leitstelle</th>
            <th rowspan="2" style="border:1px solid ${colors.tableBorder};padding:8px;text-align:center;">Wache</th>
            <th colspan="4" style="border:1px solid ${colors.tableBorder};padding:8px;text-align:center;">Personal</th>
            <th rowspan="2" style="border:1px solid ${colors.tableBorder};padding:8px;text-align:center;">Fahrzeuge auf Wache</th>
          </tr>
          <tr style="background:${isDarkMode() ? '#333' : '#f2f2f2'};">
            <th style="border:1px solid ${colors.tableBorder};padding:6px;">Aktuell</th>
            <th style="border:1px solid ${colors.tableBorder};padding:6px;">Benötigt</th>
            <th style="border:1px solid ${colors.tableBorder};padding:6px;">Differenz</th>
            <th style="border:1px solid ${colors.tableBorder};padding:6px;">Max Wache</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;

        document.body.appendChild(modal);

        // 🔘 Button-Funktionen
        document.getElementById('pz-close').addEventListener('click', () => modal.remove());
        document.getElementById('pz-reload').addEventListener('click', () => {
            const status = document.getElementById('pz-status');
            status.textContent = 'Aktualisiere...';
            openModalAndLoad();
        });

        return modal;
    }

    // ============================ DATEN LADEN ============================
    async function fetchData() {
        const result = { buildings: [], vehicles: [], vehicleTypesArray: [] };
        const headers = { Accept: 'application/json' };

        const [bRes, vRes] = await Promise.all([fetch('/api/buildings', { headers }), fetch('/api/vehicles', { headers })]);
        result.buildings = await bRes.json();
        result.vehicles = await vRes.json();

        try {
            const tResp = await fetch('https://api.lss-manager.de/de_DE/vehicles');
            const typesJson = await tResp.json();
            let arr = [];
            if (Array.isArray(typesJson)) arr = typesJson;
            else arr = Object.entries(typesJson).map(([k, v]) => ({ id: Number(k), ...v }));
            arr.forEach((v) => {
                if (!v.staff) v.staff = { min: 0, max: 0 };
            });
            result.vehicleTypesArray = arr;
        } catch (e) {
            console.warn('[LSS Personalzuweiser] LSSM API nicht erreichbar, nutze Fallback');
        }

        return result;
    }

    async function openModalAndLoad() {
        const colors = getColors();
        const modal = createModal();
        const status = document.getElementById('pz-status');
        const tbody = document.querySelector('#pz-table tbody');
        const selectLeitstelle = document.getElementById('filter-leitstelle');
        const selectWache = document.getElementById('filter-wache');

        status.textContent = 'Lade Daten...';
        tbody.innerHTML = '';

        try {
            // 🔹 Daten laden
            const { buildings, vehicles, vehicleTypesArray } = await fetchData();
            const vtById = new Map(vehicleTypesArray.map(vt => [Number(vt.id), vt]));

            // 🔹 Leitstellen-Mapping
            const leitstellenMap = new Map();
            buildings.forEach(b => {
                if (b.building_type === 7) leitstellenMap.set(b.id, b.caption);
            });

            // 🔹 Relevante Wachen ermitteln
            const relevanteWachen = [];
            const fahrzeugDatenProWache = new Map();

            buildings.forEach(b => {
                if (b.building_type === 7) return;

                const fahrzeuge = vehicles.filter(v => v.building_id === b.id);
                if (!fahrzeuge.length) return;

                const fahrzeugArray = fahrzeuge.map(f => {
                    const vt = vtById.get(Number(f.vehicle_type));
                    const name = vt?.caption ?? f.caption?.split(' - ')[0] ?? 'Unbekannt';
                    const max = f.max_personnel_override ?? vt?.staff?.max ?? 1;
                    const aktuellAufFz = f.assigned_personnel_count ?? 0;
                    return { id: f.id, name, aktuellAufFz, max };
                });

                if (fahrzeugArray.some(f => f.aktuellAufFz < f.max)) {
                    relevanteWachen.push(b);
                    fahrzeugDatenProWache.set(b.id, fahrzeugArray);
                }
            });

            // 🔹 Filter füllen
            const relevanteLeitstellen = [...new Set(relevanteWachen.map(b => b.leitstelle_building_id).filter(Boolean))];

            selectLeitstelle.innerHTML = '<option value="">Alle Leitstellen</option>';
            relevanteLeitstellen
                .map(id => ({ id, name: leitstellenMap.get(id) || `(unbekannt #${id})` }))
                .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                .forEach(ls => {
                const opt = document.createElement('option');
                opt.value = ls.id;
                opt.textContent = ls.name;
                selectLeitstelle.appendChild(opt);
            });

            selectWache.innerHTML = '<option value="">Alle Wachen</option>';
            relevanteWachen
                .sort((a, b) => a.caption.localeCompare(b.caption, 'de'))
                .forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.caption;
                selectWache.appendChild(opt);
            });

            // 🔹 Tabelle rendern
            function renderTable() {
                tbody.innerHTML = '';

                const filterLST = selectLeitstelle.value;
                const filterWache = selectWache.value;

                relevanteWachen.forEach(b => {
                    if (filterWache && String(b.id) !== filterWache) return;
                    if (filterLST && String(b.leitstelle_building_id) !== filterLST) return;

                    const fahrzeugArray = fahrzeugDatenProWache.get(b.id) || [];
                    const aktuell = b.personal_count ?? 0;
                    const maxWache = b.personal_count_target ?? 0;
                    const benoetigt = fahrzeugArray.reduce((sum, f) => sum + f.max, 0);
                    const diff = aktuell - benoetigt;

                    const tr = document.createElement('tr');

                    // 🟣 Leitstelle
                    const tdLeit = document.createElement('td');
                    Object.assign(tdLeit.style, {
                        border: `1px solid ${colors.tableBorder}`,
                        padding: '6px',
                        textAlign: 'center'
                    });
                    tdLeit.textContent = b.leitstelle_building_id
                        ? leitstellenMap.get(b.leitstelle_building_id) || '(unbekannt)'
                    : '-';
                    tr.appendChild(tdLeit);

                    // 🟣 Wache
                    const tdWache = document.createElement('td');
                    Object.assign(tdWache.style, {
                        border: `1px solid ${colors.tableBorder}`,
                        padding: '6px',
                        textAlign: 'center'
                    });
                    tdWache.textContent = b.caption;
                    tr.appendChild(tdWache);

                    // 🟣 Personalzahlen
                    const personal = [
                        { value: aktuell, color: 'orange' },
                        { value: benoetigt, color: 'green' },
                        { value: diff, color: diff < 0 ? colors.diffNeg : colors.diffPos },
                        { value: maxWache, color: 'aqua' }
                    ];

                    personal.forEach(p => {
                        const td = document.createElement('td');
                        Object.assign(td.style, {
                            border: `1px solid ${colors.tableBorder}`,
                            padding: '6px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: p.color
                        });
                        td.textContent = p.value;
                        tr.appendChild(td);
                    });

                    // 🟣 Fahrzeug-Badges
                    const fahrzeugTd = document.createElement('td');
                    Object.assign(fahrzeugTd.style, {
                        border: `1px solid ${colors.tableBorder}`,
                        padding: '6px',
                        verticalAlign: 'middle'
                    });

                    const grid = document.createElement('div');
                    Object.assign(grid.style, {
                        display: 'inline-flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        justifyContent: 'center',
                    });

                    fahrzeugArray
                        .filter(f => f.aktuellAufFz < f.max)
                        .forEach(f => {
                        const link = document.createElement('a');
                        link.href = `https://www.leitstellenspiel.de/vehicles/${f.id}/zuweisung`;
                        link.target = '_blank';
                        link.style.textDecoration = 'none';

                        const span = document.createElement('span');
                        Object.assign(span.style, {
                            display: 'inline-flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '4px 6px',
                            border: `1px solid ${colors.tableBorder}`,
                            borderRadius: '4px',
                            background: isDarkMode() ? '#222' : '#f9f9f9',
                            color: colors.text,
                            whiteSpace: 'nowrap',
                            fontSize: '0.85em',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        });

                        span.addEventListener('mouseover', () => {
                            span.style.background = isDarkMode() ? '#333' : '#e6e6e6';
                        });
                        span.addEventListener('mouseout', () => {
                            span.style.background = isDarkMode() ? '#222' : '#f9f9f9';
                        });

                        span.innerHTML = `${f.name}&nbsp;`;

                        const numberSpan = document.createElement('span');
                        numberSpan.textContent = `(${f.aktuellAufFz}/${f.max})`;
                        numberSpan.style.fontWeight = 'bold';
                        numberSpan.style.color = f.aktuellAufFz === 0 ? '#dc3545' : '#fd7e14';

                        span.appendChild(numberSpan);
                        link.appendChild(span);
                        grid.appendChild(link);
                    });

                    fahrzeugTd.appendChild(grid);
                    tr.appendChild(fahrzeugTd);

                    tbody.appendChild(tr);
                });
            }

            // Beim Laden + bei Filteränderung neu rendern
            renderTable();
            selectLeitstelle.addEventListener('change', renderTable);
            selectWache.addEventListener('change', renderTable);

            status.textContent = 'Fertig geladen.';
        } catch (err) {
            console.error(err);
            status.textContent = 'Fehler beim Laden der Daten.';
        }
    }
})();
