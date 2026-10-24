const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(){const c={aktifOgrenciAdi:'alice',document:{addEventListener(){}},window:null};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('ingilizce/route-missions.js','utf8'),c);return c;}
test('daily targets are easier than weekly targets and progress stays account-bound',()=>{const c=fixture(),m=c.dmRouteMissions;m.set({daily:{route:1,game:2,review:2},weekly:{route:4,game:12,days:3}},'alice');assert.match(m.markup('daily'),/1\/1/);assert.match(m.markup('daily'),/2\/3/);assert.match(m.markup('weekly'),/4\/10/);assert.match(m.markup('weekly'),/12\/20/);assert.match(m.markup('weekly'),/3\/5/);c.aktifOgrenciAdi='bob';assert(!m.markup('weekly').includes('12/20'));m.set({weekly:{game:20}},'alice');assert(!m.markup('weekly').includes('20/20'));});
test('missing server state stays loading instead of fabricating zero progress and markup grants no reward',()=>{const c=fixture();assert.match(c.dmRouteMissions.markup('daily'),/yükleniyor/);assert(!fs.readFileSync('ingilizce/route-missions.js','utf8').includes('yoXpEkle('));});
test('passport disables incomplete claims and preserves the server daily and weekly reward amounts',()=>{
 const c=fixture(),m=c.dmRouteMissions;
 m.set({daily:{route:1,game:1,review:2},weekly:{route:10,game:20,days:5}},'alice');
 assert.match(m.passport('daily'),/data-period="daily" disabled/);
 assert.match(m.passport('daily'),/<b>30<\/b> Altın/);
 assert.match(m.passport('daily'),/<b>70<\/b> XP/);
 assert.match(m.passport('weekly'),/data-period="weekly" >Ödülü al/);
 assert.match(m.passport('weekly'),/<b>100<\/b> Altın/);
 assert.match(m.passport('weekly'),/<b>120<\/b> XP/);
 c.aktifOgrenciAdi='bob';
 assert.match(m.passport('weekly'),/data-period="weekly" disabled/);
 assert.doesNotMatch(m.passport('weekly'),/>20\/20</);
});
