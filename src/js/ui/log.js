/* ============================================================
   Рендер: журнал
   ============================================================ */
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function renderLog(){
  const box = document.getElementById("logList");
  const ws = sortedWorkouts().reverse();
  document.getElementById("logCount").textContent = ws.length ? ws.length + " тренировок в журнале" : "";
  document.getElementById("btnExport").disabled = !ws.length;
  if(!ws.length){
    box.innerHTML = '<div class="card empty"><b>Журнал пуст</b>Запиши первую тренировку на вкладке «Тренировка» — дальше здесь появится история и вся аналитика.</div>';
    return;
  }
  box.innerHTML = "";
  ws.forEach((wo, idx) => {
    const det = document.createElement("details");
    det.className = "logitem";
    if(idx === 0) det.open = true;
    const d = parseISO(wo.date);
    const vol = workoutVolume(wo);
    const nsets = wo.entries.reduce((a,e)=>a+e.sets.length, 0);
    const sum = document.createElement("summary");
    sum.innerHTML = '<span class="d mono">'+pad(d.getDate())+" "+MON[d.getMonth()]+'</span>'+
      '<span class="nm">'+esc(DAYS[wo.day] ? DAYS[wo.day].label : wo.day)+' <span class="tiny">· нед. '+wo.week+'</span></span>'+
      '<span class="v">'+nsets+' подх. · '+vol.toLocaleString("ru-RU")+' кг</span>';
    det.appendChild(sum);

    const body = document.createElement("div");
    body.className = "body";
    let html = '<table class="logtable"><thead><tr><th>Упражнение</th><th>Подходы</th></tr></thead><tbody>';
    wo.entries.forEach(en => {
      const ex = EX[en.e] || {n:en.e, kind:"bar"};
      const cells = en.sets.map(s => ex.kind === "time" ? s.r+"с" : fmtKg(s.w)+"×"+s.r + (s.rpe ? '<span class="np">@'+s.rpe+'</span>' : "")).join("&nbsp;&nbsp;");
      html += '<tr><td>'+esc(ex.n)+(en.note?'<div class="tiny">'+esc(en.note)+'</div>':'')+'</td><td>'+cells+'</td></tr>';
    });
    html += '</tbody></table>';
    body.innerHTML = html;
    const del = document.createElement("button");
    del.className = "btn sm ghost"; del.style.marginTop = "10px"; del.textContent = "Удалить запись";
    del.onclick = ()=>deleteWorkout(wo.id);
    body.appendChild(del);
    det.appendChild(body);
    box.appendChild(det);
  });
}

function exportCsv(){
  const rows = [["дата","день","неделя","упражнение","подход","вес_кг","повторы","rpe","заметка"]];
  sortedWorkouts().forEach(wo => wo.entries.forEach(en => en.sets.forEach((s,i) => {
    rows.push([wo.date, DAYS[wo.day]?DAYS[wo.day].label:wo.day, wo.week, (EX[en.e]||{n:en.e}).n, i+1, s.w, s.r, s.rpe==null?"":s.rpe, (en.note||"").replace(/[;\n]/g," ")]);
  })));
  const csv = "﻿" + rows.map(r => r.join(";")).join("\n");
  saveFile("dnevnik-trenirovok.csv", csv);
}
async function saveFile(filename, text){
  try{
    const dl = await window.claude.use("downloads");
    if(dl){ await dl.save({filename, data:text}); return; }
  }catch(e){}
  try{
    const url = URL.createObjectURL(new Blob([text], {type:"text/csv;charset=utf-8"}));
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  }catch(e){ toast("Не удалось выгрузить файл"); }
}
