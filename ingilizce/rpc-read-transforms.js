/* [Kota 27 Eki 2026] Veritabanı fonksiyonlarından gelen ham okumaları diji-api'nin verdiği cevaba çevirir.
   ekVeriGetir'in cevabı (JSON metni dahil) diji-api/index.ts ile birebir aynı kodla kurulur. */
(function(root){
  'use strict';
  const metinVer=v=>v==null?'':typeof v==='string'?v:JSON.stringify(v);
  function ekVeri(x,key,tanitim){
    let data=x&&x.var?{value:x.value,updated_at:x.updated_at}:null;
    if(key==='yo'){
      const goal=x&&x.goal;
      if(goal?.h){
        let state=data?.value||{};if(typeof state==='string'){try{state=JSON.parse(state);}catch{state={};}}
        if(!state.haftaHedef||goal.h>=state.haftaHedef.h)state={...state,haftaHedef:goal};
        data={value:state,updated_at:data?.updated_at||null};
      }
    }
    if(key==='yo'&&tanitim)return {deger:data?metinVer(data.value):null,guncelleme:data?.updated_at||null,kayitTarihi:x?.created_at||null};
    return data?{deger:metinVer(data.value),guncelleme:data.updated_at}:null;
  }
  const api={ekVeri};
  if(typeof module==='object'&&module.exports)module.exports=ekVeri;
  if(root)root.dmRpcReadTransforms=api;
})(typeof window!=='undefined'?window:null);
