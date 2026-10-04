// Public learning content only. Guest responses never join student or teacher tables.
export async function guestContent(db:any,kind:string,b:any){
 if(kind==='bootstrap'){
  const words:any[]=[];
  for(let start=0;start<10000;start+=1000){const {data,error}=await db.from('word_bank').select('class_no,unit_no,english,turkish').eq('active',true).order('class_no').order('unit_no').order('english').range(start,start+999);if(error)throw error;words.push(...(data||[]));if((data||[]).length<1000)break;}
  const {data:topics,error}=await db.from('lesson_topics').select('level,category,topic_name,sort_no').eq('active',true).order('sort_no');if(error)throw error;
  const {data:sentences,error:sentenceError}=await db.from('sentence_bank').select('class_no,unit_no,english,turkish,alternatives,distractors').eq('active',true).order('class_no').order('unit_no').limit(2000);if(sentenceError)throw sentenceError;
  const {data:cards,error:cardError}=await db.from('word_cards').select('class_no,unit_no,level_no,button_name,external_link').order('class_no').order('unit_no').order('level_no').limit(1000);if(cardError)throw cardError;
  const {data:flags,error:flagError}=await db.from('dm_release_flags').select('code,enabled');if(flagError)throw flagError;
  return {flags:Object.fromEntries((flags||[]).map((f:any)=>[f.code,f.enabled])),cards:(cards||[]).map((c:any)=>({sinif:Number(c.class_no),unite:Number(c.unit_no),seviye:Number(c.level_no),butonAdi:c.button_name,disLink:c.external_link})),sentences:sentences||[],words:words.map(w=>({sinif:w.class_no,unite:w.unit_no,ingilizce:w.english,turkce:w.turkish})),topics:(topics||[]).map((t:any)=>({seviye:t.level,kategori:t.category,konuAdi:t.topic_name,siraNo:t.sort_no,durum:''}))};
 }
 if(kind==='lesson'){
  const {data,error}=await db.from('lesson_topics').select('content').eq('active',true).eq('level',String(b.seviye||'').slice(0,20)).eq('category',String(b.kategori||'').slice(0,80)).eq('topic_name',String(b.konu||'').slice(0,150)).maybeSingle();if(error)throw error;
  const c=data?.content||{};const text=(v:any)=>typeof v==='string'?v:JSON.stringify(v||[]);
  return {...c,anlatimHTML:c.anlatimHTML||'',kelimeSozlugu:text(c.kelimeSozlugu||{}),ornekler:text(c.ornekler),testJSON:text(c.testJSON||c.test),uygulamaJSON:text(c.uygulamaJSON||c.uygulama)};
 }
 return null;
}
