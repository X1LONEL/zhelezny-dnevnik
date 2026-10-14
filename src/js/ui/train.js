/* ============================================================
   Рендер: экран тренировки
   ============================================================ */
function renderTrain(){
  const week = programWeek(), rot = rotFor(week), dayKey = currentDay();
  const d = ensureDraft(dayKey);
  const pres = prescribe(dayKey, week);
  const next = autoDay();

  // переключатель дня
  const dp = document.getElementById("dayPick");
  dp.innerHTML = "";
  rot.forEach(k => {
    const b = document.createElement("button");
    b.className = "daybtn"; b.type = "button";
    b.setAttribute("aria-pressed", k === dayKey ? "true" : "false");
    b.innerHTML = esc(DAYS[k].label) + (k === next && k !== dayKey ? '<span class="nx">по очереди</span>' : '');
    b.onclick = async ()=>{
      if(k === dayKey) return;
      if(draftHasData() && !(await askConfirm("Сменить день?", "Подходы, введённые для «"+DAYS[dayKey].label+"», не записаны и пропадут.", "Сменить"))) return;
      uiDay = k; S.draft = null; renderTrain(); queueDraftSave();
    };
    dp.appendChild(b);
  });

  // дата тренировки: по умолчанию сегодня, можно записать вчерашнюю
  const dateIn = document.getElementById("woDate");
  dateIn.max = iso(today());
  dateIn.value = d.date || iso(today());

  const list = document.getElementById("exList");
  list.innerHTML = "";
  pres.forEach((pre, i) => {
    const ex = EX[pre.e], en = d.entries[pre.e];
    const hist = exHistory(pre.e);
    const sg = suggest(pre.e, pre);
    const prevBest = bestEver(pre.e);

    const card = document.createElement("div");
    card.className = "ex"; card.id = "ex_"+pre.e;

    const unitLbl = ex.kind === "time" ? "сек" : (ex.kind === "bw" ? "+кг" : "кг");
    const head = document.createElement("div");
    head.className = "exhead";
    head.innerHTML =
      '<div class="idx">'+pad(i+1)+'</div>'+
      '<div class="exname"><div class="n"></div>'+
        '<div class="p"><span class="g">'+pre.s+' × '+repsLabel(pre.r)+(ex.kind==="time"?" сек":"")+'</span> · '+rpeLabel(pre.rpe)+' · '+GROUPS[ex.g]+'</div></div>'+
      '<div class="target'+(sg.up?' up':'')+'"></div>';
    head.querySelector(".n").textContent = ex.n + (ex.uni ? " (на сторону)" : "");
    head.querySelector(".target").textContent = sg.text;
    card.appendChild(head);

    const prog = document.createElement("div");
    prog.className = "exprog"; prog.innerHTML = "<i></i>";
    card.appendChild(prog);

    const warm = document.createElement("div");
    warm.className = "warm"; warm.id = "wu_"+pre.e;
    card.appendChild(warm);

    const sets = document.createElement("div");
    sets.className = "sets";
    const sh = document.createElement("div");
    sh.className = "sethead";
    sh.innerHTML = '<span>№</span><span>'+(ex.kind==="time"?"":unitLbl)+'</span><span></span><span>'+(ex.kind==="time"?"сек":"повт")+'</span><span>RPE</span><span></span><span></span>';
    sets.appendChild(sh);
    en.sets.forEach((st, si) => sets.appendChild(setRow(pre, en, st, si, sg, prevBest, unitLbl)));
    card.appendChild(sets);

    const plates = document.createElement("div");
    plates.className = "barbell"; plates.id = "pl_"+pre.e;
    card.appendChild(plates);

    if(hist.length){
      const last = hist[hist.length-1];
      const line = document.createElement("div");
      line.className = "lastline";
      line.innerHTML = '<b>Прошлый раз, ' + fmtShort(last.date) + ':</b> ' +
        last.sets.map(s => (ex.kind==="time" ? s.r+"с" : fmtKg(s.w||0)+"×"+s.r)).join("  ") +
        (last.note ? ' · ' + esc(last.note) : '');
      card.appendChild(line);
    }

    const foot = document.createElement("div");
    foot.className = "exfoot";
    const addBtn = document.createElement("button");
    addBtn.className = "btn sm"; addBtn.type = "button"; addBtn.textContent = "+ подход";
    addBtn.onclick = ()=>{ en.sets.push({w:null,r:null,rpe:null}); queueDraftSave(); renderTrain(); };
    const note = document.createElement("input");
    note.className = "notein"; note.placeholder = "Заметка: техника, ощущения…";
    note.id = "note_"+pre.e; note.value = en.note || "";
    note.setAttribute("aria-label", "Заметка к упражнению «"+ex.n+"»");
    note.oninput = ()=>{ en.note = note.value; queueDraftSave(); };
    foot.appendChild(addBtn); foot.appendChild(note);
    card.appendChild(foot);

    list.appendChild(card);
    updateCard(pre.e);
  });

  updateSummary();
  renderHeader();
}

