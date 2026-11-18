'use strict';
// [18 Kas 2026] Profil kartındaki "Düelloya Davet Et" canlı düello davetidir; eski düello ve iki kişilik oyunlar kaldırıldı.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const card=read('ingilizce/user-card.js'),live=read('ingilizce/live-duel.js'),friends=read('ingilizce/friends-ui.js'),league=read('ingilizce/league-ui.js'),medupro=read('ingilizce/medupro.js');
const sql=read('supabase/migrations/20261118060000_duel_targeted_invite.sql');
test('profile card duel button sends a targeted live invite',()=>{
 assert.match(card,/action==='duel'\)\{close\(false\);return window\.dmLiveDuel\?\.invite\?\.\(id\);\}/);
 assert.match(live,/window\.dmLiveDuel = \{startLive, startPapi, invite, status, paywall\}/);
 assert.match(live,/rpc\('dm_duel_live_invite', \{p_target: target\}/);
 assert.match(live,/to: d\.target \|\| target/);
 assert.match(live,/if \(p\.to && norm\(p\.to\) !== norm\(who\(\)\)\) return;/);
});
test('unanswered invite offers Papi only when the player chooses it',()=>{
 assert.match(live,/data-papi>Papi ile Oyna</);
 assert.match(live,/rpc\('dm_duel_live_to_papi'/);
 assert.match(sql,/if d\.target_id is not null then\s+return dm_private\.duel_view\(d,s\.id\)\|\|jsonb_build_object\('expired',true\)/);
 assert.match(sql,/x\.target_id is null and x\.host_id<>s\.id/);
 assert.match(sql,/d\.target_id<>s\.id then\s+return jsonb_build_object\('ok',false,'taken',true,'message','Bu davet sana gönderilmedi\.'\)/);
});
test('Meydan Oku, Düellolarım and classic duel calls are gone',()=>{
 assert(!friends.includes('Meydan Oku'));
 assert(!friends.includes('my-duels'));
 assert(!friends.includes("'duellolarim'"));
 assert(!medupro.includes('dmRealDuelAc'));
 assert(!medupro.includes("api('duelloSonucKaydet'"));
 assert(!medupro.includes('dmArenaAc'));
 assert(!league.includes('dmRealDuelAc'));
 assert(league.includes("window.dmLiveDuel?.startLive?.()"));
 assert(!read('ingilizce/app-js/i15-duellolargetir.js').includes('fetch('));
 assert(!read('ingilizce/app-js/i09-1-alt-menu-arkadaslar-dunya-.js').includes('islem=duellolarim'));
});
test('random habit and league popups are no longer loaded',()=>{
 const html=read('ingilizce/index.html');
 assert(!html.includes('papi-habit.js'));
 assert(!fs.existsSync('ingilizce/papi-habit.js'));
 assert(!fs.existsSync('ingilizce/league-momentum.js'));
});
