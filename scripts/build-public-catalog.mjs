// Export only already-public curriculum. Reuse unchanged files using a small version index.
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const root=new URL('../ingilizce/data/public-catalog/',import.meta.url),api='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
await fs.mkdir(root,{recursive:true});const hash=s=>createHash('sha256').update(s).digest('hex');
async function read(args){const u=new URL(api);for(const [k,v] of Object.entries(args))u.searchParams.set(k,v);const r=await fetch(u,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Public catalog HTTP '+r.status);const text=await r.text();return {data:JSON.parse(text),version:r.headers.get('x-diji-content-version')||hash(text),text};}
async function file(text){const sha=hash(text),name=sha+'.json';await fs.writeFile(new URL(name,root),text);return {file:name,sha};}
let previous=null;try{previous=JSON.parse(await fs.readFile(new URL('manifest.json',root),'utf8'));}catch{}
const index=(await read({islem:'publicCatalogIndex'})).data;if(!Array.isArray(index.lessons)||index.lessons.length>500)throw Error('Invalid public version index');
let words;if(previous?.words?.version===index.wordsVersion){const text=await fs.readFile(new URL(previous.words.file,root),'utf8');if(hash(text)!==previous.words.sha)throw Error('Existing words failed integrity');words={text,data:JSON.parse(text),version:index.wordsVersion};}else words=await read({islem:'kelimelerGetir',compact:'1'});
if(words.version!==index.wordsVersion)throw Error('Words changed during export; retry later');
if(!Array.isArray(words.data)||!words.data.length)throw Error('Invalid word export');
const topics={},oldLevels=new Map();let downloads=0;
async function oldTopic(t){const entry=previous?.topics?.[t.key],spec=entry?.file?entry:previous?.levels?.[entry?.level];if(entry?.version!==t.version||!spec)return null;if(!oldLevels.has(spec.file)){const text=await fs.readFile(new URL(spec.file,root),'utf8');if(hash(text)!==spec.sha)throw Error('Existing level failed integrity');oldLevels.set(spec.file,JSON.parse(text));}const data=entry.file?oldLevels.get(spec.file):oldLevels.get(spec.file)[t.key];return data&&hash(JSON.stringify(data))===t.version?data:null;}
for(let start=0;start<index.lessons.length;start+=4){await Promise.all(index.lessons.slice(start,start+4).map(async t=>{let data=await oldTopic(t);if(!data){const fetched=await read({islem:'dersKonuDetayGetir',seviye:t.level,kategori:t.category,konu:t.topic});data=fetched.data;if(fetched.version!==t.version)throw Error('Curriculum changed during export; retry later');downloads++;}topics[t.key]={version:t.version,...await file(JSON.stringify(data))};}));}
const manifest={format:2,words:{...(await file(words.text)),version:words.version,count:words.data.length},topics:Object.fromEntries(Object.entries(topics).sort(([a],[b])=>a.localeCompare(b)))};
const keep=new Set([manifest.words.file,...Object.values(topics).map(x=>x.file),previous?.words?.file,...Object.values(previous?.topics||{}).map(x=>x.file)].filter(Boolean));for(const name of await fs.readdir(root))if(/^[a-f0-9]{64}\.json$/.test(name)&&!keep.has(name))await fs.unlink(new URL(name,root));
await fs.writeFile(new URL('manifest.json',root),JSON.stringify(manifest));console.log(JSON.stringify({words:words.data.length,topics:index.lessons.length,lessonDownloads:downloads}));
