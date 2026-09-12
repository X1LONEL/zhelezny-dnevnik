/* ============================================================
   Графики
   ============================================================ */
const SVGNS = "http://www.w3.org/2000/svg";
function el(tag, attrs, text){
  const n = document.createElementNS(SVGNS, tag);
  for(const k in attrs) n.setAttribute(k, attrs[k]);
  if(text != null) n.textContent = text;
  return n;
}
const tipEl = document.getElementById("tip");
function showTip(x, y, html){
  tipEl.innerHTML = html; tipEl.style.display = "block";
  const r = tipEl.getBoundingClientRect();
  let left = x - r.width/2, top = y - r.height - 12;
  left = Math.max(8, Math.min(left, window.innerWidth - r.width - 8));
  if(top < 8) top = y + 16;
  tipEl.style.left = left+"px"; tipEl.style.top = top+"px";
}
function hideTip(){ tipEl.style.display = "none"; }
function cssv(name){ return getComputedStyle(document.body).getPropertyValue(name).trim(); }
function niceTicks(min, max, count){
  const span = max - min || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw/mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min/step)*step, hi = Math.ceil(max/step)*step;
  const out = [];
  for(let v = lo; v <= hi + step/2; v += step) out.push(round1(v));
  return out;
}

// Линейный график: series = [{key,color,label,vals:[{x,y}]}], xlabels по индексу
function lineChart(mount, points, series, opts){
  opts = opts || {};
  mount.innerHTML = "";
  const W = Math.max(300, mount.clientWidth || 560), H = opts.h || 216;
  const mL = 40, mR = 12, mT = 12, mB = 26;
  const iw = W - mL - mR, ih = H - mT - mB;
  const all = [];
  series.forEach(s => s.vals.forEach(v => { if(v != null) all.push(v); }));
  if(!all.length){ mount.innerHTML = '<div class="empty">Пока нет данных для графика</div>'; return; }
  let mn = Math.min.apply(null, all), mx = Math.max.apply(null, all);
  if(mn === mx){ mn = mn - 2; mx = mx + 2; }
  const ticks = niceTicks(mn - (mx-mn)*0.08, mx + (mx-mn)*0.08, 4);
  const y0 = ticks[0], y1 = ticks[ticks.length-1];
  const n = points.length;
  const X = i => mL + (n === 1 ? iw/2 : iw * i/(n-1));
  const Y = v => mT + ih - ih * (v - y0)/(y1 - y0 || 1);

  const svg = el("svg", {viewBox:"0 0 "+W+" "+H, width:"100%", height:H, role:"img"});
  svg.setAttribute("aria-label", opts.aria || "График прогресса");
  const line = cssv("--line"), ink3 = cssv("--ink-3");

  ticks.forEach(t => {
    svg.appendChild(el("line", {x1:mL, x2:W-mR, y1:Y(t), y2:Y(t), stroke:line, "stroke-width":1}));
    svg.appendChild(el("text", {x:mL-7, y:Y(t)+4, "text-anchor":"end", fill:ink3, "font-size":10.5, "font-family":"'IBM Plex Mono',monospace"}, fmtKg(t)));
  });
  const every = Math.max(1, Math.ceil(n/7));
  points.forEach((p,i) => {
    if(i % every === 0 || i === n-1)
      svg.appendChild(el("text", {x:X(i), y:H-8, "text-anchor":"middle", fill:ink3, "font-size":10.5, "font-family":"'IBM Plex Mono',monospace"}, p.label));
  });

  series.forEach(s => {
    let d = "", started = false;
    s.vals.forEach((v,i) => { if(v == null){ started = false; return; } d += (started?"L":"M") + X(i) + " " + Y(v) + " "; started = true; });
    svg.appendChild(el("path", {d, fill:"none", stroke:s.color, "stroke-width":2, "stroke-linejoin":"round", "stroke-linecap":"round"}));
    s.vals.forEach((v,i) => {
      if(v == null) return;
      const last = i === n-1;
      svg.appendChild(el("circle", {cx:X(i), cy:Y(v), r:last?5:3.6, fill:s.color, stroke:cssv("--surface"), "stroke-width":2}));
    });
    const li = s.vals.length-1;
    if(s.vals[li] != null && opts.endLabel !== false){
      svg.appendChild(el("text", {x:X(li), y:Y(s.vals[li])-11, "text-anchor":"end", fill:s.color, "font-size":11.5, "font-weight":600, "font-family":"'IBM Plex Mono',monospace"}, fmtKg(s.vals[li])));
    }
  });

  const hover = el("line", {x1:0,x2:0,y1:mT,y2:mT+ih, stroke:ink3, "stroke-width":1, "stroke-dasharray":"3 3", opacity:0});
  svg.appendChild(hover);
  points.forEach((p,i) => {
    const w = n === 1 ? iw : iw/(n-1);
    const hit = el("rect", {x:X(i)-w/2, y:mT, width:w, height:ih, fill:"transparent"});
    hit.style.cursor = "crosshair";
    const move = ev => {
      hover.setAttribute("x1", X(i)); hover.setAttribute("x2", X(i)); hover.setAttribute("opacity", .6);
      const t = ev.touches ? ev.touches[0] : ev;
      let rows = series.map(s => s.vals[i] == null ? null :
        '<div class="r"><span style="color:'+s.color+'">■</span> '+s.label+": "+fmtKg(s.vals[i])+" кг</div>").filter(Boolean).join("");
      if(p.extra) rows += '<div class="r">'+p.extra+'</div>';
      showTip(t.clientX, mount.getBoundingClientRect().top + mT + 6, '<div class="h">'+p.full+'</div>'+rows);
    };
    hit.addEventListener("mousemove", move);
    hit.addEventListener("touchstart", move, {passive:true});
    hit.addEventListener("mouseleave", ()=>{ hover.setAttribute("opacity", 0); hideTip(); });
    svg.appendChild(hit);
  });
  svg.addEventListener("mouseleave", ()=>{ hover.setAttribute("opacity",0); hideTip(); });
  mount.appendChild(svg);
}

