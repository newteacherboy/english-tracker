const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base=path.resolve(__dirname,'../ingilizce');
 const original=fs.readFileSync(path.join(base,'index.html'),'utf8');
 const inline=[...original.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(x=>x[1]).join('\n');
 const browser=await chromium.launch({executablePath:process.env.DIJI_CHROMIUM,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{
  const u=new URL(r.request().url());
  if(u.pathname==='/')return r.fulfill({contentType:'text/html',body:
   '<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0}'+inline+'</style>'+
   ['selected-play.css','route-questions.css','route-forest-reference.css','school-adventure-v2.css','parkur-question-parity.css','school-question-v4.css'].map(f=>'<link rel="stylesheet" href="/'+f+'">').join('')+'<body><div id="bzPerde" class="sp-adventure rq-approved dm-school-game" data-school-appearance="day" style="--dm-school-question-art:url(/learning-assets/characters/kori.webp)">'+
   '<header class="dm-school-lesson-head"><button class="dm-school-back">‹</button><div class="dm-school-lesson-title"><small>2. Sınıf · 1. Ünite · 11. Durak</small><strong>Macera Parkuru</strong></div><button class="dm-school-head-theme">☾</button></header>'+
   '<header class="rq-hud"><span class="rq-wallet">⚡ <b>14</b><small>/30</small></span><span class="rq-wallet">🪙 <b>906</b></span><span class="rq-wallet">🪶 <b>1</b><small>/3</small></span></header>'+
   '<nav class="dm-school-question-nav"><button disabled>← Önceki</button><span>Yanıtlananları incele</span><button disabled>Sonraki →</button></nav>'+
   '<div id="bzAlan"><div class="rq-progress"><button class="rq-review">01</button><span>1 / 13</span><div><i style="width:8%"></i></div><button class="rq-close">×</button></div>'+
   '<div class="sp-question-board"><span class="bz-etiket">Dinle ve öğren</span><div class="dm-school-teach-message"><h2>Yeni kelimelerle tanış</h2><p>Bu duraktaki kelimeleri dinle ve anlamlarını öğren.</p></div></div>'+
   '<div class="dm-school-words">'+['Monday|Pazartesi','Tuesday|Salı','Saturday|Cumartesi','Sunday|Pazar'].map(s=>{const parts=s.split('|');return '<button class="dm-school-word"><span><strong>'+parts[0]+'</strong><small>'+parts[1]+'</small></span><span class="dm-school-word-listen">🔊 Dinle</span></button>'}).join('')+'</div>'+
   '<button class="bz-btn mor dm-school-start-questions">Sorulara geç →</button></div></div></body></html>'
  });
  const full=path.join(base,decodeURIComponent(u.pathname.slice(1)));
  return fs.existsSync(full)&&fs.statSync(full).isFile()?r.fulfill({path:full}):r.fulfill({body:''});
 });
 await page.goto('https://layout.test/');await page.locator('#bzAlan').waitFor();
 for(const size of [{width:390,height:844},{width:430,height:932},{width:320,height:568}]){
  await page.setViewportSize(size);
  const m=await page.evaluate(()=>{
   const container=document.querySelector('#bzAlan'),card=document.querySelector('.dm-school-start-questions'),box=document.querySelector('.sp-question-board'),words=[...document.querySelectorAll('.dm-school-word')],viewport=innerHeight;
   const r=card.getBoundingClientRect(),b=box.getBoundingClientRect();
   return {viewport,ctaTop:r.top,ctaBottom:r.bottom,cardHeight:b.height,containerHeight:container.clientHeight,containerScroll:container.scrollHeight,cardCount:words.length,stacked:words[1].getBoundingClientRect().top>=words[0].getBoundingClientRect().bottom-1,pageWidth:document.documentElement.scrollWidth};
  });
  assert.equal(m.cardCount,4,'all 4 words displayed');
  assert.equal(m.stacked,true,'v4: words form one calm single-column list');
  assert(m.cardHeight<190,'mascot and question are adjacent, without an empty half-page: '+JSON.stringify({size,m}));
  assert(m.pageWidth<=size.width+2,'horizontal viewport overflow: '+JSON.stringify({size,m}));
  if(size.width>=390){
   assert(m.ctaBottom<=size.height+2,'start button must be visible without scrolling on standard mobile: '+JSON.stringify({size,m}));
   assert(m.containerScroll<=m.containerHeight+3,'teaching must fit one normal phone viewport: '+JSON.stringify({size,m}));
  }
  console.log('PASS school layout',size.width+'x'+size.height,m);
 }
 await page.evaluate(()=>document.querySelector('#bzPerde').dataset.schoolAppearance='night');
 assert.equal(await page.locator('#bzPerde').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(27, 24, 36)','v4 night uses the calm dark surface');
 assert.deepEqual(errors,[]);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
