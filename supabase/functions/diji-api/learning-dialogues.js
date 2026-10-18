/* Original short dialogues. The same bank is deployed with the API. */
(function(root,factory){const bank=factory();if(typeof module==='object'&&module.exports)module.exports=bank;root.DMLearningDialogues=bank;})(globalThis,function(){
  'use strict';
  return [
    {id:'cafe',level:'A1',title:'Kafede Bir Gün',icon:'☕',scene:'Bir müşteri kafede sipariş veriyor.',
      lines:[['Customer','Can I have some water, please?'],['Server','Of course! Would you like a sandwich?'],['Customer','Yes, please. A cheese sandwich.'],['Server','Here you are.'],['Customer','Thank you!']],
      words:[{en:'water',tr:'su'},{en:'sandwich',tr:'sandviç'},{en:'cheese',tr:'peynir'}],
      questions:[
        {skill:'reading',prompt:'Müşteri önce ne istiyor?',options:['Su','Kahve','Süt'],answer:'Su',explanation:'“Can I have some water, please?” nazikçe su istemek için kullanılır.'},
        {skill:'listening',prompt:'Müşteri hangi sandviçi seçiyor?',options:['Peynirli','Tavuklu','Yumurtalı'],answer:'Peynirli',explanation:'“A cheese sandwich” peynirli sandviç demektir.'},
        {skill:'writing',prompt:'“Lütfen” sözcüğünü İngilizce yaz.',answers:['please'],answer:'please',explanation:'Ricalarımıza “please” ekleyerek daha nazik konuşabiliriz.'}
      ]},
    {id:'weather',level:'A1',title:'Yağmurlu Bir Sabah',icon:'☂️',scene:'İki arkadaş dışarı çıkmadan önce konuşuyor.',
      lines:[['Ada','Is it sunny today?'],['Sam','No, it is cloudy and rainy.'],['Ada','Where is my umbrella?'],['Sam','It is next to the door.'],['Ada','Great! Let us go.']],
      words:[{en:'cloudy',tr:'bulutlu'},{en:'rainy',tr:'yağmurlu'},{en:'umbrella',tr:'şemsiye'}],
      questions:[
        {skill:'reading',prompt:'Hava nasıl?',options:['Bulutlu ve yağmurlu','Güneşli ve sıcak','Karlı ve soğuk'],answer:'Bulutlu ve yağmurlu',explanation:'“Cloudy and rainy” ifadesi bulutlu ve yağmurlu havayı anlatır.'},
        {skill:'listening',prompt:'Şemsiye nerede?',options:['Kapının yanında','Masanın altında','Çantanın içinde'],answer:'Kapının yanında',explanation:'“Next to the door” kapının yanında demektir.'},
        {skill:'writing',prompt:'“Şemsiye” sözcüğünü İngilizce yaz.',answers:['umbrella'],answer:'umbrella',explanation:'“Umbrella” şemsiye demektir. “My umbrella” benim şemsiyemdir.'}
      ]},
    {id:'directions',level:'A2',title:'Kütüphaneyi Bulalım',icon:'📚',scene:'Bir ziyaretçi kütüphanenin yolunu soruyor.',
      lines:[['Visitor','Excuse me. How can I get to the library?'],['Local','Go straight ahead and turn left at the bank.'],['Visitor','Is it far from here?'],['Local','No. It is a five-minute walk. The library is opposite the park.'],['Visitor','Thank you for your help.']],
      words:[{en:'library',tr:'kütüphane'},{en:'turn left',tr:'sola dön'},{en:'opposite',tr:'karşısında'}],
      questions:[
        {skill:'reading',prompt:'Ziyaretçi nereye gitmek istiyor?',options:['Kütüphaneye','Bankaya','Parka'],answer:'Kütüphaneye',explanation:'“How can I get to the library?” kütüphaneye nasıl gidebilirim demektir.'},
        {skill:'listening',prompt:'Bankaya gelince ne yapmalı?',options:['Sola dönmeli','Sağa dönmeli','Geri dönmeli'],answer:'Sola dönmeli',explanation:'“Turn left at the bank” bankanın orada sola dön demektir.'},
        {skill:'writing',prompt:'“Kütüphane” sözcüğünü İngilizce yaz.',answers:['library'],answer:'library',explanation:'“The library is opposite the park.” Kütüphane parkın karşısındadır.'}
      ]},
    {id:'weekend',level:'B1',title:'Hafta Sonu Planı',icon:'🌳',scene:'İki arkadaş hava koşullarına göre plan yapıyor.',
      lines:[['Mina','Shall we go hiking on Saturday?'],['Leo','I would love to, but the forecast says it might rain.'],['Mina','If it rains, we can visit the science museum instead.'],['Leo','Good idea. Let us check the forecast on Friday evening.'],['Mina','Agreed. I will book the museum tickets only if we need them.']],
      words:[{en:'forecast',tr:'hava tahmini'},{en:'instead',tr:'onun yerine'},{en:'hiking',tr:'doğa yürüyüşü'}],
      questions:[
        {skill:'reading',prompt:'Yağmur yağarsa ne yapacaklar?',options:['Bilim müzesine gidecekler','Evde kalacaklar','Yürüyüşe devam edecekler'],answer:'Bilim müzesine gidecekler',explanation:'“If it rains, we can visit…” koşula bağlı bir seçenek sunar.'},
        {skill:'listening',prompt:'Hava tahminini ne zaman kontrol edecekler?',options:['Cuma akşamı','Cumartesi sabahı','Pazar öğlen'],answer:'Cuma akşamı',explanation:'Diyalogdaki “on Friday evening” ifadesi cuma akşamını belirtir.'},
        {skill:'writing',prompt:'“Onun yerine” anlamındaki İngilizce sözcüğü yaz.',answers:['instead'],answer:'instead',explanation:'“Instead” başka bir seçeneğe geçerken kullanılır: “We can visit the museum instead.”'}
      ]},
    {id:'project',level:'B2',title:'Birlikte Daha İyi Bir Proje',icon:'🌱',scene:'İki öğrenci bir okul projesinin kapsamını tartışıyor.',
      lines:[['Alex','Our recycling project could involve the whole school.'],['Deniz','That would have a bigger impact, although it might be difficult to organise.'],['Alex','What if we started with one class and expanded it after a month?'],['Deniz','That sounds more manageable. We could use the first month to identify problems.'],['Alex','Exactly. We should measure the results before deciding whether to expand.']],
      words:[{en:'impact',tr:'etki'},{en:'manageable',tr:'yönetilebilir'},{en:'expand',tr:'genişletmek'}],
      questions:[
        {skill:'reading',prompt:'İlk aşamada neden tek sınıfla başlayacaklar?',options:['Uygulamayı deneyip sorunları görmek için','Projeyi bir günde bitirmek için','Sonuçları ölçmemek için'],answer:'Uygulamayı deneyip sorunları görmek için',explanation:'Küçük başlayıp ilk ay sorunları belirlemek, projenin yönetilmesini kolaylaştırıyor.'},
        {skill:'listening',prompt:'Kapsamı genişletmeden önce ne yapmalılar?',options:['Sonuçları ölçmeliler','Bütün okulu hemen katmalılar','Projeyi iptal etmeliler'],answer:'Sonuçları ölçmeliler',explanation:'“Measure the results before deciding whether to expand” önce sonuçları ölçmeyi önerir.'},
        {skill:'writing',prompt:'“Yönetilebilir” anlamındaki İngilizce sözcüğü yaz.',answers:['manageable'],answer:'manageable',explanation:'“Manageable” bir işin başa çıkılabilecek ölçüde olduğunu anlatır.'}
      ]}
  ];
});
