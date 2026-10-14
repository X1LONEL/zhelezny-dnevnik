/* ============================================================
   Рендер: журнал
   ============================================================ */
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
const CHEV_SVG = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
function renderLog(){
  const box = document.getElementById("logList");
  const ws = sortedWorkouts().reverse();
  document.getElementById("logCount").textContent = ws.length ? ws.length + " " + plural(ws.length, "тренировка", "тренировки", "тренировок") : "";
  document.getElementById("btnExport").disabled = !ws.length;
  if(!ws.length){
    box.innerHTML = '<div class="card empty"><b>Журнал пуст</b>Запиши первую тренировку на вкладке «Тренировка» — здесь появится история, а на «Прогрессе» вся аналитика.</div>';
    return;
  }
  // какие упражнения в какой тренировке дали рекорд
  const prBy = new Map();
  prEvents().forEach(p => { if(!prBy.has(p.ts)) prBy.set(p.ts, new Set()); prBy.get(p.ts).add(p.ex); });

  box.innerHTML = "";
  let group = null, groupKey = null, first = true;
  ws.forEach(wo => {
    const wk = iso(mondayOf(parseISO(wo.date)));
    if(wk !== groupKey){
      groupKey = wk;
      const mon = parseISO(wk), sun = new Date(mon); sun.setDate(sun.getDate()+6);
      const n = ws.filter(w => iso(mondayOf(parseISO(w.date))) === wk).length;
      const g = document.createElement("div");
      g.className = "logweek";
      let dots = "";
      for(let i=0;i<3;i++) dots += '<span class="dot'+(i<n?' f':'')+'"></span>';
      g.innerHTML = '<div class="logweek-h"><b>'+(wk === iso(mondayOf(today())) ? "Эта неделя" : pad(mon.getDate())+" "+MON[mon.getMonth()]+" – "+pad(sun.getDate())+" "+MON[sun.getMonth()])+'</b>'+
        '<span>неделя программы '+wo.week+'</span><span class="dots">'+dots+'</span></div><div class="logitems"></div>';
      box.appendChild(g);
      group = g.querySelector(".logitems");
    }
    const det = document.createElement("details");
    det.className = "logitem";
    if(first){ det.open = true; first = false; }
    const d = parseISO(wo.date);
    const vol = workoutVolume(wo);
    const nsets = wo.entries.reduce((a,e)=>a+e.sets.length, 0);
    const prs = prBy.get(wo.ts) || new Set();
    const sum = document.createElement("summary");
    sum.innerHTML = '<span class="dbox"><b>'+d.getDate()+'</b><span>'+MON[d.getMonth()]+'</span></span>'+
      '<span class="nm"><b>'+esc(DAYS[wo.day] ? DAYS[wo.day].label : wo.day)+'</b>'+
      '<span class="meta">'+nsets+' подх. · '+vol.toLocaleString("ru-RU")+' кг</span></span>'+
      (prs.size ? '<span class="pill rec">'+prs.size+' '+plural(prs.size,"рекорд","рекорда","рекордов")+'</span>' : '')+
      CHEV_SVG;
    det.appendChild(sum);

    const body = document.createElement("div");
    body.className = "body";
    let html = '<table class="logtable"><thead><tr><th>Упражнение</th><th>Подходы</th></tr></thead><tbody>';
    wo.entries.forEach(en => {
      const ex = EX[en.e] || {n:en.e, kind:"bar"};
      const cells = en.sets.map(s => ex.kind === "time" ? s.r+"с" : fmtKg(s.w)+"×"+s.r + (s.rpe ? '<span class="np">@'+s.rpe+'</span>' : "")).join("&nbsp;&nbsp;");
      html += '<tr><td>'+esc(ex.n)+(prs.has(en.e)?' <span class="prm" title="рекорд">●</span>':'')+(en.note?'<div class="tiny">'+esc(en.note)+'</div>':'')+'</td><td>'+cells+'</td></tr>';
    });
    html += '</tbody></table>';
    body.innerHTML = html;
    const act = document.createElement("div");
    act.className = "logactions";
    const del = document.createElement("button");
    del.className = "btn sm ghost"; del.type = "button"; del.textContent = "Удалить запись";
    del.onclick = ()=>deleteWorkout(wo.id);
    act.appendChild(del);
    body.appendChild(act);
    det.appendChild(body);
    group.appendChild(det);
  });
}
function plural(n, one, few, many){
  const a = n % 10, b = n % 100;
  if(a === 1 && b !== 11) return one;
  if(a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}

function exportCsv(){
  const rows = [["дата","день","неделя","упражнение","подход","вес_кг","повторы","rpe","заметка"]];
  sortedWorkouts().forEach(wo => wo.entries.forEach(en => en.sets.forEach((s,i) => {
    rows.push([wo.date, DAYS[wo.day]?DAYS[wo.day].label:wo.day, wo.week, (EX[en.e]||{n:en.e}).n, i+1, s.w, s.r, s.rpe==null?"":s.rpe, (en.note||"").replace(/[;\n]/g," ")]);
  })));
  const csv = "﻿" + rows.map(r => r.join(";")).join("\n");
  saveFile("dnevnik-trenirovok.csv", csv, "text/csv");
}

/* ------------------------------------------------------------
   Резервная копия целиком. CSV — это выгрузка для таблиц: в нём нет
   ни питания, ни веса тела, и обратно он не читается. Для переноса
   между устройствами и между версиями приложения нужен весь стейт.
   ------------------------------------------------------------ */
const BACKUP_V = 1;
function exportBackup(){
  const data = {app:"zhelezny-dnevnik", v:BACKUP_V, saved:new Date().toISOString(),
                settings:S.settings, workouts:S.workouts, body:S.body, nut:S.nut};
  saveFile("zhelezny-dnevnik-" + iso(today()) + ".json", JSON.stringify(data), "application/json");
}

function importBackup(text){
  let inc;
  try{ inc = JSON.parse(text); }
  catch(e){ toast("Это не файл резервной копии"); return; }
  if(!inc || (inc.app && inc.app !== "zhelezny-dnevnik")){ toast("Файл из другого приложения"); return; }
  const m = mergeBackup(S, inc);
  const n = m.added.workouts + m.added.body + m.added.nutDays;
  if(!n){ toast("В копии нет ничего нового"); return; }
  S.settings = m.settings; S.workouts = m.workouts; S.body = m.body; S.nut = m.nut;
  lsSave();
  // в облако уйдёт само: onSnapshot до-зальёт записи, которых там нет
  if(DB){
    S.workouts.forEach(w => { try{ DB.collection("workouts").doc(w.id).set(w); }catch(e){} });
    try{ DB.doc("meta/body").set({entries:S.body.entries}); }catch(e){}
    Object.keys(S.nut).forEach(mk => { try{ DB.collection("nutrition").doc(mk).set({days:S.nut[mk]}); }catch(e){} });
  }
  renderAll();
  toast("Добавлено: " + m.added.workouts + " трен., " + m.added.body + " взвеш., " + m.added.nutDays + " дн. питания");
}

async function saveFile(filename, text, mime){
  try{
    const dl = await window.claude.use("downloads");
    if(dl){ await dl.save({filename, data:text}); return; }
  }catch(e){}
  try{
    const url = URL.createObjectURL(new Blob([text], {type:(mime||"text/plain")+";charset=utf-8"}));
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  }catch(e){ toast("Не удалось выгрузить файл"); }
}
