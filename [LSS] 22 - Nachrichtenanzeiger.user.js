// ==UserScript==
// @name         [LSS] Nachrichtenanzeiger
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Zeigt die älteste Nachricht je Einsatz in der Einsatzliste an
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/
// @grant        GM_xmlhttpRequest
// @connect      leitstellenspiel.de
// ==/UserScript==

(function() {
    'use strict';

    console.log('[LSS-Nachrichtenanzeiger] Skript gestartet');

    const lastMessages = {}; // Speichert letzte bekannte Nachricht pro Einsatz-ID

    function updateMessages() {
        console.log('LSS-Nachrichtenanzeiger] Überprüfe Einsatznachrichten…');

        const entries = document.querySelectorAll('.missionSideBarEntry');
        const isDarkMode = document.body.classList.contains('dark');
        const textColor = isDarkMode ? '#ddd' : '#333';

        entries.forEach(entry => {
            const missionLink = entry.querySelector('a[href*="/missions/"]');
            if (!missionLink) return;

            const match = missionLink.href.match(/\/missions\/(\d+)/);
            if (!match) return;

            const missionId = match[1];
            const url = `/missions/${missionId}`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');

                    const replies = doc.querySelectorAll('#mission_replies li');
                    const lastReply = replies[replies.length - 1];

                    if (lastReply) {
                        const messageText = lastReply.textContent.trim();

                        // Nur loggen, wenn Nachricht sich geändert hat
                        if (lastMessages[missionId] !== messageText) {
                            console.log(`LSS-Nachrichtenanzeiger] Neuer Text bei Einsatz ${missionId}:`, messageText);
                            lastMessages[missionId] = messageText;

                            const existingBox = entry.querySelector('.lss-message-box');
                            if (existingBox) {
                                existingBox.textContent = '🗨️ ' + messageText;
                            } else {
                                const infoBox = document.createElement('div');
                                infoBox.className = 'lss-message-box';
                                infoBox.style.fontSize = '0.9em';
                                infoBox.style.color = textColor;
                                infoBox.style.marginTop = '4px';
                                infoBox.style.fontWeight = 'bold';
                                infoBox.textContent = '🗨️ ' + messageText;
                                entry.appendChild(infoBox);
                            }
                        }
                    }
                }
            });
        });
    }

    // Erste Ausführung
    setTimeout(updateMessages, 2000);

    // Regelmäßige Aktualisierung
    setInterval(updateMessages, 1 * 60 * 1000); // alle 3 Minuten
})();
