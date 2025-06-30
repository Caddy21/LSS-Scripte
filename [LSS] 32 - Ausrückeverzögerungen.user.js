// ==UserScript==
// @name         [LSS] Ausrückeverzögerung
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fügt ein Pulldown-Menü zur Ausrückeverzögerung ein und setzt diese für alle Fahrzeuge einer Wache
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (window.pulldownScriptInitialized) return;
    window.pulldownScriptInitialized = true;

    const DELAY_STORAGE_KEY = 'ausrucke_verzoegerung';

    // Haupt-Token aus Meta-Tag holen (für Fallback)
    const mainToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (!mainToken) {
        console.warn("[Pulldown-Script] CSRF-Meta-Token nicht gefunden!");
    }

    // Fahrzeuge-Liste beobachten und für neue Fahrzeuge die Verzögerung setzen
    function observeNewVehicles(iframe, delay) {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        const vehicleTableBody = iframeDoc.querySelector('#vehicle_table tbody');
        if (!vehicleTableBody) return;

        // IDs der schon bekannten Fahrzeuge merken
        const knownVehicleIds = new Set(
            Array.from(vehicleTableBody.querySelectorAll('tr')).map(tr =>
                                                                    tr.querySelector('a[href^="/vehicles/"]')?.href.match(/\/vehicles\/(\d+)/)?.[1]
                                                                   ).filter(Boolean)
        );

        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1 && node.matches('tr')) {
                        const vehicleLink = node.querySelector('a[href^="/vehicles/"]');
                        const match = vehicleLink?.href.match(/\/vehicles\/(\d+)/);
                        const vehicleId = match?.[1];
                        if (vehicleId && !knownVehicleIds.has(vehicleId)) {
                            knownVehicleIds.add(vehicleId);
                            updateDelayForSingleVehicle(vehicleId, delay);
                        }
                    }
                }
            }
        });
        observer.observe(vehicleTableBody, { childList: true });
        // Optional: observer.disconnect() aufräumen, wenn iframe entfernt wird
    }

    // Einzelnes Fahrzeug aktualisieren
    async function updateDelayForSingleVehicle(vehicleId, delay) {
        const mainToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const editUrl = `/vehicles/${vehicleId}/edit`;
        const updateUrl = `/vehicles/${vehicleId}`;
        try {
            const editResponse = await fetch(editUrl);
            if (!editResponse.ok) return;
            const editText = await editResponse.text();
            const tokenMatch = editText.match(/name="authenticity_token" value="([^"]+)"/);
            const token = tokenMatch ? tokenMatch[1] : mainToken;
            if (!token) return;

            const formData = new URLSearchParams();
            formData.append('vehicle[start_delay]', delay);
            formData.append('authenticity_token', token);
            formData.append('_method', 'patch');

            await fetch(updateUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });
            // Optional: Erfolgsmeldung oder Logging
        } catch (e) {
            // Optional: Fehlerbehandlung
            console.warn('Fehler beim Setzen der Verzögerung für Fahrzeug', vehicleId, e);
        }
    }

    // Pulldown-Menü einfügen
    function insertPulldown(iframe) {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) {
            return;
        }

        const container = iframeDoc.querySelector('.dl-horizontal');
        if (!container) {
            return;
        }

        if (iframeDoc.querySelector('#meinPulldown')) return;

        const dt = iframeDoc.createElement('dt');
        dt.textContent = 'Ausrückeverzögerung';

        const dd = iframeDoc.createElement('dd');

        const select = iframeDoc.createElement('select');
        select.id = 'meinPulldown';
        select.style.marginRight = '10px';

        select.add(new Option('Bitte wählen', ''));
        [0, 50, 100, 150, 200, 250, 300].forEach(val => {
            select.add(new Option(val.toString(), val.toString()));
        });

        // Vorbelegung aus localStorage
        const savedDelay = localStorage.getItem(DELAY_STORAGE_KEY);
        if (savedDelay) select.value = savedDelay;

        const button = iframeDoc.createElement('a');
        button.textContent = 'Speichern';
        button.href = '#';
        button.className = 'btn btn-default btn-xs';

        button.addEventListener('click', (e) => {
            e.preventDefault();
            const value = select.value;
            if (!value) return alert("Bitte zuerst eine Verzögerung auswählen!");

            localStorage.setItem(DELAY_STORAGE_KEY, value);

            const buildingId = new URL(iframe.src).pathname.split('/').pop();
            if (!buildingId) return alert("Gebäude-ID konnte nicht ermittelt werden.");

            button.textContent = 'Wird gesetzt...';
            button.classList.add('disabled');

            updateDelayForAllVehicles(buildingId, parseInt(value, 10))
                .then(() => {
                alert(`Ausrückeverzögerung (${value}) für alle Fahrzeuge gesetzt.`);
                // Hier Lightbox-iframe neu laden:
                iframe.src = iframe.src;
            })
                .catch(err => {
                alert("Fehler beim Setzen der Verzögerung: " + err.message);
                console.error(err);
            })
                .finally(() => {
                button.textContent = 'Speichern';
                button.classList.remove('disabled');
            });

            observeNewVehicles(iframe, parseInt(value, 10));
        });

        dd.appendChild(select);
        dd.appendChild(button);

        container.appendChild(dt);
        container.appendChild(dd);

        // Falls bereits ein Wert gewählt ist, direkt Observer aktivieren
        if (select.value) {
            observeNewVehicles(iframe, parseInt(select.value, 10));
        }
    }

    // Update-Funktion für alle Fahrzeuge wie gehabt
    async function updateDelayForAllVehicles(buildingId, delay) {
        const vehiclesResponse = await fetch('/api/vehicles');
        if (!vehiclesResponse.ok) throw new Error('Fehler beim Laden der Fahrzeuge');
        const vehiclesData = await vehiclesResponse.json();

        const vehicles = vehiclesData.filter(v => v.building_id == buildingId);

        for (const vehicle of vehicles) {
            await updateDelayForSingleVehicle(vehicle.id, delay);
        }
    }

    // watchIframeContent mit Fehlerabfang
    function watchIframeContent(iframe) {
        function checkAndInsert() {
            if (!iframe || !iframe.contentDocument) return false;
            const container = iframe.contentDocument.querySelector('.dl-horizontal');
            if (!container) return false;
            if (iframe.contentDocument.querySelector('#meinPulldown')) return false;

            insertPulldown(iframe);
            return true;
        }

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
            return;
        }

        if (iframe._contentObserver) {
            iframe._contentObserver.disconnect();
        }
        if (iframe._pollingInterval) {
            clearInterval(iframe._pollingInterval);
        }
        if (iframe._urlCheckInterval) {
            clearInterval(iframe._urlCheckInterval);
        }

        if (iframeDoc.body) {
            const observer = new MutationObserver(() => {
                checkAndInsert();
            });
            observer.observe(iframeDoc.body, { childList: true, subtree: true });
            iframe._contentObserver = observer;
        }

        iframe._pollingInterval = setInterval(() => {
            checkAndInsert();
        }, 500);

        let lastIframeUrl = null;
        try {
            lastIframeUrl = iframe.contentWindow?.location?.href;
        } catch (e) {
            lastIframeUrl = null;
        }

        iframe._urlCheckInterval = setInterval(() => {
            let currentUrl = null;
            try {
                currentUrl = iframe.contentWindow?.location?.href;
            } catch (e) {
                currentUrl = null;
            }
            if (currentUrl && currentUrl !== lastIframeUrl) {
                lastIframeUrl = currentUrl;
                checkAndInsert();
            }
        }, 300);

        checkAndInsert();
    }

    const existingIframe = document.querySelector('iframe.lightbox_iframe');
    if (existingIframe) {
        watchIframeContent(existingIframe);
    }

    const observer = new MutationObserver(mutationsList => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.tagName === 'IFRAME' && node.className.includes('lightbox_iframe')) {
                        watchIframeContent(node);
                    }
                });
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
