import fs from "node:fs";
const src = fs.readFileSync("src/js/core/state.js", "utf8");
const fns = new Function(src + "\nreturn {mergeBody, mergeNutMonth};")();
const {mergeBody, mergeNutMonth} = fns;

let bad = 0;
const eq = (name, got, want) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if(a !== b){ bad++; console.log("✗ " + name + "\n  получил " + a + "\n  ждали  " + b); }
  else console.log("✓ " + name);
};

// Телефон записал 12.09, ноутбук офлайн держит старые 01.09 и 05.09
const cloud = [{d:"2026-09-12", kg:64}];
const local = [{d:"2026-09-01", kg:62}, {d:"2026-09-05", kg:63}];
let r = mergeBody(cloud, local);
eq("вес: запись из облака не теряется при более длинной локальной истории",
   r.entries.map(e=>e.d), ["2026-09-01","2026-09-05","2026-09-12"]);
eq("вес: локальные дни помечены к заливке", r.localOnly, 2);

// Совпадение даты: выигрывает облако
r = mergeBody([{d:"2026-09-05", kg:63.5}], [{d:"2026-09-05", kg:99}]);
eq("вес: при совпадении даты выигрывает облако", r.entries, [{d:"2026-09-05", kg:63.5}]);
eq("вес: заливать нечего", r.localOnly, 0);

// Повторный прогон после заливки не должен снова требовать записи (нет цикла снапшотов)
r = mergeBody(r.entries, r.entries);
eq("вес: повторное слияние стабильно", r.localOnly, 0);

// Пустое облако
r = mergeBody([], [{d:"2026-09-01", kg:62}]);
eq("вес: пустое облако забирает локальную историю", [r.entries.length, r.localOnly], [1, 1]);
eq("вес: мусорные записи отброшены", mergeBody([null, {kg:5}], []).entries, []);

// Питание: день записан офлайн, в облаке этого дня нет
let n = mergeNutMonth({"2026-09-10":{items:[1]}}, {"2026-09-11":{items:[2]}});
eq("питание: офлайн-день добавлен", Object.keys(n.days).sort(), ["2026-09-10","2026-09-11"]);
eq("питание: день помечен к заливке", n.localOnly, 1);

n = mergeNutMonth({"2026-09-10":{items:["облако"]}}, {"2026-09-10":{items:["локально"]}});
eq("питание: при совпадении дня выигрывает облако", n.days["2026-09-10"].items, ["облако"]);
eq("питание: повторное слияние стабильно", mergeNutMonth(n.days, n.days).localOnly, 0);

n = mergeNutMonth(undefined, {"2026-09-11":{items:[2]}});
eq("питание: месяца нет в облаке — забираем локальный", [Object.keys(n.days).length, n.localOnly], [1, 1]);

// Исходные объекты не мутируются
const c0 = {"2026-09-10":{items:[1]}};
mergeNutMonth(c0, {"2026-09-11":{items:[2]}});
eq("питание: вход не мутируется", Object.keys(c0), ["2026-09-10"]);

console.log(bad ? "\nПРОВАЛЕНО: " + bad : "\nвсе проверки пройдены");
process.exit(bad ? 1 : 0);
