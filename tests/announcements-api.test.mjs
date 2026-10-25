import {test} from 'node:test';import assert from 'node:assert/strict';
import {announcementsAPI,announcementTargets} from '../supabase/functions/diji-api/announcements-api.mjs';
const admins=new Set(['admin']),student={role:'student',student:{id:'s',username:'Ada',class_no:5,branch:'A',teacher_id:'t'}};
const row=(extra={})=>({id:'notice',active:true,teacher_id:'admin',target_type:'all',target_list:[],title:'Başlık',message:'Metin',...extra});
test('portal-wide admin notices reach teachers; class, selected and ordinary teacher notices do not',()=>{
 for(const type of ['all','herkes','tumogrenciler'])assert(announcementTargets(row({target_type:type}),{role:'teacher'},admins));
 for(const extra of [{teacher_id:'t'},{target_type:'sinif',target_list:['5']},{target_type:'ogretmen'},{active:false}])assert(!announcementTargets(row(extra),{role:'teacher'},admins));
 assert(announcementTargets(row({teacher_id:null}),{role:'teacher'},admins));
});
test('student recipients retain teacher, class, branch and selected-name scope',()=>{
 assert(announcementTargets(row({teacher_id:'t'}),student,admins));assert(!announcementTargets(row({teacher_id:'other'}),student,admins));
 for(const [type,list] of [['sinif',['5']],['sube',['5|a']],['secili',['ADA']]])assert(announcementTargets(row({target_type:type,target_list:list}),student,admins));
 assert(!announcementTargets(row({target_type:'sinif',target_list:['6']}),student,admins));
});
function database(tables,fail){const writes=[];return {writes,from(table){let filters=[],single=false,insert;
 const q={select(){return q},eq(k,v){filters.push(x=>x[k]===v);return q},order(){return q},limit(){return q},maybeSingle(){single=true;return q},insert(v){insert=v;return q},upsert(v){insert=v;return q},then(resolve){if(insert){writes.push({table,value:insert});return Promise.resolve({error:fail===table?{}:null}).then(resolve);}const rows=(tables[table]||[]).filter(x=>filters.every(f=>f(x)));return Promise.resolve({data:single?rows[0]||null:rows,error:fail===table?{}:null}).then(resolve);}};return q;}};}
const json=(data,status=200)=>({data,status});
const fixture=(extra={})=>({announcements:[row(),row({id:'class',target_type:'sinif',target_list:['5']})],teachers:[{id:'admin',is_admin:true,active:true}],students:[student.student],...extra});
test('teacher inbox and acknowledgement are scoped to real teacher and cannot acknowledge class notice',async()=>{
 const db=database(fixture({audit_logs:[{actor_role:'teacher',actor_id:'other',operation:'announcementRead',target:'notice'}]})),api=announcementsAPI(db,json),a={role:'teacher',teacher_id:'owner'};
 let r=await api.handle('announcementInbox',{},a,'POST');assert.equal(r.status,200);assert.deepEqual(r.data.liste.map(x=>x.id),['notice']);
 r=await api.handle('announcementRead',{id:'class'},a,'POST');assert.equal(r.status,404);assert.equal(db.writes.length,0);
 r=await api.handle('announcementRead',{id:'notice',teacher_id:'other',student_id:'s'},a,'POST');assert.equal(r.status,200);assert.equal(db.writes[0].table,'audit_logs');assert.equal(db.writes[0].value.actor_id,'owner');
});
test('student read uses authoritative id, and database errors never mark a notice as read',async()=>{
 const db=database(fixture()),api=announcementsAPI(db,json),a={role:'student',student_id:'s'};
 assert.equal((await api.handle('announcementRead',{id:'class',student_id:'other'},a,'POST')).status,200);
 assert.equal(db.writes[0].value.student_id,'s');
 const failed=database(fixture(),'announcement_reads');assert.equal((await announcementsAPI(failed,json).handle('announcementInbox',{},a,'POST')).status,503);
});
test('unauthenticated requests, classroom participants and GET writes are rejected',async()=>{
 const api=announcementsAPI(database(fixture()),json);
 assert.equal((await api.handle('announcementInbox',{},null,'POST')).status,401);
 assert.equal((await api.handle('announcementInbox',{}, {role:'student',student_id:'s',teacher_portal_access_id:'grant'},'POST')).status,403);
 assert.equal((await api.handle('announcementRead',{}, {role:'teacher',teacher_id:'t'},'GET')).status,405);
});
