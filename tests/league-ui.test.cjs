const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(lvl=15,virtualResponse=null){let html='',listener,requests=[];const root={querySelectorAll:()=>[],dispatchEvent(){},classList:{contains:()=>true},querySelector:()=>({set outerHTML(s){html=s}}),addEventListener:(_,f)=>{listener=f}};
 const names=['Ada','Bora','Cem','Deniz'];const weekly=names.map((name,i)=>({name,rank:i+1,xp:[900,800,700,600][i],league:'super'}));const alltime=names.map((name,i)=>({name,rank:4-i,xp:[6000,7000,8000,9000][i],league:'efsaneler'})).sort((a,b)=>a.rank-b.rank);
 const context={window:{dmProgression:{level:()=>lvl},ogrenciMaskotSec:()=> '🦜',maSekmeSec(){},yoToast(){}},document:{getElementById:id=>id==='tab-meduakis'?root:null,addEventListener(){},hidden:false,dispatchEvent(){}},Event,localStorage:{getItem:()=> 'token'},apiURL:'https://api.test',aktifOgrenciAdi:'Bora',maSekme:'lig',maProfilId:null,setInterval(){},queueMicrotask,console,fetch:async(url,o)=>{const args=JSON.parse(o.body);requests.push(args);if(url.includes('/rpc/dm_virtual_league_entries'))return virtualResponse?await virtualResponse:{ok:true,json:async()=>[{bot_id:1,name:'Papi Şimşek',league:'super',is_virtual:true,xp:1000}]};return {ok:true,json:async()=>({ok:true,kapsam:args.kapsam,liste:args.kapsam==='alltime'?alltime:weekly})}}};vm.createContext(context);vm.runInContext(fs.readFileSync('ingilizce/league-ui.js','utf8'),context);
 return {context,requests,html:()=>html,render:()=>context.window.maLigHtml(),click(data){listener({target:{closest:()=>({dataset:data,hasAttribute:key=>Object.hasOwn(data,key.replace('data-','').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))})}})}};}
const tick=()=>new Promise(setImmediate);
test('weekly gap is XP to overtake; lifetime podium uses a separate server scope',async()=>{
 const f=fixture();f.render();await tick();assert.match(f.html(),/101 XP/);assert.match(f.html(),/dm-lig-podium-cards/);assert.match(f.html(),/Haftalık yarışma XP/);
 f.click({ligMode:'alltime'});await tick();assert.match(f.html(),/Efsaneler Ligi/);assert.match(f.html(),/dm-lig-podium-large/);assert.match(f.html(),/7\.000 XP/);assert.doesNotMatch(f.html(),/Lig kuralları ve haftalık ödüller/);assert.equal(f.requests.at(-1).kapsam,'alltime');
});
test('level 14 never requests all-time rankings',async()=>{
 const f=fixture(14);f.render();await tick();f.click({ligMode:'alltime'});await tick();assert(!f.requests.some(x=>x.kapsam==='alltime'));assert.doesNotMatch(f.html(),/dm-lig-podium-large/);assert.match(f.render(),/15\. seviye/);
});

test('weekly bots use Papi art and visible disclosure without changing actual player rank',async()=>{
 const f=fixture();f.render();await tick();
 const preview=f.context.window.dmLeagueUI.weeklyPreview();
 assert.equal(preview.me.rank,2);
 assert.equal(preview.me.displayRank,2);
 assert.equal(preview.top.map(p=>p.name).join(','),'Ada,Bora,Cem');
 assert.equal(preview.top.some(p=>p.is_virtual),false);
 assert.equal(preview.me.is_virtual,undefined);
 assert.match(f.html(),/Sanal Rakip/);
 assert.match(f.html(),/parkur-badges\/v2\/school-03.webp/);
});

