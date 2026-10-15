const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
const ts=fs.readFileSync(__dirname+'/../supabase/functions/diji-api/index.ts','utf8');
const source=stripTypeScriptTypes('async function extracted(){'+ts.slice(ts.indexOf('  if (op === "enerjiDegistir")'),ts.indexOf('// ============================================================ LİDERLİK'))+'}',{mode:'transform'});
const run=new(Object.getPrototypeOf(async function(){}).constructor)('op','body','a','supabase','requireStudent','hedefOgrenci','enerjiYenile','release','json','bulunamadi','num','bool','ENERJI_TAVAN','dolumBilgi',source.slice(source.indexOf('{')+1,source.lastIndexOf('}')));
async function request({error=null,deny=null}={}){
 const calls=[];const reward={ok:true,claimed:true,eklenen:5,enerjiKalan:15,day:'2026-10-15'};
 const db={async rpc(name,args){calls.push({name,args});return {data:reward,error}},from(){throw Error('daily claim must not use non-atomic updates')}};
 const result=await run('enerjiDegistir',{ogrenci:'requested-name',sebep:'gunluk',fark:999},{role:'student'},db,async()=>deny,async()=>({id:'verified-student'}),async()=>{throw Error('regeneration must stay inside transaction')},{},(data,status=200)=>({data,status}),()=>null,v=>Number(v)||0,Boolean,30,()=>({}));
 return {calls,result,reward};
}
test('daily claim delegates authenticated student and amount to atomic server operation',async()=>{const f=await request();assert.deepEqual(f.calls,[{name:'dm_daily_energy_bonus',args:{actor:'verified-student'}}]);assert.equal(f.result.data,f.reward);});
test('failed atomic claim returns retryable failure without fallback credit',async()=>{const f=await request({error:{message:'test database unavailable'}});assert.equal(f.result.status,503);assert.equal(f.result.data.ok,false);});
test('authorization failure cannot invoke claim',async()=>{const f=await request({deny:{status:403}});assert.equal(f.result.status,403);assert.equal(f.calls.length,0);});
test('daily popup requires confirmed new claim and caches server day',()=>{const html=fs.readFileSync(__dirname+'/../ingilizce/index.html','utf8');assert.match(html,/localStorage\.setItem\(key,d\.day\|\|bugun\)/);assert.match(html,/d\.claimed===true&&d\.eklenen>0/);assert.match(ts,/key\.startsWith\('energy_daily:'\)/);});
