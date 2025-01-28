  // ==UserScript==
  // @name         [LSS] Einsatzkategorienfilter
  // @namespace    http://tampermonkey.net/
  // @version      1.0
  // @description  Filtert die Einsatzliste nach Kategorien
  // @author       Caddy21
  // @match        https://www.leitstellenspiel.de/
  // @grant        GM.setValue
  // @grant        GM.getValue
  // @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
  // ==/UserScript==
  
  (function () {
      'use strict';
  
      const apiUrl = "https://v3.lss-manager.de/modules/lss-missionHelper/missions/de_DE.json";
      const settingsApiUrl = "https://www.leitstellenspiel.de/api/settings"; // API zum Abrufen der Einstellungen
      const storageKey = "lssMissionsData";
      const storageTimestampKey = "lssMissionsDataTimestamp";
      const updateInterval = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden
  
      let missions = {};
      let categories = new Set();
      let missionCategoryMap = new Map();
      let isDarkMode = false; // Standardwert: Helles Design
      let activeCategoryButton = null; // Referenz auf den aktiven Button
  
      // Mapping der Kategorien zu den benutzerdefinierten Beschriftungen
  
      // Nichts ändern !
      const customCategoryLabels = {
          'fire': 'FF',
          'police': 'POL',
          'ambulance': 'RD',
          'thw': 'THW',
          'criminal_investigation': 'SEK',
          'riot_police': 'B-Pol',
          'water_rescue': 'WR',
          'mountain': 'BR',
          'coastal': 'SNR',
          'airport': 'FHF',
          'airport_specialization': 'FHF',
          'factory_fire_brigade': 'WF',
          'seg_medical_service': 'SEG',
          'energy_supply': 'NEA50',
          'energy_supply_2': 'NEA200',
      };
  
      // Neue Gruppen von Kategorien definieren
      const categoryGroups = {
          "FF": ['fire'],
          "POL": ['police'],
          "RD": ['ambulance'],
          "THW": ['thw', 'energy_supply', 'energy_supply_2'],
          "Be-Pol": ['criminal_investigation', 'riot_police'],
          "WR": ['water_rescue'],
          "BR": ['mountain'],
          "SNR": ['coastal'],
          "FHF": ['airport', 'airport_specialization'],
          "WF": ['factory_fire_brigade'],
          "SEG": ['seg', 'seg_medical_service'],
  
          // Weitere Gruppen hinzufügen, falls gewünscht
      };
  
      // Funktion zum Laden der API-Daten (oder aus der GM-Speicherung)
      async function loadMissionData() {
          const now = Date.now();
          const storedTimestamp = await GM.getValue(storageTimestampKey, 0);
          const isDataExpired = now - storedTimestamp > updateInterval;
  
          if (!isDataExpired) {
              // Daten aus GM-Speicherung laden
              console.info("Lade Einsatzdaten aus der GM-Speicherung...");
              missions = JSON.parse(await GM.getValue(storageKey, "{}"));
          } else {
              // Daten aus der API laden und in der GM-Speicherung speichern
              console.info("Lade Einsatzdaten aus der API...");
              const response = await fetch(apiUrl);
              if (!response.ok) {
                  console.error("Fehler beim Abrufen der API:", response.statusText);
                  return;
              }
              missions = await response.json();
              await GM.setValue(storageKey, JSON.stringify(missions));
              await GM.setValue(storageTimestampKey, now);
              console.info("Einsatzdaten wurden aus der API geladen und in der GM-Speicherung gespeichert.");
          }
  
          // Kategorien und Mapping erstellen
          console.info("Erstelle Kategorien und Mapping...");
          for (const mission of Object.values(missions)) {
              if (mission.mission_categories && Array.isArray(mission.mission_categories)) {
                  mission.mission_categories.forEach(category => categories.add(category));
              }
              missionCategoryMap.set(mission.id, mission.mission_categories || []);
          }
  
          // Hole die aktuellen Einstellungen, um den Designmodus zu bestimmen
          console.info("Lade die Benutzereinstellungen...");
          await loadSettings();
  
          // Buttons erstellen
          createCategoryButtons();
      }
  
      // Funktion zum Abrufen der Einstellungen und Bestimmung des Modus
      async function loadSettings() {
          try {
              const response = await fetch(settingsApiUrl);
              const settings = await response.json();
  
              console.log("API Antwortstruktur: ", settings);
  
              if (settings && settings.design_mode !== undefined) {
                  const designMode = settings.design_mode;
                  isDarkMode = (designMode === 1 || designMode === 4);
                  console.info("Designmodus aktiviert:", isDarkMode ? "Dunkelmodus" : "Hellmodus");
              } else {
                  console.error("Die erwartete Struktur wurde in der API-Antwort nicht gefunden.");
              }
          } catch (error) {
              console.error("Fehler beim Abrufen der Einstellungen:", error);
          }
      }
  
      // Funktion zum Erstellen der Buttons
      function createCategoryButtons() {
          const searchInput = document.getElementById('search_input_field_missions');
          if (!searchInput) {
              console.error("Suchfeld nicht gefunden!");
              return;
          }
  
          // Container für Buttons
          const buttonContainer = document.createElement('div');
          buttonContainer.style.display = 'flex';
          buttonContainer.style.flexWrap = 'wrap';
          buttonContainer.style.marginBottom = '10px';
  
          // Erstelle Buttons für einzelne Kategorien (nur die Kategorien, die keiner Gruppe angehören)
          const desiredOrder = [
              'fire', 'police', 'ambulance', 'thw', 'riot_police', 'water_rescue',
              'mountain', 'coastal', 'airport', 'factory_fire_brigade', 'criminal_investigation', 'seg_medical_service'
          ];
  
          desiredOrder.forEach(category => {
              if (categories.has(category) && !isCategoryInAnyGroup(category)) {
                  const button = document.createElement('button');
                  button.textContent = customCategoryLabels[category] || category;
                  button.classList.add('btn', 'btn-xs');
                  button.style.margin = '2px';
                  styleButtonForCurrentTheme(button);
                  button.addEventListener('click', () => {
                      filterMissionListByCategory(category);
                      setActiveButton(button);
                  });
                  buttonContainer.appendChild(button);
              }
          });
  
          // Erstelle Buttons für Kategorie-Gruppen
          for (const [groupName, groupCategories] of Object.entries(categoryGroups)) {
              const groupButton = document.createElement('button');
              groupButton.textContent = groupName;
              groupButton.classList.add('btn', 'btn-xs');
              groupButton.style.margin = '2px';
              styleButtonForCurrentTheme(groupButton);
              groupButton.addEventListener('click', () => {
                  filterMissionListByCategoryGroup(groupCategories);
                  setActiveButton(groupButton);
              });
              buttonContainer.appendChild(groupButton);
          }
  
          // Erstelle den Button für Einsätze ohne Kategorie ("ÜO")
          const unoButton = document.createElement('button');
          unoButton.textContent = 'ÜO'; // Text für den Button
          unoButton.classList.add('btn', 'btn-xs');
          unoButton.style.margin = '2px';
          styleButtonForCurrentTheme(unoButton);
          unoButton.addEventListener('click', () => {
              filterMissionListWithoutCategory(); // Funktion, um Einsätze ohne Kategorie zu filtern
              setActiveButton(unoButton);
          });
          buttonContainer.appendChild(unoButton);
  
          // Reset-Button erstellen
          const resetButton = document.createElement('button');
          resetButton.textContent = 'Alle anzeigen';
          resetButton.classList.add('btn', 'btn-xs', 'btn-primary');
          resetButton.style.margin = '2px';
          resetButton.addEventListener('click', () => {
              resetMissionList();
              resetActiveButton();
          });
  
          buttonContainer.appendChild(resetButton);
          searchInput.parentNode.insertBefore(buttonContainer, searchInput);
      }
  
      // Funktion zum Filtern der Einsätze ohne Kategorie
      function filterMissionListWithoutCategory() {
          console.clear();
          console.log("Filtern der Einsätze ohne Kategorie");
  
          const missionElements = document.querySelectorAll('.missionSideBarEntry');
          missionElements.forEach(element => {
              const missionId = element.getAttribute('mission_type_id');
              // Überprüfen, ob der Einsatz keine Kategorien hat oder nicht im Map vorhanden ist
              if (missionCategoryMap.has(missionId)) {
                  const categories = missionCategoryMap.get(missionId);
                  // Wenn der Einsatz keine Kategorien hat, wird er angezeigt
                  if (categories.length === 0) {
                      element.style.display = '';
                  } else {
                      element.style.display = 'none';
                  }
              } else {
                  // Wenn der Einsatz nicht im Map vorhanden ist (d.h. keine Kategorie zugeordnet), anzeigen
                  element.style.display = '';
              }
          });
      }
  
      // Funktion, um zu überprüfen, ob eine Kategorie Teil einer Gruppe ist
      function isCategoryInAnyGroup(category) {
          return Object.values(categoryGroups).some(group => group.includes(category));
      }
  
      // Funktion, um die Buttons dem Design anzupassen
      function styleButtonForCurrentTheme(button) {
          if (isDarkMode) {
              button.style.backgroundColor = '#333';
              button.style.color = '#fff';
              button.style.border = '1px solid #555';
          } else {
              button.style.backgroundColor = '#fff';
              button.style.color = '#333';
              button.style.border = '1px solid #ccc';
          }
      }
  
      // Funktion, um die Einsatzliste nach einer Kategorie zu filtern
      function filterMissionListByCategory(category) {
          console.clear();
          console.log(`Filtern der Einsätze nach Kategorie: ${category}`);
  
          const missionElements = document.querySelectorAll('.missionSideBarEntry');
          missionElements.forEach(element => {
              const missionId = element.getAttribute('mission_type_id');
              if (missionCategoryMap.has(missionId)) {
                  const categories = missionCategoryMap.get(missionId);
                  if (categories.includes(category)) {
                      element.style.display = '';
                  } else {
                      element.style.display = 'none';
                  }
              } else {
                  element.style.display = 'none';
              }
          });
      }
  
      // Funktion, um die Einsatzliste nach einer Gruppe von Kategorien zu filtern
      function filterMissionListByCategoryGroup(categoriesGroup) {
          console.clear();
          console.log(`Filtern der Einsätze nach den Kategorien: ${categoriesGroup.join(", ")}`);
  
          const missionElements = document.querySelectorAll('.missionSideBarEntry');
          missionElements.forEach(element => {
              const missionId = element.getAttribute('mission_type_id');
              if (missionCategoryMap.has(missionId)) {
                  const missionCategories = missionCategoryMap.get(missionId);
                  const match = categoriesGroup.some(category => missionCategories.includes(category));
  
                  if (match) {
                      element.style.display = '';
                  } else {
                      element.style.display = 'none';
                  }
              } else {
                  element.style.display = 'none';
              }
          });
      }
  
      // Funktion, um alle Einsätze anzuzeigen (Reset)
      function resetMissionList() {
          const missionElements = document.querySelectorAll('.missionSideBarEntry');
          missionElements.forEach(element => {
              element.style.display = '';
          });
      }
  
      // Funktion, um den aktiven Filter-Button grün zu färben
      function setActiveButton(button) {
          if (activeCategoryButton) {
              styleButtonForCurrentTheme(activeCategoryButton);
          }
  
          button.style.backgroundColor = '#28a745';
          button.style.color = '#fff';
          activeCategoryButton = button;
      }
  
      // Funktion, um den aktiven Button zurückzusetzen
      function resetActiveButton() {
          if (activeCategoryButton) {
              styleButtonForCurrentTheme(activeCategoryButton);
          }
          activeCategoryButton = null;
      }
  
      // Initialisierung
      console.log("Starte das Script...");
      loadMissionData();
  })();
