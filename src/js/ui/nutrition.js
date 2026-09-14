/* ============================================================
   Рендер: питание
   ============================================================ */
let fdDate = null;   // ISO выбранного дня

function nutDay(d){ const m = S.nut[d.slice(0,7)]; return (m && m[d]) ? m[d] : null; }
function nutItems(d){ const x = nutDay(d); return x && Array.isArray(x.items) ? x.items : []; }
function nutWrite(d, items){
  const mk = d.slice(0,7);
  if(!S.nut[mk]) S.nut[mk] = {};
  if(items.length) S.nut[mk][d] = {items};
  else delete S.nut[mk][d];
  saveNut(mk);
}
function nutTotals(items){
  return items.reduce((a,i)=>({kcal:a.kcal+(+i.kcal||0), p:a.p+(+i.p||0), f:a.f+(+i.f||0), c:a.c+(+i.c||0)}), {kcal:0,p:0,f:0,c:0});
}
function isTrainingDay(d){ return S.workouts.some(w => w.date === d); }

function renderFood(){
  if(!fdDate) fdDate = iso(today());
  const items = nutItems(fdDate);
  const tot = nutTotals(items);
  const dt = parseISO(fdDate);
  const dd = dayDiff(today(), dt);
  const WD = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
  document.getElementById("fdLabel").innerHTML =
    (dd === 0 ? "Сегодня" : dd === 1 ? "Вчера" : pad(dt.getDate())+" "+MON[dt.getMonth()]) +
    '<span>' + WD[dt.getDay()] + (dd !== 0 && dd !== 1 ? "" : ", " + pad(dt.getDate())+" "+MON[dt.getMonth()]) + '</span>';
  document.getElementById("fdNext").disabled = dd <= 0;

  // счётчики
  const rows = [
    {k:"kcal", l:"Калории", u:"ккал", v:Math.round(tot.kcal), t:TARGET.kcal, r:RANGE.kcal},
    {k:"p",    l:"Белки",   u:"г",    v:Math.round(tot.p),    t:TARGET.p,    r:RANGE.p},
    {k:"f",    l:"Жиры",    u:"г",    v:Math.round(tot.f),    t:TARGET.f,    r:RANGE.f},
    {k:"c",    l:"Углеводы",u:"г",    v:Math.round(tot.c),    t:TARGET.c,    r:RANGE.c}
  ];
  document.getElementById("fdMeters").innerHTML = rows.map(r => {
    const pct = Math.min(100, Math.round(r.v / r.t * 100));
    const cls = r.v > r.r[1] ? " over" : (r.v >= r.r[0] ? " hit" : "");
    const left = r.t - r.v;
    return '<div class="meter"><div class="l"><span>'+r.l+'</span><em>'+r.r[0]+'–'+r.r[1]+'</em></div>'+
      '<div class="v">'+r.v+' <small>/ '+r.t+' '+r.u+'</small></div>'+
      '<span class="mtrack"><span class="mfill'+cls+'" style="width:'+pct+'%"></span></span>'+
      '<div class="s tiny" style="margin-top:5px">'+(left > 0 ? "осталось "+left+" "+r.u : (r.v > r.r[1] ? "перебор "+(r.v-r.t)+" "+r.u : "норма закрыта"))+'</div></div>';
  }).join("");

  // приёмы по плану
  const box = document.getElementById("fdMeals");
  box.innerHTML = "";
  MEALS.forEach(m => {
    const on = items.some(i => i.k === m.k);
    const b = document.createElement("button");
    b.type = "button"; b.className = "mealrow" + (on ? " on" : "");
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.innerHTML = '<span class="tick">✓</span><span class="mid">'+
      '<span class="t"></span><span class="d"></span>'+
      '<span class="m">Б '+m.p+' · Ж '+m.f+' · У '+m.c+'</span></span>'+
      '<span class="kc">'+m.kcal+'</span>';
    b.querySelector(".t").textContent = m.t;
    b.querySelector(".d").textContent = m.d;
    b.querySelectorAll(".t,.d,.m").forEach(n => n.style.display = "block");
    b.onclick = ()=>{
      const cur = nutItems(fdDate).slice();
      const i = cur.findIndex(x => x.k === m.k);
      if(i >= 0) cur.splice(i,1);
      else cur.push({k:m.k, n:m.t, kcal:m.kcal, p:m.p, f:m.f, c:m.c});
      nutWrite(fdDate, cur); renderFood();
    };
    box.appendChild(b);
  });

  // добавки
  const ex = document.getElementById("fdExtras");
  ex.innerHTML = "";
  EXTRAS.forEach(e => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "exbtn";
    b.innerHTML = '+ ' + esc(e.t) + ' <b>' + e.kcal + ' ккал</b>';
    b.title = e.d;
    b.onclick = ()=>{
      const cur = nutItems(fdDate).slice();
      cur.push({k:"x"+Date.now(), n:e.t, kcal:e.kcal, p:e.p, f:e.f, c:e.c});
      nutWrite(fdDate, cur); renderFood();
    };
    ex.appendChild(b);
  });

  // добавленное вручную
  const extra = items.filter(i => !MEALS.some(m => m.k === i.k));
  const ad = document.getElementById("fdAdded");
  if(!extra.length) ad.innerHTML = "";
  else {
    ad.innerHTML = '<div class="added">' + extra.map((i, idx) =>
      '<div class="addrow"><span class="n">'+esc(i.n)+'</span>'+
      '<span class="mm">Б '+Math.round(i.p)+' · Ж '+Math.round(i.f)+' · У '+Math.round(i.c)+'</span>'+
      '<span class="kk">'+Math.round(i.kcal)+'</span>'+
      '<button type="button" data-k="'+esc(i.k)+'" aria-label="Убрать">×</button></div>').join("") + '</div>';
    ad.querySelectorAll("button[data-k]").forEach(btn => btn.onclick = ()=>{
      nutWrite(fdDate, nutItems(fdDate).filter(x => x.k !== btn.dataset.k));
      renderFood();
    });
  }

  // подсказка дня
  const tr = isTrainingDay(fdDate);
  const done = items.length;
  let hint;
  if(!done) hint = tr
    ? "Тренировочный день. Отметь приёмы по плану или нажми «Заполнить по плану» — за день это ровно 3030 ккал и 150 г белка."
    : "День отдыха: ешь так же, предтренировочный перекус становится дневным. Мышцы растут как раз в дни восстановления.";
  else if(tot.p < RANGE.p[0]) hint = "Белка пока " + Math.round(tot.p) + " г из 140–150. Если пропустил приём с мясом — закрой творогом или порцией протеина.";
  else if(tot.kcal < RANGE.kcal[0]) hint = "До нормы " + Math.round(TARGET.kcal - tot.kcal) + " ккал. Быстрее всего добрать шейком (620) или +30 г крупы (100) и +10 г масла (90).";
  else if(tot.kcal > RANGE.kcal[1]) hint = "Сегодня выше коридора на " + Math.round(tot.kcal - TARGET.kcal) + " ккал. Один день ничего не решает — смотри на среднее за неделю.";
  else hint = "День закрыт по коридору: " + Math.round(tot.kcal) + " ккал, белок " + Math.round(tot.p) + " г. Вода 2.5–3 л, креатин 3–5 г.";
  document.getElementById("fdHint").textContent = hint;

  renderNutCharts();
}

