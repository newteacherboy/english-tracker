const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const read=f=>fs.readFileSync('ingilizce/'+f,'utf8');
test('header normalizes stale and excessive energy responses to the fixed capacity',()=>{
 const html=read('index.html'),source=html.slice(html.indexOf('function headerEnerjiGoster('),html.indexOf('function ozellikGorunurlukAyarla('));
 const dom=new JSDOM('<div id="headerEnerjiNum"></div>',{runScripts:'outside-only'}),w=dom.window;w.eval(source);for(const input of [40,30,25,24,0,-5]){w.headerEnerjiGoster(input,30);assert.equal(w.genelEnerjiMax,25);assert.equal(w.genelEnerjiKalan,Math.max(0,Math.min(input,25)));}w.close();
});
test('privacy opens inside settings and its back button preserves the original settings panel',()=>{
 const dom=new JSDOM('<button id="before">Ayarlar</button>',{url:'https://app.test/',runScripts:'outside-only'}),w=dom.window;w.eval(read('account-settings.js'));w.dmHesapAyarlariAc();const settings=w.document.getElementById('dmAccountSettings');settings.querySelector('a[href="gizlilik.html"]').click();assert(w.document.getElementById('dmAccountPrivacy').querySelector('iframe'));w.document.querySelector('#dmAccountPrivacy button').click();assert.equal(w.document.getElementById('dmAccountPrivacy'),null);assert.equal(w.document.getElementById('dmAccountSettings'),settings);w.close();
});
test('closing help invokes the pending profile return after hiding the help screen',()=>{
 const html=read('index.html'),source=html.slice(html.indexOf('function yardimKapat()'),html.indexOf('// ===== SINIF OYUN MODU =====',html.indexOf('function yardimKapat()')));let returned=0;
 const ctx={document:{getElementById:()=>({style:{}})},window:{dmProfileDismiss:()=>returned++}};vm.runInNewContext(source+';yardimKapat();',ctx);assert.equal(returned,1);
});
test('a confirmed time chest appears alongside route chests even below the route chest unlock level',async()=>{
 const dom=new JSDOM('<div></div>',{url:'https://app.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.eval('var aktifOgrenciAdi="Ada",yo={totalXp:0},apiURL="/api";function yoHazirMi(){return true;}');w.setInterval=()=>0;
 w.DijiProgressRules={progress:()=>({level:1}),migrate:x=>x};w.DijiProgressionCatalog={gates:{sandik:5},functions:{},features:[],chests:[{id:'bronze',name:'Bronz',level:5,gold:20}],quota:()=>0};
 let ids=[1],opened=null;w.dmActiveTime={flush:async()=>{},unclaimed:()=>ids,openChest:i=>opened=i};w.fetch=async()=>({ok:true,json:async()=>({ok:true,level:1,chests:{bronze:'locked'}})});
 w.eval(read('progression-ui.js'));await w.dmProgression.chests();const panel=w.document.getElementById('dmChestPanel');assert(panel);const b=panel.querySelector('[data-time-chest-list] button');assert.equal(b.disabled,false);b.click();assert.equal(opened,1);ids=[];w.document.dispatchEvent(new w.Event('dm:time'));assert.equal(panel.querySelectorAll('[data-time-chest-list] button').length,0);w.close();
});
