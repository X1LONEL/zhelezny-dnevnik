/* ============================================================
   История, рекорды, прогрессия
   ============================================================ */
function sortedWorkouts(){ return S.workouts.slice().sort((a,b)=> a.ts - b.ts); }

// История по упражнению: [{date, ts, sets, top, best1rm, bestSet}]
function exHistory(exId){
  const out = [];
  sortedWorkouts().forEach(wo => {
    const en = wo.entries.find(x => x.e === exId);
    if(!en) return;
    const sets = en.sets.filter(s => s.r > 0);
    if(!sets.length) return;
    let top = 0, best = 0, bestSet = null;
    sets.forEach(s => {
      if((s.w||0) > top) top = s.w||0;
      const o = e1rm(s.w, s.r);
      if(o > best){ best = o; bestSet = s; }
    });
    out.push({date:wo.date, ts:wo.ts, week:wo.week, sets, top, best1rm:best, bestSet, note:en.note||""});
  });
  return out;
}

// Ленты рекордов: событие, когда расчётный 1ПМ превысил всё прежнее
function prEvents(){
  const ev = [];
  Object.keys(EX).forEach(id => {
    if(EX[id].kind === "time") return;
    let best = 0;
    exHistory(id).forEach(h => {
      if(h.best1rm > best + 0.01){
        ev.push({date:h.date, ts:h.ts, ex:id, val:h.best1rm, prev:best,
                 set:h.bestSet});
        best = h.best1rm;
      }
    });
  });
  return ev.sort((a,b)=> b.ts - a.ts || b.val - a.val);
}
function bestEver(exId, excludeTs){
  let best = 0;
  exHistory(exId).forEach(h => { if(excludeTs && h.ts === excludeTs) return; if(h.best1rm > best) best = h.best1rm; });
  return best;
}

// Цель на сегодня по двойной прогрессии
function suggest(exId, pre){
  const ex = EX[exId];
  const hist = exHistory(exId);
  if(!hist.length){
    const seed = SEED_W[exId];
    if(ex.kind === "time") return {w:pre.r[1], reps:pre.r[1], text:"старт "+pre.r[1]+" сек", fresh:true};
    if(seed) return {w:Math.round(seed*pre.factor*2)/2, reps:pre.r[0], text:"старт "+fmtKg(seed*pre.factor)+" кг", fresh:true};
    return {w:null, reps:pre.r[0], text:"подобрать по RPE "+(pre.rpe?pre.rpe[0]:7), fresh:true};
  }
  // База прогрессии — последняя полноценная тренировка. Разгрузочная неделя
  // намеренно лёгкая, и брать её за базу значит навсегда потерять эти 10%.
  const full = hist.filter(x => !isDeload(x.week));
  const last = full.length ? full[full.length-1] : hist[hist.length-1];
  const deload = pre.factor < 1;
  const w = last.top;
  const atTop = last.sets.filter(s => (s.w||0) >= w - 0.01).every(s => s.r >= pre.r[1]);
  const enough = last.sets.filter(s => (s.w||0) >= w - 0.01).length >= pre.s;
  if(ex.kind === "time"){
    const bestT = Math.max.apply(null, last.sets.map(s=>s.r));
    if(deload) return {w:0, reps:bestT, text:"разгрузка: "+bestT+" сек"};
    return {w:0, reps:bestT+5, text:"держать "+(bestT+5)+" сек", up:true};
  }
  if(deload){
    // вес не растёт и не закрепляется: это снятие усталости, а не подход к рекорду.
    // Округляем вниз по шагу упражнения, иначе выходит вес, который не набрать
    // блинами (−10% от 62.5 это 56.25) и раскладка штанги пропадает.
    const step = ex.step > 0 ? ex.step : 0.5;
    const dw = round1(Math.floor(w*pre.factor/step + 1e-6) * step);
    return dw > 0
      ? {w:dw, reps:pre.r[0], text:"разгрузка: "+fmtKg(dw)+" кг × "+pre.r[0]}
      : {w:w, reps:pre.r[0], text:"разгрузка: подходов меньше"};
  }
  if(atTop && enough && ex.step > 0){
    const nw = Math.round((w + ex.step)*2)/2;
    return {w:nw, reps:pre.r[0], text:"+"+fmtKg(ex.step)+" кг → "+fmtKg(nw)+"×"+pre.r[0], up:true};
  }
  const minR = Math.min.apply(null, last.sets.map(s=>s.r));
  const tgt = Math.min(pre.r[1], Math.max(pre.r[0], minR+1));
  return {w:w, reps:tgt, text:fmtKg(w)+" кг × "+tgt+" во всех подходах"};
}

// Раскладка блинов на штанге (IWF-цвета)
const PLATES = [[25,"#d22d27","#fff"],[20,"#2a5fb5","#fff"],[15,"#e8b800","#1a1a1a"],[10,"#149a4e","#fff"],[5,"#e8e8e8","#1a1a1a"],[2.5,"#d22d27","#fff"],[1.25,"var(--plate-chrome)","#1a1a1a"]];
function plateLayout(total, bar){
  bar = bar || 20;
  if(!total || total <= bar) return null;
  // Остаток считаем до сотых: round1 округлял 1.25 до 1.3, и раскладка
  // пропадала на каждом весе, где нужен блин 1.25 — 37.5, 42.5 и так далее.
  const cents = x => Math.round(x*100)/100;
  let side = cents((total - bar)/2), out = [];
  PLATES.forEach(p => {
    let n = Math.floor((side + 1e-6) / p[0]);
    if(n > 0){ out.push({w:p[0], n, bg:p[1], fg:p[2]}); side = cents(side - n*p[0]); }
  });
  if(side > 0.01) return null;
  return out;
}

/* ============================================================
   Черновик тренировки
   ============================================================ */
function autoDay(){
  const week = programWeek();
  const rot = rotFor(week);
  const prev = sortedWorkouts().filter(w => rot.indexOf(w.day) >= 0);
  if(!prev.length) return rot[0];
  const lastDay = prev[prev.length-1].day;
  return rot[(rot.indexOf(lastDay)+1) % rot.length];
}
function currentDay(){
  const week = programWeek(), rot = rotFor(week);
  if(uiDay && rot.indexOf(uiDay) >= 0) return uiDay;
  if(S.draft && rot.indexOf(S.draft.day) >= 0) return S.draft.day;
  return autoDay();
}
function ensureDraft(dayKey){
  const week = programWeek();
  if(!S.draft || S.draft.day !== dayKey || S.draft.week !== week){
    S.draft = {day:dayKey, week, block:blockOf(week), date:iso(today()), entries:{}, note:""};
  }
  prescribe(dayKey, week).forEach(pre => {
    if(!S.draft.entries[pre.e]) S.draft.entries[pre.e] = {sets:[], note:""};
    const en = S.draft.entries[pre.e];
    while(en.sets.length < pre.s) en.sets.push({w:null, r:null, rpe:null});
  });
  return S.draft;
}
function draftHasData(){
  if(!S.draft) return false;
  return Object.values(S.draft.entries).some(en => en.sets.some(s => s.r));
}
