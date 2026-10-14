#!/usr/bin/env node
/**
 * Сборка «Железного дневника».
 *
 * Исходники лежат раздельно в src/, сборка склеивает их в один
 * самодостаточный HTML. Собирается два файла:
 *
 *   dist/artifact.html — то, что публикуется как Artifact.
 *                        Без <!doctype>, <html>, <head>, <body> —
 *                        платформа оборачивает содержимое сама.
 *   dist/index.html    — тот же код в полноценном документе,
 *                        чтобы открыть в браузере и посмотреть
 *                        локально (open dist/index.html).
 *
 * Порядок файлов задаётся в src/manifest.json. Скрипты склеиваются
 * в одну область видимости — модулей нет намеренно, чтобы
 * опубликованная страница оставалась одним файлом без импортов.
 * Поэтому порядок важен только для кода, который выполняется
 * на верхнем уровне (он весь в boot.js и идёт последним).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { icons, ICON_BG } from "./src/icon.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const PWA = path.join(DIST, "pwa");

const read = (...p) => fs.readFileSync(path.join(...p), "utf8");
const manifest = JSON.parse(read(SRC, "manifest.json"));

function join(dir, files, comment) {
  return files
    .map((f) => {
      const body = read(SRC, dir, f).trim();
      return comment ? `${comment(f)}\n${body}` : body;
    })
    .join("\n\n");
}

const css = join("styles", manifest.styles, (f) => `/* ======== ${f} ======== */`);
const html = join("markup", manifest.markup, null);
const js = join("js", manifest.scripts, (f) => `/* ======== ${f} ======== */`);

// @import шрифтов обязан быть первым правилом таблицы стилей —
// комментарии перед ним допустимы, любое другое правило ломает импорт.
const firstRule = css.replace(/\/\*[\s\S]*?\*\//g, "").trim();
if (!firstRule.startsWith("@import")) {
  fail("@import шрифтов должен быть первым правилом: проверь порядок styles в manifest.json");
}

// Синтаксическая проверка склеенного скрипта до записи на диск.
try {
  new Function(js);
} catch (e) {
  fail(`синтаксическая ошибка в собранном скрипте: ${e.message}`);
}

// viewport-fit-sides: боковые отступы страницы считаются через
// max(16px, env(safe-area-inset-*)), поэтому её можно пускать под вырез
const head = `<title>${manifest.title}</title>\n<meta name="claude:viewport-fit-sides" content="cover">`;
const bundle = `${head}\n<style>\n${css}\n</style>\n\n${html}\n\n<script>\n"use strict";\n${js}\n</script>\n`;

if (process.argv.includes("--check")) {
  console.log(`проверка пройдена · css ${size(css)} · js ${size(js)} · markup ${size(html)}`);
  process.exit(0);
}

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, "artifact.html"), bundle);

const preview = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- Локальный предпросмотр. Повторяет обёртку, которую платформа
     добавляет опубликованному артефакту: тот же сброс стилей,
     та же мета. Само приложение ниже — байт в байт artifact.html. -->
<style>
:root{color-scheme:light dark}
body{margin:0;font:14px system-ui,sans-serif}
img{max-width:100%}
[hidden]{display:none!important}
</style>
</head>
<body>
${bundle}</body>
</html>
`;
fs.writeFileSync(path.join(DIST, "index.html"), preview);

/* ============================================================
   Второй выход: устанавливаемое приложение (PWA)
   ============================================================

   То же приложение, но на своём origin по HTTPS. Артефакт установить
   на телефон нельзя: он живёт в песочнице внутри claude.ai, своим
   <head> не управляет, а service worker регистрируется только с
   файла на собственном origin.

   Все пути относительные («./»), чтобы сборка одинаково работала и в
   корне домена, и в подпапке вида user.github.io/<репозиторий>/.
   ============================================================ */

// Версия кэша = отпечаток сборки: не поменялся код — телефон не
// перекачивает страницу; поменялся — старый кэш сносится целиком.
const BUILD = crypto.createHash("sha256").update(bundle).digest("hex").slice(0, 12);

const APP_ICONS = icons();

