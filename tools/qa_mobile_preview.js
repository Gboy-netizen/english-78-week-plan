'use strict';
// Isolated browser records: never reads or replaces the learner's real profile.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.PREVIEW_URL||'http://localhost:4173/';
const out='_shots/mobile-preview';
let browser;
const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function nav(p,view){await p.locator(`[data-nav="${view}"]`).click();await p.waitForFunction(v=>document.querySelector('#main').dataset.view===v,view);await settle(p);}
async function weeks(p){return p.locator('.unit-row').evaluateAll(rows=>rows.map(r=>Number(r.dataset.week)));}
async function open(p){await p.goto(base+'#course');await p.waitForSelector('.unit-row');await settle(p);}
async function noOverflow(p,label){assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label);}
(async()=>{
 fs.mkdirSync(out,{recursive:true});browser=await chromium.launch();
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await open(p);
 const original=await p.evaluate(()=>JSON.stringify(EnglishApp.state())),metrics=[];
 for(const width of [360,390,430,768,1440]){
  await p.setViewportSize({width,height:844});await settle(p);await p.evaluate(()=>scrollTo(0,0));await settle(p);
  await noOverflow(p,'layout '+width);
  const metric=await p.evaluate(()=>({width:innerWidth,height:document.documentElement.scrollHeight,firstRowTop:document.querySelector('.unit-row,.unit').getBoundingClientRect().top+scrollY,rows:document.querySelectorAll('.unit-row,.unit').length}));metrics.push(metric);
  if(width<=760){assert.equal(metric.rows,4);assert.ok(await p.locator('.header nav a').evaluateAll(a=>a.every(x=>x.getBoundingClientRect().height>=44&&x.getBoundingClientRect().width>=44)));}
  else assert.equal(metric.rows,12);
  if(width===390){assert.ok(metric.height<=1688);assert.ok(metric.firstRowTop<=450);}
  await p.screenshot({path:`${out}/after-${width}.png`,fullPage:true});
 }
 await p.setViewportSize({width:390,height:844});await settle(p);
 const phases=await p.evaluate(()=>EnglishV3.PHASES);
 for(const phase of phases){
  await p.selectOption('#course-phase',phase.id);await settle(p);
  const found=[],pages=Math.ceil((phase.end-phase.start+1)/4);
  for(let page=0;page<pages;page++){
   const rows=await weeks(p);found.push(...rows);assert.equal(rows.length,Math.min(4,phase.end-phase.start+1-page*4));
   assert.equal(await p.getByRole('button',{name:'上一页课程'}).isDisabled(),page===0);
   assert.equal(await p.getByRole('button',{name:'下一页课程'}).isDisabled(),page===pages-1);
   if(page<pages-1){await p.getByRole('button',{name:'下一页课程'}).click();await settle(p);assert.ok(await p.locator('#course-list').evaluate(el=>el.getBoundingClientRect().top>=60));}
  }
  assert.deepEqual(found,Array.from({length:phase.end-phase.start+1},(_,i)=>i+phase.start));
  await p.getByRole('button',{name:'上一页课程'}).click();await settle(p);assert.equal((await weeks(p))[0],phase.start+(pages-2)*4);
 }
 // Modal close, Escape, navigation and reload restore the same page/position.
 await p.selectOption('#course-phase','everyday');await p.getByRole('button',{name:'下一页课程'}).click();await settle(p);
 const row=p.locator('.unit-row').nth(2);await row.focus();await row.scrollIntoViewIfNeeded();await settle(p);
 const prior=await p.evaluate(()=>scrollY),selected=await row.getAttribute('data-week');
 await row.click();await p.locator('#modal[open]').waitFor();
 const headerTop=await p.locator('.modal-header').evaluate(e=>e.getBoundingClientRect().top);
 await p.locator('#modal-body').evaluate(e=>e.scrollTop=e.scrollHeight);await settle(p);
 assert.equal(await p.locator('.modal-header').evaluate(e=>e.getBoundingClientRect().top),headerTop);
 assert.ok(await p.locator('[data-close]').evaluate(e=>e.getBoundingClientRect().height>=44));
 await p.screenshot({path:`${out}/detail-390.png`});
 await p.locator('[data-close]').click();await p.waitForFunction(()=>!document.querySelector('#modal').open&&!document.body.classList.contains('modal-open'));await settle(p);
 assert.ok(Math.abs(await p.evaluate(()=>scrollY)-prior)<2);assert.equal(await p.evaluate(()=>document.activeElement.dataset.week),selected);
 await p.keyboard.press('Enter');await p.locator('#modal[open]').waitFor();await p.keyboard.press('Escape');await settle(p);assert.equal(await p.locator('#modal').evaluate(e=>e.open),false);
 await nav(p,'review');await nav(p,'course');assert.equal(await p.inputValue('#course-phase'),'everyday');assert.equal((await weeks(p))[0],17);assert.ok(Math.abs(await p.evaluate(()=>scrollY)-prior)<2,'navigation restores scroll');
 await p.reload();await p.waitForSelector('.unit-row');await settle(p);assert.equal((await weeks(p))[0],17);assert.ok(Math.abs(await p.evaluate(()=>scrollY)-prior)<2,'reload restores scroll');
 await p.setViewportSize({width:768,height:844});await settle(p);assert.equal(await p.locator('.unit').count(),16);await p.setViewportSize({width:390,height:844});await settle(p);assert.equal(await p.inputValue('#course-phase'),'everyday');assert.equal((await weeks(p))[0],17);
 await p.locator('[data-action="course-current"]').click();assert.equal((await weeks(p))[0],1);assert.equal(await p.locator('.current-week').getAttribute('data-week'),'1');
 assert.equal(await p.evaluate(()=>JSON.stringify(EnglishApp.state())),original,'browsing must not mutate learning records');
 // Text-only enlargement with wrapping and keyboard access to the final controls.
 await p.evaluate(()=>{for(const e of document.querySelectorAll('body *')){const style=getComputedStyle(e);e.dataset.qaSize=String(parseFloat(style.fontSize)*2);}for(const e of document.querySelectorAll('[data-qa-size]'))e.style.fontSize=e.dataset.qaSize+'px';});
 await noOverflow(p,'200% text');assert.ok(await p.locator('.unit-row').evaluateAll(rows=>rows.every(r=>r.querySelector('.unit-number').getBoundingClientRect().right<r.querySelector('.unit-title').getBoundingClientRect().left)),'enlarged week number must not overlap title');await p.locator('.unit-row').last().focus();await p.keyboard.press('Enter');await p.locator('#modal[open]').waitFor();await p.keyboard.press('Escape');await settle(p);
 await p.evaluate(()=>scrollTo(0,0));await settle(p);await p.screenshot({path:`${out}/text-200-390.png`,fullPage:true});
 await p.reload();await p.waitForSelector('.unit-row');await settle(p);
 await p.evaluate(()=>{ENGLISH_COURSE.units[0].title='很长的完整课程主题：向新同事介绍生活、工作与学习安排，并说明接下来一周的目标';});
 await p.locator('[data-action="course-current"]').click();await noOverflow(p,'long title');assert.ok(await p.locator('.unit-title').first().evaluate(e=>e.scrollHeight<=e.clientHeight+1));
 // Actual date determines week, independent of the date selected on Today.
 await p.evaluate(async()=>{const s=(await EnglishStorage.snapshot()).state;for(const n of [1,2,3])s.diagnostic.days[n]={complete:true};EnglishV3.beginEpoch(s,EnglishV3.addDays(EnglishV3.today(),-1-7*66));s.revision++;await EnglishStorage.save(s);sessionStorage.clear();});
 await p.reload();await p.waitForSelector('.unit-row');await settle(p);assert.equal(await p.inputValue('#course-phase'),'strengthen');assert.equal((await weeks(p))[0],65);assert.equal(await p.locator('.current-week').getAttribute('data-week'),'67');
 await nav(p,'today');await p.locator('#study-date').fill('2020-01-01');await p.locator('#study-date').dispatchEvent('change');await nav(p,'course');await p.locator('[data-action="course-current"]').click();assert.equal(await p.locator('.current-week').getAttribute('data-week'),'67');
 // Simulate a 34px bottom inset in the stylesheet; this is not physical iOS QA.
 const insetStyle=await p.addStyleTag({content:fs.readFileSync('src/v3/styles.css','utf8').replaceAll('env(safe-area-inset-bottom)','34px')});await settle(p);
 assert.equal(await p.locator('.header nav').evaluate(e=>getComputedStyle(e).paddingBottom),'39px');
 await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await settle(p);
 assert.ok(await p.evaluate(()=>document.querySelector('.footer span:last-child').getBoundingClientRect().bottom<=document.querySelector('.header nav').getBoundingClientRect().top),'last content clears bottom inset');
 await insetStyle.evaluate(e=>e.remove());await settle(p);
 // Virtual-keyboard viewport is simulated; hardware still needs manual QA.
 await nav(p,'library');await p.locator('[data-action="phoneme"]').first().click();await p.locator('textarea').first().focus();
 await p.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:400});visualViewport.dispatchEvent(new Event('resize'));});
 assert.equal(await p.locator('.header nav').isVisible(),false);
 await p.keyboard.press('Escape');await settle(p);await p.evaluate(()=>{delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'));});assert.equal(await p.locator('.header nav').isVisible(),true);
 const fallback=await browser.newContext({viewport:{width:390,height:844}});await fallback.addInitScript(()=>{Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Blocked','SecurityError');}});});const q=await fallback.newPage();await open(q);await q.selectOption('#course-phase','verify');await q.getByRole('button',{name:'下一页课程'}).click();await settle(q);await nav(q,'review');await nav(q,'course');assert.deepEqual(await weeks(q),[77,78]);await fallback.close();
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/metrics.json`,JSON.stringify({before:{width:390,height:3332,firstRowTop:806.828125},after:metrics,checks:'six phases, boundaries, actual week, modal focus/scroll, navigation/reload, breakpoint, blocked sessionStorage, long title, 200% text, safe inset CSS simulation, keyboard viewport simulation'},null,2));
 console.log('PASS mobile preview',JSON.stringify(metrics));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
