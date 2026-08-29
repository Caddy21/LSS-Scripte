// ==UserScript==
// @name         [LSS] POI-Manager
// @namespace    https://github.com/Caddy21/LSS-Scripte
// @version      0.6.0
// @description  OSM-basierte Massenverwaltung von POIs für Leitstellenspiel mit Nominatim, Overpass und vollständigem LSS-POI-Import.
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/pois*
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Konfiguration
    const DEBUG = true;
    const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
    const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
    const LSS_CREATE_POI_URL = '/mission_positions';
    const LSS_POI_API_URL = '/pois/pois_json';
    const DEFAULT_SELECTED_OSM_TYPES = [
        2, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15,
        16, 18, 19, 20, 21, 22, 23, 25, 27, 28, 29,
        30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
        41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
        52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62,
        63, 64, 65, 66
    ];
    const DEFAULT_RADIUS_KM = 5;
    const MIN_RADIUS_KM = 0.5;
    const MAX_RADIUS_KM = 20;
    const RADIUS_STEP_KM = 0.5;
    const OVERPASS_TIMEOUT = 120;
    const MAX_OVERPASS_RESULTS = 10000;
    const OVERPASS_QUERY_COOLDOWN = 15000;
    const CREATE_REQUEST_DELAY = 150;
    const DUPLICATE_DISTANCE_METERS = 30;
    const MAX_NOMINATIM_RESULTS = 8;
    const LSS_POI_PAGE_SIZE = 5000;
    const LSS_POI_REQUEST_DELAY = 100;
    const DB_NAME = 'LSS_POI_Manager';
    const DB_VERSION = 1;
    const DB_STORE = 'pois';
    const POI_TYPES = {
        0: 'Park',
        1: 'See',
        2: 'Krankenhaus',
        3: 'Wald',
        4: 'Bushaltestelle',
        5: 'Straßenbahnhaltestelle',
        6: 'Bahnhof (Regionalverkehr)',
        7: 'Bahnhof (Regional und Fernverkehr)',
        8: 'Güterbahnhof',
        9: 'Supermarkt (Klein)',
        10: 'Supermarkt (Groß)',
        11: 'Tankstelle',
        12: 'Schule',
        13: 'Museum',
        14: 'Einkaufszentrum',
        15: 'Auto-Werkstatt',
        16: 'Autobahnauf.- / abfahrt',
        17: 'Weihnachtsmarkt',
        18: 'Lagerhalle',
        19: 'Diskothek',
        20: 'Stadion',
        21: 'Bauernhof',
        22: 'Bürokomplex',
        23: 'Schwimmbad',
        24: 'Bahnübergang',
        25: 'Theater',
        26: 'Festplatz',
        27: 'Fluss',
        28: 'Baumarkt',
        29: 'Flughafen (klein): Start-/Landebahn',
        30: 'Flughafen (klein): Gebäude',
        31: 'Flughafen (klein): Flugzeug Standplatz',
        32: 'Flughafen (groß): Start-/Landebahn',
        33: 'Flughafen (groß): Terminal',
        34: 'Flughafen (groß): Vorfeld / Standplätze',
        35: 'Flughafen (groß): Parkhaus',
        36: 'Biogasanlage',
        37: 'Bank',
        38: 'Kirche',
        39: 'Chemiepark',
        40: 'Industrie-Allgemein',
        41: 'Automobilindustrie',
        42: 'Müllverbrennungsanlage',
        43: 'Eishalle',
        44: 'Holzverarbeitung',
        45: 'Motorsportanlage',
        46: 'Tunnel',
        47: 'Klärwerk',
        48: 'Innenstadt',
        49: 'Möbelhaus',
        50: 'Campingplatz',
        51: 'Kompostieranlage',
        52: 'Textilverarbeitung',
        53: 'Moor',
        54: 'Hüttenwerk',
        55: 'Kraftwerk',
        56: 'Werksgelände',
        57: 'Seilbahn',
        58: 'Brücke',
        59: 'U-Bahn Station',
        60: 'Eisenbahntunnel',
        61: 'Zoo',
        62: 'Kohlekraftwerk',
        63: 'JVA',
        64: 'Solarpark',
        65: 'Raffinerie',
        66: 'Schiffswerft'
    };
    const OSM_MAPPING = [
        { tags: { amenity: 'hospital' }, type: 2 },
        { tags: { amenity: 'clinic' }, type: 2 },
        { tags: { railway: 'station', station: 'subway' }, type: 59 },
        { tags: { railway: 'station', usage: 'main' }, type: 7 },
        { tags: { railway: 'station' }, type: 6 },
        { tags: { railway: 'halt' }, type: 6 },
        { tags: { railway: 'tram_stop' }, type: 5 },
        { tags: { railway: 'level_crossing' }, type: 24 },
        { tags: { highway: 'bus_stop' }, type: 4 },
        { tags: { amenity: 'bus_station' }, type: 4 },
        { tags: { aeroway: 'terminal' }, type: 33 },
        { tags: { aeroway: 'aerodrome', aerodrome: 'international' }, type: 32 },
        { tags: { aeroway: 'aerodrome' }, type: 29 },
        { tags: { aeroway: 'runway' }, type: 29 },
        { tags: { amenity: 'university' }, type: 12 },
        { tags: { amenity: 'college' }, type: 12 },
        { tags: { amenity: 'school' }, type: 12 },
        { tags: { building: 'school' }, type: 12 },
        { tags: { shop: 'supermarket' }, type: 10 },
        { tags: { shop: 'convenience' }, type: 9 },
        { tags: { shop: 'kiosk' }, type: 9 },
        { tags: { shop: 'department_store' }, type: 14 },
        { tags: { shop: 'mall' }, type: 14 },
        { tags: { shop: 'furniture' }, type: 49 },
        { tags: { shop: 'doityourself' }, type: 28 },
        { tags: { shop: 'hardware' }, type: 28 },
        { tags: { shop: 'car_repair' }, type: 15 },
        { tags: { amenity: 'fuel' }, type: 11 },
        { tags: { amenity: 'bank' }, type: 37 },
        { tags: { building: 'cathedral' }, type: 38 },
        { tags: { building: 'church' }, type: 38 },
        {
            tags: { amenity: 'place_of_worship' },
            type: 38,
            excludeIf: [
                { building: 'chapel' },
                { place_of_worship: 'chapel' },
                { amenity: 'wayside_shrine' },
                { amenity: 'wayside_cross' },
                { tourism: 'wayside_shrine' },
                { historic: 'wayside_cross' },
                { historic: 'wayside_shrine' },
                { man_made: 'cross' }
            ]
        },
        { tags: { leisure: 'water_park' }, type: 23 },
        {
            tags: { leisure: 'swimming_pool' },
            type: 23,
            requireAny: [
                { access: 'public' },
                { access: 'yes' },
                { fee: 'yes' },
                { amenity: 'public_bath' },
                { sport: 'swimming' }
            ]
        },
        {
            tags: { amenity: 'swimming_pool' },
            type: 23,
            requireAny: [
                { access: 'public' },
                { access: 'yes' },
                { fee: 'yes' },
                { sport: 'swimming' }
            ]
        },
        { tags: { amenity: 'public_bath' }, type: 23 },
        { tags: { leisure: 'ice_rink' }, type: 43 },
        {
            tags: { leisure: 'stadium' },
            type: 20,
            excludeIf: [
                { indoor: 'yes' },
                { building: 'sports_hall' },
                { building: 'gym' },
                { sport: 'fitness' },
                { sport: 'gymnastics' },
                { leisure: 'fitness_centre' },
                { leisure: 'fitness_station' }
            ]
        },
        { tags: { amenity: 'theatre' }, type: 25 },
        { tags: { amenity: 'cinema' }, type: 25 },
        { tags: { amenity: 'nightclub' }, type: 19 },
        { tags: { tourism: 'museum' }, type: 13 },
        { tags: { tourism: 'zoo' }, type: 61 },
        { tags: { tourism: 'camp_site' }, type: 50 },
        { tags: { tourism: 'caravan_site' }, type: 50 },
        { tags: { leisure: 'park' }, type: 0 },
        { tags: { leisure: 'garden' }, type: 0 },
        { tags: { landuse: 'forest' }, type: 3 },
        { tags: { natural: 'wood' }, type: 3 },
        { tags: { natural: 'water', water: 'lake' }, type: 1 },
        { tags: { natural: 'water', water: 'reservoir' }, type: 1 },
        { tags: { natural: 'water' }, type: 1 },
        { tags: { natural: 'wetland', wetland: 'bog' }, type: 53 },
        { tags: { natural: 'wetland' }, type: 53 },
        { tags: { waterway: 'river' }, type: 27 },
        { tags: { waterway: 'stream' }, type: 27 },
        { tags: { power: 'plant', plant_source: 'coal' }, type: 62 },
        { tags: { power: 'plant', plant_source: 'solar' }, type: 64 },
        { tags: { power: 'plant', plant_source: 'biogas' }, type: 36 },
        { tags: { power: 'plant' }, type: 55 },
        { tags: { man_made: 'wastewater_plant' }, type: 47 },
        { tags: { man_made: 'works' }, type: 56 },
        { tags: { industrial: 'shipyard' }, type: 66 },
        { tags: { man_made: 'shipyard' }, type: 66 },
        { tags: { landuse: 'industrial' }, type: 40 },
        { tags: { building: 'industrial' }, type: 40 },
        { tags: { building: 'warehouse' }, type: 18 },
        { tags: { landuse: 'warehouse' }, type: 18 },
        { tags: { aerialway: 'gondola' }, type: 57 },
        { tags: { aerialway: 'cable_car' }, type: 57 },
        { tags: { highway: 'motorway_junction' }, type: 16 },
        { tags: { landuse: 'farmyard' }, type: 21 },
        { tags: { building: 'farm' }, type: 21 },
        { tags: { amenity: 'prison' }, type: 63 },
        { tags: { leisure: 'motorsport' }, type: 45 },
        { tags: { landuse: 'solar_farm' }, type: 64 },
        { tags: { building: 'office' }, type: 22 },
        { tags: { office: 'government' }, type: 22 },
        { tags: { office: 'company' }, type: 22 },
        { tags: { office: 'yes' }, type: 22 },
        { tags: { building: 'commercial' }, type: 22 },
        { tags: { landuse: 'commercial' }, type: 22 },
        { tags: { man_made: 'bridge' }, type: 58 },
        { tags: { bridge: 'aqueduct' }, type: 58 }
    ];

    let modal = null;
    let currentLocation = null;
    let currentResults = [];
    let existingLSSPois = [];
    let searchRunning = false;
    let creationRunning = false;
    let lssPoiSyncRunning = false;
    let lastOverpassQueryTime = 0;
    let dbPromise = null;
    let existingPoiSpatialIndex = null;
    let creationCancelled = false;

    // Debug
    function log(...args) {
        if (DEBUG) {
            console.log('[LSS] POI-Manager:', ...args);
        }
    }
    function warn(...args) {
        if (DEBUG) {
            console.warn('[LSS] POI-Manager:', ...args);
        }
    }
    function error(...args) {
        console.error('[LSS] POI-Manager:', ...args);
    }

    // Hilfsfunktionen
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return '';
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function formatNumber(value) {
        return Number(value || 0).toLocaleString('de-DE');
    }
    function formatDistance(meters) {
        if (meters === null || meters === undefined) {
            return '';
        }

        if (meters < 1000) {
            return `${Math.round(meters)} m`;
        }

        return `${(meters / 1000).toFixed(2)} km`;
    }
    function normalizeRadius(value) {
        let radius = Number(value);

        if (!Number.isFinite(radius)) {
            radius = DEFAULT_RADIUS_KM;
        }

        radius = Math.round(radius / RADIUS_STEP_KM) * RADIUS_STEP_KM;
        radius = Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, radius));

        return Number(radius.toFixed(1));
    }
    function distanceMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;

        const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) *
              Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;

        return 2 * R * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );
    }
    function getOsmCoordinates(element) {
        if (element.type === 'node') {
            return {
                latitude: Number(element.lat),
                longitude: Number(element.lon)
            };
        }

        if (
            element.center &&
            Number.isFinite(Number(element.center.lat)) &&
            Number.isFinite(Number(element.center.lon))
        ) {
            return {
                latitude: Number(element.center.lat),
                longitude: Number(element.center.lon)
            };
        }

        return null;
    }

    // Mapping prüfen
    function tagsMatch(tags, required) {
        return Object.entries(required).every(([key, value]) =>
                                              String(tags?.[key] ?? '').toLowerCase() ===
                                              String(value).toLowerCase()
                                             );
    }
    function matchesExclude(tags, excludeIf) {
        if (!Array.isArray(excludeIf)) {
            return false;
        }

        return excludeIf.some(condition =>
                              tagsMatch(tags, condition)
                             );
    }
    function matchesRequireAny(tags, requireAny) {
        if (!Array.isArray(requireAny) || !requireAny.length) {
            return true;
        }

        return requireAny.some(condition =>
                               tagsMatch(tags, condition)
                              );
    }
    function mapOsmElement(element) {
        const tags = element.tags || {};

        for (const mapping of OSM_MAPPING) {
            if (!tagsMatch(tags, mapping.tags)) {
                continue;
            }

            if (matchesExclude(tags, mapping.excludeIf)) {
                continue;
            }

            if (!matchesRequireAny(tags, mapping.requireAny)) {
                continue;
            }

            return {
                type: mapping.type,
                caption:
                POI_TYPES[mapping.type] ||
                `POI-Typ ${mapping.type}`
            };
        }

        return null;
    }

    // API abrufen
    async function fetchJson(url, options = {}) {
        log('Request:', url);

        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status} ${response.statusText}`
            );
        }

        const text = await response.text();

        if (!text.trim()) {
            throw new Error('Leere Serverantwort.');
        }

        try {
            return JSON.parse(text);
        } catch (err) {
            console.error(text.substring(0, 1000));
            throw new Error(
                'Server lieferte kein gültiges JSON.'
            );
        }
    }

    // Nominatim
    async function searchLocation(query) {
        if (!query.trim()) {
            throw new Error(
                'Bitte einen Ort oder eine Adresse eingeben.'
            );
        }

        const params = new URLSearchParams();

        params.set('q', query.trim());
        params.set('format', 'jsonv2');
        params.set('addressdetails', '1');
        params.set(
            'limit',
            String(MAX_NOMINATIM_RESULTS)
        );
        params.set('countrycodes', 'de');

        const url =
              `${NOMINATIM_URL}?${params.toString()}`;

        return fetchJson(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
    }

    // Overpass Query erzeugen
    function buildOverpassQuery(latitude, longitude, radiusKm, selectedTypes) {
        const radius = Math.round(radiusKm * 1000);

        const selectedTypeSet = new Set(
            [...selectedTypes].map(Number)
        );

        const tagQueries = OSM_MAPPING
        .filter(mapping => selectedTypeSet.has(Number(mapping.type)))
        .map(mapping =>
             Object.entries(mapping.tags)
             .map(([key, value]) => {
            const escapedKey = key.replace(/"/g, '\\"');
            const escapedValue = String(value).replace(/"/g, '\\"');

            return `[${escapedKey}="${escapedValue}"]`;
        })
             .join('')
            )
        .filter(Boolean);

        const uniqueQueries = [...new Set(tagQueries)];

        if (!uniqueQueries.length) {
            throw new Error(
                'Keine POI-Typen für die OSM-Abfrage ausgewählt.'
            );
        }

        const blocks = uniqueQueries.map(
            selector =>
            `nwr(around:${radius},${latitude},${longitude})${selector};`
        );

        return `
