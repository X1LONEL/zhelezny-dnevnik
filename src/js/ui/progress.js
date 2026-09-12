/* ============================================================
   Рендер: прогресс
   ============================================================ */
function renderProgress(){
  renderKpis();
  renderExChart();
  renderPr();
  renderVolume();
  renderMuscle();
  renderHeatmap();
  renderBody();
}

function renderKpis(){
  const box = document.getElementById("kpis");
  const ws = sortedWorkouts();
  const mon = mondayOf(today());
  const prev = new Date(mon); prev.setDate(prev.getDate()-7);
  const volWeek = ws.filter(w=>parseISO(w.date) >= mon).reduce((a,w)=>a+workoutVolume(w),0);
  const volPrev = ws.filter(w=>{const d=parseISO(w.date); return d>=prev && d<mon;}).reduce((a,w)=>a+workoutVolume(w),0);
  const diff = volPrev ? Math.round((volWeek-volPrev)/volPrev*100) : null;
  const prs = prEvents();
  const last30 = prs.filter(p => dayDiff(today(), parseISO(p.date)) <= 30).length;
  const st = streakWeeks();
  const totalSets = ws.reduce((a,w)=>a+w.entries.reduce((b,e)=>b+e.sets.length,0),0);
  const items = [
    {l:"Всего тренировок", v:ws.length, s: ws.length ? "с "+fmtShort(ws[0].date) : "начни сегодня"},
    {l:"Тоннаж за неделю", v:volWeek.toLocaleString("ru-RU"), u:"кг", s: diff===null ? "нет прошлой недели" : (diff>=0?"+":"")+diff+"% к прошлой", up: diff!==null && diff>=0},
    {l:"Рекордов за месяц", v:last30, s: prs.length ? "всего "+prs.length : "—"},
    {l:"Серия недель 3/3", v:st, s: st>=2 ? "держишь режим" : "нужно 3 тренировки в неделю", up: st>=2},
    {l:"Подходов всего", v:totalSets.toLocaleString("ru-RU"), s:"по всем упражнениям"}
  ];
  box.innerHTML = items.map(i =>
    '<div class="kpi"><div class="l">'+i.l+'</div><div class="v">'+i.v+(i.u?' <small>'+i.u+'</small>':'')+'</div><div class="s'+(i.up?' up':'')+'">'+i.s+'</div></div>'
  ).join("");
}

function exWithData(){ return Object.keys(EX).filter(id => EX[id].kind !== "time" && exHistory(id).length); }
let selEx = null;
function renderExChart(){
  const sel = document.getElementById("exSel");
  const ids = exWithData();
  const box = document.getElementById("exChart");
  const rec = document.getElementById("exRecent");
  if(!ids.length){
    sel.innerHTML = '<option>—</option>'; sel.disabled = true;
    document.getElementById("exSelNote").textContent = "";
    box.innerHTML = '<div class="empty"><b>Данных пока нет</b>Запиши пару тренировок — здесь появится кривая рабочего веса и расчётного 1ПМ по каждому упражнению.</div>';
    rec.innerHTML = ""; return;
  }
  sel.disabled = false;
  if(!selEx || ids.indexOf(selEx) < 0) selEx = ids[0];
  sel.innerHTML = ids.map(id => '<option value="'+id+'"'+(id===selEx?' selected':'')+'>'+esc(EX[id].n)+'</option>').join("");
  sel.onchange = ()=>{ selEx = sel.value; renderExChart(); };

  const h = exHistory(selEx);
  document.getElementById("exSelNote").textContent = h.length + " " + (h.length===1?"тренировка":"тренировок") + " · 1ПМ по формуле Эпли";
  const points = h.map(x => ({label: fmtShort(x.date), full: fmtShort(x.date) + " · " + (DAYS[(S.workouts.find(w=>w.ts===x.ts)||{}).day]||{label:""}).label,
    extra: x.sets.map(s=>fmtKg(s.w)+"×"+s.r).join(" ")}));
  lineChart(box, points, [
    {label:"Рабочий вес", color: cssv("--accent"), vals: h.map(x=>round1(x.top))},
    {label:"1ПМ", color: cssv("--series-2"), vals: h.map(x=>round1(x.best1rm))}
  ], {aria:"Прогресс: "+EX[selEx].n});

  const tail = h.slice(-5).reverse();
  let html = '<table class="logtable"><thead><tr><th>Дата</th><th>Подходы</th><th>1ПМ</th></tr></thead><tbody>';
  tail.forEach(x => {
    html += '<tr><td class="mono">'+fmtShort(x.date)+'</td><td>'+x.sets.map(s=>fmtKg(s.w)+"×"+s.r).join("&nbsp;&nbsp;")+'</td><td>'+fmtKg(x.best1rm)+' кг</td></tr>';
  });
  html += '</tbody></table>';
  rec.innerHTML = html;
}

