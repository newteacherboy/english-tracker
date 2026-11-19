const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('ingilizce/shared-voice.js','utf8');
function fixture({reject=false,disabled=false}={}){
 const audio=[];
 class Audio {
  constructor(){audio.push(this);}
  play(){return reject?Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'})):Promise.resolve();}
  pause(){this.paused=true;}
  removeAttribute(){this.src='';}
  load(){}
 }
 const window={Audio,localStorage:{getItem:()=>disabled?'1':null}};
 vm.runInNewContext(source,{window});
 return {voice:window.dmSharedVoice,audio};
}
test('known IDs match original inventory, including non-ASCII; unlisted text is not requested',()=>{
 const {voice}=fixture();
 assert.equal(voice.audioId(' Apple ','en-GB'),'en-3b2ef9185d283176');
 assert.equal(voice.audioId('aç','tr-TR'),'tr-d84591a751c1e699');
 assert.equal(voice.audioId("It is one o’clock. 🕐",'en'),'en-19e439d58acf8061');
 assert.match(voice.urlFor('apple','en-US'),/\/English\/en-3b2ef9185d283176\.mp3$/);
 assert.match(voice.urlFor('aç','tr'),/\/Turkish\/tr-d84591a751c1e699\.mp3$/);
 assert.equal(voice.urlFor('apple','fr'),null);
 assert.equal(voice.urlFor('invented-test-unknown-20261119','en'),null);
});
test('starts synchronously and reports end once; cancellation suppresses stale callbacks',()=>{
 const {voice,audio}=fixture(),events=[];
 const u={text:'apple',lang:'en-US',rate:.85,onstart:()=>events.push('start'),onend:()=>events.push('end')};
 assert.equal(voice.play(u),true);assert.equal(voice.pending,true);
 assert.equal(audio[0].playbackRate,.85);audio[0].onplaying();audio[0].onplaying();
 assert.equal(voice.speaking,true);audio[0].onended();assert.deepEqual(events,['start','end']);
 voice.play(u);const late=audio[1].onended;voice.cancel();late();
 assert.equal(audio[1].paused,true);assert.deepEqual(events,['start','end']);
});
test('failed playback emits an error and releases state',async()=>{
 const {voice}=fixture({reject:true});let error;
 assert.equal(voice.play({text:'apple',lang:'en',onerror:e=>error=e.error}),true);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(error,'not-allowed');
 assert.equal(voice.pending,false);assert.equal(voice.speaking,false);
});
test('rollback and unknown inputs preserve caller fallback',()=>{
 const {voice,audio}=fixture({disabled:true});assert.equal(voice.play({text:'apple',lang:'en'}),false);assert.equal(audio.length,0);
});
test('worker handles full, open-ended, suffix and invalid byte ranges',()=>{
 const self={addEventListener(){}};
 const ctx=vm.createContext({self});
 vm.runInContext(fs.readFileSync('ingilizce/sw.js','utf8'),ctx);
 const ranges=[['bytes=0-9',[0,9]],['bytes=90-',[90,99]],['bytes=-8',[92,99]],['bytes=90-999',[90,99]],['bytes=100-',false],['bytes=1-0',false],['bytes=-0',false]];
 for(const [range,want] of ranges)assert.equal(JSON.stringify(ctx.voiceRange(range,100)),JSON.stringify(want));
});

test('Turkish MP3 uses original 1.00x without changing English teaching speeds',()=>{
 const {voice,audio}=fixture();
 for(const rate of [.93,1]){assert.equal(voice.play({text:'aç',lang:'tr-TR',rate}),true);assert.equal(audio.at(-1).playbackRate,1);assert.equal(audio.at(-1).preservesPitch,true);}
 assert.equal(voice.play({text:'apple',lang:'en-US',rate:.85}),true);assert.equal(audio.at(-1).playbackRate,.85);
 assert.equal(voice.play({text:'apple',lang:'en-US',rate:.35}),true);assert.equal(audio.at(-1).playbackRate,.5);
});

test('Turkish equivalent punctuation and initial dotted I resolve only verified recordings',()=>{
 const {voice}=fixture();
 assert.ok(voice.urlFor('merhaba!','tr'));
 assert.ok(voice.urlFor('merhaba','tr'));
 assert.ok(voice.urlFor('Günaydın!','tr'));
 assert.ok(voice.urlFor('günaydın','tr'));
 assert.ok(voice.urlFor('İyi akşamlar!','tr'));
 assert.ok(voice.urlFor('iyi akşamlar','tr'));
 assert.equal(voice.urlFor('invented-test-unknown-20261119','tr'),null);
});
test('shared speech wrapper does not fall back to native Turkish voice',()=>{
 const code=fs.readFileSync('ingilizce/game-feedback.js','utf8');
 const start=code.indexOf("if('speechSynthesis'in window");
 const end=code.indexOf('window.dmListen=',start);
 assert.ok(start>=0&&end>start);
 const native=[],errors=[],synth={speak:u=>native.push(u.text),cancel(){},resume(){}};
 const window={speechSynthesis:synth,SpeechSynthesisUtterance:function(){},dmGameVoiceBlocked:()=>false,dmSharedVoice:{urlFor:t=>t==='aç'?'verified':null,play:()=>false,cancel(){}}};
 vm.runInNewContext(code.slice(start,end),{window,voiceGeneration:0,speechTimer:null,clearTimeout(){},setTimeout(){},listeningStatus(){},englishVoice:()=>null});
 synth.speak({text:'sınıf',lang:'tr-TR',onerror:e=>errors.push(e.error)});
 synth.speak({text:'aç',lang:'tr-TR',onerror:e=>errors.push(e.error)});
 synth.speak({text:'unknown English',lang:'en-US'});
 assert.deepEqual(native,['unknown English']);
 assert.deepEqual(errors,['turkish-recording-missing','audio-unavailable']);
});

test('all 11913 verified objects are retained, including newly uploaded school Turkish recordings',()=>{
 const ids=source.match(/(?:en|tr)-[a-f0-9]{16}/g);
 assert.equal(ids.length,11913);
 assert.equal(new Set(ids).size,11913);
 assert.equal(ids.filter(x=>x.startsWith('en-')).length,9014);
 assert.equal(ids.filter(x=>x.startsWith('tr-')).length,2899);
 const {voice,audio}=fixture();
 assert.ok(voice.urlFor("açmak",'tr-TR')?.endsWith('/Turkish/tr-ca92a27536eed4e4.mp3'));
 assert.ok(voice.urlFor("aile",'tr-TR')?.endsWith('/Turkish/tr-6f7bd3cc92eb9aec.mp3'));
 assert.ok(voice.urlFor("erkek çocuk",'tr-TR')?.endsWith('/Turkish/tr-06c2feb343cc6d1c.mp3'));
 assert.ok(voice.urlFor("zorlayıcı",'tr-TR')?.endsWith('/Turkish/tr-a56c6411c78277b9.mp3'));
 assert.equal(voice.play({text:'açmak',lang:'tr-TR',rate:.83}),true);
 assert.equal(audio.at(-1).playbackRate,1);
});