[out:json][timeout:${OVERPASS_TIMEOUT}];

(
${blocks.join('\n')}
);

out center tags;
    `.trim();
    }

    // Overpass
    async function searchOverpass(location, radiusKm, selectedTypes) {
        const now = Date.now();
        const elapsed = now - lastOverpassQueryTime;

        if (elapsed < OVERPASS_QUERY_COOLDOWN) {
            const remaining = Math.ceil(
                (OVERPASS_QUERY_COOLDOWN - elapsed) / 1000
            );

            throw new Error(
                `Bitte noch ${remaining} Sekunden warten, bevor eine weitere Overpass-Abfrage gestartet wird.`
            );
        }

        if (!selectedTypes || !selectedTypes.size) {
            throw new Error(
                'Bitte mindestens einen POI-Typ für die OSM-Abfrage auswählen.'
            );
        }

        lastOverpassQueryTime = now;

        const query = buildOverpassQuery(
            location.latitude,
            location.longitude,
            radiusKm,
            selectedTypes
        );

        log(
            `Starte Overpass-Abfrage mit ${selectedTypes.size} ausgewählten POI-Typen.`
        );

        log('Overpass Query:', query);

        const response = await fetch(OVERPASS_URL, {
            method: 'POST',
            headers: {
                'Content-Type':
                'application/x-www-form-urlencoded;charset=UTF-8',
                'Accept': 'application/json'
            },
            body: `data=${encodeURIComponent(query)}`
        });

        if (!response.ok) {
            throw new Error(
                `Overpass HTTP ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data.elements)) {
            throw new Error(
                'Overpass lieferte keine gültige Element-Liste.'
            );
        }

        log(
            `Overpass lieferte ${data.elements.length} Elemente.`
        );

        const originalCount = data.elements.length;

        if (originalCount > MAX_OVERPASS_RESULTS) {
            warn(
                `Overpass lieferte ${originalCount} Elemente. ` +
                `Es werden maximal ${MAX_OVERPASS_RESULTS} verarbeitet.`
            );

            data.elements = data.elements.slice(
                0,
                MAX_OVERPASS_RESULTS
            );

            data._lssPoiManagerLimited = true;
            data._lssPoiManagerOriginalCount = originalCount;
        }

        return data;
    }

    // OSM-Daten verarbeiten
    function processOverpassResults(elements, center) {
        const results = [];
        const seen = new Set();

        for (const element of elements || []) {
            const mapped =
                  mapOsmElement(element);

            if (!mapped) {
                continue;
            }

            const coordinates =
                  getOsmCoordinates(element);

            if (!coordinates) {
                continue;
            }

            if (
                !Number.isFinite(coordinates.latitude) ||
                !Number.isFinite(coordinates.longitude)
            ) {
                continue;
            }

            const osmKey =
                  `${element.type}/${element.id}`;

            if (seen.has(osmKey)) {
                continue;
            }

            seen.add(osmKey);

            const tags = element.tags || {};

            const name =
                  tags.name ||
                  tags['name:de'] ||
                  '';

            const address =
                  buildOsmAddress(tags);

            const distance =
                  distanceMeters(
                      center.latitude,
                      center.longitude,
                      coordinates.latitude,
                      coordinates.longitude
                  );

            results.push({
                osmType: element.type,
                osmId: element.id,
                osmKey,
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                type: mapped.type,
                typeName: mapped.caption,
                name,
                address,
                tags,
                distance,
                duplicate: false
            });
        }

        results.sort(
            (a, b) =>
            a.distance - b.distance
        );

        return results;
    }

    // OSM-Adresse
    function buildOsmAddress(tags) {
        const parts = [];

        const street =
              tags['addr:street'];

        const house =
              tags['addr:housenumber'];

        if (street) {
            parts.push(
                house
                ? `${street} ${house}`
                : street
            );
        }

        if (tags['addr:postcode']) {
            parts.push(
                tags['addr:postcode']
            );
        }

        if (tags['addr:city']) {
            parts.push(
                tags['addr:city']
            );
        }

        return parts.join(', ');
    }
    function openPoiDatabase() {
        if (dbPromise) {
            return dbPromise;
        }

        dbPromise = new Promise(
            (resolve, reject) => {
                const request =
                      indexedDB.open(
                          DB_NAME,
                          DB_VERSION
                      );

                request.onupgradeneeded =
                    event => {
                    const db =
                          event.target.result;

                    if (
                        !db.objectStoreNames.contains(
                            DB_STORE
                        )
                    ) {
                        db.createObjectStore(
                            DB_STORE,
                            {
                                keyPath: 'id'
                            }
                        );
                    }
                };

                request.onsuccess =
                    event => {
                    log(
                        'IndexedDB geöffnet.'
                    );

                    resolve(
                        event.target.result
                    );
                };

                request.onerror =
                    event => {
                    error(
                        'IndexedDB konnte nicht geöffnet werden:',
                        event.target.error
                    );

                    reject(
                        event.target.error
                    );
                };
            }
        );

        return dbPromise;
    }
    async function clearPoiDatabase() {
        const db =
              await openPoiDatabase();

        return new Promise(
            (resolve, reject) => {
                const transaction =
                      db.transaction(
                          DB_STORE,
                          'readwrite'
                      );

                const request =
                      transaction
                .objectStore(DB_STORE)
                .clear();

                request.onsuccess =
                    () => resolve();

                request.onerror =
                    event =>
                reject(
                    event.target.error
                );
            }
        );
    }
    async function getCachedPoiCount() {
        const db =
              await openPoiDatabase();

        return new Promise(
            (resolve, reject) => {
                const transaction =
                      db.transaction(
                          DB_STORE,
                          'readonly'
                      );

                const request =
                      transaction
                .objectStore(DB_STORE)
                .count();

                request.onsuccess =
                    () =>
                resolve(
                    request.result || 0
                );

                request.onerror =
                    event =>
                reject(
                    event.target.error
                );
            }
        );
    }
    async function getAllCachedPois() {
        const db =
              await openPoiDatabase();

        return new Promise(
            (resolve, reject) => {
                const transaction =
                      db.transaction(
                          DB_STORE,
                          'readonly'
                      );

                const request =
                      transaction
                .objectStore(DB_STORE)
                .getAll();

                request.onsuccess =
                    () =>
                resolve(
                    request.result || []
                );

                request.onerror =
                    event =>
                reject(
                    event.target.error
                );
            }
        );
    }
    async function putPoisIntoDatabase(pois) {
        if (!pois.length) {
            return;
        }

        const db =
              await openPoiDatabase();

        return new Promise(
            (resolve, reject) => {
                const transaction =
                      db.transaction(
                          DB_STORE,
                          'readwrite'
                      );

                const store =
                      transaction.objectStore(
                          DB_STORE
                      );

                for (const poi of pois) {
                    if (
                        poi &&
                        poi.id !== undefined &&
                        poi.id !== null
                    ) {
                        store.put(poi);
                    }
                }

                transaction.oncomplete =
                    () => resolve();

                transaction.onerror =
                    event =>
                reject(
                    event.target.error
                );

                transaction.onabort =
                    event =>
                reject(
                    event.target.error
                );
            }
        );
    }
    async function putPoiIntoDatabase(poi) {
        return putPoisIntoDatabase([poi]);
    }

    // Fortschritt für LSS-Import
    function updateLssPoiLoadProgress(loaded, total, message) {
        const progress =
              document.getElementById(
                  'lss-poi-manager-progress'
              );

        const bar =
              document.getElementById(
                  'lss-poi-manager-progress-bar'
              );

        const text =
              document.getElementById(
                  'lss-poi-manager-progress-text'
              );

        if (progress) {
            progress.style.display =
                'block';
        }

        let percentage = 0;

        if (total > 0) {
            percentage =
                Math.min(
                100,
                Math.round(
                    (loaded / total) * 100
                )
            );
        }

        if (bar) {
            bar.style.width =
                `${percentage}%`;

            bar.textContent =
                `${percentage}%`;
        }

        if (text) {
            text.textContent =
                message ||
                `${formatNumber(loaded)} / ${formatNumber(total)} LSS-POIs`;
        }
    }
    function hideLssPoiLoadProgress() {
        const progress =
              document.getElementById(
                  'lss-poi-manager-progress'
              );

        if (progress) {
            progress.style.display =
                'none';
        }
    }

    // Alle LSS-POIs über Paging laden
    async function loadAllLSSPoisFromApi() {
        let afterID = 0;
        let totalExpected = 0;
        let loaded = 0;
        let page = 0;

        const allPois = [];

        const seenIds = new Set();

        while (true) {
            page++;

            const params =
                  new URLSearchParams();

            params.set(
                'limit',
                String(LSS_POI_PAGE_SIZE)
            );

            params.set(
                'afterID',
                String(afterID)
            );

            const url =
                  `${LSS_POI_API_URL}?${params.toString()}`;

            log(
                `LSS-POI-Import Seite ${page}:`,
                url
            );

            const response =
                  await fetch(
                      url,
                      {
                          method: 'GET',
                          credentials: 'same-origin',
                          cache: 'no-store',
                          headers: {
                              'Accept':
                              'application/json'
                          }
                      }
                  );

            if (!response.ok) {
                throw new Error(
                    `LSS-POI-Abfrage HTTP ${response.status} ${response.statusText}`
                );
            }

            const json =
                  await response.json();

            const data =
                  Array.isArray(json)
            ? json
            : Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.pois)
            ? json.pois
            : [];

            const paging =
                  json?.paging_info || {};

            if (
                Number.isFinite(
                    Number(paging.count_total)
                )
            ) {
                totalExpected =
                    Number(
                    paging.count_total
                );
            }

            if (!data.length) {
                log(
                    'LSS-POI-Import beendet: keine weiteren Daten.'
                );

                break;
            }

            let addedThisPage = 0;

            for (const poi of data) {
                if (
                    poi?.id === undefined ||
                    poi?.id === null
                ) {
                    continue;
                }

                const id =
                      Number(poi.id);

                if (seenIds.has(id)) {
                    continue;
                }

                seenIds.add(id);
                allPois.push(poi);
                addedThisPage++;
            }

            loaded =
                allPois.length;

            updateLssPoiLoadProgress(
                loaded,
                totalExpected,
                `LSS-POIs werden geladen... ${formatNumber(loaded)}`
            );

            log(
                `Seite ${page}: ${addedThisPage} POIs, insgesamt ${loaded}/${totalExpected || '?'}.`
            );

            const lastId =
                  Number(
                      paging.last_id ??
                      data[data.length - 1]?.id
                  );

            if (
                !Number.isFinite(lastId) ||
                lastId <= 0
            ) {
                warn(
                    'Kein gültiger last_id gefunden. Import wird beendet.'
                );

                break;
            }

            if (lastId === afterID) {
                warn(
                    'afterID hat sich nicht verändert. Import wird beendet.'
                );

                break;
            }

            afterID = lastId;

            if (
                totalExpected > 0 &&
                loaded >= totalExpected
            ) {
                break;
            }

            if (
                data.length < LSS_POI_PAGE_SIZE
            ) {
                log(
                    'Letzte Seite erreicht.'
                );

                break;
            }

            if (LSS_POI_REQUEST_DELAY > 0) {
                await sleep(
                    LSS_POI_REQUEST_DELAY
                );
            }
        }

        updateLssPoiLoadProgress(
            loaded,
            totalExpected || loaded,
            `LSS-POIs geladen: ${formatNumber(loaded)}`
        );

        log(
            `LSS-POI-Gesamtimport abgeschlossen: ${loaded} POIs.`
        );

        return allPois;
    }

    // LSS-POIs laden und IndexedDB synchronisieren
    async function syncLSSPoisFromApi() {
        if (lssPoiSyncRunning) {
            return existingLSSPois;
        }

        lssPoiSyncRunning = true;

        try {
            showStatus(
                'Lade alle vorhandenen LSS-POIs über die API...',
                'info'
            );

            const pois =
                  await loadAllLSSPoisFromApi();

            updateLssPoiLoadProgress(
                pois.length,
                pois.length,
                `${formatNumber(pois.length)} LSS-POIs geladen – speichere IndexedDB...`
            );

            await clearPoiDatabase();

            // In sinnvollen Blöcken speichern
            const chunkSize = 1000;

            for (
                let i = 0;
                i < pois.length;
                i += chunkSize
            ) {
                const chunk =
                      pois.slice(
                          i,
                          i + chunkSize
                      );

                await putPoisIntoDatabase(
                    chunk
                );

                updateLssPoiLoadProgress(
                    i + chunk.length,
                    pois.length,
                    `Speichere LSS-POIs in IndexedDB... ${formatNumber(i + chunk.length)} / ${formatNumber(pois.length)}`
                );
            }

            existingLSSPois = pois;

            log(
                `IndexedDB-Synchronisierung abgeschlossen: ${existingLSSPois.length} POIs.`
            );

            updateExistingPoiStat();

            showStatus(
                `${formatNumber(existingLSSPois.length)} vorhandene LSS-POIs geladen und in IndexedDB gespeichert.`,
                'success'
            );

            return existingLSSPois;
        } finally {
            lssPoiSyncRunning = false;

            setTimeout(
                hideLssPoiLoadProgress,
                1000
            );
        }
    }

    // Cache laden
    async function loadLSSPoisFromCache() {
        try {
            const cached =
                  await getAllCachedPois();

            if (cached.length) {
                existingLSSPois =
                    cached;

                log(
                    `IndexedDB: ${cached.length} gecachte LSS-POIs geladen.`
                );

                updateExistingPoiStat();

                return cached;
            }

            log(
                'IndexedDB enthält noch keine LSS-POIs.'
            );
        } catch (err) {
            warn(
                'IndexedDB-Cache konnte nicht geladen werden:',
                err
            );
        }

        return [];
    }

    // Duplikatprüfung
    function createPoiSpatialIndex(pois) {
        const grid = new Map();

        const cellSize =
              DUPLICATE_DISTANCE_METERS;

        function cellKey(
        latitude,
         longitude
        ) {
            const latCell =
                  Math.floor(
                      latitude /
                      (cellSize / 111320)
                  );

            const lonMetersPerDegree =
                  111320 *
                  Math.cos(
                      latitude *
                      Math.PI / 180
                  );

            const lonDegreeSize =
                  lonMetersPerDegree > 1
            ? cellSize /
                  lonMetersPerDegree
            : cellSize / 111320;

            const lonCell =
                  Math.floor(
                      longitude /
                      lonDegreeSize
                  );

            return `${latCell}:${lonCell}`;
        }

        for (const poi of pois) {
            const latitude =
                  Number(poi.latitude);

            const longitude =
                  Number(poi.longitude);

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {
                continue;
            }

            const key =
                  cellKey(
                      latitude,
                      longitude
                  );

            if (!grid.has(key)) {
                grid.set(
                    key,
                    []
                );
            }

            grid.get(key).push(poi);
        }

        return {
            grid,
            cellKey
        };
    }
    function rebuildExistingPoiSpatialIndex() {
        existingPoiSpatialIndex =
            createPoiSpatialIndex(
            existingLSSPois
        );

        log(
            `POI-Spatial-Index aufgebaut: ${existingLSSPois.length} POIs.`
        );
    }
    function isDuplicate(poi, existingPois) {
        if (
            !existingPoiSpatialIndex ||
            existingPoiSpatialIndex.grid.size === 0
        ) {
            return existingPois.some(
                existing => {
                    const distance =
                          distanceMeters(
                              poi.latitude,
                              poi.longitude,
                              Number(existing.latitude),
                              Number(existing.longitude)
                          );

                    return (
                        distance <=
                        DUPLICATE_DISTANCE_METERS
                    );
                }
            );
        }

        const latitude =
              Number(poi.latitude);

        const longitude =
              Number(poi.longitude);

        const centerKey =
              existingPoiSpatialIndex.cellKey(
                  latitude,
                  longitude
              );

        const [
            centerLatCell,
            centerLonCell
        ] =
              centerKey
        .split(':')
        .map(Number);

        const candidates = [];

        for (
            let latOffset = -1;
            latOffset <= 1;
            latOffset++
        ) {
            for (
                let lonOffset = -1;
                lonOffset <= 1;
                lonOffset++
            ) {
                const key =
                      `${centerLatCell + latOffset}:${centerLonCell + lonOffset}`;

                const bucket =
                      existingPoiSpatialIndex.grid.get(
                          key
                      );

                if (bucket) {
                    candidates.push(
                        ...bucket
                    );
                }
            }
        }

        return candidates.some(
            existing => {
                const distance =
                      distanceMeters(
                          latitude,
                          longitude,
                          Number(existing.latitude),
                          Number(existing.longitude)
                      );

                return (
                    distance <=
                    DUPLICATE_DISTANCE_METERS
                );
            }
        );
    }
    async function checkDuplicates() {
        if (!existingLSSPois.length) {
            warn(
                'Keine vorhandenen LSS-POIs verfügbar.'
            );

            return;
        }

        rebuildExistingPoiSpatialIndex();

        for (const poi of currentResults) {
            poi.duplicate =
                isDuplicate(
                poi,
                existingLSSPois
            );
        }
    }

    // Berechtigung zum POI setzten holen
    function getLssCsrfToken() {
        // Rails/LSS Meta-Tag
        const metaToken = document.querySelector(
            'meta[name="csrf-token"]'
        );

        if (metaToken?.content) {
            return metaToken.content;
        }

        // Token aus einem vorhandenen Formular
        const hiddenToken = document.querySelector(
            'input[name="authenticity_token"]'
        );

        if (hiddenToken?.value) {
            return hiddenToken.value;
        }

        // Alternative Schreibweisen
        const tokenInput = document.querySelector(
            'input[name="csrf_token"], input[name="_csrf"]'
        );

        if (tokenInput?.value) {
            return tokenInput.value;
        }

        return null;
    }

    // POI erstellen
    async function createLSSPoi(poi) {
        const csrfToken = getLssCsrfToken();

        if (!csrfToken) {
            throw new Error(
                'Kein CSRF-Token gefunden. POI kann nicht erstellt werden.'
            );
        }

        const form = new URLSearchParams();

        form.set('utf8', '✓');

        // Wichtig: Rails authenticity_token
        form.set(
            'authenticity_token',
            csrfToken
        );

        form.set(
            'mission_position[poi_type]',
            String(poi.type)
        );

        form.set(
            'mission_position[latitude]',
            String(poi.latitude)
        );

        form.set(
            'mission_position[longitude]',
            String(poi.longitude)
        );

        form.set(
            'mission_position[frame]',
            ''
        );

        form.set(
            'mission_position[address]',
            poi.address ||
            poi.name ||
            ''
        );

        const response = await fetch(
            LSS_CREATE_POI_URL,
            {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: {
                    'Content-Type':
                    'application/x-www-form-urlencoded; charset=UTF-8',

                    'Accept':
                    'application/json',

                    'X-CSRF-Token':
                    csrfToken,

                    'X-Requested-With':
                    'XMLHttpRequest'
                },
                body: form.toString()
            }
        );

        const text = await response.text();

        let json;

        try {
            json = JSON.parse(text);
        } catch {
            throw new Error(
                `LSS lieferte keine JSON-Antwort: ${text.substring(0, 300)}`
            );
        }

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}: ${
                json?.flash?.message ||
                text.substring(0, 300)
                }`
            );
        }

        if (
            json?.flash?.type !==
            'success'
        ) {
            throw new Error(
                json?.flash?.message ||
                'LSS hat den POI nicht bestätigt.'
            );
        }

        return json;
    }

    // UI Design
    function createStyles() {
        if (document.getElementById('lss-poi-manager-style')) {
            return;
        }

        const style = document.createElement('style');

        style.id = 'lss-poi-manager-style';

        style.textContent = `
        #lss-poi-manager-modal {
            z-index: 100000;
        }

        /* =========================================================
           Modal
           ========================================================= */

        #lss-poi-manager-modal .modal-dialog {
            width: 600px;
            max-width: 800px;
            height: 800px;
            margin: 30px 0 30px 15px;
        }

        #lss-poi-manager-modal .modal-content {
            width: 800px;
            height: 800px;
            display: flex;
            flex-direction: column;
            border: none;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
        }

        #lss-poi-manager-modal .modal-body {
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 20px;
        }

        /* =========================================================
           Fixierter Kopfbereich
           ========================================================= */

        #lss-poi-manager-modal .lss-poi-manager-sticky-header {
            position: sticky;
            top: -20px;
            z-index: 100;
            margin: -20px -20px 20px -20px;
            padding: 14px 20px 8px 20px;
            background: #fff;
            border-bottom: 1px solid rgba(127, 127, 127, 0.2);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
        }

        #lss-poi-manager-modal .lss-poi-manager-modal-title {
            position: relative;
            min-height: 30px;
        }

        #lss-poi-manager-modal .modal-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            line-height: 30px;
        }

        #lss-poi-manager-modal .lss-poi-manager-modal-title .close {
            margin-top: 0;
            font-size: 26px;
            opacity: 0.65;
            transition: opacity 0.15s ease;
        }

        #lss-poi-manager-modal .lss-poi-manager-modal-title .close:hover {
            opacity: 1;
        }

        /* =========================================================
           Toolbar
           ========================================================= */

        .lss-poi-manager-toolbar {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 12px;
        }

        #lss-poi-manager-modal .lss-poi-manager-sticky-header .lss-poi-manager-toolbar {
            margin-top: 10px;
            margin-bottom: 12px;
        }

        /* =========================================================
           Statistik
           ========================================================= */

        #lss-poi-manager-modal .lss-poi-manager-stats {
            margin-bottom: 0;
        }

        #lss-poi-manager-modal .lss-poi-manager-stats > [class*="col-"] {
            padding-left: 7px;
            padding-right: 7px;
        }

        #lss-poi-manager-modal .lss-poi-manager-stats > [class*="col-"]:first-child {
            padding-left: 15px;
        }

        #lss-poi-manager-modal .lss-poi-manager-stats > [class*="col-"]:last-child {
            padding-right: 15px;
        }

        .lss-poi-manager-stat {
            position: relative;
            text-align: center;
            padding: 10px 5px;
            margin-bottom: 8px;
            border: 1px solid rgba(127, 127, 127, 0.2);
            border-radius: 9px;
            background: rgba(127, 127, 127, 0.045);
            transition:
                transform 0.15s ease,
                box-shadow 0.15s ease;
        }

        .lss-poi-manager-stat:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
        }

        .lss-poi-manager-stat strong {
            display: block;
            margin-bottom: 3px;
            font-size: 20px;
            line-height: 1.1;
            font-weight: 700;
        }

        /* =========================================================
           Footer
           ========================================================= */

        #lss-poi-manager-modal .modal-footer {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            width: 100%;
            padding: 14px 20px;
            border-top: 1px solid rgba(127, 127, 127, 0.2);
            background: rgba(127, 127, 127, 0.04);
        }

        #lss-poi-manager-modal .lss-poi-manager-footer-info {
            flex: 0 1 auto;
            min-width: 0;
        }

        #lss-poi-manager-modal .lss-poi-manager-footer-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
        }

        #lss-poi-manager-modal .lss-poi-manager-create-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
        }

        #lss-poi-manager-modal .lss-poi-manager-footer-actions .btn {
            white-space: nowrap;
        }

        /* =========================================================
           Allgemeine Elemente
           ========================================================= */

        #lss-poi-manager-modal hr {
            border: 0;
            border-top: 1px solid rgba(127, 127, 127, 0.18);
            margin: 20px 0;
        }

        #lss-poi-manager-modal h4 {
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 16px;
            font-weight: 600;
        }

        #lss-poi-manager-modal h4 .glyphicon {
            margin-right: 4px;
            opacity: 0.75;
        }

        #lss-poi-manager-modal .form-control {
            border-radius: 7px;
            box-shadow: none;
            transition:
                border-color 0.15s ease,
                box-shadow 0.15s ease;
        }

        #lss-poi-manager-modal .form-control:focus {
            box-shadow: 0 0 0 3px rgba(51, 122, 183, 0.12);
        }

        .lss-poi-manager-radius-input {
            max-width: 90px;
        }

        #lss-poi-manager-modal .btn {
            border-radius: 7px;
            transition:
                transform 0.1s ease,
                box-shadow 0.15s ease,
                opacity 0.15s ease;
        }

        #lss-poi-manager-modal .btn:not(:disabled):hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }

        #lss-poi-manager-modal .btn:not(:disabled):active {
            transform: translateY(1px);
        }

        #lss-poi-manager-modal .btn:disabled {
            cursor: not-allowed;
        }

        .lss-poi-manager-muted {
            color: #777;
            opacity: 0.85;
        }

        /* =========================================================
           Ortssuche
           ========================================================= */

        .lss-poi-manager-location-result {
            cursor: pointer;
            padding: 10px 12px;
            border-bottom: 1px solid rgba(127, 127, 127, 0.15);
            transition:
                background 0.15s ease,
                padding-left 0.15s ease;
        }

        .lss-poi-manager-location-result:first-child {
            border-top-left-radius: 7px;
            border-top-right-radius: 7px;
        }

        .lss-poi-manager-location-result:last-child {
            border-bottom: none;
            border-bottom-left-radius: 7px;
            border-bottom-right-radius: 7px;
        }

        .lss-poi-manager-location-result:hover {
            background: rgba(127, 127, 127, 0.09);
            padding-left: 16px;
        }

        .lss-poi-manager-location-result strong {
            display: block;
            margin-bottom: 2px;
        }

        .lss-poi-manager-location-result small {
            color: inherit;
            opacity: 0.65;
        }

        .lss-poi-manager-selected-location {
            padding: 11px 13px;
            margin-top: 10px;
            border: 1px solid rgba(51, 122, 183, 0.25);
            border-radius: 8px;
            background: rgba(51, 122, 183, 0.07);
        }

        /* =========================================================
           OSM-Typen
           ========================================================= */

        .lss-poi-manager-osm-type-toolbar {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 10px;
        }

        .lss-poi-manager-osm-type-list {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
            max-height: 180px;
            overflow-y: auto;
            padding: 8px;
            border: 1px solid rgba(127, 127, 127, 0.22);
            border-radius: 9px;
            background: rgba(127, 127, 127, 0.025);
        }

        .lss-poi-manager-osm-type-item {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 34px;
            padding: 7px 9px;
            margin: 0;
            border-radius: 6px;
            cursor: pointer;
            font-weight: normal;
            transition:
                background 0.15s ease,
                transform 0.1s ease;
        }

        .lss-poi-manager-osm-type-item:hover {
            background: rgba(127, 127, 127, 0.10);
        }

        .lss-poi-manager-osm-type-item:active {
            transform: scale(0.99);
        }

        .lss-poi-manager-osm-type-item input {
            margin: 0;
            flex-shrink: 0;
            cursor: pointer;
        }

        /* =========================================================
           POI-Typen
           ========================================================= */

        .lss-poi-manager-type-row {
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 8px 10px;
            border-bottom: 1px solid rgba(127, 127, 127, 0.14);
            transition: background 0.15s ease;
        }

        .lss-poi-manager-type-row:hover {
            background: rgba(127, 127, 127, 0.06);
        }

        .lss-poi-manager-type-row:last-child {
            border-bottom: none;
        }

        .lss-poi-manager-type-row input {
            margin: 0;
        }

        .lss-poi-manager-type-count {
            margin-left: auto;
            min-width: 50px;
            text-align: right;
            font-weight: 600;
            opacity: 0.75;
        }

        /* =========================================================
           Ergebnisse
           ========================================================= */

        .lss-poi-manager-results {
            max-height: 300px;
            overflow-y: auto;
            overflow-x: hidden;
            border: 1px solid rgba(127, 127, 127, 0.2);
            border-radius: 9px;
        }

        .lss-poi-manager-result {
            position: relative;
            padding: 11px 13px;
            border-bottom: 1px solid rgba(127, 127, 127, 0.14);
            transition: background 0.15s ease;
        }

        .lss-poi-manager-result:hover {
            background: rgba(127, 127, 127, 0.055);
        }

        .lss-poi-manager-result:last-child {
            border-bottom: none;
        }

        .lss-poi-manager-result-name {
            margin-bottom: 5px;
            font-weight: 600;
            line-height: 1.35;
        }

        .lss-poi-manager-result-meta {
            margin-top: 6px;
            color: #777;
            font-size: 12px;
            line-height: 1.5;
        }

        #lss-poi-manager-modal .alert {
            border-radius: 8px;
        }

        /* =========================================================
           Fortschritt
           ========================================================= */

        .lss-poi-manager-progress {
            display: none;
            margin-top: 15px;
        }

        .lss-poi-manager-progress .progress {
            height: 18px;
            margin-bottom: 8px;
            border-radius: 9px;
            overflow: hidden;
            background: rgba(127, 127, 127, 0.15);
            box-shadow: none;
        }

        .lss-poi-manager-progress .progress-bar {
            line-height: 18px;
            transition: width 0.25s ease;
        }

        .lss-poi-manager-progress-text {
            text-align: left;
        }

        .lss-poi-manager-danger {
            color: #a94442;
        }

        .lss-poi-manager-success {
            color: #3c763d;
        }

        .lss-poi-manager-warning {
            color: #8a6d3b;
        }

        #lss-poi-manager-map-link {
            margin-left: 5px;
        }

        /* =========================================================
           Scrollbars
           ========================================================= */

        #lss-poi-manager-modal .modal-body::-webkit-scrollbar,
        .lss-poi-manager-results::-webkit-scrollbar,
        .lss-poi-manager-osm-type-list::-webkit-scrollbar {
            width: 7px;
        }

        #lss-poi-manager-modal .modal-body::-webkit-scrollbar-thumb,
        .lss-poi-manager-results::-webkit-scrollbar-thumb,
        .lss-poi-manager-osm-type-list::-webkit-scrollbar-thumb {
            background: rgba(127, 127, 127, 0.35);
            border-radius: 10px;
        }

        #lss-poi-manager-modal .modal-body::-webkit-scrollbar-track,
        .lss-poi-manager-results::-webkit-scrollbar-track,
        .lss-poi-manager-osm-type-list::-webkit-scrollbar-track {
            background: transparent;
        }

        /* =========================================================
           Dark Mode
           ========================================================= */

        @media (prefers-color-scheme: dark) {

            #lss-poi-manager-modal .modal-content {
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.55);
            }

            #lss-poi-manager-modal .lss-poi-manager-sticky-header {
                background: #2b2b2b;
                border-bottom-color: rgba(255, 255, 255, 0.12);
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
            }

            #lss-poi-manager-modal .modal-footer {
                background: rgba(255, 255, 255, 0.035);
                border-top-color: rgba(255, 255, 255, 0.12);
            }

            .lss-poi-manager-stat {
                background: rgba(255, 255, 255, 0.035);
                border-color: rgba(255, 255, 255, 0.12);
            }

            .lss-poi-manager-osm-type-list,
            .lss-poi-manager-results {
                border-color: rgba(255, 255, 255, 0.14);
            }

            .lss-poi-manager-result-meta {
                color: #aaa;
            }

            .lss-poi-manager-muted {
                color: #aaa;
            }

            .lss-poi-manager-location-result small {
                color: #aaa;
            }
        }

        /* =========================================================
           Tablet / Mobile
           ========================================================= */

        @media (max-width: 768px) {

            #lss-poi-manager-modal .modal-dialog {
                width: calc(100vw - 20px);
                max-width: calc(100vw - 20px);
                height: calc(100vh - 20px);
                margin: 10px;
            }

            #lss-poi-manager-modal .modal-content {
                width: 100%;
                height: 100%;
            }

            #lss-poi-manager-modal .modal-body {
                padding: 15px;
            }

            #lss-poi-manager-modal .lss-poi-manager-sticky-header {
                top: -15px;
                margin: -15px -15px 15px -15px;
                padding: 10px 15px 6px 15px;
            }

            #lss-poi-manager-modal .lss-poi-manager-stats > [class*="col-"] {
                padding-left: 5px;
                padding-right: 5px;
            }

            .lss-poi-manager-osm-type-list {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .lss-poi-manager-toolbar {
                align-items: stretch;
            }

            .lss-poi-manager-toolbar .btn {
                flex: 0 0 auto;
            }
        }

        /* =========================================================
           Kleine Displays
           ========================================================= */

        @media (max-width: 480px) {

            #lss-poi-manager-modal .modal-dialog {
                width: calc(100vw - 10px);
                max-width: calc(100vw - 10px);
                height: calc(100vh - 10px);
                margin: 5px;
            }

            #lss-poi-manager-modal .modal-content {
                width: 100%;
                height: 100%;
            }

            #lss-poi-manager-modal .modal-body {
                padding: 12px;
            }

            #lss-poi-manager-modal .lss-poi-manager-sticky-header {
                top: -12px;
                margin: -12px -12px 12px -12px;
                padding: 8px 12px 5px 12px;
            }

            #lss-poi-manager-modal .lss-poi-manager-stats > [class*="col-"] {
                padding-left: 3px;
                padding-right: 3px;
            }

            .lss-poi-manager-osm-type-list {
                grid-template-columns: 1fr;
            }

            .lss-poi-manager-osm-type-toolbar {
                align-items: stretch;
            }

            .lss-poi-manager-osm-type-toolbar .btn {
                flex: 1 1 auto;
            }

            .lss-poi-manager-result {
                padding: 10px;
            }

            #lss-poi-manager-modal .modal-footer {
                flex-wrap: wrap;
                gap: 8px;
            }

            #lss-poi-manager-modal .lss-poi-manager-footer-actions {
                margin-left: auto;
            }

            #lss-poi-manager-modal .lss-poi-manager-create-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .lss-poi-manager-create-actions #lss-poi-manager-create,
