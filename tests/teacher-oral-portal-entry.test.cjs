const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const portal=fs.readFileSync('ingilizce/teacher-portal.js','utf8');
const oral=fs.readFileSync('ingilizce/teacher-oral.js','utf8');
const server=fs.readFileSync('supabase/functions/teacher-oral/core.ts','utf8');

test('both teacher entry points use the same authenticated oral picker',()=>{
 assert.match(portal,/async function openTeacherOral\(\)/);
 assert.match(portal,/sessionStorage\.setItem\('ing_ogr_token',teacherToken\)/);
 assert.match(portal,/if\(action==='oral'\)\{void openTeacherOral\(\);return;\}/);
 assert.doesNotMatch(portal,/if\(action==='oral'\)\{void legacyTool\(/);
 assert.match(portal,/await window\.dmTeacherOral\.open\(\)/);
});
test('oral picker fetches a fresh teacher-scoped roster on every opening',()=>{
 assert.match(oral,/async function open\(\)/);
 assert.match(oral,/const d=await api\('setup'\)/);
 assert.match(oral,/pupils=d\.pupils\.filter\(p=>p\.class_no>=1&&p\.class_no<=8\)/);
 assert.match(server,/p\.teacher_id='eq\.'\+t\.id/);
 assert.match(server,/status:'eq\.approved',role:'eq\.student'/);
});
