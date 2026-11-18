const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('league ranking popup is retired and Friends no longer loads it',()=>{
 const friends=read('ingilizce/friends-ui.js');
 assert(!fs.existsSync('ingilizce/league-momentum.js'));
 assert(!friends.includes('league-momentum.js'));
 assert(friends.includes("new Event('dm:friends-open')"));
});
test('verification reminder belongs to Games and uses safe visible modal checks',()=>{
 const member=read('ingilizce/member-experience.js');
 const server=read('supabase/functions/diji-api/member-tools-api.ts');
 assert(member.includes('[data-ekran="tab-aktiviteler"]'));
 assert(member.includes('emailNextAt=Date.now()+3600000'));
 assert(member.includes('getComputedStyle(el)'));
 assert(member.includes('status.emailVerified'));
 assert(server.includes("kind==='email'?10*60000:30*60000"));
 assert(server.includes('Math.floor(Date.now()/600000)'));
});
test('route cards distinguish learners without losing progress',()=>{
 const code=read('ingilizce/member-experience.js');
 assert(code.includes('1–8. SINIF ÖĞRENCİLERİ İÇİN'));
 assert(code.includes('KENDİM İÇİN İNGİLİZCE ÖĞRENMEK İSTİYORUM'));
 assert(code.includes('Her parkurun ilerlemesi ayrı korunur'));
});
test('teacher hub exposes inventory without claiming live writable settings',()=>{
 const code=read('ingilizce/teacher-workspace.js');
 assert(code.includes('dmNoticeMailCenterButton'));
 assert(code.includes('Duyuru ve Mail Yönetim Merkezi'));
 assert(code.includes("api('communicationRulesList')"));
});

test('central notice policy is fetched for students and checked before the email popup',()=>{
 const backend=read('supabase/functions/diji-api/member-tools-api.ts');
 const member=read('ingilizce/member-experience.js');
 assert(backend.includes("op==='communicationNoticePolicy'"));
 assert(backend.includes("a.role!=='student'"));
 assert(member.includes("api('communicationNoticePolicy')"));
 assert(member.includes('dmCommunicationNoticeRules?.email_verification?.enabled===false'));
});
