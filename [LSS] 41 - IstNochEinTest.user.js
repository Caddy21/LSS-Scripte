// ==UserScript==
// @name         Leitstellenspiel.de FMS Timer (FMS Filtering + Persistent Storage + Status 1 Fix)
// @namespace    LeitstellenspielFMS
// @version      1.4
// @description  Zeigt die Verweildauer eines Fahrzeugs im ausgewählten FMS neben dem Fahrzeugnamen in der Lightbox an. Jetzt auch zuverlässig für Status 1 nach Lightbox-Öffnen, persistent im GM Speicher. Berücksichtigt nur relevante FMS Status.
// @author       Caddy21 + Copilot
// @match        https://www.leitstellenspiel.de/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    // Diese FMS-Status werden berücksichtigt
    const relevantFMS = ['1', '2', '3', '4', '5', '7', '8', '9'];

    function formatDuration(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${h.toString().padStart(2, '0')}:${m
            .toString()
            .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // Lade persistenten Speicher oder initialisiere
    let vehicleFmsDB = GM_getValue("vehicleFmsDB", {});

    function saveDB() {
        GM_setValue("vehicleFmsDB", vehicleFmsDB);
    }

    function observeLightbox() {
        setInterval(() => {
            document.querySelectorAll('iframe.lightbox_iframe').forEach((iframe) => {
                if (iframe._fmsTimerAttached) return;
                iframe._fmsTimerAttached = true;
                iframe.addEventListener('load', () => {
                    setTimeout(() => {
                        try {
                            const doc = iframe.contentDocument || iframe.contentWindow.document;
                            attachMutation(doc);
                            addFmsTimers(doc);
                        } catch (e) {}
                    }, 500);
                });
                setTimeout(() => {
                    try {
                        const doc = iframe.contentDocument || iframe.contentWindow.document;
                        attachMutation(doc);
                        addFmsTimers(doc);
                    } catch (e) {}
                }, 1000);
            });
        }, 1500);
    }

    function attachMutation(doc) {
        const target = doc.querySelector('.building_list_li .list-group');
        if (!target || target._fmsMutationAttached) return;
        target._fmsMutationAttached = true;
        const observer = new MutationObserver(() => {
            addFmsTimers(doc);
        });
        observer.observe(target, {childList: true, subtree: true});
    }

    function addFmsTimers(doc) {
        const vehicleLinks = doc.querySelectorAll('.building_list_li .list-group a:not(.active)');
        vehicleLinks.forEach((a) => {
            const fmsSpan = a.querySelector('.building_list_fms');
            if (!fmsSpan) return;
            const vehIdMatch = fmsSpan.id.match(/vehicle_overview_vehicle_(\d+)/);
            if (!vehIdMatch) return;
            const vid = vehIdMatch[1];

            // Hole FMS Statusnummer aus der class (z.B. "building_list_fms_2" -> "2")
            const fmsClassMatch = fmsSpan.className.match(/building_list_fms_(\d+)/);
            const fmsVal = fmsClassMatch ? fmsClassMatch[1] : '';

            // Nur relevante FMS-Status berücksichtigen
            if (!relevantFMS.includes(fmsVal)) return;

            let updateNeeded = false;
            // Fix: Falls kein FMS-Eintrag, kein since, oder FMS anders -> immer Timer setzen!
            if (!vehicleFmsDB[vid] || vehicleFmsDB[vid].fms !== fmsVal || !vehicleFmsDB[vid].since) {
                vehicleFmsDB[vid] = {
                    fms: fmsVal,
                    since: Date.now(),
                };
                saveDB();
                updateNeeded = true;
            }

            let timerSpan = a.querySelector('.fms-timer-span');
            if (!timerSpan || updateNeeded) {
                if (timerSpan && timerSpan._intervalId) {
                    clearInterval(timerSpan._intervalId);
                    timerSpan.remove();
                }
                timerSpan = doc.createElement('span');
                timerSpan.className = 'fms-timer-span';
                timerSpan.style.marginLeft = '8px';
                timerSpan.style.fontSize = '90%';
                timerSpan.style.opacity = 0.7;
                a.appendChild(timerSpan);

                timerSpan._intervalId = setInterval(() => {
                    const since = vehicleFmsDB[vid]?.since || Date.now();
                    const sec = Math.floor((Date.now() - since) / 1000);
                    timerSpan.textContent = ` (${formatDuration(sec)})`;
                }, 1000);
            }
        });
    }

    observeLightbox();
})();
