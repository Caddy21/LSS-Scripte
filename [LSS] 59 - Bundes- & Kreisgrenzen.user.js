// ==UserScript==
// @name         [LSS] Bundes- & Kreisgrenzen
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Zeigt die Grenzen von Bundes- und Kreisgrenzen an
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let bundeslaenderLayerMap = {};
    let kreiseLayerMap = {};
    let panelVisible = false;
    let overlay, leftCol, rightCol;

    const bundeslaenderURL = "https://cdn.jsdelivr.net/gh/isellsoap/deutschlandGeoJSON@main/2_bundeslaender/4_niedrig.geo.json";
    const kreiseURL        = "https://cdn.jsdelivr.net/gh/isellsoap/deutschlandGeoJSON@main/4_kreise/4_niedrig.geo.json";
    const bundeslaenderStyle = { color: "#ff0000", weight: 2, fillOpacity: 0 };
    const kreiseStyle        = { color: "#0000ff", weight: 1, fillOpacity: 0 };
    const STORAGE_KEY = "LSS_LayerOverlaySelection";

    function waitForLeaflet() {
        if(typeof L !== "undefined" && typeof window.map !== "undefined"){
            addLayerButton();
            restoreSelectionOnMap();
        } else {
            setTimeout(waitForLeaflet, 500);
        }
    }

    waitForLeaflet();

    function addLayerButton(){
        const LayerControl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                container.style.backgroundColor = 'white';
                container.style.width = '26px';
                container.style.height = '26px';
                container.style.cursor = 'pointer';
                container.style.textAlign = 'center';
                container.style.fontSize = '16px';
                container.title = "Layer Overlay öffnen";
                container.innerHTML = '🗺️';
                container.onclick = function(e){
                    L.DomEvent.stopPropagation(e);
                    toggleOverlay();
                };
                return container;
            }
        });
        window.map.addControl(new LayerControl());
    }

    function toggleOverlay(){
        if(panelVisible){
            overlay.remove();
            panelVisible = false;
        } else {
            createOverlay();
            panelVisible = true;
        }
    }

    function createOverlay(){
        overlay = document.createElement('div');
        overlay.id = 'layerOverlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '50px';
        overlay.style.left = '50%';
        overlay.style.transform = 'translateX(-50%)';
        overlay.style.width = '500px';
        overlay.style.height = '600px';
        overlay.style.backgroundColor = document.body.classList.contains('dark') ? '#222' : '#fff';
        overlay.style.color = document.body.classList.contains('dark') ? '#fff' : '#000';
        overlay.style.border = '2px solid #666';
        overlay.style.zIndex = 9999;
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.boxShadow = '0 0 10px rgba(0,0,0,0.7)';
        overlay.style.padding = '5px';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '5px';

        const title = document.createElement('span');
        title.innerText = "Layer Overlay";
        title.style.fontWeight = 'bold';
        header.appendChild(title);

        const btnClose = document.createElement('button');
        btnClose.innerText = 'X';
        btnClose.onclick = () => { toggleOverlay(); };
        btnClose.classList.add('btn', 'btn-danger');
        header.appendChild(btnClose);

        overlay.appendChild(header);

        const bodyDiv = document.createElement('div');
        bodyDiv.style.display = 'flex';
        bodyDiv.style.flex = '1';
        bodyDiv.style.overflow = 'hidden';

        leftCol = document.createElement('div');
        leftCol.style.flex = '1';
        leftCol.style.overflowY = 'auto';
        leftCol.style.borderRight = '1px solid #ccc';
        leftCol.style.padding = '5px';

        rightCol = document.createElement('div');
        rightCol.style.flex = '1';
        rightCol.style.overflowY = 'auto';
        rightCol.style.padding = '5px';

        bodyDiv.appendChild(leftCol);
        bodyDiv.appendChild(rightCol);
        overlay.appendChild(bodyDiv);

        const footer = document.createElement('div');
        footer.style.textAlign = 'right';
        footer.style.marginTop = '5px';
        const btnSave = document.createElement('button');
        btnSave.innerText = 'Speichern';
        btnSave.onclick = saveSelection;
        btnSave.classList.add('btn', 'btn-success');
        footer.appendChild(btnSave);
        overlay.appendChild(footer);

        document.body.appendChild(overlay);

        loadBundeslaender();
    }

    function loadBundeslaender(){
        fetch(bundeslaenderURL)
            .then(res => {
                if(!res.ok) throw new Error("Bundesländer GeoJSON konnte nicht geladen werden: " + res.status);
                return res.json();
            })
            .then(data => {
                const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                data.features.forEach(bl => {
                    const blId = bl.properties.id;
                    const blName = bl.properties.name;
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.id = 'bl_' + blId;
                    cb.style.marginRight = '5px';
                    if(saved.bundeslaender && saved.bundeslaender.includes(blId)) cb.checked = true;

                    cb.onchange = function(e){
                        if(e.target.checked){
                            if(!bundeslaenderLayerMap[blId]){
                                bundeslaenderLayerMap[blId] = L.geoJSON(bl, {style: bundeslaenderStyle}).addTo(window.map);
                            }
                            loadKreiseForBundesland(blName, saved.kreise);
                        } else {
                            if(bundeslaenderLayerMap[blId]){
                                window.map.removeLayer(bundeslaenderLayerMap[blId]);
                                delete bundeslaenderLayerMap[blId];
                            }
                            clearRightColumn();
                        }
                    };

                    const label = document.createElement('label');
                    label.htmlFor = cb.id;
                    label.innerText = blName;
                    label.style.display = 'block';
                    label.style.cursor = 'pointer';
                    label.style.marginBottom = '2px';
                    label.prepend(cb);
                    leftCol.appendChild(label);

                    if(cb.checked) cb.onchange({target: cb});
                });
            })
            .catch(err => console.error("[ERROR] Bundesländer fetch:", err));
    }

    function loadKreiseForBundesland(blName, savedKreise = null, restoreMode = false){
        if(!savedKreise){
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            savedKreise = saved.kreise || [];
        }

        if(!restoreMode) clearRightColumn();

        fetch(kreiseURL)
            .then(res => res.json())
            .then(data => {
                const kreiseGefiltert = data.features
                    .filter(k => k.properties.NAME_1 === blName)
                    .sort((a,b) => a.properties.NAME_3.localeCompare(b.properties.NAME_3));

                kreiseGefiltert.forEach(kreis => {
                    const kreisName = kreis.properties.NAME_3;

                    // Direkt Layer setzen, wenn restoreMode
                    if(restoreMode && savedKreise.includes(kreisName) && !kreiseLayerMap[kreisName]){
                        kreiseLayerMap[kreisName] = L.geoJSON(kreis, {style: kreiseStyle}).addTo(window.map);
                    }

                    if(panelVisible){
                        const cb = document.createElement('input');
                        cb.type = 'checkbox';
                        cb.id = 'kreis_' + kreisName.replace(/\s/g,'_');
                        cb.style.marginRight = '5px';
                        if(savedKreise.includes(kreisName)) cb.checked = true;

                        cb.onchange = function(e){
                            if(e.target.checked){
                                if(!kreiseLayerMap[kreisName]){
                                    kreiseLayerMap[kreisName] = L.geoJSON(kreis, {style: kreiseStyle}).addTo(window.map);
                                }
                            } else {
                                if(kreiseLayerMap[kreisName]){
                                    window.map.removeLayer(kreiseLayerMap[kreisName]);
                                    delete kreiseLayerMap[kreisName];
                                }
                            }
                        };

                        const label = document.createElement('label');
                        label.htmlFor = cb.id;
                        label.innerText = kreisName;
                        label.style.display = 'block';
                        label.style.cursor = 'pointer';
                        label.style.marginBottom = '2px';
                        label.prepend(cb);
                        rightCol.appendChild(label);

                        if(cb.checked) cb.onchange({target: cb});
                    }
                });
            })
            .catch(err => console.error("[ERROR] Kreise fetch:", err));
    }

    function clearRightColumn(){
        while(rightCol.firstChild) rightCol.removeChild(rightCol.firstChild);
    }

    function saveSelection(){
        const selectedBL = [];
        const selectedKreise = [];
        leftCol.querySelectorAll('input[type=checkbox]').forEach(cb => { if(cb.checked) selectedBL.push(cb.id.replace('bl_','')); });
        rightCol.querySelectorAll('input[type=checkbox]').forEach(cb => { if(cb.checked) selectedKreise.push(cb.id.replace('kreis_','')); });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({bundeslaender: selectedBL, kreise: selectedKreise}));
        alert("Layer-Auswahl gespeichert!");
    }

    function restoreSelectionOnMap() {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if(!saved.bundeslaender) return;

        fetch(bundeslaenderURL)
            .then(res => res.json())
            .then(data => {
                data.features.forEach(bl => {
                    const blId = bl.properties.id;
                    const blName = bl.properties.name;
                    if(saved.bundeslaender.includes(blId)) {
                        bundeslaenderLayerMap[blId] = L.geoJSON(bl, {style: bundeslaenderStyle}).addTo(window.map);
                        // restoreMode = true -> Kreise-Layer direkt auf Karte
                        loadKreiseForBundesland(blName, saved.kreise, true);
                    }
                });
            })
            .catch(err => console.error("[ERROR] Restore Bundesländer:", err));
    }
})();
