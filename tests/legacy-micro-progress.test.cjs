const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('a legacy completed unit never marks every new micro-section completed',()=>{
 const html=fs.readFileSync('ingilizce/index.html','utf8'),a=html.indexOf('  function aktar() {'),b=html.indexOf('  function aktarGerekirse()',a);
 const sections=[1,2,3,4].map(parca=>({sinif:3,unite:1,parca,no:230100+parca}));const c={DURAK:[sections],duraklariKur(){},hamTamam:new Set([1301,230102]),tamam:new Set(),aktarimYildiz:{},havuzTum:()=>[],yoVar:()=>false};vm.createContext(c);vm.runInContext(html.slice(a,b)+';aktar();',c);
 assert(c.tamam.has(230101));assert(c.tamam.has(230102),'explicit new completion survives');assert(!c.tamam.has(230103));assert(!c.tamam.has(230104));
});
test('the server and UI both restrict legacy unit adoption to the first micro-section',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261012234958_legacy_micro_progress_correction.sql','utf8');assert(sql.includes('where ((x.value)::text::int % 100)=1 and preserved_done'));const ui=fs.readFileSync('ingilizce/index.html','utf8');assert(ui.includes('d.parca===1&&hamTamam.has(1000+d.sinif*100+d.unite)'));assert(ui.includes('allSteps:all'));
});
