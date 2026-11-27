(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PapiFarm=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const CROPS={
 wheat:{name:'Buğday',en:'Wheat',minutes:5,cost:1,value:2,level:1,icon:'🌾',color:'#d6a84e'},
 carrot:{name:'Havuç',en:'Carrot',minutes:15,cost:2,value:3,level:1,icon:'🥕',color:'#e89455'},
 tomato:{name:'Domates',en:'Tomato',minutes:30,cost:3,value:4,level:1,icon:'🍅',color:'#db6252'},
 corn:{name:'Mısır',en:'Corn',minutes:60,cost:4,value:5,level:3,icon:'🌽',color:'#edbd56'},
 strawberry:{name:'Çilek',en:'Strawberry',minutes:120,cost:5,value:6,level:5,icon:'🍓',color:'#e46e6b'}
};
const RESOURCES={stone:{name:'Taş',en:'Stone',value:1,color:'#a4a8a0',icon:'◆'},copper:{name:'Bakır',en:'Copper',value:3,color:'#c48454',icon:'◆'},crystal:{name:'Kristal',en:'Crystal',value:5,color:'#70b7d6',icon:'✦'}};
const ANIMAL_PRODUCTS={egg:{name:'Yumurta',en:'Egg',value:2,icon:'🥚'},milk:{name:'Süt',en:'Milk',value:4,icon:'🥛'}};
const ITEMS={...CROPS,...RESOURCES,...ANIMAL_PRODUCTS};
const ANIMALS={chick:{en:'Chick',tr:'Civciv',cost:8,level:1,mature:3,product:'egg',minutes:5},hen:{en:'Hen',tr:'Tavuk',cost:18,level:2,mature:0,product:'egg',minutes:5},cow:{en:'Cow',tr:'İnek',cost:36,level:3,mature:0,product:'milk',minutes:12}};
const ANIMAL_SLOTS=[[1.9,-8.7],[3.5,-8.7],[5.1,-8.7],[1.9,-10.2],[3.5,-10.2],[5.1,-10.2]];
const STRUCTURES={home:{en:'Farmhouse',tr:'Çiftlik evi',pos:[-3.75,4.25]},barn:{en:'Animal barn',tr:'Hayvan barınağı',pos:[3.58,4.25]}};

const REGIONS={
 spring:{name:'Spring Valley',tr:'Bahar Vadisi',season:'Spring',desc:'The main farm and new fields across the river.',cost:0,color:'#87b766',plots:[0,1,2,3,4,5,6,7,8],spawn:[5.1,-3.45]},
 summer:{name:'Coral Coast',tr:'Mercan Sahili',season:'Summer',desc:'Turquoise water, palms and 3 new fields.',cost:30,color:'#e5b66f',plots:[9,10,11],spawn:[4.5,-3.8]},
 autumn:{name:'Golden Woods',tr:'Altın Orman',season:'Autumn',desc:'Autumn leaves, a cabin and 3 new fields.',cost:45,color:'#c38249',plots:[12,13,14],spawn:[4.5,-3.8]},
 winter:{name:'Crystal Mountains',tr:'Kristal Dağları',season:'Winter',desc:'Snowy pines, 3 new fields and mineral deposits.',cost:60,color:'#84b5ce',plots:[15,16,17],spawn:[4.8,-5.8]}
};
const LANDS={extension:{name:'Across the River',tr:'Nehir Ötesi',cost:20,plots:[6,7,8],region:'spring'},summer:{...REGIONS.summer,region:'summer'},autumn:{...REGIONS.autumn,region:'autumn'},winter:{...REGIONS.winter,region:'winter'}};
const PLOT_INFO=[
 [-3.85,-2,.2,'spring'],[-.85,-2,.2,'spring'],[2.15,-2,.2,'spring'],[-3.85,-5,.2,'spring'],[-.85,-5,.2,'spring'],[2.15,-5,.2,'spring'],
 [10.25,-2,.48,'spring'],[13.25,-2,.66,'spring'],[16.25,-2,.70,'spring'],
 [-3.5,-2,.2,'summer'],[-.4,-2,.2,'summer'],[2.7,-2,.2,'summer'],
 [-3.5,-2,.2,'autumn'],[-.4,-2,.2,'autumn'],[2.7,-2,.2,'autumn'],
 [-3.5,-5,.2,'winter'],[-.4,-5,.2,'winter'],[2.7,-5,.2,'winter']
];
const MINE_NODES=[{item:'stone',x:-3.8,y:1.2,minutes:3,amount:3},{item:'copper',x:0,y:1.8,minutes:5,amount:2},{item:'crystal',x:3.8,y:1.2,minutes:8,amount:2}];
const plotRegion=i=>PLOT_INFO[i]?.[3];
function ownsPlot(s,i){if(!Number.isInteger(i)||i<0||i>=PLOT_INFO.length)return false;if(i<6)return true;if(i<9)return !!s.land.extension;return !!s.land[plotRegion(i)]}
function isPlotOpen(s,i){return ownsPlot(s,i)&&!!s.built[i]}
const TASKS=[
 {text:'Plant three carrots.',tr:'Üç tarlaya havuç ek.',op:'plant',crop:'carrot',count:3,xp:3},
 {text:'Water the carrots.',tr:'Havuçları sula.',op:'water',crop:'carrot',count:3,xp:3},
 {text:'Harvest the carrots.',tr:'Havuçların hasadını yap.',op:'harvest',crop:'carrot',count:3,xp:4},
 {text:'Plant two wheat fields.',tr:'İki tarlaya buğday ek.',op:'plant',crop:'wheat',count:2,xp:2},
 {text:'Harvest the wheat.',tr:'Buğday hasadı yap.',op:'harvest',crop:'wheat',count:2,xp:3},
 {text:'Plant two tomato fields.',tr:'İki tarlaya domates ek.',op:'plant',crop:'tomato',count:2,xp:3},
 {text:'Water the tomatoes.',tr:'Domatesleri sula.',op:'water',crop:'tomato',count:2,xp:2},
 {text:'Harvest the tomatoes.',tr:'Domatesleri topla.',op:'harvest',crop:'tomato',count:2,xp:4},
 {text:'Sell three carrots.',tr:'Pazarda üç havuç sat.',op:'sell',crop:'carrot',count:3,xp:3},
 {text:'Expand your farm.',tr:'Nehir ötesinde yeni arazi aç.',op:'expand',crop:'extension',count:1,xp:4},
 {text:'Collect copper.',tr:'Kristal Dağları’nda bakır topla.',op:'mine',crop:'copper',count:2,xp:4}
];
const MAX_LEVEL=50;
const threshold=l=>10*(l-1)+2*(l-1)*(l-1);
function level(s){let l=1;while(l<MAX_LEVEL&&s.xp>=threshold(l+1))l++;return l}
function levelInfo(s){let l=level(s);return {level:l,progress:s.xp-threshold(l),next:l===MAX_LEVEL?0:threshold(l+1)-threshold(l)}}
function animalInfo(a,now=Date.now()){if(!a||!ANIMALS[a.kind])return null;let def=ANIMALS[a.kind],matures=a.at+def.mature*60000;if(now<matures)return {kind:'chick',product:null,ready:false,remaining:matures-now};let kind=a.kind==='chick'?'hen':a.kind;def=ANIMALS[kind];let readyAt=Math.max(a.lastCollect||a.at,matures)+def.minutes*60000;return {kind,product:def.product,ready:now>=readyAt,remaining:Math.max(0,readyAt-now)}}
function tutorial(s){if(s.guide.done)return null;if(!s.structures.home)return {type:'structure',key:'home',text:'Build your farmhouse.',tr:'Çiftlik evini inşa et.',n:1};for(let i=0;i<6;i++)if(!s.built[i])return {type:'field',idx:i,text:'Build field '+(i+1)+'.',tr:(i+1)+'. tarlayı kur.',n:i+2};if(!s.structures.barn)return {type:'structure',key:'barn',text:'Build the animal barn.',tr:'Hayvan barınağını kur.',n:8};if(!s.guide.planted)return {type:'plant',text:'Plant wheat.',tr:'Buğday ek.',n:9};if(!s.guide.watered)return {type:'water',text:'Water the wheat.',tr:'Buğdayı sula.',n:10};if(!s.guide.harvested)return {type:'harvest',text:'Harvest the wheat.',tr:'Buğdayı hasat et.',n:11};if(!s.guide.sold)return {type:'sell',text:'Sell one wheat.',tr:'Pazarda bir buğday sat.',n:12};return null}

function seedCost(s,k){const c=CROPS[k];if(!c)return Infinity;return k==='wheat'&&s.coins<c.cost&&!s.plots.some(Boolean)&&!Object.values(s.inventory).some(n=>n>0)?0:c.cost}
function fresh(now=Date.now()){return {version:2,coins:24,xp:0,plots:Array(PLOT_INFO.length).fill(null),built:Array(PLOT_INFO.length).fill(false),structures:{home:false,barn:false},guide:{done:false,planted:false,watered:false,harvested:false,sold:false},animals:[],land:{extension:false,summer:false,autumn:false,winter:false},region:'spring',mineReady:[0,0,0],inventory:Object.fromEntries(Object.keys(ITEMS).map(k=>[k,0])),task:0,taskProgress:0,taskCounts:Array(TASKS.length).fill(0),earnedTasks:[],harvested:0,settings:{sound:true,music:true,help:false},updatedAt:now}}
function duration(p){return (p.training?20000:CROPS[p.crop].minutes*60000)*(p.watered?.75:1)}
function progress(p,now=Date.now()){if(!p||!CROPS[p.crop])return 0;return Math.max(0,Math.min(1,(now-p.at)/duration(p)))}
function ready(p,now){return !!p&&progress(p,now)>=1}
function remaining(p,now=Date.now()){return p?Math.max(0,duration(p)-(now-p.at)):0}
function validate(raw,now=Date.now()){if(!raw||![1,2].includes(raw.version)||!Array.isArray(raw.plots)||raw.plots.length<6||raw.plots.length>PLOT_INFO.length)return fresh(now);const s=fresh(now);s.coins=Math.max(0,Math.min(1e8,Math.floor(Number(raw.coins)||0)));s.xp=Math.max(0,Math.min(1e8,Math.floor(Number(raw.xp)||0)));for(let k of Object.keys(LANDS))s.land[k]=!!raw.land?.[k];s.region=raw.region&&REGIONS[raw.region]&&(raw.region==='spring'||s.land[raw.region])?raw.region:'spring';const legacy=raw.version===1||!Array.isArray(raw.built);s.built=PLOT_INFO.map((_,i)=>ownsPlot(s,i)&&(legacy||!!raw.built[i]));s.structures={home:legacy||!!raw.structures?.home,barn:legacy||!!raw.structures?.barn};s.guide=legacy?{done:true,planted:true,watered:true,harvested:true,sold:true}:{done:!!raw.guide?.done,planted:!!raw.guide?.planted,watered:!!raw.guide?.watered,harvested:!!raw.guide?.harvested,sold:!!raw.guide?.sold};s.animals=(Array.isArray(raw.animals)?raw.animals:[]).filter(a=>a&&ANIMALS[a.kind]&&Number.isFinite(a.at)).slice(0,ANIMAL_SLOTS.length).map(a=>({kind:a.kind,at:Math.min(a.at,now),lastCollect:Math.min(Number(a.lastCollect)||a.at,now)}));s.mineReady=MINE_NODES.map((_,i)=>Math.max(0,Math.min(now+60*60000,Number(raw.mineReady?.[i])||0)));s.plots=PLOT_INFO.map((_,i)=>{let p=raw.plots[i];return isPlotOpen(s,i)&&p&&CROPS[p.crop]&&Number.isFinite(p.at)?{crop:p.crop,at:Math.min(p.at,now),watered:!!p.watered,training:!!p.training}:null});for(let k in ITEMS)s.inventory[k]=Math.max(0,Math.min(1e8,Math.floor(Number(raw.inventory?.[k])||0)));const oldTask=Math.max(0,Math.min(TASKS.length,Math.floor(Number(raw.task)||0)));s.taskCounts=TASKS.map((q,i)=>Math.max(0,Math.min(q.count,Math.floor(Number(raw.taskCounts?.[i]??(i<oldTask?q.count:i===oldTask?raw.taskProgress:0))||0))));s.earnedTasks=s.taskCounts.map((v,i)=>v>=TASKS[i].count?i:-1).filter(i=>i>=0);s.task=TASKS.findIndex((_,i)=>!s.earnedTasks.includes(i));if(s.task<0)s.task=TASKS.length;s.taskProgress=s.taskCounts[s.task]||0;s.harvested=Math.max(0,Math.floor(Number(raw.harvested)||0));s.settings.sound=raw.settings?.sound!==false;s.settings.music=raw.settings?.music!==false;s.settings.help=!!raw.settings?.help;s.updatedAt=now;return s}
function act(s,op,idx,crop,now=Date.now(),qty=1){if(!s)return {ok:false,message:'Invalid action.'};let p=s.plots[idx],amount=1,msg='',taskDone=false;const err=message=>({ok:false,message});
 if(op==='buildStructure'){if(!STRUCTURES[crop]||s.structures[crop]||s.region!=='spring')return err('This building is unavailable.');s.structures[crop]=true;msg=STRUCTURES[crop].en+' built!'}
 else if(op==='build'){if(!ownsPlot(s,idx)||s.built[idx]||plotRegion(idx)!==s.region)return err('Choose an empty building site.');s.built[idx]=true;msg='Field '+(idx+1)+' built!'}
 else if(op==='skipGuide'){s.guide.done=true;msg='Explore at your own pace.'}
 else if(op==='plant'){if(!isPlotOpen(s,idx)||p||plotRegion(idx)!==s.region)return err('Choose an empty field.');const c=CROPS[crop];if(!c||level(s)<c.level)return err('This crop is not unlocked yet.');const price=seedCost(s,crop);if(s.coins<price)return err('Not enough farm coins.');s.coins-=price;const training=!s.guide.done&&!s.guide.harvested&&crop==='wheat';s.plots[idx]={crop,at:now,watered:false,training};if(crop==='wheat')s.guide.planted=true;msg=c.en+' planted.'}
 else if(op==='water'){if(!p||p.watered||(ready(p,now)&&!p.training)||plotRegion(idx)!==s.region)return err(!p?'Plant a seed first.':p.watered?'Already watered.':'Ready to harvest.');crop=p.crop;p.watered=true;if(crop==='wheat')s.guide.watered=true;msg='Watered! Crops grow 25% faster.'}
 else if(op==='harvest'){if(!p||!ready(p,now)||plotRegion(idx)!==s.region)return err('Not ready to harvest.');crop=p.crop;s.inventory[crop]+=3;s.harvested++;s.plots[idx]=null;if(crop==='wheat')s.guide.harvested=true;msg=CROPS[crop].en+' harvested. +3 items'}
 else if(op==='sell'){if(!ITEMS[crop])return err('Item not found.');amount=Math.floor(Number(qty));if(!Number.isFinite(amount)||amount<=0||s.inventory[crop]<amount)return err('Not enough items in storage.');s.inventory[crop]-=amount;s.coins+=amount*ITEMS[crop].value;s.xp+=amount;if(crop==='wheat')s.guide.sold=true;msg='Sold '+amount+' '+ITEMS[crop].en.toLowerCase()+' · +'+(amount*ITEMS[crop].value)+' coins · +'+amount+' XP'}
 else if(op==='swap'){let j=Number(crop);if(!isPlotOpen(s,idx)||!isPlotOpen(s,j)||j===idx||plotRegion(idx)!==plotRegion(j))return err('Choose two different fields.');[s.plots[idx],s.plots[j]]=[s.plots[j],s.plots[idx]];msg='Fields rearranged.'}
 else if(op==='expand'){const land=LANDS[crop];if(!land||s.land[crop])return err('Land already owned or unavailable.');if(s.coins<land.cost)return err('You need '+land.cost+' coins.');s.coins-=land.cost;s.land[crop]=true;msg=land.name+' purchased! Build three new fields.'}
 else if(op==='mine'){const node=MINE_NODES[idx];if(!node||!s.land.winter||s.region!=='winter')return err('Unlock Crystal Mountains first.');if(s.mineReady[idx]>now)return err('The deposit is not ready yet.');crop=node.item;amount=node.amount;s.mineReady[idx]=now+node.minutes*60000;s.inventory[crop]+=amount;msg=ITEMS[crop].en+' collected. +'+amount+' items'}
 else if(op==='buyAnimal'){const a=ANIMALS[crop];if(!a||!s.structures.barn)return err('Build your animal barn first.');if(s.animals.length>=ANIMAL_SLOTS.length)return err('The animal pen is full.');if(level(s)<a.level)return err('Unlock at level '+a.level+'.');if(s.coins<a.cost)return err('Not enough farm coins.');s.coins-=a.cost;s.animals.push({kind:crop,at:now,lastCollect:now});msg=a.en+' joined your farm!'}
 else if(op==='collectAnimal'){if(s.region!=='spring')return err('Return to Spring Valley.');let a=s.animals[idx],info=animalInfo(a,now);if(!info?.ready)return err('This animal has no product ready yet.');crop=info.product;amount=1;s.inventory[crop]++;a.lastCollect=now;msg=ITEMS[crop].en+' collected. +1 item'}
 else if(op==='travel'){if(!REGIONS[crop]||(crop!=='spring'&&!s.land[crop]))return err('Purchase this region first.');s.region=crop;msg='Welcome to '+REGIONS[crop].name+'.'}
 else return err('Invalid action.');
 let bonus=0;for(let i=0;i<TASKS.length;i++){const q=TASKS[i];if(q.op!==op||q.crop!==crop||s.earnedTasks.includes(i))continue;s.taskCounts[i]=Math.min(q.count,(s.taskCounts[i]||0)+amount);if(s.taskCounts[i]>=q.count){s.coins+=q.xp;s.earnedTasks.push(i);bonus+=q.xp;taskDone=true}}s.task=TASKS.findIndex((_,i)=>!s.earnedTasks.includes(i));if(s.task<0)s.task=TASKS.length;s.taskProgress=s.taskCounts[s.task]||0;if(bonus)msg+=' Mission complete! +'+bonus+' coins';
 if(!s.guide.done&&!tutorial(s)){s.guide.done=true;msg+=' Farm guide complete!'}
 s.updatedAt=now;return {ok:true,message:msg,taskDone}
}
function formatTime(ms){if(ms<=0)return 'Ready';if(ms<60000)return Math.ceil(ms/1000)+' sec';let m=Math.ceil(ms/60000),h=Math.floor(m/60);return h?h+' hr '+(m%60?m%60+' min':''):m+' min'}
return {CROPS,RESOURCES,ANIMAL_PRODUCTS,ANIMALS,ANIMAL_SLOTS,STRUCTURES,ITEMS,REGIONS,LANDS,PLOT_INFO,MINE_NODES,ownsPlot,isPlotOpen,plotRegion,seedCost,TASKS,fresh,validate,progress,ready,remaining,level,levelInfo,tutorial,animalInfo,act,formatTime}
});
