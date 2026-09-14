/**
 * Иконки приложения.
 *
 * iOS ставит на домашний экран только растр: `apple-touch-icon` не
 * понимает SVG, а манифест на телефоне читается уже после того, как
 * пользователь нажал «На экран «Домой»». Поэтому PNG обязателен.
 *
 * Зависимостей у проекта нет и заводить их ради четырёх картинок
 * незачем: PNG — это три чанка со свёрткой zlib, а zlib лежит в
 * стандартной библиотеке Node. Рисуем сами, сглаживание — честной
 * передискретизацией 4×4.
 */
import zlib from "node:zlib";

/* ---------- растеризация ---------- */

// Прямоугольник со скруглением; координаты в долях стороны (0..1).
function roundRect(x0, y0, x1, y1, r) {
  return (x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = Math.min(Math.max(x, x0 + r), x1 - r);
    const cy = Math.min(Math.max(y, y0 + r), y1 - r);
    const dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy <= r * r + 1e-12;
  };
}

const hex = (c) => [
  parseInt(c.slice(1, 3), 16),
  parseInt(c.slice(3, 5), 16),
  parseInt(c.slice(5, 7), 16),
];

/**
 * Штанга: гриф и по две пары блинов. Рисуется в квадрате 0..1,
 * `inset` сжимает рисунок к центру — для maskable-иконки, у которой
 * Android обрезает углы под свою форму.
 */
function barbell(inset) {
  const m = (v) => 0.5 + (v - 0.5) * (1 - inset * 2);
  const s = (v) => v * (1 - inset * 2);
  return [
    roundRect(m(0.13), m(0.468), m(0.87), m(0.532), s(0.026)), // гриф
    roundRect(m(0.28), m(0.25), m(0.375), m(0.75), s(0.028)),  // внутренние блины
    roundRect(m(0.625), m(0.25), m(0.72), m(0.75), s(0.028)),
    roundRect(m(0.185), m(0.34), m(0.255), m(0.66), s(0.024)), // внешние блины
    roundRect(m(0.745), m(0.34), m(0.815), m(0.66), s(0.024)),
  ];
}

const SS = 4; // сторона супервыборки

function render(size, { bg, fg, inset }) {
  const shapes = barbell(inset);
  const [br, bgc, bb] = hex(bg);
  const [fr, fgc, fb] = hex(fg);
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          if (shapes.some((f) => f(u, v))) hits++;
        }
      }
      const a = hits / (SS * SS);
      const o = (y * size + x) * 4;
      px[o] = Math.round(br + (fr - br) * a);
      px[o + 1] = Math.round(bgc + (fgc - bgc) * a);
      px[o + 2] = Math.round(bb + (fb - bb) * a);
      px[o + 3] = 255; // иконка непрозрачная: iOS всё равно подложит чёрный фон
    }
  }
  return px;
}

/* ---------- контейнер PNG ---------- */

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // бит на канал
  ihdr[9] = 6;  // RGBA
  // строки идут с байтом фильтра 0 — картинка маленькая, ужимать нечего
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- то, что кладётся в сборку ---------- */

export const ICON_BG = "#2a5fb5";
const FG = "#ffffff";

export function icons() {
  return [
    // apple-touch-icon: ровно 180×180, иначе iOS возьмёт скриншот страницы
    { name: "icon-180.png", size: 180, inset: 0.06 },
    { name: "icon-192.png", size: 192, inset: 0.06 },
    { name: "icon-512.png", size: 512, inset: 0.06 },
    // maskable: содержимое в центральных 80%, углы срезаются маской
    { name: "icon-maskable-512.png", size: 512, inset: 0.14 },
  ].map((i) => ({
    name: i.name,
    data: encodePng(i.size, render(i.size, { bg: ICON_BG, fg: FG, inset: i.inset })),
  }));
}
