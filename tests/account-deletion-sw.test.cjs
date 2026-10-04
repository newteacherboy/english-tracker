const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const currentVersion = fs.readFileSync(require('node:path').join(__dirname, '../ingilizce/sw.js'), 'utf8').match(/const SURUM = '([^']+)'/)[1];
const source = fs.readFileSync(require('node:path').join(__dirname, '../ingilizce/sw.js'), 'utf8');
function fixture() {
  const listeners = {}, removed = [];
  vm.runInNewContext(source, {
    URL,
    self: { addEventListener: (name, fn) => { listeners[name] = fn; }, clients: { claim: async () => {} } },
    caches: { keys: async () => ['sayfa-diji-v11', 'kaynak-diji-v11', 'sayfa-diji-v12', 'sayfa-diji-v13', 'kaynak-diji-v13', 'sayfa-'+currentVersion, 'kaynak-'+currentVersion, 'kocluk-cache'], delete: async key => { removed.push(key); } }
  });
  return { listeners, removed };
}
test('account deletion navigation never replaces the main offline page', () => {
  const { listeners } = fixture(); let intercepted = false;
  listeners.fetch({ request: { method: 'GET', url: 'https://panel.ogretmencocuk.com/ingilizce/hesap-sil.html', mode: 'navigate' }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false);
});
test('privacy navigation never replaces the main offline page', () => {
  const { listeners } = fixture(); let intercepted = false;
  listeners.fetch({ request: { method: 'GET', url: 'https://panel.ogretmencocuk.com/ingilizce/gizlilik.html', mode: 'navigate' }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false);
});
test('cache upgrade removes only old English caches and preserves Coaching caches', async () => {
  const { listeners, removed } = fixture(); let work;
  listeners.activate({ waitUntil: value => { work = value; } }); await work;
  assert.deepEqual(removed, ['sayfa-diji-v11', 'kaynak-diji-v11', 'sayfa-diji-v12', 'sayfa-diji-v13', 'kaynak-diji-v13']);
});
test('guest and email confirmation navigation preserve the main offline page',()=>{
 for(const name of ['misafir','hesap-dogrula']){const {listeners}=fixture();let intercepted=false;listeners.fetch({request:{method:'GET',url:'https://panel.ogretmencocuk.com/ingilizce/'+name+'.html',mode:'navigate'},respondWith:()=>{intercepted=true}});assert.equal(intercepted,false);}
});

test('guest query route never replaces the offline member home page',()=>{const {listeners}=fixture();let intercepted=false;listeners.fetch({request:{method:'GET',url:'https://panel.ogretmencocuk.com/ingilizce/?misafir=1',mode:'navigate'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);});
