const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(lvl=15){let html='',listener,requests=[];const root={classList:{contains:()=>true},querySelector:()=>({set outerHTML(s){html=s}}),addEventListener:(_,f)=>{listener=f}};
 const names=['Ada','Bora','Cem','Deniz'];const weekly=names.map((name,i)=>({name,rank:i+1,xp:[900,800,700,600][i],league:'super'}));const alltime=names.map((name,i)=>({name,rank:4-i,xp:[6000,7000,8000,9000][i],league:'efsaneler'})).sort((a,b)=>a.rank-b.rank);
 const context={window:{dmProgression:{level:()=>lvl},ogrenciMaskotSec:()=> '🦜',maSekmeSec(){},yoToast(){}},document:{getElementById:()=>root,addEventListener(){},hidden:false},localStorage:{getItem:()=> 'token'},apiURL:'https://api.test',aktifOgrenciAdi:'Bora',maSekme:'lig',maProfilId:null,setInterval(){},queueMicrotask,console,fetch:async(url,o)=>{const args=JSON.parse(o.body);requests.push(args);return {ok:true,json:async()=>({ok:true,kapsam:args.kapsam,liste:args.kapsam==='alltime'?alltime:weekly})}}};vm.createContext(context);vm.runInContext(fs.readFileSync('ingilizce/league-ui.js','utf8'),context);
 return {context,requests,html:()=>html,render:()=>context.window.maLigHtml(),click(data){listener({target:{closest:()=>({dataset:data,hasAttribute:key=>Object.hasOwn(data,key.replace('data-','').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))})}})}};}
const tick=()=>new Promise(setImmediate);
test('weekly gap is XP to overtake; lifetime podium uses a separate server scope',async()=>{
 const f=fixture();f.render();await tick();assert.match(f.html(),/101 XP/);assert.match(f.html(),/dm-lig-podium-cards/);assert.match(f.html(),/Haftalık yarışma XP/);
 f.click({ligMode:'alltime'});await tick();assert.match(f.html(),/Efsaneler Ligi/);assert.match(f.html(),/dm-lig-podium-large/);assert.match(f.html(),/7\.000 XP/);assert.doesNotMatch(f.html(),/Lig kuralları ve haftalık ödüller/);assert.equal(f.requests.at(-1).kapsam,'alltime');
});
test('level 14 never requests all-time rankings',async()=>{
 const f=fixture(14);f.render();await tick();f.click({ligMode:'alltime'});await tick();assert(!f.requests.some(x=>x.kapsam==='alltime'));assert.doesNotMatch(f.html(),/dm-lig-podium-large/);assert.match(f.render(),/15\. seviye/);
});
