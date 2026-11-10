import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
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
await mkdir(path.join(out, 'ingilizce'), { recursive: true });
// İçerik canlı siteden gelir (capacitor.config.json → server.url). Pakette yalnız yerel katman ve çevrimdışı sayfası kalır.
await build({
  entryPoints: [path.join(app, 'src/boot.js')],
  outfile: path.join(out, 'ingilizce/android-runtime.js'),
  define: { DM_PRODUCTION_ADS: JSON.stringify(production) },
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome110'],
  minify: true,
});
const offline = '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diji Medu</title><style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#FAF8F5;color:#07535b;font:16px system-ui;text-align:center;padding:24px;box-sizing:border-box}h1{font-size:20px;margin:0}p{margin:0;color:#3d5a5e}button{border:0;border-radius:14px;padding:13px 22px;background:#0f766e;color:#fff;font:700 16px system-ui}</style></head><body><div style="font-size:54px">🦜</div><h1>İnternet bağlantısı yok</h1><p>Diji Medu’yu kullanmak için internete bağlan, sonra tekrar dene.</p><button onclick="location.href=\'https://app.dijimedu.com/ingilizce/index.html\'">Tekrar dene</button></body></html>';
await writeFile(path.join(out, 'offline.html'), offline);
await writeFile(path.join(out, 'index.html'), offline);
console.log('Android yerel katmanı ve çevrimdışı sayfası hazır (içerik canlı siteden).');

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
