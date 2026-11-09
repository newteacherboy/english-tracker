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

test('Artı-Eksi, Ödev and Duyuru use exact owned 5/A roster and class ID',async()=>{
 const {JSDOM}=require('jsdom');
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://example.test',runScripts:'outside-only'});
 const w=dom.window,requests=[];
 const teacherToken='teacher-session-at-least-16-characters';
 w.sessionStorage.setItem('ing_ogr_token',teacherToken);
 w.eval("var apiURL = 'https://example.test/diji-api';");
 const classId='11111111-1111-4111-8111-111111111111';
 const students=[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',username:'new_student_a',fullName:'Öğrenci A'},{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',username:'new_student_b',fullName:'Öğrenci B'}];
 w.fetch=async(url,options)=>{
  const req=JSON.parse(options.body);requests.push({url:String(url),headers:options.headers,req});
  if(String(url).includes('/teacher-classes'))return{ok:true,json:async()=>({ok:true,classes:[{id:classId,classNo:5,branch:'A',name:'5A',students}]})};
  return{ok:true,json:async()=>({ok:true,points:13,studentCount:2,classNo:5,branch:'A'})};
 };
 w.eval(tools);
 await w.dmTeacherOwnedTools.performance();
 let buttons=[...w.document.querySelectorAll('[data-owned-score]')];
 assert.equal(buttons.length,4);
 buttons[0].click();
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(requests.find(x=>x.req.islem==='teacherPortalPerformance')?.req.studentId,students[0].id);
 await w.dmTeacherOwnedTools.announcements();
 assert.equal(w.document.querySelectorAll('[name=studentId] option').length,3);
 w.document.querySelector('[name=title]').value='Ödev hatırlatması';
 w.document.querySelector('[name=message]').value='Yarın sınıfta görüşürüz.';
 w.document.querySelector('[data-owned-form]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(requests.find(x=>x.req.islem==='teacherPortalAnnouncement')?.req.classId,classId);
 await w.dmTeacherOwnedTools.homework();
 assert.equal(w.document.querySelectorAll('[data-owned-class] option').length,1);
 w.document.querySelector('[data-owned-form]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(requests.find(x=>x.req.islem==='teacherPortalAssignment')?.req.classId,classId);
 assert(requests.some(x=>String(x.url).includes('/teacher-classes')&&x.headers['x-diji-token']===teacherToken));
 dom.window.close();
});

test('Sınıflarım and Sınıf Raporları live in Quick Actions, not All Tools',()=>{
 const a=workspace.indexOf("const actions=board.querySelector('.dm-midnight-actions')"),b=workspace.indexOf("const extra=board.querySelector('.dm-midnight-extra')",a);
 assert(a>=0&&b>a);
 const quick=workspace.slice(a,b);
 assert.match(quick,/add\(actions,'Sınıflarım'/);
 assert.match(quick,/add\(actions,'Sınıf Raporları'/);
 const allTools=workspace.slice(b,workspace.indexOf("if(sessionStorage.getItem('ing_ogr_yonetici')",b));
 assert.doesNotMatch(allTools,/add\(extra,'Sınıflarım'/);
 assert.doesNotMatch(allTools,/add\(extra,'Sınıf Raporları'/);
 assert.match(quick,/dmTeacherReportsOpen/);
});
test('phone layout keeps teacher home and new actions visible without main scrolling',()=>{
 const css=fs.readFileSync('ingilizce/teacher-workspace.css','utf8');
 assert.match(css,/@media \(max-width:640px\)/);
 assert.match(css,/\.dm-midnight-actions\{\s*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.dm-midnight-shortcuts\{\s*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/overflow:hidden!important/);
 assert.match(workspace,/teacher-workspace\.css\?v=20261110-quick-actions-fit/);
});
