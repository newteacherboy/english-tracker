const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const workspace=fs.readFileSync('ingilizce/teacher-workspace.js','utf8');
const tools=fs.readFileSync('ingilizce/teacher-owned-tools.js','utf8');
const portal=fs.readFileSync('ingilizce/teacher-portal.js','utf8');
const server=fs.readFileSync('supabase/functions/diji-api/teacher-portal.mjs','utf8');
test('all teacher workspaces launch own-class scoped tools',()=>{
 for(const key of ['performance','homework','announcements','reports'])assert(workspace.includes("openOwnedTool('"+key+"')"),key);
 assert(workspace.includes("add(shortcuts,'Raporlar'"));
 assert(portal.includes("data-dash=\"reports\""));
});
test('teacher tool class sources are authenticated teacher-classes only',()=>{
 assert(tools.includes("action:'list'"));
 assert(tools.includes("'x-diji-token':t"));
 assert(tools.includes('d.classes'));
 for(const op of ['teacherPortalPerformance','teacherPortalAssignment','teacherPortalAnnouncement','teacherPortalClassAnalytics'])
  assert(tools.includes(op),op);
});
test('server verifies active class ownership, strict branch and student scope',()=>{
 assert(server.includes("eq('teacher_id',r.teacher_id).is('archived_at',null)"));
 assert(server.includes("if(!c.data)return fail('Bu sınıf sana ait değil"));
 assert(server.includes("if(studentId&&!recipients.some(x=>x.id===studentId))"));
 assert(server.includes("target_type:pupil?'secili':'sube'"));
 assert(server.includes("kind:type,title,payload"));
 assert(server.includes("'teacherPortalAssignment'"));
});
