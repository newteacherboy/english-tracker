const fs=require('node:fs'),vm=require('node:vm'),{test}=require('node:test'),assert=require('node:assert/strict');
const source=fs.readFileSync('ingilizce/papi-onboarding.js','utf8');
test('retired tour opens only the new route choice and has no preview or exercise lock',()=>{
 let calls=0;const window={dmMemberExperience:{chooseRoute(){calls++}}},document={body:{classList:{remove(){}}}};
 vm.runInNewContext(source,{window,document});assert.equal(window.turBitti('ana'),true);assert.equal(window.turAcikMi(),false);assert.equal(window.dmPapiTour.preview(),false);assert.equal(window.dmPapiTour.active(),false);window.uygulamaTuru();assert.equal(calls,1);window.turBaslat('ana',true);assert.equal(calls,2);
});
