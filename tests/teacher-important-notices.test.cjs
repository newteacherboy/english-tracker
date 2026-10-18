const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('ingilizce/social-safety.js','utf8');
const api=fs.readFileSync('supabase/functions/diji-api/social-safety.mjs','utf8');
const mirror=fs.readFileSync('supabase/functions/medupro-api/social-safety.mjs','utf8');
const migration=fs.readFileSync('supabase/migrations/20261018141000_teacher_student_important_notices.sql','utf8');
test('teacher notices use a private per-student database record',()=>{
 assert.match(migration,/student_id uuid not null references public.students\(id\)/);
 assert.match(migration,/enable row level security/);
 assert.match(migration,/revoke all on public.dm_teacher_student_notices from public,anon,authenticated/);
 assert.match(api,/eq\('student_id',actor\)\.is\('acknowledged_at',null\)/);
 assert.match(api,/eq\('student_id',actor\)\.eq\('id',b.id\)/);
});
test('sending notices requires verified teacher administrator access',()=>{
 assert.match(api,/if\(a\?\.role!=='teacher'\|\|!a.teacher_id\|\|!a.yonetici\)/);
 assert.match(api,/if\(op==='safetyAdminReview'\)/);
 assert.match(api,/rate\('teacher-notice',a.teacher_id,20,3600\)/);
 assert.equal(api,mirror);
});
test('notice UI safely uses textContent, acknowledges server record, and resets on account switch',()=>{
 assert.match(source,/para.textContent=n.message/);
 assert.match(source,/safetyStudentNoticeAck/);
 assert.match(source,/account!==studentToken\(\)\|\|owner!==who\(\)/);
 assert.match(source,/noticeShown='';noticeAccount='';setTimeout\(studentImportantNotice/);
 assert.match(source,/data-student-message/);\n assert.match(source,/safetyStudentNoticeAppeal/);\n assert.doesNotMatch(source,/data-send-notice/);
});
