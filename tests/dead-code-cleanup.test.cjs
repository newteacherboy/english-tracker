'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('legacy maintenance bootstrap was removed without removing functional overlay',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../ingilizce/index.html'),'utf8');
 assert.doesNotMatch(html,/const BAKIM_MODU\s*=\s*false/);
 assert.doesNotMatch(html,/if\s*\(\s*BAKIM_MODU\s*\)/);
 assert.match(html,/id=["']bakimEkrani["']/);
 assert.match(html,/id=["']login-container["']/);
 assert.match(html,/id=["']panel-alani["']/);
});
