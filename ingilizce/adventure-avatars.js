/* Approved K2/E2 identities; existing wardrobe state remains the source of truth. */
(()=>{'use strict';
const asset=c=>'avatar-assets/adventure-'+(c==='k'?'girl':'boy')+'-v2.webp';
const normal=s=>(s.ten==null||String(s.ten)==='1')&&(!s.goz||s.goz==='normal')&&(!s.agiz||s.agiz==='gulumse')&&(!s.detay||s.detay==='yanak')&&(!s.bas||s.bas==='yok');
const defaultHair=(s,c)=>!s.sac||s.sac===(c==='k'?'uzun':'kisa');
const defaultColor=(s,c)=>!s.sacRenk||['#6b4226','#2b2331'].includes(s.sacRenk);
const identity=(s,c)=>normal(s)&&defaultHair(s,c)&&defaultColor(s,c);
const base=(s,c)=>identity(s,c)&&['ust','alt','tek','dis','ayak','aks','cik'].every(k=>!s[k])&&(!s.kiyafet||s.kiyafet===(c==='k'?'tisort-mor':'tisort-mavi'))&&(!s.sapka||s.sapka==='yok')&&(!s.gozluk||s.gozluk==='yok');
const image=(c,x,y,w,h)=>'<image data-adventure-identity="'+c+'" href="'+asset(c)+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid meet"/>';
let id=0;
window.dmAdventureAvatar={identity,base,
 portrait:(s,c)=>base(s,c)?image(c,-65,5,330,495):null,
 head:(s,c)=>{if(!identity(s,c))return null;const key='dmAdventureHead'+(++id);return '<defs><clipPath id="'+key+'"><path d="M12 20 H188 V128 Q145 130 116 150 H84 Q60 130 12 128 Z"/></clipPath></defs><g clip-path="url(#'+key+')">'+image(c,-28,30,256,384)+'</g>';},
 full:(s,c,px)=>base(s,c)?'<svg class="dm-adventure-avatar" viewBox="0 0 260 390" width="'+Math.round(px*260/390)+'" height="'+px+'" role="img" aria-label="'+(c==='k'?'Kız':'Erkek')+' macera karakteri">'+image(c,0,0,260,390)+'</svg>':null
};
})();
