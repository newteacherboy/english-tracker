const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('demo can click password, freeze and deletion; teacher messages remain blocked',async()=>{
  const dom=new JSDOM('<body><button data-profile="coach">Mesaj</button></body>',{url:'https://app.dijimedu.com/ingilizce/',runScripts:'outside-only'});
  const w=dom.window;let changed=0,opened=[];
  w.aktifOgrenciAdi='dijimedu_demo';
  const observers=[],Observer=w.MutationObserver;
  w.MutationObserver=class extends Observer{constructor(callback){super(callback);observers.push(this);}};
  w.sifreDegistirAc=()=>changed++;
  w.eval(fs.readFileSync('ingilizce/account-settings.js','utf8'));
  w.eval(fs.readFileSync('ingilizce/demo-account.js','utf8'));
  w.dmHesapAyarlariAc();
  w.document.addEventListener('click',e=>{const link=e.target.closest('a');if(link){opened.push(link.getAttribute('href'));e.preventDefault();}});
  for(const selector of ['[data-is="sifre"]','a[href="hesap-dondur.html"]','.dm-account-delete']) {
    const button=w.document.querySelector(selector);
    assert.notEqual(button.getAttribute('aria-disabled'),'true');button.click();
  }
  assert.equal(changed,1);assert.deepEqual(opened,['hesap-dondur.html','hesap-sil.html']);
  let messages=0;w.document.querySelector('[data-profile="coach"]').onclick=()=>messages++;
  w.document.querySelector('[data-profile="coach"]').click();assert.equal(messages,0);
  await new Promise(resolve=>setImmediate(resolve));
  for(const observer of observers)observer.disconnect();
  let plans=0;w.DMSatis={planlar:()=>plans++};
  w.document.querySelector('[data-is="paketler"]').click();assert.equal(plans,1);
  dom.window.close();
});
