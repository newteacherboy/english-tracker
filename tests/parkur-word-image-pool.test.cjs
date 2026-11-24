const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../ingilizce/route-questions.js'),'utf8');
function entry(id,en,tr){return {en,tr,path:'512/'+id+'.webp',small_path:'256/'+id+'.webp'}}
function setup(fetch){const window={fetch};vm.runInNewContext(code,{window});return window.DMWordImagePool}
test('Teaching visual pool matches both languages, never English alone, and fetches lazily once',async()=>{
 let calls=0;const p=setup(async()=>{calls++;return {ok:true,json:async()=>({'0147':entry('0147','apple','elma'),'0222':entry('0222','right','sağ'),'0223':entry('0223','right','doğru')})}});
 assert.equal(calls,0);
 const result=await Promise.all([p.resolve(' Apple ','ELMA'),p.resolve('right','sağ'),p.resolve('right','doğru',256),p.resolve('right','yanlış'),p.resolve('apple','')]);
 assert.ok(result[0].endsWith('/512/0147.webp'));assert.ok(result[1].endsWith('/512/0222.webp'));assert.ok(result[2].endsWith('/256/0223.webp'));assert.equal(result[3],null);assert.equal(result[4],null);assert.equal(calls,1);
});
test('Reject conflicting pairs and noncanonical paths; distinguish punctuation',()=>{
 const p=setup();const index=p.index({'0001':entry('0001','cat','kedi'),'0002':entry('0002','Cat','kedi'),'0003':{...entry('0003','dog','köpek'),path:'https://other.example/x'},'0004':entry('0004','Can I?','Olur mu?')});
 assert.equal(index.size,1);assert.equal(index.get(p.key('Can I?','Olur mu?')),'0004');assert.equal(index.get(p.key('Can I','Olur mu?')),undefined);
});
test('Manifest network failure does not break teaching and allows retry',async()=>{
 let calls=0;const p=setup(async()=>{if(++calls===1)throw Error('offline');return {ok:true,json:async()=>({'0147':entry('0147','apple','elma')})}});
 assert.equal(await p.resolve('apple','elma'),null);assert.ok((await p.resolve('apple','elma')).endsWith('0147.webp'));
});

test('Full bundled manifest resolves reported 8th grade cards and Please punctuation',async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../ingilizce/parkur-word-pool-v1.json'),'utf8'));
 assert.equal(Object.keys(manifest).length,2997);
 const p=setup(async url=>{assert.equal(url,'parkur-word-pool-v1.json');return {ok:true,json:async()=>manifest}});
 for(const id of ['0869','0946','0953','0963','0978']){
  const v=manifest[id];assert.ok((await p.resolve(v.en.replace(/\\.$/,''),v.tr.replace(/\\.$/,''))).endsWith(id+'.webp'));
 }
 assert.ok((await p.resolve('please','lütfen')).endsWith('0978.webp'));
 assert.ok((await p.resolve('four','dört')).endsWith('1694.webp'));
 assert.ok((await p.resolve('zucchini','kabak')).endsWith('3028.webp'));
});
test('Punctuation fallback rejects ambiguous bilingual candidates',async()=>{
 const p=setup(async()=>({ok:true,json:async()=>({'0001':entry('0001','Please.','Lütfen.'),'0002':entry('0002','Please!','Lütfen!')})}));
 assert.equal(await p.resolve('please','lütfen'),null);
});

test('Reviewed alternate translations do not leak across word senses',async()=>{const m=JSON.parse(fs.readFileSync(path.join(__dirname,'../ingilizce/parkur-word-pool-v1.json'),'utf8'));const p=setup(async()=>({ok:true,json:async()=>m}));for(const [en,tr,id] of [['classroom','sınıf','0041'],['socks','çoraplar','0196'],['bye','hoşça kal','0001'],['dislike','hoşlanmamak','0266']])assert.ok((await p.resolve(en,tr)).endsWith(id+'.webp'));for(const [en,tr] of [['orange','turuncu'],['book','rezervasyon yapmak'],['cool','serin'],['medicine','tıp']])assert.equal(await p.resolve(en,tr),null);});

test('Second audit: reviewed variants resolve and different senses remain blocked',async()=>{const m=JSON.parse(fs.readFileSync(path.join(__dirname,'../ingilizce/parkur-word-pool-v1.json'),'utf8'));const p=setup(async()=>({ok:true,json:async()=>m}));for(const [en,tr,id] of [['Good night!','İyi geceler!','0033'],['hat','şapka / bere','0415'],['desk','çalışma masası','0014'],['take','almak','1082'],['any','herhangi','0223'],['volunteer','gönüllü olmak','1244']])assert.ok((await p.resolve(en,tr)).endsWith(id+'.webp'));for(const [en,tr] of [['orange','turuncu'],['book','rezervasyon yapmak'],['connect','bağlamak'],['plant','dikmek'],['medicine','tıp']])assert.equal(await p.resolve(en,tr),null);});