// Столбчатый график
function barChart(mount, bars, opts){
  opts = opts || {};
  mount.innerHTML = "";
  if(!bars.length){ mount.innerHTML = '<div class="empty">Нет данных за этот период</div>'; return; }
  const W = Math.max(280, mount.clientWidth || 420), H = opts.h || 200;
  const mL = 42, mR = 8, mT = 10, mB = 24;
  const iw = W - mL - mR, ih = H - mT - mB;
  const mx = Math.max.apply(null, bars.map(b=>b.v)) || 1;
  const ticks = niceTicks(0, mx, 3);
  const y1 = ticks[ticks.length-1];
  const Y = v => mT + ih - ih * v / (y1 || 1);
  const bw = iw / bars.length;
  const svg = el("svg", {viewBox:"0 0 "+W+" "+H, width:"100%", height:H, role:"img"});
  svg.setAttribute("aria-label", opts.aria || "Столбчатый график");
  const line = cssv("--line"), ink3 = cssv("--ink-3"), acc = cssv("--accent");
  ticks.forEach(t => {
    svg.appendChild(el("line", {x1:mL, x2:W-mR, y1:Y(t), y2:Y(t), stroke:line, "stroke-width":1}));
    svg.appendChild(el("text", {x:mL-7, y:Y(t)+4, "text-anchor":"end", fill:ink3, "font-size":10.5, "font-family":"'IBM Plex Mono',monospace"}, opts.fmtY ? opts.fmtY(t) : fmtKg(t)));
  });
  bars.forEach((b,i) => {
    const x = mL + i*bw + 2, w = Math.max(3, bw - 4), h = Math.max(b.v > 0 ? 2 : 0, ih - (Y(b.v) - mT));
    if(h > 0){
      const r = el("rect", {x, y:Y(b.v), width:w, height:h, fill:b.color || acc, rx:4});
      r.style.cursor = "pointer";
      const move = ev => { const t = ev.touches?ev.touches[0]:ev; showTip(t.clientX, mount.getBoundingClientRect().top + Y(b.v), '<div class="h">'+b.full+'</div><div class="r">'+b.tip+'</div>'); };
      r.addEventListener("mousemove", move);
      r.addEventListener("touchstart", move, {passive:true});
      r.addEventListener("mouseleave", hideTip);
      svg.appendChild(r);
    }
    if(i % (opts.labelEvery || 1) === 0 || i === bars.length-1)
      svg.appendChild(el("text", {x:x+w/2, y:H-7, "text-anchor":"middle", fill:ink3, "font-size":10, "font-family":"'IBM Plex Mono',monospace"}, b.label));
  });
  mount.appendChild(svg);
}
