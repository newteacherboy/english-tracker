// Identity and reward amounts never come from the browser.
export function routeExplorationAPI(db,json,catalog,isDemo=()=>false){return {async handle(op,b,a,method){
 if(op!=='routeExploration')return null;
 const fail=(mesaj,status=400)=>json({ok:false,mesaj},status);
 if(method!=='POST')return fail('POST gerekli.',405);
 if(a?.role!=='student'||!a.student_id)return fail('Öğrenci oturumu gerekli.',401);
 if(!['school','learning'].includes(b.route)||!['status','claim'].includes(b.action)||!Number.isInteger(b.stop)||b.stop<=0)return fail('Geçerli parkur durağı gerekli.');
 if(b.action==='claim'&&(!Number.isInteger(b.pickup)||b.pickup<0||b.pickup>3))return fail('Geçerli bonus gerekli.');
 if(b.route==='learning'&&!catalog.some(c=>c.id===b.stop))return fail('Geçerli öğrenme bölümü gerekli.');
 if(isDemo(a))return json({ok:true,preview:true,claims:[]});
 const person=await db.from('students').select('status,role').eq('id',a.student_id).maybeSingle();
 if(person.error)return fail('Hesap doğrulanamadı.',503);
 if(!person.data||person.data.status!=='approved'||person.data.role!=='student')return fail('Aktif öğrenci hesabı gerekli.',403);
 const r=await db.rpc('dm_route_exploration',{actor:a.student_id,route_name:b.route,stop_no:b.stop,pickup_no:b.action==='claim'?b.pickup:null});
 if(r.error)return fail('Bonus doğrulanamadı veya henüz hazır değil.',409);
 return json(r.data);
}};}
