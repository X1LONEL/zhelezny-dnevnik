#!/usr/bin/env node
/**
 * Статика из dist/pwa для проверки офлайн-сборки.
 *
 * Нужен потому, что PWA нельзя посмотреть через file://: браузер не
 * регистрирует service worker вне http/https, а без него не работают
 * ни офлайн, ни установка. Сервер только для разработки — в продакшене
 * файлы отдаёт GitHub Pages.
 *
 *   node tools/serve.mjs [порт]
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "pwa");
const PORT = Number(process.argv[2]) || 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
};

if (!fs.existsSync(path.join(ROOT, "index.html"))) {
  console.error("Нет dist/pwa — сначала `npm run build`");
  process.exit(1);
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    let file = path.join(ROOT, url === "/" ? "index.html" : url);
    // за пределы dist/pwa не выпускаем
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(ROOT, "index.html");
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      // без этого браузер отдаёт старый sw.js и правки не видны
      "Cache-Control": "no-store",
      "Service-Worker-Allowed": "/",
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`dist/pwa → http://localhost:${PORT}`));
