// ==UserScript==
// @name         [LSS] Fahrzeug-ID Kopierer
// @namespace    https://www.leitstellenspiel.de
// @version      1.0
// @description  Kopiert Fahrzeugtyp-ID, dynamische Fahrzeug-ID und Fahrzeug-Link auf Gebäudeseiten.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/buildings/*
// @match        https://polizei.leitstellenspiel.de/buildings/*
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
    'use strict';

    const DEBUG = false;
    const LOG_PREFIX = '[LSS] Fahrzeug-ID Kopierer';

    function log(...args) {if (DEBUG) {console.log(LOG_PREFIX, ...args);}}
    function warn(...args) {console.warn(LOG_PREFIX, ...args);}
    function error(...args) {console.error(LOG_PREFIX, ...args);}
    log('SCRIPT GELADEN');
    log('URL:', window.location.href);

    function copyToClipboard(vehicleTypeId, vehicleId, vehicleUrl, vehicleName, button) {
        const clipboardText = `Fahrzeug ID ${vehicleTypeId}; Dynamische ID ${vehicleId} URL zum Fahrzeug ;${vehicleUrl}`;
        log('Kopiere Fahrzeugdaten:', clipboardText);
        GM_setClipboard(clipboardText, 'text');
        button.innerHTML = '<span class="glyphicon glyphicon-ok"></span>';
        showStatus(`${vehicleName}: Daten kopiert`, 'success');
        setTimeout(() => {
            button.innerHTML = '<span class="glyphicon glyphicon-copy"></span>';
        }, 1200);
    }

    async function getVehicleTypeId(vehicleUrl) {
        log('Lade Fahrzeugseite:', vehicleUrl);
        const response = await fetch(vehicleUrl, {
            credentials: 'same-origin'
        });
        log('Fahrzeugseite Status:', response.status);
        if (!response.ok) {
            throw new Error(`Fahrzeugseite konnte nicht geladen werden (HTTP ${response.status}).`);
        }
        const html = await response.text();
        const parser = new DOMParser();
        const document = parser.parseFromString(html, 'text/html');
        const typeLink = document.querySelector('#vehicle-attr-type a[href*="/fahrzeugfarbe/"]');
        if (!typeLink) {
            throw new Error('Fahrzeugtyp auf der Fahrzeugseite nicht gefunden.');
        }
        const href = typeLink.getAttribute('href');
        const match = href.match(/\/fahrzeugfarbe\/(\d+)/);
        if (!match) {
            throw new Error(`Fahrzeugtyp-ID konnte aus "${href}" nicht ermittelt werden.`);
        }
        const vehicleTypeId = match[1];
        const vehicleTypeName = typeLink.textContent.trim();
        log('Fahrzeugtyp gefunden:', vehicleTypeName);
        log('Fahrzeugtyp-ID:', vehicleTypeId);
        return vehicleTypeId;
    }

    async function copyVehicleData(vehicleLink, button) {
        const href = vehicleLink.getAttribute('href');
        const vehicleName = vehicleLink.textContent.trim();
        const match = href.match(/^\/vehicles\/(\d+)/);
        if (!match) {
            error('Dynamische Fahrzeug-ID konnte nicht ermittelt werden:', href);
            return;
        }
        const vehicleId = match[1];
        const vehicleUrl = new URL(href, window.location.origin).href;
        log('Fahrzeug:', vehicleName);
        log('Dynamische ID:', vehicleId);
        log('URL:', vehicleUrl);
        button.disabled = true;
        const originalHTML = button.innerHTML;
        button.innerHTML = '<span class="glyphicon glyphicon-refresh lss-spin"></span>';

        try {
            const vehicleTypeId = await getVehicleTypeId(vehicleUrl);

            copyToClipboard(
                vehicleTypeId,
                vehicleId,
                vehicleUrl,
                vehicleName,
                button
            );
        } catch (err) {
            error('Fehler:', err);
            button.innerHTML = '<span class="glyphicon glyphicon-remove"></span>';
            showStatus(
                err.message || 'Fahrzeugdaten konnten nicht ermittelt werden.',
                'error'
            );
            setTimeout(() => {
                button.innerHTML = originalHTML;
            }, 1500);
        } finally {
            button.disabled = false;
        }
    }

    function getVehicleLink(container) {
        return container.querySelector('a[href^="/vehicles/"]:not([href*="/edit"]):not([href*="/refit"])');
    }

    function createCopyButton(vehicleLink, oldDesign = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = oldDesign
            ? 'btn btn-default btn-xs lss-old-vehicle-copy-button'
        : 'btn btn-default btn-xs lss-vehicle-copy-button';
        button.title = 'Fahrzeugtyp-ID, Fahrzeug-ID und Link kopieren';
        button.innerHTML = '<span class="glyphicon glyphicon-copy"></span>';
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            copyVehicleData(vehicleLink, button);
        });
        return button;
    }

    function addNewDesignButton(card) {
        if (card.dataset.lssVehicleCopyButton === '1') {
            return;
        }
        const iconBox = card.querySelector('.vehicle-icon-box');
        const vehicleLink = getVehicleLink(card);
        if (!iconBox || !vehicleLink) {
            warn('Neues Fahrzeugdesign erkannt, aber Fahrzeugdaten fehlen.');
            return;
        }
        const button = createCopyButton(vehicleLink);
        iconBox.parentNode.insertBefore(button, iconBox);
        card.dataset.lssVehicleCopyButton = '1';
        log('Button im neuen Design eingefügt:', vehicleLink.textContent.trim());
    }

    function addOldDesignButton(row) {
        if (row.dataset.lssVehicleCopyButton === '1') {
            return;
        }
        const image = row.querySelector('img.vehicle_image_reload');
        const vehicleLink = getVehicleLink(row);
        if (!image || !vehicleLink) {
            return;
        }
        const button = createCopyButton(vehicleLink, true);
        image.parentNode.insertBefore(button, image);
        row.dataset.lssVehicleCopyButton = '1';
        log('Button im alten Tabellen-Design eingefügt:', vehicleLink.textContent.trim());
    }

    function processVehicles() {
        const newCards = document.querySelectorAll('#vehicle .vehicle-card');
        const oldRows = document.querySelectorAll('#vehicle_table tbody tr');
        log('Neues Design:', newCards.length, 'Fahrzeugkarten gefunden.');
        log('Altes Design:', oldRows.length, 'Fahrzeugzeilen gefunden.');
        newCards.forEach(addNewDesignButton);
        oldRows.forEach(addOldDesignButton);
    }

    function showStatus(message, type) {
        let status = document.getElementById('lss-vehicle-copy-status');
        if (!status) {
            status = document.createElement('div');
            status.id = 'lss-vehicle-copy-status';
            document.body.appendChild(status);
        }

        clearTimeout(status._hideTimer);
        status.className = type;
        status.textContent = message;
        status.style.opacity = '1';
        status._hideTimer = setTimeout(() => {
            status.style.opacity = '0';
        }, 2500);
    }

    function addStyles() {
        if (document.getElementById('lss-vehicle-copy-style')) {
            return;
        }
        const style = document.createElement('style');
        style.id = 'lss-vehicle-copy-style';
        style.textContent = `
            .vehicle-card-body {
                display: flex !important;
                align-items: stretch !important;
            }

            .lss-vehicle-copy-button {
                width: 36px !important;
                min-width: 36px !important;
                padding: 5px !important;
                margin: 0 !important;
                border: 0 !important;
                border-right: 1px solid #ccc !important;
                border-radius: 0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                align-self: stretch !important;
                flex-shrink: 0 !important;
            }

            .lss-vehicle-copy-button:hover {
                background-color: #ddd !important;
            }

            .lss-old-vehicle-copy-button {
                margin-right: 6px !important;
                vertical-align: middle !important;
            }

            body.dark .lss-vehicle-copy-button,
            body.dark .lss-old-vehicle-copy-button {
                background-color: #505050 !important;
                color: #fff !important;
                border-color: #666 !important;
            }

            body.dark .lss-vehicle-copy-button:hover,
            body.dark .lss-old-vehicle-copy-button:hover {
                background-color: #606060 !important;
            }

            .lss-spin {
                animation: lssVehicleSpin 1s linear infinite;
            }

            @keyframes lssVehicleSpin {
                from {
                    transform: rotate(0deg);
                }

                to {
                    transform: rotate(360deg);
                }
            }

            #lss-vehicle-copy-status {
                position: fixed;
                right: 20px;
                bottom: 20px;
                z-index: 99999;
                padding: 10px 15px;
                border-radius: 5px;
                color: #fff;
                font-size: 14px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                opacity: 0;
                transition: opacity 0.2s ease;
                pointer-events: none;
            }

            #lss-vehicle-copy-status.success {
                background-color: #28a745;
            }

            #lss-vehicle-copy-status.error {
                background-color: #dc3545;
            }
        `;

        document.head.appendChild(style);
    }

    function init() {
        log('INIT');
        log('URL:', window.location.href);
        addStyles();
        processVehicles();
        const observer = new MutationObserver(mutations => {
            if (mutations.some(mutation => mutation.addedNodes.length > 0)) {
                processVehicles();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        log('MutationObserver gestartet.');
        log('INIT abgeschlossen.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
