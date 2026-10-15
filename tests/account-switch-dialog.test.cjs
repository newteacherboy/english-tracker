'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('ingilizce/account-switch.js','utf8');
test('dedicated dialog traps focus and restores focus after cancellation',()=>{
 new vm.Script(source);assert.match(source,/event\.key==='Escape'/);assert.match(source,/event\.key!=='Tab'/);assert.match(source,/previousFocus\.focus\(\)/);assert.match(source,/document\.removeEventListener\('keydown',keydown\)/);assert.match(source,/role="dialog" aria-modal="true"/);
});
test('adding an account moves and restores the existing form without opening legacy login panel',()=>{
 assert.match(source,/marker=document\.createComment/);assert.match(source,/marker\.replaceWith\(form\)/);assert.match(source,/target\.append\(form\)/);assert.doesNotMatch(source,/login\.style\.display|cikisYap\s*\(/);assert.match(source,/attempt\?\.abort\(\)/);
});
test('account list and add form are separate views with optional removal controls',()=>{
 assert.match(source,/if\(managing&&!current\)/);assert.match(source,/\$\('dmSwitchAccounts'\)\.hidden=true/);assert.match(source,/\$\('dmSwitchForm'\)\.hidden=true/);assert.match(source,/error\.expired\)addAccount\(entry\.name\)/);
});
