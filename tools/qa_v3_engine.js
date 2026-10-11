'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../src/v3/engine.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync('assets/course-data.js','utf8'),context);const C=context.window.ENGLISH_COURSE;
const s=E.fresh();s.diagnostic.days={1:{complete:true},2:{complete:true},3:{complete:true}};
const epoch=E.beginEpoch(s,'2026-10-10');assert.equal(epoch.start,'2026-10-11');
let normal=0,section=0,mock=0;
for(let d=0;d<546;d++){
  const plan=E.schedule(s,C,E.addDays(epoch.start,d));assert.equal(plan.status,'active');assert.equal(plan.day,d%7);
  assert.equal(plan.week,Math.floor(d/7)+1);assert.equal(plan.steps.reduce((n,x)=>n+x.minutes,0),plan.minutes);
  assert.ok(plan.taskId&&plan.materialId&&plan.unit.writing.prompt&&plan.unit.speaking.prompt);
  if(plan.mode==='mock'){assert.equal(plan.minutes,180);mock++;}else{assert.equal(plan.minutes,60);if(plan.mode==='section')section++;else normal++;}
}
assert.equal(mock,3);assert.equal(normal+section+mock,546);
assert.equal(E.info(s,'2026-10-10').status,'before');assert.equal(E.info(s,E.addDays(epoch.start,546)).status,'after');assert.equal(E.serial('2026-02-30'),null);
assert.equal(new Set(C.units.flatMap(u=>u.listening.map(m=>m.audio))).size,156);assert.equal(new Set(C.units.flatMap(u=>[u.reading.text,u.transfer.text])).size,156);
const m=C.units[0].transfer;assert.equal(E.seen(s,m),false);const first=E.recordAttempt(s,'test-task',m,Object.fromEntries(m.questions.map(q=>[q.id,q.correct])),{wasSeen:false});
assert.equal(first.first,true);assert.equal(first.percent,100);assert.equal(E.seen(s,m),true);
const repeated=E.recordAttempt(s,'test-task',m,{},{});assert.equal(repeated.first,false);assert.equal(repeated.seenBefore,true);assert.equal(first.percent,100);
E.expose(s,{id:'another-url',sourceId:m.sourceId});assert.equal(E.seen(s,{id:'mirror',sourceId:m.sourceId}),true);
s.checks.push({id:'check1',week:1,epochId:s.currentEpochId,materialId:'check-m1',unseen:true,comprehension:65,recall:70,outputComplete:true},{id:'check2',week:2,epochId:s.currentEpochId,materialId:'check-m2',unseen:true,comprehension:60,recall:50,outputComplete:true});
assert.deepEqual(E.adjustment(s,3).replaceDays,[2,5]);assert.equal(E.adjustment(s,3).lower,true);
const repair=E.schedule(s,C,E.addDays(epoch.start,16));assert.equal(repair.repair,true);assert.equal(repair.minutes,60);
s.checks=[];s.diagnostic.levels.reading='everyday';epoch.baseline.levels.reading='everyday';assert.equal(E.schedule(s,C,epoch.start).skillUnits.reading.week,13);
const outputFirst=E.recordAttempt(s,'test-task',m,{},{output:'My first output.',kind:'output'});assert.equal(outputFirst.first,true);
assert.equal(E.schedule(s,C,E.addDays(epoch.start,55*7+5)).mode,'mock');
const a=E.recordAttempt(s,'writing',m,{},{output:'I go to work yesterday.',kind:'output'});
const feedback={source:'ai',audioReceived:false,dimensions:{grammar:'过去时间需要过去式',task:'信息清楚'},evidence:[{quote:'I go to work yesterday.',comment:'动词时态'}],tags:['过去时'],actions:['把昨天的动作改成过去式','换一个过去经历独立复述']};
const f=E.parseFeedback(JSON.stringify(feedback),a,s);assert.equal(f.retestDate,E.addDays(E.today(),3));s.feedback.push(f);assert.deepEqual(E.trends(s),[['过去时',1]]);
assert.throws(()=>E.parseFeedback(JSON.stringify({...feedback,evidence:[{quote:'Fabricated sentence'}]}),a,s),/原稿/);
assert.throws(()=>E.parseFeedback(JSON.stringify({...feedback,actions:['多练']}),a,s),/2–3/);
assert.throws(()=>E.parseFeedback(JSON.stringify({...feedback,dimensions:{pronunciation:'sounds good',grammar:'good'}}),a,s),/音频/);
assert.throws(()=>E.safeParse('{"__proto__":{}}'),/不安全/);
for(const [vals,want] of [[[6,6,6,7],6.5],[[6,6,6,6],6],[[6.5,6.5,6.5,7.5],7]])assert.equal(E.overall(Object.fromEntries(E.SKILLS.map((k,i)=>[k,vals[i]]))),want);
assert.equal(E.overall({listening:6,reading:6,writing:6}),null);assert.equal(E.band('6'),false);
assert.throws(()=>E.convert(30,{url:'https://ielts.org.attacker.example/table',rows:[]}),/官方/);
const evidence=E.fresh();
function batch(id,testId){
  const b={id,date:'2026-10-10',material:{sourceId:'legally-acquired-book',testId,url:'https://ielts.org/sample',seen:'unseen'},format:'computer',kind:'mock',assistance:'none',reviewed:true,createdAt:'2026-10-10T00:00:00.000Z',skills:{}};
  let t=1000000;
  for(const skill of E.SKILLS){
    const target=skill==='listening'?1920:skill==='speaking'?840:3600,sid=id+'-'+skill;
    evidence.sessions.push({id:sid,batchId:id,skill,date:b.date,status:'complete',target,elapsed:target,interruptions:0,clockAnomaly:false,startedAt:t,endedAt:t+target*1000,runId:id,startedPerf:t,endedPerf:t+target*1000});t+=target*1000;
    const dims=skill==='writing'?['task','coherence','lexical','grammar']:['fluency','lexical','grammar','pronunciation'];
    b.skills[skill]={band:6.5,evidence:'actual assessment report '+sid,scoreSource:['listening','reading'].includes(skill)?'official-result':'teacher',rater:'Identified IELTS teacher',raterQualification:'IELTS assessing experience, identified institution',dimensions:Object.fromEntries(dims.map(d=>[d,'criterion feedback'])),sessionId:sid};
  }
  evidence.batches.push(b);return b;
}
const b1=batch('b1','test-one');assert.equal(E.readiness(evidence).ready,false);const b2=batch('b2','test-two');assert.equal(E.readiness(evidence).ready,true);
const overrun=E.copy(evidence);overrun.sessions.find(x=>x.id==='b2-reading').elapsed+=60;assert.equal(E.readiness(overrun).ready,false);
b2.skills.speaking.scoreSource='ai';assert.equal(E.readiness(evidence).ready,false);b2.skills.speaking.scoreSource='teacher';
b2.skills.speaking.raterQualification='';assert.equal(E.readiness(evidence).ready,false);b2.skills.speaking.raterQualification='IELTS assessing experience';
b2.material.testId='test-one';assert.equal(E.readiness(evidence).ready,false);b2.material.testId='test-two';
evidence.sessions.find(x=>x.id==='b2-reading').clockAnomaly=true;assert.equal(E.readiness(evidence).ready,false);evidence.sessions.find(x=>x.id==='b2-reading').clockAnomaly=false;
b2.kind='sample';assert.equal(E.readiness(evidence).ready,false);b2.kind='mock';b2.assistance='minor';assert.equal(E.readiness(evidence).ready,false);
b2.assistance='none';b2.reviewed=false;assert.equal(E.readiness(evidence).ready,false);b2.reviewed=true;
evidence.sessions.find(x=>x.id==='b1-reading').startedAt+=300000;evidence.sessions.find(x=>x.id==='b2-reading').startedAt+=300000;assert.equal(E.readiness(evidence).endurance,false);
evidence.sessions.find(x=>x.id==='b1-reading').startedPerf-=300000;assert.equal(E.readiness(evidence).endurance,false);
const incoming=E.copy(s);incoming.attempts[0].output='conflicting output';const merged=E.merge(s,incoming);assert.equal(merged.state.attempts.length,s.attempts.length+1);assert.equal(merged.state.attempts.find(x=>x.id===first.id).output,'');
console.log('PASS v3 engine: 546-day budgets, adaptive replacement, immutable first attempt, source history, evidence-linked feedback, readiness exclusions and conflict preservation');
