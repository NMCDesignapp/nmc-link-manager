const fs = require('fs');

function replaceOnce(file, before, after) {
  const source = fs.readFileSync(file, 'utf8');
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${file}: expected one match for ${before.slice(0, 80)}, found ${count}`);
  fs.writeFileSync(file, source.replace(before, after), 'utf8');
}

// Force browsers/PWA to discard the old application shell and client chunks.
replaceOnce('public/sw.js', "const CACHE_NAME = 'nmc-links-v24';", "const CACHE_NAME = 'nmc-links-v25';");

// Discard any stale or partially written session preload after the Data Hub migration.
replaceOnce('src/lib/app-data-context.tsx', "const APP_DATA_CACHE_KEY = 'nmc-app-data-v2'", "const APP_DATA_CACHE_KEY = 'nmc-app-data-v3'");

// Avoid a double reload race while a newly installed service worker takes control.
const layoutFile = 'src/app/layout.tsx';
let layout = fs.readFileSync(layoutFile, 'utf8');
const updateFoundBlock = /\n\s*\/\/ Lắng nghe SW mới install[\s\S]*?registration\.addEventListener\('updatefound',[\s\S]*?\n\s*\}\);/;
if (!updateFoundBlock.test(layout)) throw new Error('layout: service-worker updatefound block not found');
layout = layout.replace(updateFoundBlock, `
                      // Service worker mới tự skipWaiting; controllerchange bên dưới
                      // thực hiện đúng một lần tải lại để tránh vòng lặp/trang trắng.`);
fs.writeFileSync(layoutFile, layout, 'utf8');

for (const [file, marker] of [
  ['public/sw.js', "nmc-links-v25"],
  ['src/lib/app-data-context.tsx', "nmc-app-data-v3"],
  ['src/app/layout.tsx', "thực hiện đúng một lần tải lại"],
]) {
  if (!fs.readFileSync(file, 'utf8').includes(marker)) throw new Error(`${file}: missing ${marker}`);
}

console.log('Applied blank page recovery hotfix.');
