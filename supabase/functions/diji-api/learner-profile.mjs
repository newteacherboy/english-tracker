/* Private learning preferences; never an authorization or age-verification claim. */
export function normalizeLearnerProfile(value, legacyClass=null, legacyPurpose='',{allowUnknownAge=false}={}) {
 if(value===undefined||value===null)return {version:0,purpose:legacyPurpose==='school'?'school':legacyPurpose==='independent'?'independent':legacyClass?'school':'independent',ageBand:'',educationStage:legacyClass?Number(legacyClass)<=4?'primary':Number(legacyClass)<=8?'middle':'high':'',goal:'daily',startChoice:'new',knownLevel:'A1'};
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Öğrenme bilgilerini kontrol et.');
 const valid=(key,values,fallback)=>{const v=value[key]??fallback;if(!values.includes(v))throw Error('Öğrenme bilgilerini kontrol et: '+key);return v;};
 const purpose=valid('purpose',['school','independent'],'independent');
 return {version:1,purpose,ageBand:allowUnknownAge?'':valid('ageBand',purpose==='independent'?['','under13','teen','adult']:['under13','teen','adult'],''),educationStage:purpose==='school'?valid('educationStage',['primary','middle','high','university'],''):'',goal:valid('goal',['daily','travel','school','exam'],'daily'),startChoice:(c=>c==='some'?'new':c)(valid('startChoice',['new','some','known','test'],'new')),knownLevel:valid('knownLevel',['A1','A2','B1','B2'],'A1'),...(value.placementPolicy==='verified-upper'?{placementPolicy:'verified-upper'}:{})};
}
export function learnerClass(profile, value){
 if(profile.version===0){if(profile.purpose==='independent')return null;const n=Number(value);if(!Number.isInteger(n)||n<1||n>8)throw Error('Sınıf 1 ile 8 arasında olmalı.');return n;}
 if(profile.purpose!=='school'||!profile.educationStage||profile.educationStage==='university')return null;
 // Primary and middle school learners start at their class, so it is required (20 Oct 2026).
 if(value===null||value===undefined||value===''){if(['primary','middle'].includes(profile.educationStage))throw Error('Sınıfını seç; başlangıç durağın buna göre belirlenir.');return null;}
 const n=Number(value),bounds={primary:[1,4],middle:[5,8],high:[9,12]}[profile.educationStage];
 if(!bounds||!Number.isInteger(n)||n<bounds[0]||n>bounds[1])throw Error('Eğitim kademene uygun sınıfı seç.');return n;
}
export async function saveLearnerProfile(db,id,profile){if(!profile.version)return;const r=await db.from('extra_data').upsert({student_id:id,key_name:'learner_profile_v1',value:profile,updated_at:new Date().toISOString()},{onConflict:'student_id,key_name'});if(r.error)throw r.error;}

/* [18 Kas 2026] Kayıtta seçilen amaç parkuru belirler: "Okul derslerim için" (ilkokul/ortaokul) → Okul Yolum;
   "Kendim için" ve lise/üniversite "Okul derslerim için" → Öğrenme Yolu (lise/üniversitede Okul Yolum'un tamamı açık). Rota kayıt anında sunucuda yazılır; istemcinin ikinci isteği
   başarısız olsa bile hesap rotasız kalmaz. Zaten seçilmiş bir rotanın üzerine yazılmaz. */
export async function seedLearningRoute(db,id,profile){
 if(!id||!profile||!['school','independent'].includes(profile.purpose))return;
 const route=profile.purpose==='school'&&!['high','university'].includes(profile.educationStage)?'school':'independent',at=new Date().toISOString();
 const cur=await db.from('extra_data').select('value').eq('student_id',id).eq('key_name','yo').maybeSingle();
 if(cur.error)throw cur.error;
 const value=cur.data?.value&&typeof cur.data.value==='object'?cur.data.value:null;
 if(value?.dmLearningPurpose==='school'||value?.dmLearningPurpose==='independent')return;
 const next={...(value||{}),dmLearningPurpose:route,guncelleme:Math.max(Number(value?.guncelleme)||0,Date.now())};
 const r=value?await db.from('extra_data').update({value:next,updated_at:at}).eq('student_id',id).eq('key_name','yo')
  :await db.from('extra_data').insert({student_id:id,key_name:'yo',value:next,updated_at:at});
 if(r.error)throw r.error;
}
