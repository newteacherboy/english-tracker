// Papi habit layer: greeting, break suggestion and Sunday summary show once, wait for activities and fit small phones.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const fits=(box,size)=>box&&box.x>=0&&box.y>=0&&box.x+box.width<=size.width+0.5&&box.y+box.height<=size.height+0.5;
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 for(const size of [{width:375,height:667},{width:1024,height:768}]){
  // Freeze time on a Sunday (Istanbul) so the weekly summary is eligible.
  const page=await browser.newPage({viewport:size});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-25T09:00:00Z')});
  await page.route('**/*',route=>{const u=new URL(route.request().url());const file=path.join(process.cwd(),'ingilizce',u.pathname.slice(1));if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><body></body>'});});
  await page.goto('https://papi.test/');
  await page.evaluate(()=>{window.aktifOgrenciAdi='Ece';window.__busy=false;window.dmFirstDiscovery={activityOpen:()=>window.__busy};window.__reviewed=0;window.dmWrongWords={review:()=>{window.__reviewed++;}};localStorage.setItem('dm_habit_seen:ece','2026-10-20');});
  await page.addScriptTag({url:'/route-missions.js'});await page.addScriptTag({url:'/papi-habit.js'});

  // Greeting: after a 5-day gap it welcomes back warmly, mentions due words and offers review.
  await page.evaluate(()=>{window.__busy=true;window.dmMemberBadgeStatus={owner:'Ece',loginStreak:1,maxLoginStreak:6};document.dispatchEvent(new Event('dm:member-status'));document.dispatchEvent(new CustomEvent('dm:companion-summary',{detail:{owner:'Ece',review:{due:4,total:9}}}));});
  await page.clock.runFor(5000);assert.equal(await page.locator('#dmHabitGreet').count(),0,'greeting waits while an activity is open');
  await page.evaluate(()=>{window.__busy=false;});await page.clock.runFor(3500);
  await page.locator('#dmHabitGreet').waitFor();
  const greet=await page.locator('#dmHabitGreet').innerText();
  assert.match(greet,/Seni özledim, Ece/);assert.match(greet,/4 kelimen var/);assert.doesNotMatch(greet,/kaybett|üzgün|son şans/i,'no guilt language');
  assert(fits(await page.locator('#dmHabitGreet').boundingBox(),size),'greeting fits');
  await page.locator('#dmHabitGreet button',{hasText:'Kelimeleri tekrar et'}).click();
  assert.equal(await page.evaluate(()=>window.__reviewed),1);assert.equal(await page.locator('#dmHabitGreet').count(),0);
  await page.evaluate(()=>{document.dispatchEvent(new Event('dm:member-status'));});await page.clock.runFor(5000);
  assert.equal(await page.locator('#dmHabitGreet').count(),0,'greeting once per day');

  // Sunday summary appears once the week has activity, and only once per week.
  await page.evaluate(()=>{window.dmRouteMissions.set({daily:{route:0,game:0,review:0},weekly:{route:6,game:11,days:4}},'Ece');document.dispatchEvent(new CustomEvent('dm:companion-summary',{detail:{owner:'Ece',review:{due:0}}}));});
  await page.clock.runFor(7000);await page.locator('#dmWeekDone').waitFor();
  const week=await page.locator('#dmWeekDone').innerText();assert.match(week,/6\s*bölüm/);assert.match(week,/11\s*oyun/);assert.match(week,/4\s*gün/);
  assert(fits(await page.locator('#dmWeekDone .wd-card').boundingBox(),size),'week card fits');
  await page.screenshot({path:'/tmp/papi-habit-week-'+size.width+'.png'});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#dmWeekDone').count(),0);
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('dm:companion-summary',{detail:{owner:'Ece',review:{due:0}}})));await page.clock.runFor(7000);
  assert.equal(await page.locator('#dmWeekDone').count(),0,'week summary once per week');

  // Break suggestion: only real interaction counts; shown once after 30 active minutes.
  await page.evaluate(()=>{localStorage.setItem('dm_habit_active:2026-10-25:ece',String(30*60-15));window.dmLastActiveAt=Date.now()-10*60*1000;});
  await page.evaluate(()=>window.dmPapiHabit.countActive());assert.equal(await page.locator('#dmHabitBreak').count(),0,'idle time is not counted');
  await page.evaluate(()=>{window.dmLastActiveAt=Date.now();window.dmPapiHabit.countActive();});
  await page.locator('#dmHabitBreak').waitFor();assert.match(await page.locator('#dmHabitBreak').innerText(),/30 dakika/);
  assert(fits(await page.locator('#dmHabitBreak').boundingBox(),size),'break card fits');
  await page.screenshot({path:'/tmp/papi-habit-break-'+size.width+'.png'});
  await page.locator('#dmHabitBreak button',{hasText:'Biraz daha devam'}).click();assert.equal(await page.locator('#dmHabitBreak').count(),0);
  await page.evaluate(()=>{window.dmLastActiveAt=Date.now();window.dmPapiHabit.countActive();});assert.equal(await page.locator('#dmHabitBreak').count(),0,'break once per day');

  // Teachers and guests never see these prompts.
  await page.evaluate(()=>{localStorage.clear();window.aktifOgrenciAdi='teacher';window.dmMemberBadgeStatus={owner:'teacher',loginStreak:3};document.dispatchEvent(new Event('dm:member-status'));});
  await page.clock.runFor(5000);assert.equal(await page.locator('#dmHabitGreet').count(),0,'no teacher greeting');
  assert.deepEqual(errors,[]);await page.close();
 }
 await browser.close();console.log('PASS papi-habit-ui');
})().catch(e=>{console.error(e);console.log('::error title=papi-habit-ui::'+String(e&&e.stack||e).slice(0,900).replace(/%/g,'%25').replace(/\n/g,'%0A'));process.exit(1);});
