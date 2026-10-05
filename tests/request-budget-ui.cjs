const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
const browser=await chromium.launch({executablePath:'/tmp/diji-browser/chromium',args:['--no-sandbox','--no-zygote','--single-process'],env:{...process.env,LD_LIBRARY_PATH:'/tmp/diji-browser/lib'}}),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],calls=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
const API='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
const answer=op=>op==='seviyeDurumu'?{ok:true,level:1,feed:false,lessons:{}}:op==='yayinOzellikleri'?{ok:true,flags:{},admin:false}:op==='kelimelerGetir'?[{sinif:3,unite:1,ingilizce:'cat',turkce:'kedi'}]:op==='bildirimlerim'?{ok:true,liste:[]}:[];
await page.route('**/*',async route=>{
 const u=new URL(route.request().url());
 if(u.hostname==='nxfqlutulxqzqgwewssd.supabase.co'){
 let b;try{b=route.request().postDataJSON();}catch{}const op=b?.islem||u.searchParams.get('islem')||'KOK';calls.push({op,b});
 const d=op==='okumaGrubu'?{ok:true,results:b.istekler.map(x=>({status:200,body:JSON.stringify(answer(x.islem))}))}:answer(op);
 return route.fulfill({json:d,headers:op==='kelimelerGetir'?{'X-Diji-Content-Version':'fixture'}:{}});
 }
 if(u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('supabase'))return route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})}'});
 if(u.hostname==='budget.test'){const file=path.join(__dirname,'../ingilizce',u.pathname.replace(/^\/ingilizce\//,'')||'index.html');if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});}
 return route.fulfill({body:'',contentType:'text/plain'});
});
await page.goto('https://budget.test/ingilizce/');await page.waitForTimeout(700);
assert(await page.locator('#login-container').isVisible());assert.equal(await page.evaluate(()=>typeof girisYap),'function');assert(await page.locator('#dmGuestEntry').count());
await page.evaluate(()=>dmRequestBudget.clear());const start=calls.length;
const results=await page.evaluate(async API=>{const req=op=>fetch(API,{method:'POST',body:JSON.stringify({islem:op})}).then(r=>r.json());return Promise.all([req('seviyeDurumu'),req('seviyeDurumu'),req('yayinOzellikleri')]);},API);
assert.equal(results[0].level,1);assert.equal(results[1].level,1);assert.deepEqual(results[2].flags,{});assert.equal(calls.slice(start).filter(x=>x.op==='okumaGrubu').length,1);assert.equal(calls.slice(start).filter(x=>x.op==='seviyeDurumu'||x.op==='yayinOzellikleri').length,0);
const beforeWords=calls.filter(x=>x.op==='kelimelerGetir').length;
const words=await page.evaluate(async API=>{const a=await(await fetch(API+'?islem=kelimelerGetir')).json();dmRequestBudget.clear();const b=await(await fetch(API+'?islem=kelimelerGetir')).json();return {a,b};},API);
assert.deepEqual(words.a,words.b);assert(calls.filter(x=>x.op==='kelimelerGetir').length-beforeWords<=1);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS full portal login/guest entry, GET/POST wrapper integration, 3 reads -> 1 invocation, persistent content and zero page errors');
})().catch(e=>{console.error(e);process.exit(1)});
