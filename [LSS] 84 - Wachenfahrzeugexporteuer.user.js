// ==UserScript==
// @name         [LSS] Wachenfahrzeugexporteurer
// @namespace    https://www.leitstellenspiel.de/
// @version      1.0
// @description  Exportiert den Fahrzeugbestand einer Wache, dieser Export kann als Import für den Fahrzeug-Manager genutzt werden.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/buildings/*
// @match        https://polizie.leitstellenspiel.de/buildings/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const VEHICLE_API = 'https://api.lss-manager.de/de_DE/vehicles';
    const EQUIPMENT_API = 'https://raw.githubusercontent.com/LSS-Manager/LSSM-V.4/dev/src/i18n/de_DE/equipment.ts';
    const SPECIAL_EQUIPMENT_BUILDINGS = {
        police_lift: [13],
        rescue_lift: [5],
        mountain_drone: [25]
    };

    async function fetchJson(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
        return response.json();
    }

    async function fetchEquipmentTypes() {
        const response = await fetch(EQUIPMENT_API);
        if (!response.ok) throw new Error(`Equipment-API: HTTP ${response.status}`);

        const source = await response.text();
        const equipment = {};
        const regex = /id:\s*['"]([^'"]+)['"][\s\S]*?caption:\s*['"]([^'"]+)['"][\s\S]*?size:\s*(\d+)[\s\S]*?credits:\s*([\d_]+)[\s\S]*?coins:\s*(\d+)/g;
        let match;

        while ((match = regex.exec(source)) !== null) {
            const [, id, caption] = match;
            equipment[id] = { id, caption };
        }

        return equipment;
    }

    function getBuildingId() {
        const match = location.pathname.match(/\/buildings\/(\d+)/);
        return match ? Number(match[1]) : null;
    }

    function getBuildingCaption() {
        return document.querySelector('.building-title h1')?.textContent.trim() || `Wache ${getBuildingId()}`;
    }

    function getBuildingData() {
        const heading = document.querySelector('.building-title h1[building_type]');
        if (!heading) throw new Error('Der Gebäudetyp konnte aus der Überschrift nicht ermittelt werden.');

        return {
            type: Number(heading.getAttribute('building_type')),
            isSmall: Boolean(document.querySelector('a[href*="/small_expand"]'))
        };
    }

    function getVehicleCounts() {
        const counts = {};

        document.querySelectorAll('tbody tr').forEach(row => {
            const typeId = row.querySelector('[vehicle_type_id]')?.getAttribute('vehicle_type_id');
            if (typeId) counts[typeId] = (counts[typeId] || 0) + 1;
        });

        return counts;
    }

    function getAllowedEquipment(buildingType, equipmentTypes) {
        return Object.values(equipmentTypes).filter(equipment => {
            const allowedBuildings = SPECIAL_EQUIPMENT_BUILDINGS[equipment.id];
            if (!allowedBuildings) return buildingType === 0;
            return allowedBuildings.includes(buildingType);
        });
    }

    function downloadJson(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function exportProfile() {
        const buildingId = getBuildingId();
        if (!buildingId) {
            alert('Die Gebäude-ID konnte nicht ermittelt werden.');
            return;
        }

        let buildingData;
        try {
            buildingData = getBuildingData();
        } catch (error) {
            alert(error.message);
            return;
        }

        const profileName = prompt('Name für das neue Fahrzeug-Manager-Profil:', getBuildingCaption());
        if (profileName === null) return;

        const name = profileName.trim();
        if (!name) {
            alert('Bitte einen Profilnamen eingeben.');
            return;
        }

        const button = document.getElementById('fm-profile-export-button');
        if (button) {
            button.disabled = true;
            button.textContent = 'Export läuft …';
        }

        try {
            const [vehicleTypes, equipmentTypes] = await Promise.all([
                fetchJson(VEHICLE_API),
                fetchEquipmentTypes()
            ]);

            const buildingKey = `${buildingData.type}_${buildingData.isSmall ? 'small' : 'normal'}`;
            const counts = getVehicleCounts();

            const allowedVehicles = Object.entries(vehicleTypes).filter(([, vehicle]) =>
                                                                        Array.isArray(vehicle.possibleBuildings) &&
                                                                        vehicle.possibleBuildings.includes(buildingData.type)
                                                                       );

            if (!allowedVehicles.length) {
                throw new Error(`Keine passenden Fahrzeugtypen für Gebäudetyp ${buildingData.type} gefunden.`);
            }

            const config = allowedVehicles.map(([id, vehicle]) => ({
                typeId: Number(id),
                caption: vehicle.caption || `Fahrzeugtyp ${id}`,
                checked: (counts[id] || 0) > 0,
                amount: counts[id] || 1,
                itemType: 'vehicle'
            }));

            getAllowedEquipment(buildingData.type, equipmentTypes).forEach(equipment => {
                config.push({
                    typeId: String(equipment.id),
                    caption: equipment.caption,
                    checked: false,
                    amount: 1,
                    itemType: 'equipment'
                });
            });

            const exportData = {
                [buildingKey]: {
                    activeProfile: name,
                    profiles: {
                        [name]: config
                    }
                }
            };

            downloadJson(
                exportData,
                `fahrzeug-manager-${buildingId}-${new Date().toISOString().slice(0, 10)}.json`
            );

            const exportedVehicles = Object.entries(counts)
            .filter(([, amount]) => amount > 0)
            .map(([id, amount]) => ({
                amount,
                caption: vehicleTypes[id]?.caption || `Fahrzeugtyp ${id}`
            }))
            .sort((a, b) => a.caption.localeCompare(b.caption, 'de'));

            alert(
                `Profil „${name}“ wurde exportiert.\n\n` +
                (exportedVehicles.length
                 ? exportedVehicles.map(vehicle => `${vehicle.amount}x ${vehicle.caption}`).join('\n')
                 : 'Keine Fahrzeuge gefunden.') +
                '\n\nDie Exportdatei kann im Fahrzeug-Manager über die Importfunktion verwendet werden.'
            );
        } catch (error) {
            console.error('Fahrzeug-Manager Profil-Exporter:', error);
            alert(`Der Export ist fehlgeschlagen:\n${error.message}`);
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'Profil exportieren';
            }
        }
    }

    function addExportButton() {
        const tabs = document.getElementById('tabs');
        if (!tabs || document.getElementById('fm-profile-export-button')) return;

        const item = document.createElement('li');
        item.setAttribute('role', 'presentation');
        item.style.padding = '7px 10px 0';

        const button = document.createElement('button');
        button.id = 'fm-profile-export-button';
        button.type = 'button';
        button.className = 'btn btn-primary btn-sm';
        button.textContent = 'Profil exportieren';
        button.title = 'Fahrzeugbestand als Fahrzeug-Manager-Profil exportieren';
        button.addEventListener('click', exportProfile);

        item.appendChild(button);
        tabs.appendChild(item);
    }

    addExportButton();
})();
