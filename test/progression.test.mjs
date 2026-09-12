import fs from "node:fs";

// Ядро без DOM: данные программы + расчёты. Скрипты склеиваются в одну
// область видимости, поэтому тут повторяется порядок из manifest.json.
const src = ["data/program.js","data/nutrition.js","core/state.js","core/dates.js","core/calc.js","core/history.js"]
  .map(f => fs.readFileSync("src/js/"+f, "utf8")).join("\n");
const api = new Function(src + "\nreturn {S:()=>S, prescribe, suggest, isDeload, iso, EX};")();
const { prescribe, suggest, isDeload, iso } = api;
const S = api.S();

let bad = 0;
const eq = (name, got, want) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if(a !== b){ bad++; console.log("✗ " + name + "\n  получил " + a + "\n  ждали  " + b); }
  else console.log("✓ " + name);
};

// Атлет выполняет ровно то, что предложено; возвращаем подсказки по упражнению
function runCycle(weeks, exId){
  S.settings.startDate = iso(new Date(2026,0,5));
  S.workouts = [];
  const out = [];
  let n = 0;
  weeks.forEach(({week, day}) => {
    const entries = [];
    prescribe(day, week).forEach(pre => {
      const sg = suggest(pre.e, pre);
      const weight = sg.w == null ? 20 : sg.w;
      entries.push({e:pre.e, sets:Array.from({length:pre.s}, ()=>({w:weight, r:sg.reps, rpe:7})), note:""});
      if(pre.e === exId) out.push({week, подходов:pre.s, вес:weight, повторы:sg.reps, текст:sg.text});
    });
    const d = new Date(2026,0,5); d.setDate(d.getDate() + (++n)*2);
    S.workouts.push({id:"w"+n, date:iso(d), ts:n, day, week, block:week<=4?1:2, entries, note:""});
  });
  return out;
}

eq("разгрузка — это только неделя 9", [1,4,5,8,9,10].map(isDeload), [false,false,false,false,true,false]);

// Присед в блоке 2: недели 5–9, затем первая неделя нового цикла
const r = runCycle([{week:5,day:"lower"},{week:6,day:"lower"},{week:7,day:"lower"},
                    {week:8,day:"lower"},{week:9,day:"lower"},{week:1,day:"A"}], "squat");
const [w5,w6,w7,w8,w9,next] = r;

eq("двойная прогрессия: вес держится, повторы растут", [w5.повторы, w6.повторы, w7.повторы], [6,7,8]);
eq("верх диапазона взят — вес растёт на шаг", w8.вес - w7.вес, 2.5);
eq("недели 7–8 добавляют подход", [w6.подходов, w7.подходов], [4,5]);

// делится пополам базовое предписание дня (4), а не раздутое неделями 7–8 (5)
eq("разгрузка режет подходы вдвое от базы дня", w9.подходов, Math.ceil(w6.подходов/2));
// вниз по шагу упражнения, чтобы вес собирался блинами
eq("разгрузка снимает около 10% веса", w9.вес, Math.floor(w8.вес*0.9/api.EX.squat.step)*api.EX.squat.step);
eq("разгрузка честно названа", w9.текст.startsWith("разгрузка"), true);
eq("разгрузка не выдаёт себя за прогресс", w9.вес < w8.вес, true);

eq("после разгрузки база — последняя полноценная тренировка, а не облегчённая",
   next.вес, w8.вес);

// Разгрузочный вес обязан набираться блинами — иначе пропадает раскладка штанги
const api2 = new Function(src + "\nreturn {plateLayout, EX};")();
eq("разгрузочный вес штанги набирается блинами", api2.plateLayout(w9.вес, 20) !== null, true);
eq("разгрузка не тяжелее рабочего веса", w9.вес <= w8.вес, true);
eq("разгрузка кратна шагу упражнения", Math.abs(w9.вес / api2.EX.squat.step - Math.round(w9.вес / api2.EX.squat.step)) < 1e-9, true);

// Планка: время на разгрузке не растёт
const pl = runCycle([{week:3,day:"A"},{week:9,day:"A"}], "plank");
eq("планка на разгрузке не прибавляет секунды", pl[1].повторы <= pl[0].повторы, true);

// Упражнение с весом тела без отягощения: «разгрузка: 0 кг» быть не должно
S.workouts = [];
S.settings.startDate = iso(new Date(2026,0,5));
S.workouts.push({id:"w1", date:"2026-01-07", ts:1, day:"B", week:8, block:2,
  entries:[{e:"pullup", sets:[{w:0,r:10,rpe:8},{w:0,r:10,rpe:8}], note:""}], note:""});
const pu = suggest("pullup", prescribe("B",9).find(p=>p.e==="pullup"));
eq("подтягивания без веса на разгрузке не показывают «0 кг»", /0 кг/.test(pu.text), false);
eq("подтягивания на разгрузке помечены разгрузкой", pu.text.startsWith("разгрузка"), true);

// Раскладка блинов: каждый стандартный вес штанги должен собираться точно
const { plateLayout } = api2;
const noLayout = [], wrongSum = [];
for(let total = 22.5; total <= 200; total += 2.5){
  const lay = plateLayout(total, 20);
  if(!lay){ noLayout.push(total); continue; }
  const side = lay.reduce((a,p)=>a + p.w*p.n, 0);
  if(Math.abs(side - (total-20)/2) > 1e-9) wrongSum.push(total);
}
eq("все веса штанги с шагом 2.5 имеют раскладку", noLayout, []);
eq("раскладка в сумме даёт ровно нужный вес", wrongSum, []);
eq("вес легче грифа раскладки не имеет", [plateLayout(20,20), plateLayout(15,20)], [null,null]);
eq("несобираемый вес честно возвращает null", plateLayout(21,20), null);

console.log(bad ? "\nПРОВАЛЕНО: " + bad : "\nвсе проверки пройдены");
process.exit(bad ? 1 : 0);
