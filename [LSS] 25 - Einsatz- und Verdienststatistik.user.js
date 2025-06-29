// ==UserScript==
// @name         [LSS] Einsatz- und Verdienststatistik (Kompakt)
// @namespace    https://github.com/Caddy21/LSS-Scripte
// @version      1.3
// @description  Zeigt Einsatz- und Verdienststatistiken für Tag / Woche / Monat / Jahr in der Einsatzliste an
// @author       Caddy21
// @match        https://www.leitstellenspiel.de
// @grant        GM.getValue
// @grant        GM.setValue
// ==/UserScript==

(function() {
    'use strict';

    // --- Styles ---
    (function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
.stats-container {
    margin-top: 15px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
    gap: 15px;
    font-family: Arial, sans-serif;
    color: white;
}
.stat-block {
    display: flex;
    align-items: center;
    background: #222;
    padding: 12px 15px;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    user-select: none;
}
.stat-content {
    flex-grow: 1;
}
.stat-label {
    font-weight: 700;
    font-size: 1.5rem;
    margin-bottom: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
}
.stat-icon-left,
.stat-icon-right {
    font-size: 16px;
}
.stat-values {
    font-size: 1.4rem;
    line-height: 1.5;
    display: grid;
    grid-template-columns: auto 1fr;
    row-gap: 5px;
}
.stat-values .label {
    justify-self: start;
    font-size: inherit;
    font-weight: 400;
}
.stat-values .value {
    justify-self: end;
    font-size: inherit;
    font-weight: 400;
}
        `;
        document.head.appendChild(style);
    })();

    function getISOWeek(d) {
        d = new Date(d); const dayNr = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - dayNr + 3);
        const firstThu = new Date(d.getFullYear(), 0, 4);
        return 1 + Math.floor((d - firstThu) / 86400000 / 7);
    }

    function statBlock(id, color, icon, label) {
        const w = document.createElement('div');
        w.className = `stat-block ${color}`; w.id = id;
        w.innerHTML = `<div class="stat-content">
    <div class="stat-label"><span>${icon}</span>${label}<span>${icon}</span></div>
    <div class="stat-values"></div></div>`;
        return w;
    }

    function fillBlock(wrapper, labels, values, unit='') {
        wrapper.innerHTML = labels.map((l,i) =>
            `<div class="label">${l}</div><div class="value">${typeof values[i] === "number" ? values[i].toLocaleString('de-DE') : values[i]}${unit}</div>`
        ).join('');
    }

    // --- Statistik-Container ---
    function createStatsContainer(fallback) {
        if(document.getElementById('average_earnings_display')) return;
        let parent=null, before=null;
        const btn=document.getElementById('categoryButtonContainer');
        if(btn&&btn.parentNode){parent=btn.parentNode;before=btn.nextSibling;}
        else if(fallback){
            const inp=document.getElementById('search_input_field_missions');
            if(inp&&inp.parentNode){parent=inp.parentNode;before=inp;}
        }
        if(!parent) return;
        const s=document.createElement('section'); s.id='average_earnings_display'; s.className='stats-container';
        s.append(
            statBlock('today_missions_wrapper','red','🚨','Einsätze'),
            statBlock('today_earnings_wrapper','green','💰','Verdienst'),
            statBlock('patients_count_wrapper','yellow','🩺','Patienten'),
            statBlock('prisoners_count_wrapper','orange','🔒','Gefangene')
        );
        before?parent.insertBefore(s,before):parent.appendChild(s);
    }

    // --- Statistik-Updates ---
    async function updateStats() {
        // Einsätze
        const acc=document.querySelectorAll('.missionSideBarEntry .glyphicon-user:not(.hidden)');
        let [t,w,m,y,cf] = await Promise.all([
            GM.getValue('today_missions',0), GM.getValue('week_missions',0), GM.getValue('month_missions',0), GM.getValue('year_missions',0),
            GM.getValue('counted_finished_missions',[])
        ]);
        const d=new Date(), ds=d.toISOString().slice(0,10), ms=d.toISOString().slice(0,7), ys=d.getFullYear().toString(), kw=getISOWeek(d), kwy=`${ys}-KW${kw.toString().padStart(2,'0')}`;
        let [lsd,lsw,lsm,lsy]=await Promise.all([
            GM.getValue('last_saved_date_missions',''), GM.getValue('last_saved_week_missions',''), GM.getValue('last_saved_month_missions',''), GM.getValue('last_saved_year_missions','')
        ]);
        if(lsd!==ds){t=0;cf=[];await GM.setValue('today_missions',0);await GM.setValue('counted_finished_missions',[]);await GM.setValue('last_saved_date_missions',ds);
                     if(lsw!==kwy){w=0;await GM.setValue('week_missions',0);await GM.setValue('last_saved_week_missions',kwy);}
                     if(lsm!==ms){m=0;await GM.setValue('month_missions',0);await GM.setValue('last_saved_month_missions',ms);}
                     if(lsy!==ys){y=0;await GM.setValue('year_missions',0);await GM.setValue('last_saved_year_missions',ys);}
                    }
        for(const el of acc){const me=el.closest('.missionSideBarEntry');if(me&&!cf.includes(me.id)){t++;w++;m++;y++;cf.push(me.id);}}
        await Promise.all([
            GM.setValue('today_missions',t),GM.setValue('week_missions',w),GM.setValue('month_missions',m),GM.setValue('year_missions',y),GM.setValue('counted_finished_missions',cf)
        ]);
        const mW=document.querySelector('#today_missions_wrapper .stat-values');
        if(mW) fillBlock(mW,["Heute:","Diese Woche:","Im Monat "+d.toLocaleString('de-DE',{month:'long'})+":","Im Jahr "+ys+":"],[t,w,m,y],' Stück');

        // Verdienst
        const finished=document.querySelectorAll('.missionSideBarEntry.mission_deleted');
        let [te,we,me,ye,cm] = await Promise.all([
            GM.getValue('today_earnings',0), GM.getValue('week_earnings',0), GM.getValue('month_earnings',0), GM.getValue('year_earnings',0),
            GM.getValue('counted_missions',[])
        ]);
        let [lsdE,lswE,lsmE,lsyE]=await Promise.all([
            GM.getValue('last_saved_date',''), GM.getValue('last_saved_week',''), GM.getValue('last_saved_month',''), GM.getValue('last_saved_year','')
        ]);
        if(lsdE!==ds){te=0;cm=[];await GM.setValue('today_earnings',0);await GM.setValue('counted_missions',[]);await GM.setValue('last_saved_date',ds);
                      if(lswE!==kw.toString()){we=0;await GM.setValue('week_earnings',0);await GM.setValue('last_saved_week',kw.toString());}
                      if(lsmE!==ms){me=0;await GM.setValue('month_earnings',0);await GM.setValue('last_saved_month',ms);}
                      if(lsyE!==ys){ye=0;await GM.setValue('year_earnings',0);await GM.setValue('last_saved_year',ys);}
                     }
        for(const el of finished){
            const id=el.id;
            if(!cm.includes(id)){
                let cr = 250;
                const sortableData = el.getAttribute('data-sortable-by');
                if (sortableData) {
                    try {
                        const data = JSON.parse(sortableData);
                        if (typeof data.average_credits === "number") {
                            cr = data.average_credits;
                        }
                    } catch (e) {
                        // Fehlerhafte Daten ignorieren, Fallback bleibt 250
                    }
                }
                te+=cr; we+=cr; me+=cr; ye+=cr; cm.push(id);
            }
        }
        await Promise.all([
            GM.setValue('today_earnings',te),GM.setValue('week_earnings',we),GM.setValue('month_earnings',me),GM.setValue('year_earnings',ye),GM.setValue('counted_missions',cm)
        ]);
        const eW=document.querySelector('#today_earnings_wrapper .stat-values');
        if(eW) fillBlock(eW,["Heute:","Diese Woche:","Im Monat "+d.toLocaleString('de-DE',{month:'long'})+":","Im Jahr "+ys+":"],[te,we,me,ye],' Credits');

        // Patienten
        let [tp,wp,mp,yp,cp] = await Promise.all([
            GM.getValue('today_patients',0),GM.getValue('week_patients',0),GM.getValue('month_patients',0),GM.getValue('year_patients',0),
            GM.getValue('counted_patients',[])
        ]);
        const pat=document.querySelectorAll('.col-md-6.small[id^="patient_"]');
        for(const p of pat){if(!cp.includes(p.id)){tp++;wp++;mp++;yp++;cp.push(p.id);}}
        await Promise.all([
            GM.setValue('today_patients',tp),GM.setValue('week_patients',wp),GM.setValue('month_patients',mp),GM.setValue('year_patients',yp),GM.setValue('counted_patients',cp)
        ]);
        const pW=document.querySelector('#patients_count_wrapper .stat-values');
        if(pW) fillBlock(pW,["Heute:","Diese Woche:","Im Monat "+d.toLocaleString('de-DE',{month:'long'})+":","Im Jahr "+ys+":"],[tp,wp,mp,yp],' Stück');

        // Gefangene
        let [tpr,wpr,mpr,ypr,cpr] = await Promise.all([
            GM.getValue('today_prisoners',0),GM.getValue('week_prisoners',0),GM.getValue('month_prisoners',0),GM.getValue('year_prisoners',0),
            GM.getValue('counted_prisoners',[])
        ]);
        const prs=document.querySelectorAll('[id^="prisoner_"]');
        for(const p of prs){if(!cpr.includes(p.id)){tpr++;wpr++;mpr++;ypr++;cpr.push(p.id);}}
        await Promise.all([
            GM.setValue('today_prisoners',tpr),GM.setValue('week_prisoners',wpr),GM.setValue('month_prisoners',mpr),GM.setValue('year_prisoners',ypr),GM.setValue('counted_prisoners',cpr)
        ]);
        const prW=document.querySelector('#prisoners_count_wrapper .stat-values');
        if(prW) fillBlock(prW,["Heute:","Diese Woche:","Im Monat "+d.toLocaleString('de-DE',{month:'long'})+":","Im Jahr "+ys+":"],[tpr,wpr,mpr,ypr],' Stück');
    }

    // --- Startlogik ---
    function ensureStatsContainerExists(fallback=false){createStatsContainer(fallback);updateStats();}

    function startStats(fallback=false){
        if(!window.__statsStarted){
            window.__statsStarted=true;
            setInterval(updateStats,1000);
        }
        ensureStatsContainerExists(fallback);
    }

    // --- Scriptstart ---
    (function(){
        if(window.categoryButtonReady) startStats(false);
        else {
            document.addEventListener('categoryButtonReady',()=>startStats(false));
            setTimeout(()=>{if(!window.__statsStarted)startStats(true);},2000);
        }
    })();

})();