function renderFoodRef(){
  const tb = document.getElementById("menuTable");
  if(!tb || tb.children.length) return;
  tb.innerHTML = MEALS.map(m =>
    '<tr><td><b>'+esc(m.t)+'</b></td><td>'+esc(m.d)+'</td><td class="num">'+m.p+'</td><td class="num">'+m.f+'</td><td class="num">'+m.c+'</td><td class="num">'+m.kcal+'</td></tr>'
  ).join("") + '<tr><td><b>Итого</b></td><td></td><td class="num"><b>~150</b></td><td class="num"><b>~83</b></td><td class="num"><b>~422</b></td><td class="num"><b>~3030</b></td></tr>';
  const sm = document.getElementById("shopMonth"), sw = document.getElementById("shopWeek");
  const row = a => '<div class="shopitem"><span>'+esc(a[0])+'</span><span class="q">'+esc(a[1])+'</span>'+(a[2]?'<span class="c">'+esc(a[2])+'</span>':'')+'</div>';
  sm.innerHTML = SHOP_M.map(row).join("");
  sw.innerHTML = SHOP_W.map(row).join("");
}

// недельные средние: калории и вес на одной шкале недель
function weekKeys(n){
  const out = [], cur = mondayOf(today());
  for(let i = n-1; i >= 0; i--){ const d = new Date(cur); d.setDate(d.getDate()-i*7); out.push(iso(d)); }
  return out;
}
function weeklyKcal(){
  const acc = {};
  Object.keys(S.nut).forEach(mk => Object.keys(S.nut[mk]).forEach(d => {
    const items = S.nut[mk][d].items || [];
    if(!items.length) return;
    const k = iso(mondayOf(parseISO(d)));
    (acc[k] || (acc[k] = [])).push(nutTotals(items).kcal);
  }));
  return acc;
}
function weeklyWeight(){
  const acc = {};
  S.body.entries.forEach(e => {
    const k = iso(mondayOf(parseISO(e.d)));
    (acc[k] || (acc[k] = [])).push(e.kg);
  });
  return acc;
}
const mean = a => a.reduce((x,y)=>x+y,0)/a.length;

