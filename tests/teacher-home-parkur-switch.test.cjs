const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('ingilizce/teacher-workspace.js','utf8');
const style=fs.readFileSync('ingilizce/teacher-workspace.css','utf8');
const boot=fs.readFileSync('ingilizce/teacher-portal-boot.js','utf8');

test('V2 teacher home exposes a prominent personal Parkur button with a working handler',()=>{
 assert.match(source,/class="dm-midnight-parkur-switch" data-teacher-parkur-switch/);
 assert.match(source,/personalParkur\.onclick=\(\)=>window\.dmTeacherPortalParkur\?\.\(\)/);
 assert.match(source,/Kişisel Parkur’a Geç/);
 assert.match(style,/\.dm-midnight-home \.dm-midnight-parkur-switch\s*\{/);
 assert.match(style,/min-height:48px/);
 assert.match(boot,/window\.dmTeacherPortalParkur=\(\)=>\{window\.dmTeacherDevice\.leave\(\);location\.assign\('\.\/'\)/);
});
