'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function apply(next,token='old'){
 const local=new Map([['ing_token',token],['ing_aktifOgrenci','Alice'],['ing_google_auth','true']]),session=new Map([['dm_session_handoff_v1',JSON.stringify(next)],['ing_ogr_token','teacher-old']]);
 const storage=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});
 vm.runInNewContext(fs.readFileSync('ingilizce/session-handoff.js','utf8'),{localStorage:storage(local),sessionStorage:storage(session),Date});return {local,session};
}
const next=()=>({name:'Bob',token:'new',role:'ogrenci',google:false,previous:'old',at:Date.now()});
test('new page installs verified identity before startup and clears stale teacher/google state',()=>{const s=apply(next());assert.equal(s.local.get('ing_token'),'new');assert.equal(s.local.get('ing_aktifOgrenci'),'Bob');assert.equal(s.session.has('ing_ogr_token'),false);assert.equal(s.local.has('ing_google_auth'),false);assert.equal(s.session.has('dm_session_handoff_v1'),false);});
test('stale or conflicting handoff never changes the current account',()=>{for(const s of [apply({...next(),at:Date.now()-61000}),apply(next(),'other-tab')]){assert.notEqual(s.local.get('ing_token'),'new');assert.equal(s.local.get('ing_aktifOgrenci'),'Alice');}});
test('teacher identity is installed with its validated teacher token',()=>{const s=apply({...next(),role:'ogretmen'});assert.equal(s.session.get('ing_ogr_token'),'new');});
test('handoff is loaded before discovery context and initial requests',()=>{const s=fs.readFileSync('ingilizce/index.html','utf8');assert.ok(s.indexOf('session-handoff.js')<s.indexOf('first-discovery-state.js'));const login=s.slice(s.lastIndexOf('window.girisYap = async function'));assert.ok(login.indexOf('dmSavedSessions.queue(')<login.indexOf("localStorage.setItem('ing_token', d.token)"));});
