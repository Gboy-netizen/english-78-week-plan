const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');const engine=require('../src/engine');const course=require('../src/course');const learning=require('../src/learning');
const data=JSON.parse(fs.readFileSync('index.html','utf8').match(/<script id="planData" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const units=data.coursePack.units, day=(w,d=0)=>engine.dateAt(data.start,(w-1)*7+d);
assert.equal(units.length,78);assert.equal(new Set(units.flatMap(u=>[u.reading,u.reading2,u.listening,u.transfer].map(p=>p.text))).size,312);
for(let i=0;i<546;i++){const info=engine.dayInfo(engine.dateAt(data.start,i),data),u=engine.lessonFor(info,data).course;assert.equal(u.week,info.week);assert(course.render(u,info.day,{mode:'normal'}).includes('courseDraft'));}
for(const u of units){assert.equal(u.grammar.questions.length+u.grammar.exercises.length,12);for(const k of ['reading','reading2','listening'])assert(u[k].questions.length>=4);}
assert.equal(learning.overall({listening:6.5,reading:6.5,writing:6,speaking:6}),6.5);
assert.equal(learning.overall({listening:null,reading:6,writing:6,speaking:6}),null);
const legacy={days:{'2026-09-16':{draft:'do not lose this',course:{unit:'w01',draft:'old course'}}},cards:{hello:{misses:2}}};
assert.equal(learning.importJSON(learning.exportJSON(legacy)).days['2026-09-16'].draft,'do not lose this');
assert.throws(()=>learning.importJSON('{"application":"x"}'));
assert.throws(()=>learning.importJSON('{"application":"little-english","version":2,"progress":{"__proto__":{}}}'));
(async()=>{
fs.mkdirSync('_shots',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--allow-file-access-from-files','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('index.html')).href);
 await page.evaluate(s=>localStorage.setItem('little-english-progress-v1',JSON.stringify(s)),legacy);await page.reload();
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('little-english-progress-v1')));
 async function nav(view){await page.locator(`[data-view="${view}"]`).click();}
 async function open(w,d){await nav('today');await page.locator('#studyDate').fill(day(w,d));await page.locator('#studyDate').dispatchEvent('change');await page.locator('#startLearning').click();await page.locator('[data-step="2"]').click();}
 async function answer(u,d,wrong=false){const qs=course.questionsFor(u,d);for(const [i,q]of qs.entries())await page.locator(`#view-today input[name="${q.id}"][value="${wrong&&i===0?(q.correct+1)%3:q.correct}"]`).check();await page.locator('#view-today #courseQuiz button[type=submit]').click();}
 await open(1,0);assert.equal((await stored()).days[day(1)].draft,'do not lose this');
 await open(31,0);assert.equal(await page.locator('#practice .course-text').count(),0);await page.locator('[data-course-reveal]').click();await answer(units[30],0,true);let s=await stored();assert.equal(s.days[day(31)].course.first.assisted,true);assert.equal(s.days[day(31)].course.first.score,4);
 await page.locator('[data-course-retry]').click();await answer(units[30],0);s=await stored();assert.equal(s.days[day(31)].course.first.score,4);assert.equal(s.days[day(31)].course.latest.score,5);assert(Object.keys(s.learning.reviews).length);
 await open(40,2);assert.equal(await page.locator('[data-grammar-open]').count(),6);await page.locator('[data-grammar-open="4"]').fill('Please confirm whether the room is available.');await page.reload();assert.equal(await page.locator('[data-grammar-open="4"]').inputValue(),'Please confirm whether the room is available.');
 await open(41,4);await page.locator('#courseDraft').fill('I am writing about invoice 418. Please review the additional charges.');await page.locator('[data-week-field="feedback"]').fill('Explain what work you authorized.');
 await open(41,5);assert((await page.locator('.feedback-workshop').textContent()).includes('invoice 418'));assert.equal(await page.locator('[data-week-field="feedback"]').inputValue(),'Explain what work you authorized.');await page.locator('[data-week-field="revision"]').fill('I approved only the wheel replacement.');
 await nav('reading');assert.equal(await page.locator('#readingCatalog [data-part]').count(),156);await page.locator('#readingFilters [data-stage]').selectOption('P8');await page.locator('#readingFilters [data-stage]').dispatchEvent('input');assert.equal(await page.locator('#readingCatalog [data-part]').count(),16);
 await page.locator('#readingCatalog [data-part]').first().click();assert((await page.locator('#readingDetail').textContent()).includes('W71'));
 await nav('grammar');assert.equal(await page.locator('#grammarCatalog [data-part]').count(),78);await page.locator('#grammarCatalog [data-part]').first().click();assert.equal(await page.locator('#grammarDetail [data-grammar-open]').count(),6);
 for(const [w,d]of [[10,0],[20,1],[20,2]]){await open(w,d);await answer(units[w-1],d);}
 await nav('diagnostic');await page.locator('[data-diag-done]').click();assert((await page.locator('[data-diag-status]').textContent()).includes('请先'));await page.locator('[data-diag="draft"]').fill('I would like to change my working hours.');await page.locator('[data-diag="feedback"]').fill('Need more spontaneous speaking practice.');await page.locator('[data-diag="focus"]').selectOption('listening');await page.locator('[data-diag-done]').click();assert((await stored()).learning.diagnostic.completed);
 // Recording uses Chrome synthetic microphone, never the user's microphone.
 await page.locator('[data-record]').click();await page.locator('[data-stop-record]').waitFor({state:'visible'});await page.waitForTimeout(500);await page.locator('[data-stop-record]').click();await page.locator('[data-clips] audio').waitFor({timeout:10000});assert.equal(await page.locator('[data-clips] audio').count(),1);await page.reload();assert.equal(await page.locator('[data-clips] audio').count(),1);
 // A re-record must preserve the original playable clip and chronological order.
 const originalClip=await page.locator('[data-clips] audio').getAttribute('src');
 await page.locator('[data-record]').click();await page.waitForTimeout(500);
 assert(await page.evaluate(async u=>(await fetch(u)).ok,originalClip));
 await page.locator('[data-stop-record]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-clips] audio').length===2);
 await page.reload();assert.equal(await page.locator('[data-clips] audio').count(),2);
 page.once('dialog',d=>d.accept());await page.locator('[data-delete-clip]').first().click();await page.waitForFunction(()=>document.querySelectorAll('[data-clips] audio').length===1);await page.reload();assert.equal(await page.locator('[data-clips] audio').count(),1);
 await nav('resources');await page.locator('#readinessForm button[type=submit]').click();assert((await page.locator('#readinessMessage').textContent()).includes('完整填写'));
 async function score(source,date,stage='w72'){for(const [k,v]of Object.entries({Listening:'6.5',Reading:'6.5',Writing:'6',Speaking:'6'}))await page.locator('#readiness'+k).fill(v);await page.locator('#readinessStage').selectOption(stage);await page.locator('#readinessSource').selectOption(source);await page.locator('#readinessDate').fill(date);}
 await score('mock','2026-10-05');await page.locator('#readinessForm button[type=submit]').click();assert((await page.locator('#readinessMessage').textContent()).includes('来源'));await page.locator('#readinessEvidence').fill('Unseen GT test; timed separately; AI writing estimate explicitly unverified');await page.locator('#readinessForm button[type=submit]').click();assert.equal(await page.locator('#readinessHistory article').count(),1);
 await score('ai','2026-10-01');await page.locator('#readinessForm button[type=submit]').click();assert((await page.locator('#readinessStatus').textContent()).includes('2026-10-05'));assert((await page.locator('#readinessHistory').textContent()).includes('仅供训练参考'));
 await page.locator('[data-edit-score]').first().click();await page.locator('#readinessWriting').fill('5.5');await page.locator('#readinessForm button[type=submit]').click();assert.equal(await page.locator('#readinessHistory article').count(),2);
 await page.locator('[data-delete-score]').last().click();assert.equal(await page.locator('#readinessHistory article').count(),1);
 const dl=page.waitForEvent('download');await page.locator('#exportProgress').click();const download=await dl;const file=await download.path();assert(learning.importJSON(fs.readFileSync(file,'utf8')).learning.weeks.w41.revision);
 await page.locator('#importProgress').setInputFiles(file);assert.equal(await page.locator('#confirmRestore').isVisible(),true);
 await Promise.all([page.waitForEvent('load'),page.locator('#confirmRestore').click()]);assert.equal((await stored()).learning.weeks.w41.revision,'I approved only the wheel replacement.');
 await open(61,1);await page.locator('[data-exam-mode]').click();await page.locator('[data-start-clock]').click();assert((await page.locator('[data-exam-status]').textContent()).includes('来源'));await page.locator('[data-exam-source]').fill('Official General Training reading section, unseen');await page.locator('[data-start-clock]').click();await page.locator('[data-exam-answers]').fill('1. sample');await page.locator('[data-pause-clock]').click();assert((await page.locator('[data-exam-status]').textContent()).includes('中断'));await page.locator('[data-finish-clock]').click();assert((await stored()).days[day(61,1)].course.exam.finished);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});for(const view of ['today','reading','grammar','diagnostic','resources']){await nav(view);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,`${view} overflow at ${width}`);}}
 await page.setViewportSize({width:1440,height:1000});await nav('grammar');await page.screenshot({path:'_shots/full-course-grammar-desktop.png'});await page.setViewportSize({width:390,height:844});await nav('reading');await page.screenshot({path:'_shots/full-course-reading-mobile.png'});
 assert.deepEqual(errors,[]);console.log('OK: 78 weeks / 312 unique texts; migration, quizzes, first-attempt evidence, grammar, cross-day feedback, recording persistence, filters, readiness CRUD, backup validation, exam timer and responsive views.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
