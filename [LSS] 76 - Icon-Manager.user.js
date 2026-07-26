// ==UserScript==
// @name         [LSS] 76 - Icon Manager
// @namespace    https://leitstellenspiel.de/
// @version      1.0
// @description  Verwaltung von fehlenden Grafiken bei Feuerwachen (Normal)
// @author       Caddy21
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @icon         https://github.com/Caddy21/-docs-assets-css/raw/main/yoshi_icon__by_josecapes_dgqbro3-fullview.png
// ==/UserScript==

(function(){
    'use strict';

    const API="/api/v2/buildings";

    let globalImage=null;
    let buildings=[];
    let saveCurrent=0;
    let saveTotal=0;
    let saveCancelled=false;
    let saveRunning=false;

    function createButton(){
        const interval=setInterval(()=>{

            const menu=document.querySelector('#menu_profile + .dropdown-menu');

            if(!menu)
                return;

            if(menu.querySelector('#open-icon-manager')){
                clearInterval(interval);
                return;
            }

            const li=document.createElement('li');
            li.setAttribute('role','presentation');

            const a=document.createElement('a');
            a.href='#';
            a.id='open-icon-manager';
            a.innerHTML=`
            <span class="glyphicon glyphicon-picture"></span>&nbsp;&nbsp;
            Gebäudegrafiken
        `;

            a.onclick=e=>{
                e.preventDefault();
                openManager();
            };

            li.appendChild(a);

            const divider=menu.querySelector('li.divider');

            if(divider)
                menu.insertBefore(li,divider);
            else
                menu.appendChild(li);

            clearInterval(interval);

        },500);
    }

    function createModal(){
        $("body").append(`
        <div id="lss-icon-modal"
             style="
                position:fixed;
                inset:0;
                background:rgba(0,0,0,.45);
                display:none;
                justify-content:center;
                align-items:center;
                z-index:999999;
             ">
            <div class="panel panel-default"
                 style="
                    width:1100px;
                    max-width:95%;
                    max-height:90%;
                    overflow:auto;
                    margin:0;
                 ">
                <div class="panel-heading">
                    <b>Feuerwachen ohne Grafik</b>
                    <span id="lss-icon-close"
                          style="float:right;cursor:pointer;font-size:20px;">
                        &times;
                    </span>
                </div>
                <div class="panel-body">
                    <p id="lss-counter"></p>
                    <div class="form-inline"
                         style="margin-bottom:15px;">
                        <label>Globale Grafik:</label>
                        <input type="file"
                               id="lss-global-image"
                               class="form-control"
                               accept="image/png,image/jpeg">
                        <span id="lss-global-preview"
                              style="margin-left:10px;">
                            Bildvorschau
                        </span>
                        <button class="btn btn-primary btn-xs"
                                 id="lss-save-all">
                                 Alle speichern
                        </button>

                        <button class="btn btn-danger btn-xs"
                                id="lss-cancel-all"
                                disabled>
                            Abbrechen
                        </button>
                    </div>
                    <table id="lss-icon-table"
                           class="table table-striped table-bordered">
                        <thead>
                            <tr>
                                <th>Wachenname</th>
                                <th>Bilddatei wählen</th>
                                <th>Vorschau</th>
                                <th>Status</th>
                                <th>Aktion</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>
    `);

        $("#lss-icon-close").on("click",()=>{
            $("#lss-icon-modal").hide();
        });

        $(document).on("change","#lss-icon-table input[type=file]",function(){
            const input=this;
            const file=input.files[0];

            if(!file)
                return;

            const reader=new FileReader();

            reader.onload=function(e){
                $(input)
                    .closest("tr")
                    .find(".lss-preview")
                    .html(`
                    <img src="${e.target.result}"
                         width="40">
                `);
            };

            reader.readAsDataURL(file);
        });

        $(document).on("change","#lss-global-image",function(){
            globalImage=this.files[0];

            if(!globalImage)
                return;

            const reader=new FileReader();

            reader.onload=function(e){
                $("#lss-global-preview").html(`
                <img src="${e.target.result}"
                     width="40">
            `);
            };

            reader.readAsDataURL(globalImage);
        });

        $(document).on("click",".lss-save",async function(){
            const button=$(this);
            const row=button.closest("tr");

            button
                .prop("disabled",true)
                .text("Speichere...");

            await saveBuilding(row);

            button
                .prop("disabled",false)
                .text("Speichern");
        });

        $(document).on("click","#lss-save-all",async function(){

            if(!globalImage){
                alert("Bitte zuerst eine globale Grafik auswählen.");
                return;
            }

            const rows=$("#lss-icon-table tbody tr").toArray();

            saveCancelled=false;
            saveRunning=true;

            saveCurrent=0;
            saveTotal=rows.length;

            $("#lss-save-all")
                .prop("disabled",true);

            $("#lss-cancel-all")
                .prop("disabled",false);

            for(const row of rows){

                if(saveCancelled)
                    break;

                await saveBuilding($(row));

                await new Promise(r=>setTimeout(r,100));
            }

            saveRunning=false;

            $("#lss-save-all")
                .prop("disabled",false);

            $("#lss-cancel-all")
                .prop("disabled",true);

            if(saveCancelled){

                $("#lss-counter")
                    .text(`Abgebrochen bei Wache ${saveCurrent} von ${saveTotal}`);

            }else{

                $("#lss-counter")
                    .text(`Alle ${saveTotal} Wachen gespeichert`);

            }

        });

        $(document).on("click","#lss-cancel-all",function(){

            saveCancelled=true;

            $("#lss-counter")
                .text("Abbruch angefordert...");

        });
    }

    async function saveBuilding(row){

        const id=row.data("id");
        const input=row.find("input[type=file]")[0];

        const file=input?.files.length
        ? input.files[0]
        : globalImage;

        if(!file){
            row.find(".lss-status").text("Keine Grafik");
            return;
        }

        saveCurrent++;

        $("#lss-counter")
            .text(`Speichere Wache ${saveCurrent} von ${saveTotal}`);

        row.find(".lss-status")
            .text("Speichere...");

        try{

            const response=await fetch(`/buildings/${id}/edit`,{
                credentials:"same-origin"
            });

            const html=await response.text();

            const doc=new DOMParser()
            .parseFromString(html,"text/html");

            const form=doc.querySelector("form");

            if(!form)
                throw new Error("Formular nicht gefunden.");

            const formData=new FormData(form);

            formData.set("building[image]",file);

            const save=await fetch(`/buildings/${id}`,{
                method:"POST",
                credentials:"same-origin",
                body:formData
            });

            if(!save.ok)
                throw new Error(`HTTP ${save.status}`);

            row.find(".lss-status")
                .text("Gespeichert");

        }catch(e){

            console.error(e);

            row.find(".lss-status")
                .text("Fehler");

        }
    }

    async function openManager(){
        $("#lss-icon-modal").show();
        $("#lss-counter").text("Lade API...");
        $("#lss-icon-table tbody").empty();

        try{
            const response=await fetch("/api/v2/buildings",{
                credentials:"same-origin",
                headers:{
                    "Accept":"application/json"
                }
            });

            if(!response.ok)
                throw new Error(`HTTP ${response.status}`);

            const data=await response.json();

            buildings=data.result;
            buildings=buildings.filter(b =>
                                       b.building_type===0 &&
                                       b.small_building===false &&
                                       !b.custom_icon_url
                                      );
            buildings.sort((a,b)=>
                           a.caption.localeCompare(b.caption,"de")
                          );

            $("#lss-counter")
                .text(`${buildings.length} Feuerwachen ohne Grafik gefunden`);
            const tbody=$("#lss-icon-table tbody");
            for(const b of buildings){
                tbody.append(`
                    <tr data-id="${b.id}">
                        <td>
                            ${b.caption}
                        </td>
                        <td>
                            <input type="file"
                                   accept="image/png,image/jpeg">
                        </td>
                        <td class="lss-preview">
    -
</td>
<td class="lss-status">
    Bereit
</td>
<td>
    <button class="btn btn-success btn-xs lss-save">
        Speichern
    </button>
</td>
                    </tr>
                `);
            }
        }catch(e){
            console.error(e);
            $("#lss-counter")
                .text(`Fehler: ${e.message}`);
        }
    }

    createButton();
    createModal();
})();
