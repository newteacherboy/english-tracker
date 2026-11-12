'use strict';
/* index.html'deki büyük satır içi kodlar ingilizce/app-js/ altına taşındı (12 Kas 2026, açılış hızı).
   Eski testler index.html metninde fonksiyon/metin arıyor. Bu yardımcı, ingilizce/index.html okunurken
   <script src="app-js/…?v=…"></script> satırlarını dosyanın içeriğiyle geri birleştirir: testler taşımadan
   önceki metnin birebir aynısını görür. Diğer dosyalar etkilenmez. */
const fs = require('fs');
const path = require('path');
const { syncBuiltinESMExports } = require('module');

const INDEX = path.resolve(__dirname, '..', 'ingilizce', 'index.html');
const APP_JS = path.resolve(__dirname, '..', 'ingilizce', 'app-js');
const TAG = /<script src="app-js\/([^"?]+)\?v=[0-9a-f]+"><\/script>/g;

function isIndex(p) {
  try {
    if (p instanceof URL) p = p.protocol === 'file:' ? require('url').fileURLToPath(p) : '';
    if (typeof p !== 'string') return false;
    return path.resolve(p) === INDEX;
  } catch { return false; }
}
function inline(html) {
  return html.replace(TAG, (_, name) => '<script>' + fs.readFileSync.__original(path.join(APP_JS, name), 'utf8') + '</script>');
}
function encodingOf(o) { return typeof o === 'string' ? o : o && o.encoding; }

if (!fs.readFileSync.__original) {
  const original = fs.readFileSync;
  const patchedSync = function (p, options) {
    if (!isIndex(p)) return original.apply(this, arguments);
    const text = inline(original.call(this, p, 'utf8'));
    return encodingOf(options) ? text : Buffer.from(text, 'utf8');
  };
  patchedSync.__original = original;
  fs.readFileSync = patchedSync;

  const originalAsync = fs.readFile;
  fs.readFile = function (p, options, callback) {
    if (!isIndex(p)) return originalAsync.apply(this, arguments);
    if (typeof options === 'function') { callback = options; options = undefined; }
    let out, error = null;
    try { out = patchedSync(p, options); } catch (e) { error = e; }
    process.nextTick(() => callback(error, out));
  };

  const originalPromise = fs.promises.readFile;
  fs.promises.readFile = async function (p, options) {
    if (!isIndex(p)) return originalPromise.apply(this, arguments);
    return patchedSync(p, options);
  };
  syncBuiltinESMExports();
}

module.exports = { inline, INDEX };
