/* K2/E2 wardrobe rig: every layer shares one 240 × 480 coordinate system. */
(()=>{'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SKIN=['#ffe0c7','#f6c9a3','#e3a77b','#c68655','#8d5a3b','#5e3a24'];
const BASE_COLORS={'tisort-mor':'#a06bff','tisort-mavi':'#4d96ff','tisort-yesil':'#34b36a',forma:'#f8fafc',kazak:'#ff8a3d',esofman:'#0ea5e9',buyucu:'#6d28d9',kahraman:'#2563eb',astronot:'#f1f5f9'};
let serial=0;
const color=(s,f='#6366f1')=>/^#[0-9a-f]{6}$/i.test(s)?s:f;
const mix=(hex,target,ratio)=>{hex=color(hex,'#9f66de');return '#'+[0,2,4].map(i=>Math.round(parseInt(hex.slice(i+1,i+3),16)*(1-ratio)+target*ratio).toString(16).padStart(2,'0')).join('');};
const parse=(id,fallback)=>{const [prefix,type,paint,pattern]=String(id||fallback||'').split(':');return {id,type,paint:color(paint),pattern:pattern||'duz'};};
const present=x=>!!x&&x!=='yok';
function render(input,{cins='e',px=200,full=false,stil='c'}={}){
 const s={...(input||{})},female=cins==='k',uid='dmRig'+(++serial),skin=SKIN[Number(s.ten)]||SKIN[1],hair=color(s.sacRenk,female?'#6b4226':'#2b2331');
 const hairStyle=s.sac||(female?'uzun':'kisa'),fittedHat=['kep','bere'].includes(s.sapka)&&!present(s.bas),nativeHead=hairStyle===(female?'uzun':'kisa')&&(!s.sacRenk||s.sacRenk===(female?'#6b4226':'#2b2331'))&&String(s.ten??'1')==='1'&&!present(s.bas)&&!fittedHat;
 const hairPaint=s.sacRenk==='gokkusagi'?'gokkusagi':female&&hair==='#6b4226'?'#b9522c':hair;
 let defs='',gradientCount=0;
 const gradients=new Map();
 const fabric=paint=>{if(paint==='gokkusagi'){const id=uid+'RainbowHair';if(!gradients.has(paint)){defs+='<linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1">'+['#ef7e96','#f3cc73','#81bf9a','#78b7d3','#af87d9'].map((c,i)=>'<stop offset="'+i*25+'%" stop-color="'+c+'"/>').join('')+'</linearGradient>';gradients.set(paint,'url(#'+id+')');}return gradients.get(paint);}paint=color(paint);if(gradients.has(paint))return gradients.get(paint);const id=uid+'Paint'+(++gradientCount);defs+='<linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2=".25"><stop stop-color="'+mix(paint,0,.25)+'"/><stop offset=".28" stop-color="'+mix(paint,255,.18)+'"/><stop offset=".57" stop-color="'+paint+'"/><stop offset="1" stop-color="'+mix(paint,0,.22)+'"/></linearGradient>';const fill='url(#'+id+')';gradients.set(paint,fill);return fill;};
 const path=(d,paint,extra='')=>'<path d="'+d+'" fill="'+fabric(paint)+'" '+extra+'/>';
 const line=(d,stroke='#ffffff66',width=2)=>'<path d="'+d+'" fill="none" stroke="'+stroke+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>';
 const patch=(x,y,rx,ry)=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+fabric(skin)+'"/>';
 const asset='avatar-assets/head-'+(female?'girl':'boy')+'-v3.webp';
 const faceImage=(extra,detail=false)=>'<image '+(detail?'data-face-detail="eyes"':'data-adventure-identity="'+cins+'"')+' href="'+asset+'" x="54" y="'+(female?20:8)+'" width="132" height="132" '+(extra||'')+'/>';
 const covered=present(s.bas),hat=covered?'yok':s.sapka||'yok';
 const upper=parse(s.ust),one=parse(s.tek),outer=parse(s.dis),lower=parse(s.alt,'a:pantolon:#887859:duz'),shoe=parse(s.ayak,'a:spor:'+(female?'#26a6b7':'#253e71')+':duz'),accessory=parse(s.aks);
 const starter=!present(s.ust)&&!present(s.tek)&&!present(s.dis)&&(!s.kiyafet||s.kiyafet===(female?'tisort-mor':'tisort-mavi'));
 const topColor=present(s.tek)?one.paint:present(s.ust)?upper.paint:starter?(female?'#b791d2':'#fff0d4'):BASE_COLORS[s.kiyafet]||'#7c65b3';
 const outerColor=present(s.dis)?outer.paint:starter?(female?'#2e4273':'#157e8e'):null;
 const outerType=present(s.dis)?outer.type:starter?'yelek':'';
 const torso='M89 157 Q120 148 151 157 Q164 181 158 224 L153 283 Q120 292 87 283 L82 224 Q76 181 89 157 Z';
 const torsoClip=uid+'Torso';defs+='<clipPath id="'+torsoClip+'"><path d="'+torso+'"/></clipPath>';
 function pattern(kind,paint,x=83,y=175,w=75,h=107){
  let out='';const pale=mix(color(paint),255,.5);
  if(kind==='cizgi'||kind==='ekose')for(let yy=y;yy<y+h;yy+=14)out+='<path d="M'+x+' '+yy+' H'+(x+w)+'" stroke="'+pale+'" stroke-width="'+(kind==='ekose'?3:5)+'"/>';
  if(kind==='ekose')for(let xx=x;xx<x+w;xx+=15)out+='<path d="M'+xx+' '+y+' V'+(y+h)+'" stroke="'+pale+'" stroke-width="3"/>';
  if(['puantiye','cicek','yildiz'].includes(kind))for(let yy=y+8;yy<y+h;yy+=20)for(let xx=x+8;xx<x+w;xx+=20)out+=kind==='yildiz'?'<path d="M'+xx+' '+(yy-4)+' l1.5 3 3.5.5-2.5 2.4.6 3.5-3.1-1.6-3.1 1.6.6-3.5-2.5-2.4 3.5-.5Z" fill="#fde68a"/>':kind==='cicek'?'<g fill="'+pale+'"><circle cx="'+xx+'" cy="'+yy+'" r="4"/><circle cx="'+xx+'" cy="'+yy+'" r="1.7" fill="#ffd777"/></g>':'<circle cx="'+xx+'" cy="'+yy+'" r="2.5" fill="'+pale+'"/>';
  return out;
 }
 let back='',body='',head='',front='',details='';
 // Cape and long hair are behind the body, never attached to garment coordinates.
 if(upper.type==='kahraman')back+=path('M85 164 Q59 242 58 344 Q120 373 182 344 Q178 242 155 164 Z',mix(topColor,0,.25))+line('M65 340 Q120 358 175 340','#ffffff55',3);
 const looseHair=['uzun','bob','orgu','atkuyrugu','kivircik'].includes(hairStyle)&&!covered&&!nativeHead;
 if(looseHair){
  const length=hairStyle==='bob'?145:hairStyle==='uzun'?173:158;
  back+=path('M73 80 Q65 111 69 '+(length-16)+' Q66 '+(length+8)+' 86 '+(length+2)+' Q96 '+(length+12)+' 106 '+length+' L137 '+length+' Q147 '+(length+12)+' 159 '+(length+1)+' Q180 '+(length+8)+' 174 '+(length-17)+' Q177 112 168 79 Z',hairPaint);
  back+=line('M80 92 Q74 130 81 '+(length-3),mix(hairPaint,255,.28),2)+line('M160 91 Q171 123 161 '+(length-2),mix(hairPaint,0,.3),2);
 }
 if(hairStyle==='atkuyrugu'&&!covered)back+=path('M159 50 Q205 42 190 118 Q189 148 177 160 Q185 111 165 93 Z',hairPaint);
 if(hairStyle==='topuz'&&!covered)back+='<ellipse cx="124" cy="24" rx="24" ry="19" fill="'+fabric(hairPaint)+'"/>'+line('M109 19 Q121 8 139 18',mix(hairPaint,255,.25),2);
 // Common anatomical anchors: neck 120/145, shoulders 88–152/164, waist 89–151/284.
 body+=path('M108 123 H132 L134 157 Q120 170 106 157 Z',skin,'data-rig-anchor="neck"')+line('M111 141 Q120 150 130 141',mix(skin,0,.2),1.4);
 body+=path('M90 279 H150 L147 327 L138 426 Q126 435 122 426 L120 322 L118 426 Q107 435 102 426 L93 327 Z',lower.paint);
 body+=line('M93 292 H146 M120 298 V328',mix(lower.paint,0,.32),2)+line('M105 330 L109 418 M135 330 L130 418',mix(lower.paint,255,.15),2);
 if(lower.type==='kot')body+=line('M97 302 Q102 317 114 309 M143 302 Q138 317 126 309','#e3bf80',1.5);
 if(lower.type==='esofman')body+=line('M98 300 L105 425 M143 300 L136 425','#ffffffaa',3);
 if(lower.pattern!=='duz')body+=pattern(lower.pattern,lower.paint,98,307,44,116);
 // Shoes occupy fixed foot anchors. Boot shafts grow upwards, not away from the leg.
 for(const [x,flip] of [[109,-1],[131,1]]){
  if(shoe.type==='bot')body+=path('M'+(x-10)+' 405 H'+(x+10)+' V439 H'+(x-10)+' Z',shoe.paint)+line('M'+(x-7)+' 416 H'+(x+7)+' M'+(x-7)+' 426 H'+(x+7),mix(shoe.paint,255,.4),2);
  body+=path('M'+(x-10)+' 429 Q'+x+' 425 '+(x+10)+' 432 L'+(x+flip*18)+' 445 Q'+(x+flip*21)+' 456 '+x+' 456 Q'+(x-flip*15)+' 457 '+(x-flip*16)+' 447 Z',shoe.paint);
  body+=line('M'+(x-14)+' 450 Q'+x+' 454 '+(x+17)+' 450','#f7f2e8',5);
  if(shoe.type==='spor')body+=line('M'+(x-6)+' 435 H'+(x+6)+' M'+(x-6)+' 440 H'+(x+7),'#f9f6e9',2);
  if(shoe.type==='babet')body+=path('M'+x+' 436 q-11-7-9 4 l9-2 9 2 q2-11-9-4Z',mix(shoe.paint,255,.3));
  if(shoe.type==='sandalet')body+=line('M'+(x-8)+' 436 L'+(x+8)+' 444 M'+(x-8)+' 444 L'+(x+8)+' 436',mix(shoe.paint,0,.3),3);
  if(shoe.pattern==='yildiz')body+='<text x="'+x+'" y="447" text-anchor="middle" font-size="12" fill="#ffe29b">✦</text>';
 }
 const shortSleeves=(starter||upper.type==='tisort'||upper.type==='bluz')&&(!present(s.dis)||outerType==='yelek');
 const sleeves=shortSleeves?skin:present(s.dis)&&outerType!=='yelek'?outer.paint:topColor;
 body+=path('M88 162 Q74 160 65 193 Q59 219 63 259 L67 280 Q74 285 80 278 L79 242 Q78 215 89 196 Z',sleeves)+path('M152 162 Q166 160 175 193 Q181 219 177 259 L173 280 Q166 285 160 278 L161 242 Q162 215 151 196 Z',sleeves);
 if(shortSleeves)body+=path('M89 161 Q76 159 65 188 L64 207 Q74 213 82 207 Q82 192 93 183Z',topColor)+path('M151 161 Q164 159 175 188 L176 207 Q166 213 158 207 Q158 192 147 183Z',topColor);
 body+=line('M68 193 Q63 219 68 263 M172 193 Q177 219 172 263','#ffffff33',2);
 body+='<ellipse cx="73" cy="284" rx="8" ry="12" fill="'+fabric(skin)+'"/><ellipse cx="167" cy="284" rx="8" ry="12" fill="'+fabric(skin)+'"/>';
 body+=path(torso,topColor,'data-rig-anchor="torso"')+line('M99 155 Q120 173 141 155',mix(topColor,0,.25),4)+line('M99 157 Q120 175 141 157',mix(topColor,255,.3),2);
 body+='<g clip-path="url(#'+torsoClip+')">'+pattern(present(s.tek)?one.pattern:upper.pattern,topColor)+line('M92 208 Q86 247 95 277 M148 208 Q154 247 145 277',mix(topColor,0,.15),2)+'</g>';
 if(starter)body+='<path d="M104 207 L117 187 L125 204 L132 196 L144 211 H99Z" fill="'+(female?'#f4e7c7':'#54b1b8')+'"/><path d="M112 197 L117 187 L122 199" fill="#fff8eb"/>';
 if(upper.type==='gomlek')body+=path('M100 155 L119 170 L109 186 L96 167 Z',mix(topColor,255,.17))+path('M140 155 L121 170 L131 186 L144 167 Z',mix(topColor,255,.17))+line('M120 173 V281',mix(topColor,0,.28),1.4)+[190,213,236,259].map(y=>'<circle cx="124" cy="'+y+'" r="2" fill="#f9f8ed"/>').join('');
 if(upper.type==='kazak')body+=path('M104 146 Q120 153 136 146 V164 Q120 174 104 164 Z',topColor)+line('M108 153 V164 M116 154 V168 M124 154 V168 M132 153 V164','#ffffff45',1.4);
 if(upper.type==='sweat')body+=path('M98 168 Q78 136 106 143 Q120 154 134 143 Q162 136 142 168 L134 157 L106 157 Z',mix(topColor,0,.17))+line('M107 159 L104 194 M133 159 L136 194','#fff9',2)+path('M99 226 H141 L145 251 H95 Z',mix(topColor,0,.1));
 if(upper.type==='bluz')body+=[99,107,115,123,131,139].map(x=>'<circle cx="'+x+'" cy="164" r="4" fill="'+mix(topColor,255,.35)+'"/>').join('');
 if(upper.type==='yoresel')body+=path('M97 164 L113 171 L110 280 H89 Z','#35214e')+path('M143 164 L127 171 L130 280 H151 Z','#35214e')+line('M103 177 L100 268 M137 177 L140 268','#f7cf76',3);
 if(present(s.tek)){
  if(one.type==='tulum')body+=path('M89 260 H151 L147 326 H124 L120 310 L116 326 H93 Z',one.paint)+line('M99 162 V246 M141 162 V246','#ffffff66',5)+path('M105 199 H135 V224 H105 Z',mix(one.paint,0,.12));
  else{const bottom=one.type==='ferace'?427:415;body+=path('M87 253 H153 Q158 329 176 '+bottom+' Q120 '+(bottom+20)+' 64 '+bottom+' Q82 329 87 253Z',one.paint);body+=pattern(one.pattern,one.paint,86,286,70,bottom-290)+line('M94 286 Q89 347 81 '+(bottom-5)+' M146 286 Q151 347 159 '+(bottom-5),mix(one.paint,0,.16),2);if(one.type==='ferace')body+=line('M120 169 V'+bottom,mix(one.paint,0,.3),2);}
 }else if(['uzunetek','pileli','klos'].includes(lower.type)){
  const bottom=lower.type==='uzunetek'?418:lower.type==='pileli'?355:372;
  body+=path('M88 278 H152 Q161 323 174 '+bottom+' Q120 '+(bottom+12)+' 66 '+bottom+' Q79 322 88 278Z',lower.paint)+pattern(lower.pattern,lower.paint,86,302,66,bottom-303);
  if(lower.type==='pileli')for(let x=91;x<151;x+=10)body+=line('M'+x+' 285 L'+(x+(x-120)*.45)+' '+bottom,mix(lower.paint,0,.23),1.4);
 }
 if(outerColor){
  const bottom=outerType==='onluk'||outerType==='yagmurluk'||outerType==='itfaiye'?331:282;
  body+=path('M91 158 L109 168 L110 '+bottom+' L83 '+bottom+' L84 213 Q75 180 91 158Z',outerColor)+path('M149 158 L131 168 L130 '+bottom+' L157 '+bottom+' L156 213 Q165 180 149 158Z',outerColor);
  body+=line('M109 175 V'+(bottom-5)+' M131 175 V'+(bottom-5),starter?'#edb15a':mix(outerColor,255,.45),2);
  body+=path('M90 243 L104 232 L105 257 H88Z',mix(outerColor,0,.14))+path('M150 243 L136 232 L135 257 H152Z',mix(outerColor,0,.14));
  if(starter||outerType==='mont')body+=path('M89 161 Q82 142 103 140 L119 151 L109 169Z',outerColor)+path('M151 161 Q158 142 137 140 L121 151 L131 169Z',outerColor);
  if(outerType==='ceket'||outerType==='onluk')body+=path('M92 156 L115 174 L102 201 L92 185 L104 176 Z',mix(outerColor,255,.25))+path('M148 156 L125 174 L138 201 L148 185 L136 176 Z',mix(outerColor,255,.25));
  if(outerType==='onluk')body+=line('M145 188 V202 M138 195 H152','#5b9bea',2.5);
  if(outerType==='itfaiye')body+=line('M83 249 H109 M131 249 H157','#fde047',8);
 }
 if(upper.type==='kahraman'){
  const marks={kanat:'M120 224 C88 212 100 192 115 204 L120 214 L125 204 C140 192 152 212 120 224Z',kristal:'M120 192 L138 211 L120 234 L102 211 Z',firtina:'M129 189 L106 216 H120 L111 238 L137 207 H123Z',anka:'M120 228 C90 216 95 196 95 196 L110 207 L120 186 L130 207 L145 196 C145 210 137 222 120 228Z',galaksi:'M120 187 L127 203 L145 205 L132 217 L136 235 L120 225 L104 235 L108 217 L95 205 L113 203Z',ejderha:'M101 198 L103 184 L117 198 L128 190 L137 181 L139 201 L151 214 L136 234 L118 238 L100 224 L93 211Z'};
  body+='<path d="'+(marks[upper.pattern]||marks.kanat)+'" fill="'+(upper.pattern==='ejderha'?'#d9f99d':upper.pattern==='kristal'?'#a5f3fc':'#ffe19b')+'" stroke="#fff8" stroke-width="1.5"/>';
  body+=line('M94 167 L106 175 M146 167 L134 175','#ffe19b',4);
 }
 if(!present(s.ust)&&!present(s.tek)){
  if(s.kiyafet==='forma')body+=path('M105 157 L120 170 L135 157 L129 182 L120 176 L111 182Z','#f2eee1')+path('M119 173 H123 L125 182 L122 218 L117 213 L117 181Z','#79529a');
  if(s.kiyafet==='kazak')body+=pattern('cizgi',topColor);
  if(s.kiyafet==='esofman')body+=line('M92 174 L88 270 M148 174 L152 270','#e3f4ff',4);
  if(s.kiyafet==='astronot')body+=path('M102 191 H140 V225 H102Z','#b3c2d3')+'<circle cx="114" cy="207" r="4" fill="#ef8798"/><circle cx="130" cy="207" r="4" fill="#74bb9c"/>'+line('M105 161 H138','#a4b4c5',7);
  if(s.kiyafet==='buyucu')body+=path('M87 268 H153 L174 414 Q120 434 66 414Z',topColor)+pattern('yildiz',topColor,91,282,62,120);
  if(s.kiyafet==='kahraman'){back+=path('M88 165 L57 350 Q120 370 183 350 L152 165Z','#9f5079');body+='<path d="M120 190 L127 207 L145 209 L131 221 L135 239 L120 229 L105 239 L109 221 L95 209 L113 207Z" fill="#f6d272"/>';}
 }
 // Accessories share the rig's wrist, neck and shoulder anchors.
 if(accessory.type==='canta')front+=line('M93 164 L163 279',mix(accessory.paint,0,.3),5)+path('M151 265 Q169 257 179 273 V309 Q160 320 148 308Z',accessory.paint)+path('M155 286 H174 V305 H155Z',mix(accessory.paint,0,.12));
 if(accessory.type==='saat')front+=path('M63 272 H81 V284 H63Z',accessory.paint)+'<circle cx="72" cy="278" r="6" fill="#f9f8f0" stroke="'+accessory.paint+'" stroke-width="2"/>';
 if(accessory.type==='atki')front+=path('M99 143 Q120 157 141 143 L144 157 Q127 171 98 157Z',accessory.paint)+path('M132 159 L141 203 L124 205 L122 162Z',accessory.paint);
 if(accessory.type==='rozet')front+='<circle cx="141" cy="193" r="9" fill="'+fabric(accessory.paint)+'" stroke="#ffe0a0" stroke-width="2"/><text x="141" y="197" text-anchor="middle" font-size="12" fill="#fff6d0">★</text>';
 // The face texture contains no clothing: only this fixed head crop is displayed.
 const faceContour=female?'M91 88 Q91 74 118 70 Q144 75 148 91 L148 103 Q144 117 133 122 L119 128 Q99 122 93 111 Z':'M84 90 Q89 70 120 72 Q152 69 156 89 L154 110 Q145 129 122 133 Q100 131 89 115 Z';
 const faceClip=uid+'Face';defs+='<clipPath id="'+faceClip+'">'+(nativeHead?'<rect x="42" y="0" width="158" height="170"/>':'<path d="'+faceContour+'"/>')+'</clipPath>';
 if(!nativeHead)head+='<ellipse cx="88" cy="106" rx="8" ry="13" fill="'+fabric(skin)+'"/><ellipse cx="155" cy="105" rx="8" ry="13" fill="'+fabric(skin)+'"/>'+path(female?'M84 88 C82 63 96 48 120 48 C145 48 160 64 158 88 L153 107 C149 120 134 130 119 131 C104 128 89 119 85 107 Z':'M84 88 C82 63 96 48 120 48 C145 48 160 64 158 88 L156 110 C153 128 139 135 122 135 C103 133 88 127 85 110 Z',skin,'data-rig-anchor="face-shell"');
 let toneFilter='';
 if(!nativeHead){const base=[246,201,163],rgb=[0,2,4].map(i=>parseInt(skin.slice(i+1,i+3),16));const fid=uid+'Tone';defs+='<filter id="'+fid+'" color-interpolation-filters="sRGB"><feComponentTransfer>'+['R','G','B'].map((ch,i)=>'<feFunc'+ch+' type="linear" slope="'+(rgb[i]/base[i])+'"/>').join('')+'</feComponentTransfer></filter>';toneFilter='filter="url(#'+fid+')"';}
 head+='<g clip-path="url(#'+faceClip+')">'+faceImage(toneFilter)+'</g>';
 const eyes=female?[[105,89],[135,93]]:[[107,92],[138,87]],mouth=female?[119,114]:[127,115];
 // Restore natural eye whites for skin recoloring; expressions replace both source eyes.
 if(!nativeHead&&(!s.goz||s.goz==='normal')){const key=uid+'Eyes';defs+='<clipPath id="'+key+'">'+eyes.map(([x,y])=>'<ellipse cx="'+x+'" cy="'+y+'" rx="9" ry="10"/>').join('')+'</clipPath>';head+='<g clip-path="url(#'+key+')">'+faceImage('',true)+'</g>';}
 if(s.goz&&s.goz!=='normal')for(let i=0;i<eyes.length;i++){
  const [x,y]=eyes[i],kind=s.goz;head+=patch(x,y,15,14);
  if(kind==='mutlu'||kind==='kirp'&&i===1)head+=line('M'+(x-7)+' '+y+' Q'+x+' '+(kind==='mutlu'?y-8:y+7)+' '+(x+7)+' '+y,'#39251e',2.8);
  else if(kind==='yildiz'||kind==='kalp')head+='<text x="'+x+'" y="'+(y+7)+'" text-anchor="middle" font-size="22" fill="'+(kind==='kalp'?'#f45b86':'#f6c64c')+'">'+(kind==='kalp'?'♥':'★')+'</text>';
  else{head+='<ellipse cx="'+x+'" cy="'+y+'" rx="12" ry="13" fill="#fff9ed"/>'+ '<ellipse cx="'+x+'" cy="'+y+'" rx="8.2" ry="10.5" fill="'+fabric('#8b541e')+'"/><ellipse cx="'+x+'" cy="'+(y+.8)+'" rx="4.2" ry="7" fill="#251c1a"/><ellipse cx="'+(x-2)+'" cy="'+(y-4)+'" rx="2.5" ry="3" fill="#fff"/>';}
 }
 if(s.agiz&&s.agiz!=='gulumse'){
  const [x,y]=mouth;head+=patch(x,y,18,12);
  if(s.agiz==='saskin')head+='<ellipse cx="'+x+'" cy="'+(y+1)+'" rx="5" ry="7" fill="#793728"/>';
  else if(s.agiz==='kocaman')head+='<path d="M'+(x-13)+' '+(y-5)+' Q'+x+' '+(y+19)+' '+(x+13)+' '+(y-5)+'Z" fill="#793728"/><path d="M'+(x-11)+' '+(y-4)+' H'+(x+11)+' L'+(x+8)+' '+y+' H'+(x-8)+'Z" fill="#fff9ed"/>';
  else if(s.agiz==='dil')head+=line('M'+(x-10)+' '+(y-2)+' Q'+x+' '+(y+8)+' '+(x+10)+' '+(y-2),'#793728',2.5)+'<path d="M'+(x-4)+' '+(y+3)+' Q'+x+' '+(y+15)+' '+(x+5)+' '+(y+3)+'Z" fill="#ef7b98"/>';
  else head+=line('M'+(x-10)+' '+y+' Q'+(x-4)+' '+(y+8)+' '+x+' '+y+' Q'+(x+4)+' '+(y+8)+' '+(x+10)+' '+y,'#793728',2.4);
 }
 if(s.detay==='yanak'||s.detay==='ikisi')head+='<ellipse cx="91" cy="107" rx="6" ry="3.5" fill="#f58fa2" opacity=".3"/><ellipse cx="150" cy="107" rx="6" ry="3.5" fill="#f58fa2" opacity=".3"/>';
 if(s.detay==='cil'||s.detay==='ikisi')head+=[[91,100],[96,104],[87,105],[148,101],[153,104],[144,105]].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r=".9" fill="'+mix(skin,0,.3)+'"/>').join('');
 // Hair uses the same scalp and temple anchors for every editable style/color.
 if(!covered&&!nativeHead&&!fittedHat){
  let scalp='M73 83 Q62 54 84 36 Q101 22 127 29 Q167 25 174 76 L162 86 Q153 63 133 55 Q122 76 98 73 Q84 75 73 83Z';
  if(hairStyle==='kirpi')scalp='M72 86 L77 53 L86 62 L96 26 L107 46 L123 18 L133 44 L151 27 L157 54 L169 44 L175 86 Q157 65 135 65 Q109 83 92 71Z';
  if(hairStyle==='bob')scalp='M72 89 Q62 37 107 28 Q163 15 174 87 L165 88 L156 62 Q126 77 93 64 L78 91Z';
  if(hairStyle==='topuz')scalp='M72 86 Q67 37 110 32 Q158 25 173 83 Q144 57 120 60 Q93 70 72 86Z';
  head+=path(scalp,hairPaint)+line('M83 58 Q111 31 146 43 M79 70 Q92 56 106 54 M144 49 Q160 60 162 72',mix(hairPaint,255,.22),2);
  if(['uzun','orgu','bob','atkuyrugu'].includes(hairStyle))head+=path('M73 74 Q68 108 82 137 L92 139 Q78 108 91 76Z',hairPaint)+path('M165 73 Q177 110 160 137 L152 135 Q165 103 150 75Z',hairPaint);
  if(hairStyle==='kivircik')head+=[[80,58,15],[93,38,16],[116,30,17],[142,35,17],[162,54,17],[74,79,13],[170,77,13]].map(([x,y,r])=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fabric(hairPaint)+'"/>').join('');
 }
 // A fitted hat covers the crown; only rounded, attached temple hair remains visible.
 if(fittedHat)head+=path('M84 67 Q89 61 96 66 L95 82 Q89 91 88 103 Q82 91 84 67Z',hairPaint)+path('M147 66 Q154 61 159 68 L158 96 L153 103 Q152 86 147 81Z',hairPaint);
 if(!covered&&!nativeHead&&(hairStyle==='orgu'||female&&hairStyle==='uzun')){
  const sides=hairStyle==='orgu'?[80,162]:[83];
  for(const x of sides){for(let y=121;y<169;y+=11)head+='<ellipse cx="'+(x+(y%22?-2:2))+'" cy="'+y+'" rx="8" ry="7" fill="'+fabric(hairPaint)+'"/>';head+='<path d="M'+(x-5)+' 173 Q'+x+' 190 '+(x+5)+' 173Z" fill="'+fabric(hairPaint)+'"/><rect x="'+(x-6)+'" y="166" width="12" height="5" rx="2" fill="#cf86ae"/>';}
 }
 if(covered){const cloth=parse(s.bas);back+=path('M70 81 Q61 23 119 17 Q178 16 177 84 L184 163 Q153 183 133 160 L120 140 L102 161 Q69 184 57 164Z',cloth.paint);head+=path('M74 82 Q71 41 113 31 Q160 24 169 77 L161 88 Q153 52 125 47 Q92 47 81 90Z',cloth.paint)+path('M73 102 Q70 135 99 148 L108 161 L76 167 L64 130Z',cloth.paint)+path('M166 99 Q174 131 140 148 L129 160 L166 169 L178 132Z',cloth.paint)+line('M76 134 Q121 172 166 134',mix(cloth.paint,255,.3),2)+pattern(cloth.pattern,cloth.paint,72,137,100,25);if(cloth.type==='bone')head+=line('M82 73 Q117 31 160 73',mix(cloth.paint,255,.5),7);}
 // Hats are anchored to the crown (not the old 200×200 avatar).
 let hatLayer='';
 if(hat==='kep')hatLayer=path('M80 72 Q78 30 119 28 Q160 27 163 70 Q122 65 80 72Z','#de525b')+path('M113 67 Q145 59 176 75 Q146 82 114 76Z','#b43142')+line('M104 34 Q110 47 108 65','#ffffff77',2);
 if(hat==='bere')hatLayer=path('M80 72 Q77 26 119 25 Q160 24 163 70Z','#39a76e')+path('M79 64 Q121 73 164 63 V79 Q121 88 80 79Z','#f1c675')+'<circle cx="119" cy="25" r="9" fill="'+fabric('#f1c675')+'"/>';
 if(hat==='tac')hatLayer=path('M80 58 L83 30 L103 45 L120 17 L137 45 L157 30 L160 58Z','#eab944')+'<circle cx="120" cy="47" r="4" fill="#d8617d"/>';
 if(hat==='buyucu')hatLayer=path('M80 63 L130 5 L158 63Z','#7347b6')+'<ellipse cx="120" cy="64" rx="61" ry="10" fill="'+fabric('#513182')+'"/><text x="121" y="42" font-size="18" fill="#ffe2a5">✦</text>';
 if(hat==='parti')hatLayer=path('M92 50 L122 4 L149 50Z','#ef79a7')+line('M102 31 H138','#f6cf61',6)+'<circle cx="122" cy="7" r="7" fill="#f6cf61"/>';
 if(hat==='kulaklik')hatLayer=line('M73 93 Q67 18 120 19 Q174 18 171 92','#373356',7)+path('M67 78 H79 V106 H65Z','#ef7d9d')+path('M164 77 H176 V104 H164Z','#ef7d9d');
 if(hat==='cicek')hatLayer=[[76,64],[88,48],[109,41],[132,41],[154,51],[168,67]].map(([x,y],i)=>'<circle cx="'+x+'" cy="'+y+'" r="7" fill="'+['#f4aac7','#edce77','#aa8fdb'][i%3]+'"/><circle cx="'+x+'" cy="'+y+'" r="2.5" fill="#fff6df"/>').join('');
 head+=hatLayer;
 // One rigid, level frame: lenses, bridge and temples cannot drift independently.
 if(present(s.gozluk)){
  const glasses=s.gozluk,cx=(eyes[0][0]+eyes[1][0])/2,y=(eyes[0][1]+eyes[1][1])/2,lx=cx-17,rx=cx+17,stroke=glasses==='yildiz'?'#d85c8f':'#3a354b';
  head+='<g data-rig-layer="eyewear">'+line('M'+(lx-13)+' '+(y-2)+' L86 '+(y-5)+' M'+(rx+13)+' '+(y-2)+' L157 '+(y-5),stroke,2.5);
  if(glasses==='yuvarlak'||glasses==='gunes'){const dark=glasses==='gunes';head+=[lx,rx].map(x=>'<ellipse data-eyewear-lens="true" cx="'+x+'" cy="'+y+'" rx="14" ry="13" fill="'+(dark?'#222c43':'#ffffff22')+'" stroke="'+stroke+'" stroke-width="2.5"/>').join('');}
  else head+=[lx,rx].map(x=>'<path data-eyewear-lens="true" d="M'+x+' '+(y-15)+' l4 10 11 1-9 7 3 11-9-6-9 6 3-11-9-7 11-1Z" fill="#f7b4d055" stroke="'+stroke+'" stroke-width="2"/>').join('');
  head+=line('M'+(lx+13)+' '+(y-2)+' Q'+cx+' '+(y-6)+' '+(rx-13)+' '+(y-2),stroke,2.5)+'</g>';
 }
 if(present(s.cik))details+='<circle cx="187" cy="51" r="17" fill="#fff8ee" stroke="#e4c5ed" stroke-width="2"/><text x="187" y="57" text-anchor="middle" font-size="19">'+esc(String(s.cik).replace(/^c:/,''))+'</text>';
 if(s.dost==='papagan')details+='<g transform="translate(167 185)"><ellipse cx="0" cy="10" rx="11" ry="15" fill="'+fabric('#43bb92')+'"/><circle cy="-4" r="9" fill="'+fabric('#45c8ac')+'"/><path d="M7-7 18-3 7 1Z" fill="#f3b15a"/><circle cx="3" cy="-6" r="2" fill="#233247"/></g>';
 if(s.dost==='kedi')details+='<g transform="translate(168 191)"><path d="M-13-5-12-19-4-11 5-11 13-19 14-5Z" fill="'+fabric('#e5a778')+'"/><ellipse rx="16" ry="13" fill="'+fabric('#e5a778')+'"/><circle cx="-5" cy="-2" r="2" fill="#293349"/><circle cx="5" cy="-2" r="2" fill="#293349"/>'+line('M-3 6 Q0 9 3 6','#6c4235',1.5)+'</g>';
 if(s.dost==='yildizcik')details+='<path d="M178 166 L184 179 198 181 187 191 191 205 178 198 165 205 169 191 158 181 172 179Z" fill="'+fabric('#f4ca69')+'"/>';
 let background='',frame='';const bg={mor:'#eee4fc',pembe:'#fae4ef',mavi:'#dfeeff',orman:'#dbf0e4',okyanus:'#cdebf5',gunbatimi:'#f4d3bf',uzay:'#242845',karnaval:'#fae8bb'};
 if(!full){background='<rect width="240" height="240" fill="'+(bg[s.arka]||'#f2eaf9')+'"/>';if(s.arka==='gokkusagi'||s.arka==='karnaval')background+=['#fad4cb','#ffe6b2','#d7f3cf','#c7e6fa','#d9ccf2'].map((x,i)=>'<path d="M'+(i*50-50)+' 0 L'+(i*50+80)+' 0 L'+(i*50-20)+' 240 L'+(i*50-150)+' 240Z" fill="'+x+'"/>').join('');if(s.arka==='uzay')background+=[[30,35],[200,44],[31,190],[202,189]].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="2" fill="#fff"/>').join('');if(present(s.cerceve))frame='<circle cx="120" cy="120" r="115" fill="none" stroke="'+(s.cerceve==='altin'?'#e7b94e':s.cerceve==='neon'?'#70d7e3':'#bd91d5')+'" stroke-width="6"/>';}
 const content=background+'<g data-rig-layer="back">'+back+'</g><g data-rig-layer="body" transform="translate(0 -8)">'+body+'</g><g data-rig-layer="head">'+head+'</g><g data-rig-layer="accessories">'+'<g transform="translate(0 -8)">'+front+'</g>'+details+'</g>';
 const clip=uid+'Portrait';if(!full)defs+='<clipPath id="'+clip+'"><circle cx="120" cy="120" r="115"/></clipPath>';
 return '<svg class="dm-adventure-avatar dm-modular-avatar" data-avatar-rig="3" data-avatar-gender="'+cins+'" viewBox="0 0 240 '+(full?480:240)+'" width="'+(full?Math.round(px/2):px)+'" height="'+px+'" role="img" aria-label="'+(female?'Kız':'Erkek')+' macera karakteri"><defs>'+defs+'</defs><g '+(!full?'clip-path="url(#'+clip+')"':'')+'>'+content+'</g>'+frame+'</svg>';
}
window.dmAdventureAvatar={render};
})();
