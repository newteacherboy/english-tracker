'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('ingilizce/account-switch.js','utf8');
test('account switch dialog supports Escape, focus trap and focus restoration',()=>{
 new vm.Script(source);
 assert.match(source,/event\.key==='Escape'/);
 assert.match(source,/event\.key!=='Tab'/);
 assert.match(source,/previousFocus\.focus\(\)/);
 assert.match(source,/document\.removeEventListener\('keydown',keydown\)/);
});
test('account switch preserves and restores original login dialog attributes and display',()=>{
 for(const key of ['previousDisplay','previousRole','previousAriaModal','previousAriaLabel'])
  assert.match(source,new RegExp(key));
 assert.match(source,/login\.style\.display=previousDisplay/);
 assert.match(source,/login\.setAttribute\('aria-modal','true'\)/);
 assert.match(source,/login\.setAttribute\('role','dialog'\)/);
 assert.doesNotMatch(source,/cikisYap\s*\(/);
});
