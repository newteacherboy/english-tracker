const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('registration immediately offers visible illustrated guide and helpful password rules',()=>{
 const js=read('ingilizce/first-discovery.js'),css=read('ingilizce/first-discovery.css');
 assert(js.includes("dmEmailGuide?.open('signup')"));
 assert(js.includes('Görselli doğrulama rehberini aç'));
 assert(js.includes('sızdırılmış şifreleri kullanma'));
 assert(js.includes('En az 8 karakter'));
 assert(css.includes('.fd-password-rules'));
 assert(css.includes('clamp(14px'));
});
test('profile email field has an easy visual help action',()=>{
 const js=read('ingilizce/kisisel-bilgiler.js');
 const start=js.indexOf('id="kbMail"'),help=js.indexOf('id="kbEmailGuideButton"');
 assert(start>0&&help>start&&help-start<1000);
 assert(js.includes('dmEmailGuide?.open("profile")'));
});
test('10-minute email notices respect verified members and leave placement notices unchanged',()=>{
 const code=read('supabase/functions/diji-api/member-tools-api.ts');
 assert(code.includes("if(kind==='email'&&s.email_verified_at)return json({ok:true,show:false})"));
 assert(code.includes("10*60000"));
 assert(code.includes("kind==='placement'&&records.length>=2"));
 assert(code.includes("kind==='email'?'rolling':week()"));
 assert(read('ingilizce/member-experience.js').includes('if(!status.emailVerified'));
});
test('locked lessons remain in the UI but cannot be launched below required progress',()=>{
 const code=read('ingilizce/school-journey.js');
 assert(code.includes("!s.available?' locked'"));
 assert(code.includes("!s.available?'disabled'"));
});
