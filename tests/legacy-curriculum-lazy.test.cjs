const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('ingilizce/story-path.js','utf8');
function fixture(themed=false){
 const dom=new JSDOM('<!doctype html><body></body>',{url:'https://app.test/',runScripts:'outside-only'}),w=dom.window,downloads=[];
 w.aktifOgrenciAdi='student';w.apiURL='/api';w.fetch=async()=>({ok:true,json:async()=>({ok:true,progress:[],v2Enabled:false})});
 if(themed)w.dmThematicLearning={overview:()=>42};
 const append=w.document.head.append.bind(w.document.head);
 w.document.head.append=function(node){append(node);if(node.tagName==='SCRIPT')downloads.push(node);};
 w.eval(source);
 return {w,downloads,close:()=>w.close(),finish(){w.eval(fs.readFileSync('ingilizce/story-curriculum.js','utf8'));downloads.at(-1).onload();}};
}
test('current thematic route does not fetch or parse the legacy bank',()=>{
 const f=fixture(true);try{assert.equal(f.w.dmStoryPath,f.w.dmThematicLearning);assert.equal(f.downloads.length,0);assert.equal(f.w.DMStoryCurriculum,undefined);}finally{f.close();}
 const html=fs.readFileSync('ingilizce/index.html','utf8');assert(!/<script[^>]+src="story-curriculum\.js/.test(html));
});
test('legacy overview loads the bank once on demand and concurrent readers share it',async()=>{
 const f=fixture();try{
  assert.equal(f.downloads.length,0);const a=f.w.dmStoryPath.overview(),b=f.w.dmStoryPath.overview();
  assert.equal(f.downloads.length,1);f.finish();const [x,y]=await Promise.all([a,b]);assert.equal(x.total,40);assert.equal(y.total,40);
  await f.w.dmStoryPath.overview();assert.equal(f.downloads.length,1);
 }finally{f.close();}
});
test('a failed legacy download is removed and an explicit retry succeeds',async()=>{
 const f=fixture();try{
  const task=f.w.dmStoryPath.overview();const failed=f.downloads[0];failed.onerror();await assert.rejects(task,/yüklenemedi/);assert(!failed.isConnected);
  const retry=f.w.dmStoryPath.overview();assert.equal(f.downloads.length,2);f.finish();assert.equal((await retry).total,40);
 }finally{f.close();}
});
