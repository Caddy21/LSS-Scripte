// ==UserScript==
// @name         [LSS] Passende AAO anzeigen
// @namespace    http://tampermonkey.net/
// @version      1.0
// @author       Caddy21
// @description  Blendet nicht passende AAOs aus und zieht die passende AAO nach oben
// @match        https://www.leitstellenspiel.de/missions/*
// @match        https://polizei.leitstellenspiel.de/missions/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'lss_aao_filter_enabled';
    const CHECK_DELAY = 150;
    const MIN_MATCH_WORDS = 1;
    const WORD_SCORE = 10;
    const EXACT_MATCH_BONUS = 1000;
    const MIN_WORD_LENGTH = 3;
    const MOVED_CLASS = 'lss-aao-moved';

    const STOPWORDS = new Set([
        'der', 'die', 'das', 'den', 'dem', 'des',
        'ein', 'eine', 'einer', 'einem', 'einen', 'eines',
        'und', 'oder', 'mit', 'auf', 'von', 'für', 'bei',
        'nach', 'vor', 'aus', 'durch', 'zur', 'zum', 'im',
        'in', 'am', 'an', 'zu', 'über', 'unter', 'gegen',
        'ohne', 'nicht', 'als', 'aufgrund', 'wegen',
        'evtl', 'evt', 'ggf', 'ggfs'
    ]);

    let enabled = localStorage.getItem(STORAGE_KEY) !== 'false';
    let lastMissionName = '';
    let updateTimer = null;
    let observer = null;
    let processing = false;

    const originalPositions = new Map();

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function normalizeText(text) {
        return String(text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/ß/g, 'ss')
            .replace(/[^a-z0-9\s-]/g, ' ')
            .replace(/[-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getWords(text) {
        return normalizeText(text).split(/\s+/).filter(word =>
                                                       word &&
                                                       word.length >= MIN_WORD_LENGTH &&
                                                       !STOPWORDS.has(word)
                                                      );
    }

    function getMissionName() {
        const missionInfo = document.querySelector('#mission_general_info');

        if (missionInfo) {
            const title = missionInfo.getAttribute('data-mission-title');

            if (title && title.trim()) {
                return title.trim();
            }
        }

        const missionH1 = document.querySelector('#missionH1');

        if (!missionH1) {
            return '';
        }

        const clone = missionH1.cloneNode(true);

        clone.querySelectorAll('a, img, span, small').forEach(el => {
            el.remove();
        });

        return clone.textContent
            .trim()
            .replace(/^\s*\[(verband|alliance|event)\]\s*/i, '')
            .replace(/\s*\((verbandseinsatz|alliance mission)\)\s*$/i, '')
            .replace(/\s*\(verursacht durch .*\)\s*$/i, '');
    }

    function getAAOName(aao) {
        return (
            aao.getAttribute('search_attribute') ||
            aao.getAttribute('title') ||
            aao.textContent ||
            ''
        ).trim();
    }

    function getAAOButtons() {
        return Array.from(
            document.querySelectorAll(
                '#mission-aao-group a.aao, #mission-aao-group a.aao_btn'
            )
        );
    }

    function calculateMatch(missionName, aaoName) {
        const missionNormalized = normalizeText(missionName);
        const aaoNormalized = normalizeText(aaoName);

        if (!missionNormalized || !aaoNormalized) {
            return {
                score: 0,
                matches: []
            };
        }

        if (missionNormalized === aaoNormalized) {
            return {
                score: EXACT_MATCH_BONUS,
                matches: getWords(missionName)
            };
        }

        const missionWords = getWords(missionName);
        const aaoWords = getWords(aaoName);
        const matches = [];

        for (const missionWord of missionWords) {
            for (const aaoWord of aaoWords) {
                if (missionWord === aaoWord) {
                    matches.push(missionWord);
                    break;
                }

                if (
                    missionWord.length >= 5 &&
                    aaoWord.length >= 5 &&
                    (
                        missionWord.includes(aaoWord) ||
                        aaoWord.includes(missionWord)
                    )
                ) {
                    matches.push(missionWord);
                    break;
                }
            }
        }

        const uniqueMatches = [...new Set(matches)];

        let score = uniqueMatches.length * WORD_SCORE;

        if (uniqueMatches.length >= 2) {
            score += uniqueMatches.length * 5;
        }

        if (
            aaoNormalized.includes(missionNormalized) ||
            missionNormalized.includes(aaoNormalized)
        ) {
            score += 100;
        }

        return {
            score,
            matches: uniqueMatches
        };
    }

    function getAAOWrapper(aao) {
        if (!aao) {
            return null;
        }

        return (
            aao.closest('.col-sm-2.col-xs-4') ||
            aao.closest('.col-sm-3.col-xs-6') ||
            aao.closest('[class*="col-sm-"]') ||
            aao.parentElement
        );
    }

    function moveMatchingAAOsToTop(matchingAAOs) {
        if (!matchingAAOs.length) {
            return;
        }

        const firstAAO = matchingAAOs[0];
        const originalWrapper = getAAOWrapper(firstAAO);

        if (!originalWrapper) {
            return;
        }

        const row = originalWrapper.closest('.row');

        if (!row) {
            return;
        }

        let movedWrapper = row.querySelector(`.${MOVED_CLASS}`);

        if (!movedWrapper) {
            movedWrapper = document.createElement('div');

            Array.from(originalWrapper.classList).forEach(className => {
                movedWrapper.classList.add(className);
            });

            movedWrapper.classList.add(MOVED_CLASS);

            row.insertBefore(
                movedWrapper,
                row.firstElementChild
            );
        }

        matchingAAOs.forEach((aao, index) => {
            if (aao.closest(`.${MOVED_CLASS}`) === movedWrapper) {
                return;
            }

            if (!originalPositions.has(aao)) {
                originalPositions.set(aao, {
                    parent: aao.parentNode,
                    nextSibling: aao.nextSibling
                });
            }

            aao.style.display = '';
            movedWrapper.appendChild(aao);

            if (index < matchingAAOs.length - 1) {
                const br = document.createElement('br');
                movedWrapper.appendChild(br);
            }
        });

        movedWrapper.style.display = '';
    }

    function restoreMovedAAOs() {
        document.querySelectorAll(`.${MOVED_CLASS}`).forEach(wrapper => {
            const aaos = Array.from(
                wrapper.querySelectorAll('a.aao, a.aao_btn')
            );

            aaos.forEach(aao => {
                const position = originalPositions.get(aao);

                if (
                    position &&
                    position.parent &&
                    position.parent.isConnected
                ) {
                    if (
                        position.nextSibling &&
                        position.nextSibling.parentNode === position.parent
                    ) {
                        position.parent.insertBefore(
                            aao,
                            position.nextSibling
                        );
                    } else {
                        position.parent.appendChild(aao);
                    }
                }
            });

            wrapper.remove();
        });

        originalPositions.clear();
    }

    function removeAAOBreaks() {
        document.querySelectorAll(
            '#mission-aao-group a.aao + br, #mission-aao-group a.aao_btn + br'
        ).forEach(br => {
            br.remove();
        });
    }

    function activateMatchingTab(matchingAAOs) {
        if (!matchingAAOs.length) {
            return;
        }

        const tabPane = matchingAAOs[0].closest('.tab-pane');

        if (!tabPane || !tabPane.id) {
            return;
        }

        const tabLink = document.querySelector(
            `#aao-tabs a[href="#${CSS.escape(tabPane.id)}"]`
        );

        if (!tabLink) {
            return;
        }

        if (
            typeof window.jQuery === 'function' &&
            typeof window.jQuery(tabLink).tab === 'function'
        ) {
            window.jQuery(tabLink).tab('show');
        } else {
            tabLink.click();
        }
    }

    function showAllAAOs() {
        restoreMovedAAOs();

        getAAOButtons().forEach(aao => {
            aao.style.display = '';
            delete aao.dataset.lssAaoProcessed;
        });

        document
            .querySelectorAll('#mission-aao-group .tab-pane')
            .forEach(tabPane => {
            tabPane.style.display = '';
        });
        removeAAOBreaks();
        lastMissionName = '';
    }

    function processAAOs() {
        if (processing) {
            return;
        }

        processing = true;

        try {
            if (!enabled) {
                showAllAAOs();
                return;
            }

            const missionName = getMissionName();

            if (!missionName) {
                return;
            }

            const missionChanged = missionName !== lastMissionName;

            if (missionChanged) {
                restoreMovedAAOs();
            }

            const aaoButtons = getAAOButtons();

            if (!aaoButtons.length) {
                return;
            }

            removeAAOBreaks();

            if (
                !missionChanged &&
                !aaoButtons.some(
                    aao => aao.dataset.lssAaoProcessed !== 'true'
                )
            ) {
                return;
            }

            lastMissionName = missionName;

            const results = aaoButtons.map(aao => {
                const result = calculateMatch(
                    missionName,
                    getAAOName(aao)
                );

                return {
                    element: aao,
                    name: getAAOName(aao),
                    score: result.score
                };
            });

            const maxScore = Math.max(
                ...results.map(result => result.score)
            );

            if (maxScore < MIN_MATCH_WORDS * WORD_SCORE) {
                showAllAAOs();
                return;
            }

            const matchingResults = results.filter(
                result => result.score === maxScore
            );

            const matchingAAOs = matchingResults.map(
                result => result.element
            );

            results.forEach(result => {
                const aao = result.element;

                aao.dataset.lssAaoProcessed = 'true';

                aao.style.display =
                    matchingAAOs.includes(aao) ? '' : 'none';
            });

            moveMatchingAAOsToTop(matchingAAOs);
            activateMatchingTab(matchingAAOs);

        } finally {
            processing = false;
        }
    }

    function createToggleButton() {
        if (document.querySelector('#lssAaoFilterToggle')) {
            updateToggleButton();
            return;
        }

        const tabs = document.querySelector('#aao-tabs');

        if (!tabs) {
            return;
        }

        const li = document.createElement('li');
        li.id = 'lssAaoFilterToggleTab';
        li.setAttribute('role', 'presentation');

        const button = document.createElement('button');

        button.id = 'lssAaoFilterToggle';
        button.type = 'button';
        button.className = 'btn btn-xs';
        button.style.margin = '7px 0 0 5px';
        button.style.fontWeight = 'bold';
        button.style.border = '1px solid rgba(0,0,0,.2)';

        button.addEventListener('click', () => {
            enabled = !enabled;

            localStorage.setItem(
                STORAGE_KEY,
                String(enabled)
            );

            if (enabled) {
                lastMissionName = '';
                processAAOs();
            } else {
                showAllAAOs();
            }

            updateToggleButton();
        });

        li.appendChild(button);
        tabs.appendChild(li);

        updateToggleButton();
    }

    function updateToggleButton() {
        const button = document.querySelector(
            '#lssAaoFilterToggle'
        );

        if (!button) {
            return;
        }

        if (enabled) {
            button.textContent = '🎯 AAO Filter AN';
            button.style.backgroundColor = '#5cb85c';
            button.style.color = '#fff';
            button.title =
                'Passende AAOs werden automatisch angezeigt';
        } else {
            button.textContent = '🎯 AAO Filter AUS';
            button.style.backgroundColor = '#d9534f';
            button.style.color = '#fff';
            button.title =
                'Alle AAOs werden angezeigt';
        }
    }

    function scheduleUpdate() {
        if (updateTimer) {
            clearTimeout(updateTimer);
        }

        updateTimer = setTimeout(() => {
            createToggleButton();
            processAAOs();
        }, CHECK_DELAY);
    }

    function startObserver() {
        if (observer) {
            observer.disconnect();
        }

        observer = new MutationObserver(() => {
            scheduleUpdate();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    async function init() {
        for (let i = 0; i < 100; i++) {
            if (
                document.querySelector('#missionH1') ||
                document.querySelector('#mission_general_info')
            ) {
                break;
            }
            await sleep(100);
        }
        createToggleButton();
        processAAOs();
        startObserver();
    }
    init();
})();
