const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('league refreshes when Friends opens, without login polling',()=>{
 const league=read('ingilizce/league-momentum.js');
 const friends=read('ingilizce/friends-ui.js');
 assert(league.includes("addEventListener('dm:friends-open'"));
 assert(friends.includes("new Event('dm:friends-open')"));
 assert(!league.includes("setInterval(()=>{displayPending();void check(false);},90000)"));
 assert(!league.includes("setTimeout(()=>check(true),3500)"));
});
test('verification reminder belongs to Games and uses safe visible modal checks',()=>{
 const member=read('ingilizce/member-experience.js');
 const server=read('supabase/functions/diji-api/member-tools-api.ts');
 assert(member.includes('[data-ekran="tab-aktiviteler"]'));
 assert(member.includes('emailNextAt=Date.now()+600000'));
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

test('central notice policy is fetched for students and checked before league or email popup',()=>{
 const backend=read('supabase/functions/diji-api/member-tools-api.ts');
 const league=read('ingilizce/league-momentum.js');
 const member=read('ingilizce/member-experience.js');
 assert(backend.includes("op==='communicationNoticePolicy'"));
 assert(backend.includes("a.role!=='student'"));
 assert(league.includes('dmCommunicationNoticeRules?.league_momentum?.enabled===false'));
 assert(member.includes("api('communicationNoticePolicy')"));
 assert(member.includes('dmCommunicationNoticeRules?.email_verification?.enabled===false'));
});