const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function setRow(pre, en, st, si, sg, prevBest, unitLbl){
  const ex = EX[pre.e];
  const row = document.createElement("div");
  row.className = "setrow" + (st.r != null ? " done" : "");

  const sn = document.createElement("div"); sn.className = "sn"; sn.textContent = si+1;

  const wi = document.createElement("input");
  wi.type = "number"; wi.className = "inp" + (st.w != null ? " filled" : "");
  wi.id = "w_"+pre.e+"_"+si;
  wi.inputMode = "decimal"; wi.step = "0.5";
  wi.placeholder = ex.kind === "time" ? "—" : (sg.w != null ? fmtKg(sg.w) : unitLbl);
  wi.setAttribute("aria-label", ex.n+", подход "+(si+1)+", вес");
  if(ex.kind === "time"){ wi.disabled = true; wi.value = ""; }
  else if(st.w != null) wi.value = st.w;

  const x = document.createElement("div"); x.className = "x"; x.textContent = ex.kind === "time" ? "" : "×";

  const ri = document.createElement("input");
  ri.type = "number"; ri.className = "inp" + (st.r != null ? " filled" : "");
  ri.id = "r_"+pre.e+"_"+si;
  ri.inputMode = "numeric"; ri.step = "1";
  ri.placeholder = String(sg.reps);
  ri.setAttribute("aria-label", ex.n+", подход "+(si+1)+(ex.kind==="time"?", секунды":", повторы"));
  if(st.r != null) ri.value = st.r;

  const rp = document.createElement("select");
  rp.className = "rpesel"; rp.id = "rpe_"+pre.e+"_"+si;
  rp.setAttribute("aria-label", ex.n+", подход "+(si+1)+", RPE");
  rp.innerHTML = '<option value="">—</option>' + [5,6,7,7.5,8,8.5,9,9.5,10].map(v=>'<option value="'+v+'">'+v+'</option>').join("");
  if(st.rpe != null) rp.value = String(st.rpe);

  // Отметка подхода одним касанием: пустые поля берут предложенные
  // вес и повторы — так подход «как по плану» записывается без ввода.
  // Повторное касание снимает отметку, вес остаётся.
  const ok = document.createElement("button");
  ok.className = "ok"; ok.type = "button"; ok.innerHTML = CHECK_SVG;
  ok.setAttribute("aria-label", "Подход "+(si+1)+" выполнен");
  ok.onclick = ()=>{
    if(st.r != null){ ri.value = ""; commit(false); return; }
    if(ex.kind !== "time" && wi.value === "" && sg.w != null) wi.value = fmtKg(sg.w);
    if(ri.value === "") ri.value = String(sg.reps);
    commit(true);
  };

  const del = document.createElement("button");
  del.className = "del"; del.type = "button"; del.innerHTML = "×";
  del.setAttribute("aria-label", "Удалить подход "+(si+1));
  del.onclick = ()=>{ en.sets.splice(si,1); if(!en.sets.length) en.sets.push({w:null,r:null,rpe:null}); queueDraftSave(); renderTrain(); };

  function commit(startRest){
    // Строка могла остаться от прошлого рендера: браузер шлёт change при
    // разборке DOM. Если черновик уже сменился — писать в него нечего.
    if(!S.draft || S.draft.entries[pre.e] !== en) return;
    st.w = ex.kind === "time" ? 0 : (wi.value === "" ? null : parseFloat(wi.value));
    st.r = ri.value === "" ? null : parseInt(ri.value, 10);
    st.rpe = rp.value === "" ? null : parseFloat(rp.value);
    wi.classList.toggle("filled", st.w != null);
    ri.classList.toggle("filled", st.r != null);
    row.classList.toggle("done", st.r != null);
    const isPr = ex.kind !== "time" && st.w && st.r && e1rm(st.w, st.r) > prevBest + 0.01;
    wi.classList.toggle("pr", !!isPr); ri.classList.toggle("pr", !!isPr);
    queueDraftSave(); updateSummary(); updateCard(pre.e);
    if(startRest && st.r) startRestTimer(ex.iso ? 60 : (blockOf(programWeek()) === 1 ? 105 : 150));
  }
  wi.oninput = ()=>commit(false);
  ri.oninput = ()=>commit(false);
  ri.onchange = ()=>commit(true);
  rp.onchange = ()=>commit(false);
  if(st.w != null && st.r != null){
    const isPr = ex.kind !== "time" && e1rm(st.w, st.r) > prevBest + 0.01;
    if(isPr){ wi.classList.add("pr"); ri.classList.add("pr"); }
  }

  [sn, wi, x, ri, rp, ok, del].forEach(n => row.appendChild(n));
  return row;
}

