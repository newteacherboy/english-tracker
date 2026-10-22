'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const screens=[
 ['root','index.html','ingilizce/'],
 ['English portal','ingilizce/index.html','']
];
function headMarkup(file){
 const html=fs.readFileSync(file,'utf8');
 return {html,head:html.slice(html.indexOf('<head>'),html.indexOf('</head>'))};
}
for(const [name,path,prefix] of screens){
 test(name+' enables holiday theme before its first paint',()=>{
  const {html,head}=headMarkup(path);
  const first=head.indexOf('<script id="dm-republic-2026-prepaint">');
  const normal=head.indexOf('papi-loading.css');
  const holiday=head.indexOf(prefix+'republic-day-splash.css');
  const loader=head.indexOf(prefix+'republic-day-splash.js');
  assert(first>=0&&first<normal,'date selector must execute before other loader styles');
  assert(normal<holiday&&holiday<loader,'holiday stylesheet must be parser-blocking and precede deferred JavaScript');
  assert(head.indexOf('preload.as=\'image\'')>=0,'image must begin downloading early');
  assert(html.indexOf('dmBootSplash')>html.indexOf('</head>')||path==='index.html');
  assert.equal(html.includes('republic-day-splash.js?v=20261022-2'),false,'no late body script');
  const source=head.match(/<script id="dm-republic-2026-prepaint">([\s\S]*?)<\/script>/)[1];
  function checkAt(instant){
   const classes=[],preloads=[];
   const DateAt=class extends Date{constructor(...args){super(...(args.length?args:[instant]));}};
   const document={
    baseURI:'https://app.dijimedu.com/'+prefix,documentElement:{classList:{add(x){classes.push(x);}}},
    createElement(){return {};},head:{appendChild(x){preloads.push(x);}}
   };
   vm.runInNewContext(source,{Intl,Date:DateAt,URL,document});
   return {classes,preloads};
  }
  assert(checkAt('2026-11-02T20:59:59Z').classes.includes('dm-republic-2026'));
  assert.equal(checkAt('2026-11-02T21:00:00Z').classes.length,0);
 });
}
test('temporary artwork hides original Papi before the image finishes loading',()=>{
 const css=fs.readFileSync('ingilizce/republic-day-splash.css','utf8');
 assert.match(css,/\.dm-papi-halo,\.dm-brand-line/);
 assert.match(css,/republic-day-2026\.jpg/);
 assert.doesNotMatch(fs.readFileSync('ingilizce/republic-day-splash.js','utf8'),/createElement\('link'\)/);
});
