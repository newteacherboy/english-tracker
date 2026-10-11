/* Version-2 exercise presentation. Progress remains server-owned. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>window.DMStoryExercises.norm(s);
window.DMStoryV2UI={
 render({area,actions,task,onSubmit,onNote}){
  const E=window.DMStoryExercises;let picked='',selected=[],pairs=[],partial={},locked=false;
  const put=(html)=>{area.innerHTML=html;};
  const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;};
  const listen=button('🔊 Yeniden dinle',()=>E.speak(task.en,'en'));
  const listenTr=button('🇹🇷 Türkçesini dinle',()=>E.speak(task.tr,'tr'));
  const header=document.createElement('div');header.className='ds-audio';header.append(listen,listenTr);
  actions.innerHTML='';
  const submit=async answer=>{if(locked)return;locked=true;try{const result=await onSubmit(answer);if(result?.accepted||result?.correct){E.speak(task.en,'en');}else locked=false;}catch(e){locked=false;onNote(e.message||'Yeniden dene.');}};
  const check=button('Kontrol et',()=>{if(task.kind==='match')return submit(pairs);if(task.kind==='order')return submit(selected.map(i=>task.tokens[i]).join(' '));if(['choose','complete'].includes(task.kind))return submit(picked);return submit(area.querySelector('input')?.value||'');});
  if(task.kind==='match'){
   put('<p>İngilizce ve Türkçe karşılıklarını eşleştir.</p>');
   const english=document.createElement('div'),turkish=document.createElement('div');english.className=turkish.className='ds-options';
   const click=(lang,value,b)=>{partial[lang]=value;b.classList.add('selected');if(partial.en&&partial.tr){const valid=task.pairs.some(p=>norm(p.en)===norm(partial.en)&&norm(p.tr)===norm(partial.tr));if(valid){pairs.push({en:partial.en,tr:partial.tr});[...english.children].filter(x=>x.dataset.term===partial.en).forEach(x=>x.disabled=true);[...turkish.children].filter(x=>x.dataset.term===partial.tr).forEach(x=>x.disabled=true);E.speak(partial.en);onNote('✓ Doğru eşleştirdin.');}else onNote('Tekrar dene.');partial={};[...english.children,...turkish.children].forEach(x=>x.classList.remove('selected'));}};
   task.pairs.forEach(p=>{const b=button(p.en,()=>click('en',p.en,b));b.dataset.term=p.en;english.append(b)});
   [...task.pairs].reverse().forEach(p=>{const b=button(p.tr,()=>click('tr',p.tr,b));b.dataset.term=p.tr;turkish.append(b)});
   area.append(english,turkish);
  }else if(task.kind==='order'){
   put('<p>Papi’yi dinle, İngilizce cümleyi sırala.</p><div class="ds-sentence">Cümlen burada oluşacak…</div>');
   const tray=document.createElement('div');tray.className='ds-tokens';
   task.tokens.map((t,i)=>({t,i})).reverse().forEach(({t,i})=>{const b=button(t,()=>{selected.push(i);b.disabled=true;area.querySelector('.ds-sentence').textContent=selected.map(n=>task.tokens[n]).join(' ')});tray.append(b)});area.append(tray);
   actions.append(button('Temizle',()=>{selected=[];tray.querySelectorAll('button').forEach(b=>b.disabled=false);area.querySelector('.ds-sentence').textContent='Cümlen burada oluşacak…'}));
  }else if(['choose','complete'].includes(task.kind)){
   put('<p>'+esc(task.kind==='complete'?task.stem+' ___':task.tr)+'</p><div class="ds-options"></div>');
   [...new Set([...task.options,task.answer])].forEach(v=>{const b=button(v,()=>{picked=v;area.querySelectorAll('.ds-options button').forEach(x=>x.classList.toggle('selected',x===b))});area.querySelector('.ds-options').append(b)});
  }else{
   put('<p>'+esc(task.kind==='final'?task.tr:task.kind==='translate'?task.tr:task.en)+'</p><input aria-label="İngilizce cevabın" autocomplete="off" placeholder="İngilizce söyle veya yaz">');
   const mic=button('🎤 Mikrofona konuş',async()=>{mic.disabled=true;onNote('Papi seni dinliyor…');const result=await E.listen('en');mic.disabled=false;if(result.status==='heard'){area.querySelector('input').value=result.text;onNote('Duyduğum: '+result.text+' — Kontrol et.');}else onNote('Mikrofon kullanılamıyor; yazabilirsin. Deneme hakkın azalmaz.');});
   area.append(mic);
  }
  area.prepend(header);actions.append(check);
  if(['order','repeat'].includes(task.kind))E.speak(task.en);
  if(['choose','final','translate'].includes(task.kind))E.speak(task.tr,'tr');
 }
};
})();
