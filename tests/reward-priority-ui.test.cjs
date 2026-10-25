const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const policy=require('../ingilizce/reward-policy.json');
async function sheet(teacher=false){
 const dom=new JSDOM('<!doctype html><body></body>',{url:'https://fixture.test/ingilizce/',runScripts:'outside-only'}),w=dom.window;
 w.aktifOgrenciAdi=teacher?'teacher':'QA';w.apiURL='/api';w.matchMedia=()=>({matches:true});
 w.dmTeacherPortalMode=teacher;w.dmTeacherPortal={beforeGame:async()=>true};
 w.eval(fs.readFileSync('ingilizce/konu-oyunlari.js','utf8'));
 const games=Object.keys(policy.topicGames);await w.dmTopicGames.openTopic({key:'A1|grammar|QA',games,titles:Object.fromEntries(games.map(g=>[g,g]))});
 return dom;
}
test('all six topic cards display their server-policy reward and no obsolete 70 XP claim',async()=>{
 const dom=await sheet();try{for(const [game,xp] of Object.entries(policy.topicGames))assert.match(dom.window.document.querySelector('[data-game='+game+']').textContent,new RegExp('\\+'+xp+' XP'));assert.doesNotMatch(dom.window.document.body.textContent,/70 XP/);}finally{dom.window.close();}
});
test('teacher practice cards do not promise personal XP',async()=>{
 const dom=await sheet(true);try{assert.equal(dom.window.document.querySelectorAll('[data-game]').length,6);assert.doesNotMatch(dom.window.document.body.textContent,/\+\d+ XP/);assert.match(dom.window.document.body.textContent,/XP yok/);}finally{dom.window.close();}
});
