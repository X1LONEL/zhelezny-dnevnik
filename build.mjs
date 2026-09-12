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
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

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

const head = `<title>${manifest.title}</title>`;
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

console.log(`собрано → dist/artifact.html (${size(bundle)})`);
console.log(`         dist/index.html   (предпросмотр в браузере)`);

function size(s) {
  return (Buffer.byteLength(s, "utf8") / 1024).toFixed(1) + " КБ";
}
function fail(msg) {
  console.error("Сборка остановлена: " + msg);
  process.exit(1);
}
