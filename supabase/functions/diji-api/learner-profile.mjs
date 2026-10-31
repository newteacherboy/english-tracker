/* Private learning preferences; never an authorization or age-verification claim. */
export function normalizeLearnerProfile(value, legacyClass=null, legacyPurpose='') {
 if(value===undefined||value===null)return {version:0,purpose:legacyPurpose==='school'?'school':legacyPurpose==='independent'?'independent':legacyClass?'school':'independent',ageBand:'',educationStage:legacyClass?Number(legacyClass)<=4?'primary':Number(legacyClass)<=8?'middle':'high':'',goal:'daily',startChoice:'new',knownLevel:'A1'};
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Öğrenme bilgilerini kontrol et.');
 const valid=(key,values,fallback)=>{const v=value[key]??fallback;if(!values.includes(v))throw Error('Öğrenme bilgilerini kontrol et: '+key);return v;};
 const purpose=valid('purpose',['school','independent'],'independent');
 return {version:1,purpose,ageBand:valid('ageBand',['under13','teen','adult'],''),educationStage:purpose==='school'?valid('educationStage',['primary','middle','high','university'],''):'',goal:valid('goal',['daily','travel','school','exam'],'daily'),startChoice:(c=>c==='some'?'new':c)(valid('startChoice',['new','some','known','test'],'new')),knownLevel:valid('knownLevel',['A1','A2','B1','B2'],'A1'),...(value.placementPolicy==='verified-upper'?{placementPolicy:'verified-upper'}:{})};
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
