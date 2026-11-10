// Siteden yüklenen ortak katmanı üretir: ingilizce/native/runtime-android.js ve runtime-ios.js (canlı reklam birimleri).
// GitHub'da "native-runtime-site" iş akışı android-app/src veya admob.config.json değişince çalıştırır ve sonucu main'e işler.
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const app = fileURLToPath(new URL('..', import.meta.url));
const adConfig = JSON.parse(await readFile(path.join(app, 'admob.config.json'), 'utf8'));
if (!adConfig.productionEnabled) throw Error('admob.config.json: productionEnabled false');
const stamp = new Date().toISOString();
for (const [name, target] of [['android', 'chrome110'], ['ios', 'safari15']]) {
  await build({
    entryPoints: [path.join(app, 'src/runtime-web.js')], outfile: path.join(app, '../ingilizce/native/runtime-' + name + '.js'),
    define: { DM_PRODUCTION_ADS: 'true' }, bundle: true, format: 'iife', platform: 'browser', target: [target], minify: true,
    banner: { js: '/* Diji Medu ortak yerel katman (' + name + '), ' + stamp + '. Elle düzenlemeyin: android-app/src içinden üretilir. */' },
  });
  console.log('Site katmanı:', name);
}
