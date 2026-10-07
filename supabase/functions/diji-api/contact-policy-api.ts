export function contactPolicyAPI(db:any,json:any) {
  const cache=new Map<string,{until:number,state:any}>();
  const pending=new Map<string,Promise<any>>();
  async function state(id:string,claim=false) {
    const c=cache.get(id);
    if (!claim && c && !c.state.donuk && c.until>Date.now()) return {...c.state,uyari:false};
    if (!claim && pending.has(id)) return pending.get(id);
    const work=(async()=>{
      const r=await db.rpc('student_contact_state',{p_student:id,p_claim:claim});
      if (r.error || !r.data) throw new Error('Contact policy unavailable');
      if(cache.size>20000)cache.clear();
      const deadline=Date.parse(r.data.sonTarih||'');
      cache.set(id,{until:Math.min(Date.now()+30000,Number.isFinite(deadline)?deadline:Infinity),state:r.data});
      return r.data;
    })();
    if(!claim)pending.set(id,work);
    try{return await work;}finally{if(!claim)pending.delete(id);}
  }
  return {state,invalidate:(id:string)=>cache.delete(id),async guard(op:string,a:any){
    if(a?.role!=='student'||!a.student_id)return null;
    // These routes remain reachable so a frozen account can repair itself.
    if(['kisiselBilgilerim','kisiselBilgiGuncelle','giris','ogretmenGiris','cikis'].includes(op))return null;
    try {
      const s=await state(a.student_id,op==='iletisimDurumu');
      if(op==='iletisimDurumu')return json({ok:true,...s});
      if(s.donuk)return json({ok:false,hata:'iletisim',mesaj:'15 günlük süre doldu. Devam etmek için telefon ve e-postanı tamamla.',...s},423);
      return null;
    }catch{return json({ok:false,mesaj:'Hesap durumu kontrol edilemedi. Tekrar dene.'},503);}
  }};
}
