/* Parent workspace. Personal student storage is used only for explicit code-protected switching. */
(()=>{
 'use strict';
 const API='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
 const app=document.getElementById('parentApp');
 const KEY='dm_parent_session_v1',CHILD='dm_parent_child_v1';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const paths={home:'M3 10l9-7 9 7v11h-6v-7H9v7H3z',practice:'m8 4 12 8-12 8z',growth:'M5 20V12m7 8V4m7 16V8',family:'M2 21v-2a5 5 0 0 1 10 0v2m2-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0m8 14v-2a5 5 0 0 0-5-5m1-10a4 4 0 0 1 0 7',bell:'M4 17h16l-2-4V8a6 6 0 0 0-12 0v5zm5 4h6',back:'m15 5-7 7 7 7',book:'M3 4c5-1 7 0 9 2 2-2 4-3 9-2v15c-5-1-7 0-9 2-2-2-4-3-9-2zm9 2v15'};
 const icon=name=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(paths[name]||paths.book)+'"/></svg>';
 const btn=(label,action,kind='primary',extra='')=>'<button type="button" class="pc-'+kind+'" data-action="'+action+'" '+extra+'>'+esc(label)+'</button>';
 const row=(label,action,detail='',extra='')=>'<button class="pc-row" type="button" data-action="'+action+'" '+extra+'>'+icon(({teacher:'family',settings:'bell',goal:'growth',history:'growth',weekly:'book',cards:'book',account:'family',membership:'growth'})[action]||'book')+'<span>'+esc(label)+(detail?'<small>'+esc(detail)+'</small>':'')+'</span><span aria-hidden="true" style="flex:0">›</span></button>';
 const badge=plan=>'<span class="pc-badge '+(plan==='free'?'free':'')+'">'+({premium_pro:'Premium Pro',pro:'Pro',free:'Free'}[plan]||'Free')+'</span>';
 const studentMode=new URLSearchParams(location.search).get('ogrenci')==='1';
 const embeddedAuth=window.parent!==window&&new URLSearchParams(location.search).get('dijiEmbed')==='1'&&!studentMode;
 const initialSignup=new URLSearchParams(location.search).get('kayit')==='1';
 let networkCount=0;
 function networkBusy(active){
  networkCount=Math.max(0,networkCount+(active?1:-1));
  let state=document.getElementById('pcNetwork');
  if(networkCount&&!state){state=document.createElement('div');state.id='pcNetwork';state.setAttribute('role','status');state.textContent='Veriler yükleniyor…';state.style.cssText='position:fixed;top:calc(env(safe-area-inset-top) + 45px);left:50%;transform:translateX(-50%);width:min(100%,490px);z-index:40;padding:8px 16px;text-align:center;background:#e4f3ed;color:#154237;font:600 12px system-ui';document.body.append(state);}
  if(!networkCount)state?.remove();
 }
 let token=localStorage.getItem(KEY)||'',me=null,childId=localStorage.getItem(CHILD)||'',dashboard=null,tab='home',screen='',busy=false,practice=null,selection='',words=[],cardIndex=0,cardBack=false,lastSetup={source:'last',count:5,content:'all',types:['choice']},pendingAnswer=null,pendingStart=null,memoryPicked=null,memoryMatches=0,memoryMistake=false,cardRatings={},cardSession='',lessonQuestion=null;
 const pendingKey=()=> 'dm_home_pending:'+childId;
 function persistPending(){if(pendingAnswer)localStorage.setItem(pendingKey(),JSON.stringify(pendingAnswer));else localStorage.removeItem(pendingKey());}
 async function api(islem,data={}){
  if(studentMode)islem=({parentResume:'parentStudentResume',parentAnswer:'parentStudentAnswer'})[islem]||islem;
  networkBusy(true);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({islem,parentToken:token,studentId:childId,...(studentMode?{t:localStorage.getItem('ing_token')||''}:{}),...data})});
   const result=await response.json();
   if(!response.ok||result.ok===false){const error=Error(result.mesaj||result.message||'İşlem tamamlanamadı.');error.premium=result.premium;error.status=response.status;throw error;}
   return result;
  }catch(e){if(e.name==='AbortError')throw Error('Bağlantı bekleniyor. Kaydedilmiş çalışmanı yeniden açabilirsin.');throw e;}
  finally{clearTimeout(timer);networkBusy(false);}
 }
 function error(message){const el=document.getElementById('pcError');if(el){el.textContent=message;el.scrollIntoView({block:'nearest'});}}
 function saveToken(value){token=value;localStorage.setItem(KEY,value);}
 function render(title,body,options={}){
  screen=options.screen||title;
  window.dmSharedVoice?.cancel();
  if(['question','feedback'].includes(screen))options.noNav=true;
  app.innerHTML='<div class="pc-shell '+(options.back?'pc-subview':'pc-mainview')+' '+(options.noNav?'pc-no-nav':'')+'" data-screen="'+esc(screen)+'"><header class="pc-header">'+(options.back?'<button class="pc-icon" data-action="back" aria-label="Geri">'+icon('back')+'</button>':'')+'<strong>'+esc(title||'Diji-Medu English')+'</strong></header><div class="pc-content">'+body+'<div id="pcError" class="pc-error" role="alert"></div></div>'+(!options.noNav&&me?.parent.verified?nav():'')+'</div>';
  document.title=(title||'Veli Paneli')+' · Diji-Medu';
  const navEl=app.querySelector('.pc-nav');if(!navEl)app.querySelector('.pc-shell').classList.add('pc-no-nav');
 }
 function nav(){return '<nav class="pc-nav" aria-label="Veli paneli sekmeleri">'+[['home','Ana Sayfa'],['practice','Evde Pratik'],['growth','Gelişim'],['family','Ailem']].map(([key,label])=>'<button type="button" data-action="tab" data-tab="'+key+'" '+(tab===key?'aria-current="page"':'')+'>'+icon(key)+label+'</button>').join('')+'</nav>';}
 function field(label,name,type='text',value='',extra=''){return '<label class="pc-field">'+esc(label)+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></label>';}
 function authForm(signup=false){
  const title=signup?'Veli Kaydı':'Veli Girişi';
  render(title,'<form id="pcAuth" class="pc-auth pc-auth-v2" data-form="auth">'+(signup?field('İsim Soyisim','name','text','','required minlength="2" maxlength="80" autocomplete="name"'):'')+field('E-posta adresi','email','email','','required maxlength="120" autocomplete="email"')+field('Şifre','password','password','','required minlength="6" maxlength="64" autocomplete="'+(signup?'new-password':'current-password')+'"')+(signup?'<label class="pc-check"><input type="checkbox" name="consent" required><span><a href="gizlilik.html" target="_blank" rel="noopener">Gizlilik bilgilendirmesini</a> okudum, <a href="kullanim-kosullari.html" target="_blank" rel="noopener">kullanım koşullarını</a> kabul ediyorum.</span></label><label class="pc-check"><input type="checkbox" name="progressMail"><span>Gelişim özetleri ve Papi haberlerini e-postayla almak istiyorum. (İsteğe bağlı)</span></label>':'')+'<button class="pc-primary" type="submit">'+(signup?'Hesabımı Oluştur':'Giriş Yap')+'</button></form>'+btn(signup?'Hesabım Var':'Veli Hesabı Oluştur',signup?'login':'signup','secondary')+(!signup?btn('Şifremi Unuttum','forgot','link'):'')+btn('← Giriş seçeneklerine dön','auth-back','secondary'),{noNav:true,screen:signup?'signup':'login'});
 }
 async function load(){
  const result=await api('parentMe');me=result;
  window.dmSavedParents?.remember(me.parent,token);
  if(embeddedAuth){window.parent.postMessage('dm-parent-auth-ready',location.origin);return;}
  if(!me.parent.verified){verifyView();return;}
  if(!me.children.some(c=>c.id===childId))childId=me.children[0]?.id||'';
  localStorage.setItem(CHILD,childId);
  if(childId)dashboard=await api('parentDashboard');else dashboard=null;
  showTab();
 }
 function verifyView(){render('E-posta Onayı','<h1>Son bir adım</h1><p>Doğrulama bağlantısı e-posta adresine gönderildi.</p><p>'+esc(me.parent.email)+'</p>'+btn('Doğrulamayı Kontrol Et','refresh')+btn('E-postayı Tekrar Gönder','resend','secondary')+btn('Çıkış Yap','logout','link'),{noNav:true,screen:'verify'});}
 function childTop(){const child=dashboard.student;return '<div class="pc-top"><button class="pc-child-picker" data-action="children" aria-label="Öğrenci seç veya ekle" aria-haspopup="dialog"><span class="pc-avatar">'+esc(child.name.trim().slice(0,1).toLocaleUpperCase('tr'))+'</span><span><strong>'+esc(child.name)+'</strong><small>'+(child.classNo?child.classNo+'. sınıf':'Öğrenci hesabı')+'</small></span><span class="pc-chevron">⌄</span></button>'+badge(dashboard.plan)+'<button class="pc-icon pc-count" data-action="notices" aria-label="Öğretmen bildirimleri">'+icon('bell')+(dashboard.notices.length?'<b>'+Math.min(9,dashboard.notices.length)+(dashboard.notices.length>9?'+':'')+'</b>':'')+'</button></div>';}
 function childrenView(){render('Öğrencilerim','<h1>Birlikte kiminle çalışalım?</h1>'+me.children.map(c=>row(c.full_name||c.username,'select-child',({premium_pro:'Premium Pro',pro:'Pro',free:'Free'})[c.plan],'data-id="'+c.id+'"')).join('')+btn('＋ Öğrenci ekle','link')+btn('Mevcut Öğrenciyi Kodla Bağla','link-code','link')+'<p class="pc-saved">İlk çocuk ve bir kardeş ücretsiz.</p>',{back:true});}
 function empty(){return '<h1>Çocuğum</h1><div class="pc-empty"><h2>İlk çocuğunu ekle</h2><p>Mevcut öğrenci hesabını kodla bağlayabilir veya çocuğun için hesap oluşturabilirsin.</p></div>'+btn('Öğrenci Ekle','create-child')+btn('Mevcut Öğrenciyi Kodla Bağla','link-code','secondary');}
 function showTab(){
  if(!dashboard){render('Veli Paneli',empty()+btn('Hesap Ayarları','account','link'));return;}
  if(tab==='home')home();else if(tab==='practice')practiceHome();else if(tab==='growth')growth();else family();
 }
 function audioButton(action='speak',label='Dinle'){return '<button type="button" class="bz-ses rq-listen pc-audio" data-action="'+action+'" aria-label="'+esc(label)+'"><span class="rq-speaker-disc" aria-hidden="true"></span><small>'+esc(label)+'</small></button>';}
 function goalCard(){
  const dates=Object.keys(dashboard.activity).slice(-7),completed=dates.filter(d=>dashboard.activity[d]>0).length,target=dashboard.goal.days,percent=Math.min(1,completed/target);
  return '<button class="pc-goal-card" data-action="goal"><span class="pc-goal-ring"><svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="30"/><circle cx="36" cy="36" r="30" style="stroke-dasharray:'+percent*188.5+' 188.5"/></svg><strong>'+Math.min(completed,target)+'<small>/ '+target+' gün</small></strong></span><span class="pc-goal-copy"><strong>Haftalık aile hedefi</strong><small>'+(completed>=target?'Hedef tamamlandı. Birlikte harikasınız!':(target-completed)+' gün daha kısa bir tekrar yapalım.')+'</small><span class="pc-week-dots">'+dates.map(date=>'<i class="'+(dashboard.activity[date]>0?'done':'')+'" aria-label="'+esc(date)+'"><b>'+ (dashboard.activity[date]>0?'✓':'·')+'</b><small>'+esc(new Intl.DateTimeFormat('tr-TR',{weekday:'narrow'}).format(new Date(date+'T12:00:00Z')))+'</small></i>').join('')+'</span></span></button>';
 }
 function home(){
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date()),count=dashboard.activity[today]||0;
  const stop=dashboard.lastStop,stopLabel=stop&&stop.class_no>0&&stop.unit_no>0?stop.class_no+'. sınıf · '+stop.unit_no+'. ünite':'İlk durağını birlikte tamamlayın';
  render('Ana Sayfa',childTop()+'<h1>Bugün birlikte öğrenelim</h1><div class="pc-metrics"><article>'+icon('practice')+'<span>Bugünün özeti<strong>'+count+' etkinlik</strong><small>'+(count?'Birlikte güzel ilerliyorsunuz':'Kısa bir tekrar için hazırsınız')+'</small></span></article><article>'+icon('book')+'<span>Öğrenilenler<strong>'+dashboard.words.length+' kelime</strong><small>Tamamlanan duraklardan</small></span></article></div>'+goalCard()+'<div class="pc-group">'+row('Son çalıştığı ünite','growth',stopLabel)+'</div><div class="pc-papi"><img src="discovery-assets/papi-merhaba.webp" alt="Papi"><p><strong>Papi ile 10 dakika</strong>Birlikte kelime, oyun ve kısa test.</p></div>'+btn('▷ 10 dakikalık pratiğe başla','daily')+'<div class="pc-group">'+row('Papi Bana Anlatsın','summary','Çocuğunun gelişimini sade Türkçe ile gör')+row('Evde Pratik','practice','Öğrendiklerini birlikte pekiştirin')+'</div>');
 }
 function practiceHome(){
  const free=dashboard.plan==='free',remaining=free?Math.max(0,1-dashboard.usage.tests)+' test hakkı':'Sınırsız test',unfinished=dashboard.history.find(h=>!h.completedAt&&['test','game'].includes(h.kind));
  const tile=(title,action,sub,ic)=>'<button class="pc-tile" data-action="'+action+'">'+icon(ic)+'<span><strong>'+title+'</strong><small>'+sub+'</small></span></button>';
  render('Evde Pratik',childTop()+'<p class="pc-intro">Öğrendiklerini birlikte pekiştirin.</p><button class="pc-feature" data-action="setup">'+icon('book')+'<span><strong>Bana Özel Test</strong><small>Çalıştığı konulardan, seviyesine uygun kısa test.</small><b>Test hazırla ›</b></span></button><div class="pc-tiles">'+tile('Kelime Kartları','cards','Gör, dinle, hatırla','book')+tile('Papi ile Oyna','games','Oyunlarla tekrar et','practice')+tile('Dinle ve Söyle','speaking','Kayıtlı seslerle çalış','bell')+tile('Cümle Kur','patterns','Kelimeleri sırala','book')+'</div>'+(unfinished?'<div class="pc-group">'+row('Yarım kalan çalışma','resume',unfinished.cursor+' / '+unfinished.total+' soru · Kaldığın yerden devam et','data-id="'+unfinished.id+'"')+'</div>':'')+'<div class="pc-group">'+row('Hataları Tekrar Et','weak','Zorlandığı kelimeleri birlikte pekiştirin')+row('Haftalık Program','weekly','Kısa ve düzenli bir çalışma planı')+row('Kaydedilmiş Çalışmalar','history','Sonuçlar ve devam eden çalışmalar')+'</div><p class="pc-saved">'+remaining+' · '+(dashboard.plan==='premium_pro'?'Sınırsız oyun':dashboard.plan==='pro'?'Günde 5 oyun':'Günde 1 oyun')+'</p>');
 }
 function growth(previous=false){
  const values=Object.values(dashboard.activity),max=Math.max(1,...values),dates=Object.keys(dashboard.activity);
  const bars=values.map((n,i)=>'<div class="pc-bar" style="height:'+Math.max(2,n/max*115)+'px"><b>'+n+'</b><span>'+esc(new Intl.DateTimeFormat('tr-TR',{weekday:'short'}).format(new Date(dates[i]+'T12:00:00Z')))+'</span></div>').join('');
  render('Gelişim',childTop()+'<h1>'+esc(dashboard.student.name.split(' ')[0])+' için gelişim</h1>'+'<div class="pc-segment"><button data-action="current" class="'+(!previous?'active':'')+'">Bu hafta</button><button data-action="previous" class="'+(previous?'active':'')+'">Geçen hafta<small>Premium Pro</small></button></div><h2>Günlük tamamlanan çalışmalar</h2><div class="pc-chart" aria-label="Son yedi günün etkinlik sayıları">'+bars+'</div><div class="pc-stats"><span><b>'+dashboard.words.length+'</b>Çalışılan kelime / ifade</span><span><b>'+dashboard.totalStops+'</b>Tamamlanan durak</span></div><p>Kaydedilen oyun süresi '+Math.round(dashboard.gameSeconds/60)+' dakika.</p>'+row('Çalışılan Kelimeler','cards')+row('Evde Pratik Sonuçları','history')+row('Tekrar Önerileri','weak')+row('Aylık Aile Raporu','monthly','Premium Pro'));
 }
 function family(){render('Ailem',childTop()+'<h1>Birlikte öğrenen ailem</h1><div class="pc-group">'+me.children.map(c=>row(c.full_name||c.username,'child',({premium_pro:'Premium Pro',pro:'Pro',free:'Free'})[c.plan],'data-id="'+c.id+'"')).join('')+'</div>'+btn('＋ Öğrenci ekle','link','secondary')+'<p class="pc-family-note">İlk çocuk ve bir kardeş ücretsiz.</p><div class="pc-group">'+row('Çocuğum İçin Hesap Oluştur','create-child','Henüz öğrenci hesabı yoksa')+row('Mevcut Öğrenciyi Kodla Bağla','link-code')+row('Aile Hedefi','goal')+row('Öğretmen Bilgileri','teacher')+row('Bildirimler','settings')+row('Hesap Ayarları','account','Hesap değiştir ve güvenli çıkış')+'</div>');}
 function linkView(){render('Çocuğunu Bağla','<h1>Çocuğumu Bağla</h1><p>6 haneli veli bağlama kodunu çocuğunun hesabından alabilirsin.</p><form data-form="link">'+field('Veli bağlama kodu','code','text','','required inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code"')+'<button class="pc-primary">Çocuğumu Bağla</button></form>'+btn('Çocuğum İçin Hesap Oluştur','create-child','secondary')+'<p>İlk çocuk ve 1 kardeş ücretsiz.</p>',{back:true});}
 function setup(settings=lastSetup,kind='test'){
  tab='practice';
  lastSetup={...settings};pendingStart=null;const counts=settings.wordKeys?[Math.min(5,settings.wordKeys.length),10,15].filter((n,i,a)=>n<=settings.wordKeys.length&&a.indexOf(n)===i):[5,10,15];
  render('Bana Özel Test Hazırla',(settings.wordKeys?'<div class="pc-note">Az önce çalıştığın '+settings.wordKeys.length+' kelimeyle kısa test.</div>':'')+'<p>'+esc(dashboard.student.name)+(dashboard.student.classNo?' · '+dashboard.student.classNo+'. sınıf':'')+'</p><form data-form="setup" data-kind="'+kind+'"><label class="pc-field">1 · Kelime kaynağı<select name="source">'+[['all','Çalıştığı tüm konular'],['last','Son çalıştığı ünite'],['weak','Zorlandığı kelimeler']].map(([v,l])=>'<option value="'+v+'" '+(settings.source===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label class="pc-field">2 · Soru sayısı</label><input type="hidden" name="count" value="'+settings.count+'"><div class="pc-segment">'+counts.map(n=>'<button type="button" data-action="setup-count" data-count="'+n+'" class="'+(Number(settings.count)===n?'active':'')+'">'+n+' soru</button>').join('')+'</div><label class="pc-field">İçerik<select name="content">'+[['all','Kelime + dil yapıları'],['words','Yalnızca kelimeler'],['patterns','Yalnızca dil yapıları']].map(([v,l])=>'<option value="'+v+'" '+(settings.content===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><h2>3 · Soru türlerini seç</h2><div class="pc-grid">'+[['image','Görsel'],['choice','Çoktan seçmeli'],['listen','Dinleme'],['match','Eşleştirme'],['order','Cümle kurma'],['speak','Dinle ve söyle'],['memory','Hafıza']].map(([v,l])=>'<label><input type="checkbox" name="types" value="'+v+'" '+(settings.types.includes(v)?'checked':'')+'>'+l+'</label>').join('')+'</div><div class="pc-note" id="pcPool" role="status">Kaynağı ve soru türlerini seç. Hazır kelimeleri kontrol ederek başlayabilirsin.</div><button type="button" data-action="pool" class="pc-secondary">Uygun Kelimeleri Kontrol Et</button><button type="submit" class="pc-primary" disabled data-start>'+(kind==='game'?'Oyunu Başlat':'Testi Başlat')+'</button></form><p>Görsel seçilirse yalnızca sınıfına uygun ve görseli yüklenebilen kelimeler kullanılır.</p>',{back:true,screen:'setup'});
 }
 function formSettings(form){const data=new FormData(form);return {source:data.get('source'),count:Number(data.get('count')),content:data.get('content'),types:data.getAll('types'),...(lastSetup.wordKeys?{wordKeys:lastSetup.wordKeys}:{})};}
 function premium(message){render('Premium Pro','<h1>Daha fazla birlikte öğrenin</h1><div class="pc-note">'+esc(message)+'</div><p>Özellikler seçili çocuğun üyeliğine göre açılır. Geçmiş sonuçlar kayıtlı kalır.</p><p>Üyeliği çocuğunun öğrenci hesabındaki Mağaza bölümünden yükseltebilirsin.</p><a class="pc-primary" href="./?giris=1">Öğrenci Girişini Aç</a>'+btn('Evde Pratiğe Dön','practice','secondary'),{back:true});}
 async function start(kind='test',settings=lastSetup){
  if(!pendingStart||pendingStart.kind!==kind||JSON.stringify(pendingStart.settings)!==JSON.stringify(settings))pendingStart={id:crypto.randomUUID(),kind,settings};
  const result=await api('parentStart',pendingStart);pendingStart=null;practice=result.practice;showQuestion();
 }
 function showQuestion(){
  window.dmSharedVoice?.cancel();selection='';memoryPicked=null;memoryMatches=0;memoryMistake=false;
  if(practice.completedAt){results();return;}
  const q=practice.question;if(!q){error('Soru yüklenemedi. Çalışmanı yeniden açabilirsin.');return;}
  lessonQuestion=q;screen='question';tab='practice';
  const order=q.type==='order',listen=['listen','speak'].includes(q.type),memory=q.type==='memory';
  const prompt=q.type==='image'?'Görseldeki kelimeyi seç.':q.type==='speak'?'Dinle ve söyle.':listen?'Dinle ve doğru ifadeyi seç.':order?'Kelimeleri doğru sıraya koy.':memory?'Kelime ve anlamını eşleştir.':'İngilizcesini seç.';
  const cards=memory?(q.pairs||[]).flatMap((pair,index)=>[{pair:index,text:pair.en},{pair:index,text:pair.tr}]).sort(()=>Math.random()-.5):[];
  const options=memory?'<div class="pc-grid">'+cards.map(c=>'<button class="pc-choice bz-sec" data-action="memory-card" data-pair="'+c.pair+'" data-text="'+esc(c.text)+'" aria-label="Hafıza kartı">?</button>').join('')+'</div>':order?'<div class="pc-built rq-built" id="pcBuilt"></div><div class="rq-token-pool">'+q.tokens.map((t,i)=>'<button class="pc-token bz-cip2" data-action="word" data-index="'+i+'">'+esc(t)+'</button>').join('')+'</div>'+btn('Baştan Diz','reset-order','link'):'<div class="bz-secenekler">'+q.options.map(o=>'<button type="button" class="pc-choice bz-sec" data-action="answer-choice" data-value="'+esc(o)+'" aria-pressed="false">'+esc(o)+'</button>').join('')+'</div>';
  app.innerHTML='<section id="bzPerde" class="rq-approved pc-route '+(innerHeight<740?'rq-compact':'')+'" aria-label="Evde Pratik testi"><header class="rq-hud"><img class="rq-papi" src="route-assets/papi-school.webp" alt="Papi"><span class="rq-wallet"><b>Evde Pratik</b></span><span class="rq-wallet"><small>'+esc(dashboard?.student?.name||'Birlikte öğreniyoruz')+'</small></span></header><div id="bzAlan"><div class="rq-progress"><button class="rq-review" data-action="practice" aria-label="Çalışmadan çık">‹</button><span>Soru '+(practice.cursor+1)+' / '+practice.total+'</span><div><i style="width:'+practice.cursor/practice.total*100+'%"></i></div><button class="rq-close" data-action="practice" aria-label="Kaydet ve kapat">×</button></div><h2 class="bz-etiket">'+esc(prompt)+'</h2>'+(q.type==='image'?'<img id="pcQuestionImage" class="pc-image" alt="Kelime görseli" src="'+esc(q.image)+'">':'')+(listen?audioButton():'')+(!listen&&!memory&&q.type!=='image'?'<div class="pc-question-prompt bz-soru">'+esc(q.tr||q.en)+'</div>':'')+options+(q.type==='speak'?btn('Mikrofona Söyle','mic','secondary'):'')+'<div id="pcFeedback" aria-live="polite"></div><button type="button" class="bz-btn" data-action="check" disabled>Kontrol Et</button><p id="pcSaveStatus" class="pc-saved">Kaldığın yerden devam edebilirsin.</p><div id="pcError" class="pc-error" role="alert"></div></div></section>';
  document.title='Evde Pratik · Diji-Medu';
  document.getElementById('pcQuestionImage')?.addEventListener('error',()=>{error('Görsel yüklenemedi. Çalışmanı kaybettirmeden yeniden açabilirsin.');app.querySelector('[data-action="check"]').disabled=true;});
 }
 function feedbackView(){
  window.dmSharedVoice?.cancel();app.querySelectorAll('.pc-audio').forEach(b=>{b.disabled=false;b.classList.remove('is-playing');});
  const answer=practice.answers.at(-1);screen='feedback';
  if(!document.getElementById('pcFeedback')){
   const saved=practice;practice={...practice,completedAt:null,question:lessonQuestion||{type:'choice',tr:answer.tr,en:answer.en,options:[answer.en]}};showQuestion();practice=saved;screen='feedback';
  }
  app.querySelectorAll('[data-action="answer-choice"],[data-action="memory-card"],[data-action="word"],[data-action="reset-order"],[data-action="mic"]').forEach(b=>{b.disabled=true;if(b.dataset.value===answer.en)b.classList.add('dogru');else if(b.getAttribute('aria-pressed')==='true'&&!answer.correct)b.classList.add('yanlis');});
  const box=document.getElementById('pcFeedback');box.className='bz-geri-bildirim'+(answer.correct?'':' kotu');box.innerHTML='<strong>'+(answer.correct?'✓ Doğru cevap!':'Birlikte tekrar edelim')+'</strong><span>'+esc(answer.en)+' · '+esc(answer.tr)+'</span>';
  const button=app.querySelector('[data-action="check"]');button.dataset.action='next-question';button.disabled=false;button.textContent=practice.completedAt?'Sonuçları Gör':'Devam Et';
  document.getElementById('pcSaveStatus').textContent='Cevabın kaydedildi.';
  window.dmAnswerAudio?.play(answer.correct,'word',{eventId:practice.id+':'+practice.cursor});
 }
 async function answer(){
  if(!selection){error('Bir cevap seç.');return;}
  pendingAnswer={id:practice.id,cursor:practice.cursor,answer:selection,studentId:childId,question:practice.question};persistPending();
  await sendPending();
 }
 async function sendPending(){
  if(pendingAnswer.question)lessonQuestion=pendingAnswer.question;
  const result=await api('parentAnswer',pendingAnswer);practice=result.practice;pendingAnswer=null;persistPending();feedbackView();
 }
 function results(){
  screen='results';document.title='Evde Pratik Sonuçları · Diji-Medu';window.dmSharedVoice?.cancel();const wrong=practice.answers.filter(a=>!a.correct),percent=Math.round(practice.correct/practice.total*100),mood=percent>=70?'sevinc':'teselli';
  app.innerHTML='<section id="genelSonucOverlay" class="pc-route-result"><div class="gso-kart dm-result-card"><span class="dm-result-papi dm-papi-host">'+(window.DMPapi?.html(mood)||'<img src="discovery-assets/papi-kutlama.webp" alt="Papi">')+'</span><h1 id="gsoBaslik">'+(percent>=70?'Harika bir çalışma!':'Her tekrar bir adım!')+'</h1><p>Evde Pratik tamamlandı</p><div class="pc-result-stats"><span><b>'+practice.correct+'</b>Doğru</span><span><b>'+wrong.length+'</b>Tekrar</span><span><b>%'+percent+'</b>Başarı</span></div>'+(wrong.length?'<div class="pc-note">Tekrar edelim: '+wrong.slice(0,3).map(a=>esc(a.en)).join(', ')+'</div>'+btn('Kelimeleri Birlikte Tekrar Et','review-result'):'<div class="pc-note">Bu çalışmadaki tüm sorular doğru!</div>')+btn('Evde Pratiğe Dön','practice',wrong.length?'secondary':'primary')+'<p class="pc-saved">Sonuç gelişim raporuna eklendi. Parkur puanları değişmez.</p><div id="pcError" class="pc-error" role="alert"></div></div></section>';
 }
 function practiceHistory(){
  render('Evde Pratik Sonuçları','<h1>Kaydedilmiş çalışmalar</h1>'+(dashboard.history.length?dashboard.history.map(h=>row(({test:'Kelime testi',game:'Papi ile oyun',plan:'Çalışma planı',summary:'Papi özeti'})[h.kind]||'Pratik','resume',new Date(h.createdAt).toLocaleDateString('tr-TR')+' · '+(h.completedAt?h.correct+' / '+h.total:h.cursor+' / '+h.total+' soru kaydedildi'),'data-id="'+h.id+'"')).join(''):'<p>İlk çalışmanızdan sonra sonuçlar burada görünecek.</p>'),{back:true});
 }
 async function resume(id){
  const result=await api('parentResume',{id});practice=result.practice;
  if(['plan','summary'].includes(practice.kind)){planView();return;}
  pendingAnswer=null;try{const saved=JSON.parse(localStorage.getItem(pendingKey())||'null');if(saved?.id===id)pendingAnswer=saved;}catch{}
  if(pendingAnswer){await sendPending();return;}
  showQuestion();
 }
 function beginCards(list){words=list;cardIndex=0;cardBack=false;cardRatings={};cardSession=crypto.randomUUID();cardView();}
 function cardView(){
  const word=words[cardIndex];
  if(!word){render('Kelime Kartlarım','<div class="pc-empty"><h1>İlk kelimeler yolda</h1><p>Çocuğun bir Parkur durağını tamamladığında öğrendiği kelimeler burada görünecek.</p></div>',{back:true});return;}
  render('Kelime Kartlarım','<div class="pc-card-head"><b>'+ (cardIndex+1)+' / '+words.length+'</b><span>'+Object.keys(cardRatings).length+' kelime değerlendirildi</span></div><div class="pc-progress"><i style="width:'+(cardIndex+1)/words.length*100+'%"></i></div><button class="pc-cardflip" data-action="flip"><span>'+esc(cardBack?word.tr:word.en)+'</span><small>Diğer yüzü görmek için dokun</small></button>'+audioButton('card-speak')+'<div class="pc-card-ratings"><button data-action="card-rate" data-good="1" '+(cardRatings[cardIndex]===true?'aria-pressed="true"':'')+'>✓ Doğru</button><button data-action="card-rate" data-good="0" '+(cardRatings[cardIndex]===false?'aria-pressed="true"':'')+'>↻ Yanlış</button></div><p id="pcCardStatus" class="pc-saved">'+(cardRatings[cardIndex]===true?'Bu kelimeyi biliyorsun.':cardRatings[cardIndex]===false?'Birlikte bir kez daha tekrar edelim.':'Kelimeyi hatırladığında kendini değerlendir.')+'</p><div class="pc-card-nav"><button data-action="card-prev" '+(cardIndex===0?'disabled':'')+'>‹ Önceki</button><button data-action="card-next">'+(cardIndex+1===words.length?'Tamamla ✓':'Sonraki ›')+'</button></div>',{back:true});
 }
 function cardsDone(){render('Kelime Tekrarı Tamamlandı','<div class="pc-complete"><img src="discovery-assets/papi-kutlama.webp" alt="Papi"><h1>Kelimeler hazır!</h1><p>'+words.length+' kelimeyi birlikte tekrar ettiniz.</p></div><div class="pc-stats"><span><b>'+Object.values(cardRatings).filter(Boolean).length+'</b>Doğru</span><span><b>'+Object.values(cardRatings).filter(x=>!x).length+'</b>Tekrar edilecek</span></div>'+btn('Bu Kelimelerle Kısa Teste Geç','cards-test')+btn('Kartlara Geri Dön','cards-restart','secondary'),{back:true});}

 function settingsView(){render('Bildirim Tercihleri','<form data-form="settings"><label class="pc-check"><input type="checkbox" name="teacherNotices" '+(me.parent.settings.teacherNotices!==false?'checked':'')+'>Öğretmen bildirimlerini göster</label><label class="pc-check"><input type="checkbox" name="practiceReminders" '+(me.parent.settings.practiceReminders!==false?'checked':'')+'>Panelde çalışma hatırlatmalarını göster</label><label class="pc-check"><input type="checkbox" name="progressMail" '+(me.parent.settings?.progressMailConsent?'checked':'')+'>Gelişim özetleri ve Papi haberlerini e-postayla al (isteğe bağlı)</label><button class="pc-primary">Tercihleri Kaydet</button></form>',{back:true});}
 function goalView(){render('Aile Hedefimiz','<form data-form="goal"><label class="pc-field">Haftada kaç gün?<select name="days">'+[2,3,4,5,6,7].map(n=>'<option '+(dashboard.goal.days===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label><label class="pc-field">Günlük hedef<select name="minutes">'+[5,10,15].map(n=>'<option value="'+n+'" '+(dashboard.goal.minutes===n?'selected':'')+'>'+n+' dakika</option>').join('')+'</select></label><p>Kısa ve düzenli çalışmalarla ilerleyelim. Gün sayacı tamamlanan etkinliklere göre ilerler. Dakika seçimi çalışma süresi hedefinizdir.</p><button class="pc-primary">Hedefi Kaydet</button></form>',{back:true});}
 function speak(text){
  const voice=window.dmSharedVoice;
  if(!voice?.urlFor(text,'en-US')){error('Bu ifadenin kayıtlı sesi henüz hazır değil. Başka bir kelimeyle devam edebilirsin.');return;}
  const button=app.querySelector('[data-action="speak"],[data-action="card-speak"]');
  const restore=()=>{if(button?.isConnected){button.disabled=false;button.classList.remove('is-playing');}};
  const started=voice.play({text,lang:'en-US',rate:1,onstart:()=>{if(button?.isConnected){button.classList.add('is-playing');button.disabled=true;}},onend:restore,onerror:()=>{restore();error('Kayıtlı ses yüklenemedi. Bağlantını kontrol edip yeniden dinleyebilirsin.');}});
  if(!started){restore();error('Ses başlatılamadı. Dinle düğmesine yeniden dokun.');}
 }
 function planView(){
  const week=practice.kind==='plan',weekly=practice.feature==='weekly',list=practice.settings.words||[],days=dashboard.goal.days,dates=Object.keys(dashboard.activity).slice(-7),completed=dates.filter(d=>dashboard.activity[d]>0).length;
  if(!week){render('Papi Bana Anlatsın','<div class="pc-program-hero"><img src="discovery-assets/papi-mektup.webp" alt="Papi"><h1>Birlikte gelişiyoruz</h1><p>'+esc(practice.settings.summary||dashboard.summary)+'</p></div><div class="pc-group">'+list.map(w=>'<article class="pc-row"><span>'+esc(w.en)+'<small>'+esc(w.tr)+'</small></span></article>').join('')+'</div>'+btn('Bu Kelimeleri Tekrar Et','plan-cards'),{back:true});return;}
  const monday=new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Istanbul'}));monday.setDate(monday.getDate()-(monday.getDay()+6)%7);const schedule=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');});
  const activities=[['Kelime','cards','book'],['Oyun','game-match','practice'],['Kısa Test','setup','growth'],['Tekrar','weak','book']];
  render(weekly?'Haftalık Program':'Papi ile 10 Dakika','<div class="pc-program-hero"><img src="discovery-assets/papi-merhaba.webp" alt="Papi"><span class="pc-badge">'+(weekly?days+' günlük plan':'Birlikte 10 dakika')+'</span><h1>'+ (weekly?'Küçük adımlar, güzel ilerleme':'Bugün birlikte keşfedelim')+'</h1><p>'+ (weekly?'Öğrendiği kelimelerle düzenli ve keyifli tekrar.':'Kelimeyi hatırla, oyunla pekiştir, kısa testle tamamla.')+'</p></div>'+(weekly?'<form data-form="program-days" class="pc-program-days"><label>Haftada kaç gün?<select name="days">'+[2,3,4,5,6,7].map(n=>'<option '+(n===days?'selected':'')+'>'+n+'</option>').join('')+'</select></label><button class="pc-secondary">Programı Güncelle</button></form><p class="pc-saved">Son 7 günde '+completed+' gün çalışıldı. İşaretler tamamlanan etkinlikleri gösterir. Düzenlemek yeni deneme hakkı tüketmez.</p><div class="pc-program-grid">'+Array.from({length:days},(_,i)=>{const item=activities[i%activities.length],date=schedule[i],done=date&&dashboard.activity[date]>0;return '<button data-action="'+(item[1]==='cards'?'plan-cards':item[1]==='setup'?'plan-test':item[1])+'" class="'+(done?'done':'')+'"><small>'+ (i+1)+'. gün · '+esc(new Intl.DateTimeFormat('tr-TR',{weekday:'short'}).format(new Date(date+'T12:00:00Z')))+'</small>'+icon(item[2])+'<strong>'+item[0]+'</strong><span>'+(done?'✓ '+dashboard.activity[date]+' etkinlik':'Birlikte başlayın ›')+'</span></button>';}).join('')+'</div>':'<div class="pc-session-steps"><button data-action="plan-cards"><b>1</b>'+icon('book')+'<span><strong>Kelimeleri Hatırla</strong><small>'+list.length+' kelime · 3 dakika</small></span><em>›</em></button><button data-action="plan-game"><b>2</b>'+icon('practice')+'<span><strong>Oyunla Pekiştir</strong><small>Eşleştirme · 4 dakika</small></span><em>›</em></button><button data-action="plan-test"><b>3</b>'+icon('growth')+'<span><strong>Kendini Dene</strong><small>Kısa test · 3 dakika</small></span><em>›</em></button></div>')+'<div class="pc-plan-words"><strong>Birlikte çalışacağınız kelimeler</strong><div>'+list.map(w=>'<span>'+esc(w.en)+'</span>').join('')+'</div></div>',{back:true});
 }
 async function personal(kind,feature='daily'){
  tab='practice';
  if(!dashboard.words.length){error('Plan hazırlamak için önce tamamlanan duraklardan kelime bulunması gerekiyor.');return;}
  pendingStart=null;
  const settings={source:'all',count:5,content:'all',types:['choice'],summary:dashboard.summary,words:[...dashboard.words].sort((a,b)=>Number(b.weak)-Number(a.weak)).slice(0,5)};
  pendingStart={id:crypto.randomUUID(),kind,feature,settings};
  const result=await api('parentStart',pendingStart);pendingStart=null;practice=result.practice;planView();
 }
 async function action(name,el){
  if(studentMode&&['back','practice'].includes(name)){await studentHome();return;}
  if(name==='auth-back'){
   if(embeddedAuth){window.parent.postMessage('dm-parent-auth-back',location.origin);return;}
   try{const previous=new URL(document.referrer);if(previous.origin===location.origin&&['/ingilizce/','/ingilizce/index.html','/ingilizce'].includes(previous.pathname)&&history.length>1){history.back();return;}}catch{}
   location.assign(initialSignup?'./?kayit=1&rolSec=1':'./?girisSecenekleri=1');return;
  }
  if(name==='signup'){authForm(true);return;}if(name==='login'){authForm();return;}
  if(name==='logout'){await api('parentLogout');window.dmSavedParents?.forget(token);localStorage.removeItem(KEY);token='';me=null;authForm();return;}
  if(name==='refresh'){await load();return;}if(name==='resend'){const r=await api('parentResend');error(r.mailed?'Doğrulama e-postası kuyruğa alındı.':'E-posta şu an gönderilemedi. Biraz sonra tekrar dene.');return;}
  if(name==='forgot'){render('Şifremi Unuttum','<form data-form="forgot">'+field('E-posta adresi','email','email','','required autocomplete="email"')+'<button class="pc-primary">Yenileme Bağlantısı Gönder</button></form>',{noNav:true,back:true});return;}
  if(name==='tab'){tab=el.dataset.tab;if(childId)dashboard=await api('parentDashboard');showTab();return;}
  if(name==='back'){if(!me){authForm();return;}showTab();return;}
  if(name==='children'){childrenView();return;}
  if(name==='select-child'){lastSetup={source:'last',count:5,content:'all',types:['choice']};words=[];childId=el.dataset.id;localStorage.setItem(CHILD,childId);dashboard=await api('parentDashboard');showTab();return;}
  if(name==='switch-account'){sessionStorage.setItem('dm_open_account_picker','1');location.assign('./?hesap=1');return;}
  if(name==='link-code'){linkView();return;}
  if(name==='link'){name='create-child';}
  if(name==='create-child'){sessionStorage.setItem('dm_parent_child_signup',JSON.stringify({email:me.parent.email,at:Date.now()}));location.assign('./?kayit=1&veliCocuk=1');return;}
  if(name==='practice'){tab='practice';if(childId)dashboard=await api('parentDashboard');showTab();return;}
  if(name==='growth'){tab='growth';showTab();return;}
  if(name==='setup'){setup({...lastSetup,wordKeys:undefined});return;}
  if(name==='text-test'){setup({...lastSetup,types:['choice'],source:'all'});return;}
  if(name==='games'){render('Papi ile Oyna','<h1>Kelime oyunları</h1>'+row('Eşleştirme','game-match','Türkçe anlamı İngilizce kelimeyle eşleştir')+row('Hafıza Oyunu','game-memory','İngilizce kelimeleri anlamlarıyla hatırla')+row('Doğru Kelimeyi Bul','game-choice','Çalıştığı kelimeleri tekrar et')+row('Kelime Avı','game-order','Harf ve kelimeleri sıraya koy'),{back:true});return;}
  if(name.startsWith('game-')){setup({source:'all',count:5,content:'all',types:[name==='game-memory'?'memory':name==='game-match'?'match':name==='game-order'?'order':'choice']},'game');return;}
  if(name==='patterns'){setup({source:'all',count:5,content:'patterns',types:['order']});return;}
  if(name==='speaking'){setup({source:'all',count:5,content:'all',types:['speak']});return;}
  if(name==='weak'){setup({source:'weak',count:5,content:'all',types:['choice']});return;}
  if(name==='setup-count'){const form=el.closest('form');form.elements.count.value=el.dataset.count;form.querySelectorAll('[data-action="setup-count"]').forEach(b=>b.classList.toggle('active',b===el));form.querySelector('[data-start]').disabled=true;document.getElementById('pcPool').textContent='Hazır kelimeleri kontrol ederek devam edebilirsin.';return;}
  if(name==='pool'){const form=app.querySelector('[data-form="setup"]');lastSetup=formSettings(form);if(!lastSetup.types.length){error('En az bir soru türü seç.');return;}const r=await api('parentPool',{settings:lastSetup});const enough=r.words.length>=lastSetup.count;document.getElementById('pcPool').innerHTML=r.words.length?'<strong>'+r.words.length+' kelime hazır.</strong><br>'+(enough?'Testin hazır. Birlikte başlayabilirsiniz.':'Daha az soru veya başka bir kaynak seçebilirsin.'):'<strong>Bu seçim için içerik henüz hazır değil.</strong><br>Kelime sorularıyla devam edebilir veya farklı bir kaynak seçebilirsin.'+(lastSetup.types.includes('image')?btn('Kelime sorularına geç','text-test','secondary'):'');form.querySelector('[data-start]').disabled=!enough;return;}
  if(name==='answer-choice'){if(screen==='feedback')return;selection=el.dataset.value;app.querySelector('[data-action="check"]').disabled=false;app.querySelectorAll('.pc-choice').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));return;}
  if(name==='word'){selection+=(selection?(practice.question.join??' '):'')+practice.question.tokens[Number(el.dataset.index)];el.disabled=true;document.getElementById('pcBuilt').textContent=selection;app.querySelector('[data-action="check"]').disabled=false;return;}
  if(name==='reset-order'){app.querySelector('[data-action="check"]').disabled=true;selection='';document.getElementById('pcBuilt').textContent='';app.querySelectorAll('[data-action="word"]').forEach(b=>b.disabled=false);return;}
  if(name==='memory-card'){
   if(el.dataset.matched||el===memoryPicked||el.dataset.open)return;
   el.textContent=el.dataset.text;el.dataset.open='1';
   if(!memoryPicked){memoryPicked=el;return;}
   const first=memoryPicked;memoryPicked=null;
   if(first.dataset.pair===el.dataset.pair){first.dataset.matched='1';el.dataset.matched='1';memoryMatches++;if(memoryMatches===practice.question.pairs.length){selection=memoryMistake?'__memory_mistake__':practice.question.en;app.querySelector('[data-action="check"]').disabled=false;}}
   else{memoryMistake=true;setTimeout(()=>{if(!first.isConnected||!el.isConnected)return;first.textContent='?';el.textContent='?';delete first.dataset.open;delete el.dataset.open;},800);}
   return;
  }
  if(name==='check'){await answer();return;}if(name==='next-question'){showQuestion();return;}
  if(name==='speak'){speak(practice.question.en);return;}
  if(name==='mic'){
   const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
   if(!Recognition){error('Bu cihazda konuşma tanıma desteklenmiyor. Dinleyip tekrar edebilir ve cevabını seçebilirsin.');return;}
   const recognition=new Recognition();recognition.lang='en-US';recognition.onresult=e=>{const said=e.results[0][0].transcript;selection=said;app.querySelector('[data-action="check"]').disabled=false;error('Algılanan ifade '+said+'. Cevabı Kontrol Et düğmesine basabilirsin.');};recognition.onerror=()=>error('Ses algılanamadı. Tekrar deneyebilirsin.');recognition.start();return;
  }
  if(name==='history'){dashboard=await api('parentDashboard');practiceHistory();return;}
  if(name==='resume'){await resume(el.dataset.id);return;}
  if(name==='review-result'){beginCards(practice.answers.filter(a=>!a.correct).map(a=>({en:a.en,tr:a.tr})));return;}
  if(name==='cards'){beginCards(dashboard.words);return;}
  if(name==='plan-cards'){beginCards(practice.settings.words);return;}
  if(name==='flip'){cardBack=!cardBack;cardView();return;}
  if(name==='card-speak'){speak(words[cardIndex].en);return;}
  if(name==='card-rate'){window.dmSharedVoice?.cancel();app.querySelectorAll('.pc-audio').forEach(b=>{b.disabled=false;b.classList.remove('is-playing');});const good=el.dataset.good==='1';cardRatings[cardIndex]=good;window.dmAnswerAudio?.play(good,'word',{eventId:cardSession+':'+cardIndex+':'+good});app.querySelectorAll('[data-action="card-rate"]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));document.getElementById('pcCardStatus').textContent=good?'Bu kelimeyi biliyorsun.':'Birlikte bir kez daha tekrar edelim.';return;}
  if(name==='cards-restart'){beginCards(words);return;}
  if(name==='card-next'||name==='card-prev'){if(name==='card-next'&&cardIndex+1>=words.length){cardsDone();return;}cardIndex=Math.max(0,Math.min(words.length-1,cardIndex+(name==='card-next'?1:-1)));cardBack=false;cardView();return;}
  if(name==='cards-test'||name==='plan-test'||name==='plan-game'){const list=name==='cards-test'?words:practice.settings.words;setup({source:'all',count:Math.min(5,list.length),content:'all',types:[name==='plan-game'?'match':'choice'],wordKeys:list.map(w=>w.en+'|'+w.tr)},name==='plan-game'?'game':'test');return;}
  if(name==='goal'){goalView();return;}
  if(name==='current'||name==='previous'){dashboard=await api('parentDashboard',{previous:name==='previous'});growth(name==='previous');return;}
  if(name==='notices'){render('Bildirimler','<h1>Öğretmeninden</h1>'+(dashboard.notices.length?dashboard.notices.map(n=>'<article class="pc-row"><span>'+esc(n.message)+'<small>'+new Date(n.created_at).toLocaleDateString('tr-TR')+'</small></span></article>').join(''):'<p>Yeni öğretmen bildirimi yok.</p>')+btn('Bildirim Tercihleri','settings','secondary'),{back:true});return;}
  if(name==='settings'){settingsView();return;}
  if(name==='teacher'){const t=dashboard.teacher;render('Öğretmen Bilgileri',t?'<h1>'+esc(t.full_name||t.display_name)+'</h1><p>'+esc(t.school)+'</p>':'<p>Bu hesaba bağlı öğretmen bulunmuyor.</p>',{back:true});return;}
  if(name==='child'){
   childId=el.dataset.id;localStorage.setItem(CHILD,childId);dashboard=await api('parentDashboard');
   render('Çocuk Hesabı','<h1>'+esc(dashboard.student.name)+'</h1>'+badge(dashboard.plan)+row('Öğretmeni','teacher')+row('Üyelik Durumu','membership')+row('Çocuğumun Hesabına Geç','switch-student')+row('Çocuğun Geçiş Kodu','child-code')+'<p>Özellikler seçili çocuğun üyeliğine göre açılır.</p>'+btn('Veli bağlantısını kaldır','unlink','link'),{back:true});return;
  }
  if(name==='unlink'){if(confirm('Bu çocuğun veli bağlantısı kaldırılsın mı?')){await api('parentUnlink');await load();}return;}
  if(name==='membership'){premium('Seçili çocuğun üyeliği '+({free:'Free',pro:'Pro',premium_pro:'Premium Pro'})[dashboard.plan]+'.');return;}
  if(name==='account'){render('Hesap Ayarları','<h1>'+esc(me.parent.name)+'</h1><p>'+esc(me.parent.email)+'</p>'+btn('⇄ Hesap Değiştir','switch-account')+btn('Çıkış Yap','logout','secondary'),{back:true});return;}
  if(name==='pin-mail'){const r=await api('parentPinResend');error(r.mailed?'Yeni geçiş kodun e-postaya gönderildi.':'E-posta gönderimi tamamlanamadı.');return;}
  if(name==='switch-student'){const r=await api('parentSwitchStudent');window.dmSavedParents?.forget(token);localStorage.removeItem(KEY);token='';sessionStorage.setItem('dm_session_handoff_v1',JSON.stringify({token:r.token,name:r.username,role:'ogrenci',google:false,previous:localStorage.getItem('ing_token')||'',at:Date.now()}));localStorage.setItem('dm_last_account_v1',JSON.stringify({kind:'personal'}));location.assign('./?hesap=1');return;}
  if(name==='child-code'){
   const r=await api('parentChildCode');
   render('Çocuğun Geçiş Kodu','<h1>'+esc(dashboard.student.name)+'</h1><p>'+(r.code?'Geçiş kodu: <strong>'+esc(r.code)+'</strong>':'Bu çocuk için kendi kodunu belirledin.')+'</p><p>Öğrenci hesabına geçerken kod gerekmez.</p><form data-form="child-code">'+field('Yeni geçiş kodu','pin','password','','required inputmode="numeric" minlength="6" maxlength="6" pattern="[0-9]{6}" autocomplete="off"')+'<button class="pc-primary">Kodu Kaydet</button></form>',{back:true});return;
  }
  if(name==='weekly'){await personal('plan','weekly');return;}
  if(name==='daily'||name==='summary'){await personal(name==='daily'?'plan':'summary');return;}
  if(name==='monthly'){
   if(dashboard.plan!=='premium_pro'){premium('Aylık aile gelişim raporu Premium Pro ile açılır.');return;}
   const r=await api('parentDashboard',{monthly:true});dashboard=r;
   render('Aylık Aile Raporu','<h1>Son 30 gün</h1><div class="pc-summary"><strong>'+Object.values(r.activity).reduce((a,b)=>a+b,0)+' etkinlik</strong><p>'+r.totalStops+' toplam tamamlanan durak</p></div><p>'+Math.round(r.gameSeconds/60)+' dakika kayıtlı oyun süresi</p>'+btn('Bu Haftaya Dön','current','secondary'),{back:true});return;
  }
 }
 app.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action]');if(!el||busy)return;
  busy=true;
  try{await action(el.dataset.action,el);}catch(e){if(e.premium)premium(e.message);else error(e.message);}
  finally{busy=false;}
 });
 app.addEventListener('change',async event=>{if(event.target.closest('[data-form="setup"]')){const form=event.target.closest('form');form.querySelector('[data-start]').disabled=true;document.getElementById('pcPool').textContent='Seçimlerin değişti. Hazır kelimeleri yeniden kontrol et.';return;}if(event.target.id!=='pcChild')return;childId=event.target.value;localStorage.setItem(CHILD,childId);try{dashboard=await api('parentDashboard');showTab();}catch(e){error(e.message);}});
 app.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;const form=event.target;if(!form.reportValidity())return;
  busy=true;const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try{
   const data=new FormData(form),type=form.dataset.form;
   if(type==='auth'){
    const r=await api(screen==='signup'?'parentSignup':'parentLogin',{name:data.get('name'),email:data.get('email'),password:data.get('password'),consent:data.get('consent')==='on',progressMail:data.get('progressMail')==='on'});saveToken(r.token);await load();
   }else if(type==='forgot'){const r=await api('parentResetRequest',{email:data.get('email')});error(r.mesaj);}
   else if(type==='reset'){const hash=new URLSearchParams(location.hash.slice(1));const r=await api('parentReset',{token:hash.get('reset'),password:data.get('password')});saveToken(r.token);history.replaceState(null,'',location.pathname);await load();}
   else if(type==='link'){await api('parentLink',{code:data.get('code')});await load();}
   else if(type==='setup'){lastSetup=formSettings(form);if(!lastSetup.types.length)throw Error('En az bir soru türü seç.');await start(form.dataset.kind,lastSetup);}
   else if(type==='program-days'){await api('parentGoal',{days:Number(data.get('days')),minutes:dashboard.goal.minutes});dashboard=await api('parentDashboard');planView();}
   else if(type==='goal'){await api('parentGoal',{days:Number(data.get('days')),minutes:Number(data.get('minutes'))});dashboard=await api('parentDashboard');showTab();}
   else if(type==='settings'){await api('parentSettings',{teacherNotices:data.get('teacherNotices')==='on',practiceReminders:data.get('practiceReminders')==='on',progressMail:data.get('progressMail')==='on'});await load();}
   else if(type==='child-code'){await api('parentSetChildCode',{pin:data.get('pin')});await action('child-code');error('Yeni geçiş kodu kaydedildi.');}
  }catch(e){if(e.premium)premium(e.message);else error(e.message);}
  finally{busy=false;buttons.forEach(b=>b.disabled=false);}
 });
 async function studentHome(){
  const r=await api('parentStudentPractice');
  render('Evde Pratik','<h1>Veliyle birlikte çalışmalarım</h1>'+r.practices.map(h=>row('Evde Pratik','resume',(h.completedAt?h.correct+' / '+h.total:h.cursor+' / '+h.total+' soru kaydedildi'),'data-id="'+h.id+'"')).join('')+(!r.practices.length?'<p>Velinin hazırladığı çalışmalar burada görünecek.</p>':'')+'<a class="pc-secondary" href="./?hesap=1">Parkura Dön</a>',{noNav:true});
 }
 async function init(){
  if(studentMode){try{await studentHome();}catch(e){render('Evde Pratik','<p>'+esc(e.message)+'</p><a href="./?giris=1">Öğrenci Girişi</a>',{noNav:true});}return;}
  const hash=new URLSearchParams(location.hash.slice(1));
  if(hash.get('parentToken')){saveToken(hash.get('parentToken'));history.replaceState(null,'',location.pathname);}
  try{
   if(hash.get('verify')){const r=await api('parentVerify',{token:hash.get('verify')});saveToken(r.token);history.replaceState(null,'',location.pathname);}
   if(hash.get('reset')){render('Yeni Veli Şifresi','<form data-form="reset">'+field('Yeni şifre','password','password','','required minlength="6" maxlength="64" autocomplete="new-password"')+'<button class="pc-primary">Şifreyi Kaydet</button></form>',{noNav:true});return;}
   if(token){await load();return;}
   authForm(new URLSearchParams(location.search).get('kayit')==='1');
  }catch(e){authForm();error(e.message);}
 }
 window.addEventListener('pageshow',event=>{if(event.persisted&&token!==localStorage.getItem(KEY))location.reload();});
 window.addEventListener('online',async()=>{if(pendingAnswer&&!busy){busy=true;try{await sendPending();}catch(e){error(e.message);}finally{busy=false;}}});
 init();
})();
