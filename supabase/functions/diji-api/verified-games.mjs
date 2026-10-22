// Authoritative grading: only bank-backed tasks are persisted, no client correctness flags.
import {loadStartPath} from './start-path-access.mjs';
import {schoolStopProblem} from './start-path.mjs';
export const games=new Set(['ky','jp','bosluk','hafiza','yagmur','asmaca','kelimebul','eslestirme','tren','harfbahcesi','kp','dikte','cumle','ba']);
export const norm=v=>String(v??'').normalize('NFKC').toLocaleLowerCase('en').replace(/[’‘`]/g,"'").replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const key=v=>String(v??'').trim().toLocaleLowerCase('en');
export const types=['teach','hatirla','soyle','dinleSec','eslestir','eksik','lab','wordOrder','patternOrder','patternComplete','patternListen','patternTranslate'];
export function compile(game,words){
 if(game!=='ba')return words.map(w=>({...w,kind:['ky','jp','kp'].includes(game)?'either':['hafiza','eslestirme','yagmur'].includes(game)?'tr':'en'}));
 return types.map((kind,i)=>{
  const w=words[i%words.length],phrase=words.find(x=>norm(x.en).split(' ').length>1&&(' '+norm(x.en)+' ').includes(' '+norm(w.en)+' '))||w;
  const expected=kind==='lab'?w.tr:kind==='patternComplete'?phrase.en.trim().split(/\s+/).at(-1):['wordOrder','patternOrder','patternListen','patternTranslate'].includes(kind)?phrase.en:w.en;
  return {...w,kind,expected,pairs:kind==='eslestir'?words.filter((w,j)=>words.findIndex(x=>norm(x.tr)===norm(w.tr))===j):undefined};
 });
}
export function grade(task,answer,game){
 if(answer===null)return {valid:true,correct:false,complete:true}; // explicit skip
 if(task.kind==='teach')return {valid:answer===true,correct:answer===true,complete:true};
 if(answer&&typeof answer==='object'&&!Array.isArray(answer)&&typeof answer.letter==='string'&&answer.letter.length===1){
  const text=String(task.en).toLowerCase(),letter=answer.letter.toLowerCase();
  const correct=game==='asmaca'?text.includes(letter):Number.isInteger(answer.index)&&text[answer.index]===letter;
  return {valid:true,correct,complete:game==='ba'};
 }
 if(task.kind==='eslestir'){
  const valid=Array.isArray(answer)&&answer.length===task.pairs.length&&answer.every(x=>x&&typeof x.en==='string'&&typeof x.tr==='string');
  return {valid,complete:true,correct:valid&&new Set(answer.map(x=>norm(x.en))).size===task.pairs.length&&task.pairs.every(p=>answer.some(x=>norm(x.en)===norm(p.en)&&norm(x.tr)===norm(p.tr)))};
 }
 if(typeof answer!=='string'||answer.length>1000)return {valid:false,correct:false,complete:false};
 // Konuşma sorusunu mikrofon yerine seçenekle geçmek ilerletir ama doğru sayılmaz (ödül ve kombo yok).
 if(task.kind==='soyle'&&answer.startsWith('~yardim~'))return {valid:true,correct:false,complete:true,assisted:true};
 const expected=task.expected||(task.kind==='tr'?task.tr:task.en);
 const candidates=game==='kp'||task.kind==='soyle'?answer.split('|'):[answer];
 if(candidates.length>3)return {valid:false,correct:false,complete:false};
 const correct=candidates.some(x=>norm(x)===norm(expected)||task.kind==='either'&&norm(x)===norm(task.tr));
 return {valid:true,complete:correct||game==='ba'||['ky','yagmur','dikte','cumle'].includes(game),correct};
}
export function verifiedGamesAPI(db,json){
 const fail=(message,status=409)=>json({ok:false,mesaj:message},status);
 async function required(){const r=await db.rpc('dm_verified_required');return !!r.error||r.data!==false;}
 return {required,async handle(op,body,a,method){
  if(!['verifiedGameStart','verifiedGameAnswer','verifiedGameStatus'].includes(op))return null;
  if(method!=='POST')return fail('POST gerekli.',405);
  if(a?.role!=='student'||!a.student_id)return fail('Öğrenci oturumu gerekli.',401);
  const run=String(body.runId||'');if(!/^[a-zA-Z0-9_-]{16,100}$/.test(run))return fail('Geçersiz oyun oturumu.',400);
  if(op==='verifiedGameStart'){
   const game=String(body.game||''),classNo=Number(body.classNo),units=Array.isArray(body.units)?[...new Set(body.units.map(Number))].sort((a,b)=>a-b):[];
   if(!games.has(game)||!Number.isInteger(classNo)||classNo<1||classNo>8||!units.length||units.length>20||units.some(u=>!Number.isInteger(u)||u<1||u>100))return fail('Geçersiz oyun kapsamı.',400);
   const code=({ky:'oyun_kelime',jp:'oyun_jeopardy',kp:'kelime_modu',ba:'parkur'})[game]||'oyun_'+game;
   const ctx=await db.rpc('dm_progress_context',{actor:a.student_id});if(ctx.error)return fail('Seviye doğrulanamadı.',503);
   const C=globalThis.DijiProgressionCatalog;if(!C?.gates[code]||ctx.data.level<C.gates[code])return fail('Bu oyun henüz açılmadı.',403);
   let bankQuery=db.from('word_bank').select('english,turkish,class_no,unit_no').eq('active',true);
   bankQuery=game==='kp'?bankQuery.in('class_no',[1,2,3,4,5,6,7,8]):bankQuery.eq('class_no',classNo);
   const bank=await bankQuery.in('unit_no',units).limit(5000);
   if(bank.error)return fail('Kelime havuzu yüklenemedi.',503);
   const available=(bank.data||[]).filter(w=>w.english?.trim()&&w.turkish?.trim()).map(w=>({en:w.english.trim(),tr:w.turkish.trim()}));
   let words=[],stop=Number(body.stopNo)||0;
   if(game==='ba'){
    const door=ctx.data.units.findIndex(row=>row.includes(stop)),unit=Math.floor((stop-200000)%10000/100),part=stop%100-51;
    if(door<0||classNo!==Math.floor((stop-200000)/10000)||units.length!==1||units[0]!==unit||part<0||part>48)return fail('Geçersiz parkur durağı.',403);
    const problem=schoolStopProblem(await loadStartPath(db,a.student_id,ctx.data),ctx.data,stop);if(problem)return fail(problem,403);
    const baseWords=[...new Map(available.map(w=>[key(w.en),w])).values()].sort((a,b)=>a.en.localeCompare(b.en,'en')),baseCount=Math.ceil(baseWords.length/4);
    if(part<baseCount)words=baseWords.slice(part*4,part*4+4);
    else if([1,3,7,8].includes(classNo)&&part<baseCount*2){
      const all=await db.from('word_bank').select('english,turkish,unit_no').eq('active',true).eq('class_no',classNo).order('unit_no').limit(5000);
      if(all.error)return fail('Karışık kelimeler yüklenemedi.',503);
      const rows=(all.data||[]).filter(w=>w.english?.trim()&&w.turkish?.trim()&&w.unit_no>0),ids=[...new Set(rows.map(w=>Number(w.unit_no)))].sort((a,b)=>a-b);
      const banks=ids.map(id=>[...new Map(rows.filter(w=>Number(w.unit_no)===id).map(w=>[key(w.english),{en:w.english.trim(),tr:w.turkish.trim()}])).values()].sort((a,b)=>a.en.localeCompare(b.en,'en')));
      const i=ids.filter(id=>id<unit).reduce((sum,id)=>sum+Math.ceil(banks[ids.indexOf(id)].length/4),0)+part-baseCount,seen=new Set();
      for(let round=0;words.length<4&&round<100;round++)for(let j=0;j<banks.length&&words.length<4;j++){
        const list=banks[(i+j)%banks.length],w=list[(Math.floor(i/banks.length)+round)%list.length];
        if(w&&!seen.has(key(w.en))){words.push(w);seen.add(key(w.en));}
      }
    }
   }else{
    if(!Array.isArray(body.words)||body.words.length<1||body.words.length>32)return fail('Geçersiz soru listesi.',400);
    let eligible=available;
    if(['tren','cumle'].includes(game))eligible=available.filter(w=>w.en.split(/\s+/).length>=3&&w.en.split(/\s+/).length<=9);
    if(game==='dikte')eligible=available.filter(w=>/^[a-zA-Z]{3,10}$/.test(w.en));
    if(game==='kelimebul')eligible=available.filter(w=>/^[a-zA-Z]{3,9}$/.test(w.en));
    if(game==='harfbahcesi')eligible=available.filter(w=>/^[a-zA-Z]{2,12}$/.test(w.en));
    if(game==='asmaca')eligible=available.filter(w=>w.en.replace(/[^a-zA-Z]/g,'').length>=3);
    if(game==='bosluk'){const plain=available.filter(w=>w.en.length>=3&&!w.en.includes(' ')&&!w.en.includes("'"));if(plain.length>=5)eligible=plain;}
    const expected=Math.min(game==='kp'?1:12,new Set(eligible.map(w=>key(w.en))).size);
    if(game==='kp'?body.words.length<expected||body.words.length>12:body.words.length!==expected)return fail('Soru oturumu eksik. Oyunu yeniden başlat.',400);
    const seen=new Set();for(const requested of body.words){const w=eligible.find(w=>key(w.en)===key(requested.en)&&norm(w.tr)===norm(requested.tr));if(!w||seen.has(key(w.en)))return fail('Sorular etkin kelime havuzuyla uyuşmuyor.',400);seen.add(key(w.en));words.push(w);}
   }
   if(!words.length)return fail('Bu bölümde soru bulunamadı.',400);
   const deck=compile(game,words);
   const r=await db.rpc('dm_verified_start',{actor:a.student_id,run_key:run,game_code:game,cls:classNo,unit_ids:units,stop_id:stop,tasks:deck});
   if(r.error)return fail('Oyun oturumu kaydedilemedi.',409);
   return json({ok:true,total:deck.length,words,slots:deck.map((w,i)=>({slot:i,en:w.en,kind:w.kind,pairs:w.pairs})),...r.data});
  }
  const r=await db.from('dm_verified_runs').select('game,class_no,units,stop_no,deck,answers,expires_at').eq('student_id',a.student_id).eq('run_id',run).maybeSingle();
  if(r.error)return fail('Cevap doğrulanamadı.',503);if(!r.data||Date.parse(r.data.expires_at)<Date.now())return fail('Oyun oturumu sona erdi. Yeniden başlat.');
  if(op==='verifiedGameStatus')return json({ok:true,game:r.data.game,classNo:r.data.class_no,units:r.data.units,stopNo:r.data.stop_no,slots:r.data.deck.map((t,slot)=>({slot,en:t.en,kind:t.kind,pairs:t.pairs}))});
  const slot=Number(body.slot),task=r.data.deck[slot];if(!Number.isInteger(slot)||!task)return fail('Geçersiz soru.',400);
  const g=grade(task,body.answer,r.data.game);if(!g.valid)return fail('Geçersiz cevap biçimi.',400);
  const result=await db.rpc('dm_verified_answer',{actor:a.student_id,run_key:run,slot_no:slot,event_key:String(body.eventId||''),is_correct:g.correct,is_complete:g.complete});
  if(result.error)return fail(result.error.message,409);return json({ok:true,...result.data});
 }};
}
