'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('daily task client gets fresh version and account switch UI is loaded',()=>{
 const html=fs.readFileSync('ingilizce/index.html','utf8');
 assert.match(html,/progression-ui\.js\?v=20261015-daily-goals-ready-1/);
 assert.match(html,/benim-dunyam\.js\?v=20261015-daily-state-2/);
 assert.match(html,/account-switch\.js\?v=20261015-saved-2/);
 assert.match(html,/account-switch\.css\?v=20261015-saved-2/);
});
test('server-backed login changes account only after success and reloads to isolate session',()=>{
 const html=fs.readFileSync('ingilizce/index.html','utf8');
 const start=html.lastIndexOf('window.girisYap = async function');
 assert.ok(start>0);
 const code=html.slice(start,start+2200);
 assert.ok(code.indexOf('if (!d || !d.ok)')<code.indexOf('localStorage.setItem(\'ing_token\''));
 assert.ok(code.indexOf('if(window.dmAccountSwitchPending)')>code.indexOf("localStorage.setItem('ing_aktifOgrenci'"));
 assert.ok(code.indexOf('window.location.reload();')>code.indexOf('if(window.dmAccountSwitchPending)'));
});
test('account switch UI offers cancellation without calling logout',()=>{
 const code=fs.readFileSync('ingilizce/account-switch.js','utf8');
 assert.doesNotMatch(code,/cikisYap\s*\(/);
 assert.match(code,/dmAccountSwitchPending=true/);
 assert.match(code,/dmAccountSwitchPending=false/);
 assert.match(code,/dmSwitchCancel/);
 new vm.Script(code);
});
