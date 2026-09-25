// ==UserScript==
// @name         [LSS] 51 - Credit Alert
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Meldet bei Credit-Meilensteinen und Verbesserungen des Toplistenplatzes und zeigt Tage seit Registrierung
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @match        https://polizei.leitstellenspiel.de/
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const API_URL = 'https://www.leitstellenspiel.de/api/userinfo';
    const CHECK_INTERVAL = 30 * 1000;
    const MILESTONE = 10_000_000;
    const START_DATE = new Date('2022-01-18T00:00:00');
    const CREDIT_STORAGE_KEY = 'lss_credit_alert_next_milestone';
    const TOPLIST_STORAGE_KEY = 'lss_credit_alert_last_toplist_position';
    const LOG_PREFIX = '[LSS 51 - Credit Alert]';

    function daysSinceStart() {
        const now = new Date();

        return Math.floor(
            (now - START_DATE) / (1000 * 60 * 60 * 24)
        );
    }

    function getNextMilestone(credits) {
        return Math.ceil(credits / MILESTONE) * MILESTONE;
    }

    function showNotification({
        icon = '💰',
        title,
        lines = [],
        duration = 10000
    }) {
        const containerId = 'lss-credit-alert-container';
        let container = document.getElementById(containerId);

        if (!container) {
            container = document.createElement('div');
            container.id = containerId;

            Object.assign(container.style, {
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: '999999',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                width: 'min(420px, calc(100vw - 30px))',
                pointerEvents: 'none',
                fontFamily: 'Arial, sans-serif'
            });

            document.body.appendChild(container);
        }

        const notification = document.createElement('div');

        notification.innerHTML = `
            <div style="
                font-size: 28px;
                margin-bottom: 6px;
            ">${icon}</div>

            <div style="
                font-size: 19px;
                font-weight: bold;
                margin-bottom: 8px;
            ">${title}</div>

            ${lines.map(line => `
                <div style="
                    font-size: 14px;
                    line-height: 1.5;
                ">${line}</div>
            `).join('')}
        `;

        Object.assign(notification.style, {
            padding: '18px 22px',
            background: '#222',
            color: '#fff',
            border: '2px solid #ffc107',
            borderRadius: '12px',
            boxShadow: '0 5px 25px rgba(0,0,0,0.5)',
            textAlign: 'center',
            opacity: '0',
            transform: 'translateY(-15px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            pointerEvents: 'auto'
        });

        container.appendChild(notification);
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        });
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-15px)';
            setTimeout(() => {
                notification.remove();

                if (!container.children.length) {
                    container.remove();
                }
            }, 300);
        }, duration);
    }

    function checkCreditMilestone(currentCredits) {
        let nextMilestone = localStorage.getItem(CREDIT_STORAGE_KEY);
        if (nextMilestone === null) {
            nextMilestone = getNextMilestone(currentCredits);
            localStorage.setItem(
                CREDIT_STORAGE_KEY,
                nextMilestone
            );
            return;
        }

        nextMilestone = Number(nextMilestone);
        if (!Number.isFinite(nextMilestone)) {
            nextMilestone = getNextMilestone(currentCredits);
            localStorage.setItem(
                CREDIT_STORAGE_KEY,
                nextMilestone
            );
            console.warn(
                `${LOG_PREFIX} Ungültiger gespeicherter Credit-Meilenstein. ` +
                `Neuer Meilenstein: ${nextMilestone}`
            );
            return;
        }
        if (currentCredits < nextMilestone) {
            return;
        }

        const reachedMilestone = nextMilestone;
        const nextMilestoneAfterCurrent = Math.floor(currentCredits / MILESTONE) * MILESTONE + MILESTONE;
        const previousMilestone = reachedMilestone - MILESTONE;
        const gainedSincePreviousMilestone =  currentCredits - previousMilestone;
        const days = daysSinceStart();

        showNotification({
            icon: '💰',
            title: 'Credit-Meilenstein erreicht!',
            lines: [
                `<strong>${reachedMilestone.toLocaleString('de-DE')} Credits</strong>`,
                `Aktueller Stand: ${currentCredits.toLocaleString('de-DE')} Credits`,
                `Seit dem letzten Meilenstein: +${gainedSincePreviousMilestone.toLocaleString('de-DE')} Credits`,
                `Tage seit ${START_DATE.toLocaleDateString('de-DE')}: ${days}`
            ]
        });

        localStorage.setItem(
            CREDIT_STORAGE_KEY,
            nextMilestoneAfterCurrent
        );
    }

    function checkToplistPosition(currentPosition) {
        if (!Number.isFinite(currentPosition)) {
            console.warn(
                `${LOG_PREFIX} Ungültiger Toplistenplatz:`,
                currentPosition
            );
            return;
        }

        let lastPosition = localStorage.getItem(TOPLIST_STORAGE_KEY);

        if (lastPosition === null) {
            localStorage.setItem(
                TOPLIST_STORAGE_KEY,
                currentPosition
            );
            return;
        }

        lastPosition = Number(lastPosition);

        if (!Number.isFinite(lastPosition)) {
            localStorage.setItem(
                TOPLIST_STORAGE_KEY,
                currentPosition
            );

            console.warn(
                `${LOG_PREFIX} Ungültiger gespeicherter Toplistenplatz. ` +
                `Neuer Platz: ${currentPosition}`
            );

            return;
        }

        if (currentPosition < lastPosition) {
            const positionsImproved = lastPosition - currentPosition;

            showNotification({
                icon: '🏆',
                title: 'Toplistenplatz verbessert!',
                lines: [
                    `<strong>Platz ${currentPosition.toLocaleString('de-DE')}</strong>`,
                    `Vorher: Platz ${lastPosition.toLocaleString('de-DE')}`,
                    `+${positionsImproved.toLocaleString('de-DE')} Platz${positionsImproved === 1 ? '' : 'plätze'} verbessert`
                ]
            });
        } else if (currentPosition > lastPosition) {
            const positionsLost = currentPosition - lastPosition;

            showNotification({
                icon: '📉',
                title: 'Toplistenplatz verschlechtert!',
                lines: [
                    `<strong>Platz ${currentPosition.toLocaleString('de-DE')}</strong>`,
                    `Vorher: Platz ${lastPosition.toLocaleString('de-DE')}`,
                    `-${positionsLost.toLocaleString('de-DE')} Platz${positionsLost === 1 ? '' : 'plätze'} verloren`
                ]
            });
        }

        localStorage.setItem(
            TOPLIST_STORAGE_KEY,
            currentPosition
        );
    }

    function updateNavbarStats(totalCredits, toplistPosition, userLevelTitle) {
        const logo = document.querySelector('.navbar-brand.hidden-xs');
        if (!logo) return;

        let stats = document.getElementById('lss-credit-alert-stats');

        if (!stats) {
            stats = document.createElement('span');
            stats.id = 'lss-credit-alert-stats';

            Object.assign(stats.style, {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '14px',
                marginLeft: '15px',
                height: '50px',
                fontSize: '14px',
                lineHeight: '50px',
                whiteSpace: 'nowrap',
                verticalAlign: 'top'
            });

            logo.insertAdjacentElement('afterend', stats);
        }

        stats.innerHTML = `
        <span title="Gesamtverdiente Credits">
            💰 Gesamtverdienst:
            <strong>${totalCredits.toLocaleString('de-DE')}</strong>
        </span>
        <span title="Aktuelle Toplisten-Platzierung">
            🏆 Platz:
            <strong>${toplistPosition.toLocaleString('de-DE')}</strong>
        </span>
        <span title="Level">
            ⭐ Level:
            <strong>${userLevelTitle}</strong>
        </span>
    `;
    }

    async function checkAccount() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status} ${response.statusText}`
                );
            }
            const data = await response.json();
            const currentCredits = Number(data.credits_user_total);
            const currentToplistPosition = Number(data.user_toplist_position);
            const userLevelTitle = String(data.user_level_title ?? '').trim();

            if (Number.isFinite(currentCredits)) {
                checkCreditMilestone(currentCredits);
            } else {
                console.warn(
                    `${LOG_PREFIX} credits_user_total ist ungültig:`,
                    data.credits_user_total
                );
            }

            if (Number.isFinite(currentToplistPosition)) {
                checkToplistPosition(currentToplistPosition);
            } else {
                console.warn(
                    `${LOG_PREFIX} user_toplist_position ist ungültig:`,
                    data.user_toplist_position
                );
            }

            if (
                Number.isFinite(currentCredits) &&
                Number.isFinite(currentToplistPosition)
            ) {
                updateNavbarStats(
                    currentCredits,
                    currentToplistPosition,
                    userLevelTitle
                );
            }
        } catch (error) {
            console.error(
                `${LOG_PREFIX} Script Fehler:`,
                error
            );
        }
    }

    checkAccount();
    setInterval(() => {
        checkAccount();
    }, CHECK_INTERVAL);
})();