// Всё, что на карточке зависит от введённых подходов: полоса выполнения,
// разминка и раскладка блинов
function updateCard(exId){
  const card = document.getElementById("ex_"+exId);
  const en = S.draft && S.draft.entries[exId];
  if(!card || !en) return;
  const done = en.sets.filter(s => s.r).length;
  card.classList.toggle("done", done > 0 && done >= en.sets.length);
  const bar = card.querySelector(".exprog i");
  if(bar) bar.style.width = Math.round(done / Math.max(1, en.sets.length) * 100) + "%";
  updatePlates(exId);
}

function workingTarget(exId){
  const en = S.draft && S.draft.entries[exId];
  if(!en) return null;
  const w = en.sets.map(s=>s.w).filter(v=>v).pop();
  if(w) return w;
  const pre = prescribe(S.draft.day, S.draft.week).find(p=>p.e===exId);
  return pre ? suggest(exId, pre).w : null;
}

// Разминка по программе: 50% × 10, 70% × 5, во 2-м блоке ещё 85% × 2.
// Только базовые со штангой; вес кратен 2.5 (по 1.25 на сторону) и не
// легче пустого грифа.
function warmupSets(target, week){
  if(!target || target <= 25) return [];
  const steps = [[0.5,10],[0.7,5]];
  if(blockOf(week) === 2 && !isDeload(week)) steps.push([0.85,2]);
  const out = [];
  steps.forEach(([p, r]) => {
    const w = Math.max(20, Math.round(target*p/2.5)*2.5);
    if(w < target && !out.some(o => o.w === w)) out.push({w, r});
  });
  return out;
}

