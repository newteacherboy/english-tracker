const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('ingilizce/index.html','utf8');
function fixture(){
 const dom=new JSDOM('<body><div id="dcScreenLevels"><div class="dc-hero"><div class="dc-voice-toggle"><button id="dcSesUS"></button><button id="dcSesUK"></button></div></div></div></body>',{url:'https://app.test',runScripts:'outside-only'}),w=dom.window;
 Object.assign(w,{$:id=>w.document.getElementById(id),liste:()=>[],konular:()=>[],yildiz:()=>0,bitti:()=>false,yuzde:()=>0,SEV:[['A1','Başlangıç'],['A2','Temel'],['B1','Orta'],['B2','İleri']],ADA_YER:[[26,20],[74,40],[28,62],[70,84]],ADA_SEKIL:['','','',''],dcVoiceSec(){},dcSeviyeSec(){},klasikDugmesi(){},dcSesTercihi:'us',dcTumKonularCache:[{konuAdi:'Example'}],dcYuklemePromise:null,aktifOgrenciAdi:'Önizleme',dmTeacherPortalMode:true});
 w.kap=(_screen,id)=>{let el=w.document.getElementById(id);if(!el){el=w.document.createElement('div');el.id=id;w.document.getElementById('dcScreenLevels').append(el)}return el};
 const start=html.indexOf('  function haritaCiz() {'),end=html.indexOf('  /* ---------- 2) Kategoriler:',start);
 w.eval(html.slice(start,end));
 const a=html.indexOf('       function dersCalisBaslat() {'),b=html.indexOf('        function dcEkranGoster(',a);w.eval(html.slice(a,b));
 const c=html.indexOf('        function dcSesSecimiYap(tip) {'),d=html.indexOf('        function dcVoiceSec()',c);w.eval(html.slice(c,d));
 return {w,dom};
}
test('code teacher can reopen Study after repeated map redraws without losing accent controls',()=>{
 const {w,dom}=fixture(),us=w.document.getElementById('dcSesUS'),uk=w.document.getElementById('dcSesUK');
 try{for(let i=0;i<5;i++){w.haritaCiz();w.dersCalisBaslat();assert.equal(w.document.getElementById('dcSesUS'),us);assert.equal(w.document.getElementById('dcSesUK'),uk);assert.equal(w.document.querySelectorAll('.dc-voice-toggle').length,1);w.dcSesSecimiYap(i%2?'uk':'us');}}finally{dom.window.close()}
});
test('switching between classic view and map retains live accent buttons and saved preference',()=>{
 const {w,dom}=fixture(),uk=w.document.getElementById('dcSesUK');
 try{w.haritaCiz();w.document.getElementById('maKlasik').click();assert(w.document.querySelector('.dc-hero').contains(uk));w.dcSesSecimiYap('uk');w.haritaCiz();w.haritaCiz();w.dersCalisBaslat();assert.equal(w.document.getElementById('dcSesUK'),uk);assert(uk.classList.contains('active'));assert.equal(w.localStorage.getItem('dc_ses_tercihi'),'uk');}finally{dom.window.close()}
});
