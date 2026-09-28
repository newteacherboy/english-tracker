/* DIJI-MEDU — NOTIFICATIONS SUPABASE CUTOVER PATCH
   Add this block to the Apps Script project, then replace the existing
   bildirimIsle_ implementation with the wrapper below.
   Google Sheets is kept as archive/mirror; nothing is deleted.
*/

var DIJI_NOTIF_SUPABASE_ENDPOINT_ =
  'https://eszogtdvsxtudcpzsifm.supabase.co/functions/v1/diji-notifications';

function dijiNotifSupabase_(action, p, token) {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('DIJI_REALTIME_SHADOW_SECRET');
  if (!secret) return { ok:false, error:'supabase_notification_secret_missing' };

  var body = Object.assign({}, p || {}, {
    action: action,
    studentId: String((p && (p.ogrenci || p.studentId)) || '').trim().toLowerCase()
  });

  var r = UrlFetchApp.fetch(DIJI_NOTIF_SUPABASE_ENDPOINT_, {
    method:'post',
    contentType:'application/json',
    headers:{
      'x-diji-shadow-secret': secret,
      'Authorization':'Bearer ' + String(token || '')
    },
    payload:JSON.stringify(body),
    muteHttpExceptions:true
  });

  var code = r.getResponseCode();
  var txt = r.getContentText();
  try {
    var d = JSON.parse(txt);
    if (code >= 200 && code < 300) return d;
    return {ok:false,error:d.error || ('http_'+code)};
  } catch(e) {
    return {ok:false,error:'invalid_supabase_response',httpCode:code};
  }
}

/* Replace the existing bildirimIsle_ with this version. */
function bildirimIsle_(p) {
  p = p || {};
  var islem = String(p.islem || '');
  var token = String(p.t || '');

  if (islem === 'bildirimGonder') {
    var alici = String(p.alici || '').trim();
    var gonderen = String(p.gonderen || '').trim();
    var tur = ['tebrik','begeni','takip'].indexOf(String(p.tur || '').trim()) > -1
      ? String(p.tur || '').trim() : 'begeni';
    var metin = String(p.metin || '').slice(0,120);

    if (!alici || !gonderen || alici.toLowerCase() === gonderen.toLowerCase())
      return bildirimJson_({ok:false});

    var sb = dijiNotifSupabase_('create', {
      alici:alici, senderId:gonderen, type:tur, message:metin
    }, token);

    if (!sb.ok) {
      /* Safe fallback: preserve existing Sheet behavior. */
      var sh = bildirimSayfa_();
      sh.appendRow([new Date(),alici,gonderen,tur,metin,'',String(p.k || '').slice(0,40)]);
      return bildirimJson_({ok:true,fallback:true});
    }

    /* Sheet remains a non-destructive archive/mirror. */
    try {
      sh = bildirimSayfa_();
      sh.appendRow([new Date(),alici,gonderen,tur,metin,'',String(p.k || '').slice(0,40)]);
    } catch(e) {}

    return bildirimJson_(sb);
  }

  if (islem === 'bildirimlerim') {
    var ad = String(p.ogrenci || '').trim().toLowerCase();
    if (!ad) return bildirimJson_({ok:true,liste:[]});

    var sb2 = dijiNotifSupabase_('list', {ogrenci:ad,tumu:String(p.tumu || '')}, token);
    if (sb2.ok) return bildirimJson_(sb2);

    /* Temporary fallback to the unchanged Sheet implementation is NOT
       duplicated here; if Supabase is unavailable, return a safe error
       rather than silently changing read semantics. */
    return bildirimJson_({ok:false,hata:'supabase_unavailable'});
  }

  if (islem === 'bildirimOkundu') {
    var kim = String(p.ogrenci || '').trim().toLowerCase();
    var satirlar = String(p.satirlar || '').split(',').map(function(x){return x.trim();}).filter(Boolean);

    var sb3 = dijiNotifSupabase_('read', {
      ogrenci:kim,
      ids:satirlar.map(function(x){return x.replace(/^row-/,'');})
    }, token);

    if (sb3.ok) return bildirimJson_(sb3);

    return bildirimJson_({ok:false,hata:'supabase_unavailable'});
  }

  return bildirimJson_({ok:false});
}

/* One-time migration helper. It ONLY INSERTS/UPserts into Supabase.
   It NEVER deletes or modifies the Sheet. */
function dijiBildirimleriSupabaseMigrasyon_() {
  var sh = bildirimSayfa_();
  var last = sh.getLastRow();
  if (last < 2) return {ok:true,migrated:0};

  var rows = sh.getRange(2,1,last-1,7).getValues();
  var token = '';
  var migrated = 0;

  rows.forEach(function(r,i){
    var tarih = r[0], alici = String(r[1]||'').trim(), gonderen = String(r[2]||'').trim();
    var tur = String(r[3]||'').trim(), metin = String(r[4]||'').slice(0,120);
    if (!alici || !gonderen || !tarih) return;

    var sb = dijiNotifSupabase_('create', {
      ogrenci:alici,
      senderId:gonderen,
      type:['tebrik','begeni','takip'].indexOf(tur)>-1?tur:'begeni',
      message:metin,
      sourceRow:i+2
    }, token);

    if (sb.ok) migrated++;
  });

  return {ok:true,migrated:migrated,total:rows.length};
}