// высота блина на рисунке, px — чтобы раскладка читалась с одного взгляда
const PLATE_H = {25:46, 20:44, 15:40, 10:34, 5:26, 2.5:20, 1.25:15};
function updatePlates(exId){
  const box = document.getElementById("pl_"+exId);
  const wu = document.getElementById("wu_"+exId);
  if(!box) return;
  const ex = EX[exId];
  box.innerHTML = ""; if(wu) wu.innerHTML = "";
  box.hidden = true; if(wu) wu.hidden = true;
  if(ex.kind !== "bar" || !S.draft) return;
  const target = workingTarget(exId);

  if(wu && !ex.iso){
    const ws = warmupSets(target, S.draft.week);
    if(ws.length){
      wu.hidden = false;
      wu.innerHTML = '<span class="lab">Разминка</span>' + ws.map(o => '<span class="w">'+fmtKg(o.w)+'×'+o.r+'</span>').join("");
    }
  }

  const lay = plateLayout(target, 20);
  if(!lay) return;
  box.hidden = false;
  let bb = '<div class="bb" aria-hidden="true"><span class="sleeve"></span><span class="collar"></span>';
  lay.forEach(p => { for(let k = 0; k < p.n; k++) bb += '<span class="pl" style="height:'+PLATE_H[p.w]+'px;background:'+p.bg+'"></span>'; });
  bb += '<span class="tail"></span></div>';
  // номинал блина печатаем как есть: fmtKg округлил бы 1.25 до «1.3»,
  // а такого блина не бывает
  const chips = lay.map(p => '<span style="background:'+p.bg+';color:'+p.fg+'">'+String(p.w)+(p.n > 1 ? " ×"+p.n : "")+'</span>').join("");
  box.innerHTML = bb + '<div><div class="lab">'+fmtKg(target)+' кг: гриф 20 + на сторону</div><div class="bbl">'+chips+'</div></div>';
}

function updateSummary(){
  if(!S.draft) return;
  let sets = 0, vol = 0, prs = 0;
  Object.keys(S.draft.entries).forEach(id => {
    const best = bestEver(id);
    let maxOrm = 0;
    S.draft.entries[id].sets.forEach(st => {
      if(!st.r) return;
      sets++; vol += setVolume(id, st);
      if(EX[id].kind !== "time") maxOrm = Math.max(maxOrm, e1rm(st.w, st.r));
    });
    if(maxOrm > best + 0.01) prs++;
  });
  let plan = 0;
  Object.keys(S.draft.entries).forEach(id => { plan += S.draft.entries[id].sets.length; });
  document.getElementById("sumSets").textContent = sets;
  document.getElementById("sumPlan").textContent = " / " + plan;
  document.getElementById("sumVol").innerHTML = Math.round(vol).toLocaleString("ru-RU") + ' <small>кг</small>';
  document.getElementById("sumPr").textContent = prs;
  document.getElementById("btnFinish").disabled = sets === 0;
}

/* ============================================================
   Завершение тренировки
   ============================================================ */
async function finishWorkout(){
  const d = S.draft;
  if(!d) return;
  const entries = [];
  prescribe(d.day, d.week).forEach(pre => {
    const en = d.entries[pre.e];
    const sets = en.sets.filter(s => s.r).map(s => ({w: s.w || 0, r: s.r, rpe: s.rpe || null}));
    if(sets.length) entries.push({e:pre.e, sets, note:(en.note||"").trim()});
  });
  if(!entries.length) return;
  const wo = {
    id: "w" + Date.now(),
    date: d.date || iso(today()),
    ts: Date.now(),
    day: d.day, week: d.week, block: d.block,
    entries, note: ""
  };
  S.workouts.push(wo);
  S.draft = null; uiDay = null;
  stopRest();
  lsSave();
  if(DB){
    try{
      await DB.collection("workouts").doc(wo.id).set(wo);
      await DB.doc("meta/draft").set({d:null});
    }catch(e){ toast("Не удалось сохранить в облако — запись осталась на этом устройстве"); }
  }
  const v = workoutVolume(wo);
  toast("Записано: " + entries.length + " упр., " + v.toLocaleString("ru-RU") + " кг тоннажа");
  renderAll();
  switchTab("log");
}

async function deleteWorkout(id){
  const wo = S.workouts.find(w => w.id === id);
  const what = wo ? (DAYS[wo.day] ? DAYS[wo.day].label : wo.day) + ", " + fmtShort(wo.date) : "";
  if(!(await askConfirm("Удалить тренировку?", what + ". Запись пропадёт из журнала и графиков, вернуть её можно только из резервной копии.", "Удалить"))) return;
  S.workouts = S.workouts.filter(w => w.id !== id);
  lsSave();
  if(DB){ try{ await DB.collection("workouts").doc(id).delete(); }catch(e){} }
  renderAll();
}
