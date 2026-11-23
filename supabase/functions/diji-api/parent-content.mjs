import ids from './parent-voice-ids.json' with {type:'json'};
const known=new Set(ids);
export function normalizeStop(row){
 let n=Number(row.level_no);
 if(n>=1000&&n<2000)n=200000+Math.floor((n-1000)/100)*10000+((n-1000)%100)*100+51;
 const grade=Math.floor((n-200000)/10000),unit=Math.floor((n%10000)/100);
 return {...row,level_no:n,class_no:grade>=1&&grade<=8?grade:row.class_no,unit_no:grade>=1&&grade<=8&&unit>=1&&unit<=20?unit:row.unit_no};
}
export function voiceURL(text){
 const value=String(text||'').normalize('NFC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
 let hash=14695981039346656037n;
 for(const c of 'en|'+value)hash=BigInt.asUintN(64,(hash^BigInt(c.codePointAt(0)))*1099511628211n);
 const id='en-'+hash.toString(16).padStart(16,'0');
 return known.has(id)?'https://nxfqlutulxqzqgwewssd.supabase.co/storage/v1/object/public/ses/v1/English/'+id+'.mp3':null;
}
// Keep the four-word school route and its mixed stops identical to app-js/i24-oku.js.
export function schoolWords(bank,stops,grade){
 const units=[...new Set(bank.map(w=>Number(w.unit_no)))].filter(n=>n>0).sort((a,b)=>a-b);
 const banks=units.map(unit=>[...new Map(bank.filter(w=>Number(w.unit_no)===unit&&w.english?.trim()&&w.turkish?.trim()).map(w=>[w.english.trim().toLocaleLowerCase('en'),w])).values()].sort((a,b)=>a.english.localeCompare(b.english,'en')));
 const route=[];
 for(let ui=0;ui<units.length;ui++){
  const words=banks[ui],groups=Math.max(1,Math.ceil(words.length/4)),unit=units[ui];
  for(let part=0;part<groups;part++)route.push({unit,part:part+1,groups,no:200000+grade*10000+unit*100+51+part,legacy:200000+grade*10000+unit*100+Math.floor(part/3)+1,words:words.slice(part*4,part*4+4)});
 }
 if([1,3,7,8].includes(grade)){
  const base=[...route];
  base.forEach((stop,i)=>{const chosen=[],seen=new Set();for(let round=0;chosen.length<4&&round<100;round++)for(let j=0;j<banks.length&&chosen.length<4;j++){const b=banks[(i+j)%banks.length],w=b[(Math.floor(i/banks.length)+round)%b.length];if(w&&!seen.has(w.english.toLowerCase())){chosen.push(w);seen.add(w.english.toLowerCase());}}route.push({...stop,no:stop.no+stop.groups,legacy:null,mixed:true,words:chosen});});
 }
 const filtered=route.filter((stop,i)=>{if(stop.mixed||stop.words.length!==1||stop.part<=1)return true;const prev=route[i-1];if(!prev||prev.mixed||prev.unit!==stop.unit)return true;prev.words=prev.words.concat(stop.words);return false;});
 const done=new Set(stops.filter(s=>Number(s.class_no)===grade).map(s=>Number(s.level_no)));
 return filtered.filter(s=>done.has(s.no)||(s.legacy&&done.has(s.legacy))).flatMap(s=>s.words.map(w=>({en:w.english.trim(),tr:w.turkish.trim(),unit:'school:'+grade+':'+s.unit,grade})));
}

export function studyWordScope(words,keys){
 if(!Array.isArray(keys))return words;
 const normalize=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/[.!?…]+$/u,'').replace(/\s+/g,' ').trim();
 const allowed=new Set(keys.slice(0,2000).map(key=>String(key).split('|').map(normalize).join('|')));
 return words.filter(w=>allowed.has(normalize(w.en)+'|'+normalize(w.tr)));
}
export function practiceCount(settings){const n=Number(settings.count);return (Array.isArray(settings.wordKeys)?Number.isInteger(n)&&n>=1&&n<=15:[5,10,15].includes(n))?n:5;}
