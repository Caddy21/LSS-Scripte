// ==UserScript==
// @name         [LSS] Waldbrand
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Kennzeichnet Einsätze mit Wald- und Vegetationsbrandvarianten
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @grant        GM_xmlhttpRequest
// @connect      leitstellenspiel.de
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const DEBUG = false;
    const CONFIG = {
        apiUrl: 'https://www.leitstellenspiel.de/einsaetze.json',
        cacheKey: 'lss-waldbrand-missions-v2',
        cacheDuration: 24 * 60 * 60 * 1000,
        checkInterval: 20 * 1000,
        listIds: ['mission_list', 'mission_list_alliance', 'mission_list_alliance_event'],
        markerClass: 'lss-wald-mission-label'
    };
    const listObservers = new Map();
    let forestMissions = new Set();
    let lastDetailDebug = '';

    function log(...args) {
        if (DEBUG) console.log('[LSS Waldbrand]', ...args);
    }

    function warn(...args) {
        console.warn('[LSS Waldbrand]', ...args);
    }

    function addStyles() {
        if (document.getElementById('lss-waldbrand-styles')) return;
        const style = document.createElement('style');
        style.id = 'lss-waldbrand-styles';
        style.textContent = `
            .${CONFIG.highlightClass} {
                background: #8b0000 !important;
                border: 2px solid #ff4444 !important;
                border-radius: 4px;
            }
            .${CONFIG.highlightClass} .panel,
            .${CONFIG.highlightClass} .panel-heading,
            .${CONFIG.highlightClass} .panel-body {
                background: #8b0000 !important;
                color: #ffffff !important;
                border-color: #ff4444 !important;
            }
            .${CONFIG.highlightClass} a {
                color: #ffffff !important;
            }
            .${CONFIG.highlightClass} .text-muted {
                color: #eeeeee !important;
            }
        `;
        document.head.appendChild(style);
        log('CSS für Waldbrand-Kennzeichnung eingefügt.');
    }

    function loadCache() {
        try {
            const cached = localStorage.getItem(CONFIG.cacheKey);
            if (!cached) {
                log('Kein Cache vorhanden.');
                return null;
            }

            const data = JSON.parse(cached);
            if (!Array.isArray(data.missions)) {
                warn('Cache enthält keine gültige Einsatz-Map.');
                return null;
            }

            log('Cache geladen:', data.missions.length, 'Varianten.', 'Alter:', Math.round((Date.now() - data.timestamp) / 60000), 'Minuten.');
            return data;
        } catch (error) {
            warn('Cache konnte nicht gelesen werden:', error);
            return null;
        }
    }

    function saveCache(missions) {
        try {
            localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ timestamp: Date.now(), missions: [...missions] }));
            log('Cache gespeichert:', missions.size, 'Varianten.');
        } catch (error) {
            warn('Cache konnte nicht gespeichert werden:', error);
        }
    }

    function buildMissionMap(data) {
        const result = new Set();
        const entries = Array.isArray(data) ? data : Object.values(data);
        let checked = 0;
        let matched = 0;

        log('API-Datenauswertung gestartet.');
        log('Anzahl API-Einträge:', entries.length);

        for (const mission of entries) {
            if (!mission || typeof mission !== 'object') continue;
            checked++;

            const requirements = mission.requirements || {};
            const brushTruck = Number(requirements.brush_truck ?? mission.brush_truck ?? 0);
            const wildfireEquipment = Number(requirements.wildfire_equipment ?? mission.wildfire_equipment ?? 0);
            if (brushTruck <= 0 && wildfireEquipment <= 0) continue;

            matched++;

            const missionId = String(mission.id ?? '');
            const baseId = mission.base_mission_id !== undefined ? String(mission.base_mission_id) : '';
            const overlay = String(mission.additive_overlays || '');

            if (missionId) result.add(missionId);
            if (baseId) result.add(overlay ? `${baseId}/${overlay}` : baseId);

            log('Waldbrand-Einsatz erkannt:', {
                id: missionId,
                baseId,
                overlay,
                name: mission.name,
                brushTruck,
                wildfireEquipment,
                gespeicherteVarianten: [missionId, baseId ? (overlay ? `${baseId}/${overlay}` : baseId) : null].filter(Boolean)
            });
        }

        log('API-Auswertung abgeschlossen:', {
            geprüft: checked,
            waldbrandEinträge: matched,
            gespeicherteVarianten: result.size
        });
        log('Gesamte Waldbrand-Map:', [...result]);

        return result;
    }

    function requestMissions() {
        return new Promise((resolve, reject) => {
            log('API-Anfrage:', CONFIG.apiUrl);

            GM_xmlhttpRequest({
                method: 'GET',
                url: CONFIG.apiUrl,
                responseType: 'json',
                timeout: 30000,
                onload(response) {
                    log('API-Antwort:', response.status);
                    if (response.status !== 200 || !response.response) {
                        reject(new Error(`HTTP-Fehler: ${response.status}`));
                        return;
                    }
                    resolve(response.response);
                },
                onerror(error) {
                    reject(new Error('API konnte nicht erreicht werden.'));
                },
                ontimeout() {
                    reject(new Error('API-Anfrage abgelaufen.'));
                }
            });
        });
    }

    async function updateMissionData() {
        const cached = loadCache();

        if (cached) {
            forestMissions = new Set(cached.missions);
            log('Waldbrand-Map aus Cache übernommen.');
            updateAllLists();
        }

        const cacheExpired = !cached || !cached.timestamp || Date.now() - cached.timestamp >= CONFIG.cacheDuration;
        if (!cacheExpired) {
            log('Cache ist aktuell. Kein API-Abruf notwendig.');
            return;
        }

        log('Cache abgelaufen. Lade Einsatzdefinitionen ...');

        try {
            const data = await requestMissions();
            const missions = buildMissionMap(data);
            forestMissions = missions;
            saveCache(missions);
            log('API erfolgreich verarbeitet:', missions.size, 'Varianten.');
            updateAllLists();
        } catch (error) {
            warn('API-Fehler:', error);
            if (!cached) {
                warn('Keine gespeicherten Einsatzdaten vorhanden.');
            } else {
                log('Verwende weiterhin den letzten erfolgreichen Cache.');
            }
        }
    }

    function getVariantId(element) {
        const missionId = element.getAttribute('mission_type_id');
        if (!missionId) return null;

        const overlay = element.getAttribute('data-additive-overlays') || '';
        return overlay ? `${missionId}/${overlay}` : missionId;
    }

    function updateMissionDetail() {
        const info = document.getElementById('mission_general_info');
        const heading = document.getElementById('missionH1');

        if (!info || !heading) {
            const missing = [!info ? 'mission_general_info fehlt' : '', !heading ? 'missionH1 fehlt' : ''].filter(Boolean).join(', ');
            if (lastDetailDebug !== missing) {
                log('Detailseite nicht vollständig gefunden:', missing);
                lastDetailDebug = missing;
            }
            return;
        }

        const missionId = info.getAttribute('data-mission-type');
        const overlay = info.getAttribute('data-additive-overlays') || '';

        if (!missionId) {
            if (lastDetailDebug !== 'mission-type-fehlt') {
                log('Detailseite gefunden, aber data-mission-type fehlt.');
                lastDetailDebug = 'mission-type-fehlt';
            }
            return;
        }

        const variantId = overlay ? `${missionId}/${overlay}` : missionId;
        const isForestMission = forestMissions.has(variantId);
        const existingMarker = heading.querySelector(`.${CONFIG.markerClass}`);
        const debugKey = `${variantId}:${isForestMission}`;

        if (lastDetailDebug !== debugKey) {
            log('Detailseite geprüft:', {
                missionId,
                overlay,
                variantId,
                inWaldbrandMap: isForestMission,
                mapEintraege: forestMissions.size
            });
            if (!isForestMission) log('Variante nicht in Waldbrand-Map gefunden:', variantId);
            lastDetailDebug = debugKey;
        }

        if (isForestMission && !existingMarker) {
            const marker = document.createElement('span');
            marker.className = CONFIG.markerClass;
            marker.innerHTML = ' <strong style="color: #ff4444;">(Wald &amp; Vegetation)</strong>';

            const helper = heading.querySelector('#mission-type-helper-mobile');
            heading.insertBefore(marker, helper || null);
            log('Detailseite erfolgreich gekennzeichnet:', variantId);
        }

        if (!isForestMission && existingMarker) {
            existingMarker.remove();
            log('Detailseiten-Kennzeichnung entfernt:', variantId);
        }
    }

    function updateMission(element) {
        const variantId = getVariantId(element);
        if (!variantId) {
            log('Einsatz ohne mission_type_id gefunden:', element);
            return;
        }

        const isForestMission = forestMissions.has(variantId);
        const caption = element.querySelector('.map_position_mover');
        if (!caption) {
            log('Einsatzüberschrift nicht gefunden:', variantId);
            return;
        }

        const existingMarker = caption.querySelector(`.${CONFIG.markerClass}`);
        if (isForestMission && !existingMarker) {
            const marker = document.createElement('span');
            marker.className = CONFIG.markerClass;
            marker.innerHTML = ' <strong style="color: #ff4444;">(Wald &amp; Vegetation)</strong>';

            const address = caption.querySelector('small');
            if (address) {
                const textNodes = [...caption.childNodes].filter(node => node.nodeType === Node.TEXT_NODE);
                const firstText = textNodes[0];

                if (firstText) {
                    const commaIndex = firstText.textContent.indexOf(',');
                    if (commaIndex !== -1) {
                        const commaNode = firstText.splitText(commaIndex);
                        caption.insertBefore(marker, commaNode);
                    } else {
                        caption.insertBefore(marker, address);
                    }
                } else {
                    caption.insertBefore(marker, address);
                }
            } else {
                caption.appendChild(marker);
            }

            log('Einsatz gekennzeichnet:', variantId);
        }

        if (!isForestMission && existingMarker) {
            existingMarker.remove();
            log('Kennzeichnung entfernt:', variantId);
        }
    }

    function updateList(container) {
        if (!container) return;
        const missions = container.querySelectorAll('.missionSideBarEntry[mission_type_id]');
        log('Einsatzliste geprüft:', { liste: container.id, anzahl: missions.length });
        missions.forEach(updateMission);
    }

    function updateAllLists() {
        for (const id of CONFIG.listIds) {
            const container = document.getElementById(id);
            if (container) {
                updateList(container);
            } else {
                log('Einsatzliste nicht gefunden:', id);
            }
        }
        updateMissionDetail();
    }

    function observeList(container) {
        if (!container) return;

        const id = container.id;
        const existing = listObservers.get(id);
        if (existing && existing.element === container) return;
        if (existing) {
            existing.observer.disconnect();
            log('Alter Observer entfernt:', id);
        }

        const observer = new MutationObserver(() => updateList(container));
        observer.observe(container, { childList: true, subtree: true, characterData: true });
        listObservers.set(id, { element: container, observer });
        log('Einsatzliste wird überwacht:', id);
        updateList(container);
    }

    function observeLists() {
        for (const id of CONFIG.listIds) {
            const container = document.getElementById(id);
            if (container) observeList(container);
        }
    }

    function init() {
        log('Skript wird gestartet.');
        log('Aktuelle URL:', location.href);
        addStyles();
        observeLists();

        const pageObserver = new MutationObserver(() => {
            observeLists();
            updateMissionDetail();
        });
        pageObserver.observe(document.body, { childList: true, subtree: true });

        updateMissionData();
        updateMissionDetail();

        setInterval(() => {
            log('Regelmäßige Einsatzprüfung gestartet.');
            observeLists();
            updateAllLists();
        }, CONFIG.checkInterval);

        log('Skript gestartet. Prüfintervall:', CONFIG.checkInterval / 1000, 'Sekunden.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
