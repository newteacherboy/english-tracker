const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {stripTypeScriptTypes}=require('node:module');
const file=fs.readFileSync('supabase/functions/diji-api/word-bank-rotation.ts','utf8');
const js=stripTypeScriptTypes(file).replace('export async function','async function')+'\nmodule.exports={selectWordBankRound};';
const context={module:{exports:{}},Map,Promise,Math};vm.runInNewContext(js,context);
const {selectWordBankRound}=context.module.exports;
const words=Array.from({length:36},(_,i)=>({en:'word'+i,tr:'kelime'+i}));
function db(history){return {from(table){return {select(){return this},eq(){return this},order(){return this},limit(){return Promise.resolve({data:history[table]||[],error:null})}}}}}
test('12 unique questions and no repeats before unit exhausted',async()=>{const history={papi_wheel_sessions:[],papi_meteor_sessions:[]};const client=db(history);const rounds=[];for(let i=0;i<3;i++){const deck=await selectWordBankRound(client,'s:test',5,1,words,12);assert.equal(deck.length,12);assert.equal(new Set(deck.map(x=>x.en)).size,12);rounds.push(...deck.map(x=>x.en));history.papi_wheel_sessions.unshift({deck:deck.map(x=>({en:x.en}))});}assert.equal(new Set(rounds).size,36);});
test('both wheel and meteor histories are included',async()=>{const history={papi_wheel_sessions:[{deck:words.slice(0,12)}],papi_meteor_sessions:[{deck:words.slice(12,24).map(x=>({key:x.en,word:x.tr,answer:x.en,direction:'tr-en'}))}]};const deck=await selectWordBankRound(db(history),'s:test',5,1,words,12);assert.equal(deck.length,12);assert(deck.every(x=>Number(x.en.slice(4))>=24));});
test('bad history query fails closed',async()=>{const client={from(){return {select(){return this},eq(){return this},order(){return this},limit(){return Promise.resolve({data:null,error:new Error('db failure')})}}}};await assert.rejects(()=>selectWordBankRound(client,'s:test',5,1,words,12));});
