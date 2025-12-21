// ==UserScript==
// @name         [LSS] Ausrückeverzögerer
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Fügt ein Eingabefeld zur Ausrückeverzögerung ein und setzt diese für alle Fahrzeuge einer Wache, ermöglicht außerdem das Speichern und laden von Presets mit Namen.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        GM.getValue
// @grant        GM.setValue
// ==/UserScript==

(function () {
    'use strict';

    if (window.pulldownScriptInitialized) {
        return;
    }
    window.pulldownScriptInitialized = true;

    const DELAY_STORAGE_KEY = 'ausrucke_verzoegerung';
    const PRESET_KEY = 'ausruecke_presets';
    const MODE_KEY = 'ausruecke_ui_mode';

    // Haupt-Token aus Meta-Tag holen
    const mainToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    async function loadPresets() {
        const p = await GM.getValue(PRESET_KEY, []);
        return p;
    }
    async function savePresets(p) {
        await GM.setValue(PRESET_KEY, p);
    }

    function observeNewVehicles(iframe, delay) {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

        const vehicleTableBody = iframeDoc.querySelector('#vehicle_table tbody');

        const knownVehicleIds = new Set(
            Array.from(vehicleTableBody.querySelectorAll('tr'))
                .map(tr => tr.querySelector('a[href^="/vehicles/"]')?.href.match(/\/vehicles\/(\d+)/)?.[1])
                .filter(Boolean)
        );

        // evtl. alten Observer aufräumen
        if (iframe._vehicleObserver) {
            try { iframe._vehicleObserver.disconnect(); } catch {}
        }

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
        iframe._vehicleObserver = observer;
    }

    async function updateDelayForSingleVehicle(vehicleId, delay) {
        const metaTokenNow = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const editUrl = `/vehicles/${vehicleId}/edit`;
        const updateUrl = `/vehicles/${vehicleId}`;

        try {

            const editResponse = await fetch(editUrl);
            if (!editResponse.ok) {
                return;
            }

            const editText = await editResponse.text();
            const tokenMatch = editText.match(/name="authenticity_token" value="([^"]+)"/);
            const token = tokenMatch ? tokenMatch[1] : (metaTokenNow || mainToken);

            if (!token) {
                return;
            }

            const formData = new URLSearchParams();
            formData.append('vehicle[start_delay]', delay);
            formData.append('authenticity_token', token);
            formData.append('_method', 'patch');

            const r = await fetch(updateUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            if (!r.ok) {
            }
        } catch (e) {
        }
    }


    async function updateDelayForAllVehicles(buildingId, delay, progressFill) {

        const vehiclesResponse = await fetch('/api/vehicles');
        if (!vehiclesResponse.ok) throw new Error('Fehler beim Laden der Fahrzeuge');

        const vehiclesData = await vehiclesResponse.json();
        const vehicles = vehiclesData.filter(v => v.building_id == buildingId);

        for (let i = 0; i < vehicles.length; i++) {
            await updateDelayForSingleVehicle(vehicles[i].id, delay);
            if (progressFill) {
                progressFill.style.width = `${Math.round(((i + 1) / vehicles.length) * 100)}%`;
            }
        }
    }

    function insertPulldown(iframe) {

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const container = iframeDoc.querySelector('.dl-horizontal');
        const dt = iframeDoc.createElement('dt');
        dt.textContent = 'Ausrückeverzögerung:';
        const dd = iframeDoc.createElement('dd');

        // Zahl-Input
        const input = iframeDoc.createElement('input');
        input.type = 'number';
        input.id = 'meinPulldown';
        input.style.marginRight = '6px';
        input.style.width = '60px';
        input.min = '0';
        input.max = '999';
        input.step = '1';
        input.placeholder = 'Sek.';

        // Dropdown
        const select = iframeDoc.createElement('select');
        select.id = 'meinPulldownSelect';
        select.style.display = 'none';
        select.style.marginRight = '6px';

        // Vorbelegung aus localStorage
        const savedDelay = localStorage.getItem(DELAY_STORAGE_KEY);
        if (savedDelay) input.value = savedDelay;

        // Button-Group
        const btnGroup = iframeDoc.createElement('div');
        btnGroup.className = 'btn-group';
        btnGroup.style.verticalAlign = 'middle';

        // Speichern
        const applyBtn = iframeDoc.createElement('a');
        applyBtn.textContent = 'Speichern';
        applyBtn.href = '#';
        applyBtn.className = 'btn btn-success btn-xs';

        // Umschalter
        const modeBtn = iframeDoc.createElement('button');
        modeBtn.type = 'button';
        modeBtn.textContent = 'Modus';
        modeBtn.className = 'btn btn-default btn-xs';

        // Stern/Müll
        const starBtn = iframeDoc.createElement('button');
        starBtn.type = 'button';
        starBtn.textContent = '⭐';
        starBtn.className = 'btn btn-danger btn-xs';

        btnGroup.appendChild(applyBtn);
        btnGroup.appendChild(modeBtn);
        btnGroup.appendChild(starBtn);

        let dropdownMode = false;

        async function refreshDropdown() {
            const presets = await loadPresets();
            select.innerHTML = '';
            presets.forEach((p, i) => {
                const opt = iframeDoc.createElement('option');
                opt.value = String(i);
                opt.textContent = `${p.name} (${p.value}s)`;
                select.appendChild(opt);
            });
        }

        function syncInputFromDropdown(presets) {
            const idx = parseInt(select.value || '0', 10);
            const p = presets[idx];
            if (p) input.value = p.value;
        }

        // Dropdown Auswahl
        select.addEventListener('change', async () => {
            const presets = await loadPresets();
            syncInputFromDropdown(presets);
        });

        (async () => {
            const savedMode = await GM.getValue(MODE_KEY, 'number');
            if (savedMode === 'dropdown') {
                dropdownMode = true;
                input.style.display = 'none';
                select.style.display = '';
                starBtn.textContent = '🗑️';
                await refreshDropdown();

                const presets = await loadPresets();
                if (presets.length) {
                    select.value = '0';
                    syncInputFromDropdown(presets);
                }
            }
        })();

        // Modus wechseln + speichern
        modeBtn.addEventListener('click', async () => {
            dropdownMode = !dropdownMode;
            if (dropdownMode) {
                await GM.setValue(MODE_KEY, 'dropdown');
                input.style.display = 'none';
                select.style.display = '';
                starBtn.textContent = '🗑️';
                await refreshDropdown();

                const presets = await loadPresets();
                if (presets.length) {
                    if (!select.value) select.value = '0';
                    syncInputFromDropdown(presets);
                }
            } else {
                await GM.setValue(MODE_KEY, 'number');
                input.style.display = '';
                select.style.display = 'none';
                starBtn.textContent = '⭐';
            }
        });

        // Stern speichern / Müll löschen
        starBtn.addEventListener('click', async () => {
            const presets = await loadPresets();

            if (!dropdownMode) {
                const val = parseInt(input.value, 10);
                if (!Number.isFinite(val) || val < 0) return alert('Bitte eine gültige Zeit in Sekunden eingeben!');

                const name = prompt('Name für diesen Wert:');
                if (!name) return;

                presets.push({ name, value: val });
                await savePresets(presets);
                await refreshDropdown();
                alert('Preset gespeichert.');
            } else {
                const idx = parseInt(select.value || '', 10);
                if (!Number.isFinite(idx) || !presets[idx]) return;

                const item = presets[idx];
                if (!confirm(`Preset "${item.name}" (${item.value}s) wirklich löschen?`)) return;

                presets.splice(idx, 1);
                await savePresets(presets);
                await refreshDropdown();

                const presets2 = await loadPresets();
                if (presets2.length) {
                    select.value = '0';
                    syncInputFromDropdown(presets2);
                } else {
                    input.value = '';
                }
            }
        });

        // UI
        dd.appendChild(input);
        dd.appendChild(select);
        dd.appendChild(btnGroup);

        container.appendChild(dt);
        container.appendChild(dd);

        // Wenn bereits ein Wert gewählt ist, direkt Observer aktivieren
        if (input.value) {
            const v = parseInt(input.value, 10);
            if (Number.isFinite(v)) observeNewVehicles(iframe, v);
        }

        // Apply-Button Verhalten
        applyBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            // Wert kommt immer aus input (Dropdown spiegelt dort rein)
            const value = parseInt(input.value, 10);

            if (!Number.isFinite(value) || value < 0) {
                alert("Bitte eine gültige Zeit in Sekunden eingeben!");
                return;
            }

            localStorage.setItem(DELAY_STORAGE_KEY, String(value));

            let buildingId;
            try {
                buildingId = new URL(iframe.contentWindow.location.href).pathname.split('/').pop();
            } catch (err) {
                return alert("Gebäude-ID konnte nicht ermittelt werden.");
            }
            if (!buildingId) {
                return alert("Gebäude-ID konnte nicht ermittelt werden.");
            }

            applyBtn.textContent = 'Wird gesetzt...';
            applyBtn.classList.add('disabled');

            // Progressbar dynamisch (Original)
            const progressWrapper = iframeDoc.createElement('div');
            progressWrapper.style.marginTop = '8px';
            progressWrapper.style.width = '200px';

            const progressBar = iframeDoc.createElement('div');
            progressBar.style.width = '100%';
            progressBar.style.background = '#eee';
            progressBar.style.height = '12px';
            progressBar.style.borderRadius = '4px';

            const progressFill = iframeDoc.createElement('div');
            progressFill.style.height = '100%';
            progressFill.style.width = '0%';
            progressFill.style.background = '#337ab7';
            progressFill.style.borderRadius = '4px';
            progressFill.style.transition = 'width 0.2s';

            progressBar.appendChild(progressFill);
            progressWrapper.appendChild(progressBar);
            dd.appendChild(progressWrapper);

            try {
                await updateDelayForAllVehicles(buildingId, value, progressFill);

                // Fahrzeugliste neu laden (Original)
                let reloaded = false;
                const reloadBtn = iframeDoc.querySelector('a.btn.btn-success[href*="/vehicles"]');
                if (reloadBtn) {
                    reloadBtn.click();
                    reloaded = true;
                } else {
                    const tab = iframeDoc.querySelector('a[href$="/vehicles"]:not(.btn)');
                    if (tab) {
                        tab.click();
                        reloaded = true;
                    }
                }

                if (!reloaded) {
                    try {
                        iframe.contentWindow.location.reload();
                    } catch (err) {
                        iframe.src = iframe.src;
                    }
                }

                if (dd.contains(progressWrapper)) dd.removeChild(progressWrapper);
                alert(`Ausrückeverzögerung (${value}) Sekunden für alle Fahrzeuge gesetzt.`);
            } catch (err) {
                if (dd.contains(progressWrapper)) dd.removeChild(progressWrapper);
                alert("Fehler beim Setzen der Verzögerung: " + err.message);
            } finally {
                applyBtn.textContent = 'Speichern';
                applyBtn.classList.remove('disabled');
            }

            // Automatische Verzögerung für neu gekaufte Fahrzeuge
            observeNewVehicles(iframe, value);
        });
    }

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
        if (!iframeDoc) return;

        if (iframe._contentObserver) iframe._contentObserver.disconnect();
        if (iframe._pollingInterval) clearInterval(iframe._pollingInterval);
        if (iframe._urlCheckInterval) clearInterval(iframe._urlCheckInterval);

        if (iframeDoc.body) {
            const observer = new MutationObserver(() => checkAndInsert());
            observer.observe(iframeDoc.body, { childList: true, subtree: true });
            iframe._contentObserver = observer;
        }

        iframe._pollingInterval = setInterval(() => checkAndInsert(), 500);

        let lastIframeUrl = null;
        try { lastIframeUrl = iframe.contentWindow?.location?.href; } catch {}

        iframe._urlCheckInterval = setInterval(() => {
            let currentUrl = null;
            try { currentUrl = iframe.contentWindow?.location?.href; } catch {}
            if (currentUrl && currentUrl !== lastIframeUrl) {
                lastIframeUrl = currentUrl;
                checkAndInsert();
            }
        }, 300);

        checkAndInsert();
    }

    function init() {

        const existingIframe = document.querySelector('iframe.lightbox_iframe');
        if (existingIframe) {
            watchIframeContent(existingIframe);
        } else {
        }
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

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
