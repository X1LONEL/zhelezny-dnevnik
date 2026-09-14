/**
 * Восстановление из резервной копии.
 *
 * Главное свойство одно: импорт добавляет и никогда не затирает.
 * Копия — вещь по определению устаревшая, и если она выигрывает
 * конфликт, то открыв вчерашний файл владелец теряет сегодняшнюю
 * тренировку. Проверки ниже держат именно это.
 */
import fs from "node:fs";
const src = fs.readFileSync("src/js/core/state.js", "utf8");
const {mergeBackup} = new Function(src + "\nreturn {mergeBackup};")();

let bad = 0;
const eq = (name, got, want) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if(a !== b){ bad++; console.log("✗ " + name + "\n  получил " + a + "\n  ждали  " + b); }
  else console.log("✓ " + name);
};

const wo = (id, ts) => ({id, ts, date:"2026-09-01", day:"A", week:1, block:1, entries:[{e:"squat", sets:[{w:40,r:8}]}]});
const empty = {settings:{}, workouts:[], body:{entries:[]}, nut:{}};

// Перенос с нуля: приложение пустое, в копии всё
let r = mergeBackup(empty, {
  settings:{startDate:"2026-07-20"},
  workouts:[wo("w1", 1), wo("w2", 2)],
  body:{entries:[{d:"2026-09-01", kg:62}]},
  nut:{"2026-09":{"2026-09-01":{items:[{kcal:3000}]}}}
});
eq("перенос в пустое приложение забирает всё",
   [r.workouts.length, r.body.entries.length, Object.keys(r.nut["2026-09"]).length], [2, 1, 1]);
eq("перенос считает добавленное", r.added, {workouts:2, body:1, nutDays:1});
eq("дата старта цикла переносится", r.settings.startDate, "2026-07-20");

// Старая копия поверх свежих данных: ничего не должно пропасть
const cur = {
  settings:{startDate:"2026-09-01"},
  workouts:[wo("w1", 1), wo("w9", 9)],
  body:{entries:[{d:"2026-09-10", kg:64}]},
  nut:{"2026-09":{"2026-09-10":{items:["свежее"]}}}
};
r = mergeBackup(cur, {
  settings:{startDate:"2020-01-01"},
  workouts:[wo("w1", 1), wo("w2", 2)],
  body:{entries:[{d:"2026-09-01", kg:62}]},
  nut:{"2026-09":{"2026-09-01":{items:["старое"]}}}
});
eq("свежая тренировка не пропала", r.workouts.map(w=>w.id).sort(), ["w1","w2","w9"]);
eq("недостающая тренировка добавлена", r.added.workouts, 1);
eq("свой старт цикла не перебит копией", r.settings.startDate, "2026-09-01");
eq("дни питания объединены", Object.keys(r.nut["2026-09"]).sort(), ["2026-09-01","2026-09-10"]);

// Конфликт по ключу: выигрывает то, что уже в приложении
r = mergeBackup(
  {settings:{}, workouts:[], body:{entries:[{d:"2026-09-05", kg:63.5}]}, nut:{"2026-09":{"2026-09-05":{items:["в приложении"]}}}},
  {workouts:[], body:{entries:[{d:"2026-09-05", kg:99}]}, nut:{"2026-09":{"2026-09-05":{items:["в копии"]}}}}
);
eq("при совпадении даты выигрывает приложение", r.body.entries, [{d:"2026-09-05", kg:63.5}]);
eq("при совпадении дня питания выигрывает приложение", r.nut["2026-09"]["2026-09-05"].items, ["в приложении"]);
eq("конфликты не считаются добавленными", [r.added.body, r.added.nutDays], [0, 0]);

// Повторный импорт того же файла не должен ничего добавлять второй раз
const inc = {settings:{}, workouts:[wo("w1",1)], body:{entries:[{d:"2026-09-01",kg:62}]}, nut:{"2026-09":{"2026-09-01":{items:[1]}}}};
const once = mergeBackup(empty, inc);
const twice = mergeBackup(once, inc);
eq("повторный импорт идемпотентен", twice.added, {workouts:0, body:0, nutDays:0});
eq("повторный импорт не плодит тренировки", twice.workouts.length, 1);

// Мусор на входе не должен ронять восстановление
eq("битые тренировки отброшены",
   mergeBackup(empty, {workouts:[null, {id:"x"}, {entries:[]}]}).workouts, []);
eq("пустая копия безопасна", mergeBackup(empty, {}).added, {workouts:0, body:0, nutDays:0});
eq("не объект вместо копии безопасен", mergeBackup(empty, null).workouts, []);

// Тренировки должны лечь в хронологическом порядке: журнал и вся
// аналитика считают историю отсортированной по ts
r = mergeBackup({settings:{}, workouts:[wo("b", 20)], body:{entries:[]}, nut:{}},
                {workouts:[wo("a", 10), wo("c", 30)]});
eq("история отсортирована по времени", r.workouts.map(w=>w.id), ["a","b","c"]);

// Вход не мутируется: приложение не должно меняться, пока слияние не принято
const c0 = {settings:{}, workouts:[], body:{entries:[]}, nut:{"2026-09":{"2026-09-01":{items:[1]}}}};
mergeBackup(c0, {nut:{"2026-09":{"2026-09-02":{items:[2]}}}});
eq("вход не мутируется", Object.keys(c0.nut["2026-09"]), ["2026-09-01"]);

console.log(bad ? "\nПРОВАЛЕНО: " + bad : "\nвсе проверки пройдены");
process.exit(bad ? 1 : 0);