test('virtual rivals do not displace qualified real players above 200 XP',async()=>{
 const f=fixture();f.render();await tick();
 const preview=f.context.window.dmLeagueUI.weeklyPreview();
 assert.equal(preview.top.map(p=>p.name).join(','),'Ada,Bora,Cem');
 assert.equal(preview.me.rank,2);
 assert.equal(preview.me.displayRank,2);
 assert.match(f.html(),/Sanal Rakip/);
});
test('virtual league rivals use ten different parkur badge characters',()=>{
 const f=fixture();
 const cards=Array.from({length:10},(_,i)=>f.context.window.dmLeagueUI.virtualAvatar({id:'virtual-'+(i+1),name:'Papi '+(i+1)}));
 assert.equal(new Set(cards).size,10);
 assert(cards.every(html=>html.includes('parkur-badges/v2/')));
 assert(cards.every(html=>html.includes('background-size:')&&html.includes('background-position:')));
 assert(cards.every(html=>html.includes('class="dm-virtual-papi-img"')));
 const badgeCells=cards.map(html=>html.match(/background-image:url\(([^)]+)\);background-size:([^;]+);background-position:([^"]+)/)?.[0]);
 assert(badgeCells.every(Boolean));
 assert.equal(new Set(badgeCells).size,10);
 assert.match(cards[9],/school-03.webp/); // Fırtına displays exactly one cell
});

test('ten virtual Papis have five stable Pro and five Premium Pro cosmetic tiers',()=>{const f=fixture(),ui=f.context.window.dmLeagueUI;const bots=Array.from({length:10},(_,i)=>({id:'virtual-'+(i+1),name:'Papi '+(i+1),is_virtual:true}));assert.equal(bots.filter(b=>ui.virtualTier(b)==='pro').length,5);assert.equal(bots.filter(b=>ui.virtualTier(b)==='premium_pro').length,5);assert.equal(ui.virtualTier({id:'unknown'}),'free');for(const b of bots){for(const kind of ['league','friends','modal']){const html=ui.virtualMemberAvatar(b,64,kind);assert.match(html,/dm-member-badge/);assert.match(html,ui.virtualTier(b)==='pro'?/dm-member-pro/:/dm-member-premium/);assert.match(html,/dm-virtual-papi-img/);}}});


test('weekly ranking is published while practice rivals are still pending and duplicate loads are deduplicated',async()=>{
 let resolveRivals;
 const rivals=new Promise(resolve=>{resolveRivals=resolve});
 const f=fixture(15,rivals),ui=f.context.window.dmLeagueUI;
 const loading=ui.refreshWeekly();
 await tick();
 assert.equal(ui.weeklyPreview().loaded,true);
 assert.equal(ui.weeklyPreview().top.map(p=>p.name).join(','),'Ada,Bora,Cem');
 assert.doesNotMatch(f.html(),/Sıralama yükleniyor/);
 await ui.refreshWeekly();
 assert.equal(f.requests.filter(r=>r.islem==='seviyeLigListesi').length,1);
 resolveRivals({ok:false});
 await loading;
 assert.equal(ui.weeklyPreview().loaded,true);
 assert.equal(ui.weeklyPreview().me.name,'Bora');
});

test('a delayed rival response cannot restore the previous account ranking',async()=>{
 let resolveRivals;
 const rivals=new Promise(resolve=>{resolveRivals=resolve});
 const f=fixture(15,rivals),ui=f.context.window.dmLeagueUI;
 const loading=ui.refreshWeekly();
 await tick();
 f.context.aktifOgrenciAdi='Other';
 assert.equal(ui.weeklyPreview().loaded,false);
 resolveRivals({ok:true,json:async()=>[]});
 await loading;
 assert.equal(ui.weeklyPreview().loaded,false);
 assert.equal(ui.weeklyPreview().top.length,0);
});

test('Friends home starts weekly ranking before its other pending requests, including during the home cache period',async()=>{
 const source=fs.readFileSync('ingilizce/friends-ui.js','utf8');
 const loadSource=source.slice(source.indexOf('  async function loadHome('),source.indexOf("  root.addEventListener('dm:weekly-league'"));
 let release,weeklyRequests=0;
 const waiting=new Promise(resolve=>{release=resolve});
 const context={
  window:{dmLeagueUI:{refreshWeekly:()=>{weeklyRequests++}},maTumGetir:()=>waiting,maOlaylariYukle:()=>waiting,dmProgression:{refresh:()=>waiting}},
  resetAccount(){},permitted:code=>code==='lig',account:'Bora',epoch:0,busy:false,lastLoad:0,who:()=> 'Bora',followed:[],renderHome(){},loadQuota(){},Promise,Date
 };
 vm.createContext(context);vm.runInContext(loadSource,context);
 const loading=context.loadHome();
 await tick();
 assert.equal(weeklyRequests,1);
 assert.equal(context.busy,true);
 release();await loading;
 const before=weeklyRequests;
 await context.loadHome();
 assert.equal(weeklyRequests,before+1);
});
