// Разгрузочная неделя цикла: подходов вдвое меньше, вес на 10% ниже
function isDeload(week){ return week === 9; }

// Предписание с учётом недели
function prescribe(dayKey, week){
  const day = DAYS[dayKey];
  return day.items.map((it, i) => {
    let s = it.s, f = 1;
    if(week === 1) s = Math.max(1, s-1);
    else if(week >= 7 && week <= 8 && i < 2) s = s+1;
    else if(isDeload(week)){ s = Math.max(1, Math.ceil(s/2)); f = 0.9; }
    let rpe = it.rpe;
    if(week === 1) rpe = [5,6];
    else if(week === 2) rpe = [6,7];
    else if(isDeload(week)) rpe = [5,6];
    return {e:it.e, s, r:it.r, rpe, factor:f};
  });
}
function repsLabel(r){ return r[0] === r[1] ? String(r[0]) : r[0]+"–"+r[1]; }
function rpeLabel(rpe){ return !rpe ? "—" : (rpe[0]===rpe[1] ? "RPE "+rpe[0] : "RPE "+rpe[0]+"–"+rpe[1]); }
function e1rm(w, r){ if(!w || !r || r > 15) return 0; return w * (1 + r/30); }
function round1(x){ return Math.round(x*10)/10; }
function fmtKg(x){ return (Math.abs(x - Math.round(x)) < 0.05) ? String(Math.round(x)) : String(round1(x)); }
function bodyKg(){
  const e = S.body.entries;
  return e.length ? e[e.length-1].kg : 62;
}
function setVolume(exId, st){
  const ex = EX[exId];
  if(!ex || ex.kind === "time") return 0;
  const reps = st.r || 0;
  let w = st.w || 0;
  if(ex.kind === "bw") w = bodyKg() + w;
  if(ex.uni) return w * reps * 2;
  return w * reps;
}
function workoutVolume(wo){
  let v = 0;
  wo.entries.forEach(en => en.sets.forEach(st => { if(st.r) v += setVolume(en.e, st); }));
  return Math.round(v);
}
