/* ============================================================
   Рендер: шапка
   ============================================================ */
function renderHeader(){
  const week = programWeek(), blk = blockOf(week);
  document.getElementById("cycleName").textContent = week === 9 ? "Разгрузка" : (blk === 1 ? "Full Body" : "Верх / Низ / Фулбоди");
  document.getElementById("chipWeek").innerHTML = "Неделя <b>"+week+"</b> из 9";
  const mon = mondayOf(today());
  const thisWeek = S.workouts.filter(w => parseISO(w.date) >= mon).length;
  const dots = document.getElementById("dotsWeek");
  dots.innerHTML = "";
  for(let i=0;i<3;i++){ const s = document.createElement("span"); s.className = "dot"+(i<thisWeek?" f":""); dots.appendChild(s); }
  document.getElementById("chipDots").firstChild.textContent = "Эта неделя " + thisWeek + "/3 ";
  const st = streakWeeks();
  const cs = document.getElementById("chipStreak");
  cs.innerHTML = st > 0 ? "Серия <b>"+st+"</b> нед." : "Серия 0";
  cs.className = "chip" + (st >= 2 ? " on" : "");
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
let restLeft = 0, restInt = null;
function startRestTimer(sec){
  restLeft = sec;
  document.getElementById("restTimer").classList.add("on");
  paintRest();
  clearInterval(restInt);
  restInt = setInterval(()=>{
    restLeft--; paintRest();
    if(restLeft <= 0){ clearInterval(restInt); setTimeout(stopRest, 2500); }
  }, 1000);
}
function paintRest(){
  const m = Math.max(0, Math.floor(restLeft/60)), s = Math.max(0, restLeft%60);
  document.getElementById("restT").textContent = m + ":" + pad(s);
}
function stopRest(){ clearInterval(restInt); document.getElementById("restTimer").classList.remove("on"); }

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

function renderAll(){
  renderHeader();
  renderTrain();
  renderLog();
  renderPlan();
  if(activeTab === "prog") renderProgress();
  if(activeTab === "food") renderFood();
}
