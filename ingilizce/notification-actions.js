/* Contextual notification actions. Writes only happen after an explicit button click. */
(function(global){
  'use strict';
  const key=x=>String(x||'').trim().toLowerCase();
  function duelFor(note,list,owner,now=Date.now()){
    if(note.tur!=='duello')return null;
    const time=global.DMTime?.parse(note.tarih);
    const candidates=list.filter(d=>key(d.alici)===key(owner)&&key(d.gonderen)===key(note.gonderen)&&
      (!note.metin||note.metin===d.oyun)&&d.durum==='bekliyor'&&Number(d.kalanDk)>0&&
      time!==null&&Number.isFinite(time)&&Math.abs((now-time)/60000-(1440-Number(d.kalanDk)))<2);
    return candidates.length===1?candidates[0]:null;
  }
  function plan(note,duel){
    const sender=String(note.gonderen||'').trim();
    if(note.tur==='duello')return duel?[['accept','⚔️ Kabul et'],['reject','Reddet']]:[['duels','Düellolarımı gör']];
    if(note.tur==='oyunDavet')return [['match','Karşılaşmayı aç']];
    if(['duelloYanit','duelloOyun','duelloSonuc'].includes(note.tur))return [['duels','Karşılaşmalarımı gör']];
    if(!sender)return [];
    if(['hediye','enerji'].includes(note.tur))return [['gift','🎁 Sen de gönder'],['profile','Profili gör']];
    if(note.tur==='mesaj')return [['message','💬 Yanıtla'],['profile','Profili gör']];
    if(['takip','tebrik'].includes(note.tur))return [['profile','Profili gör']];
    return [];
  }
  async function mount(host,notes,{owner,currentOwner,onNavigate=()=>{}}){
    const same=()=>host.isConnected&&key(currentOwner())===key(owner);
    const api=(op,data)=>{if(!same())throw Error('Hesap değişti. Bildirimleri yeniden aç.');if(!global.dmMeduPro?.api)throw Error('Bağlantı hazır değil. Tekrar dene.');return global.dmMeduPro.api(op,data);};
    let duels=[],unread=[];
    const results=await Promise.allSettled([
      notes.some(n=>n.tur==='duello')?api('duellolarim'):Promise.resolve({liste:[]}),
      notes.some(n=>n.tur==='oyunDavet')?api('bildirimlerim'):Promise.resolve({liste:[]})
    ]);
    if(!same())return;
    if(results[0].status==='fulfilled')duels=results[0].value?.liste||[];
    if(results[1].status==='fulfilled')unread=results[1].value?.liste||[];
    const answered=new Set();
    host.querySelectorAll('[data-notification-index]').forEach(box=>{
      const note=notes[Number(box.dataset.notificationIndex)];if(!note)return;
      let duel=duelFor(note,duels,owner);
      const actions=plan(note,duel);if(!actions.length)return;
      const group=document.createElement('div');group.className='zl-actions';
      const status=document.createElement('span');status.className='zl-action-status';status.setAttribute('role','status');
      const render=items=>{group.replaceChildren();items.forEach(([action,label])=>{const b=document.createElement('button');b.type='button';b.dataset.notificationAction=action;b.textContent=label;group.append(b);b.onclick=async()=>{
        if(!same())return;
        status.textContent='';
        if(action==='accept'||action==='reject'){
          if(answered.has(String(duel.id)))return;
          status.textContent='Yanıt gönderiliyor…';
          group.querySelectorAll('button').forEach(x=>x.disabled=true);
          try{
            const fresh=await api('duellolarim');if(!same())return;
            const active=(fresh.liste||[]).find(d=>String(d.id)===String(duel.id)&&key(d.alici)===key(owner)&&d.durum==='bekliyor'&&Number(d.kalanDk)>0);
            if(!active){render([['duels','Düellolarımı gör']]);status.textContent='Bu davet yanıtlanmış veya süresi dolmuş.';return;}
            const result=await api('duelloYanit',{id:active.id,kabul:action==='accept'});
            if(result?.ok===false||result?.hata||result?.status==='error')throw Error(result.mesaj||'Yanıt gönderilemedi.');
            if(!same())return;
            answered.add(String(active.id));
            status.textContent=action==='accept'?'Davet kabul edildi. Hazır olduğunda oyna!':'Davet reddedildi.';
            render(action==='accept'?[['play','🎮 Oyuna git']]:[]);
          }catch(e){if(same()){status.textContent=e.message||'İşlem tamamlanamadı. Tekrar dene.';group.querySelectorAll('button').forEach(x=>x.disabled=false);}}
          return;
        }
        onNavigate();
        if(action==='play')global.duelloOyununuAc?.(duel.oyun);
        else if(action==='gift')global.dmGiftAc?.(note.gonderen);
        else if(action==='message')global.dmMessageAc?.(note.gonderen);
        else if(action==='profile')global.maProfilAc?.(note.gonderen);
        else if(action==='match'){
          const id=note.matchId||unread.find(n=>String(n.sat)===String(note.sat))?.matchId;
          if(id)global.dmMatchAc?.(id);else global.dmArenaAc?.();
        }else if(action==='duels')global.dmFriends?.detail?.('kesfet');
      };});};
      render(actions);box.append(group,status);
    });
  }
  global.DMNotificationActions={duelFor,plan,mount};
})(typeof window!=='undefined'?window:globalThis);
