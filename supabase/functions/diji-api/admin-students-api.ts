export function adminStudentsAPI(db: any, json: any, hashPassword: any) {
  const allowed = (a: any) => !!a && a.role === 'teacher' && a.yonetici === true && a.ogretmenKullanici === 'teacher';
  const fields = 'id,username,full_name,school,class_no,branch,status,updated_at';
  const escapeLike = (v: string) => v.replace(/[\\%_]/g, '\\$&');
  return { allowed, async handle(op: string, body: any, q: URLSearchParams, a: any, method: string) {
    if (op === 'ogretmenOgrenciOlustur') {
      if (!a || a.role !== 'teacher' || !a.teacher_id) return json({ok:false,mesaj:'Öğretmen oturumu gerekli.'},403);
      if (method !== 'POST') return json({ok:false,mesaj:'POST gerekli.'},405);
      if (!Array.isArray(body.ogrenciler) || body.ogrenciler.length<1 || body.ogrenciler.length>50) return json({ok:false,mesaj:'Bir istekte 1–50 öğrenci eklenebilir.'},400);
      const rows:any[] = [], seen = new Set<string>();
      for (const [i,x] of body.ogrenciler.entries()) {
        const username=String(x.kullanici||'').trim(), password=String(x.sifre||''), classNo=Number(x.sinif);
        /* [v5.0] Herkese görünen kullanıcı adı takma ad olmalı: boşluksuz, 3-20 karakter */
        if (!/^[A-Za-z0-9çğıöşüÇĞİÖŞÜ._-]{3,20}$/.test(username)) return json({ok:false,mesaj:`${i+1}. satır: kullanıcı adı takma ad olmalı (3-20 karakter, boşluksuz; harf, rakam, nokta, alt çizgi, tire). Öğrencinin gerçek adını yazma.`},400);
        const branch=String(x.sube||'').trim().toLocaleUpperCase('tr'), school=String(x.okul||'').trim();
        if (username.length<3 || username.length>50 || /[<>\x00-\x1f]/.test(username) || seen.has(username.toLowerCase()) || password.length<6 || password.length>64 || !Number.isInteger(classNo) || classNo<1 || classNo>8 || !branch || branch.length>10 || /[<>\x00-\x1f]/.test(branch) || (school && school.length<3) || school.length>120 || /[<>\x00-\x1f]/.test(school)) return json({ok:false,mesaj:`${i+1}. satır geçersiz: kullanıcı 3–50, şifre 6–64 karakter; sınıf 1–8 ve şube gerekli. Aynı kullanıcı iki kez eklenemez.`},400);
        seen.add(username.toLowerCase()); rows.push({username,password_hash:await hashPassword(password),class_no:classNo,branch,school:school||null});
      }
      const r=await db.rpc('teacher_students_create',{p_actor:a.teacher_id,p_rows:rows});
      if (r.error) return json({ok:false,mesaj:r.error.code==='23505'?'Bir kullanıcı adı zaten kayıtlı. Bu gruptaki öğrenciler eklenmedi; adları kontrol et.':'Öğrenciler eklenemedi.'},r.error.code==='23505'?409:500);
      return json({ok:true,ogrenciler:r.data,mesaj:'Öğrenciler doğrudan sana bağlı olarak kaydedildi.'});
    }
    if (!['yoneticiOgrenciler','yoneticiOgrenciKaydet'].includes(op)) return null;
    if (!allowed(a)) return json({ok:false,mesaj:'Bu bölüm yalnızca uygulama yöneticisine açık.'},403);
    if (op === 'yoneticiOgrenciler') {
      const search = String(body.arama ?? q.get('arama') ?? '').trim().slice(0,80);
      const page = Math.max(0, Math.min(10000, Math.floor(Number(body.sayfa ?? q.get('sayfa')) || 0)));
      let query = db.from('students').select(fields,{count:'exact'}).eq('role','student');
      if (search) query = query.ilike('username','%' + escapeLike(search) + '%');
      const r = await query.order('username').order('id').range(page*50,page*50+49);
      if (r.error) return json({ok:false,mesaj:'Öğrenci listesi alınamadı.'},503);
      return json({ok:true,liste:r.data || [],toplam:r.count || 0,sayfa:page,boyut:50});
    }
    if (method !== 'POST') return json({ok:false,mesaj:'POST gerekli.'},405);
    const id = String(body.id || ''), username = String(body.kullanici || '').trim().replace(/\s+/g,' ');
    const school = String(body.okul || '').trim().replace(/\s+/g,' ');
    const branch = String(body.sube || '').trim().toLocaleUpperCase('tr');
    const classNo = Number(body.sinif), password = String(body.yeniSifre || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ok:false,mesaj:'Öğrenci seçimi geçersiz.'},400);
    if (username.length<3 || username.length>50 || /[<>\x00-\x1f]/.test(username) || username.toLowerCase()==='teacher') return json({ok:false,mesaj:'Kullanıcı adı 3–50 karakter olmalı.'},400);
    if ((school && school.length<3) || school.length>120 || /[<>\x00-\x1f]/.test(school)) return json({ok:false,mesaj:'Okul adı 3–120 karakter olmalı; boş bırakılabilir.'},400);
    if (!Number.isInteger(classNo) || classNo<1 || classNo>8 || !branch || branch.length>10 || /[<>\x00-\x1f]/.test(branch)) return json({ok:false,mesaj:'Sınıf 1–8, şube 1–10 karakter olmalı.'},400);
    if (password && (password.length<6 || password.length>64)) return json({ok:false,mesaj:'Yeni şifre 6–64 karakter olmalı.'},400);
    if (!body.sonGuncelleme || Number.isNaN(Date.parse(body.sonGuncelleme))) return json({ok:false,mesaj:'Öğrenci bilgilerini yeniden yükle.'},409);
    const patch: any = {username,school:school || null,class_no:classNo,branch};
    if (password) patch.password_hash = await hashPassword(password);
    const r = await db.rpc('admin_student_update',{p_actor:a.teacher_id,p_student:id,p_expected:body.sonGuncelleme,p_changes:patch});
    if (r.error) {
      const code = r.error.code;
      const mesaj = code==='23505' ? 'Bu kullanıcı adı başka bir hesapta kullanılıyor.' : code==='40001' ? 'Bu öğrenci başka bir işlemle güncellendi. Listeyi yenileyip tekrar dene.' : code==='P0002' ? 'Öğrenci bulunamadı.' : 'Değişiklik kaydedilemedi.';
      return json({ok:false,mesaj},code==='23505'||code==='40001'?409:code==='P0002'?404:500);
    }
    return json({ok:true,ogrenci:r.data,mesaj:password?'Bilgiler ve yeni şifre kaydedildi. Öğrencinin tekrar giriş yapması gerekiyor.':'Öğrenci bilgileri kaydedildi.'});
  }};
}
