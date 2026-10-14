/* ============================================================
   Рендер: программа
   ============================================================ */
function renderPlan(){
  const box = document.getElementById("planDays");
  const curWeek = programWeek();
  box.innerHTML = "";
  [["A","B","C"],["upper","lower","full"]].forEach((rot, bi) => {
    const wrap = document.createElement("div");
    wrap.className = "planblock";
    const isCur = blockOf(curWeek) === bi+1;
    wrap.innerHTML = '<div class="blockhead"><h3>'+(bi===0?"Блок 1 · Full Body":"Блок 2 · Верх / Низ / Фулбоди")+'</h3>'+
      '<span class="w">недели '+(bi===0?"1–4":"5–8")+'</span>'+(isCur?'<span class="chip on">сейчас</span>':'')+'</div>';
    const grid = document.createElement("div");
    grid.className = "grid2";
    rot.forEach(k => {
      const day = DAYS[k];
      const c = document.createElement("div");
      c.className = "card daycard";
      let html = '<div class="dh"><b>'+day.label+'</b><span>'+day.items.length+' упр.</span></div>'+
        '<table class="ptable"><tbody>';
      day.items.forEach(it => {
        html += '<tr><td>'+esc(EX[it.e].n)+'</td><td class="num">'+it.s+' × '+repsLabel(it.r)+'</td><td class="num dim">'+(it.rpe?repsLabel(it.rpe):"—")+'</td></tr>';
      });
      html += '</tbody></table>';
      c.innerHTML = html;
      grid.appendChild(c);
    });
    wrap.appendChild(grid);
    box.appendChild(wrap);
  });
  const b = curWeek === 9 ? "9" : String(blockOf(curWeek));
  document.querySelectorAll("#p-plan tr[data-b]").forEach(tr => tr.classList.toggle("now", tr.dataset.b === b));
  const sd = document.getElementById("startDate");
  sd.value = S.settings.startDate || "";
}
