const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const src = fs.readFileSync('ingilizce/portal-bootstrap.js','utf8');
test('post-login optional work happens after loading overlay closes', () => {
 const hidden = src.indexOf("oturumYuklemeOverlay').style.display='none';");
 const frame = src.indexOf("requestAnimationFrame(afterPaint)");
 const notice = src.lastIndexOf("safe(window.anaPanelDuyuruBildirimleriYukle)");
 const bonus = src.lastIndexOf("safe(window.gunlukEnerjiBonusuKontrolEt)");
 assert.ok(hidden >= 0 && frame > hidden);
 assert.ok(notice > hidden && bonus > hidden);
 assert.match(src,/turn!==epoch\|\|name\(\)!==owner/);
});
