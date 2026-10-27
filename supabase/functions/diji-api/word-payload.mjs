// Import provenance stays in the database and in the legacy API format.
// Learning fields, images used by the app and unknown future fields are retained.
const PROVENANCE=new Set(['source_url','source_type','translation_source','import_batch',
 'source_file','source_english','source_turkish','source_images','source','correction']);
export function wordPayload(rows,compact=false){
 return (rows||[]).map(x=>{
  const extra=x.extra&&typeof x.extra==='object'?x.extra:{};
  return {sinif:x.class_no,unite:x.unit_no,ingilizce:x.english,turkce:x.turkish,
   ...Object.fromEntries(Object.entries(extra).filter(([key])=>!compact||!PROVENANCE.has(key)))};
 });
}
