/* ============================================================
   Программа тренировок — данные
   ============================================================ */
const EX = {
  squat:      {n:"Присед со штангой",                g:"legs",    step:2.5, kind:"bar"},
  frontsquat: {n:"Фронтальный присед / гакк-машина",  g:"legs",    step:2.5, kind:"bar"},
  legpress:   {n:"Жим ногами",                        g:"legs",    step:5,   kind:"mach"},
  bulgarian:  {n:"Болгарские выпады",                 g:"legs",    step:2,   kind:"db", uni:true},
  rdl:        {n:"Румынская тяга",                    g:"hams",    step:2.5, kind:"bar"},
  leg_curl:   {n:"Сгибание ног в тренажёре",          g:"hams",    step:2.5, kind:"mach", iso:true},
  deadlift:   {n:"Становая тяга",                     g:"back",    step:5,   kind:"bar"},
  bench:      {n:"Жим штанги лёжа",                   g:"chest",   step:2.5, kind:"bar"},
  incline_db: {n:"Жим гантелей на наклонной, 30°",    g:"chest",   step:2,   kind:"db"},
  dip:        {n:"Брусья / жим узким хватом",         g:"chest",   step:2.5, kind:"bw"},
  row:        {n:"Тяга штанги в наклоне",             g:"back",    step:2.5, kind:"bar"},
  row_db:     {n:"Тяга гантели одной рукой",          g:"back",    step:2,   kind:"db", uni:true},
  pullup:     {n:"Подтягивания / тяга верхнего блока",g:"back",    step:2.5, kind:"bw"},
  pulldown_n: {n:"Тяга верхнего блока узким хватом",  g:"back",    step:2.5, kind:"mach"},
  ohp_db:     {n:"Жим гантелей сидя",                 g:"delts",   step:2,   kind:"db"},
  lat_raise:  {n:"Махи гантелями в стороны",          g:"delts",   step:1,   kind:"db", iso:true},
  rear_fly:   {n:"Разведения гантелей в наклоне",     g:"delts",   step:1,   kind:"db", iso:true},
  facepull:   {n:"Тяга каната к лицу",                g:"delts",   step:2,   kind:"mach", iso:true},
  curl_bb:    {n:"Подъём штанги на бицепс",           g:"biceps",  step:2.5, kind:"bar", iso:true},
  hammer:     {n:"Молотки с гантелями",               g:"biceps",  step:1,   kind:"db", iso:true},
  skull:      {n:"Французский жим",                   g:"triceps", step:2,   kind:"bar", iso:true},
  tri_push:   {n:"Разгибания на блоке",               g:"triceps", step:2,   kind:"mach", iso:true},
  calf:       {n:"Подъём на носки стоя",              g:"calves",  step:2.5, kind:"mach", iso:true},
  plank:      {n:"Планка",                            g:"core",    step:5,   kind:"time"},
  crunch:     {n:"Скручивания / ролик для пресса",    g:"core",    step:0,   kind:"bw", iso:true},
  hang_leg:   {n:"Подъём ног в висе",                 g:"core",    step:0,   kind:"bw", iso:true}
};
const GROUPS = {legs:"Ноги", hams:"Бицепс бедра", chest:"Грудь", back:"Спина", delts:"Плечи", biceps:"Бицепс", triceps:"Трицепс", calves:"Икры", core:"Пресс"};