.lss-poi-manager-create-actions #lss-poi-manager-cancel {
    margin: 0;
}
        }
    `;

        document.head.appendChild(style);
    }

    // Button
    function addPoiManagerButton() {
        if (
            document.getElementById(
                'poi-manager-btn'
            )
        ) {
            return true;
        }

        const navbarHeaders =
              document.querySelectorAll(
                  '.navbar-header'
              );

        for (
            const navbarHeader of navbarHeaders
        ) {
            const brand =
                  navbarHeader.querySelector(
                      'a.navbar-brand'
                  );

            if (
                !brand ||
                brand.textContent.trim() !==
                'POI-Verwaltung'
            ) {
                continue;
            }

            const searchForm =
                  navbarHeader.querySelector(
                      '#poi_map_adress_search_form'
                  );

            if (!searchForm) {
                continue;
            }

            const searchInput =
                  searchForm.querySelector(
                      '#poi_map_adress_search'
                  );

            if (!searchInput) {
                continue;
            }

            const button =
                  document.createElement(
                      'button'
                  );

            button.type =
                'button';

            button.id =
                'poi-manager-btn';

            button.className =
                'btn btn-default navbar-btn';

            button.title =
                'POI-Manager öffnen';

            button.innerHTML =
                '<span class="glyphicon glyphicon-map-marker"></span>&nbsp; POI-Manager';

            button.style.marginLeft =
                '5px';

            button.addEventListener(
                'click',
                event => {
                    event.preventDefault();
                    event.stopPropagation();
                    openPoiManager();
                }
            );

            searchForm.parentNode.insertBefore(
                button,
                searchForm.nextSibling
            );

            log(
                'POI-Manager Button eingefügt.'
            );

            return true;
        }

        return false;
    }

    // UI erstellen
    function createModal() {
        if (document.getElementById('lss-poi-manager-modal')) {
            modal = document.getElementById('lss-poi-manager-modal');
            return modal;
        }

        createStyles();

        const wrapper = document.createElement('div');

        wrapper.innerHTML = `
        <div
            id="lss-poi-manager-modal"
            class="modal fade"
            tabindex="-1"
            role="dialog"
            aria-hidden="true"
        >
            <div
                class="modal-dialog lss-poi-manager-dialog"
                role="document"
            >
                <div class="modal-content">

                    <div class="modal-body">

                        <!-- Fixierter Kopfbereich -->
                        <div class="lss-poi-manager-sticky-header">

                            <!-- Titel -->
                            <div class="lss-poi-manager-modal-title">

                                <button
                                    type="button"
                                    class="close"
                                    data-dismiss="modal"
                                    aria-label="Schließen"
                                >
                                    <span>&times;</span>
                                </button>

                                <h4 class="modal-title">
                                    <span class="glyphicon glyphicon-road"></span>
                                    &nbsp;LSS POI-Manager
                                </h4>

                            </div>

                            <!-- Toolbar -->
                            <div class="lss-poi-manager-toolbar">

                                <button
                                    type="button"
                                    id="lss-poi-manager-refresh"
                                    class="btn btn-info"
                                >
                                    <span class="glyphicon glyphicon-refresh"></span>
                                    LSS-POIs aktualisieren
                                </button>

                                <span
                                    id="lss-poi-manager-cache-info"
                                    class="lss-poi-manager-muted"
                                    style="line-height:34px;"
                                >
                                    IndexedDB: nicht geladen
                                </span>

                            </div>

                            <!-- Statistik -->
                            <div class="row lss-poi-manager-stats">

                                <div class="col-sm-3">
                                    <div class="lss-poi-manager-stat">
                                        <strong id="lss-poi-manager-existing">
                                            0
                                        </strong>
                                        vorhandene LSS-POIs
                                    </div>
                                </div>

                                <div class="col-sm-3">
                                    <div class="lss-poi-manager-stat">
                                        <strong id="lss-poi-manager-found">
                                            0
                                        </strong>
                                        OSM-POIs gefunden
                                    </div>
                                </div>

                                <div class="col-sm-3">
                                    <div class="lss-poi-manager-stat">
                                        <strong id="lss-poi-manager-new">
                                            0
                                        </strong>
                                        neue POIs
                                    </div>
                                </div>

                                <div class="col-sm-3">
                                    <div class="lss-poi-manager-stat">
                                        <strong id="lss-poi-manager-duplicate">
                                            0
                                        </strong>
                                        bereits vorhanden
                                    </div>
                                </div>

                            </div>

                        </div>

                        <!-- OSM-POI-Typen -->
                        <hr>

                        <h4>
                            <span class="glyphicon glyphicon-filter"></span>
                            OSM-POI-Typen für die Abfrage
                        </h4>

                        <div class="alert alert-info">
                            Wähle aus, welche POI-Typen bei OpenStreetMap abgefragt werden sollen.
                            Mehrere Typen können gleichzeitig ausgewählt werden.
                            Je weniger Typen ausgewählt sind, desto kleiner und schneller ist die Abfrage.
                        </div>

                        <div class="lss-poi-manager-osm-type-toolbar">

                            <button
                                type="button"
                                id="lss-poi-manager-osm-select-all"
                                class="btn btn-default btn-sm"
                            >
                                Alle auswählen
                            </button>

                            <button
                                type="button"
                                id="lss-poi-manager-osm-select-none"
                                class="btn btn-default btn-sm"
                            >
                                Alle abwählen
                            </button>

                            <span
                                id="lss-poi-manager-osm-type-count"
                                class="lss-poi-manager-muted"
                            >
                                0 Typen ausgewählt
                            </span>

                        </div>

                        <div
                            id="lss-poi-manager-osm-type-list"
                            class="lss-poi-manager-osm-type-list"
                        ></div>

                        <hr>

                        <!-- Ort suchen -->
                        <h4>
                            <span class="glyphicon glyphicon-search"></span>
                            Ort suchen
                        </h4>

                        <div class="row">

                            <div class="col-sm-8">

                                <input
                                    type="text"
                                    id="lss-poi-manager-location-search"
                                    class="form-control"
                                    placeholder="z. B. Hamburg, München, Berlin..."
                                >

                            </div>

                            <div class="col-sm-4">

                                <button
                                    type="button"
                                    id="lss-poi-manager-location-button"
                                    class="btn btn-primary btn-block"
                                >
                                    <span class="glyphicon glyphicon-search"></span>
                                    Ort suchen
                                </button>

                            </div>

                        </div>

                        <div
                            id="lss-poi-manager-location-results"
                            style="margin-top:10px;"
                        ></div>

                        <div
                            id="lss-poi-manager-selected-location"
                            class="lss-poi-manager-selected-location"
                            style="display:none;"
                        ></div>

                        <hr>

                        <!-- Suchparameter -->
                        <div class="row">

                            <div class="col-sm-3">

                                <label>
                                    Suchradius
                                </label>

                                <div
                                    class="input-group"
                                    style="width:120px;"
                                >

                                    <input
                                        type="number"
                                        id="lss-poi-manager-radius"
                                        class="form-control lss-poi-manager-radius-input"
                                        value="${DEFAULT_RADIUS_KM}"
                                        min="${MIN_RADIUS_KM}"
                                        max="${MAX_RADIUS_KM}"
                                        step="${RADIUS_STEP_KM}"
                                    >

                                    <span class="input-group-addon">
                                        km
                                    </span>

                                </div>

                            </div>

                            <div class="col-sm-9">

                                <label>
                                    Aktionen
                                </label>

                                <div class="lss-poi-manager-toolbar">

                                    <button
                                        type="button"
                                        id="lss-poi-manager-osm-search"
                                        class="btn btn-success"
                                        disabled
                                    >
                                        <span class="glyphicon glyphicon-globe"></span>
                                        OSM-POIs laden
                                    </button>

                                    <button
                                        type="button"
                                        id="lss-poi-manager-clear-search"
                                        class="btn btn-danger"
                                    >
                                        <span class="glyphicon glyphicon-trash"></span>
                                        Suche löschen
                                    </button>

                                </div>

                            </div>

                        </div>

                        <hr>

                        <!-- Gefundene POI-Typen -->
                        <h4>
                            <span class="glyphicon glyphicon-list"></span>
                            POI-Typen
                        </h4>

                        <div id="lss-poi-manager-type-list">
                            <div class="alert alert-info">
                                Noch keine OSM-Daten geladen.
                            </div>
                        </div>

                        <hr>

                        <!-- Ergebnisübersicht -->
                        <div id="lss-poi-manager-result-summary">

                            <div class="alert alert-info">
                                Suche einen Ort und lade anschließend die OSM-POIs.
                            </div>

                        </div>

                        <!-- Ergebnisse -->
                        <div
                            id="lss-poi-manager-results"
                            class="lss-poi-manager-results"
                            style="display:none;"
                        ></div>

                        <!-- Fortschritt -->
                        <div
    id="lss-poi-manager-progress"
    class="lss-poi-manager-progress"
