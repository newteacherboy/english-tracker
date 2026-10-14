/* Approved K2/E2 identities; existing wardrobe state remains the source of truth. */
(()=>{'use strict';
const asset=c=>'avatar-assets/adventure-'+(c==='k'?'girl':'boy')+'-v2.webp';
// Stored customization must never switch the account back to the retired face.
const identity=(s,c)=>c==='k'||c==='e';
const base=(s,c)=>identity(s,c)&&(!s.goz||s.goz==='normal')&&(!s.agiz||s.agiz==='gulumse')&&(!s.bas||s.bas==='yok')&&['ust','alt','tek','dis','ayak','aks','cik'].every(k=>!s[k])&&(!s.kiyafet||s.kiyafet===(c==='k'?'tisort-mor':'tisort-mavi'))&&(!s.sapka||s.sapka==='yok')&&(!s.gozluk||s.gozluk==='yok');
const image=(c,x,y,w,h)=>'<image data-adventure-identity="'+c+'" href="'+asset(c)+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid meet"/>';
const skin=['#ffe0c7','#f6c9a3','#e3a77b','#c68655','#8d5a3b','#5e3a24'];
function faceDetails(s){
 const tone=skin[Number(s.ten)||0];let out='';
 if(s.goz&&s.goz!=='normal'&&s.goz!=='buyuk'){
  for(const x of [82,118]){
   if(s.goz==='kirp'&&x===82)continue;
   out+='<ellipse cx="'+x+'" cy="97" rx="13" ry="11" fill="'+tone+'"/>';
   if(s.goz==='mutlu'||s.goz==='kirp')out+='<path d="M'+(x-7)+' 97 Q'+x+' '+(s.goz==='mutlu'?88:104)+' '+(x+7)+' 97" fill="none" stroke="#39251e" stroke-width="3" stroke-linecap="round"/>';
   else out+='<text x="'+x+'" y="104" text-anchor="middle" font-size="22" fill="'+(s.goz==='kalp'?'#ff5d8f':'#ffd166')+'">'+(s.goz==='kalp'?'♥':'★')+'</text>';
  }
 }
 if(s.agiz&&s.agiz!=='gulumse'){
  out+='<ellipse cx="100" cy="117" rx="15" ry="9" fill="'+tone+'"/>';
  const mouth={saskin:'<ellipse cx="100" cy="118" rx="4.5" ry="5.5" fill="#7a2e2e"/>',kocaman:'<path d="M88 113 Q100 132 112 113 Z" fill="#7a2e2e"/><path d="M90 114 H110 L108 117 H92 Z" fill="#fff"/>',dil:'<path d="M91 115 Q100 122 109 115" fill="none" stroke="#7a2e2e" stroke-width="3"/><path d="M96 119 Q100 129 104 119 Z" fill="#ff6b8a"/>',kedi:'<path d="M91 115 Q95.5 120 100 115 Q104.5 120 109 115" fill="none" stroke="#7a2e2e" stroke-width="3"/>'};out+=mouth[s.agiz]||'';
 }
 return out;
}
let id=0;
window.dmAdventureAvatar={identity,base,
 portrait:(s,c)=>base(s,c)?image(c,-65,5,330,495):null,
 head:(s,c)=>{if(!identity(s,c))return null;const covered=!!s.bas&&s.bas!=='yok',faceOnly=covered;const shape=faceOnly?'<ellipse cx="100" cy="104" rx="46" ry="43"/>':'<path d="M12 20 H188 V128 Q145 130 116 150 H84 Q60 130 12 128 Z"/>';const key='dmAdventureHead'+(++id);let toneDefs='',tinted='';
 if(s.ten!=null&&String(s.ten)!=='1'){
  const color=skin[Number(s.ten)]||skin[1],baseTone=[246,201,163],channels=[0,1,2].map((i)=>parseInt(color.slice(1+i*2,3+i*2),16)/baseTone[i]);
  toneDefs='<clipPath id="'+key+'Skin"><ellipse cx="103" cy="105" rx="40" ry="39"/></clipPath><filter id="'+key+'Tone" color-interpolation-filters="sRGB"><feComponentTransfer>'+['R','G','B'].map((ch,i)=>'<feFunc'+ch+' type="linear" slope="'+channels[i]+'"/>').join('')+'</feComponentTransfer></filter>';
  tinted='<g clip-path="url(#'+key+'Skin)"><g filter="url(#'+key+'Tone)">'+image(c,-28,30,256,384)+'</g></g>';
 }
 return '<defs><clipPath id="'+key+'">'+shape+'</clipPath>'+toneDefs+'</defs><g clip-path="url(#'+key+')">'+image(c,-28,30,256,384)+tinted+faceDetails(s)+'</g>';},
 full:(s,c,px)=>base(s,c)?'<svg class="dm-adventure-avatar" viewBox="0 0 260 390" width="'+Math.round(px*260/390)+'" height="'+px+'" role="img" aria-label="'+(c==='k'?'Kız':'Erkek')+' macera karakteri">'+image(c,0,0,260,390)+'</svg>':null
};
})();
