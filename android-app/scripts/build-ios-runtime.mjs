// iOS paketine gömülen ortak yerel katman (reklam, üyelik, bildirim). Android'deki runtime.js ile aynı kaynak.
// Kullanım: node scripts/build-ios-runtime.mjs <çıktı-dosyası>   (DM_PRODUCTION_ADS=1 canlı reklam)
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('..', import.meta.url));
const out = path.resolve(process.argv[2] || path.join(app, '../ios-app/native/native-runtime.js'));
await build({
  entryPoints: [path.join(app, 'src/runtime.js')], outfile: out,
  define: { DM_PRODUCTION_ADS: JSON.stringify(process.env.DM_PRODUCTION_ADS === '1') },
  bundle: true, format: 'iife', platform: 'browser', target: ['safari15'], minify: true,
});
console.log('iOS yerel katmanı:', out);
