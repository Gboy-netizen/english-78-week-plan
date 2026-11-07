'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),{spawn}=require('node:child_process');
const base='http://localhost:4189',server=spawn('python',['-u','tools/start_site.py','--port','4189','--no-open'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let browser,page;
const frame=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function ready(){await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Server timeout')),15000);server.stdout.on('data',x=>{if(x.toString().includes('English course:')){clearTimeout(t);resolve();}});server.once('error',reject);});}
async function step(n){await page.locator(`.step-strip [data-step="${n}"]`).click();await frame(page);}
async function quiz(){const m=await page.locator('form[data-form="quiz"]').getAttribute('data-material');const qs=await page.evaluate(id=>ENGLISH_COURSE.units.flatMap(u=>[u.reading,u.transfer,...u.listening,...(u.sample?.days.map(d=>d.input)||[])]).find(m=>m.id===id).questions,m);for(const q of qs)await page.locator(`input[name="${q.id}"][value="${q.correct}"]`).check();await page.locator('form[data-form="quiz"] [type="submit"]').click();await page.locator('.question .result').first().waitFor();}
(async()=>{
 await ready();browser=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['microphone'],reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route('https://elllo.org/**',r=>r.abort()); // deterministic failure path, not a fake successful link check
 page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('_shots/sample-course',{recursive:true});
 await page.goto(base+'/?sample=1&day=1#today');await page.waitForFunction(()=>!!EnglishApp);await page.locator('.sample-class').waitFor();
 assert.equal(await page.evaluate(()=>EnglishApp.state().currentEpochId),null,'preview must not start/reset a learning cycle');
 for(let w=1;w<=2;w++)for(let d=1;d<=7;d++){
  await page.goto(base+`/?sample=${w}&day=${d}#today`);await page.locator('.sample-class').waitFor();
  assert.equal(await page.locator('.step-strip button').count(),5);
  const budgets=await page.evaluate(([w,d])=>ENGLISH_COURSE.units[w-1].sample.days[d-1].minutes,[w,d]);assert.equal(budgets.reduce((a,b)=>a+b),60);
  await step(1);assert.equal(await page.locator('.question .result,.sample-teaching').count(),0,'no answers or teaching examples before first answer');
  assert.equal(await page.locator('[data-action="hint"]').count(),d===7?0:1);
  assert.equal(await page.locator('form[data-form="quiz"]').getAttribute('data-material'),`sample-v1-w0${w}-d${d}-input`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await step(2);assert.equal(await page.locator('.sample-model').count(),0,'model is gated on all fourteen tasks');
  await page.locator('form[data-form="output"]').waitFor();
 }
 // External failure offers a local human alternative, saved under its own ID.
 await page.goto(base+'/?sample=1&day=1#today');await page.locator('.sample-class').waitFor();await step(1);
 await page.locator('[data-material-audio]').evaluate(a=>a.load());await page.locator('.audio-error:not([hidden])').waitFor();
 await page.locator('[data-action="sample-fallback"]').click();await page.locator('form[data-material="human-001"]').waitFor().catch(()=>{});
 const localId=await page.locator('form[data-form="quiz"]').getAttribute('data-material');assert.ok(!localId.startsWith('sample-'));
 assert.ok(await page.locator('[data-material-audio]').evaluate(async a=>{if(a.readyState<1)await new Promise((r,j)=>{a.onloadedmetadata=r;a.onerror=j;});return a.duration>0;}));
 await quiz();assert.equal(await page.evaluate(()=>EnglishApp.state().attempts.at(-1).materialId),localId);
 // Reading first answers, full evidence, immutable first output and model use.
 await page.goto(base+'/?sample=1&day=4#today');await page.locator('.sample-class').waitFor();await step(1);await quiz();await page.locator('.sample-teaching').waitFor();
 await step(2);const original='I work in a cafe. I want to speak clearly. Could we practise after class?';
 await page.locator('form[data-form="output"] textarea').fill(original);await page.locator('form[data-form="output"] [type="submit"]').click();await page.waitForFunction(()=>EnglishApp.state().attempts.some(a=>a.kind==='output'));
 const first=await page.evaluate(()=>EnglishApp.state().attempts.find(a=>a.kind==='output'));assert.equal(first.assistance,'none');assert.equal(first.materialId,'sample-v1-w01-d4-output');
 await page.locator('form[data-form="output"] textarea').fill('A draft must survive opening a model.');await page.locator('[data-action="sample-example"]').click();await page.locator('.sample-model').waitFor();assert.equal(await page.locator('form[data-form="output"] textarea').inputValue(),'A draft must survive opening a model.');
 await page.reload();await page.locator('.sample-class').waitFor();await step(2);assert.equal(await page.locator('.sample-model').count(),1,'model exposure persists through reload');
 await page.locator('form[data-form="output"] textarea').fill('I work in a cafe. I would like to practise questions before class.');await page.locator('select[name="revision"]').selectOption(first.id);await page.locator('form[data-form="output"] [type="submit"]').click();await page.waitForFunction(()=>EnglishApp.state().attempts.filter(a=>a.kind==='output').length===2);
 const revision=await page.evaluate(()=>EnglishApp.state().attempts.filter(a=>a.kind==='output').at(-1));assert.equal(revision.revisionOf,first.id);assert.equal(revision.assistance,'minor');assert.equal(await page.evaluate(id=>EnglishApp.state().attempts.find(a=>a.id===id).output,first.id),original);
 await step(3);await page.locator('.sample-self-review summary').click();const review=page.locator('form[data-form="sample-review"]');
 await review.locator('[name="evidence"]').fill('I work in a cafe.');await review.locator('[name="problem"]').fill('职业信息清楚，但没有写具体时间。');await review.locator('[name="language"]').fill('短句能理解，下次加入原因。');await review.locator('[name="action1"]').fill('写出星期和钟点，不能只说下课后。');await review.locator('[name="action2"]').fill('用because补一句需要练习的原因。');await review.locator('[type="submit"]').click();await page.waitForFunction(()=>EnglishApp.state().feedback.length===1);
 assert.equal(await page.evaluate(()=>EnglishApp.state().feedback[0].retestDate===EnglishV3.addDays(EnglishV3.today(),3)),true);
 await page.locator('[data-nav="review"]').click();await page.locator('[data-action="retest"]').click();assert.ok((await page.locator('#modal-body').textContent()).includes('志愿者负责人'));
 await page.locator('form[data-form="retest"] textarea').fill('Hello, I am Min. I am free on Sunday at three. Where shall we meet?');await page.locator('form[data-form="retest"] [type="submit"]').click();await page.waitForFunction(()=>!!EnglishApp.state().feedback[0].retestAttemptId);assert.equal(await page.evaluate(()=>EnglishApp.state().feedback[0].retestDelayed),false,'same-day repeat is not a delayed test');
 // Recorded output, distinct new task, preserved in a complete bundle.
 await page.goto(base+'/?sample=2&day=3#today');await page.locator('.sample-class').waitFor();await step(2);await page.locator('[data-action="record"]').click();await page.waitForTimeout(1100);await page.locator('[data-action="stop-record"]').click();await page.waitForFunction(async()=> (await EnglishStorage.clips('sample-v1-w02-d3')).length===1);await page.locator('form[data-form="output"] [type="submit"]').click();await page.waitForFunction(()=>EnglishApp.state().attempts.some(a=>a.taskId==='sample-v1-w02-d3'&&a.kind==='output'));
 const pack=await page.evaluate(async()=>{const x=await EnglishStorage.unpack(await EnglishStorage.exportBundle());return {recorded:x.clips.length,feedback:x.state.feedback[0].transferPrompt,first:x.state.attempts.find(a=>a.kind==='output').output};});assert.equal(pack.recorded,1);assert.ok(pack.feedback);assert.equal(pack.first,original);
 // Source hints retain radio selection and persist after refresh.
 await page.goto(base+'/?sample=2&day=5#today');await page.locator('.sample-class').waitFor();await step(1);const radio=page.locator('input[type="radio"]').first();await radio.check();await page.locator('[data-action="sample-source"]').click();assert.equal(await radio.isChecked(),true);await page.reload();await page.locator('.sample-class').waitFor();await step(1);await quiz();assert.equal(await page.evaluate(()=>EnglishApp.state().attempts.at(-1).assistance),'minor');
 // New curriculum is selected for the foundation start; higher-level start stays adaptive.
 assert.equal(await page.evaluate(()=>{const s=EnglishV3.fresh();s.diagnostic.days={1:{complete:true},2:{complete:true},3:{complete:true}};const e=EnglishV3.beginEpoch(s);const basic=!!EnglishV3.schedule(s,ENGLISH_COURSE,e.start).sample;e.baseline.levels.listening='everyday';return basic&&!EnglishV3.schedule(s,ENGLISH_COURSE,e.start).sample;}),true);
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:844});await page.goto(base+'/?sample=2&day=2#today');await page.locator('.sample-class').waitFor();await step(1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`_shots/sample-course/class-${width}.png`,fullPage:true});}
 assert.deepEqual(errors,[]);console.log('PASS 14 sample days: budgets, answer/model gating, source hints, local fallback, immutable output, linked revision, self-feedback/retest, fake-mic audio and ZIP, adaptive routing, three widths.');
})().catch(async e=>{console.error(e);if(page){console.error(await page.locator('#toast').textContent());await page.screenshot({path:'_shots/sample-course/failure.png',fullPage:true}).catch(()=>{});}process.exitCode=1;}).finally(async()=>{await browser?.close();server.kill();});
