/* ============================================================
   Рендер: экран тренировки
   ============================================================ */
function renderTrain(){
  const week = programWeek(), rot = rotFor(week), dayKey = currentDay();
  const d = ensureDraft(dayKey);
  const pres = prescribe(dayKey, week);

  // переключатель дня
  const dp = document.getElementById("dayPick");
  dp.innerHTML = "";
  rot.forEach(k => {
    const b = document.createElement("button");
    b.className = "daybtn"; b.type = "button";
    b.setAttribute("aria-pressed", k === dayKey ? "true" : "false");
    b.innerHTML = '<span class="k">'+DAYS[k].tag+'</span>'+DAYS[k].label;
    b.onclick = ()=>{
      if(k === dayKey) return;
      if(draftHasData() && !confirm("Сменить день? Незаписанные подходы текущего дня будут потеряны.")) return;
      uiDay = k; S.draft = null; renderTrain(); queueDraftSave();
    };
    dp.appendChild(b);
  });

  document.getElementById("weekNote").textContent = WEEKNOTE[week] || "";

  const list = document.getElementById("exList");
  list.innerHTML = "";
  pres.forEach((pre, i) => {
    const ex = EX[pre.e], en = d.entries[pre.e];
    const hist = exHistory(pre.e);
    const sg = suggest(pre.e, pre);
    const prevBest = bestEver(pre.e);

    const card = document.createElement("div");
    card.className = "ex" + (en.sets.some(s=>s.r) ? " done" : "");

    const unitLbl = ex.kind === "time" ? "сек" : (ex.kind === "bw" ? "+кг" : "кг");
    const head = document.createElement("div");
    head.className = "exhead";
    head.innerHTML =
      '<div class="idx">'+(i+1)+'</div>'+
      '<div class="exname"><div class="n"></div>'+
        '<div class="p"><span class="g">'+pre.s+' × '+repsLabel(pre.r)+'</span> · '+rpeLabel(pre.rpe)+' · '+GROUPS[ex.g]+'</div></div>'+
      '<div class="target'+(sg.up?' up':'')+'"></div>';
    head.querySelector(".n").textContent = ex.n + (ex.uni ? " (на сторону)" : "");
    head.querySelector(".target").textContent = sg.text;
    card.appendChild(head);

    const sets = document.createElement("div");
    sets.className = "sets";
    en.sets.forEach((st, si) => sets.appendChild(setRow(pre, en, st, si, sg, prevBest, unitLbl)));
    card.appendChild(sets);

    const plates = document.createElement("div");
    plates.className = "plates"; plates.id = "pl_"+pre.e;
    card.appendChild(plates);

    if(hist.length){
      const last = hist[hist.length-1];
      const line = document.createElement("div");
      line.className = "lastline";
      line.innerHTML = '<b>' + fmtShort(last.date) + ':</b> ' +
        last.sets.map(s => (ex.kind==="time" ? s.r+"с" : fmtKg(s.w||0)+"×"+s.r)).join("  ") +
        (last.note ? ' · ' + esc(last.note) : '');
      card.appendChild(line);
    }

    const foot = document.createElement("div");
    foot.className = "exfoot";
    const addBtn = document.createElement("button");
    addBtn.className = "btn sm ghost"; addBtn.textContent = "+ подход";
    addBtn.onclick = ()=>{ en.sets.push({w:null,r:null,rpe:null}); queueDraftSave(); renderTrain(); };
    const note = document.createElement("input");
    note.className = "notein"; note.placeholder = "Заметка: техника, ощущения…";
    note.id = "note_"+pre.e; note.value = en.note || "";
    note.oninput = ()=>{ en.note = note.value; queueDraftSave(); };
    foot.appendChild(addBtn); foot.appendChild(note);
    card.appendChild(foot);

    list.appendChild(card);
    updatePlates(pre.e);
  });

  updateSummary();
  renderHeader();
}

function setRow(pre, en, st, si, sg, prevBest, unitLbl){
  const ex = EX[pre.e];
  const row = document.createElement("div");
  row.className = "setrow";

  const sn = document.createElement("div"); sn.className = "sn"; sn.textContent = (si+1)+".";

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
  rp.innerHTML = '<option value="">RPE</option>' + [5,6,7,7.5,8,8.5,9,9.5,10].map(v=>'<option value="'+v+'">'+v+'</option>').join("");
  if(st.rpe != null) rp.value = String(st.rpe);

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
    const isPr = ex.kind !== "time" && st.w && st.r && e1rm(st.w, st.r) > prevBest + 0.01;
    wi.classList.toggle("pr", !!isPr); ri.classList.toggle("pr", !!isPr);
    queueDraftSave(); updateSummary(); updatePlates(pre.e);
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

  row.appendChild(sn); row.appendChild(wi); row.appendChild(x); row.appendChild(ri); row.appendChild(rp); row.appendChild(del);
  return row;
}

function updatePlates(exId){
  const box = document.getElementById("pl_"+exId);
  if(!box) return;
  const ex = EX[exId];
  box.innerHTML = "";
  if(ex.kind !== "bar") return;
  const en = S.draft && S.draft.entries[exId];
  if(!en) return;
  const w = en.sets.map(s=>s.w).filter(v=>v).pop();
  const pre = prescribe(S.draft.day, S.draft.week).find(p=>p.e===exId);
  const target = w || (suggest(exId, pre).w);
  const lay = plateLayout(target, 20);
  if(!lay){ return; }
  const lab = document.createElement("span");
  lab.className = "lab"; lab.textContent = "штанга 20 кг + на сторону:";
  box.appendChild(lab);
  lay.forEach(p => {
    const s = document.createElement("span");
    s.className = "plate"; s.style.background = p.bg; s.style.color = p.fg;
    // номинал блина печатаем как есть: fmtKg округлил бы 1.25 до «1.3»,
    // а такого блина не бывает
    s.textContent = String(p.w) + (p.n > 1 ? " ×"+p.n : "");
    box.appendChild(s);
  });
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
  document.getElementById("sumSets").textContent = sets;
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
  if(!confirm("Удалить эту тренировку из журнала?")) return;
  S.workouts = S.workouts.filter(w => w.id !== id);
  lsSave();
  if(DB){ try{ await DB.collection("workouts").doc(id).delete(); }catch(e){} }
  renderAll();
}
