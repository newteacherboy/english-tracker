/* Display policy only. All launch, access and reward checks stay with existing modules. */
(function(root){'use strict';
const clean=x=>String(x||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
function parse(value){if(value==null||value==='')return null;if(value instanceof Date)value=value.getTime();if(typeof value==='number'||/^\d+(?:\.\d+)?$/.test(String(value))){const n=Number(value),ms=n<1e11?n*1000:n;return Number.isFinite(ms)&&ms>0&&ms<=8640000000000000?ms:null;}let s=String(value).trim();const tr=s.match(/^(\d{2})[./](\d{2})[./](\d{4})(?:[ ,T]+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);if(tr)s=tr[3]+'-'+tr[2]+'-'+tr[1]+'T'+(tr[4]||'00')+':'+(tr[5]||'00')+':'+(tr[6]||'00')+'+03:00';const n=Date.parse(s);return Number.isFinite(n)?n:null;}
function format(value){const ms=parse(value);if(ms===null)return 'Zaman bilgisi yok';return new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(ms);}
const games=[['Hafıza Sandığı','hafizaOyunAc','oyun_hafiza','Hafiza_Liderlik'],['Kelime Laboratuvarı','kelimeYarismasiAc','oyun_kelime','Kelime_Liderlik'],['Risk Balonları','jpOyunAc','oyun_jeopardy','Jeopardy_Liderlik'],['Eksik Harf','boslukOyunAc','oyun_bosluk','Bosluk_Tablosu'],['Hız Fırtınası','yagmurOyunAc','oyun_yagmur','Yagmur_Liderlik'],['Harf Avı','asmacaOyunAc','oyun_asmaca','Asmaca_Liderlik'],['Şifre Kırıcı','kelimebulOyunAc','oyun_kelimebul','KelimeBul_Liderlik'],['Eş Bul','esOyunAc','oyun_eslestirme','Eslesme_Liderlik'],['Kelime Treni','trenOyunAc','oyun_tren','Tren_Liderlik'],['Kulak Dedektifi','dikteAc','oyun_dikte','Dikte_Liderlik'],['Cümle Ustası','cumleAc','oyun_cumle','Cumle_Liderlik'],['Harf Bahçesi','harfBahcesiAc','oyun_harfbahcesi',''],['Kelime Rallisi','ralliOyunAc','oyun_ralli','']];
function classify(e){const text=clean(e.metin),game=games.find(g=>text.includes(clean(g[0]))),ms=parse(e.t),base={ms,day:ms===null?'unknown':new Date(ms+10800000).toISOString().slice(0,10),game};let kind;
if(game&&(/puan|rekor|oynadi|tamamladi/.test(text))&&!/xp.*altin|etkinliginde/.test(text))kind='game';
else if(/diyalog|hikaye/.test(text)&&/tamamla|bitir/.test(text))kind='story';
else if(/rozet/.test(text)&&/kazan|acil|ulas/.test(text))kind='badge';
else if(/lig/.test(text)&&/haftasini\s*\d+\.\s*sirada tamamla/.test(text))kind='weekly';
else if(/lig/.test(text)&&/yuksel|terfi|gecti/.test(text))kind='league';
else if(/seri|ust uste|gunluk calisma/.test(text)&&[3,7,14,30,60,100,365].includes(Number((text.match(/(\d+)\s*gun/)||[])[1])))kind='streak';
else if(/gorev/.test(text)&&/tamamla|bitir/.test(text))kind='mission';
else if(/seviye/.test(text)&&/yuksel|atladi|ulas/.test(text))kind='level';
else if(/bolum|durak|ders konusunu|parkur/.test(text)&&/tamamla|gecti|bitir/.test(text))kind='route';
if(!kind)return null;const score=kind==='game'?Number((text.match(/([\d.,]+)\s*puan/)||[])[1]?.replace(/[.,]/g,''))||null:null;
return {...base,kind,score,badge:{route:0,game:1,story:2,level:3,badge:4,mission:5,streak:6,league:7,weekly:8}[kind],label:{route:'Bölüme başla',game:'Oyunu aç',story:/hikaye/.test(text)?'Hikâyeye başla':'Diyaloğa başla',level:'Seviyeleri gör',badge:'Rozetleri gör',mission:'Görevlerimi aç',streak:'Serimi gör',league:'Ligi aç',weekly:'Lig sonuçlarını gör'}[kind]};}
// The home preview has room for one short sentence; the full feed keeps the original event.
function summarize(event) {
  const text = clean(event.metin);
  const item = event.club || classify(event);
  switch (item?.kind) {
    case 'route': {
      if (/ders konusunu/.test(text)) {
        const level = text.match(/^([abc][12])\s*[·:–—-]/)?.[1]?.toUpperCase();
        return level ? level + ' dersini bitirdi.' : 'Bir dersi bitirdi.';
      }
      return 'Parkurda bir durak geçti.';
    }
    case 'weekly': {
      const rank = text.match(/haftasini\s*(\d+)\.\s*sirada/)?.[1];
      const gold = text.match(/(\d+)\s*altin/)?.[1];
      const energy = text.match(/(\d+)\s*enerji/)?.[1];
      return (rank ? 'Haftayı '+rank+'. bitirdi.' : 'Haftalık lig derecesi kazandı.')
        +(gold!==undefined&&energy!==undefined?' Ödül: '+gold+' altın, '+energy+' enerji.':'');
    }
    case 'league': {
      const rank = text.match(/(\d+)\.\s*siraya/)?.[1];
      if (rank) return rank + '. sıraya yükseldi.';
      const league = text.match(/^(yerel|super|sampiyonlar|efsaneler)\b/)?.[1];
      const names = {yerel:'Yerel',super:'Süper',sampiyonlar:'Şampiyonlar',efsaneler:'Efsaneler'};
      return league ? names[league] + ' Lig’e çıktı.' : 'Bir üst lige çıktı.';
    }
    case 'game': return item.score ? item.score.toLocaleString('tr-TR') + ' puan aldı.' : 'Bir oyun oynadı.';
    case 'story': return /hikaye/.test(text) ? 'Bir hikâye bitirdi.' : 'Bir diyalog bitirdi.';
    case 'streak': {
      const days = text.match(/(\d+)\s*gun/)?.[1];
      return days ? days + ' günlük seri yaptı.' : 'Serisini uzattı.';
    }
    case 'level': {
      const level = text.match(/(\d+)\.\s*seviy/)?.[1];
      return level ? level + '. seviyeye çıktı.' : 'Seviye atladı.';
    }
    case 'badge': return 'Bir rozet kazandı.';
    case 'mission': return 'Görevini tamamladı.';
    default: return 'Yeni bir etkinlik yaptı.';
  }
}
function select(rows){const out=[],days=new Set(),best=new Map(),seen=new Set();for(const e of [...rows].sort((a,b)=>(parse(a.t)||0)-(parse(b.t)||0))){const c=classify(e);if(!c)continue;const key=clean(e.ogr)+':'+c.kind+':'+(c.game?.[0]||'')+':'+c.day;if(c.kind==='game'){const recordKey=clean(e.ogr)+':'+c.game[0],prev=best.get(recordKey);const record=c.score!=null&&prev!=null&&c.score>prev;if(days.has(key)&&!record)continue;days.add(key);if(c.score!=null)best.set(recordKey,Math.max(prev||0,c.score));}else{const fingerprint=key+':'+clean(e.metin);if(seen.has(fingerprint))continue;seen.add(fingerprint);}out.push({...e,club:c});}return out.sort((a,b)=>(b.club.ms||0)-(a.club.ms||0));}
root.DMTime={parse,format};root.DMFriendsFeed={classify,select,games,summarize};
})(typeof window==='undefined'?globalThis:window);
