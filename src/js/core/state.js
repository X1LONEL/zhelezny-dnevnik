/* ============================================================
   Состояние и хранилище
   ============================================================ */
const LS = "zhd_v1";
let DB = null;
let S = {
  settings: {startDate:null},
  workouts: [],            // [{id, date, ts, day, week, block, entries:[{e, sets:[{w,r,rpe}], note}], note}]
  body: {entries:[]},      // [{d, kg, waist, arm}]
  nut: {},                 // {"ГГГГ-ММ": {"ГГГГ-ММ-ДД": {items:[{k,n,kcal,p,f,c}]}}}
  draft: null              // {day, week, block, date, entries:{exId:{sets:[...], note}}}
};
let uiDay = null;          // выбранный пользователем день (переопределяет авто)
let dbReady = false;

function lsSave(){ try{ localStorage.setItem(LS, JSON.stringify({settings:S.settings, workouts:S.workouts, body:S.body, nut:S.nut, draft:S.draft})); }catch(e){} }
function lsLoad(){ try{ const r = localStorage.getItem(LS); return r ? JSON.parse(r) : null; }catch(e){ return null; } }

/* ------------------------------------------------------------
   Слияние с облаком. Правило одно: облако — основа, а записи,
   сделанные офлайн, до-заливаются наверх, а не затираются.
   ------------------------------------------------------------ */
// Вес тела: ключ — дата. При совпадении даты выигрывает облако.
function mergeBody(cloud, local){
  const c = (Array.isArray(cloud) ? cloud : []).filter(e => e && e.d);
  const dates = new Set(c.map(e => e.d));
  const localOnly = (Array.isArray(local) ? local : []).filter(e => e && e.d && !dates.has(e.d));
  const entries = c.concat(localOnly).sort((a,b)=> a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
  return {entries, localOnly:localOnly.length};
}
// Питание за месяц: ключ — день. При совпадении дня выигрывает облако.
function mergeNutMonth(cloud, local){
  const days = Object.assign({}, cloud || {});
  let localOnly = 0;
  Object.keys(local || {}).forEach(d => { if(!days[d]){ days[d] = local[d]; localOnly++; } });
  return {days, localOnly};
}

let saveTimer = null, saveMsgTimer = null;
function markSaving(){
  const el = document.getElementById("saveState");
  el.textContent = "сохраняю…";
  clearTimeout(saveMsgTimer);
  saveMsgTimer = setTimeout(()=>{ el.textContent = dbReady ? "сохранено" : "сохранено локально"; }, 900);
}
function queueDraftSave(){
  lsSave(); markSaving();
  if(!DB) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async ()=>{
    try{ await DB.doc("meta/draft").set(S.draft ? {d:S.draft} : {d:null}); }catch(e){}
  }, 1200);
}
async function saveSettings(){
  lsSave();
  if(!DB) return;
  try{ await DB.doc("meta/settings").set(S.settings); }catch(e){}
}
const nutTimers = {};
async function saveNut(mk){
  lsSave(); markSaving();
  if(!DB) return;
  clearTimeout(nutTimers[mk]);
  nutTimers[mk] = setTimeout(async ()=>{
    try{ await DB.collection("nutrition").doc(mk).set({days:S.nut[mk] || {}}); }catch(e){}
  }, 900);
}
async function saveBody(){
  lsSave();
  if(!DB) return;
  try{ await DB.doc("meta/body").set({entries:S.body.entries}); }catch(e){}
}
