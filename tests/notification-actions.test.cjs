const {test}=require('node:test');const assert=require('node:assert/strict');
require('../ingilizce/friends-feed-model.js');require('../ingilizce/notification-actions.js');
const {plan,duelFor}=global.DMNotificationActions;
const now=Date.parse('2026-10-25T10:00:00Z');
const note={tur:'duello',gonderen:'Efe',tarih:now,metin:'Hafiza_Liderlik'};
const duel={id:'d1',gonderen:'Efe',alici:'Ada',oyun:'Hafiza_Liderlik',durum:'bekliyor',kalanDk:1440};
test('only a unique current invitation for the recipient gets accept/reject',()=>{
 assert.equal(duelFor(note,[duel],'Ada',now),duel);
 assert.equal(duelFor(note,[{...duel,alici:'Işık'}],'işık',now)?.id,'d1');
 assert.deepEqual(plan(note,duel).map(x=>x[0]),['accept','reject']);
 for(const patch of [{alici:'Someone'},{durum:'kabul'},{durum:'red'},{kalanDk:0},{oyun:'Other'}])assert.equal(duelFor(note,[{...duel,...patch}],'Ada',now),null);
 assert.equal(duelFor({...note,tarih:now-86400000},[duel],'Ada',now),null);
 assert.equal(duelFor({...note,tarih:'invalid'},[duel],'Ada',now),null);
 assert.equal(duelFor(note,[duel,{...duel,id:'d2'}],'Ada',now),null);
});
test('context-specific return actions and safe fallback',()=>{
 assert.deepEqual(plan(note,null).map(x=>x[0]),['duels']);
 for(const tur of ['hediye','enerji'])assert.deepEqual(plan({tur,gonderen:'Efe'}).map(x=>x[0]),['gift','profile']);
 assert.deepEqual(plan({tur:'mesaj',gonderen:'Efe'}).map(x=>x[0]),['message','profile']);
 assert.deepEqual(plan({tur:'oyunDavet',matchId:'m'}).map(x=>x[0]),['match']);
 assert.deepEqual(plan({tur:'tebrik',gonderen:'Efe'}).map(x=>x[0]),['profile']);
 assert.deepEqual(plan({tur:'duyuru'}),[]);
 assert.deepEqual(plan({tur:'hediye'}),[]);
});
