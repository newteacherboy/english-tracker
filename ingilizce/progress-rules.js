(function(root){
  'use strict';
  const thresholds=[0,40,100,180,300,480,720,1040,1450,1950,2550,3250,4050,4950,5950];
  for(let gap=1050;thresholds.length<30;gap+=50)thresholds.push(thresholds.at(-1)+gap);/* 30. seviyeden sonra her seviye belirgin şekilde daha fazla XP ister. */for(let gap=2400;thresholds.length<40;gap+=400)thresholds.push(thresholds.at(-1)+gap);
  /* Bir oyun turu en iyi parkur durağından her zaman 20 XP az kazandırır (sunucu: dm_game_xp_cap). */
  const PARKUR_XP_MAX=192,GAME_XP_MAX=PARKUR_XP_MAX-20,GAME_BASE_XP=80;
  const positive=n=>Number.isFinite(Number(n))?Math.max(0,Math.trunc(Number(n))):0;
  function migrate(state){
    if(!state||typeof state!=='object')return 0;
    // A server rebase replaces historical XP. Weekly/daily logs must never restore it.
    if(state.dmParkurMigration?.version===1){
      state.totalXp=positive(state.totalXp);
      // Ephemeral write protocol: the database removes it before storage so an old
      // client cannot echo it back and restore the old log-derived XP counter.
      state.dmProgressProtocol=1;
      return state.totalXp;
    }
    const recovered=Math.max(Object.values(state.log||{}).reduce((s,n)=>s+positive(n),0),positive(state.lig?.xp),positive(state.xpGun?.xp));
    state.totalXp=Math.max(positive(state.totalXp),recovered);
    return state.totalXp;
  }
  function parkurBaseXp(stars){
    return [0,42,48,60][Math.min(3,Math.max(1,positive(stars)))];
  }
  function progress(xp){xp=positive(xp);let index=0;while(index<39&&xp>=thresholds[index+1])index++;
    const next=thresholds[index+1]??null;
    return {level:index+1,xp,start:thresholds[index],next,remaining:next===null?0:next-xp,ratio:next===null?1:(xp-thresholds[index])/(next-thresholds[index])};
  }
  function gameReward(o,{ordinal=1,streak=1,level=1,xpBoost=false,goldBoost=false}={}){
    const correct=positive(o?.dogru),wrong=positive(o?.yanlis),baseXp=positive(o?.xp);
    if(!correct||correct>8||!baseXp)return {xp:0,gold:0,bonus:1};
    const stars=correct/(correct+wrong)>=.8?3:correct/(correct+wrong)>=.5?2:1;
    const daily=ordinal<=3?2:ordinal>12?.5:1;
    const double=level>=15&&Number(o.odulCarpan)>1;
    const xpFactor=double||(level>=15&&xpBoost)?2:1;
    const goldFactor=double||(level>=15&&goldBoost)?2:1;
    return {xp:Math.min(GAME_XP_MAX,Math.round(Math.min(baseXp,GAME_BASE_XP)*daily*xpFactor)),gold:Math.round(Math.round([0,4,7,10][stars]*daily*goldFactor)*Math.min(1.5,Math.max(1,Number(streak)||1))),bonus:Math.max(xpFactor,goldFactor)};
  }
  function discount(price,{first=false,showcase=false}={}){return Math.round(positive(price)*(first?.75:showcase?.7:1));}
  const rules=Object.freeze({PARKUR_XP_MAX,GAME_XP_MAX,GAME_BASE_XP,thresholds:Object.freeze(thresholds),positive,migrate,progress,parkurBaseXp,gameReward,discount});
  root.DijiProgressRules=rules;if(typeof module!=='undefined'&&module.exports)module.exports=rules;
})(globalThis);
