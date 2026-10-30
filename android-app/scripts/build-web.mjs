import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../..', import.meta.url));
const app = path.join(root, 'android-app');
const out = path.join(app, 'www');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const dir of ['ingilizce', 'content', 'dersler', 'araba']) {
  await cp(path.join(root, dir), path.join(out, dir), { recursive: true });
}
// Keep the original /ingilizce/ URL shape so relative game/content assets still resolve.
await writeFile(path.join(out, 'index.html'), '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/ingilizce/"><title>Diji Medu</title></head><body><a href="/ingilizce/">Diji Medu’yu aç</a></body></html>');
await build({ entryPoints: [path.join(app, 'src/runtime.js')], outfile: path.join(out, 'ingilizce/android-runtime.js'), bundle: true, format: 'iife', platform: 'browser', target: ['chrome110'], minify: true });
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
  for (const name of ['ic_launcher','ic_launcher_round']) {
    await sharp(path.join(root,'ingilizce/app-icons/papagan-512.png')).resize(size,size).png().toFile(path.join(dir,name+'.png'));
  }
  // Adaptive icons need space around the face to survive device-specific masks.
  const total = Math.round(size * 2.25), inner = Math.round(total * 0.62);
  const image = await sharp(path.join(root,'ingilizce/app-icons/papagan-512.png')).resize(inner,inner).png().toBuffer();
  await sharp({create:{width:total,height:total,channels:4,background:'#FAF8F5'}}).composite([{input:image,gravity:'center'}]).png().toFile(path.join(dir,'ic_launcher_foreground.png'));
}
// Use the Gradle wrapper delivered by the pinned official Capacitor CLI package.
await writeFile(path.join(app,'android/gradle/wrapper/gradle-wrapper.jar'), execFileSync('tar', ['-xOzf', path.join(app,'node_modules/@capacitor/cli/assets/android-template.tar.gz'), 'gradle/wrapper/gradle-wrapper.jar']));
