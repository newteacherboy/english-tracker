/* Native vector photo poses: shared by wardrobe, character editor and gallery. */
(()=>{'use strict';
const list=Object.freeze([{"id": "rahat", "ad": "Rahat poz", "level": 1, "f": 0}, {"id": "selam", "ad": "Merhaba!", "level": 1, "f": 0}, {"id": "belde", "ad": "Eller belde", "level": 10, "f": 200}, {"id": "capraz", "ad": "Kollar kavuşuk", "level": 15, "f": 350}, {"id": "basparmak", "ad": "Harikasın!", "level": 20, "f": 550}, {"id": "dusunur", "ad": "Düşünür", "level": 25, "f": 800}, {"id": "kalp", "ad": "Kalpten sevgi", "level": 30, "f": 1100}, {"id": "kahraman", "ad": "Süper kahraman", "level": 35, "f": 1450}, {"id": "kutlama", "ad": "Büyük kutlama", "level": 40, "f": 1850}].map(p=>Object.freeze(p)));
const shapes={
 rahat:[[24,231,32,286,'relax',-14],[178,226,148,259,'relax',30]],
 selam:[[24,230,33,286,'relax',0],[188,179,179,123,'open',12]],
 belde:[[12,224,63,249,'fist',-55],[188,224,137,249,'fist',55]],
 capraz:[[21,239,126,226,'relax',-80],[179,251,73,242,'relax',80]],
 basparmak:[[24,231,32,286,'relax',0],[184,239,154,193,'thumb',-5]],
 dusunur:[[25,244,127,253,'relax',-80],[171,222,123,146,'think',-25]],
 kalp:[[15,239,90,220,'heart',0],[185,239,110,220,'heart',0]],
 kahraman:[[12,224,63,249,'fist',-55],[188,142,185,85,'fist',8]],
 kutlama:[[8,149,10,100,'open',-22],[192,149,190,100,'open',22]]
};
function hand(type,skin,mirror){
 const stroke='stroke="#6b4552" stroke-opacity=".4" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"';
 let art='<ellipse cx="0" cy="0" rx="9" ry="11" fill="'+skin+'" '+stroke+'/>';
 const finger=(d,w=4.6)=>'<path d="'+d+'" fill="none" stroke="'+skin+'" stroke-width="'+w+'" stroke-linecap="round"/>';
 if(type==='open')art+=finger('M-7 -3 L-13 -13 M-4 -8 L-6 -24 M1 -9 L1 -27 M6 -7 L8 -23 M8 -2 L15 -14');
 if(type==='peace')art+=finger('M-4 -7 L-8 -28 M4 -7 L10 -27',6)+finger('M-8 2 L2 4',5);
 if(type==='thumb')art+=finger('M-6 -3 Q-13 -9 -9 -24',7)+'<path d="M-3 -6 H5 M-3 -1 H6 M-3 4 H5" fill="none" '+stroke+'/>';
 if(type==='think')art+=finger('M-3 -5 L-4 -23',5);
 if(type==='heart')art+=finger('M-5 -6 Q-7 -24 1 -24 Q8 -25 10 -16',5)+finger('M6 2 L10 9',5);
 if(type==='fist')art+='<path d="M-5 -5 V1 M0 -6 V0 M5 -5 V1" fill="none" '+stroke+'/>';
 return '<g transform="scale('+mirror+' 1)">'+art+'</g>';
}
function arms(s,cloth,skin,watch){
 const pose=shapes[s.durus];if(!pose)return '';
 return '<g data-pose-arms="'+s.durus+'">'+pose.map((a,i)=>{
 const [ex,ey,wx,wy,gesture,rotation]=a,sx=i?154:46;
 const path='M'+sx+' 190 Q'+ex+' '+ey+' '+ex+' '+ey+' L'+wx+' '+wy;
 return '<g data-pose-arm="'+i+'"><path d="'+path+'" fill="none" stroke="#43344c" stroke-opacity=".22" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"/><path d="'+path+'" fill="none" stroke="'+cloth+'" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>'+(watch&&i===0?'<circle cx="'+wx+'" cy="'+(wy+5)+'" r="9" fill="'+watch+'"/><circle cx="'+wx+'" cy="'+(wy+5)+'" r="5" fill="#fff"/>':'')+'<g transform="translate('+wx+' '+wy+') rotate('+rotation+')">'+hand(gesture,skin,gesture==='heart'?(i?-1:1):(i?1:-1))+'</g></g>';
 }).join('')+'</g>';
}
window.dmCharacterPoses=Object.freeze({list,has:id=>Object.hasOwn(shapes,id),arms});
})();
