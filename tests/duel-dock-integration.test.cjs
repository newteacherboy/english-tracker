const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..','ingilizce',name),'utf8');

test('student dock shows Düello next to Takımım',()=>{
 const src=read('bottom-nav.js');
 assert.match(src,/\['tab-dunya','Parkur','path'\]/);
 assert.match(src,/\['tab-meduakis','Takımım','friends'\]/);
 assert.match(src,/\['tab-duel-home','Düello','duel'\]/);
 assert.match(src,/\['tab-aktiviteler','Oyunlar','game'\]/);
 assert.match(src,/\['tab-profile-menu','Profil','profile'\]/);
 assert.match(read('bottom-nav-v2.css'),/flex-wrap:nowrap!important/);
});
test('duel actions call existing live and Papi implementations',()=>{
 const src=read('bottom-nav.js');
 assert.match(src,/dmLiveDuel\?\.startLive/);
 assert.match(src,/dmLiveDuel\?\.startPapi/);
 assert.match(src,/dmParentBridge\?\.open/);
 assert.doesNotMatch(src,/dmBagInventory|Çantam/);
});
test('Sıralamam remains under Takımım and Düello has its own screen',()=>{
 const friends=read('friends-ui.js');
 const nav=read('bottom-nav.js');
 const css=read('duel-arena.css');
 assert.match(friends,/\['team','Takımım'\],\['ranking','Sıralamam'\]/);
 assert.match(friends,/rankView==='weekly'\?leagueHtml\(\):duelLeagueHtml\(\)/);
 assert.match(friends,/dmDuelRankingOpen/);
 assert.match(friends,/fr-invite-top/);
 assert.doesNotMatch(nav,/dm-duel-champions/);
 assert.doesNotMatch(nav,/dmArenaTabs\?\.\("duel"\)/);
 assert.match(nav,/dm_duel_champions_v1/);
 assert.match(css,/papi-duel-bordeaux\.webp/);
 assert.ok(fs.existsSync(path.join(__dirname,'../ingilizce/friends-assets/papi-duel-bordeaux.webp')));
});
test('notification badge counts unread items and displays count',()=>{
 const src=read('app-js/i07-gonder.js');
 assert.match(src,/list\.filter\(item=>!item\.okundu\)\.length/);
 assert.match(src,/zilSayi>99/);
});
test('all changed scripts parse',()=>{
 for(const file of ['bottom-nav.js','bottom-nav-v2.js','friends-ui.js','app-js/i07-gonder.js'])new Function(read(file));
});
