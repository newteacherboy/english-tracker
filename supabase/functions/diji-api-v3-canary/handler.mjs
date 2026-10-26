// The current application never calls this retired, pre-hardening API.
// Do not load its old service-role client or forward credentials elsewhere.
export function retiredHandler(){
 return new Response(JSON.stringify({ok:false,status:'error',mesaj:'Bu eski uç nokta kapatıldı. Güncel uygulamayı kullan.'}),{
  status:410,
  headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}
 });
}