function renderNutCharts(){
  const keys = weekKeys(10);
  const kc = weeklyKcal(), wt = weeklyWeight();
  const bars = keys.map(k => {
    const a = kc[k], d = parseISO(k);
    const v = a ? Math.round(mean(a)) : 0;
    const inRange = v >= RANGE.kcal[0] && v <= RANGE.kcal[1];
    return {label: fmtShort(k), v,
      full:"Неделя с "+pad(d.getDate())+" "+MON[d.getMonth()],
      tip: a ? v.toLocaleString("ru-RU")+" ккал в среднем · "+a.length+" дн. записано" : "нет записей",
      color: !a ? cssv("--surface-3") : (inRange ? cssv("--good") : cssv("--warn"))};
  });
  const anyKc = bars.some(b => b.v > 0);
  const calBox = document.getElementById("calChart");
  if(!anyKc) calBox.innerHTML = '<div class="empty"><b>Записей пока нет</b>Отмечай приёмы пищи выше — здесь появятся средние калории по неделям.</div>';
  else barChart(calBox, bars, {labelEvery:2, aria:"Средние калории за неделю", fmtY: t => t >= 1000 ? round1(t/1000)+"к" : String(Math.round(t))});

  const pts = keys.map(k => { const d = parseISO(k); return {label: fmtShort(k), full:"Неделя с "+pad(d.getDate())+" "+MON[d.getMonth()]}; });
  const vals = keys.map(k => wt[k] ? round1(mean(wt[k])) : null);
  const wBox = document.getElementById("wkWeightChart");
  if(!vals.some(v => v != null)) wBox.innerHTML = '<div class="empty"><b>Нет взвешиваний</b>Записывай вес на вкладке «Прогресс» — кривая появится здесь.</div>';
  else lineChart(wBox, pts, [{label:"Средний вес", color:cssv("--accent"), vals}], {aria:"Средний вес за неделю"});

  // вывод: калории против отклика веса
  const adv = document.getElementById("calAdvice");
  const li = keys.length-1;
  const prevK = kc[keys[li-1]], curK = kc[keys[li]];
  const w1 = vals[li], w0 = vals[li-1];
  if(!prevK && !curK){
    adv.innerHTML = "Как только наберётся хотя бы неделя записей питания и два взвешивания, здесь появится вывод: держать калории, добавить или убавить.";
  } else if(w1 == null || w0 == null){
    const c = curK ? Math.round(mean(curK)) : Math.round(mean(prevK));
    adv.innerHTML = "Средние калории: <b class='mono'>"+c.toLocaleString("ru-RU")+" ккал</b> при цели 3000. Чтобы понять, работает ли это, нужны взвешивания две недели подряд — заноси вес 3–4 раза в неделю.";
  } else {
    const c = curK ? Math.round(mean(curK)) : Math.round(mean(prevK));
    const d = round1(w1 - w0);
    let verdict;
    if(d < 0.25) verdict = "Вес почти не растёт — <b>добавь 150–200 ккал</b>: +40–50 г сухой крупы в день или гейнер-шейк.";
    else if(d <= 0.5) verdict = "Темп в цель — <b>ничего не менять</b>, если силовые растут.";
    else verdict = "Набор быстрее нормы — если талия растёт быстрее груди и рук, <b>убери 150 ккал</b>: сухофрукты и часть мёда.";
    adv.innerHTML = "На <b class='mono'>"+c.toLocaleString("ru-RU")+" ккал</b> в среднем вес за неделю изменился на <b class='mono'>"+(d>=0?"+":"")+fmtKg(d)+" кг</b>. "+verdict;
  }
}
