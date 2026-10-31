// Server-side catalog resolution; never accept a client-supplied price.
export function iosAdRewards({db,json,isDemo,jokers,characters,items,catalog}) {
 const candidates=items.filter(x=>!x.atolye&&!x.parca&&x.sv!=='temel').map(x=>({id:x.id,gender:catalog.itemGender(x)}));
 function product(urun) {
  if(!urun)return null;
  const id=String(urun.id||'');
  if(urun.tip==='kiyafet'&&items.some(x=>x.id===id))return {tip:'kiyafet',id};
  if(urun.tip==='joker'&&Object.hasOwn(jokers,id))return {tip:'joker',id,price:jokers[id][2]};
  if(urun.tip==='karakter'&&Object.hasOwn(characters,id))return {tip:'karakter',id,price:50+characters[id]*10};
  if(urun.tip==='enerji'&&['5','10','15'].includes(id))return {tip:'enerji',id,price:({'5':100,'10':130,'15':180})[id]};
  throw Error('Ürün bulunamadı.');
 }
 return {async handle(op,body,a,method) {
  if(!['reklamHakki','reklamOdulu'].includes(op))return null;
  if(method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  if(a?.role!=='student'||!a.student_id||a.teacher_portal_access_id||isDemo(a))return json({ok:false,mesaj:'Bu hesapta reklam kapalı.'},403);
  try {
   const claim=op==='reklamOdulu';
   if(claim&&(!['enerji','altin'].includes(body.tur)||! /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.requestId||'')))throw Error('Geçersiz reklam isteği.');
   const urun=product(body.urun);
   const {data,error}=await db.rpc('dm_ios_ad_reward',{p_actor:a.student_id,p_claim:claim,p_kind:claim?body.tur:null,p_request:claim?body.requestId:null,p_product:urun,p_candidates:urun?.tip==='kiyafet'?candidates:[]});
   if(error)throw error;
   return json(data);
  }catch(e){return json({ok:false,mesaj:e.message||'Reklam hakkı kontrol edilemedi.'},400);}
 }};
}
