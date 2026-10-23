/* Lazy-load real 3D only when a route is visible. No wallet writes in the browser. */
(()=>{'use strict';
let enginePromise=null,active=null,serial=0;
const owner=()=>typeof aktifOgrenciAdi!=='undefined'?String(aktifOgrenciAdi||''):'';
const character=()=>typeof yo!=='undefined'?yo?.karakter:null;
async function mount(section,map){
 if(!section||section.dataset.explorationMounted)return;
 section.dataset.explorationMounted='loading';const turn=++serial;
 active?.dispose();active=null;
 try{
  enginePromise??=import('./route-exploration-world.mjs?v=1');
  const engine=await enginePromise;
  if(!section.isConnected||turn!==serial)return;
  const captured=owner(),canvas=section.querySelector('.rt-v3-canvas');
  section.querySelectorAll('.rt-v3-tools>button').forEach(b=>{const label=b.getAttribute('aria-label')||b.textContent.trim();b.setAttribute('aria-label',label);b.title=label;});
  const launch=index=>{
   if(captured!==owner())return;
   const step=map.steps[index];if(!step?.available)return;
   if(map.learn)window.dmStoryPath?.open(Number(step.id));
   else window.dmSchoolStopOpen?.(Number(step.b),Number(step.d));
  };
  const source=map.steps[map.current-1],sourceStop=source?.done?Number(map.learn?source.id:source.no):null;
  async function request(action,pickup){
   if(!sourceStop||!captured||captured!==owner())return {ok:true,claims:[],preview:true};
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
   try{
    const response=await fetch(typeof apiURL!=='undefined'?apiURL:'',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:'routeExploration',action,route:map.learn?'learning':'school',stop:sourceStop,pickup,ogrenci:captured,t:localStorage.getItem('ing_token')||''})});
    const data=await response.json();if(!response.ok||!data.ok)throw Error(data.mesaj||'Bonus kaydedilemedi.');
    if(captured!==owner())throw Error('Hesap değişti.');
    if(data.yo)window.dmApplyRewardState?.(data.yo,captured);
    if(action==='claim'){if(Number.isFinite(data.energy)&&Number.isFinite(data.energyMax))window.headerEnerjiGoster?.(data.energy,data.energyMax);window.dmProgression?.refresh?.(true);}
    return data;
   }finally{clearTimeout(timeout);}
  }
  const instance=engine.createWorld(canvas,{steps:map.steps,current:map.current,learn:map.learn,character:character(),launch,request,hasRewards:!!sourceStop});
  active=instance;section.dataset.explorationMounted='true';
  const continueButton=section.querySelector('.rt-continue');
  if(continueButton){continueButton.hidden=true;instance.onDispose(()=>{continueButton.hidden=false;});}
 }catch(error){section.dataset.explorationMounted='failed';console.warn('3D parkur açılamadı; durak haritası kullanılabilir.',error);}
}
function clear(){serial++;active?.dispose();active=null;}
document.addEventListener('dm:login',clear);
document.addEventListener('dm:state',()=>active?.setCharacter(character()));
window.dmRouteExploration={mount,clear};
})();
