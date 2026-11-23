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
 let networkCount=0;
 function networkBusy(active){
  networkCount=Math.max(0,networkCount+(active?1:-1));
  let state=document.getElementById('pcNetwork');
  if(networkCount&&!state){state=document.createElement('div');state.id='pcNetwork';state.setAttribute('role','status');state.textContent='Veriler yükleniyor…';state.style.cssText='position:fixed;top:calc(env(safe-area-inset-top) + 45px);left:50%;transform:translateX(-50%);width:min(100%,490px);z-index:40;padding:8px 16px;text-align:center;background:#e4f3ed;color:#154237;font:600 12px system-ui';document.body.append(state);}
  if(!networkCount)state?.remove();
 }
 let token=localStorage.getItem(KEY)||'',me=null,childId=localStorage.getItem(CHILD)||'',dashboard=null,tab='home',screen='',busy=false,practice=null,selection='',words=[],cardIndex=0,cardBack=false,lastSetup={source:'last',count:5,content:'all',types:['choice']},pendingAnswer=null,pendingStart=null,memoryPicked=null,memoryMatches=0,memoryMistake=false;
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
  render(title,'<form id="pcAuth" class="pc-auth" data-form="auth">'+(signup?field('İsim Soyisim','name','text','','required minlength="2" maxlength="80" autocomplete="name"'):'')+field('E-posta adresi','email','email','','required maxlength="120" autocomplete="email"')+field('Şifre','password','password','','required minlength="6" maxlength="64" autocomplete="'+(signup?'new-password':'current-password')+'"')+(signup?'<label class="pc-check"><input type="checkbox" name="consent" required><span><a href="gizlilik.html" target="_blank" rel="noopener">Gizlilik bilgilendirmesini</a> okudum, <a href="kullanim-kosullari.html" target="_blank" rel="noopener">kullanım koşullarını</a> kabul ediyorum.</span></label>':'')+'<button class="pc-primary" type="submit">'+(signup?'Hesabımı Oluştur':'Giriş Yap')+'</button></form>'+btn(signup?'Hesabım Var':'Veli Hesabı Oluştur',signup?'login':'signup','secondary')+(!signup?btn('Şifremi Unuttum','forgot','link'):'')+'<a class="pc-row" href="./?baslangic=1">Giriş seçeneklerine dön</a>',{noNav:true,screen:signup?'signup':'login'});
 }
 async function load(){
  const result=await api('parentMe');me=result;
  if(!me.parent.verified){verifyView();return;}
  if(!me.children.some(c=>c.id===childId))childId=me.children[0]?.id||'';
  localStorage.setItem(CHILD,childId);
  if(childId)dashboard=await api('parentDashboard');else dashboard=null;
  showTab();
 }
 function verifyView(){render('E-posta Onayı','<h1>Son bir adım</h1><p>Doğrulama bağlantısı ve 6 haneli veli geçiş kodun e-posta adresine gönderildi.</p><p>'+esc(me.parent.email)+'</p>'+btn('Doğrulamayı Kontrol Et','refresh')+btn('E-postayı Tekrar Gönder','resend','secondary')+btn('Çıkış Yap','logout','link'),{noNav:true,screen:'verify'});}
 function childTop(){const child=dashboard.student;return '<div class="pc-top"><button class="pc-child-picker" data-action="children" aria-label="Öğrenci seç veya ekle" aria-haspopup="dialog"><span class="pc-avatar">'+esc(child.name.trim().slice(0,1).toLocaleUpperCase('tr'))+'</span><span><strong>'+esc(child.name)+'</strong><small>'+(child.classNo?child.classNo+'. sınıf':'Öğrenci hesabı')+'</small></span><span class="pc-chevron">⌄</span></button>'+badge(dashboard.plan)+'<button class="pc-icon pc-count" data-action="notices" aria-label="Öğretmen bildirimleri">'+icon('bell')+(dashboard.notices.length?'<b>'+Math.min(9,dashboard.notices.length)+(dashboard.notices.length>9?'+':'')+'</b>':'')+'</button></div>';}
 function childrenView(){render('Öğrencilerim','<h1>Birlikte kiminle çalışalım?</h1>'+me.children.map(c=>row(c.full_name||c.username,'select-child',({premium_pro:'Premium Pro',pro:'Pro',free:'Free'})[c.plan],'data-id="'+c.id+'"')).join('')+btn('＋ Öğrenci ekle','link')+'<p class="pc-saved">İlk çocuk ve bir kardeş ücretsiz.</p>',{back:true});}
 function empty(){return '<h1>Çocuğum</h1><div class="pc-empty"><h2>İlk çocuğunu ekle</h2><p>Mevcut öğrenci hesabını kodla bağlayabilir veya çocuğun için hesap oluşturabilirsin.</p></div>'+btn('Çocuğumu Bağla','link')+btn('Çocuğum İçin Hesap Oluştur','create-child','secondary');}
 function showTab(){
  if(!dashboard){render('Veli Paneli',empty()+btn('Hesap Ayarları','account','link'));return;}
  if(tab==='home')home();else if(tab==='practice')practiceHome();else if(tab==='growth')growth();else family();
 }
 function home(){
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date()),count=dashboard.activity[today]||0,goal=dashboard.goal,days=Object.values(dashboard.activity).filter(n=>n>0).length;
  const stop=dashboard.lastStop,stopLabel=stop&&stop.class_no>0&&stop.unit_no>0?stop.class_no+'. sınıf · '+stop.unit_no+'. ünite':'İlk durağını birlikte tamamlayın';
  render('Ana Sayfa',childTop()+'<h1>Bugün birlikte öğrenelim</h1><div class="pc-metrics"><article>'+icon('practice')+'<span>Bugünün özeti<strong>'+count+' etkinlik</strong><small>'+(count?'Birlikte güzel ilerliyorsunuz':'Kısa bir tekrar için hazırsınız')+'</small></span></article><button data-action="goal">'+icon('growth')+'<span>Haftalık hedef<strong>'+Math.min(days,goal.days)+' / '+goal.days+' gün</strong><div class="pc-progress"><i style="width:'+Math.min(100,days/goal.days*100)+'%"></i></div></span></button></div><div class="pc-group">'+row('Son çalıştığı ünite','growth',stopLabel)+'</div><div class="pc-papi"><img src="discovery-assets/papi-merhaba.webp" alt="Papi"><p><strong>Papi ile 10 dakika</strong>Birlikte kelime, oyun ve kısa test.</p></div>'+btn('▷ 10 dakikalık pratiğe başla','daily')+'<div class="pc-group">'+row('Papi Bana Anlatsın','summary','Çocuğunun gelişimini sade Türkçe ile gör')+row('Evde Pratik','practice','Öğrendiklerini birlikte pekiştirin')+'</div>');
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
 function family(){render('Ailem',childTop()+'<h1>Birlikte öğrenen ailem</h1><div class="pc-group">'+me.children.map(c=>row(c.full_name||c.username,'child',({premium_pro:'Premium Pro',pro:'Pro',free:'Free'})[c.plan],'data-id="'+c.id+'"')).join('')+'</div>'+btn('＋ Öğrenci ekle','link','secondary')+'<p class="pc-family-note">İlk çocuk ve bir kardeş ücretsiz.</p><div class="pc-group">'+row('Çocuğum İçin Hesap Oluştur','create-child','Henüz öğrenci hesabı yoksa')+row('Aile Hedefi','goal')+row('Öğretmen Bilgileri','teacher')+row('Bildirimler','settings')+row('Hesap Ayarları','account','Hesap değiştir ve güvenli çıkış')+'</div>');}
 function linkView(){render('Çocuğunu Bağla','<h1>Çocuğumu Bağla</h1><p>6 haneli veli bağlama kodunu çocuğunun hesabından alabilirsin.</p><form data-form="link">'+field('Veli bağlama kodu','code','text','','required inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code"')+'<button class="pc-primary">Çocuğumu Bağla</button></form>'+btn('Çocuğum İçin Hesap Oluştur','create-child','secondary')+'<p>İlk çocuk ve 1 kardeş ücretsiz.</p>',{back:true});}
 function setup(settings=lastSetup,kind='test'){
  tab='practice';
  lastSetup={...settings};pendingStart=null;
  render('Bana Özel Test Hazırla','<p>'+esc(dashboard.student.name)+(dashboard.student.classNo?' · '+dashboard.student.classNo+'. sınıf':'')+'</p><form data-form="setup" data-kind="'+kind+'"><label class="pc-field">1 · Kelime kaynağı<select name="source">'+[['all','Çalıştığı tüm konular'],['last','Son çalıştığı ünite'],['weak','Zorlandığı kelimeler']].map(([v,l])=>'<option value="'+v+'" '+(settings.source===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label class="pc-field">2 · Soru sayısı</label><input type="hidden" name="count" value="'+settings.count+'"><div class="pc-segment">'+[5,10,15].map(n=>'<button type="button" data-action="setup-count" data-count="'+n+'" class="'+(Number(settings.count)===n?'active':'')+'">'+n+' soru</button>').join('')+'</div><label class="pc-field">İçerik<select name="content">'+[['all','Kelime + dil yapıları'],['words','Yalnızca kelimeler'],['patterns','Yalnızca dil yapıları']].map(([v,l])=>'<option value="'+v+'" '+(settings.content===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><h2>3 · Soru türlerini seç</h2><div class="pc-grid">'+[['image','Görsel'],['choice','Çoktan seçmeli'],['listen','Dinleme'],['match','Eşleştirme'],['order','Cümle kurma'],['speak','Dinle ve söyle'],['memory','Hafıza']].map(([v,l])=>'<label><input type="checkbox" name="types" value="'+v+'" '+(settings.types.includes(v)?'checked':'')+'>'+l+'</label>').join('')+'</div><div class="pc-note" id="pcPool" role="status">Kaynağı ve soru türlerini seç. Hazır kelimeleri kontrol ederek başlayabilirsin.</div><button type="button" data-action="pool" class="pc-secondary">Uygun Kelimeleri Kontrol Et</button><button type="submit" class="pc-primary" disabled data-start>'+(kind==='game'?'Oyunu Başlat':'Testi Başlat')+'</button></form><p>Görsel seçilirse yalnızca sınıfına uygun ve görseli yüklenebilen kelimeler kullanılır.</p>',{back:true,screen:'setup'});
 }
 function formSettings(form){const data=new FormData(form);return {source:data.get('source'),count:Number(data.get('count')),content:data.get('content'),types:data.getAll('types')};}
 function premium(message){render('Premium Pro','<h1>Daha fazla birlikte öğrenin</h1><div class="pc-note">'+esc(message)+'</div><p>Özellikler seçili çocuğun üyeliğine göre açılır. Geçmiş sonuçlar kayıtlı kalır.</p><p>Üyeliği çocuğunun öğrenci hesabındaki Mağaza bölümünden yükseltebilirsin.</p><a class="pc-primary" href="./?giris=1">Öğrenci Girişini Aç</a>'+btn('Evde Pratiğe Dön','practice','secondary'),{back:true});}
 async function start(kind='test',settings=lastSetup){
  if(!pendingStart||pendingStart.kind!==kind||JSON.stringify(pendingStart.settings)!==JSON.stringify(settings))pendingStart={id:crypto.randomUUID(),kind,settings};
  const result=await api('parentStart',pendingStart);pendingStart=null;practice=result.practice;showQuestion();
 }
 function showQuestion(feedback=null){
  selection='';memoryPicked=null;memoryMatches=0;memoryMistake=false;
  if(practice.completedAt){results();return;}
  const q=practice.question; if(!q){error('Soru yüklenemedi. Kaydedilmiş çalışmanı yeniden açabilirsin.');return;} const order=q.type==='order',listen=['listen','speak'].includes(q.type);
  const prompt=q.type==='image'?'Görseldeki kelimenin İngilizcesi hangisi?':listen?'Dinle ve doğru İngilizce ifadeyi seç.':order?'Kelimeleri doğru sıraya koy.':q.type==='memory'?'Kelime ve anlamını eşleştir.':'Bu anlamın İngilizcesini seç.';
  const memory=q.type==='memory';
  const cards=memory?(q.pairs||[]).flatMap((pair,index)=>[{pair:index,text:pair.en},{pair:index,text:pair.tr}]).sort(()=>Math.random()-.5):[];
  const options=memory?'<div class="pc-grid">'+cards.map(c=>'<button class="pc-choice" data-action="memory-card" data-pair="'+c.pair+'" data-text="'+esc(c.text)+'" aria-label="Hafıza kartı">?</button>').join('')+'</div>':order?'<div class="pc-built" id="pcBuilt"></div><div>'+q.tokens.map((t,i)=>'<button class="pc-token" data-action="word" data-index="'+i+'">'+esc(t)+'</button>').join('')+'</div>'+btn('Baştan Diz','reset-order','link'):q.options.map(o=>'<button type="button" class="pc-choice" data-action="answer-choice" data-value="'+esc(o)+'" aria-pressed="false">'+esc(o)+'</button>').join('');
  render('Evde Pratik','<p>Soru '+(practice.cursor+1)+' / '+practice.total+'</p><div class="pc-progress"><i style="width:'+practice.cursor/practice.total*100+'%"></i></div>'+(q.type==='image'?'<img id="pcQuestionImage" class="pc-image" alt="Kelime görseli" src="'+esc(q.image)+'">':'')+(listen?btn('Kelimeyi Dinle','speak','secondary'):'')+'<h2>'+esc(prompt)+'</h2>'+(!listen&&!memory&&q.type!=='image'?'<div class="pc-question-prompt">'+esc(q.tr||q.en)+'</div>':'')+options+(q.type==='speak'?btn('Mikrofona Söyle','mic','secondary'):'')+btn('Kontrol Et','check','primary','disabled')+'<p id="pcSaveStatus" class="pc-saved">Kaldığın yerden devam edebilirsin.</p>'+btn('Sonra Tamamla','practice','link'),{back:true,screen:'question'});
  document.getElementById('pcQuestionImage')?.addEventListener('error',()=>{error('Görsel şu anda yüklenemedi. Bağlantını kontrol edip kaydedilmiş çalışmayı yeniden açabilirsin.');const b=app.querySelector('[data-action="check"]');b.disabled=true;});
 }
 function feedbackView(previous){
  const answer=practice.answers.at(-1);
  render('Cevabın Kaydedildi','<h1>'+(answer.correct?'Doğru cevap':'Birlikte tekrar edelim')+'</h1><div class="pc-note"><strong>'+esc(answer.en)+'</strong><p>'+esc(answer.tr)+'</p></div>'+btn(practice.completedAt?'Sonuçları Gör':'Devam Et','next-question')+'<p class="pc-saved">Cevabın sunucuya kaydedildi.</p>',{back:true,screen:'feedback'});
 }
 async function answer(){
  if(!selection){error('Bir cevap seç.');return;}
  pendingAnswer={id:practice.id,cursor:practice.cursor,answer:selection,studentId:childId};persistPending();
  await sendPending();
 }
 async function sendPending(){
  const result=await api('parentAnswer',pendingAnswer);practice=result.practice;pendingAnswer=null;persistPending();feedbackView();
 }
 function results(){
  const wrong=practice.answers.filter(a=>!a.correct);
  render('Evde Pratik Tamamlandı','<div class="pc-complete"><img src="discovery-assets/papi-kutlama.webp" alt="Papi"><h1>Güzel bir tekrar oldu!</h1><span>'+practice.correct+' / '+practice.total+' doğru</span></div>'+(wrong.length?'<h2>Tekrar edilecek kelimeler</h2>'+wrong.map(a=>'<div class="pc-row"><span>'+esc(a.en)+'<small>'+esc(a.tr)+'</small></span></div>').join(''):'<p>Bu çalışmadaki tüm soruları doğru cevapladın.</p>')+btn('Evde Pratiğe Dön','practice')+'<p>Sonuç gelişim raporuna kaydedildi.</p><p class="pc-saved">Parkur puanları değişmez.</p>',{back:true});
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
 function cardView(){
  const word=words[cardIndex];
  if(!word){render('Kelime Kartlarım','<h1>Birlikte tekrar</h1><p>Tamamlanan duraklardan doğrulanabilen kelime bulunamadı. Çocuğun bir durak tamamladığında buraya kelimeler eklenecek.</p>',{back:true});return;}
  render('Kelime Kartlarım','<p>'+(cardIndex+1)+' / '+words.length+'</p><button class="pc-cardflip" data-action="flip">'+esc(cardBack?word.tr:word.en)+'<small>Diğer yüzü görmek için dokun</small></button>'+btn('İngilizcesini Dinle','card-speak','secondary')+'<div class="pc-segment"><button data-action="card-prev">Önceki</button><button data-action="card-next">Sonraki</button></div>',{back:true});
 }
 function settingsView(){render('Bildirim Tercihleri','<form data-form="settings"><label class="pc-check"><input type="checkbox" name="teacherNotices" '+(me.parent.settings.teacherNotices!==false?'checked':'')+'>Öğretmen bildirimlerini göster</label><label class="pc-check"><input type="checkbox" name="practiceReminders" '+(me.parent.settings.practiceReminders!==false?'checked':'')+'>Panelde çalışma hatırlatmalarını göster</label><button class="pc-primary">Tercihleri Kaydet</button></form>',{back:true});}
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
  const source=practice.settings?.summary||dashboard.summary,week=practice.kind==='plan',weekly=practice.feature==='weekly';
  render(weekly?'Haftalık Çalışma Programı':week?'Papi ile 10 Dakika':'Papi Bana Anlatsın','<h1>'+esc(week?'Bugün birlikte çalışalım':'Gelişim özeti')+'</h1><p>'+esc(source)+'</p>'+(week?'<p>3 dk kelime · 4 dk oyun · 3 dk test</p>':'')+'<h2>Birlikte tekrar edin</h2>'+practice.settings.words.map(w=>'<div class="pc-row"><span>'+esc(w.en)+'<small>'+esc(w.tr)+'</small></span></div>').join('')+(weekly?'<h2>Bu haftanın programı</h2><div class="pc-row">1. gün · Kelimeleri tanı ve dinle</div><div class="pc-row">2. gün · Eşleştirme ile tekrar</div><div class="pc-row">3. gün · Kısa test</div><div class="pc-row">4. gün · Hataları birlikte tekrar et</div>':'')+btn('Kelime Kartlarıyla Başla','plan-cards')+btn('Kelime Oyununa Geç','game-match','secondary')+btn('Kısa Teste Geç','setup','secondary')+'<p>Bu planı yeniden açmak deneme hakkı tüketmez.</p>',{back:true});
 }
 async function personal(kind,feature='daily'){
  if(!dashboard.words.length){error('Plan hazırlamak için önce tamamlanan duraklardan kelime bulunması gerekiyor.');return;}
  pendingStart=null;
  const settings={source:'all',count:5,content:'all',types:['choice'],summary:dashboard.summary,words:[...dashboard.words].sort((a,b)=>Number(b.weak)-Number(a.weak)).slice(0,5)};
  pendingStart={id:crypto.randomUUID(),kind,feature,settings};
  const result=await api('parentStart',pendingStart);pendingStart=null;practice=result.practice;planView();
 }
 async function action(name,el){
  if(studentMode&&['back','practice'].includes(name)){await studentHome();return;}
  if(name==='signup'){authForm(true);return;}if(name==='login'){authForm();return;}
  if(name==='logout'){await api('parentLogout');localStorage.removeItem(KEY);token='';me=null;authForm();return;}
  if(name==='refresh'){await load();return;}if(name==='resend'){const r=await api('parentResend');error(r.mailed?'Doğrulama e-postası kuyruğa alındı.':'E-posta şu an gönderilemedi. Biraz sonra tekrar dene.');return;}
  if(name==='forgot'){render('Şifremi Unuttum','<form data-form="forgot">'+field('E-posta adresi','email','email','','required autocomplete="email"')+'<button class="pc-primary">Yenileme Bağlantısı Gönder</button></form>',{noNav:true,back:true});return;}
  if(name==='tab'){tab=el.dataset.tab;if(childId)dashboard=await api('parentDashboard');showTab();return;}
  if(name==='back'){if(!me){authForm();return;}showTab();return;}
  if(name==='children'){childrenView();return;}
  if(name==='select-child'){childId=el.dataset.id;localStorage.setItem(CHILD,childId);dashboard=await api('parentDashboard');showTab();return;}
  if(name==='switch-account'){sessionStorage.setItem('dm_open_account_picker','1');location.assign('./?hesap=1');return;}
  if(name==='link'){linkView();return;}
  if(name==='create-child'){sessionStorage.setItem('dm_parent_child_signup',JSON.stringify({email:me.parent.email,at:Date.now()}));location.assign('./?kayit=1&veliCocuk=1');return;}
  if(name==='practice'){tab='practice';if(childId)dashboard=await api('parentDashboard');showTab();return;}
  if(name==='growth'){tab='growth';showTab();return;}
  if(name==='setup'){setup();return;}
  if(name==='text-test'){setup({...lastSetup,types:['choice'],source:'all'});return;}
  if(name==='games'){render('Papi ile Oyna','<h1>Kelime oyunları</h1>'+row('Eşleştirme','game-match','Türkçe anlamı İngilizce kelimeyle eşleştir')+row('Hafıza Oyunu','game-memory','İngilizce kelimeleri anlamlarıyla hatırla')+row('Doğru Kelimeyi Bul','game-choice','Çalıştığı kelimeleri tekrar et')+row('Kelime Avı','game-order','Harf ve kelimeleri sıraya koy'),{back:true});return;}
  if(name.startsWith('game-')){setup({source:'all',count:5,content:'all',types:[name==='game-memory'?'memory':name==='game-match'?'match':name==='game-order'?'order':'choice']},'game');return;}
  if(name==='patterns'){setup({source:'all',count:5,content:'patterns',types:['order']});return;}
  if(name==='speaking'){setup({source:'all',count:5,content:'all',types:['speak']});return;}
  if(name==='weak'){setup({source:'weak',count:5,content:'all',types:['choice']});return;}
  if(name==='setup-count'){const form=el.closest('form');form.elements.count.value=el.dataset.count;form.querySelectorAll('[data-action="setup-count"]').forEach(b=>b.classList.toggle('active',b===el));form.querySelector('[data-start]').disabled=true;document.getElementById('pcPool').textContent='Hazır kelimeleri kontrol ederek devam edebilirsin.';return;}
  if(name==='pool'){const form=app.querySelector('[data-form="setup"]');lastSetup=formSettings(form);if(!lastSetup.types.length){error('En az bir soru türü seç.');return;}const r=await api('parentPool',{settings:lastSetup});const enough=r.words.length>=lastSetup.count;document.getElementById('pcPool').innerHTML=r.words.length?'<strong>'+r.words.length+' kelime hazır.</strong><br>'+(enough?'Testin hazır. Birlikte başlayabilirsiniz.':'Daha az soru veya başka bir kaynak seçebilirsin.'):'<strong>Bu seçim için içerik henüz hazır değil.</strong><br>Kelime sorularıyla devam edebilir veya farklı bir kaynak seçebilirsin.'+(lastSetup.types.includes('image')?btn('Kelime sorularına geç','text-test','secondary'):'');form.querySelector('[data-start]').disabled=!enough;return;}
  if(name==='answer-choice'){selection=el.dataset.value;app.querySelector('[data-action="check"]').disabled=false;app.querySelectorAll('.pc-choice').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));return;}
  if(name==='word'){selection+=(selection?(practice.question.join??' '):'')+practice.question.tokens[Number(el.dataset.index)];el.disabled=true;document.getElementById('pcBuilt').textContent=selection;app.querySelector('[data-action="check"]').disabled=false;return;}
  if(name==='reset-order'){selection='';document.getElementById('pcBuilt').textContent='';app.querySelectorAll('[data-action="word"]').forEach(b=>b.disabled=false);return;}
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
  if(name==='cards'){words=dashboard.words;cardIndex=0;cardBack=false;cardView();return;}
  if(name==='plan-cards'){words=practice.settings.words;cardIndex=0;cardBack=false;cardView();return;}
  if(name==='flip'){cardBack=!cardBack;cardView();return;}
  if(name==='card-speak'){speak(words[cardIndex].en);return;}
  if(name==='card-next'||name==='card-prev'){cardIndex=(cardIndex+(name==='card-next'?1:-1)+words.length)%words.length;cardBack=false;cardView();return;}
  if(name==='goal'){goalView();return;}
  if(name==='current'||name==='previous'){dashboard=await api('parentDashboard',{previous:name==='previous'});growth(name==='previous');return;}
  if(name==='notices'){render('Bildirimler','<h1>Öğretmeninden</h1>'+(dashboard.notices.length?dashboard.notices.map(n=>'<article class="pc-row"><span>'+esc(n.message)+'<small>'+new Date(n.created_at).toLocaleDateString('tr-TR')+'</small></span></article>').join(''):'<p>Yeni öğretmen bildirimi yok.</p>')+btn('Bildirim Tercihleri','settings','secondary'),{back:true});return;}
  if(name==='settings'){settingsView();return;}
  if(name==='teacher'){const t=dashboard.teacher;render('Öğretmen Bilgileri',t?'<h1>'+esc(t.full_name||t.display_name)+'</h1><p>'+esc(t.school)+'</p>':'<p>Bu hesaba bağlı öğretmen bulunmuyor.</p>',{back:true});return;}
  if(name==='child'){
   childId=el.dataset.id;localStorage.setItem(CHILD,childId);dashboard=await api('parentDashboard');
   render('Çocuk Hesabı','<h1>'+esc(dashboard.student.name)+'</h1>'+badge(dashboard.plan)+row('Öğretmeni','teacher')+row('Üyelik Durumu','membership')+(dashboard.student.sameEmail?row('Çocuğumun Hesabına Geç','switch-student'):'')+'<p>Özellikler seçili çocuğun üyeliğine göre açılır.</p>'+btn('Veli bağlantısını kaldır','unlink','link'),{back:true});return;
  }
  if(name==='unlink'){if(confirm('Bu çocuğun veli bağlantısı kaldırılsın mı?')){await api('parentUnlink');await load();}return;}
  if(name==='membership'){premium('Seçili çocuğun üyeliği '+({free:'Free',pro:'Pro',premium_pro:'Premium Pro'})[dashboard.plan]+'.');return;}
  if(name==='account'){render('Hesap Ayarları','<h1>'+esc(me.parent.name)+'</h1><p>'+esc(me.parent.email)+'</p>'+btn('⇄ Hesap Değiştir','switch-account')+btn('Veli Geçiş Kodunu Yenile','pin-mail','secondary')+btn('Çıkış Yap','logout','secondary'),{back:true});return;}
  if(name==='pin-mail'){const r=await api('parentPinResend');error(r.mailed?'Yeni geçiş kodun e-postaya gönderildi.':'E-posta gönderimi tamamlanamadı.');return;}
  if(name==='switch-student'){render('Öğrenci Hesabına Geç','<form data-form="switch">'+field('6 haneli öğrenci geçiş kodu','pin','password','','required inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="off"')+'<button class="pc-primary">Öğrenci Hesabına Geç</button></form>',{back:true});return;}
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
    const r=await api(screen==='signup'?'parentSignup':'parentLogin',{name:data.get('name'),email:data.get('email'),password:data.get('password'),consent:data.get('consent')==='on'});saveToken(r.token);await load();
   }else if(type==='forgot'){const r=await api('parentResetRequest',{email:data.get('email')});error(r.mesaj);}
   else if(type==='reset'){const hash=new URLSearchParams(location.hash.slice(1));const r=await api('parentReset',{token:hash.get('reset'),password:data.get('password')});saveToken(r.token);history.replaceState(null,'',location.pathname);await load();}
   else if(type==='link'){await api('parentLink',{code:data.get('code')});await load();}
   else if(type==='setup'){lastSetup=formSettings(form);if(!lastSetup.types.length)throw Error('En az bir soru türü seç.');await start(form.dataset.kind,lastSetup);}
   else if(type==='goal'){await api('parentGoal',{days:Number(data.get('days')),minutes:Number(data.get('minutes'))});dashboard=await api('parentDashboard');showTab();}
   else if(type==='settings'){await api('parentSettings',{teacherNotices:data.get('teacherNotices')==='on',practiceReminders:data.get('practiceReminders')==='on'});await load();}
   else if(type==='switch'){const r=await api('parentSwitchStudent',{pin:data.get('pin')});localStorage.removeItem(KEY);token='';sessionStorage.setItem('dm_session_handoff_v1',JSON.stringify({token:r.token,name:r.username,role:'ogrenci',google:false,previous:localStorage.getItem('ing_token')||'',at:Date.now()}));localStorage.setItem('dm_last_account_v1',JSON.stringify({kind:'personal'}));location.assign('./?hesap=1');}
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
