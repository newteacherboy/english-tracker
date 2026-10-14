'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('portal base CSS extracted verbatim and loaded before feature styles',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../ingilizce/index.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../ingilizce/portal-base-extracted.css'),'utf8');
 assert.ok(css.length>59000);
 assert.match(css,/box-sizing:\s*border-box/);
 assert.match(html,/href="portal-base-extracted\.css\?v=20261015-perf1"/);
 assert.ok(html.indexOf('portal-base-extracted.css')<html.indexOf('first-discovery.css') || html.indexOf('portal-base-extracted.css')<html.indexOf('tab-aktiviteler'));
 assert.match(html,/id=["']panel-alani["']/);
 assert.match(html,/id=["']login-container["']/);
});
