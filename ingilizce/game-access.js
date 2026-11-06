/* Game scope is independent of Parkur. Prefer the player's class at entry. */
(()=>{
 'use strict';
 function rule(){
  const player=(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci)||
   (typeof aktifOgrenciAdi!=='undefined'&&aktifOgrenciAdi)||'';
  if(!player||typeof globalDataCache==='undefined'||!Array.isArray(globalDataCache))return null;
  const name=String(player).trim().toLowerCase();
  const row=globalDataCache.find(student=>String(student.ogrenci||'').trim().toLowerCase()===name);
  const cls=Number(row?.Sinif);
  return Number.isInteger(cls)&&cls>=1&&cls<=8?{cls}:null;
 }
 window.sinifGridKisitlamaUygula=function(gridId,setClass,updateUnits){
  const grid=document.getElementById(gridId);
  if(!grid)return;
  const buttons=[...grid.querySelectorAll('.sinif-btn')];
  const classes=buttons.map((button,index)=>Number(button.dataset.class)||Number(button.textContent.match(/\d+/)?.[0])||index+1);
  const preferred=classes.indexOf(rule()?.cls);
  const active=preferred<0?0:preferred;
  buttons.forEach((button,index)=>{
   button.disabled=false;
   button.classList.toggle('active',index===active);
  });
  if(!buttons.length)return;
  setClass?.(classes[active]);
  updateUnits?.(classes[active]);
 };
 window.dmGameAccess={rule,reason:()=>'',refresh(){}};
})();