// s — подходы, r — [низ, верх] диапазона повторов, rpe — [низ, верх]
const DAYS = {
  A:     {block:1, label:"День A", tag:"A", items:[
    {e:"squat",     s:4, r:[8,10],  rpe:[7,7]},
    {e:"bench",     s:4, r:[8,10],  rpe:[7,7]},
    {e:"row",       s:4, r:[10,10], rpe:[7,7]},
    {e:"ohp_db",    s:3, r:[10,12], rpe:[7,7]},
    {e:"lat_raise", s:3, r:[15,15], rpe:[8,8]},
    {e:"plank",     s:3, r:[40,40], rpe:null}
  ]},
  B:     {block:1, label:"День B", tag:"B", items:[
    {e:"rdl",       s:4, r:[8,8],   rpe:[7,7]},
    {e:"legpress",  s:3, r:[10,12], rpe:[7,7]},
    {e:"pullup",    s:4, r:[8,10],  rpe:[7,7]},
    {e:"dip",       s:3, r:[8,10],  rpe:[7,7]},
    {e:"facepull",  s:3, r:[15,15], rpe:[8,8]},
    {e:"curl_bb",   s:3, r:[10,12], rpe:[8,8]},
    {e:"skull",     s:3, r:[10,12], rpe:[8,8]}
  ]},
  C:     {block:1, label:"День C", tag:"C", items:[
    {e:"frontsquat",s:4, r:[10,10], rpe:[7,7]},
    {e:"incline_db",s:4, r:[10,10], rpe:[7,7]},
    {e:"row_db",    s:4, r:[10,10], rpe:[7,7]},
    {e:"lat_raise", s:3, r:[15,15], rpe:[8,8]},
    {e:"rear_fly",  s:3, r:[15,15], rpe:[8,8]},
    {e:"calf",      s:3, r:[15,15], rpe:[8,8]},
    {e:"crunch",    s:3, r:[15,15], rpe:null}
  ]},
  upper: {block:2, label:"Верх", tag:"ВЕРХ", items:[
    {e:"bench",     s:4, r:[6,8],   rpe:[8,8]},
    {e:"row",       s:4, r:[8,10],  rpe:[7,8]},
    {e:"ohp_db",    s:3, r:[8,10],  rpe:[7,8]},
    {e:"pullup",    s:3, r:[8,10],  rpe:[8,8]},
    {e:"dip",       s:3, r:[8,12],  rpe:[8,8]},
    {e:"lat_raise", s:3, r:[12,15], rpe:[8,9]},
    {e:"curl_bb",   s:3, r:[10,12], rpe:[8,9]},
    {e:"tri_push",  s:3, r:[10,12], rpe:[8,9]}
  ]},
  lower: {block:2, label:"Низ", tag:"НИЗ", items:[
    {e:"squat",     s:4, r:[6,8],   rpe:[8,8]},
    {e:"rdl",       s:3, r:[8,10],  rpe:[7,8]},
    {e:"legpress",  s:3, r:[10,12], rpe:[8,8]},
    {e:"leg_curl",  s:3, r:[10,12], rpe:[8,9]},
    {e:"calf",      s:4, r:[12,15], rpe:[8,9]},
    {e:"hang_leg",  s:3, r:[10,15], rpe:null}
  ]},
  full:  {block:2, label:"Фулбоди", tag:"ФУЛЛ", items:[
    {e:"deadlift",  s:3, r:[5,5],   rpe:[7,8]},
    {e:"incline_db",s:4, r:[8,10],  rpe:[8,8]},
    {e:"pulldown_n",s:3, r:[8,10],  rpe:[8,8]},
    {e:"bulgarian", s:3, r:[10,10], rpe:[7,8]},
    {e:"facepull",  s:3, r:[15,15], rpe:[8,9]},
    {e:"lat_raise", s:3, r:[15,15], rpe:[8,9]},
    {e:"hammer",    s:3, r:[12,12], rpe:[8,9]},
    {e:"skull",     s:3, r:[12,12], rpe:[8,9]}
  ]}
};
const ROT1 = ["A","B","C"], ROT2 = ["upper","lower","full"];
const SEED_W = {bench:45, squat:35, rdl:35, row:32.5};

const WEEKNOTE = {
  1:"Неделя 1 — на подход меньше по каждому упражнению, RPE 5–6. Задача: вспомнить технику, не словить крепатуру.",
  2:"Неделя 2 — подходы по таблице, RPE 6–7. Задача: подобрать рабочие веса.",
  3:"Недели 3–4 — рабочий режим, RPE 7 (изоляция 8). Прибавляй повторы внутри диапазона.",
  4:"Недели 3–4 — рабочий режим, RPE 7 (изоляция 8). Прибавляй повторы внутри диапазона.",
  5:"Недели 5–6 — блок «Верх / Низ / Фулбоди» по таблицам. Веса выше, объём больше.",
  6:"Недели 5–6 — блок «Верх / Низ / Фулбоди» по таблицам. Веса выше, объём больше.",
  7:"Недели 7–8 — плюс один подход к первым двум упражнениям каждого дня.",
  8:"Недели 7–8 — плюс один подход к первым двум упражнениям каждого дня.",
  9:"Неделя 9 — разгрузка. Подходов вдвое меньше, веса на 10% ниже, RPE 5–6. Так снимается усталость суставов и нервной системы."
};
