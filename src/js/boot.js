/* ============================================================
   Обработчики
   ============================================================ */
document.getElementById("btnFinish").onclick = finishWorkout;
document.getElementById("btnClear").onclick = ()=>{
  if(!draftHasData()){ toast("Нечего сбрасывать"); return; }
  if(!confirm("Очистить все введённые подходы этой тренировки?")) return;
  S.draft = null; queueDraftSave(); renderTrain();
};
document.getElementById("btnExport").onclick = exportCsv;
document.getElementById("restPlus").onclick = ()=>{ restLeft += 30; paintRest(); };
document.getElementById("restStop").onclick = stopRest;
document.getElementById("startDate").onchange = e => {
  S.settings.startDate = e.target.value || null;
  S.draft = null; uiDay = null;
  saveSettings(); renderAll();
  toast("Старт цикла: неделя " + programWeek());
};
document.getElementById("bwAdd").onclick = async ()=>{
  const d = document.getElementById("bwDate").value || iso(today());
  const kg = parseFloat(document.getElementById("bwKg").value);
  if(!kg){ toast("Укажи вес в килограммах"); return; }
  const waist = parseFloat(document.getElementById("bwWaist").value) || null;
  const arm = parseFloat(document.getElementById("bwArm").value) || null;
  S.body.entries = S.body.entries.filter(x => x.d !== d);
  S.body.entries.push({d, kg, waist, arm});
  S.body.entries.sort((a,b)=> a.d < b.d ? -1 : 1);
  document.getElementById("bwKg").value = ""; document.getElementById("bwWaist").value = ""; document.getElementById("bwArm").value = "";
  await saveBody();
  renderBody(); renderKpis();
  toast("Записано: " + fmtKg(kg) + " кг");
};

document.getElementById("fdPrev").onclick = ()=>{ const d = parseISO(fdDate); d.setDate(d.getDate()-1); fdDate = iso(d); renderFood(); };
document.getElementById("fdNext").onclick = ()=>{ const d = parseISO(fdDate); d.setDate(d.getDate()+1); if(d > today()) return; fdDate = iso(d); renderFood(); };
document.getElementById("fdToday").onclick = ()=>{ fdDate = iso(today()); renderFood(); };
document.getElementById("fdFill").onclick = ()=>{
  const cur = nutItems(fdDate).slice();
  MEALS.forEach(m => { if(!cur.some(x => x.k === m.k)) cur.push({k:m.k, n:m.t, kcal:m.kcal, p:m.p, f:m.f, c:m.c}); });
  nutWrite(fdDate, cur); renderFood();
  toast("День заполнен по плану: 3030 ккал");
};
document.getElementById("cuAdd").onclick = ()=>{
  const n = document.getElementById("cuName").value.trim();
  const kcal = parseFloat(document.getElementById("cuKcal").value);
  if(!n || !kcal){ toast("Нужны название и калорийность"); return; }
  const g = id => parseFloat(document.getElementById(id).value) || 0;
  const cur = nutItems(fdDate).slice();
  cur.push({k:"x"+Date.now(), n, kcal, p:g("cuP"), f:g("cuF"), c:g("cuC")});
  nutWrite(fdDate, cur);
  ["cuName","cuKcal","cuP","cuF","cuC"].forEach(id => document.getElementById(id).value = "");
  renderFood();
};
document.getElementById("cuName").addEventListener("keydown", e => { if(e.key === "Enter") document.getElementById("cuAdd").click(); });

let resizeT = null;
window.addEventListener("resize", ()=>{
  clearTimeout(resizeT);
  resizeT = setTimeout(()=>{ if(activeTab === "prog") renderProgress(); if(activeTab === "food") renderNutCharts(); }, 220);
});
const mq = window.matchMedia("(prefers-color-scheme: dark)");
if(mq.addEventListener) mq.addEventListener("change", ()=>{ if(activeTab === "prog") renderProgress(); if(activeTab === "food") renderNutCharts(); });

/* ============================================================
   Запуск
   ============================================================ */
function seedDefaults(){
  if(!S.settings.startDate) S.settings.startDate = iso(mondayOf(today()));
  document.getElementById("bwDate").value = iso(today());
}

(function boot(){
  const cached = lsLoad();
  if(cached){
    S.settings = Object.assign(S.settings, cached.settings || {});
    S.workouts = cached.workouts || [];
    S.body = cached.body || {entries:[]};
    S.nut = cached.nut || {};
    S.draft = cached.draft || null;
  }
  seedDefaults();
  renderAll();
  document.getElementById("saveState").textContent = "сохранено локально";

  // Облачное хранилище — подключается, когда станет доступно
  (async ()=>{
    let db = null;
    try{ db = await window.claude.use("db"); }catch(e){}
    if(!db){
      document.getElementById("saveState").textContent = "сохранено на этом устройстве";
      return;
    }
    DB = db; dbReady = true;
    try{
      const st = await DB.doc("meta/settings").get();
      if(st.exists && st.data().startDate){ S.settings = Object.assign(S.settings, st.data()); }
      else { await DB.doc("meta/settings").set(S.settings); }

      const bd = await DB.doc("meta/body").get();
      const mb = mergeBody(bd.exists ? bd.data().entries : [], S.body.entries);
      S.body.entries = mb.entries;
      if(mb.localOnly) await DB.doc("meta/body").set({entries:S.body.entries});

      const dr = await DB.doc("meta/draft").get();
      if(dr.exists && dr.data().d && !draftHasData()) S.draft = dr.data().d;

      DB.collection("nutrition").onSnapshot(nsnap => {
        const inCloud = {}, push = [];
        nsnap.docs.forEach(doc => {
          inCloud[doc.id] = true;
          const mn = mergeNutMonth(doc.data().days, S.nut[doc.id]);
          S.nut[doc.id] = mn.days;
          if(mn.localOnly) push.push(doc.id);
        });
        // месяцы, записанные офлайн, в облаке не появятся сами — до-заливаем
        Object.keys(S.nut).forEach(mk => { if(!inCloud[mk] && Object.keys(S.nut[mk]).length) push.push(mk); });
        push.forEach(mk => { DB.collection("nutrition").doc(mk).set({days:S.nut[mk]}).catch(()=>{}); });
        lsSave();
        if(activeTab === "food") renderFood();
      }, ()=>{});

      DB.collection("workouts").onSnapshot(snap => {
        const cloud = snap.docs.map(d => d.data()).filter(w => w && w.entries);
        const ids = new Set(cloud.map(w=>w.id));
        const localOnly = S.workouts.filter(w => !ids.has(w.id));
        localOnly.forEach(w => { DB.collection("workouts").doc(w.id).set(w).catch(()=>{}); });
        S.workouts = cloud.concat(localOnly);
        lsSave();
        document.getElementById("saveState").textContent = "сохранено";
        renderAll();
      }, ()=>{ document.getElementById("saveState").textContent = "сохранено на этом устройстве"; });
    }catch(e){
      document.getElementById("saveState").textContent = "сохранено на этом устройстве";
    }
  })();
})();
