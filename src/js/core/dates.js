/* ============================================================
   Хелперы дат и расчётов
   ============================================================ */
const pad = n => String(n).padStart(2,"0");
function iso(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function parseISO(s){ const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); }
function today(){ const d = new Date(); d.setHours(0,0,0,0); return d; }
function dayDiff(a,b){ return Math.round((a-b)/86400000); }
function mondayOf(d){ const x = new Date(d); const wd = (x.getDay()+6)%7; x.setDate(x.getDate()-wd); x.setHours(0,0,0,0); return x; }
function fmtShort(s){ const d = parseISO(s); return pad(d.getDate())+"."+pad(d.getMonth()+1); }
const MON = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];

function programWeek(dateStr){
  const start = S.settings.startDate ? parseISO(S.settings.startDate) : null;
  if(!start) return 1;
  const d = dateStr ? parseISO(dateStr) : today();
  const w = Math.floor(dayDiff(mondayOf(d), mondayOf(start))/7) + 1;
  if(w < 1) return 1;
  return ((w-1) % 9) + 1;   // цикл 9 недель
}
function blockOf(week){ return week <= 4 ? 1 : 2; }
function rotFor(week){ return blockOf(week) === 1 ? ROT1 : ROT2; }
