
        /* ========== VERİLER ========== */
        const YO_ZK_GUN = { 1:1, 2:3, 3:7, 4:14 };
        const YO_ZK_MAX = 250;

        const YO_DONDURUCU_FIYAT = 150;

        const YO_CUMLE = [
          ['I have a red bicycle','Kırmızı bir bisikletim var.','A1'],
          ['She is my best friend','O benim en iyi arkadaşım.','A1'],
          ['We play football after school','Okuldan sonra futbol oynarız.','A1'],
          ['My cat is very small','Kedim çok küçük.','A1'],
          ['He gets up at seven','O yedide kalkar.','A1'],
          ['They are in the classroom','Onlar sınıftalar.','A1'],
          ['I like apples and bananas','Elmaları ve muzları severim.','A1'],
          ['Where is your school bag','Okul çantan nerede?','A1'],
          ['It is sunny today','Bugün hava güneşli.','A1'],
          ['My mother is a teacher','Annem bir öğretmen.','A1'],
          ['Can you swim','Yüzebilir misin?','A1'],
          ['The book is on the table','Kitap masanın üstünde.','A1'],
          ['I went to the cinema yesterday','Dün sinemaya gittim.','A2'],
          ['She is taller than her brother','O, erkek kardeşinden daha uzun.','A2'],
          ['We are going to visit our grandmother','Büyükannemizi ziyaret edeceğiz.','A2'],
          ['He has never been to Paris','O hiç Paris\'e gitmedi.','A2'],
          ['What were you doing last night','Dün gece ne yapıyordun?','A2'],
          ['You should drink more water','Daha fazla su içmelisin.','A2'],
          ['It was raining when I woke up','Uyandığımda yağmur yağıyordu.','A2'],
          ['My brother can play the guitar very well','Kardeşim gitarı çok iyi çalabilir.','A2'],
          ['There is a bakery next to the bank','Bankanın yanında bir fırın var.','A2'],
          ['How much is this jacket','Bu ceket ne kadar?','A2'],
          ['If it rains we will stay at home','Yağmur yağarsa evde kalacağız.','B1'],
          ['I have been learning English for three years','Üç yıldır İngilizce öğreniyorum.','B1'],
          ['The letter was written by my uncle','Mektup amcam tarafından yazıldı.','B1'],
          ['She told me that she was tired','Bana yorgun olduğunu söyledi.','B1'],
          ['I am used to getting up early','Erken kalkmaya alışkınım.','B1'],
          ['Although it was cold we went swimming','Hava soğuk olmasına rağmen yüzmeye gittik.','B1'],
          ['He asked me where I lived','Bana nerede yaşadığımı sordu.','B1'],
          ['You had better finish your homework','Ödevini bitirsen iyi olur.','B1']
        ];

        const YO_SEVIYE = [
          { s:'A1', q:'I ___ a student.', o:['am','is','are','be'] },
          { s:'A1', q:'She ___ two brothers.', o:['has','have','is','am'] },
          { s:'A1', q:'"Elma" in English is ___.', o:['apple','orange','pear','grape'] },
          { s:'A1', q:'___ you like pizza?', o:['Do','Does','Are','Is'] },
          { s:'A1', q:'There ___ three cats in the garden.', o:['are','is','am','be'] },
          { s:'A2', q:'Yesterday I ___ to the park.', o:['went','go','goes','going'] },
          { s:'A2', q:'He is ___ than his sister.', o:['taller','tall','tallest','more tall'] },
          { s:'A2', q:'We ___ TV when the phone rang.', o:['were watching','watched','are watching','watch'] },
          { s:'A2', q:'I have ___ been to London.', o:['never','ever','yet','already'] },
          { s:'A2', q:'You ___ wear a helmet. It is the rule.', o:['must','might','would','could'] },
          { s:'B1', q:'If it rains tomorrow, we ___ at home.', o:['will stay','stayed','would stay','stay'] },
          { s:'B1', q:'I have lived here ___ 2015.', o:['since','for','from','during'] },
          { s:'B1', q:'The book ___ by millions of people.', o:['was read','read','reads','is reading'] },
          { s:'B1', q:'She asked me where I ___.', o:['lived','live','am living','do live'] },
          { s:'B1', q:'I am used to ___ early.', o:['getting up','get up','got up','gets up'] },
          { s:'B2', q:'If I ___ you, I would apologise.', o:['were','am','was being','had'] },
          { s:'B2', q:'By next year, she ___ her degree.', o:['will have finished','will finish','finishes','has finished'] },
          { s:'B2', q:'He denied ___ the window.', o:['breaking','to break','broke','break'] },
          { s:'B2', q:'Hardly ___ arrived when it started to rain.', o:['had we','we had','did we','we have'] },
          { s:'B2', q:'The meeting was called ___ because of the storm.', o:['off','out','up','over'] }
        ];
        const YO_SEVIYE_AD = { A1:'Başlangıç', A2:'Temel', B1:'Orta', B2:'Orta-Üstü' };

       const YO_SOHBET_SEVIYE = [
  { kod:'A1', ad:'Başlangıç', ikon:'🌱', renk:'#34b36a' },
  { kod:'A2', ad:'Temel', ikon:'🌿', renk:'#3b82f6' },
  { kod:'B1', ad:'Orta', ikon:'🌳', renk:'#8b5cf6' },
  { kod:'B2', ad:'Orta-Üstü', ikon:'🏔️', renk:'#f43f5e' }
];
const YO_SOHBET = [
  /* ---------- A1 ---------- */
  { id:'tanisma', sv:'A1', ad:'Tanışma', ikon:'👋', satirlar:[
    { p:"Hello! What is your name?", tr:"Adını söyle.", ornek:"My name is Ali.", k:["my name is","i am","i'm","name"] },
    { p:"Nice to meet you! How old are you?", tr:"Yaşını söyle.", ornek:"I am ten years old.", k:["i am","i'm","years old","year"] },
    { p:"Where are you from?", tr:"Nereli olduğunu söyle.", ornek:"I am from Turkey.", k:["from","turkey","istanbul","ankara","izmir"] },
    { p:"Great! Goodbye!", tr:"Vedalaş.", ornek:"Goodbye! See you.", k:["goodbye","bye","see you"] } ] },
  { id:'renkler', sv:'A1', ad:'Renkler ve Eşyalar', ikon:'🎨', satirlar:[
    { p:"What color is your bag?", tr:"Çantanın rengini söyle.", ornek:"My bag is blue.", k:["red","blue","green","yellow","black","white","pink","purple","orange","brown","grey","gray"] },
    { p:"Do you have a pencil?", tr:"Kalemin olup olmadığını söyle.", ornek:"Yes, I have a pencil.", k:["yes","no","i have","i don't","i do"] },
    { p:"How many books are on your desk?", tr:"Masandaki kitap sayısını söyle.", ornek:"There are three books.", k:["one","two","three","four","five","six","seven","eight","nine","ten","there are","there is","no books"] },
    { p:"Thank you! See you later!", tr:"Karşılık ver.", ornek:"You're welcome! Bye!", k:["welcome","bye","see you","thank"] } ] },
  { id:'hayvanlar', sv:'A1', ad:'Hayvanlar', ikon:'🐶', satirlar:[
    { p:"Do you have a pet?", tr:"Evcil hayvanın var mı?", ornek:"Yes, I have a cat.", k:["yes","no","i have","i don't","cat","dog","bird","fish","rabbit"] },
    { p:"What is your favourite animal?", tr:"En sevdiğin hayvanı söyle.", ornek:"My favourite animal is the lion.", k:["favourite","favorite","i like","i love","cat","dog","lion","tiger","horse","bird","fish","rabbit","elephant","monkey","panda"] },
    { p:"Can a fish fly?", tr:"Balık uçabilir mi?", ornek:"No, it can't fly. It can swim.", k:["no","can't","cannot","can not","swim"] },
    { p:"What can a bird do?", tr:"Kuşun neler yapabildiğini söyle.", ornek:"A bird can fly and sing.", k:["can","fly","sing"] } ] },
  { id:'aile', sv:'A1', ad:'Ailem', ikon:'👨‍👩‍👧', satirlar:[
    { p:"How many people are there in your family?", tr:"Ailende kaç kişi olduğunu söyle.", ornek:"There are four people in my family.", k:["there are","we are","three","four","five","six","two","seven"] },
    { p:"What is your mother's name?", tr:"Annenin adını söyle.", ornek:"Her name is Ayşe.", k:["her name","name is","my mother","she is"] },
    { p:"Do you have a brother or a sister?", tr:"Kardeşin var mı?", ornek:"Yes, I have a sister.", k:["yes","no","i have","brother","sister","i don't"] },
    { p:"Who is your best friend?", tr:"En iyi arkadaşını söyle.", ornek:"My best friend is Can.", k:["my best friend","best friend","is","name"] } ] },

  /* ---------- A2 ---------- */
  { id:'kafe', sv:'A2', ad:'Kafede', ikon:'☕', satirlar:[
    { p:"Hi! What would you like to drink?", tr:"Ne içmek istediğini söyle.", ornek:"I would like some water, please.", k:["i would like","i'd like","can i have","please","water","tea","juice","milk","lemonade"] },
    { p:"Would you like something to eat?", tr:"Yiyecek isteyip istemediğini söyle.", ornek:"Yes, a sandwich, please.", k:["yes","no","sandwich","cake","cookie","please","thank"] },
    { p:"That is five lira, please.", tr:"Parayı ver.", ornek:"Here you are.", k:["here you are","here","thank"] },
    { p:"Have a nice day!", tr:"Karşılık ver.", ornek:"You too, thank you!", k:["you too","thank","thanks","bye"] } ] },
  { id:'okul', sv:'A2', ad:'Okulda', ikon:'🏫', satirlar:[
    { p:"What is your favourite lesson?", tr:"En sevdiğin dersi söyle.", ornek:"My favourite lesson is English.", k:["favourite","favorite","i like","english","math","science","art","music","history","turkish","pe"] },
    { p:"Why do you like it?", tr:"Nedenini söyle.", ornek:"Because it is fun.", k:["because","it is","it's","fun","interesting","easy","love"] },
    { p:"What time does school start?", tr:"Okulun başlama saatini söyle.", ornek:"It starts at nine o'clock.", k:["at","o'clock","starts","half past","eight","nine"] },
    { p:"See you tomorrow!", tr:"Vedalaş.", ornek:"See you! Bye!", k:["see you","bye","goodbye"] } ] },
  { id:'alisveris', sv:'A2', ad:'Alışveriş', ikon:'🛍️', satirlar:[
    { p:"Hello! Can I help you?", tr:"Ne aradığını söyle.", ornek:"Yes, I'm looking for a T-shirt.", k:["looking for","i want","i'd like","i would like","yes","please","t-shirt","shoes","jacket"] },
    { p:"What size do you need?", tr:"Bedenini söyle.", ornek:"Medium, please.", k:["small","medium","large","size","s","m","l"] },
    { p:"It is fifty lira. Cash or card?", tr:"Nasıl ödeyeceğini söyle.", ornek:"By card, please.", k:["cash","card"] },
    { p:"Here is your bag. Have a nice day!", tr:"Teşekkür et.", ornek:"Thank you! You too.", k:["thank","you too","bye"] } ] },
  { id:'rutin', sv:'A2', ad:'Günlük Rutin', ikon:'⏰', satirlar:[
    { p:"What time do you get up in the morning?", tr:"Kaçta kalktığını söyle.", ornek:"I get up at seven o'clock.", k:["i get up","get up","at","o'clock","wake up"] },
    { p:"What do you have for breakfast?", tr:"Kahvaltıda ne yediğini söyle.", ornek:"I have eggs, cheese and bread.", k:["i have","i eat","eggs","egg","bread","cheese","olives","milk","tea","honey","toast"] },
    { p:"How do you go to school?", tr:"Okula nasıl gittiğini söyle.", ornek:"I go to school by bus.", k:["by bus","by car","on foot","walk","by bike","by metro","school bus"] },
    { p:"What do you usually do after school?", tr:"Okuldan sonra ne yaptığını söyle.", ornek:"I usually do my homework.", k:["i do","homework","i play","i watch","i read","i usually","i go","i help"] } ] },

  /* ---------- B1 ---------- */
  { id:'yol', sv:'B1', ad:'Yol Tarifi', ikon:'🗺️', satirlar:[
    { p:"Excuse me, where is the library?", tr:"Yerini tarif et.", ornek:"It is next to the park.", k:["it is","it's","next to","near","left","right","straight","opposite","between","behind"] },
    { p:"Is it far from here?", tr:"Uzak olup olmadığını söyle.", ornek:"No, it is very close. About five minutes.", k:["no","yes","near","far","close","minutes"] },
    { p:"Which bus should I take?", tr:"Hangi otobüse binmesi gerektiğini söyle.", ornek:"You should take bus number 12.", k:["you should","take","number","bus","you can"] },
    { p:"Thank you very much!", tr:"Rica et.", ornek:"You are welcome!", k:["welcome","no problem","not at all","my pleasure"] } ] },
  { id:'haftasonu', sv:'B1', ad:'Hafta Sonum', ikon:'📅', satirlar:[
    { p:"What did you do last weekend?", tr:"Geçen hafta sonu ne yaptığını anlat.", ornek:"I visited my grandparents.", k:["i went","i played","i watched","i visited","i was","i did","i stayed","i met","i read","i helped","i cooked"], min:3 },
    { p:"Who were you with?", tr:"Kiminle olduğunu söyle.", ornek:"I was with my family.", k:["with","i was","alone","my"] },
    { p:"Did you have a good time?", tr:"Eğlenip eğlenmediğini söyle.", ornek:"Yes, it was really fun.", k:["yes","no","it was","i did","i didn't","fun","great","boring"] },
    { p:"What are you going to do next weekend?", tr:"Gelecek hafta sonu planını söyle.", ornek:"I am going to watch a film.", k:["going to","i will","i'll","i'm going","i am going","plan"], min:3 } ] },
  { id:'doktor', sv:'B1', ad:'Doktorda', ikon:'🩺', satirlar:[
    { p:"Hello, what's the matter?", tr:"Neyin var, anlat.", ornek:"I have a headache and a fever.", k:["i have","headache","stomachache","fever","cold","cough","hurts","sore","i feel","toothache"] },
    { p:"How long have you felt like this?", tr:"Ne zamandır böyle olduğunu söyle.", ornek:"Since yesterday.", k:["since","for","days","yesterday","week","two","three"] },
    { p:"Are you taking any medicine?", tr:"İlaç kullanıp kullanmadığını söyle.", ornek:"No, I'm not taking any medicine.", k:["yes","no","i am","i'm not","i take","i don't"] },
    { p:"You should rest and drink lots of water. Get well soon!", tr:"Teşekkür et.", ornek:"Thank you, doctor. I will.", k:["thank","i will","okay","ok"] } ] },
  { id:'tatil', sv:'B1', ad:'Tatil Planı', ikon:'✈️', satirlar:[
    { p:"Where would you like to travel?", tr:"Nereye gitmek istediğini söyle.", ornek:"I would like to go to Japan.", k:["i would like","i'd like","i want","to go","to visit"] },
    { p:"Why do you want to go there?", tr:"Nedenini açıkla.", ornek:"Because I want to see the famous temples.", k:["because","it is","it's","beautiful","famous","want to see","interesting"], min:4 },
    { p:"How will you get there?", tr:"Oraya nasıl gideceğini söyle.", ornek:"I will go by plane.", k:["by plane","by train","by car","by bus","by ship","will","fly"] },
    { p:"What will you pack in your suitcase?", tr:"Bavuluna neler koyacağını söyle.", ornek:"I will pack clothes, a camera and my passport.", k:["i will","i'll","clothes","camera","passport","pack","shoes","book"], min:3 } ] },

  /* ---------- B2 ---------- */
  { id:'cevre', sv:'B2', ad:'Çevre ve Gezegen', ikon:'🌍', satirlar:[
    { p:"In your opinion, what is the biggest problem for our planet?", tr:"Sence gezegenin en büyük sorunu ne?", ornek:"I think plastic pollution is the biggest problem.", k:["pollution","climate","global warming","plastic","waste","i think","in my opinion","deforestation"], min:4 },
    { p:"What can students do to help?", tr:"Öğrencilerin neler yapabileceğini anlat.", ornek:"We can recycle and use less plastic.", k:["we can","should","recycle","save","turn off","use less","plant","reduce"], min:4 },
    { p:"Have you ever joined a clean-up activity?", tr:"Hiç temizlik etkinliğine katıldın mı?", ornek:"Yes, I have. We cleaned the beach last year.", k:["i have","i've","never","yes","no","haven't","have not"] },
    { p:"If you were the president, what would you change?", tr:"Başkan olsaydın neyi değiştirirdin?", ornek:"I would ban plastic bags.", k:["i would","i'd"], min:4 } ] },
  { id:'teknoloji', sv:'B2', ad:'Teknoloji', ikon:'💻', satirlar:[
    { p:"How much time do you spend online every day?", tr:"Günde ne kadar internette olduğunu söyle.", ornek:"I spend about two hours online.", k:["hours","hour","minutes","about","i spend","around"] },
    { p:"Do you think social media is good for teenagers?", tr:"Sosyal medya gençler için iyi mi? Görüşünü söyle.", ornek:"I think it can be useful, but it can also be addictive.", k:["i think","in my opinion","i believe","because","good","bad","useful","addictive","harmful"], min:5 },
    { p:"What would happen if the internet stopped for a week?", tr:"İnternet bir hafta kesilse ne olurdu?", ornek:"People would talk to each other more.", k:["would","people","we","couldn't","could not"], min:4 },
    { p:"Which invention couldn't you live without?", tr:"Hangi icat olmadan yaşayamazdın?", ornek:"I couldn't live without my computer.", k:["couldn't","could not","without","phone","computer","internet","electricity"] } ] },
  { id:'gelecek', sv:'B2', ad:'Gelecek Hayallerim', ikon:'🎯', satirlar:[
    { p:"What do you want to be in the future?", tr:"Gelecekte ne olmak istediğini söyle.", ornek:"I want to be a doctor.", k:["i want to be","i'd like to be","i would like to be","become","i want to become"] },
    { p:"Why did you choose this job?", tr:"Bu mesleği neden seçtiğini anlat.", ornek:"Because I love helping people.", k:["because","i love","i like","help","interested","enjoy"], min:4 },
    { p:"What do you need to do to achieve this dream?", tr:"Bu hayale ulaşmak için ne yapman gerektiğini söyle.", ornek:"I need to study hard and read a lot.", k:["i need to","i have to","study","work hard","learn","should","practise","practice"], min:4 },
    { p:"Where do you see yourself in ten years?", tr:"On yıl sonra kendini nerede görüyorsun?", ornek:"I will be working in a big hospital.", k:["i will","i'll","i see myself","i hope","i'd","i would"], min:4 } ] },
  { id:'film', sv:'B2', ad:'Film Sohbeti', ikon:'🎬', satirlar:[
    { p:"What's the best film you've ever seen?", tr:"İzlediğin en iyi filmi söyle.", ornek:"The best film I've ever seen is Coco.", k:["the best","i've seen","i have seen","film","movie","is"] },
    { p:"What was it about?", tr:"Filmin konusunu anlat.", ornek:"It was about a boy who loved music.", k:["it was about","it's about","it is about","about","story"], min:4 },
    { p:"Would you recommend it to your friends? Why?", tr:"Arkadaşlarına önerir misin? Neden?", ornek:"Yes, I would, because it is funny and touching.", k:["yes","no","i would","because","recommend"], min:4 },
    { p:"Thanks for the great chat! Goodbye!", tr:"Sohbeti güzelce bitir.", ornek:"Thank you too! It was a pleasure. Goodbye!", k:["thank","bye","goodbye","see you","pleasure"] } ] }
];

        /* ========== DURUM VE KAYIT ========== */
        let yo = null, yoIsim = null, yoKayitZaman = null, yoModalKapaninca = null;

        function yoTarihStr(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
        function yoBugun(ofset) { let d = new Date(); if (ofset) d.setDate(d.getDate() + ofset); return yoTarihStr(d); }
        function yoHaftaKodu(zaman) {
          let d = zaman ? new Date(zaman) : new Date();
          let t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          let gun = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - gun);
          let yb = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
          return t.getUTCFullYear() + '-H' + Math.ceil(((t - yb) / 86400000 + 1) / 7);
        }
        function yoHaftaBaslangic() { let d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return yoTarihStr(d); }
        function yoVarsayilan() { return { v:1, guncelleme:0, hedef:50, xpGun:{ tarih:'', xp:0 }, hedefOdul:'', altin:0, sahip:[], takili:{ aks:'', renk:'' }, dondurucu:0, lig:{ hafta:'', xp:0, gecen:null }, log:{}, zk:{}, seviye:null, sohbet:{} };}
        function yoGuvenli(fn) { try { return fn(); } catch (e) { console.warn('Yeni özellik hatası:', e); } }

        function yoHazirla(isim) {
          if (!isim) return false;
          if (yo && yoIsim === isim) return true;
          yoIsim = isim;
          try { yo = Object.assign(yoVarsayilan(), JSON.parse(localStorage.getItem('ing_yo_' + isim) || '{}')); }
          catch (e) { yo = yoVarsayilan(); }
          DijiProgressRules.migrate(yo);
          yoGunKontrol();
          return true;
        }
        function yoHazirMi() {
          if (yo) return true;
          return (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi) ? yoHazirla(aktifOgrenciAdi) : false;
        }
        function yoGunKontrol() {
          if (!yo) return;
          let b = yoBugun();
          if (yo.xpGun.tarih !== b) yo.xpGun = { tarih:b, xp:0 };
          let h = yoHaftaKodu();
          if (yo.lig.hafta !== h) {
            if (yo.lig.hafta) yo.lig.gecen = { hafta:yo.lig.hafta, xp:yo.lig.xp };
            yo.lig.hafta = h; yo.lig.xp = 0;
          }
          let sinir = yoBugun(-21);
          Object.keys(yo.log).forEach(t => { if (t < sinir) delete yo.log[t]; });
        }
        function yoKaydet() {
          if (!yo || !yoIsim) return;
          DijiProgressRules.migrate(yo); yo.guncelleme = Date.now();
          try { localStorage.setItem('ing_yo_' + yoIsim, JSON.stringify(yo)); } catch (e) {}
          clearTimeout(yoKayitZaman);
          yoKayitZaman = setTimeout(yoSunucuyaGonder, 3000);
        }
        function yoSunucuyaGonder() {
          if (!yo || !yoIsim || yoIsim.toLowerCase() === 'teacher') return;
          fetch(apiURL, { method:'POST', body: JSON.stringify({ islem:'ekVeriKaydet', ogrenci:yoIsim, anahtar:'yo', deger: JSON.stringify((DijiProgressRules.migrate(yo),yo)) }) }).catch(() => {});
        }
        async function yoSunucudanAl() {
          const owner = yoIsim;
          if (!owner) return false;
          try {
            let r = await (window.dmStartupFetch||fetch)(`${apiURL}?islem=ekVeriGetir&ogrenci=${encodeURIComponent(owner)}&anahtar=yo`);
            let d = await r.json();
            if (owner !== yoIsim || !r.ok || d?.hata || d?.status === 'error' || r.headers.get('X-Diji-Cevrimdisi')) return false;
            if (d && d.deger) {
              let server = typeof d.deger === 'string' ? JSON.parse(d.deger) : d.deger;
              if ((server.guncelleme || 0) > (yo.guncelleme || 0)) {
                yo = Object.assign(yoVarsayilan(), server); DijiProgressRules.migrate(yo); yoGunKontrol();
                try { localStorage.setItem('ing_yo_' + owner, JSON.stringify(yo)); } catch (e) {}
                yoArayuzTazele();
              }
            }
            return true;
          } catch (e) { return false; }
        }
        async function yoTumVeri() {
          let r = await fetch(`${apiURL}?islem=ekVeriTumu&anahtar=yo`);
          let d = await r.json();
          let harita = {};
          (d || []).forEach(x => { try { harita[String(x.ogrenci).trim().toLowerCase()] = JSON.parse(x.deger); } catch (e) {} });
          return harita;
        }
        function yoKullanici(isim) { return (globalDataCache || []).find(u => String(u.ogrenci).trim().toLowerCase() === String(isim || '').trim().toLowerCase()); }
        function yoSinif(isim) { let u = yoKullanici(isim); return u ? String(u.Sinif || '').trim() : ''; }
        function yoKaristir(a) { return [...a].sort(() => Math.random() - 0.5); }
        function yoGuvenliMetin(t) { return typeof guvenliMetin === 'function' ? guvenliMetin(String(t)) : String(t); }
        function yoSes(tip) { if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal(tip); }

        /* ========== ORTAK ARAYÜZ ========== */
        function yoToast(metin) {

          if(window.DijiMeduPapiFeedback){window.DijiMeduPapiFeedback.notice(metin);return;}
          let e = document.createElement('div'); e.className = 'yo-toast'; e.innerText = metin;
          document.body.appendChild(e);
          setTimeout(() => e.classList.add('gor'), 20);
          (window.dmPapiNotices?.later||((el,fn,ms)=>setTimeout(fn,ms)))(e,()=>{ e.classList.remove('gor'); setTimeout(() => e.remove(), 400); },3200);
        }
               function yoModalAc(baslik, html, kapaninca) {
          if (window.yoGomuluHedef) {
            let hedef = document.getElementById(window.yoGomuluHedef);
            if (hedef) {
              hedef.innerHTML = `<div class="yo-kart" style="animation:none; max-width:560px;"><div class="yo-baslik" style="margin-right:2px">${baslik}</div><div id="yoGovdeGomulu">${html}</div></div>`;
              return;
            }
          }
          document.getElementById('yoBaslik').innerText = baslik;
          document.getElementById('yoGovde').innerHTML = html;
          yoModalKapaninca = kapaninca || null;
          document.getElementById('yoModal').classList.add('acik');
        }
                function yoGovde(html) {
          if (window.yoGomuluHedef) { let g = document.getElementById('yoGovdeGomulu'); if (g) g.innerHTML = html; return; }
          document.getElementById('yoGovde').innerHTML = html;
        }
        function yoModalKapat() {
          document.getElementById('yoModal').classList.remove('acik');
          if ('speechSynthesis' in window) speechSynthesis.cancel();
          let f = yoModalKapaninca; yoModalKapaninca = null;
          if (typeof f === 'function') f();
          yoArayuzTazele();
        }
        function yoSoyle(metin, hiz) {
          if (!('speechSynthesis' in window) || !metin) return;
          speechSynthesis.cancel();
          let u = new SpeechSynthesisUtterance(metin); u.lang = 'en-US'; u.rate = hiz || 0.9;
          speechSynthesis.speak(u);
        }
        function yoSonuc(o) {
          if (typeof genelSonucEkraniGoster === 'function') genelSonucEkraniGoster(o);
          else { yoToast(`${o.dogru} doğru, ${o.yanlis} yanlış`); if (o.devamFn) o.devamFn(); }
        }
        function yoEnerjiKontrol() {
          if(window.dmTeacherPortalMode)return true;
          if (typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci) return true;
          if (window.dmOdevEnerjiMuaf && window.dmOdevEnerjiMuaf()) return true;   /* ödev oyunu enerji harcamaz */
          let k = window.genelEnerjiKalan;
          if (typeof k === 'number' && k < 3) { if (typeof genelEnerjiBittiGoster === 'function') genelEnerjiBittiGoster(); return false; }
          if (typeof ocEnerjiHarca === 'function') ocEnerjiHarca(3);
          return true;
        }
        function yoOrnekKelimeHavuzu(regex) {
          if (window.dmSelectedIntro?.key === 'dikte') return oyunHavuzGetir(window.dmSelectedIntro.classNo,window.dmSelectedIntro.units).filter(k=>regex.test(String(k.ingilizce||k.en||''))&&(k.turkce||k.tr));
          let s = Number(yoSinif(yoIsim)) || 0;
          let tum = (window.masterKelimeHavuzu || []).filter(k => regex.test(String(k.ingilizce || k.en || '').trim()) && (k.turkce || k.tr));
          let uygun = s ? tum.filter(k => [s - 1, s].includes(Number(k.sinif))) : tum;
          return uygun.length >= 8 ? uygun : tum;
        }

        /* ========== 1) XP, GÜNLÜK HEDEF, ALTIN ========== */
        function yoXpEkle(xp, altin, neden, anahtar) {
          if (!yoHazirMi()) return;
          DijiProgressRules.migrate(yo);
          xp = DijiProgressRules.positive(xp); altin = DijiProgressRules.positive(altin);
          yo.totalXp += xp;
          yoGunKontrol();
          let b = yoBugun();
          yo.xpGun.xp += xp; yo.lig.xp += xp;
          yo.log[b] = (yo.log[b] || 0) + xp;
          yo.altin += altin;
          /* Ödül sunucuya da yazılır; ekrandaki anlık değer sunucunun yanıtıyla düzeltilir. */
          if (xp > 0 || altin > 0) window.dmOdulYaz?.(xp, altin, neden, anahtar);
          if (yo.xpGun.xp >= yo.hedef && yo.hedefOdul !== b) {
            yo.hedefOdul = b; yo.altin += 5; window.dmEkonomi?.kazan(5);
            /* Daily target completion toast retired; reward is unchanged. */
          }
          yoKaydet(); yoHedefHalkaCiz();
        }
        window.dmBaseXpAdd = yoXpEkle;
        function yoHedefHalkaCiz() {
          let b = document.getElementById('yoHedefBtn');
          if (!b || !yo) return;
          yoGunKontrol();
          let x = yo.xpGun.xp, h = yo.hedef, p = Math.min(1, x / h), C = 2 * Math.PI * 15;
          b.innerHTML = `<svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true"><circle cx="19" cy="19" r="15" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="4"/><circle cx="19" cy="19" r="15" fill="none" stroke="${p >= 1 ? '#6bcb77' : '#ffd166'}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" transform="rotate(-90 19 19)" style="transition:stroke-dashoffset .6s"/></svg><span>${p >= 1 ? '✓' : '🎯'}</span>`;
          b.setAttribute('aria-label', `Günlük hedef: ${x} / ${h} XP`);
          b.title = `Günlük hedef: ${x} / ${h} XP`;
        }
        function yoHedefAc() {
          if (!yoHazirMi()) return;
          yoGunKontrol();
          let x = yo.xpGun.xp, h = yo.hedef;
          let gunAd = ['Pz','Pt','Sa','Ça','Pe','Cu','Ct'];
          let son7 = [...Array(7)].map((_, i) => { let t = yoBugun(i - 6); return { t, xp: yo.log[t] || 0, ad: gunAd[new Date(t + 'T12:00:00').getDay()] }; });
          let mx = Math.max(h, ...son7.map(s => s.xp));
          let grafik = son7.map(s => `<div><i class="${s.xp >= h ? 'tamam' : ''}" style="height:${Math.round(s.xp / mx * 70)}px"></i>${s.ad}</div>`).join('');
          let secenek = [[30,'🌱 Rahat'],[50,'🙂 Normal'],[100,'🔥 Ciddi'],[150,'🚀 Çılgın']].map(([n, ad]) =>
            `<button class="${n === h ? 'aktif' : ''}" onclick="yoHedefSec(${n})">${ad}<br><small>${n} XP / gün</small></button>`).join('');
          yoModalAc('🎯 Günlük hedef', `
            <div class="yo-istat"><div><b>${x}</b>bugün XP</div><div><b>${h}</b>hedef</div><div><b>${yo.altin}</b>🪙 altın</div></div>
            <div class="yo-ilerleme"><div style="width:${Math.min(100, Math.round(x / h * 100))}%"></div></div>
            <div class="yo-bolum">Son 7 gün</div><div class="yo-grafik">${grafik}</div>
            <div class="yo-bolum">Hedefini seç</div><div class="yo-hedef-secenek">${secenek}</div>
            <div class="yo-bos">Her doğru cevap 10 XP ve 1 🪙 kazandırır. Hedefi tamamlayınca +5 🪙 bonus.</div>`);
        }
        function yoHedefSec(n) { yo.hedef = n; yoKaydet(); yoHedefHalkaCiz(); yoHedefAc(); }

        /* ========== 2) SERİ DONDURUCU ========== */
        /* Kalkanlar artık sunucuda (memberStatus) harcanır; cihazda harcamak çift düşüşe yol açardı. */
        function yoSeriDondurucuKontrol() {}

        /* ========== 3) PAPAĞAN MAĞAZASI ========== */


        function yoDondurucuAl() {
          if (yo.dondurucu >= 2) { yoToast('En fazla 2 dondurucu taşıyabilirsin.'); return; }
          if (yo.altin < YO_DONDURUCU_FIYAT) { yoToast(`${YO_DONDURUCU_FIYAT - yo.altin} altın daha lazım 🪙`); return; }
          /* [v4.8] satın alma sunucuda */
          window.dmEkonomi.islem('dondurucuAl').then(d => { if (!d.ok) { yoToast(d.mesaj || 'Satın alma tamamlanamadı.'); return; } yoToast('🧊 Seri dondurucu alındı!'); yoMagazaAc(); });
        }

        /* ========== 4) HAFTALIK SINIF LİGİ ========== */
        async function yoLigAc() {
          if (!yoHazirMi()) return;
          yoGunKontrol();
          yoModalAc('🏆 Haftalık lig', '<div class="yo-bos">Lig yükleniyor...</div>');
          let buHafta = yoHaftaKodu(), gecenHafta = yoHaftaKodu(Date.now() - 7 * 86400000);
          let benSinif = yoSinif(yoIsim), liste = [], gecenListe = [], hata = false;
          try {
            let veri = await yoTumVeri();
            Object.keys(veri).forEach(ad => {
              if (ad === 'teacher') return;
              let u = yoKullanici(ad); if (!u || String(u.Sinif || '').trim() !== benSinif) return;
              let l = veri[ad].lig || {};
              liste.push({ isim: u.ogrenci, xp: l.hafta === buHafta ? (l.xp || 0) : 0 });
              let g = l.hafta === buHafta ? l.gecen : (l.hafta === gecenHafta ? { hafta:l.hafta, xp:l.xp } : null);
              if (g && g.hafta === gecenHafta && g.xp > 0) gecenListe.push({ isim: u.ogrenci, xp: g.xp });
            });
          } catch (e) { hata = true; }
          let ben = liste.find(x => x.isim.toLowerCase() === yoIsim.toLowerCase());
          if (ben) ben.xp = yo.lig.xp; else liste.push({ isim: yoIsim, xp: yo.lig.xp });
          liste.sort((a, b) => b.xp - a.xp);
          gecenListe.sort((a, b) => b.xp - a.xp);
          let madalya = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
          let kalanGun = 7 - ((new Date().getDay() + 6) % 7);
          let satirlar = liste.map((x, i) => `<div class="yo-satir${x.isim.toLowerCase() === yoIsim.toLowerCase() ? ' ben' : ''}"><span>${madalya(i)}</span><span class="ad">${yoGuvenliMetin(x.isim)}</span><span>${x.xp} XP</span></div>`).join('');
          let gecenIndex = gecenListe.findIndex(x => x.isim.toLowerCase() === yoIsim.toLowerCase());
          let gecenHtml = gecenListe.length ? `<div class="yo-bolum">Geçen haftanın şampiyonları</div>` + gecenListe.slice(0, 3).map((x, i) => `<div class="yo-satir"><span>${madalya(i)}</span><span class="ad">${yoGuvenliMetin(x.isim)}</span><span>${x.xp} XP</span></div>`).join('') : '';
          let tebrik = gecenIndex > -1 && gecenIndex < 3 ? `<div class="yo-satir ben" style="justify-content:center">${madalya(gecenIndex)} Geçen hafta sınıfında ${gecenIndex + 1}. oldun!</div>` : '';
          yoGovde(`${tebrik}<div class="yo-bos" style="padding:4px 0 10px">${benSinif ? benSinif + '. sınıf' : 'Sınıfın'} · Lig pazartesi sıfırlanır · ${kalanGun} gün kaldı</div>
            ${satirlar}${hata ? '<div class="yo-bos">Sınıf verisi alınamadı, sadece senin puanın görünüyor.</div>' : ''}${gecenHtml}`);
        }

        /* ========== 5) ZOR KELİMELERİM (akıllı tekrar) ========== */
        function zkEkle(k) {
          if (typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci) return;
          window.dmWrongWords?.add(k);
          if (!k || !yoHazirMi()) return;
          let en = String(k.ingilizce || k.en || '').trim(), tr = String(k.turkce || k.tr || '').trim();
          if (!en || !tr) return;
          let a = en.toLowerCase(), v = yo.zk[a];
          if (v) { v.kutu = 1; v.yanlis++; v.sonraki = yoBugun(); }
          else yo.zk[a] = { en, tr, sinif: k.sinif || '', kutu:1, yanlis:1, sonraki: yoBugun() };
          let anahtarlar = Object.keys(yo.zk);
          if (anahtarlar.length > YO_ZK_MAX) {
            anahtarlar.sort((x, y) => (yo.zk[y].kutu - yo.zk[x].kutu) || (yo.zk[x].yanlis - yo.zk[y].yanlis));
            anahtarlar.slice(0, anahtarlar.length - YO_ZK_MAX).forEach(x => delete yo.zk[x]);
          }
          yoKaydet(); yoRozetleriGuncelle();
        }
        function zkListe() { return Object.values((yo && yo.zk) || {}); }
        function zkVadesiGelen() { let b = yoBugun(); return zkListe().filter(v => v.kutu < 5 && v.sonraki <= b); }
        function yoZkAc() {
          if (!yoHazirMi()) return;
          let tum = zkListe(), vade = zkVadesiGelen(), ogrenilen = tum.filter(x => x.kutu >= 5).length;
          let isaret = k => k >= 5 ? '🟢' : k === 4 ? '🟡' : k === 3 ? '🟠' : '🔴';
          let liste = tum.sort((a, b) => (a.kutu - b.kutu) || (b.yanlis - a.yanlis)).slice(0, 60).map(v =>
            `<div class="yo-satir"><span>${isaret(v.kutu)}</span><span class="ad">${yoGuvenliMetin(v.en)} <small>— ${yoGuvenliMetin(v.tr)}</small></span><small>${v.kutu >= 5 ? 'öğrenildi' : (v.sonraki <= yoBugun() ? 'bugün' : v.sonraki.slice(5).split('-').reverse().join('.'))}</small></div>`).join('');
          yoModalAc('🔁 Zor kelimelerim', `
            <div class="yo-istat"><div><b>${vade.length}</b>bugün tekrar</div><div><b>${tum.length - ogrenilen}</b>çalışılıyor</div><div><b>${ogrenilen}</b>öğrenildi</div></div>
            ${vade.length ? `<button class="yo-btn" onclick="zkBaslat()">Tekrara başla (${Math.min(10, vade.length)} kelime)</button>` : `<div class="yo-bos">${tum.length ? '🎉 Bugünlük tekrarın bitti! Yarın yeni tekrarlar gelecek.' : 'Oyunlarda yanlış yaptığın kelimeler buraya gelir ve 1, 3, 7, 14 gün arayla tekrar sorulur.'}</div>`}
            ${liste ? '<div class="yo-bolum">Kelimelerin <small style="color:#8a78b8">🔴 yeni · 🟠 · 🟡 · 🟢 öğrenildi</small></div>' + liste : ''}`);
        }
        let zkOturum = null;
        function zkBaslat() {
          let v = yoKaristir(zkVadesiGelen()).slice(0, 10);
          if (!v.length) return;
          zkOturum = { liste: v, i: 0, d: 0, y: 0, bas: Date.now() };
          if (!document.getElementById('yoModal').classList.contains('acik')) yoModalAc('🔁 Zor kelimelerim', '');
          zkSoru();
        }
        function zkSoru() {
          let o = zkOturum;
          if (o.i >= o.liste.length) return zkBitir();
          let w = o.liste[o.i];
          let digerleri = [...new Set((window.masterKelimeHavuzu || []).map(k => String(k.ingilizce || k.en || '').trim()).filter(e => e && e.toLowerCase() !== w.en.toLowerCase()))];
          let yanlis = yoKaristir(digerleri).slice(0, 3);
          while (yanlis.length < 3) yanlis.push('—');
          let s = yoKaristir([w.en, ...yanlis]);
          o.dogruIdx = s.indexOf(w.en);
          yoGovde(`<div class="yo-ust-bilgi"><span>Kelime ${o.i + 1}/${o.liste.length}</span><span>✅ ${o.d} · ❌ ${o.y}</span></div>
            <div class="yo-ilerleme"><div style="width:${Math.round(o.i / o.liste.length * 100)}%"></div></div>
            <div class="yo-soru"><small>Bu kelimenin İngilizcesi nedir?</small><b>${yoGuvenliMetin(w.tr)}</b></div>
            <div class="yo-siklar">${s.map((x, i) => `<button class="yo-sik" onclick="zkCevap(${i})">${yoGuvenliMetin(x)}</button>`).join('')}</div>
            <div class="yo-geri-bildirim" id="yoGB"></div>`);
        }
        function zkCevap(i) {
          let o = zkOturum, w = o.liste[o.i], butonlar = document.querySelectorAll('#yoGovde .yo-sik');
          if (!butonlar.length || butonlar[0].disabled) return;
          butonlar.forEach(b => b.disabled = true);
          let kayit = yo.zk[w.en.toLowerCase()], dogruMu = i === o.dogruIdx;
          butonlar[o.dogruIdx].classList.add('dogru');
          yoSoyle(w.en);
          if (dogruMu) {
            window.DijiMeduPapiFeedback?.correct({anchor:butonlar[i],duration:850});
            o.d++;
            if (kayit) { let eski = kayit.kutu; kayit.kutu = Math.min(5, eski + 1); kayit.sonraki = kayit.kutu >= 5 ? '9999-12-31' : yoBugun(YO_ZK_GUN[eski]); }
            yoSes('dogru');
            document.getElementById('yoGB').innerHTML = kayit && kayit.kutu >= 5 ? '🟢 Bu kelimeyi öğrendin!' : '✅ Doğru! Bir sonraki tekrar daha ileride.';
          } else {
            o.y++; butonlar[i].classList.add('yanlis');
            if (kayit) { kayit.kutu = 1; kayit.yanlis++; kayit.sonraki = yoBugun(1); }
            yoSes('yanlis');
            document.getElementById('yoGB').innerHTML = '🔴 Yarın tekrar soracağım.';
          }
          yoKaydet();
          setTimeout(() => { o.i++; zkSoru(); }, dogruMu ? 1000 : 1700);
        }
        function zkBitir() {
          let o = zkOturum;
          yoRozetleriGuncelle();
          yoSonuc({ oyunAdi:'🔁 Zor kelimelerim', dogru:o.d, yanlis:o.y, puan:o.d * 10, sureSaniye:Math.round((Date.now() - o.bas) / 1000), siralamaYok:true,
            devamFn: yoZkAc, tekrarFn: zkVadesiGelen().length ? zkBaslat : null });
        }

        /* ========== 6) DİKTE (dinle-yaz) ========== */
        let dkt = null;
        function dikteAc() {
          if (!yoHazirMi()) return;
          let havuz = yoOrnekKelimeHavuzu(/^[a-zA-Z]{3,10}$/);
          if (!havuz.length) { yoToast('Seçili ünitelerde dinleme için uygun kelime yok. Başka bir ünite seç.'); return; }
          if (!yoEnerjiKontrol()) return;
          dkt = { liste: OC.kelimeSec('dikte', havuz, OC.SORU), i:0, d:0, y:0, bas:Date.now() }; OC.basla('dikte');
          yoModalAc('🎧 Kulak Dedektifi', '');
          dikteSoru();
        }
        function dikteSoru() {
          if (dkt.i >= dkt.liste.length) return dikteBitir();
          let w = dkt.liste[dkt.i];
          yoGovde(`<div class="yo-ust-bilgi"><span>Kelime ${dkt.i + 1}/${dkt.liste.length}</span><span>✅ ${dkt.d} · ❌ ${dkt.y}</span></div>
            <div class="yo-ilerleme"><div style="width:${Math.round(dkt.i / dkt.liste.length * 100)}%"></div></div>
            <div class="yo-dikte-dinle"><button onclick="dikteDinle()" aria-label="Kelimeyi dinle">🔊</button><button class="kucuk" onclick="dikteDinle(true)" aria-label="Yavaş dinle">🐢</button></div>
            <div class="yo-bos" style="padding:0 0 10px">Duyduğun kelimeyi yaz · Anlamı: <b>${yoGuvenliMetin(w.turkce || w.tr)}</b></div>
            <input class="yo-giris" id="yoDikteInput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="kelimeyi yaz" onkeydown="if(event.key==='Enter')dikteKontrol()">
            <button class="yo-btn" onclick="dikteKontrol()">Kontrol et</button>
            <div class="yo-geri-bildirim" id="yoGB"></div>`);
          setTimeout(() => { dikteDinle(); let i = document.getElementById('yoDikteInput'); if (i) i.focus(); }, 350);
        }
        function dikteDinle(yavas) { let w = dkt && dkt.liste[dkt.i]; if (w) yoSoyle(String(w.ingilizce || w.en).trim(), yavas ? 0.55 : 0.9); }
        function dikteKontrol() {
          let inp = document.getElementById('yoDikteInput'), gb = document.getElementById('yoGB');
          if (!inp || inp.disabled) return;
          let v = inp.value.trim().toLowerCase();
          if (!v) { gb.style.color = '#e0434b'; gb.innerText = 'Önce duyduğun kelimeyi yaz.'; return; }
          let w = dkt.liste[dkt.i], dogru = String(w.ingilizce || w.en).trim().toLowerCase(), tamam = v === dogru;
          window.dmVerifiedGames?.record(w,v);
          inp.disabled = true;
          if (tamam) {
            dkt.d++; OC.dogru(1); inp.style.borderColor = '#2f9e5a'; inp.style.background = '#dff6e7';
            gb.style.color = '#2f9e5a'; gb.innerText = '✅ Harika, doğru yazdın!'; yoSes('dogru');
          } else {
            dkt.y++; OC.yanlis(false); zkEkle(w); inp.style.borderColor = '#e0434b'; inp.style.background = '#fde2e3';
            gb.style.color = '#e0434b'; gb.innerHTML = `Doğrusu: <b>${yoGuvenliMetin(dogru)}</b>`; yoSes('yanlis');
          }
          setTimeout(() => { dkt.i++; dikteSoru(); }, tamam ? 1000 : 2100);
        }
        function dikteBitir() {
          yoSonuc({ oyunAdi:'🎧 Kulak Dedektifi', oyunKey:'dikte', dogru:dkt.d, yanlis:dkt.y, puan:OC.puan(), sureSaniye:Math.round((Date.now() - dkt.bas) / 1000), siralamaYok:true,
            devamFn: yoModalKapat, tekrarFn: () => { yoModalKapat(); dikteAc(); } });
        }



        /* ========== 7) CÜMLE KURMA ========== */
        let cml = null;
        function cumleAc() {
          if (!yoHazirMi()) return;
          let s = window.dmSelectedIntro?.key === 'cumle' ? window.dmSelectedIntro.classNo : Number(yoSinif(yoIsim)) || 0;
          let seviyeler = !s ? ['A1','A2','B1'] : s <= 4 ? ['A1'] : s <= 6 ? ['A1','A2'] : ['A2','B1'];
          const selectedUnits = window.dmSelectedIntro?.key === 'cumle' ? window.dmSelectedIntro.units : null;
          let bank = (window.masterKelimeHavuzu || []).filter(k => Number(k.sinif) === Number(s) && (!Array.isArray(selectedUnits) || selectedUnits.includes(Number(k.unite))) && typeof k.ingilizce === 'string' && k.ingilizce.trim().split(/\s+/).length >= 3 && k.ingilizce.trim().split(/\s+/).length <= 9 && k.turkce).map(k => [k.ingilizce.trim(), k.turkce.trim(), 'word_bank', Number(k.sinif), Number(k.unite)]);
          let liste = OC.kelimeSec('cumle', bank, OC.SORU, { anahtar: c => c[0], zk: false });
          if (!liste.length) { yoToast('Bu sınıfın seçilen ünitelerinde cümle kurulabilecek kalıp yok. Başka bir ünite seç.'); return; }
          if (!yoEnerjiKontrol()) return;
          cml = { liste, i:0, d:0, y:0, bas:Date.now() }; OC.basla('cumle');
          yoModalAc('🧱 Cümle Ustası', '');
          cumleSoru();
        }
        function cumleSoru() {
          if (cml.i >= cml.liste.length) return cumleBitir();
          let c = cml.liste[cml.i], kelimeler = c[0].split(' ').map((w, id) => ({ w, id }));
          let havuz = yoKaristir(kelimeler);
          if (havuz.map(x => x.w).join(' ') === c[0] && havuz.length > 1) havuz.reverse();
          cml.havuz = havuz; cml.cevap = []; cml.kilit = false;
          cumleCiz();
        }
        function cumleCiz() {
          let c = cml.liste[cml.i];
          yoGovde(`<div class="yo-ust-bilgi"><span>Cümle ${cml.i + 1}/${cml.liste.length}</span><span>✅ ${cml.d} · ❌ ${cml.y}</span></div>
            <div class="yo-ilerleme"><div style="width:${Math.round(cml.i / cml.liste.length * 100)}%"></div></div>
            <div class="yo-soru"><small>Bu cümleyi İngilizce kur</small><b style="font-size:18px">${yoGuvenliMetin(c[1])}</b></div>
            <div class="yo-cevap-alan">${cml.cevap.map((x, k) => `<button class="yo-chip" onclick="cumleGeri(${k})">${yoGuvenliMetin(x.w)}</button>`).join('') || '<span class="yo-bos" style="padding:8px">Kelimelere dokunarak cümleyi kur</span>'}</div>
            <div class="yo-havuz">${cml.havuz.map((x, k) => `<button class="yo-chip" onclick="cumleSec(${k})">${yoGuvenliMetin(x.w)}</button>`).join('')}</div>
            <button class="yo-btn" onclick="cumleKontrol()">Kontrol et</button>
            <div class="yo-geri-bildirim" id="yoGB"></div>`);
        }
        function cumleSec(k) { if (cml.kilit) return; cml.cevap.push(cml.havuz.splice(k, 1)[0]); cumleCiz(); }
        function cumleGeri(k) { if (cml.kilit) return; cml.havuz.push(cml.cevap.splice(k, 1)[0]); cumleCiz(); }
        function cumleKontrol() {
          if (cml.kilit) return;
          let gb = document.getElementById('yoGB'), c = cml.liste[cml.i];
          if (cml.havuz.length) { gb.style.color = '#e0434b'; gb.innerText = 'Önce tüm kelimeleri yerleştir.'; return; }
          cml.kilit = true;
          window.dmVerifiedGames?.record(c[0],cml.cevap.map(x=>x.w).join(' '));
          let dogru = cml.cevap.map(x => x.w).join(' ') === c[0];
          yoSoyle(c[0], 0.85);
          if (dogru) { cml.d++; OC.dogru(1); gb.style.color = '#2f9e5a'; gb.innerText = '✅ Mükemmel cümle!'; yoSes('dogru'); }
          else { cml.y++; OC.yanlis(false); gb.style.color = '#e0434b'; gb.innerHTML = `Doğrusu: <b>${yoGuvenliMetin(c[0])}</b>`; yoSes('yanlis'); }
          setTimeout(() => { cml.i++; cumleSoru(); }, dogru ? 1300 : 2600);
        }
        function cumleBitir() {
          yoSonuc({ oyunAdi:'🧱 Cümle Ustası', oyunKey:'cumle', dogru:cml.d, yanlis:cml.y, puan:OC.puan(), sureSaniye:Math.round((Date.now() - cml.bas) / 1000), siralamaYok:true,
            devamFn: yoModalKapat, tekrarFn: () => { yoModalKapat(); cumleAc(); } });
        }

        /* ========== 8) SEVİYE TESPİT SINAVI ========== */
        let svt = null;
        function seviyeTestAc() {
          if (!yoHazirMi()) return;
          let onceki = yo.seviye ? `<div class="yo-satir ben" style="justify-content:center">Son sonucun:&nbsp;<b>${yo.seviye.sonuc} (${YO_SEVIYE_AD[yo.seviye.sonuc]})</b>&nbsp;· ${yo.seviye.tarih.split('-').reverse().join('.')}</div>` : '';
          yoModalAc('📋 Seviye tespit', `${onceki}
            <div class="yo-soru" style="text-align:left"><small>Nasıl çalışır?</small>
              <div style="font-size:13px; font-weight:700; line-height:1.6">20 soru, kolaydan zora gider. Yaklaşık 10 dakika sürer ve enerji harcamaz. Sonunda A1, A2, B1 ya da B2 seviyeni öğrenir, Ders Çalış'ta sana uygun seviyeye geçersin.</div></div>
            <button class="yo-btn" onclick="seviyeBasla()">${yo.seviye ? 'Tekrar çöz' : 'Başla'}</button>`);
        }
        function seviyeBasla() { svt = { i:0, puan:{ A1:0, A2:0, B1:0, B2:0 }, d:0, bas:Date.now() }; seviyeSoru(); }
        function seviyeSoru() {
          if (svt.i >= YO_SEVIYE.length) return seviyeBitir();
          let q = YO_SEVIYE[svt.i], s = yoKaristir(q.o);
          svt.dogruIdx = s.indexOf(q.o[0]);
          yoGovde(`<div class="yo-ust-bilgi"><span>Soru ${svt.i + 1}/${YO_SEVIYE.length}</span><span>${q.s}</span></div>
            <div class="yo-ilerleme"><div style="width:${Math.round(svt.i / YO_SEVIYE.length * 100)}%"></div></div>
            <div class="yo-soru"><small>Boşluğa gelecek doğru seçeneği seç</small><b style="font-size:19px">${yoGuvenliMetin(q.q)}</b></div>
            <div class="yo-siklar">${s.map((x, i) => `<button class="yo-sik" onclick="seviyeCevap(${i})">${yoGuvenliMetin(x)}</button>`).join('')}</div>`);
        }
        function seviyeCevap(i) {
          let butonlar = document.querySelectorAll('#yoGovde .yo-sik');
          if (!butonlar.length || butonlar[0].disabled) return;
          butonlar.forEach(b => b.disabled = true);
          butonlar[i].classList.add(i === svt.dogruIdx ? 'dogru' : 'yanlis');
          if(i!==svt.dogruIdx){butonlar[svt.dogruIdx].classList.add('dogru');butonlar[svt.dogruIdx].style.cssText+=';background:#dcfce7!important;border:2px solid #16a34a!important;color:#166534!important;box-shadow:0 0 0 2px #86efac';}
          if (i === svt.dogruIdx) { window.DijiMeduPapiFeedback?.correct({anchor:butonlar[i],duration:650}); svt.puan[YO_SEVIYE[svt.i].s]++; svt.d++; }
          setTimeout(() => { svt.i++; seviyeSoru(); }, 1150);
        }
        function seviyeBitir() {
          let sonuc = 'A1';
          for (let lv of ['A1','A2','B1','B2']) { if (svt.puan[lv] >= 3) sonuc = lv; else break; }
          yo.seviye = { sonuc, tarih:yoBugun(), dogru:svt.d };
          yoKaydet(); yoArayuzTazele();
          yoSonuc({ oyunAdi:'📋 Seviye tespit', baslik:`Seviyen: ${sonuc}`, dogru:svt.d, yanlis:YO_SEVIYE.length - svt.d, puan:svt.d * 10, sureSaniye:Math.round((Date.now() - svt.bas) / 1000), siralamaYok:true,
            devamFn: () => {
              yoModalKapat();
              if (typeof dunyaAc === 'function') dunyaAc(); // Ders Çalış yalnızca öğretmen panelinde (11 Kas 2026)
            } });
        }
        function seviyeDavetGoster() {
          if(window.dmPapiNotices?.defer('placement-invite',seviyeDavetGoster))return;
          if (!yo || yo.seviye || !yoIsim || yoIsim.toLowerCase() === 'teacher') return;
          let anahtar = 'ing_yo_svtDavet_' + yoIsim;
          if (localStorage.getItem(anahtar)) return;
          localStorage.setItem(anahtar, '1');
          let d = document.createElement('div'); d.className = 'yo-davet';
          d.innerHTML = `<b>📋 Seviyeni 10 dakikada öğren!</b><p>Kısa bir test çöz, sana uygun seviyeden başla.</p>
            <button class="yo-btn" id="yoDavetEvet">Teste başla</button><button class="yo-btn ikincil" id="yoDavetHayir">Sonra</button>`;
          document.body.appendChild(d);
          setTimeout(() => d.classList.add('gor'), 30);
          let kapat = () => { d.classList.remove('gor'); setTimeout(() => d.remove(), 400); };
          d.querySelector('#yoDavetEvet').onclick = () => { kapat(); seviyeTestAc(); };
          d.querySelector('#yoDavetHayir').onclick = kapat;
          (window.dmPapiNotices?.later||((el,fn,ms)=>setTimeout(fn,ms)))(d,kapat,15000);
        }

        /* ========== 9) SOHBET MODU — SEVİYELİ HARİTA ========== */
