// ==UserScript==
// @name         [LSS] Personalübersicht
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
    console.info('[LSS Personalzuweiser] Script gestartet');

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
        '#menu_profile + ul',
        'ul.dropdown-menu',
        '.dropdown-menu',
        '#menu_profile',
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
            console.info('[LSS Personalzuweiser] Button geklickt');
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
                    console.info('[LSS Personalzuweiser] Button ins Dropdown eingefügt');
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
        console.info('[LSS Personalzuweiser] Menü noch nicht vorhanden — starte Observer');
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
            padding: '12px',
            border: `1px solid ${colors.border}`,
            boxShadow: colors.shadow,
            borderRadius: '8px',
        });

        modal.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
    <h3 style="margin:0;">Personalzuweiser</h3>
    <button id="pz-close" class="btn btn-danger">✖</button>
  </div>
  <div id="pz-description" style="
      margin-bottom:8px;
      font-size:0.9em;
      color:${colors.text};
      border-bottom:1px solid ${colors.tableBorder};
      padding-bottom:4px;
  ">
    Hier siehst du alle Wachen mit Personaldefiziten sowie die Fahrzeuge und deren aktuelle Personalbesetzung.
  </div>
  <div id="pz-status" style="margin-bottom:8px;font-size:0.9em;color:${colors.text};">Bereit</div>
  <table id="pz-table" style="width:100%;border-collapse:collapse;border:1px solid ${colors.tableBorder};text-align:center;">
    <thead>
      <tr style="background:${isDarkMode() ? '#333' : '#f2f2f2'};">
        <th rowspan="2" style="border:1px solid ${colors.tableBorder};padding:6px;text-align:center;">Wache</th>
        <th colspan="4" style="border:1px solid ${colors.tableBorder};padding:6px;text-align:center;">Personal</th>
        <th rowspan="2" style="border:1px solid ${colors.tableBorder};padding:6px;text-align:center;">Fahrzeuge auf Wache</th>
      </tr>
      <tr style="background:${isDarkMode() ? '#333' : '#f2f2f2'};">
        <th style="border:1px solid ${colors.tableBorder};padding:6px;text-align:center;">Aktuell</th>
        <th style="border:1px solid ${colors.tableBorder};padding:6px;text-align:center;">Benötigt</th>
        <th style="border:1px solid ${colors.tableBorder};padding:6px;text-align:center;">Differenz</th>
        <th style="border:1px solid ${colors.tableBorder};padding:6px;text-align:center;">Max Wache</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
`;

        document.body.appendChild(modal);
        document.getElementById('pz-close').addEventListener('click', () => modal.remove());
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
        status.textContent = 'Lade Daten...';
        tbody.innerHTML = '';

        try {
            const { buildings, vehicles, vehicleTypesArray } = await fetchData();
            const vtById = new Map(vehicleTypesArray.map((vt) => [Number(vt.id), vt]));

            for (const b of buildings) {
                const aktuell = b.personal_count ?? 0;
                const maxWache = b.personal_count_target ?? 0;
                const fahrzeuge = vehicles.filter((v) => v.building_id === b.id);
                if (!fahrzeuge.length) continue;

                let benoetigt = 0;

                for (const v of fahrzeuge) {
                    const vt = vtById.get(Number(v.vehicle_type));
                    const max = v.max_personnel_override ?? vt?.staff?.max ?? 0;
                    benoetigt += max;
                }

                const diff = aktuell - benoetigt;
                if (diff >= 0) continue; // Nur Wachen mit Defizit anzeigen

                const tr = document.createElement('tr');

                // Wache
                const wacheTd = document.createElement('td');
                Object.assign(wacheTd.style, { border: `1px solid ${colors.tableBorder}`, padding: '6px', textAlign: 'center' });
                wacheTd.textContent = b.caption;
                tr.appendChild(wacheTd);

                // Personal-Spalten
                const createPersonalTd = (text, color) => {
                    const td = document.createElement('td');
                    Object.assign(td.style, { border: `1px solid ${colors.tableBorder}`, padding: '6px', textAlign: 'center', fontWeight: 'bold', color });
                    td.textContent = text;
                    return td;
                };
                tr.appendChild(createPersonalTd(aktuell, 'orange'));
                tr.appendChild(createPersonalTd(benoetigt, 'green'));
                tr.appendChild(createPersonalTd(diff, colors.diffNeg));
                tr.appendChild(createPersonalTd(maxWache, 'aqua'));

                // Fahrzeuge
                const fahrzeugTd = document.createElement('td');
                Object.assign(fahrzeugTd.style, {
                    border: `1px solid ${colors.tableBorder}`,
                    padding: '6px',
                    verticalAlign: 'middle',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                });

                const maxPerRow = 8;

                // Array mit Fahrzeugen inkl. aktueller Besetzung
                const fahrzeugArray = fahrzeuge.map(f => {
                    const vt = vtById.get(Number(f.vehicle_type));
                    const name = vt?.caption ?? f.caption?.split(' - ')[0] ?? 'Unbekannt';
                    const max = vt?.staff?.max ?? 1;
                    const aktuellAufFz = f.assigned_personnel_count ?? 0;
                    return { name, aktuellAufFz, max };
                }).filter(f => f.aktuellAufFz < f.max); // nur Fahrzeuge mit Defizit

                for (let i = 0; i < fahrzeugArray.length; i += maxPerRow) {
                    const rowDiv = document.createElement('div');
                    Object.assign(rowDiv.style, {
                        display: 'flex',
                        gap: '4px',
                        justifyContent: 'center',
                        flexWrap: 'nowrap',
                        marginBottom: '2px'
                    });

                    fahrzeugArray.slice(i, i + maxPerRow).forEach(f => {
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
                        });

                        // Fahrzeugname
                        span.innerHTML = `${f.name}&nbsp;`;

                        // Aktuelle Personen / Max farbig
                        const numberSpan = document.createElement('span');
                        numberSpan.textContent = `(${f.aktuellAufFz}/${f.max})`;
                        numberSpan.style.fontWeight = 'bold';
                        numberSpan.style.color = f.aktuellAufFz === 0 ? '#dc3545' : '#fd7e14';

                        span.appendChild(numberSpan);
                        rowDiv.appendChild(span);
                    });

                    if (rowDiv.childElementCount > 0) fahrzeugTd.appendChild(rowDiv);
                }

                tr.appendChild(fahrzeugTd);
                tbody.appendChild(tr);
            }

            status.textContent = 'Fertig';
        } catch (err) {
            status.textContent = 'Fehler beim Laden';
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="6" style="color:${colors.diffNeg};border:1px solid ${colors.tableBorder};padding:6px;">Fehler beim Laden der Daten</td></tr>`;
        }
    }

})();