function renderPr(){
  const box = document.getElementById("prList");
  const ev = prEvents().slice(0, 12);
  if(!ev.length){
    box.innerHTML = '<div class="card empty"><b>Рекордов пока нет</b>Каждый раз, когда расчётный 1ПМ в упражнении превысит прежний максимум, запись появится здесь.</div>';
    return;
  }
  box.innerHTML = '<div class="prlist">' + ev.map(p =>
    '<div class="pritem"><span class="dt">'+fmtShort(p.date)+'</span>'+
    '<span class="nm">'+esc(EX[p.ex].n)+'<div class="tiny mono">'+fmtKg(p.set.w)+' кг × '+p.set.r+'</div></span>'+
    '<span style="text-align:right"><div class="val">'+fmtKg(p.val)+' кг</div>'+
    (p.prev ? '<div class="old">было '+fmtKg(p.prev)+'</div>' : '<div class="old">первый замер</div>')+'</span></div>'
  ).join("") + '</div>';
}

function renderVolume(){
  const m = weeksMap();
  const vol = new Map();
  S.workouts.forEach(w => { const k = iso(mondayOf(parseISO(w.date))); vol.set(k, (vol.get(k)||0) + workoutVolume(w)); });
  const bars = [];
  let cur = mondayOf(today());
  const keys = [];
  for(let i=11;i>=0;i--){ const d = new Date(cur); d.setDate(d.getDate()-i*7); keys.push(iso(d)); }
  keys.forEach(k => {
    const v = vol.get(k) || 0, c = m.get(k) || 0;
    const d = parseISO(k);
    bars.push({label: d.getDate()+"."+(d.getMonth()+1), v,
      full:"Неделя с "+pad(d.getDate())+" "+MON[d.getMonth()],
      tip: v ? v.toLocaleString("ru-RU")+" кг · "+c+" трен." : "нет тренировок",
      color: c === 0 ? cssv("--surface-3") : (c >= 3 ? cssv("--accent") : cssv("--warn"))});
  });
  barChart(document.getElementById("volChart"), bars, {labelEvery:3, aria:"Тоннаж по неделям", fmtY: t => t >= 1000 ? Math.round(t/1000)+"т" : String(Math.round(t))});
}

function renderMuscle(){
  const from = new Date(mondayOf(today())); from.setDate(from.getDate()-21);
  const cnt = {};
  S.workouts.filter(w => parseISO(w.date) >= from).forEach(w => w.entries.forEach(en => {
    const g = (EX[en.e]||{}).g; if(!g) return;
    cnt[g] = (cnt[g]||0) + en.sets.length * ((EX[en.e].uni) ? 2 : 1);
  }));
  const rows = Object.keys(GROUPS).map(g => ({g, n:cnt[g]||0})).filter(r => r.n > 0).sort((a,b)=>b.n-a.n);
  const box = document.getElementById("mgChart");
  const note = document.getElementById("mgNote");
  if(!rows.length){ note.textContent = "За последние 4 недели"; box.innerHTML = '<div class="empty">Нет записанных подходов за последние 4 недели</div>'; return; }
  const total = rows.reduce((a,r)=>a+r.n,0);
  note.textContent = "За последние 4 недели · " + total + " подходов";
  const mx = rows[0].n;
  box.innerHTML = rows.map(r =>
    '<div class="barrow"><span>'+GROUPS[r.g]+'</span>'+
    '<span class="bartrack"><span class="barfill" style="width:'+Math.round(r.n/mx*100)+'%"></span></span>'+
    '<span class="nv">'+r.n+'</span></div>'
  ).join("");
}

