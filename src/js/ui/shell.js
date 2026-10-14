/* ============================================================
   Рендер: шапка и плита недели
   ============================================================ */
function blockName(week){ return week === 9 ? "Разгрузка" : (blockOf(week) === 1 ? "Full Body" : "Верх / Низ / Фулбоди"); }
function renderHeader(){
  const week = programWeek(), blk = blockOf(week);
  document.getElementById("cycleName").textContent = "Неделя " + week + " из 9 · " + blockName(week);
  document.getElementById("chipWeek").innerHTML = "Неделя <b>"+week+"</b>/9";
  const mon = mondayOf(today());
  const thisWeek = S.workouts.filter(w => parseISO(w.date) >= mon).length;
  const st = streakWeeks();
  const cs = document.getElementById("chipStreak");
  cs.innerHTML = "Серия <b>"+st+"</b> нед.";
  cs.className = "chip hide-s" + (st >= 2 ? " on" : "");

  // плита недели на экране тренировки
  document.getElementById("slabBlock").textContent =
    week === 9 ? "Разгрузочная неделя" : "Блок " + blk + " · " + blockName(week);
  document.getElementById("slabWeek").innerHTML = "Неделя " + pad(week) + "<small>/09</small>";
  const bar = document.getElementById("cycleBar");
  bar.innerHTML = "";
  for(let i = 1; i <= 9; i++){
    const c = document.createElement("span");
    c.className = "cyc" + (isDeload(i) ? " dl" : "") + (i < week ? " past" : "") + (i === week ? " now" : "");
    bar.appendChild(c);
  }
  document.getElementById("weekNote").textContent = WEEKNOTE[week] || "";
  document.getElementById("wkCount").textContent = thisWeek + "/3";
  const dots = document.getElementById("dotsWeek");
  dots.innerHTML = "";
  for(let i=0;i<3;i++){ const s = document.createElement("span"); s.className = "dot"+(i<thisWeek?" f":""); dots.appendChild(s); }
  document.getElementById("slabStreak").textContent = st + " нед.";
  const ws = sortedWorkouts();
  const last = ws.length ? ws[ws.length-1] : null;
  document.getElementById("slabLast").textContent = last
    ? fmtShort(last.date) + " · " + (DAYS[last.day] ? DAYS[last.day].label : last.day)
    : "—";
}
function weeksMap(){
  const m = new Map();
  S.workouts.forEach(w => { const k = iso(mondayOf(parseISO(w.date))); m.set(k, (m.get(k)||0)+1); });
  return m;
}
function streakWeeks(){
  const m = weeksMap();
  let cur = mondayOf(today()), n = 0;
  if((m.get(iso(cur))||0) >= 3) n++;
  cur = new Date(cur); cur.setDate(cur.getDate()-7);
  while((m.get(iso(cur))||0) >= 3){ n++; cur.setDate(cur.getDate()-7); }
  return n;
}

/* ============================================================
   Таймер отдыха
   ============================================================ */
let restLeft = 0, restTotal = 1, restInt = null;
const RING_LEN = 113.1;   // длина окружности r=18
function startRestTimer(sec){
  restLeft = sec; restTotal = sec;
  const el = document.getElementById("restTimer");
  el.classList.add("on"); el.classList.remove("end");
  paintRest();
  clearInterval(restInt);
  restInt = setInterval(()=>{
    restLeft--; paintRest();
    if(restLeft <= 0){
      clearInterval(restInt);
      el.classList.add("end");
      restSignal();
      setTimeout(stopRest, 4000);
    }
  }, 1000);
}
function paintRest(){
  const m = Math.max(0, Math.floor(restLeft/60)), s = Math.max(0, restLeft%60);
  document.getElementById("restT").textContent = restLeft <= 0 ? "Подход!" : m + ":" + pad(s);
  const f = Math.max(0, Math.min(1, restLeft / restTotal));
  document.getElementById("restRing").setAttribute("stroke-dashoffset", String(RING_LEN * (1 - f)));
}
function stopRest(){ clearInterval(restInt); document.getElementById("restTimer").classList.remove("on","end"); }
// Сигнал конца отдыха. Звук разрешён, потому что таймер запустило касание;
// вибрацию и звук браузер вправе запретить — тогда остаётся надпись.
let audioCtx = null;
function restSignal(){
  try{ if(navigator.vibrate) navigator.vibrate([180, 90, 180]); }catch(e){}
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.22].forEach(t => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      const at = audioCtx.currentTime + t;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      o.start(at); o.stop(at + 0.2);
    });
  }catch(e){}
}

/* ============================================================
   Подтверждение. confirm() в артефакте не показывается и сразу
   возвращает false, поэтому спрашиваем своим окном на странице.
   ============================================================ */
let confirmResolve = null;
function askConfirm(title, text, yes){
  const box = document.getElementById("confirmBox");
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmText").textContent = text || "";
  document.getElementById("confirmYes").textContent = yes || "Да";
  box.hidden = false;
  document.getElementById("confirmNo").focus();
  return new Promise(res => { confirmResolve = res; });
}
function closeConfirm(v){
  document.getElementById("confirmBox").hidden = true;
  const r = confirmResolve; confirmResolve = null;
  if(r) r(v);
}
document.getElementById("confirmYes").onclick = ()=>closeConfirm(true);
document.getElementById("confirmNo").onclick = ()=>closeConfirm(false);
document.getElementById("confirmBox").addEventListener("click", e => { if(e.target.id === "confirmBox") closeConfirm(false); });
document.addEventListener("keydown", e => { if(e.key === "Escape" && confirmResolve) closeConfirm(false); });

/* ============================================================
   Вкладки, тосты, общий рендер
   ============================================================ */
const TABS = {train:"p-train", log:"p-log", prog:"p-prog", food:"p-food", plan:"p-plan"};
let activeTab = "train";
function switchTab(k){
  activeTab = k;
  Object.keys(TABS).forEach(t => {
    document.getElementById("p-"+t).classList.toggle("on", t === k);
    const b = document.getElementById("tab-"+t);
    b.setAttribute("aria-selected", t === k ? "true" : "false");
  });
  hideTip();
  if(k === "prog") renderProgress();
  if(k === "food"){ renderFoodRef(); renderFood(); }
  window.scrollTo({top:0, behavior:"instant"});
}
Object.keys(TABS).forEach(t => document.getElementById("tab-"+t).onclick = ()=>switchTab(t));

let toastT = null;
function toast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg; el.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(()=>el.classList.remove("on"), 3200);
}

function setSaveState(text, local){
  const el = document.getElementById("saveState");
  el.textContent = text;
  el.classList.toggle("local", !!local);
}

function renderAll(){
  renderHeader();
  renderTrain();
  renderLog();
  renderPlan();
  if(activeTab === "prog") renderProgress();
  if(activeTab === "food") renderFood();
}
