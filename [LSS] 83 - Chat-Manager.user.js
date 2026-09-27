// ==UserScript==
// @name         [LSS] Chat-Manager
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Unterteilt den Verbandschat in normale Nachrichten, Einsatzmeldungen und private Nachrichten.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const CHAT_MESSAGES = '#mission_chat_messages';
    const CHAT_HEADER = '#chat_panel_heading';
    const STORAGE_KEY = 'lss-chat-manager-active-tab';
    const categories = {
        chat: {
            label: '💬 Chat',
            unread: 0
        },
        missions: {
            label: '🚨 Einsätze',
            unread: 0
        },
        whispers: {
            label: '🔒 Privat',
            unread: 0
        }
    };

    let activeCategory = localStorage.getItem(STORAGE_KEY) || 'chat';
    let chatMessages;
    let tabsContainer;
    let observer;

    function injectStyles() {
        if (document.getElementById('lss-chat-manager-style')) return;

        const style = document.createElement('style');
        style.id = 'lss-chat-manager-style';
        style.textContent = `
        #lss-chat-manager-tabs {
            display: inline-flex;
            gap: 3px;
            margin-left: 10px;
            vertical-align: middle;
        }

        #lss-chat-manager-tabs .lss-chat-tab {
            position: relative;
            padding: 2px 7px;
            border: 1px solid #ccc;
            border-radius: 3px;
            background: #fff;
            color: #333;
            cursor: pointer;
            font-size: 12px;
            line-height: 1.5;
            text-decoration: none;
            user-select: none;
        }

        #lss-chat-manager-tabs .lss-chat-tab:hover {
            background: #f5f5f5;
        }

        #lss-chat-manager-tabs .lss-chat-tab.active {
            background: #e7e7e7;
            box-shadow: inset 0 1px 2px rgba(0,0,0,.15);
        }

        #lss-chat-manager-tabs .lss-chat-tab.unread {
            animation: lss-chat-manager-blink 1s infinite;
        }

        #lss-chat-manager-tabs .lss-chat-tab .lss-chat-unread {
            margin-left: 3px;
            font-weight: bold;
        }

        @keyframes lss-chat-manager-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: .35; }
        }

        body.dark #lss-chat-manager-tabs .lss-chat-tab,
        body.dark-mode #lss-chat-manager-tabs .lss-chat-tab {
            background: #333;
            border-color: #555;
            color: #eee;
        }

        body.dark #lss-chat-manager-tabs .lss-chat-tab:hover,
        body.dark-mode #lss-chat-manager-tabs .lss-chat-tab:hover {
            background: #444;
        }

        body.dark #lss-chat-manager-tabs .lss-chat-tab.active,
        body.dark-mode #lss-chat-manager-tabs .lss-chat-tab.active {
            background: #555;
        }
    `;
        document.head.appendChild(style);
    }

    function getCategory(message) {
        if (!(message instanceof HTMLElement)) return null;
        if (message.matches('li.chatWhisper')) {
            return 'whispers';
        }
        if (message.querySelector('a[href*="/missions/"]')) {
            return 'missions';
        }
        return 'chat';
    }

    function getMessages() {
        if (!chatMessages) return [];
        return Array.from(chatMessages.querySelectorAll(':scope > li[id^="chat_message_"]'));
    }

    function updateTabText(category) {
        const tab = tabsContainer?.querySelector(`[data-category="${category}"]`);
        if (!tab) return;
        const count = categories[category].unread;
        const label = categories[category].label;
        tab.innerHTML = label + (count > 0 ? `<span class="lss-chat-unread">(${count})</span>` : '');
        tab.classList.toggle('unread', count > 0 && activeCategory !== category);
    }

    function updateAllTabs() {
        Object.keys(categories).forEach(updateTabText);
    }

    function updateActiveCategory() {
        getMessages().forEach(message => {
            const category = getCategory(message);
            message.style.display = category === activeCategory ? '' : 'none';
        });
        Object.keys(categories).forEach(category => {
            const tab = tabsContainer?.querySelector(`[data-category="${category}"]`);
            if (tab) tab.classList.toggle('active', category === activeCategory);
        });
    }

    function selectCategory(category) {
        if (!categories[category]) return;
        activeCategory = category;
        localStorage.setItem(STORAGE_KEY, category);
        categories[category].unread = 0;
        updateActiveCategory();
        updateAllTabs();
    }

    function handleMessage(message, isInitialLoad = false) {
        if (!(message instanceof HTMLElement)) return;
        if (!message.matches('li[id^="chat_message_"]')) return;
        const category = getCategory(message);
        if (!category) return;
        message.dataset.lssChatCategory = category;
        if (!isInitialLoad && category !== activeCategory) {
            categories[category].unread++;
            updateTabText(category);
        }
        message.style.display = category === activeCategory ? '' : 'none';
    }

    function createTabs() {
        if (document.getElementById('lss-chat-manager-tabs')) return;
        const heading = document.querySelector(CHAT_HEADER);
        if (!heading) return;
        const chatTextNodes = Array.from(heading.childNodes).filter(node =>
                                                                    node.nodeType === Node.TEXT_NODE && node.textContent.trim() === 'Chat'
                                                                   );

        tabsContainer = document.createElement('div');
        tabsContainer.id = 'lss-chat-manager-tabs';

        Object.entries(categories).forEach(([category, data]) => {
            const tab = document.createElement('a');
            tab.href = '#';
            tab.className = 'lss-chat-tab';
            tab.dataset.category = category;
            tab.textContent = data.label;

            tab.addEventListener('click', event => {
                event.preventDefault();
                selectCategory(category);
            });

            tabsContainer.appendChild(tab);
        });

        const referenceNode = chatTextNodes[0];

        if (referenceNode) {
            referenceNode.parentNode.insertBefore(tabsContainer, referenceNode.nextSibling);
        } else {
            heading.insertBefore(tabsContainer, heading.firstChild);
        }

        updateAllTabs();
    }

    function initializeMessages() {
        getMessages().forEach(message => handleMessage(message, true));
        updateActiveCategory();
    }

    function startObserver() {
        if (!chatMessages || observer) return;

        observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (!(node instanceof HTMLElement)) return;

                    if (node.matches('li[id^="chat_message_"]')) {
                        handleMessage(node);
                        return;
                    }

                    node.querySelectorAll?.('li[id^="chat_message_"]').forEach(message => {
                        handleMessage(message);
                    });
                });
            });
        });
        observer.observe(chatMessages, {
            childList: true
        });
    }

    function initialize() {
        chatMessages = document.querySelector(CHAT_MESSAGES);

        if (!chatMessages) return;

        injectStyles();
        createTabs();

        if (!tabsContainer) return;

        initializeMessages();
        startObserver();
    }

    function waitForChat() {
        if (document.querySelector(CHAT_MESSAGES) && document.querySelector(CHAT_HEADER)) {
            initialize();
            return;
        }
        setTimeout(waitForChat, 500);
    }

    waitForChat();
})();