function renderHeatmap(){
  const grid = document.getElementById("hmGrid");
  const byDate = new Map();
  S.workouts.forEach(w => byDate.set(w.date, (byDate.get(w.date)||0)+1));
  const weeks = 18;
  const end = mondayOf(today());
  const start = new Date(end); start.setDate(start.getDate() - (weeks-1)*7);
  grid.innerHTML = "";
  const t = iso(today());
  let trained = 0;
  for(let w = 0; w < weeks; w++){
    const col = document.createElement("div"); col.className = "hmcol";
    for(let d = 0; d < 7; d++){
      const dt = new Date(start); dt.setDate(dt.getDate() + w*7 + d);
      const k = iso(dt);
      const c = document.createElement("div");
      const n = byDate.get(k) || 0;
      if(n) trained++;
      const future = dt > today();
      c.className = "hmc" + (future ? " fut" : (n ? " l3" : "")) + (k === t ? " today" : "");
      c.title = pad(dt.getDate())+" "+MON[dt.getMonth()] + (n ? " — тренировка" : "");
      col.appendChild(c);
    }
    grid.appendChild(col);
  }
  const st = streakWeeks();
  document.getElementById("hmNote").textContent =
    "Последние 18 недель · " + trained + " тренировочных дней" + (st ? " · серия " + st + " нед. подряд по 3 тренировки" : "");
}

function renderBody(){
  const e = S.body.entries.slice().sort((a,b)=> a.d < b.d ? -1 : 1);
  const box = document.getElementById("bwChart");
  if(e.length < 2){
    box.innerHTML = '<div class="empty">'+(e.length ? 'Последний замер: '+fmtKg(e[0].kg)+' кг. Нужно минимум два, чтобы построить кривую.' : 'Запиши первое взвешивание — ниже появится кривая и подсказка по калориям.')+'</div>';
  } else {
    const pts = e.map(x => ({label: fmtShort(x.d), full: fmtShort(x.d), extra: x.waist ? "талия "+x.waist+" см" : ""}));
    lineChart(box, pts, [{label:"Вес", color: cssv("--accent"), vals: e.map(x=>x.kg)}], {h:170, aria:"Динамика веса тела"});
  }
  // подсказка по калориям: среднее за последние 7 дней против предыдущих 7
  const adv = document.getElementById("bwAdvice");
  const avg = (from, to) => {
    const v = e.filter(x => { const d = dayDiff(today(), parseISO(x.d)); return d >= from && d < to; }).map(x=>x.kg);
    return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null;
  };
  const a1 = avg(0,7), a2 = avg(7,14);
  if(a1 == null || a2 == null){
    adv.innerHTML = "Взвешивайся 3–4 раза в неделю утром натощак. Как только наберётся две недели замеров, здесь появится подсказка: добавлять калории, держать или убавлять.";
  } else {
    const d = round1(a1 - a2);
    let verdict;
    if(d < 0.25) verdict = "<b>Вес почти не растёт</b> (+"+fmtKg(d)+" кг/нед). Добавь 150–200 ккал: +40–50 г сухой крупы или гейнер-шейк.";
    else if(d <= 0.5) verdict = "<b>Темп в цель</b> (+"+fmtKg(d)+" кг/нед). Ничего не менять — если силовые растут.";
    else verdict = "<b>Набор быстрее нормы</b> (+"+fmtKg(d)+" кг/нед). Если талия растёт быстрее груди и рук — убери 150 ккал: сухофрукты и часть мёда.";
    adv.innerHTML = "Среднее за неделю: <b class='mono'>"+fmtKg(a1)+" кг</b> против <span class='mono'>"+fmtKg(a2)+" кг</span> неделей раньше. "+verdict;
  }
}
