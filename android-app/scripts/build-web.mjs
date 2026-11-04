import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../..', import.meta.url));
const app = path.join(root, 'android-app');
const adConfig=JSON.parse(await readFile(path.join(app,'admob.config.json'),'utf8'));
const production=process.env.DM_PRODUCTION_ADS==='1';
if(production && !adConfig.productionEnabled)throw Error('Production ads blocked: verify SSV, consent, signing and device tests before enabling.');
const out = path.join(app, 'www');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const dir of ['ingilizce', 'content', 'dersler', 'araba']) {
  await cp(path.join(root, dir), path.join(out, dir), { recursive: true });
}
// Keep the original /ingilizce/ URL shape so relative game/content assets still resolve.
// Kök sayfa uygulamayı hemen /ingilizce/ yoluna taşır. Meta yenileme bazı WebView'larda çalışmadığı için JS ile de yönlendirilir.
await writeFile(path.join(out, 'index.html'), '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diji Medu</title><script>location.replace("/ingilizce/index.html")</script><meta http-equiv="refresh" content="0;url=/ingilizce/index.html"><style>body{margin:0;background:#FAF8F5;font:16px system-ui;display:flex;align-items:center;justify-content:center;height:100vh}a{color:#07535b}</style></head><body><a href="/ingilizce/index.html">Diji Medu’yu aç</a></body></html>');
await build({ entryPoints: [path.join(app, 'src/runtime.js')], outfile: path.join(out, 'ingilizce/android-runtime.js'), define:{DM_PRODUCTION_ADS:JSON.stringify(production)}, bundle: true, format: 'iife', platform: 'browser', target: ['chrome110'], minify: true });
const htmlPath = path.join(out, 'ingilizce/index.html');
let html = await readFile(htmlPath, 'utf8');
html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n<script src="android-runtime.js"></script>');
// Capacitor owns packaged files: never install a website worker over native app releases.
await writeFile(htmlPath, html);
await writeFile(path.join(out, 'ingilizce/app-updates.js'), '/* Native releases use Play Store updates; web service worker disabled in this package. */');
console.log('Bundled Diji Medu web assets and Android bridge.');

const nativePath = path.join(out, 'ingilizce/native-app.js');
let native = await readFile(nativePath, 'utf8');
native = native.replace("var Notes = plugin('LocalNotifications');", "var Notes = null; // Android does not request reminder permissions in this release.");
await writeFile(nativePath, native);
const navPath = path.join(out, 'ingilizce/navigation-history.js');
let nav = await readFile(navPath, 'utf8');
nav = nav.replace('window.dmViewHistory={capture,', `function nativeBack(){const frame=[...frames].reverse().find(f=>visible(f.el));if(!frame||!(frame.back||frame.close))return false;(frame.back||frame.close)();return true;}
window.dmViewHistory={back:nativeBack,capture,`);
await writeFile(navPath, nav);

// Rebuild native icons from the repository's original Papi image, not binary copies.
const res = path.join(app, 'android/app/src/main/res');
for (const [density, size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]) {
  const dir = path.join(res, 'mipmap-' + density); await mkdir(dir, { recursive: true });
  await sharp(path.join(root,'ingilizce/app-icons/papi-logo-1024.png')).resize(size,size).png().toFile(path.join(dir,'ic_launcher.png'));
  // Eski Android'lerdeki yuvarlak simge: köşeleri şeffaf daire.
  const circle = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#fff"/></svg>`);
  await sharp(path.join(root,'ingilizce/app-icons/papi-logo-1024.png')).resize(size,size).ensureAlpha().composite([{input:circle,blend:'dest-in'}]).png().toFile(path.join(dir,'ic_launcher_round.png'));
  // Uyarlanabilir simge: logo kenarına kadar dolu bir çizim; maske yalnız ortadaki %66'yı gösterir.
  // Çizim katmanın %70'ine yerleşir, kenarları maskenin dışında kalır; arka plan logonun yeşili (#A5DBA9).
  const total = Math.round(size * 2.25), inner = Math.round(total * 0.70);
  const image = await sharp(path.join(root,'ingilizce/app-icons/papi-logo-1024.png')).resize(inner,inner).png().toBuffer();
  await sharp({create:{width:total,height:total,channels:4,background:'#A5DBA9'}}).composite([{input:image,gravity:'center'}]).png().toFile(path.join(dir,'ic_launcher_foreground.png'));
}
// Use the Gradle wrapper delivered by the pinned official Capacitor CLI package.
await writeFile(path.join(app,'android/gradle/wrapper/gradle-wrapper.jar'), execFileSync('tar', ['-xOzf', path.join(app,'node_modules/@capacitor/cli/assets/android-template.tar.gz'), 'gradle/wrapper/gradle-wrapper.jar']));