>
    <div class="progress">
        <div
            id="lss-poi-manager-progress-bar"
            class="progress-bar progress-bar-success"
            role="progressbar"
            style="width:0%;"
        >
            0%
        </div>
    </div>

    <div id="lss-poi-manager-progress-text">
        Bereit
    </div>
</div>

                        <!-- Status -->
                        <div
                            id="lss-poi-manager-status"
                            style="margin-top:15px;"
                        ></div>

                    </div>

                    <!-- Footer -->
                    <div class="modal-footer lss-poi-manager-footer">

                        <span
                            id="lss-poi-manager-footer-info"
                            class="pull-left lss-poi-manager-muted"
                        >
                            Bereit
                        </span>

                        <div class="lss-poi-manager-footer-actions">

                            <div
                                id="lss-poi-manager-create-actions"
                                class="lss-poi-manager-create-actions"
                            >

                                <button
                                    type="button"
                                    id="lss-poi-manager-create"
                                    class="btn btn-primary"
                                    disabled
                                >
                                    <span class="glyphicon glyphicon-plus"></span>
                                    POIs im LSS erstellen
                                </button>

                                <button
                                    type="button"
                                    id="lss-poi-manager-cancel"
                                    class="btn btn-danger"
                                    style="display:none;"
                                >
                                    <span class="glyphicon glyphicon-stop"></span>
                                    Vorgang abbrechen
                                </button>

                            </div>

                            <button
                                type="button"
                                class="btn btn-default"
                                data-dismiss="modal"
                            >
                                Schließen
                            </button>

                        </div>

                    </div>

                </div>
            </div>
        </div>
    `;

        document.body.appendChild(wrapper.firstElementChild);

        modal = document.getElementById('lss-poi-manager-modal');

        bindModalEvents();
        renderOsmTypeSelection();

        return modal;
    }

    function setCreateMode(isRunning) {
        const createButton = document.getElementById(
            'lss-poi-manager-create'
        );

        const cancelButton = document.getElementById(
            'lss-poi-manager-cancel'
        );

        if (!createButton || !cancelButton) {
            return;
        }

        if (isRunning) {
            createButton.style.display = 'none';
            cancelButton.style.display = 'inline-block';
        } else {
            createButton.style.display = 'inline-block';
            cancelButton.style.display = 'none';
        }
    }

    // Events
    function bindModalEvents() {
        document
            .getElementById(
            'lss-poi-manager-location-button'
        )
            ?.addEventListener(
            'click',
            searchLocationFromUI
        );

        document
            .getElementById(
            'lss-poi-manager-location-search'
        )
            ?.addEventListener(
            'keydown',
            event => {
                if (
                    event.key ===
                    'Enter'
                ) {
                    event.preventDefault();
                    searchLocationFromUI();
                }
            }
        );

        document
            .getElementById(
            'lss-poi-manager-osm-search'
        )
            ?.addEventListener(
            'click',
            searchOsmFromUI
        );

        document
            .getElementById(
            'lss-poi-manager-refresh'
        )
            ?.addEventListener(
            'click',
            async () => {
                if (
                    lssPoiSyncRunning
                ) {
                    return;
                }

                try {
                    await syncLSSPoisFromApi();

                    if (
                        currentResults.length
                    ) {
                        await checkDuplicates();

                        renderTypeList();
                        renderOsmResults();
                        updateStats();
                    }
                } catch (err) {
                    error(
                        'LSS-POI-Synchronisierung fehlgeschlagen:',
                        err
                    );

                    showStatus(
                        `LSS-POIs konnten nicht aktualisiert werden: ${err.message}`,
                        'danger'
                    );
                }
            }
        );

        document
            .getElementById(
            'lss-poi-manager-select-all'
        )
            ?.addEventListener(
            'click',
            () => {
                setAllTypeCheckboxes(
                    true
                );

                updateSelection();
            }
        );

        document
            .getElementById(
            'lss-poi-manager-select-none'
        )
            ?.addEventListener(
            'click',
            () => {
                setAllTypeCheckboxes(
                    false
                );

                updateSelection();
            }
        );

        document
            .getElementById(
            'lss-poi-manager-create'
        )
            ?.addEventListener(
            'click',
            createSelectedPois
        );

        document
            .getElementById('lss-poi-manager-osm-select-all')
            ?.addEventListener('click', () => {
            setAllOsmTypeCheckboxes(true);
        });

        document
            .getElementById('lss-poi-manager-osm-select-none')
            ?.addEventListener('click', () => {
            setAllOsmTypeCheckboxes(false);
        });

        const clearSearchButton =
              document.getElementById(
                  'lss-poi-manager-clear-search'
              );

        if (clearSearchButton) {
            clearSearchButton.addEventListener(
                'click',
                clearSearch
            );
        }
        const modalElement =
              document.getElementById(
                  'lss-poi-manager-modal'
              );

        if (modalElement) {
            $(modalElement).on(
                'hidden.bs.modal',
                () => {
                    clearSearch();
                }
            );
        }

        const cancelButton =
              document.getElementById(
                  'lss-poi-manager-cancel'
              );

        if (cancelButton) {
            cancelButton.addEventListener(
                'click',
                cancelCreation
            );
        }
    }

    // Ort suchen
    async function searchLocationFromUI() {
        if (searchRunning) {
            return;
        }

        const input =
              document.getElementById(
                  'lss-poi-manager-location-search'
              );

        const results =
              document.getElementById(
                  'lss-poi-manager-location-results'
              );

        if (!input || !results) {
            return;
        }

        const query =
              input.value.trim();

        if (!query) {
            showStatus(
                'Bitte einen Ort oder eine Adresse eingeben.',
                'warning'
            );

            return;
        }

        searchRunning = true;

        setLocationLoading(
            true
        );

        try {
            results.innerHTML = `
                <div class="alert alert-info">
                    <span class="glyphicon glyphicon-refresh"></span>
                    Suche Ort über OpenStreetMap...
                </div>
            `;

            const locations =
                  await searchLocation(
                      query
                  );

            if (!locations.length) {
                results.innerHTML = `
                    <div class="alert alert-warning">
                        Kein passender Ort gefunden.
                    </div>
                `;

                return;
            }

            results.innerHTML =
                locations
                .map(
                (location, index) =>
                `
                            <div
                                class="lss-poi-manager-location-result"
                                data-location-index="${index}"
                            >
                                <strong>
                                    ${escapeHtml(
                                        location.display_name
                                    )}
                                </strong>

                                <small>
                                    ${escapeHtml(
                                        location.type || ''
                                    )}
                                    |
                                    ${escapeHtml(
                                        location.lat
                                    )},
                                    ${escapeHtml(
                                        location.lon
                                    )}
                                </small>
                            </div>
                        `
            )
                .join('');

            results
                .querySelectorAll(
                '.lss-poi-manager-location-result'
            )
                .forEach(
                element => {
                    element.addEventListener(
                        'click',
                        () => {
                            const index =
                                  Number(
                                      element.dataset
                                      .locationIndex
                                  );

                            selectLocation(
                                locations[index]
                            );
                        }
                    );
                }
            );
        } catch (err) {
            error(
                'Ortssuche fehlgeschlagen:',
                err
            );

            showStatus(
                `Ortssuche fehlgeschlagen: ${err.message}`,
                'danger'
            );
        } finally {
            searchRunning = false;

            setLocationLoading(
                false
            );
        }
    }

    // Ort auswählen
    function selectLocation(location) {
        currentLocation = {
            latitude:
            Number(location.lat),

            longitude:
            Number(location.lon),

            displayName:
            location.display_name,

            raw: location
        };

        const results =
              document.getElementById(
                  'lss-poi-manager-location-results'
              );

        const selected =
              document.getElementById(
                  'lss-poi-manager-selected-location'
              );

        if (results) {
            results.innerHTML =
                '';
        }

        if (selected) {
            selected.style.display =
                'block';

            selected.innerHTML = `
                <strong>
                    ${escapeHtml(
                location.display_name
            )}
                </strong>

                <br>

                <small>
                    ${escapeHtml(
                String(location.lat)
            )},
                    ${escapeHtml(
                String(location.lon)
            )}
                </small>
            `;
        }

        const button =
              document.getElementById(
                  'lss-poi-manager-osm-search'
              );

        if (button) {
            updateOsmTypeSelectionInfo();
        }

        currentResults = [];

        renderTypeList();
        updateStats();

        showStatus(
            'Ort ausgewählt. Jetzt können die OSM-POIs geladen werden.',
            'success'
        );
    }

    // OSM-Suche
    async function searchOsmFromUI() {
        if (!currentLocation) {
            showStatus(
                'Bitte zuerst einen Ort auswählen.',
                'warning'
            );
            return;
        }

        const selectedTypes = getSelectedOsmTypes();

        if (!selectedTypes.size) {
            showStatus(
                'Bitte mindestens einen POI-Typ für die OSM-Abfrage auswählen.',
                'warning'
            );
            return;
        }

        const radiusInput = document.getElementById(
            'lss-poi-manager-radius'
        );

        const radius = normalizeRadius(
            radiusInput?.value
        );

        if (radiusInput) {
            radiusInput.value = radius;
        }

        setOsmLoading(true);

        try {
            showStatus(
                `Frage Overpass im Radius von ${radius} km ` +
                `mit ${formatNumber(selectedTypes.size)} POI-Typen ab...`,
                'info'
            );

            const response = await searchOverpass(
                currentLocation,
                radius,
                selectedTypes
            );

            log('Overpass Antwort:', response);

            if (response._lssPoiManagerLimited) {
                showStatus(
                    `Overpass lieferte mehr als ` +
                    `${formatNumber(MAX_OVERPASS_RESULTS)} Objekte. ` +
                    `Es wurden nur die ersten ` +
                    `${formatNumber(MAX_OVERPASS_RESULTS)} verarbeitet. ` +
                    `Verkleinere gegebenenfalls den Suchradius ` +
                    `oder wähle weniger POI-Typen.`,
                    'warning'
                );
            }

            currentResults = processOverpassResults(
                response.elements,
                currentLocation
            );

            log(
                `Nach Mapping: ${currentResults.length} POIs`
            );

            await checkDuplicates();

            renderTypeList();
            renderOsmResults();
            updateStats();

            const newCount = currentResults.filter(
                poi => !poi.duplicate
            ).length;

            let resultMessage =
                `${formatNumber(currentResults.length)} passende OSM-POIs gefunden, ` +
                `${formatNumber(newCount)} davon neu.`;

            if (response._lssPoiManagerLimited) {
                resultMessage +=
                    ` Die Overpass-Antwort wurde auf ` +
                    `${formatNumber(MAX_OVERPASS_RESULTS)} Objekte begrenzt.`;
            }

            showStatus(
                resultMessage,
                response._lssPoiManagerLimited
                ? 'warning'
                : 'success'
            );
        } catch (err) {
            error(
                'OSM-Suche fehlgeschlagen:',
                err
            );

            showStatus(
                `OSM-Suche fehlgeschlagen: ${err.message}`,
                'danger'
            );
        } finally {
            setOsmLoading(false);
        }
    }

    // Typ-Liste
    function getTypeStatistics() {
        const map = new Map();

        for (
            const poi of currentResults
        ) {
            if (
                !map.has(poi.type)
            ) {
                map.set(
                    poi.type,
                    {
                        total: 0,
                        new: 0,
                        duplicate: 0
                    }
                );
            }

            const entry =
                  map.get(poi.type);

            entry.total++;

            if (poi.duplicate) {
                entry.duplicate++;
            } else {
                entry.new++;
            }
        }

        return map;
    }
    function renderTypeList() {
        const container =
              document.getElementById(
                  'lss-poi-manager-type-list'
              );

        if (!container) {
            return;
        }

        if (!currentResults.length) {
            container.innerHTML = `
                <div class="alert alert-info">
                    Noch keine OSM-Daten geladen.
                </div>
            `;

            return;
        }

        const stats =
              getTypeStatistics();

        const sorted =
              [...stats.entries()]
        .sort(
            (a, b) =>
            POI_TYPES[a[0]]
            .localeCompare(
                POI_TYPES[b[0]],
                'de'
            )
        );

        container.innerHTML =
            sorted
            .map(
            ([type, data]) =>
            `
                        <div class="lss-poi-manager-type-row">

                            <input
                                type="checkbox"
                                class="lss-poi-manager-type-checkbox"
                                data-type="${type}"
                                checked
                            >

                            <span>
                                ${escapeHtml(
                                    POI_TYPES[type] ||
                                    `POI-Typ ${type}`
                                )}
                            </span>

                            <span class="lss-poi-manager-type-count">
                                ${formatNumber(
                                    data.new
                                )}

                                ${
            data.duplicate
            ? `
                                            <span class="lss-poi-manager-muted">
                                                /
                                                ${formatNumber(
                                                    data.duplicate
                                                )}
                                                vorhanden
                                            </span>
                                        `
            : ''
            }
                            </span>

                        </div>
                    `
        )
            .join('');

        container
            .querySelectorAll(
            '.lss-poi-manager-type-checkbox'
        )
            .forEach(checkbox => {
            checkbox.addEventListener(
                'change',
                () => {
                    renderOsmResults();
                    updateStats();
                }
            );
        });
        updateSelection();
    }

    // Auswahl
    function setAllTypeCheckboxes(checked) {
        document
            .querySelectorAll(
            '.lss-poi-manager-type-checkbox'
        )
            .forEach(checkbox => {
            checkbox.checked = checked;
        });

        updateSelection();
        renderOsmResults();
        updateStats();
    }
    function getSelectedTypes() {
        return new Set(
            [
                ...document.querySelectorAll(
                    '.lss-poi-manager-type-checkbox:checked'
                )
            ].map(
                checkbox =>
                Number(
                    checkbox.dataset.type
                )
            )
        );
    }
    function updateSelection() {
        const selectedTypes = getSelectedTypes();

        const selected = currentResults.filter(
            poi =>
            selectedTypes.has(poi.type) &&
            !poi.duplicate
        );

        const button = document.getElementById(
            'lss-poi-manager-create'
        );

        if (button) {
            button.disabled =
                creationRunning ||
                selected.length === 0;
        }

        const footer = document.getElementById(
            'lss-poi-manager-footer-info'
        );

        if (footer) {
            footer.textContent =
                `${formatNumber(selected.length)} POIs zur Erstellung ausgewählt`;
        }
    }

    // OSM-Ergebnisse
    function renderOsmResults() {
        const container =
              document.getElementById(
                  'lss-poi-manager-results'
              );

        if (!container) {
            return;
        }

        if (!currentResults.length) {
            container.style.display =
                'none';

            container.innerHTML =
                '';

            return;
        }

        const selectedTypes =
              getSelectedTypes();

        const visible =
              currentResults
        .filter(
            poi =>
            selectedTypes.has(
                poi.type
            )
        )
        .slice(0, 1000);

        if (!visible.length) {
            container.innerHTML = `
            <div class="alert alert-info">
                Für die aktuell ausgewählten POI-Typen
                wurden keine POIs gefunden.
            </div>
        `;

            container.style.display =
                'block';

            return;
        }

        container.innerHTML =
            visible
            .map(
            poi => {
                const status =
                      poi.duplicate
                ? `
                                <span class="label label-warning">
                                    bereits vorhanden
                                </span>
                            `
                : `
                                <span class="label label-success">
                                    neu
                                </span>
                            `;

                return `
                        <div class="lss-poi-manager-result">

                            <div class="lss-poi-manager-result-name">
                                ${escapeHtml(
                    poi.name ||
                    poi.typeName
                )}
                                &nbsp;
                                ${status}
                            </div>

                            <div>
                                <span class="label label-default">
                                    ${escapeHtml(
                    poi.typeName
                )}
                                </span>
                            </div>

                            <div class="lss-poi-manager-result-meta">

                                ${escapeHtml(
                    poi.address ||
                    'Keine OSM-Adresse'
                )}

                                <br>

                                ${formatDistance(
                    poi.distance
                )}
                                |
                                OSM:
                                ${escapeHtml(
                    poi.osmType
                )}/
                                ${escapeHtml(
                    poi.osmId
                )}
                                |
                                ${escapeHtml(
                    String(
                        poi.latitude
                    )
                )},
                                ${escapeHtml(
                    String(
                        poi.longitude
                    )
                )}

                            </div>

                        </div>
                    `;
            }
        )
            .join('');

        container.style.display =
            'block';

        if (currentResults.length > 1000) {
            container.innerHTML += `
            <div class="alert alert-info">
                Es werden maximal 1.000 Ergebnisse angezeigt.
                Die Erstellung berücksichtigt trotzdem alle ausgewählten POIs.
            </div>
        `;
        }
    }

    // Statistik
    function updateExistingPoiStat() {
        const element =
              document.getElementById(
                  'lss-poi-manager-existing'
              );

        if (element) {
            element.textContent =
                formatNumber(
                existingLSSPois.length
            );
        }

        const cacheInfo =
              document.getElementById(
                  'lss-poi-manager-cache-info'
              );

        if (cacheInfo) {
            cacheInfo.textContent =
                `IndexedDB: ${formatNumber(
                existingLSSPois.length
            )} POIs`;
        }
    }
    function updateStats() {
        const existing =
              existingLSSPois.length;

        const found =
              currentResults.length;

        const duplicate =
              currentResults.filter(
                  poi => poi.duplicate
              ).length;

        const selectedTypes =
              getSelectedTypes();

        const newPois =
              currentResults.filter(
                  poi =>
                  !poi.duplicate &&
                  selectedTypes.has(
                      poi.type
                  )
              ).length;

        const existingElement =
              document.getElementById(
                  'lss-poi-manager-existing'
              );

        const foundElement =
              document.getElementById(
                  'lss-poi-manager-found'
              );

        const newElement =
              document.getElementById(
                  'lss-poi-manager-new'
              );

        const duplicateElement =
              document.getElementById(
                  'lss-poi-manager-duplicate'
              );

        if (existingElement) {
            existingElement.textContent =
                formatNumber(existing);
        }

        if (foundElement) {
            foundElement.textContent =
                formatNumber(found);
        }

        if (newElement) {
            newElement.textContent =
                formatNumber(newPois);
        }

        if (duplicateElement) {
            duplicateElement.textContent =
                formatNumber(duplicate);
        }

        const summary =
              document.getElementById(
                  'lss-poi-manager-result-summary'
              );

        if (summary) {
            if (!found) {
                summary.innerHTML = `
                    <div class="alert alert-info">
                        Keine passenden POIs gefunden.
                    </div>
                `;
            } else {
                summary.innerHTML = `
                    <div class="alert alert-info">
                        <strong>
                            ${formatNumber(found)}
                        </strong>
                        passende OSM-Objekte gefunden.

                        Davon:

                        <strong>
                            ${formatNumber(duplicate)}
                        </strong>
                        bereits vorhanden und

                        <strong>
                            ${formatNumber(newPois)}
                        </strong>
                        neu ausgewählt.
                    </div>
                `;
            }
        }

        updateSelection();
    }

    // Ausgewählte POI erstellen
    async function createSelectedPois() {
        if (creationRunning) {
            return;
        }

        const selectedTypes = getSelectedTypes();

        const selectedPois = currentResults.filter(
            poi =>
            selectedTypes.has(poi.type) &&
            !poi.duplicate
        );

        if (!selectedPois.length) {
            showStatus(
                'Keine neuen POIs ausgewählt.',
                'warning'
            );

            return;
        }

        creationRunning = true;
        creationCancelled = false;

        setCreationLoading(true);

        let created = 0;
        let skipped = 0;
        let failed = 0;

        const errors = [];

        try {
            for (
                let index = 0;
                index < selectedPois.length;
                index++
            ) {
                // Abbruch prüfen
                if (creationCancelled) {
                    break;
                }

                const poi = selectedPois[index];

                updateProgress(
                    index + 1,
                    selectedPois.length,
                    poi
                );

                try {
                    await createLSSPoi(poi);

                    created++;
                    poi.created = true;
                } catch (err) {
                    failed++;

                    errors.push({
                        poi,
                        error: err
                    });

                    error(
                        'POI konnte nicht erstellt werden:',
                        poi,
                        err
                    );
                }

                // Nach dem Request erneut prüfen
                if (creationCancelled) {
                    break;
                }

                if (
                    index <
                    selectedPois.length - 1
                ) {
                    await sleep(
                        CREATE_REQUEST_DELAY
                    );
                }
            }

            // Bereits erfolgreich erstellte POIs
            for (const poi of selectedPois) {
                if (!poi.created) {
                    continue;
                }

                poi.duplicate = true;

                const cachePoi = {
                    id:
                    `local-${Date.now()}-${Math.random()}`,
                    latitude:
                    poi.latitude,
                    longitude:
                    poi.longitude,
                    poi_type:
                    poi.type,
                    caption:
                    poi.name ||
                    poi.typeName,
                    address:
                    poi.address ||
                    poi.name ||
                    ''
                };

                try {
                    await putPoiIntoDatabase(cachePoi);

                    existingLSSPois.push(cachePoi);
                } catch (err) {
                    warn(
                        'Neu erstellter POI konnte nicht in IndexedDB gespeichert werden:',
                        err
                    );
                }
            }

            rebuildExistingPoiSpatialIndex();
            renderTypeList();
            renderOsmResults();
            updateStats();
            updateExistingPoiStat();

            if (creationCancelled) {
                showStatus(
                    `
            <strong>Vorgang abgebrochen.</strong><br>
            Erstellt:
            <strong>${formatNumber(
                created
            )}</strong>
            von
            <strong>${formatNumber(
                selectedPois.length
            )}</strong>
            ausgewählten POIs.
            `,
                    'warning',
                    true
                );

                const progressText = document.getElementById('lss-poi-manager-progress-text');

                if (progressText) {
                    progressText.textContent = `Abgebrochen – ${formatNumber(created)} von ${formatNumber(selectedPois.length)} erstellt`;}
            } else {
                showCreationResult(created, skipped, failed, errors);
            }
        } finally {
            creationRunning = false;
            setCreationLoading(false);
        }
    }

    // Fortschritt
    function updateProgress(current, total, poi) {
        const percentage = Math.round(
            (current / total) * 100
        );

        const bar = document.getElementById(
            'lss-poi-manager-progress-bar'
        );

        const text = document.getElementById(
            'lss-poi-manager-progress-text'
        );

        const progress = document.getElementById(
            'lss-poi-manager-progress'
        );

        if (progress) {
            progress.style.display = 'block';
        }

        if (bar) {
            bar.style.width = `${percentage}%`;
            bar.textContent = `${percentage}%`;
        }

        if (text) {
            text.textContent =
                `${formatNumber(current)} / ` +
                `${formatNumber(total)} – ` +
                `${poi.name || poi.typeName} `;
        }
    }
    function formatDuration(seconds) {
        seconds = Math.max(
            0,
            Math.round(seconds)
        );

        if (seconds < 60) {
            return `${seconds} Sek.`;
        }

        const minutes = Math.floor(
            seconds / 60
        );

        const remainingSeconds =
              seconds % 60;

        if (minutes < 60) {
            if (remainingSeconds === 0) {
                return `${minutes} Min.`;
            }

            return `${minutes} Min. ${remainingSeconds} Sek.`;
        }

        const hours = Math.floor(
            minutes / 60
        );

        const remainingMinutes =
              minutes % 60;

        if (remainingMinutes === 0) {
            return `${hours} Std.`;
        }

        return `${hours} Std. ${remainingMinutes} Min.`;
    }
    function showCreationResult(created, skipped, failed, errors) {
        const messages = [];

        messages.push(
            '<strong>Erstellung abgeschlossen.</strong>'
        );

        messages.push(
            `Erstellt: <strong>${formatNumber(
                created
            )}</strong>`
        );

        if (skipped) {
            messages.push(
                `Übersprungen: <strong>${formatNumber(
                    skipped
                )}</strong>`
            );
        }

        messages.push(
            `Fehler: <strong>${formatNumber(
                failed
            )}</strong>`
        );

        if (errors.length) {
            messages.push(
                '<hr>'
            );

            messages.push(
                '<strong>Fehlerdetails:</strong><br>'
            );

            messages.push(
                errors
                .slice(0, 20)
                .map(
                    entry =>
                    `${escapeHtml(
                        entry.poi.name ||
                        entry.poi.typeName
                    )}: ${escapeHtml(
                        entry.error?.message ||
                        String(
                            entry.error
                        )
                    )}`
                )
                .join('<br>')
            );

            if (
                errors.length >
                20
            ) {
                messages.push(
                    `<br>... und ${
                    errors.length - 20
                    } weitere Fehler.`
                );
            }
        }

        showStatus(
            messages.join('<br>'),
            failed
            ? 'warning'
            : 'success',
            true
        );
    }

    // Status
    function showStatus(message, type = 'info', html = false) {
        const element =
              document.getElementById(
                  'lss-poi-manager-status'
              );

        if (!element) {
            return;
        }

        element.className =
            `alert alert-${type}`;

        if (html) {
            element.innerHTML =
                message;
        } else {
            element.textContent =
                message;
        }
    }

    // Loading
    function setLocationLoading(loading) {
        const button =
              document.getElementById(
                  'lss-poi-manager-location-button'
              );

        if (!button) {
            return;
        }

        button.disabled =
            loading;

        button.innerHTML =
            loading
            ? `
                    <span class="glyphicon glyphicon-refresh"></span>
                    Suche...
                `
        : `
                    <span class="glyphicon glyphicon-search"></span>
                    Ort suchen
                `;
    }
    function setOsmLoading(loading) {
        const button =
              document.getElementById(
                  'lss-poi-manager-osm-search'
              );

        if (!button) {
            return;
        }

        button.disabled =
            loading ||
            !currentLocation;

        button.innerHTML =
            loading
            ? `
                    <span class="glyphicon glyphicon-refresh"></span>
                    OSM wird geladen...
                `
        : `
                    <span class="glyphicon glyphicon-globe"></span>
                    OSM-POIs laden
                `;
    }
    function setCreationLoading(isLoading) {
        const createButton = document.getElementById(
            'lss-poi-manager-create'
        );

        const cancelButton = document.getElementById(
            'lss-poi-manager-cancel'
        );

        const closeButtons = document.querySelectorAll(
            '#lss-poi-manager-modal [data-dismiss="modal"]'
        );

        if (isLoading) {
            // Erstellen-Button ausblenden
            if (createButton) {
                createButton.style.display = 'none';
                createButton.disabled = true;
            }

            // Abbrechen-Button an dessen Stelle anzeigen
            if (cancelButton) {
                cancelButton.style.display = 'inline-block';
                cancelButton.disabled = false;
                cancelButton.innerHTML = `
                <span class="glyphicon glyphicon-stop"></span>
                Vorgang abbrechen
            `;
            }

            // Schließen während der Erstellung deaktivieren
            closeButtons.forEach(button => {
                button.disabled = true;
            });

        } else {
            // Abbrechen-Button ausblenden
            if (cancelButton) {
                cancelButton.style.display = 'none';
                cancelButton.disabled = false;
                cancelButton.innerHTML = `
                <span class="glyphicon glyphicon-stop"></span>
                Vorgang abbrechen
            `;
            }

            // Erstellen-Button wieder anzeigen
            if (createButton) {
                createButton.style.display = 'inline-block';
            }

            // Schließen wieder ermöglichen
            closeButtons.forEach(button => {
                button.disabled = false;
            });

            // Auswahlstatus neu berechnen
            updateSelection();
        }
    }
    function getSelectedOsmTypes() {
        return new Set(
            [...document.querySelectorAll(
                '.lss-poi-manager-osm-type-checkbox:checked'
            )].map(checkbox => Number(checkbox.dataset.type))
        );
    }
    function setAllOsmTypeCheckboxes(checked) {
        document
            .querySelectorAll(
            '.lss-poi-manager-osm-type-checkbox'
        )
            .forEach(checkbox => {
            checkbox.checked = checked;
        });

        updateOsmTypeSelectionInfo();
    }
    function updateOsmTypeSelectionInfo() {
        const selected = getSelectedOsmTypes();

        const count = document.getElementById(
            'lss-poi-manager-osm-type-count'
        );

        const searchButton = document.getElementById(
            'lss-poi-manager-osm-search'
        );

        if (count) {
            count.textContent =
                `${formatNumber(selected.size)} Typen ausgewählt`;
        }

        if (searchButton) {
            searchButton.disabled =
                !currentLocation ||
                searchRunning ||
                selected.size === 0;
        }
    }
    function renderOsmTypeSelection() {
        const container = document.getElementById(
            'lss-poi-manager-osm-type-list'
        );

        if (!container) {
            return;
        }

        const selectedTypes = new Set(
        );

        const entries = Object.entries(POI_TYPES)
        .map(([type, name]) => ({
            type: Number(type),
            name
        }))
        .filter(entry =>
                OSM_MAPPING.some(
            mapping =>
            Number(mapping.type) === entry.type
        )
               )
        .sort((a, b) =>
              a.name.localeCompare(b.name, 'de')
             );

        container.innerHTML = entries
            .map(entry => `
            <label class="lss-poi-manager-osm-type-item">
                <input
                    type="checkbox"
                    class="lss-poi-manager-osm-type-checkbox"
                    data-type="${entry.type}"
                    ${selectedTypes.has(entry.type) ? 'checked' : ''}
                >

                <span>
                    ${escapeHtml(entry.name)}
                </span>
            </label>
        `)
            .join('');

        container
            .querySelectorAll(
            '.lss-poi-manager-osm-type-checkbox'
        )
            .forEach(checkbox => {
            checkbox.addEventListener(
                'change',
                updateOsmTypeSelectionInfo
            );
        });

        updateOsmTypeSelectionInfo();
    }

    // Modal öffnen
    async function openPoiManager() {
        createModal();

        if (
            typeof window.jQuery !==
            'undefined' &&
            typeof window.jQuery.fn.modal ===
            'function'
        ) {
            window.jQuery(
                modal
            ).modal('show');
        } else {
            modal.style.display =
                'block';

            modal.classList.add(
                'in'
            );
        }

        // Erst Cache laden
        if (
            !existingLSSPois.length
        ) {
            try {
                await loadLSSPoisFromCache();

                updateStats();

                if (
                    existingLSSPois.length
                ) {
                    showStatus(
                        `${formatNumber(
                            existingLSSPois.length
                        )} LSS-POIs aus IndexedDB geladen.`,
                        'success'
                    );
                }
            } catch (err) {
                warn(
                    'IndexedDB konnte beim Öffnen nicht geladen werden:',
                    err
                );
            }
        }

        updateExistingPoiStat();
        updateStats();
        if (
            !existingLSSPois.length &&
            !lssPoiSyncRunning
        ) {
            try {
                await syncLSSPoisFromApi();

                updateStats();
            } catch (err) {
                error(
                    'Initialer LSS-POI-Import fehlgeschlagen:',
                    err
                );

                showStatus(
                    `LSS-POIs konnten nicht geladen werden: ${err.message}`,
                    'danger'
                );
            }
        }
    }

    // Suche löschen
    function clearSearch() {
        currentResults = [];
        currentLocation = null;

        const locationInput =
              document.getElementById(
                  'lss-poi-manager-location-search'
              );

        if (locationInput) {
            locationInput.value = '';
        }

        const locationResults =
              document.getElementById(
                  'lss-poi-manager-location-results'
              );

        if (locationResults) {
            locationResults.innerHTML = '';
        }

        const selectedLocation =
              document.getElementById(
                  'lss-poi-manager-selected-location'
              );

        if (selectedLocation) {
            selectedLocation.innerHTML = '';
            selectedLocation.style.display = 'none';
        }

        const results =
              document.getElementById(
                  'lss-poi-manager-results'
              );

        if (results) {
            results.innerHTML = '';
            results.style.display = 'none';
        }

        const typeList =
              document.getElementById(
                  'lss-poi-manager-type-list'
              );

        if (typeList) {
            typeList.innerHTML = `
            <div class="alert alert-info">
                Noch keine OSM-Daten geladen.
            </div>
        `;
        }

        const summary =
              document.getElementById(
                  'lss-poi-manager-result-summary'
              );

        if (summary) {
            summary.innerHTML = `
            <div class="alert alert-info">
                Suche einen Ort und lade anschließend die OSM-POIs.
            </div>
        `;
        }

        const progress =
              document.getElementById(
                  'lss-poi-manager-progress'
              );

        if (progress) {
            progress.style.display = 'none';
        }

        const progressBar =
              document.getElementById(
                  'lss-poi-manager-progress-bar'
              );

        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.textContent = '0%';
        }

        const progressText =
              document.getElementById(
                  'lss-poi-manager-progress-text'
              );

        if (progressText) {
            progressText.textContent = 'Bereit';
        }

        const footer =
              document.getElementById(
                  'lss-poi-manager-footer-info'
              );

        if (footer) {
            footer.textContent = 'Bereit';
        }

        const status =
              document.getElementById(
                  'lss-poi-manager-status'
              );

        if (status) {
            status.innerHTML = '';
            status.className = '';
        }

        const createButton =
              document.getElementById(
                  'lss-poi-manager-create'
              );

        if (createButton) {
            createButton.disabled = true;
        }

        // OSM-Typauswahl ebenfalls zurücksetzen
        document
            .querySelectorAll(
            '.lss-poi-manager-osm-type-checkbox'
        )
            .forEach(checkbox => {
            checkbox.checked = false;
        });

        updateOsmTypeSelectionInfo();
        updateStats();
    }

    // Stop POI Erstellung
    function cancelCreation() {
        if (!creationRunning) {
            return;
        }

        creationCancelled = true;

        const button = document.getElementById(
            'lss-poi-manager-cancel'
        );

        if (button) {
            button.disabled = true;
            button.innerHTML = `
            <span class="glyphicon glyphicon-refresh"></span>
            Wird abgebrochen...
        `;
        }

        showStatus(
            'Der Vorgang wird nach dem aktuell laufenden POI abgebrochen.',
            'warning'
        );
    }

    // Initialisierung
    function init() {
        log(
            'POI-Manager 0.6.0 wird initialisiert.'
        );

        if (
            !addPoiManagerButton()
        ) {
            const observer =
                  new MutationObserver(
                      () => {
                          if (
                              addPoiManagerButton()
                          ) {
                              observer.disconnect();
                          }
                      }
                  );

            observer.observe(
                document.body,
                {
                    childList: true,
                    subtree: true
                }
            );

            setTimeout(
                () => {
                    observer.disconnect();
                },
                30000
            );
        }

        log(
            'POI-Manager 0.6.0 bereit.'
        );
    }
    init();
})();
