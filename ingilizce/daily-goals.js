/* The existing daily XP target and the same daily task reward handlers share one panel. */
(function(){'use strict';
 const oldOpen=window.yoHedefAc,oldModal=window.yoModalAc,oldClose=window.yoModalKapat;
 function hide(){const tasks=document.getElementById('dmDailyTasks');if(tasks)tasks.hidden=true;}
 if(typeof oldModal==='function')window.yoModalAc=function(){hide();return oldModal.apply(this,arguments);};
 if(typeof oldClose==='function')window.yoModalKapat=function(){hide();return oldClose.apply(this,arguments);};
 if(typeof oldOpen==='function')window.yoHedefAc=function(){
  window.yoGomuluHedef=null;
  oldOpen.apply(this,arguments);
  const modal=document.getElementById('yoModal'),body=document.getElementById('yoGovde');
  if(!modal?.classList.contains('acik')||!body)return;
  window.soPanelCiz?.();
  const tasks=document.getElementById('dmDailyTasks');
  if(tasks){body.before(tasks);tasks.hidden=false;}
 };
})();
