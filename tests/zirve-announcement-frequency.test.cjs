'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('ingilizce/zirve-kampanya.js','utf8');
const begin=src.indexOf('function announcementWindow'),end=src.indexOf('function announcementAccount',begin);
const allowed=new Function(src.slice(begin,end)+';return announcementWindow;')();
const c={phase:'live',endsOn:'2026-12-10'};
test('first two displays, December 8–10 daily only, never after end',()=>{
 for(const [count,last,now,want] of [[0,'','2026-11-20',true],[1,'2026-11-20','2026-11-20',true],[2,'2026-11-20','2026-12-07',false],[2,'2026-11-20','2026-12-08',true],[2,'2026-12-08','2026-12-08',false],[2,'2026-12-08','2026-12-09',true],[2,'2026-12-09','2026-12-10',true],[2,'2026-12-10','2026-12-11',false]])assert.equal(allowed(c,{count,last},now),want,now);
 assert.equal(allowed({...c,phase:'ended'},{count:0},'2026-12-09'),false);
});
test('teacher shortcut is outside the tools grid and old banner is removed',()=>{
 assert.match(src,/querySelector\('\.tp-dash-menu'\)/);
 assert.match(src,/\[data-zk-teacher-host\],\[data-zk-tcard\]/);
 assert.doesNotMatch(src,/function teacherCardHtml/);
});