let sh = null, yoSR = null;
const YS_KONUM = [50, 76, 50, 24];
function ysAzHareket() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
function ysPanel() { return document.getElementById('kp-panel-sohbet'); }
function ysYildiz(id) { return (yo && yo.sohbet && yo.sohbet[id]) || 0; }
function ysAcikMi(i) { return i === 0 || ysYildiz(YO_SOHBET[i - 1].id) >= 1; }
function ysSeviye(kod) { return YO_SOHBET_SEVIYE.find(s => s.kod === kod) || YO_SOHBET_SEVIYE[0]; }
function ysMerkez(el) { let r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

function ysPatlat(el, ikonlar, adet) {
  if (!el || ysAzHareket()) return;
  let p = ysMerkez(el);
  for (let i = 0; i < (adet || 12); i++) {
    let s = document.createElement('span'); s.className = 'ys-parca'; s.innerText = ikonlar[i % ikonlar.length];
    let a = Math.random() * Math.PI * 2, u = 50 + Math.random() * 70;
    s.style.left = (p.x - 10) + 'px'; s.style.top = (p.y - 12) + 'px';
    s.style.setProperty('--tx', Math.cos(a) * u + 'px'); s.style.setProperty('--ty', Math.sin(a) * u + 'px');
    s.style.setProperty('--tr', (Math.random() * 360 - 180) + 'deg');
    document.body.appendChild(s); setTimeout(() => s.remove(), 1100);
  }
}
function ysKonfetiYagmuru(adet) {
  if (ysAzHareket()) return;
  let ikonlar = ['🎉','✨','⭐','🎊','💜','💛','💚','💙','🧡'];
  for (let i = 0; i < adet; i++) {
    let s = document.createElement('span'); s.className = 'ys-konfeti'; s.innerText = ikonlar[i % ikonlar.length];
    s.style.left = (Math.random() * 100) + 'vw';
    s.style.animationDuration = (2 + Math.random() * 2) + 's';
    s.style.animationDelay = (Math.random() * 0.8) + 's';
    document.body.appendChild(s); setTimeout(() => s.remove(), 5000);
  }
}
function ysNoktalar(x1, x2) {
  return '<div class="ys-noktalar">' + [0.25, 0.5, 0.75].map(t => `<i style="left:${x1 + (x2 - x1) * t}%; top:${t * 100}%"></i>`).join('') + '</div>';
}

/* ---- Harita ---- */
function sohbetListeCiz(acilis) {
  let p = ysPanel(); if (!p) return;
  sohbetMikDur(); sh = null;
  if (yo && !yo.sohbet) yo.sohbet = {};
  let toplam = YO_SOHBET.length;
  let tamam = YO_SOHBET.filter(d => ysYildiz(d.id) >= 1).length;
  let yildizTop = YO_SOHBET.reduce((t, d) => t + ysYildiz(d.id), 0);
  let html = `<div class="ys-harita">
    <div class="ys-ust"><div class="ys-ust-kus">🦜</div><div class="ys-ust-metin"><b>Papağanla sohbet</b>
      <span>${tamam}/${toplam} diyalog · ⭐ ${yildizTop}/${toplam * 3}</span>
      <div class="ys-ust-bar"><i style="width:${Math.round(tamam / toplam * 100)}%"></i></div></div></div>
    <div class="ys-aciklama">Her sohbet 1 enerji. En az %60 doğru cevapla, sıradaki sohbetin kilidi açılsın. Hepsini ilk denemede bilirsen 3 yıldız!</div>`;
  YO_SOHBET_SEVIYE.forEach(sv => {
    let grup = YO_SOHBET.map((d, i) => ({ d, i })).filter(x => x.d.sv === sv.kod);
    if (!grup.length) return;
    let svAcik = ysAcikMi(grup[0].i) && !(acilis && acilis.yeniSeviye === sv.kod);
    let svTamam = grup.filter(x => ysYildiz(x.d.id) >= 1).length;
    html += `<div class="ys-bant${svAcik ? '' : ' kilitli'}" id="ysBant${sv.kod}" style="--sr:${sv.renk}"><span class="ys-bant-ikon">${sv.ikon}</span>
      <span><b>${sv.kod} · ${sv.ad}</b><small>${svTamam}/${grup.length} tamamlandı</small></span>${svAcik ? '' : '<span class="ys-bant-kilit">🔒</span>'}</div>`;
    grup.forEach((x, j) => {
      let konum = YS_KONUM[x.i % 4];
      if (j > 0) html += ysNoktalar(YS_KONUM[(x.i - 1) % 4], konum);
      let y = ysYildiz(x.d.id), acik = ysAcikMi(x.i);
      let acilacak = acilis && acilis.yeniIdx === x.i;
      let durum = acilacak ? 'kilitli' : (y >= 1 ? 'bitti' : (acik ? 'aktif' : 'kilitli'));
      let kilit = durum === 'kilitli' ? '<span class="ys-kilit">🔒</span>' : '';
      let tik = acik ? `sohbetBasla(${x.i}, this)` : 'ysKilitliTik(this)';
      html += `<div class="ys-satir" style="--x:${konum}%">
        <button class="ys-dugum ${durum}" id="ysDugum${x.i}" style="--sr:${sv.renk}" onclick="${tik}" aria-label="${x.d.ad}${acik ? '' : ', kilitli'}">
          <span class="ys-dugum-ic">${x.d.ikon}</span>${kilit}</button>
        <div class="ys-yildizlar">${[1, 2, 3].map(n => `<span class="${n <= y ? 'dolu' : ''}">★</span>`).join('')}</div>
        <div class="ys-ad">${x.d.ad}</div></div>`;
    });
  });
  html += '</div>';
  p.innerHTML = html;
  if (acilis) setTimeout(() => ysKilitAcAnimasyonu(acilis), 300);
}
function ysKilitliTik(btn) {
  btn.classList.remove('ys-salla'); void btn.offsetWidth; btn.classList.add('ys-salla');
  yoToast('🔒 Önce bir önceki sohbeti tamamla!');
}
function ysKilitAcAnimasyonu(a) {
  let yeni = document.getElementById('ysDugum' + a.yeniIdx), onceki = document.getElementById('ysDugum' + a.oncekiIdx);
  if (!yeni) return;
  let ac = () => {
    yeni.scrollIntoView({ behavior: ysAzHareket() ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => {
      let kilit = yeni.querySelector('.ys-kilit');
      if (kilit) kilit.classList.add('kiriliyor');
      setTimeout(() => {
        if (kilit) kilit.remove();
        yeni.classList.remove('kilitli'); yeni.classList.add('aktif', 'ys-yeni-acildi');
        setTimeout(() => yeni.classList.remove('ys-yeni-acildi'), 800);
        ysPatlat(yeni, ['✨','⭐','💫','🎉'], 16);
        yoSes('dogru');
        if (onceki) ysPapaganUcur(onceki, yeni);
      }, 650);
    }, 550);
  };
  if (a.yeniSeviye) {
    ysSeviyeKutla(a.yeniSeviye, () => {
      let bant = document.getElementById('ysBant' + a.yeniSeviye);
      if (bant) { bant.classList.remove('kilitli'); let k = bant.querySelector('.ys-bant-kilit'); if (k) k.remove(); bant.classList.add('ys-bant-acildi'); }
      ac();
    });
  } else ac();
}
function ysPapaganUcur(a, b) {
  if (ysAzHareket() || !document.body.animate) return;
  let p1 = ysMerkez(a), p2 = ysMerkez(b);
  let k = document.createElement('div'); k.className = 'ys-ucan-kus'; k.innerText = '🦜';
  document.body.appendChild(k);
  let ortaX = (p1.x + p2.x) / 2, ortaY = Math.min(p1.y, p2.y) - 90;
  k.animate([
    { transform: `translate(${p1.x - 22}px, ${p1.y - 22}px) scale(.8) rotate(0deg)` },
    { transform: `translate(${ortaX - 22}px, ${ortaY - 22}px) scale(1.5) rotate(-12deg)` },
    { transform: `translate(${p2.x - 22}px, ${p2.y - 52}px) scale(1) rotate(0deg)` }
  ], { duration: 1000, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).onfinish = () => k.remove();
}
function ysSeviyeKutla(kod, sonra) {
  let sv = ysSeviye(kod);
  let k = document.createElement('div'); k.className = 'ys-kutlama'; k.style.setProperty('--sr', sv.renk);
  k.innerHTML = `<div class="ys-isinlar"></div><div class="ys-kutlama-icerik">
    <div class="ys-kutlama-ikon">${sv.ikon}</div><div class="ys-kutlama-ust">YENİ SEVİYE AÇILDI</div>
    <div class="ys-kutlama-baslik">${sv.kod} · ${sv.ad}</div><div class="ys-kutlama-alt">Yeni sohbetler seni bekliyor!</div>
    <button class="yo-btn ys-kutlama-btn">Hadi başlayalım! 🚀</button></div>`;
  document.body.appendChild(k);
  if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal('kombo', 15);
  ysKonfetiYagmuru(40);
  let kapandi = false;
  let kapat = () => { if (kapandi) return; kapandi = true; k.classList.add('kapaniyor'); setTimeout(() => { k.remove(); if (sonra) sonra(); }, 400); };
  k.querySelector('button').onclick = kapat;
  setTimeout(() => { let b = k.querySelector('button'); if (b) b.focus(); }, 900);
}

/* ---- Portal geçişi ---- */
function ysPortal(kaynak, renk, sonra) {
  if (ysAzHareket() || !kaynak || !document.body.animate) { sonra(); return; }
  let m = ysMerkez(kaynak);
  let p = document.createElement('div'); p.className = 'ys-portal'; p.style.setProperty('--sr', renk);
  p.innerHTML = '<div class="ys-portal-kus">🦜</div>';
  document.body.appendChild(p);
  let an = p.animate([{ clipPath: `circle(0px at ${m.x}px ${m.y}px)` }, { clipPath: `circle(150vmax at ${m.x}px ${m.y}px)` }],
    { duration: 650, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
  an.onfinish = () => {
    sonra();
    setTimeout(() => { p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, fill: 'forwards' }).onfinish = () => p.remove(); }, 300);
  };
}

/* ---- Sohbet ekranı ---- */
function sohbetBasla(i, kaynak) {
  if (!yoHazirMi()) return;
  if (!ysAcikMi(i)) { if (kaynak) ysKilitliTik(kaynak); return; }
  if (!yoEnerjiKontrol()) return;
  let d = YO_SOHBET[i], sv = ysSeviye(d.sv);
  sohbetMikDur();
  sh = { idx: i, s: d, i: 0, d: 0, y: 0, ilk: 0, deneme: 0, bas: Date.now(), kilit: true };
  let o = sh;
  ysPortal(kaynak, sv.renk, () => {
    if (sh !== o) return;
    let p = ysPanel();
    p.innerHTML = `<div class="yo-sohbet ys-sohbet" style="--sr:${sv.renk}">
      <div class="yo-s-ust"><button class="yo-s-geri" onclick="sohbetListeCiz()">← Harita</button><b>${d.ikon} ${d.ad}</b><span class="ys-rozet">${d.sv}</span></div>
      <div class="ys-adimlar" id="ysAdimlar">${d.satirlar.map(() => '<i></i>').join('')}</div>
      <div class="yo-s-akis" id="yoSAkis"></div>
      <div class="yo-s-ipucu" id="yoSIpucu"></div>
      <div class="yo-s-giris"><button class="yo-s-mik" id="yoSMik" onclick="sohbetMik()" aria-label="Mikrofonla cevap ver">🎤</button>
        <input id="yoSInput" placeholder="Cevabını yaz..." autocomplete="off" onkeydown="if(event.key==='Enter')sohbetGonder()">
        <button onclick="sohbetGonder()" aria-label="Gönder">➤</button></div></div>`;
    p.scrollIntoView({ block: 'start' });
    sohbetPapaganSoyle();
  });
}
function ysAdimGuncelle() {
  let a = document.getElementById('ysAdimlar'); if (!a || !sh) return;
  [...a.children].forEach((e, k) => { e.className = k < sh.i ? 'tamam' : (k === sh.i ? 'simdi' : ''); });
}
function sohbetBalon(tur, html) {
  let a = document.getElementById('yoSAkis'); if (!a) return null;
  a.insertAdjacentHTML('beforeend', `<div class="yo-s-balon ${tur}">${html}</div>`);
  a.scrollTop = a.scrollHeight;
  return a.lastElementChild;
}
function sohbetPapaganSoyle() {
  let o = sh; if (!o) return;
  let s = o.s.satirlar[o.i];
  ysAdimGuncelle();
  o.kilit = true;
  let yaziyor = sohbetBalon('p ys-yaziyor', '<i></i><i></i><i></i>');
  document.getElementById('yoSIpucu').innerHTML = '';
  setTimeout(() => {
    if (sh !== o) return;
    if (yaziyor) yaziyor.remove();
    sohbetBalon('p', '🦜 ' + yoGuvenliMetin(s.p));
    yoSoyle(s.p, 0.9);
    document.getElementById('yoSIpucu').innerHTML = `💡 ${yoGuvenliMetin(s.tr)} Örnek: <i>${yoGuvenliMetin(s.ornek)}</i>`;
    o.kilit = false;
  }, ysAzHareket() ? 100 : 950);
}
function sohbetGonder(metin) {
  if (!sh || sh.kilit) return;
  let inp = document.getElementById('yoSInput');
  metin = String(metin || (inp ? inp.value : '')).trim();
  if (!metin) return;
  if (inp) inp.value = '';
  let benBalon = sohbetBalon('ben', yoGuvenliMetin(metin));
  let s = sh.s.satirlar[sh.i];
  let norm = typeof kpNormallestir === 'function' ? kpNormallestir : (x => String(x).toLowerCase());
  let n = norm(metin), kelimeSay = n.split(' ').filter(Boolean).length;
  let tutar = s.k.some(k => n.includes(norm(k)));
  if (tutar && s.min && kelimeSay < s.min) {
    sohbetBalon('hata', `✍️ Güzel başlangıç! Biraz daha uzun anlat (en az ${s.min} kelime).`);
    return;
  }
  if (tutar) {
    sh.d++; if (sh.deneme === 0) sh.ilk++;
    sh.kilit = true;
    if (benBalon) benBalon.classList.add('parla');
    sohbetBalon('ok', sh.deneme === 0 ? '✅ Harika cevap!' : '✅ Bu sefer oldu!');
    ysPatlat(benBalon, ['✨','⭐','🎉'], 10);
    yoSes('dogru');
    sohbetIleri(1300);
  } else {
    sh.deneme++; yoSes('yanlis');
    if (benBalon) benBalon.classList.add('ys-salla');
    if (sh.deneme < 2) sohbetBalon('hata', '🤔 Tam olmadı, ipucuna bakıp tekrar dene.');
    else { sh.y++; sh.kilit = true; sohbetBalon('hata', `Şöyle diyebilirdin: "${yoGuvenliMetin(s.ornek)}"`); sohbetIleri(2400); }
  }
}
function sohbetIleri(ms) {
  sh.deneme = 0;
  let o = sh;
  setTimeout(() => { if (sh !== o) return; sh.i++; if (sh.i >= sh.s.satirlar.length) sohbetBitir(); else sohbetPapaganSoyle(); }, ms);
}

/* ---- Bitiş sahnesi ---- */
function sohbetBitir() {
  sohbetMikDur();
  let o = sh, t = o.s.satirlar.length;
  let gecti = o.d / t >= 0.6;
  let yildiz = !gecti ? 0 : (o.d === t ? (o.ilk === t ? 3 : 2) : 1);
  let eski = ysYildiz(o.s.id), ilkKezGecti = gecti && eski < 1;
  if (yo) { yo.sohbet = yo.sohbet || {}; if (yildiz > eski) yo.sohbet[o.s.id] = yildiz; yoKaydet(); }
  let xp = o.d * 10;
  if (o.d > 0) yoXpEkle(xp, o.d, 'sohbet', o.s.id);
  let acilis = null;
  if (ilkKezGecti && o.idx + 1 < YO_SOHBET.length) {
    let sonraki = YO_SOHBET[o.idx + 1];
    acilis = { yeniIdx: o.idx + 1, oncekiIdx: o.idx, yeniSeviye: sonraki.sv !== o.s.sv ? sonraki.sv : null };
  }
  let baslik = !gecti ? 'Biraz daha pratik!' : (yildiz === 3 ? 'Mükemmel sohbet!' : 'Harika sohbet!');
  let p = ysPanel();
  p.innerHTML = `<div class="yo-sohbet ys-final" style="--sr:${ysSeviye(o.s.sv).renk}">
    <div class="ys-final-kus${gecti ? ' mutlu' : ''}">🦜</div>
    <div class="ys-final-baslik">${baslik}</div>
    <div class="ys-final-alt">${o.s.ikon} ${o.s.ad} · ${o.d}/${t} doğru</div>
    <div class="ys-final-yildiz">${[1, 2, 3].map(n => `<span class="${n <= yildiz ? 'dolu' : ''}" style="animation-delay:${0.25 + n * 0.35}s">★</span>`).join('')}</div>
    <div class="ys-final-xp">+<b id="ysXp">0</b> XP · +${o.d} 🪙</div>
    ${gecti ? (acilis ? '<div class="ys-final-not">🔓 Yeni bir sohbetin kilidi açıldı!</div>' : '') : '<div class="ys-final-not hata">Kilidi açmak için en az %60 doğru gerekiyor.</div>'}
    <button class="yo-btn" id="ysHaritaBtn">🗺️ Haritaya dön</button>
    <button class="yo-btn ikincil" id="ysTekrarBtn">🔁 Tekrar dene</button></div>`;
  p.scrollIntoView({ block: 'start' });
  let xpEl = document.getElementById('ysXp'), sayi = 0, adim = Math.max(1, Math.ceil(xp / 20));
  let say = setInterval(() => { sayi = Math.min(xp, sayi + adim); if (xpEl) xpEl.innerText = sayi; if (sayi >= xp) clearInterval(say); }, 45);
  if (gecti) { setTimeout(() => ysKonfetiYagmuru(yildiz * 12), 600); if (typeof genelSesEfektiCal === 'function') setTimeout(() => genelSesEfektiCal('kombo', 10), 400); }
  document.getElementById('ysHaritaBtn').onclick = () => sohbetListeCiz(acilis);
  document.getElementById('ysTekrarBtn').onclick = (e) => sohbetBasla(o.idx, e.currentTarget);
  sh = null;
}

/* ---- Mikrofon ---- */
function sohbetMik() {
  let SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { yoToast('Tarayıcın mikrofonu desteklemiyor, yazarak cevap ver.'); return; }
  if (yoSR) { sohbetMikDur(); return; }
  yoSR = new SR(); yoSR.lang = 'en-US'; yoSR.interimResults = false; yoSR.maxAlternatives = 1;
  let btn = document.getElementById('yoSMik'); if (btn) btn.classList.add('dinliyor');
  yoSR.onresult = e => { let t = e.results[0][0].transcript; sohbetMikDur(); sohbetGonder(t); };
  yoSR.onerror = () => sohbetMikDur();
  yoSR.onend = () => { yoSR = null; let b = document.getElementById('yoSMik'); if (b) b.classList.remove('dinliyor'); };
  try { yoSR.start(); } catch (e) { sohbetMikDur(); }
}
function sohbetMikDur() {
  if (yoSR) { let r = yoSR; yoSR = null; try { r.stop(); } catch (e) {} }
  let b = document.getElementById('yoSMik'); if (b) b.classList.remove('dinliyor');
}

        /* ========== 10-11) ÖĞRETMEN RAPORLARI ========== */
        let yoRaporTip = 'zayif';
        function yoOgretmenRapor(tip) {
          yoRaporTip = tip;
          let m = document.getElementById('ogretmenMenuModal'); if (m) m.style.display = 'none';
          let siniflar = [...new Set((globalDataCache || []).filter(u => String(u.ogrenci || '').toLowerCase() !== 'teacher').map(u => String(u.Sinif || '').trim()).filter(Boolean))].sort((a, b) => a - b);
          yoModalAc(tip === 'zayif' ? '🔍 Sınıfın zayıf noktaları' : '📨 Haftalık veli özetleri', `
            <div class="yo-yukle"><select id="yoRaporSinif" onchange="yoRaporYukle()"><option value="">Sınıf seçin</option>${siniflar.map(s => `<option value="${s}">${s}. sınıf</option>`).join('')}</select></div>
            <div id="yoRaporAlan"><div class="yo-bos">${tip === 'zayif' ? 'Sınıftaki öğrencilerin en çok yanlış yaptığı kelimeleri görmek için bir sınıf seç.' : 'Her öğrencinin bu haftaki özetini hazırlayıp veliye WhatsApp ile tek dokunuşla gönderebilirsin.'}</div></div>`,
            () => { let mm = document.getElementById('ogretmenMenuModal'); if (mm) mm.style.display = 'flex'; });
        }
        async function yoRaporYukle() {
          let sinif = document.getElementById('yoRaporSinif').value, alan = document.getElementById('yoRaporAlan');
          if (!sinif) return;
          if(yoRaporTip==='veli')return window.dmVeliRaporYukle(sinif,alan);
          alan.innerHTML = '<div class="yo-bos">Veriler yükleniyor...</div>';
          let veri;
          try { veri = await yoTumVeri(); } catch (e) { alan.innerHTML = '<div class="yo-bos">Veriler alınamadı. İnternet bağlantını kontrol edip tekrar dene.</div>'; return; }
          let ogrenciler = (globalDataCache || []).filter(u => String(u.Sinif || '').trim() === sinif && String(u.ogrenci || '').toLowerCase() !== 'teacher');
          let buHafta = yoHaftaKodu(), haftaBas = yoHaftaBaslangic();
          if (yoRaporTip === 'zayif') {
            let agg = {}, calismayan = [];
            ogrenciler.forEach(u => {
              let b = veri[String(u.ogrenci).trim().toLowerCase()];
              if (!b || !b.lig || b.lig.hafta !== buHafta || !b.lig.xp) calismayan.push(u.ogrenci);
              if (!b || !b.zk) return;
              Object.values(b.zk).forEach(v => {
                if (v.kutu >= 5) return;
                let a = String(v.en).toLowerCase();
                if (!agg[a]) agg[a] = { en:v.en, tr:v.tr, ogr:0, yanlis:0 };
                agg[a].ogr++; agg[a].yanlis += v.yanlis || 1;
              });
            });
            let ilk = Object.values(agg).sort((a, b) => (b.ogr - a.ogr) || (b.yanlis - a.yanlis)).slice(0, 10);
            alan.innerHTML = (ilk.length ? '<div class="yo-bolum">En çok zorlanılan 10 kelime</div>' + ilk.map((x, i) =>
              `<div class="yo-satir"><span>${i + 1}.</span><span class="ad">${yoGuvenliMetin(x.en)} <small>— ${yoGuvenliMetin(x.tr)}</small></span><small>${x.ogr} öğr. · ${x.yanlis} yanlış</small></div>`).join('')
              : '<div class="yo-bos">Bu sınıfta henüz kayıtlı zor kelime yok.</div>') +
              (calismayan.length ? `<div class="yo-bolum">Bu hafta hiç çalışmayanlar (${calismayan.length})</div><div class="yo-bos" style="text-align:left">${calismayan.map(yoGuvenliMetin).join(', ')}</div>` : '');
          } else {
            return window.dmVeliRaporYukle(sinif, alan);
          }
        }

        /* ========== ARAYÜZE YERLEŞTİRME ========== */
        function yoRozetleriGuncelle() {
          let r = document.getElementById('yoZkRozet');
          if (r && yo) { let n = zkVadesiGelen().length; r.style.display = n ? '' : 'none'; r.innerText = n + ' TEKRAR'; }
          let s = document.getElementById('yoSeviyeRozet');
          if (s && yo) s.innerText = yo.seviye ? yo.seviye.sonuc : 'YENİ';
        }
        function yoArayuzTazele() { yoGuvenli(() => { yoHedefHalkaCiz(); yoAvatarUygula(); yoRozetleriGuncelle(); }); }

        function yoArayuzKur() {
          let sag = document.querySelector('.header-right-widgets');
          if (sag && !document.getElementById('yoHedefBtn')) {
            let b = document.createElement('button'); b.id = 'yoHedefBtn'; b.className = 'yo-hedef-btn'; b.onclick = yoHedefAc;
            sag.insertBefore(b, sag.firstChild);
          }
          let araclar = document.querySelector('.header-tools-row');
          if (araclar && !document.getElementById('yoLigBtn')) {
            araclar.insertAdjacentHTML('beforeend', `<button class="header-tool-btn" id="yoLigBtn" onclick="yoLigAc()" title="Haftalık lig" aria-label="Haftalık lig">🏆</button><button class="header-tool-btn" onclick="yoMagazaAc()" title="Papağan mağazası" aria-label="Papağan mağazası">🛍️</button>`);
          }
          let so = document.querySelector('#tab-sanaozel .dc-focus-card');
          if (so && !document.getElementById('yoSanaOzelGrid')) {
            so.insertAdjacentHTML('beforeend', `<div class="sana-ozel-odevler-baslik" style="color:#553c9a; border-bottom-color:#e7dcff;">🚀 Gelişim araçlarım</div>
              <div class="az-grid2x2" id="yoSanaOzelGrid">
                <button class="az-gcard" style="background:linear-gradient(160deg,#fb7185,#be123c);" onclick="yoZkAc()"><span class="yo-rozet-kose" id="yoZkRozet" style="display:none"></span><div class="az-gcard-icon">🔁</div><div class="az-gcard-title">Zor Kelimelerim</div></button>
                <button class="az-gcard" style="background:linear-gradient(160deg,#fbbf24,#d97706);" onclick="yoLigAc()"><div class="az-gcard-icon">🏆</div><div class="az-gcard-title">Haftalık Lig</div></button>
                <button class="az-gcard" style="background:linear-gradient(160deg,#34d399,#0f766e);" onclick="yoMagazaAc()"><div class="az-gcard-icon">🛍️</div><div class="az-gcard-title">Papağan Mağazası</div></button>
              </div>`);
          }
          let ak = document.querySelector('#tab-aktiviteler .az-grid2x2');
          if (ak && !document.getElementById('yoDikteKart')) {
            let son = ak.querySelector('.az-gcard.span2');
            let html = `<button class="az-gcard" id="yoDikteKart" style="background:linear-gradient(160deg,#38bdf8,#6d28d9);" onclick="()"><div class="az-gcard-badge">YENİ</div><div class="az-gcard-icon">🎧</div><div class="az-gcard-title">Dikte (Dinle-Yaz)</div></button>
              <button class="az-gcard" style="background:linear-gradient(160deg,#f472b6,#9333ea);" onclick="cumleAc()"><div class="az-gcard-badge">YENİ</div><div class="az-gcard-icon">🧱</div><div class="az-gcard-title">Cümle Kur</div></button>`;
            if (son) son.insertAdjacentHTML('beforebegin', html); else ak.insertAdjacentHTML('beforeend', html);
          }
          let sp = document.getElementById('kp-panel-sohbet');
          if (sp && !sp.dataset.yo) { sp.dataset.yo = '1'; sohbetListeCiz(); }
          yoOgretmenButonlariEkle();
          yoArayuzTazele();
        }
        function yoOgretmenButonlariEkle() {
          let k = document.querySelector('#ogretmenMenuModal .rubric-content');
          if (!k || document.getElementById('yoOgrZayifBtn')) return;
          k.insertAdjacentHTML('beforeend', `<button class="ogretmen-menu-btn" id="yoOgrZayifBtn" onclick="yoOgretmenRapor('zayif')"><span>🔍 Sınıfın Zayıf Noktaları</span></button>
            <button class="ogretmen-menu-btn" onclick="yoOgretmenRapor('veli')"><span>📨 Haftalık Veli Özetleri</span></button>`);
        }

        /* ========== MEVCUT FONKSİYONLARA BAĞLANMA (dışarıdan sarma) ========== */
        function yoSar(ad, once, sonra) {
          let org = window[ad];
          if (typeof org !== 'function' || org._yoSarildi) return;
          let sarici = function () {
            let ctx = null;
            try { if (once) ctx = once.apply(this, arguments); } catch (e) {}
            let sonuc = org.apply(this, arguments);
            try { if (sonra) sonra(ctx, arguments); } catch (e) {}
            return sonuc;
          };
          sarici._yoSarildi = true;
          window[ad] = sarici;
        }
        function yoBaglantilariKur() {
          // Oyun sonu: XP ve altın
          yoSar('genelSonucEkraniGoster', null, (c, a) => {
            if (typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci) return;
            if (a[0] && a[0].yildiz && typeof ocOdulVer === 'function') { ocOdulVer(a[0]); return; }
            let d = Number(a[0] && a[0].dogru) || 0;
            if (d > 0) yoXpEkle(d * 10, d, 'oyun_sonu');
          });
          // Yanlış yapılan kelimeleri "Zor Kelimelerim"e ekle
          yoSar('kyCevapVer', i => { let s = kySorularListesi[kySoruIndex]; if (!s || document.getElementById('kySik0').disabled) return null; return { s, y: i !== s._dogruIndex }; }, c => { if (c && c.y) zkEkle(c.s); });
          yoSar('jpCevapVer', i => { let b = document.getElementById('jpSik' + i); if (!jpAktifSoru || (b && b.disabled)) return null; return { s: jpAktifSoru, y: i !== jpAktifSoru._dogruIndex }; }, c => { if (c && c.y) zkEkle(c.s); });
          yoSar('yagmurSecenekSec', (s, d, b) => (b && b.disabled) ? null : { k: yagmurAktifKelime, y: s !== d }, c => { if (c && c.y) zkEkle(c.k); });
          yoSar('asmacaHarfSec', () => ({ y: asmacaYanlisSayisi, k: asmacaKelimeler[asmacaAktifIndex] }), c => { if (c && c.y < 6 && asmacaYanlisSayisi >= 6) zkEkle(c.k); });
          yoSar('kelimebulTahminGonder', () => ({ d: kelimebulDenemeSayisi, k: kelimebulKelimeler[kelimebulAktifIndex] }), c => {
            if (c && c.d < 6 && kelimebulDenemeSayisi >= 6 && document.getElementById('kbIpucu').innerHTML.indexOf('Doğrusu') !== -1) zkEkle(c.k);
          });
          yoSar('boslukKontrolEt', () => window.boslukSonucDetaylari, onceki => {
            let d = window.boslukSonucDetaylari;
            if (d && d !== onceki) d.forEach((x, i) => { if (!x.dogruMu) zkEkle((window.boslukCizilenKelimeler || [])[i]); });
          });
          yoSar('kpCevapKontrolEt', () => ({ d: kpAktifSoruYanlisDeneme, k: kpSoruListesi[kpSoruIndex] }), c => { if (c && c.d < 3 && kpAktifSoruYanlisDeneme >= 3) zkEkle(c.k); });
          yoSar('kpSonrakineGec', () => kpSoruListesi[kpSoruIndex], k => zkEkle(k));
          yoSar('baYanlisIsle', () => baAktifSoru && baAktifSoru.kelime, k => zkEkle(k));
          // Seri dondurucu (seri hesaplanmadan hemen önce devreye girer)
          yoSar('girisSerisiGuncelleVeGetir', () => yoSeriDondurucuKontrol(), null);
          // Konuşma Pratiği kapanınca sohbet mikrofonunu da kapat
          yoSar('kpModuKapat', null, () => sohbetMikDur());
        }
        yoGuvenli(yoBaglantilariKur);
        yoGuvenli(yoOgretmenButonlariEkle);

        // Giriş yapılınca (otomatik ya da elle) paketi başlat
        let yoBaslatildi = '', yoBaslatTask = null;
        window.dmPrepareMemberState = function () {
          const owner=typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
          if(!owner)return Promise.resolve(false);
          if(yoBaslatildi===owner)return yoBaslatTask||Promise.resolve(true);
          yoBaslatildi=owner;
          yoBaslatTask=(async()=>{
            yoHazirla(owner);
            yoArayuzKur();
            const ok=await window.yoSunucudanAl();
            if(owner===aktifOgrenciAdi)setTimeout(()=>window.dmMemberExperience?.check(),120000);
            return ok;
          })().catch(e=>{console.warn('Öğrenci durumu yüklenemedi',e);return false;});
          return yoBaslatTask;
        };
        setInterval(() => {
          const panel=document.getElementById('panel-alani');
          if(panel?.style.display==='block'&&typeof aktifOgrenciAdi!=='undefined'&&aktifOgrenciAdi)
            window.dmPrepareMemberState();
        }, 1000);
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('yoModal').classList.contains('acik')) yoModalKapat(); });
        