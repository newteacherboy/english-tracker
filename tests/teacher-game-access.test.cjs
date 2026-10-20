const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=f=>fs.readFileSync('ingilizce/'+f,'utf8');
test('teacher completes Harf Bahcesi without a student energy debit or leaderboard write',async()=>{
 const dom=new JSDOM('<body><button id="origin">Games</button></body>',{url:'https://diji.test',runScripts:'outside-only'}),w=dom.window;let requests=0;
 const words=['cat','dog','book','pencil','apple','school','door','window','fish','bird','desk','chair'].map((ingilizce,i)=>({ingilizce,turkce:'Anlam '+i,sinif:1,unite:1}));
 Object.assign(w,{aktifOgrenciAdi:'teacher',siniftaOynananOgrenci:null,genelEnerjiKalan:0,apiURL:'/api',genelOyunGirisEngelliMi:()=>false,fetch:async()=>{requests++;throw Error('unexpected teacher write')},genericSinifGuncelle:(n,id,fn)=>fn([1]),sinifGridKisitlamaUygula:(id,fn,choose)=>choose(1),oyunHavuzGetir:()=>words,OC:{aktif:{},kelimeSec:(k,a,n)=>a.slice(0,n),basla(){this.aktif.runId=w.crypto.randomUUID()},puan:()=>0,sure:()=>0,yanlis(){},sonlandir:()=>({dogru:0,yanlis:12,puan:0,sure:1,xp:20,yildiz:0})}});
 w.eval(source('harf-bahcesi.js'));w.harfBahcesiAc();await w.document.querySelector('[data-start]').onclick();
 assert.equal(w.document.querySelectorAll('[data-cell]').length,24);
 for(let i=0;i<12;i++){w.document.querySelector('[data-skip]').click();w.document.querySelector('[data-next]').click();}
 await Promise.resolve();assert.match(w.document.querySelector('.hb-finish').textContent,/Öğretmen denemesi tamamlandı/);assert.equal(requests,0);dom.window.close();
});
test('teacher profile actions route independently without shop click bubbling',()=>{
 const dom=new JSDOM('<body><div id="tab-dunya" class="active"></div><nav id="bottomNavMobile"><button data-ekran="tab-profile-menu"></button></nav></body>',{url:'https://diji.test',runScripts:'outside-only'}),w=dom.window;let switches=0,bubbled=0;
 Object.assign(w,{aktifOgrenciAdi:'teacher',dmHesapDegistirAc:()=>switches++});w.document.addEventListener('click',()=>bubbled++);w.eval(source('bottom-nav.js'));w.dmProfileMenuAc();
 assert.match(w.document.querySelector('#rtProfileBackdrop').textContent,/Öğretmen hesabı/);assert.equal(w.document.querySelector('[data-profile="certificates"]'),null);
 w.document.querySelector('[data-profile="switchAccount"]').click();assert.equal(switches,1);assert.equal(bubbled,0);dom.window.close();
});
test('teacher dialogue answer checking advances locally and handles typed variants',()=>{
 const code=source('learning-companion.js'),start=code.indexOf('function practiceAnswer('),end=code.indexOf('async function openStory',start),vm=require('node:vm'),ctx={};vm.runInNewContext(code.slice(start,end),ctx);
 assert.equal(ctx.practiceAnswer({answers:['please'],answer:'please'},' PLEASE! ',0,0).correct,true);
 assert.equal(ctx.practiceAnswer({answer:'Su'},'Kahve',1,2).correct,false);assert.equal(ctx.practiceAnswer({answer:'Su'},'Su',1,2).cursor,2);
});