const webmanifest = {
  name: manifest.title,
  short_name: "Дневник",
  description: "Дневник силовых тренировок и питания по 9-недельной программе",
  lang: "ru",
  start_url: "./",
  scope: "./",
  display: "standalone",
  orientation: "portrait",
  background_color: "#eceef1",
  theme_color: ICON_BG,
  icons: [
    { src: "./icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "./icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "./icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

const pwaHead =`<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Дневник силовых тренировок и питания по 9-недельной программе">
<link rel="manifest" href="./manifest.webmanifest">
<!-- iOS читает манифест только после установки, а иконку и режим
     экрана берёт из этих тегов — без них на домашний экран попадёт
     скриншот страницы в обычном Safari с адресной строкой. -->
<link rel="apple-touch-icon" href="./icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Дневник">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="${ICON_BG}">
<style>
:root{color-scheme:light dark}
html{background:#eceef1}
@media (prefers-color-scheme: dark){html{background:#0a0c0f}}
body{margin:0;font:14px system-ui,sans-serif}
img{max-width:100%}
[hidden]{display:none!important}
/* Вырезы: приложение растянуто на весь экран, а :root здесь, в отличие
   от артефакта, не подбит отступами — шапка берёт вырез на себя.
   Нижний индикатор учитывают сами .wrap, .tabs и .dock. */
header.top{top:0;padding-top:env(safe-area-inset-top)}
</style>`;

const pwaBoot = `<script>
// Service worker — это и есть офлайн: без него установленное
// приложение при отсутствии сети покажет пустую страницу.
if ("serviceWorker" in navigator) {
  addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  });
}
</script>`;

const pwaDoc = `<!doctype html>
<html lang="ru">
<head>
${pwaHead}
</head>
<body>
${bundle}${pwaBoot}
</body>
</html>
`;

const sw = `/* Железный дневник — офлайн. Сборка ${BUILD}. Файл собран build.mjs. */
"use strict";
const CACHE = "zhd-${BUILD}";
const SHELL = ${JSON.stringify(["./", "./index.html", "./manifest.webmanifest", ...APP_ICONS.map((i) => "./" + i.name)])};

// Оболочка кладётся в кэш при установке: приложение обязано открыться
// с первого же запуска без сети.
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

// Старые версии сносим целиком — кэш назван по отпечатку сборки.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Навигация: сеть вперёд, чтобы свежая версия подхватывалась сама,
  // но при её отсутствии отдаём страницу из кэша. Без этой ветки
  // офлайн-запуск упирается в ошибку сети.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const c = r.clone(); caches.open(CACHE).then((h) => h.put("./index.html", c)); return r; })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Шрифты Google лежат на чужом origin и в SHELL их не положить:
  // адреса файлов зависят от браузера. Забираем в кэш по факту
  // первой загрузки — со второго запуска они доступны офлайн.
  const font = url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com";
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((r) => {
        if (r && (r.ok || (font && r.type === "opaque"))) {
          const c = r.clone();
          caches.open(CACHE).then((h) => h.put(req, c));
        }
        return r;
      }).catch(() => hit);
    })
  );
});
`;

fs.mkdirSync(PWA, { recursive: true });
fs.writeFileSync(path.join(PWA, "index.html"), pwaDoc);
fs.writeFileSync(path.join(PWA, "manifest.webmanifest"), JSON.stringify(webmanifest, null, 2) + "\n");
fs.writeFileSync(path.join(PWA, "sw.js"), sw);
// .nojekyll: GitHub Pages иначе прячет файлы и папки, начинающиеся с _
fs.writeFileSync(path.join(PWA, ".nojekyll"), "");
APP_ICONS.forEach((i) => fs.writeFileSync(path.join(PWA, i.name), i.data));

console.log(`собрано → dist/artifact.html (${size(bundle)})`);
console.log(`         dist/index.html   (предпросмотр в браузере)`);
console.log(`         dist/pwa/         (устанавливаемое приложение, сборка ${BUILD})`);

function size(s) {
  return (Buffer.byteLength(s, "utf8") / 1024).toFixed(1) + " КБ";
}
function fail(msg) {
  console.error("Сборка остановлена: " + msg);
  process.exit(1);
}
