'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const port=4190,base=`http://localhost:${port}`,server=spawn('python',['-u','tools/start_site.py','--port',String(port),'--no-open'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let browser;
const wait=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
(async()=>{
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server timeout')),15000);server.stdout.on('data',x=>{if(x.toString().includes('English course:')){clearTimeout(t);resolve();}});server.once('error',reject);});
 browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),p=await context.newPage();
 await p.goto(`${base}/?sample=1&day=1#today`);await p.waitForFunction(()=>!!window.EnglishApp);await p.locator('.sample-class').waitFor();
 const report=await p.evaluate(()=>{const units=ENGLISH_COURSE.units;const ids=new Set(),questions=new Set();let days=0,chunks=0,minutes=0;
  for(const u of units){assertUnit(u);for(const d of u.sample.days){days++;minutes+=d.minutes.reduce((a,b)=>a+b,0);if(ids.has(d.id))throw Error('duplicate day '+d.id);ids.add(d.id);if(d.input.questions.length<2)throw Error('too few questions '+d.id);for(const q of d.input.questions){if(questions.has(q.id))throw Error('duplicate question '+q.id);questions.add(q.id);} }chunks+=u.sample.chunks.length;}
  return {weeks:units.length,days,chunks,questions:questions.size,minutes,fullWeeks:units.filter(u=>u.sample.deliveryStatus==='full-v1').length};
  function assertUnit(u){if(u.sample.days.length!==7)throw Error('week '+u.week+' does not have 7 days');if(!u.sample.days.every(d=>d.minutes.reduce((a,b)=>a+b,0)===60))throw Error('week '+u.week+' budget');if(u.sample.chunks.length<25)throw Error('week '+u.week+' chunks');}
 });
 assert.deepEqual(report,{weeks:78,days:546,chunks:1950,questions:1535,minutes:32760,fullWeeks:76});
 for(const week of [1,2,12,13,28,29,44,45,60,61,72,73,78]){
  await p.goto(`${base}/?sample=${week}&day=1#today`);await p.locator('.sample-class').waitFor();assert.equal(await p.locator('#sample-week').inputValue(),String(week));await p.locator('.step-strip [data-step="1"]').click();await wait(p);assert.ok(await p.locator('form[data-form="quiz"]').count());assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 console.log('PASS full syllabus: '+JSON.stringify(report)+'; representative weeks and mobile input flow rendered');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.kill();});
