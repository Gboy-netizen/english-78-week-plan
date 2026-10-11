(function(root) {
  'use strict';
  const VERSION=3, SKILLS=['listening','reading','writing','speaking'];
  const PHASES=[
    {id:'foundation',start:1,end:12,title:'基础恢复',goal:'听懂短句，介绍自己，写清日常信息'},
    {id:'everyday',start:13,end:28,title:'日常理解与表达',goal:'理解短对话和文章，连贯讲述生活经历'},
    {id:'independent',start:29,end:44,title:'持续表达与考试入门',goal:'解释观点和理由，进入 General 任务'},
    {id:'ielts',start:45,end:60,title:'IELTS 专项训练',goal:'练习听读题型、书信、议论文及口语三部分'},
    {id:'strengthen',start:61,end:72,title:'薄弱科强化',goal:'在新材料中提高速度、准确性和独立表达'},
    {id:'verify',start:73,end:78,title:'综合验证',goal:'用未见材料和真实评分检查剩余差距'}
  ];
  const THEMES=['听力与复述','阅读与词块','口语与发音','阅读与写作','听力与熟练度','综合迁移','周复盘'];
  const copy=v=>JSON.parse(JSON.stringify(v));
  const uid=()=>root.crypto?.randomUUID?.() || 'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const today=()=>new Date().toLocaleDateString('sv-SE');
  function serial(d) {
    if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return null;
    const [y,m,n]=d.split('-').map(Number),date=new Date(Date.UTC(y,m-1,n));
    return date.toISOString().slice(0,10)===d?date.getTime()/86400000:null;
  }
  function addDays(d,n) { if(serial(d)===null)throw Error('日期无效');return new Date((serial(d)+n)*86400000).toISOString().slice(0,10); }
  function fresh() {return {schemaVersion:VERSION,application:'little-english-v3',revision:0,
    profile:{overall:6.5,minEach:6,accent:'US',examFormat:'computer',dailyMinutes:60},
    epochs:[],currentEpochId:null,diagnostic:{days:{},levels:{},weaknesses:[]},
    attempts:[],exposures:[],feedback:[],checks:[],batches:[],sessions:[],cards:{},
    pronunciation:{},issues:[],archives:[],createdAt:new Date().toISOString()};}
  function safeParse(text) {
    return JSON.parse(text,(key,val)=>{if(['__proto__','constructor','prototype'].includes(key))throw Error('不安全的备份字段');return val;});
  }
  function validate(s) {
    if(!s||s.application!=='little-english-v3'||s.schemaVersion!==3)throw Error('不支持的学习数据版本');
    for(const k of ['epochs','attempts','exposures','feedback','checks','batches','sessions','issues','archives']) {
      if(!Array.isArray(s[k]))throw Error('数据缺少 '+k);
      const seen=new Set();for(const item of s[k]){if(!item||typeof item.id!=='string'||!/^[A-Za-z0-9_.:-]+$/.test(item.id)||seen.has(item.id))throw Error(k+' 中存在无效或重复 ID');seen.add(item.id);}
    }
    for(const k of ['profile','diagnostic','cards','pronunciation'])if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))throw Error('无效的 '+k);
    if(!Number.isInteger(s.revision)||s.revision<0||!s.diagnostic.days||typeof s.diagnostic.days!=='object'||Array.isArray(s.diagnostic.days)||!s.diagnostic.levels||typeof s.diagnostic.levels!=='object'||!Array.isArray(s.diagnostic.weaknesses))throw Error('诊断或记录修订版本无效');
    if(!band(s.profile.overall)||!band(s.profile.minEach))throw Error('目标分数无效');
    for(const e of s.epochs)if(serial(e.start)===null)throw Error('周期日期无效');
    if(s.currentEpochId&&!s.epochs.some(e=>e.id===s.currentEpochId))throw Error('找不到当前学习周期');
    for(const a of s.attempts){if(typeof a.taskId!=='string'||typeof a.materialId!=='string'||typeof a.output!=='string'||!Array.isArray(a.audioIds))throw Error('练习关联无效');if(a.revisionOf&&!s.attempts.some(x=>x.id===a.revisionOf))throw Error('修改稿缺少原始练习');}
    for(const f of s.feedback){if(!s.attempts.some(a=>a.id===f.attemptId))throw Error('反馈缺少原始练习');if(!Array.isArray(f.tags)||!Array.isArray(f.actions)||!Array.isArray(f.evidence)||serial(f.retestDate)===null)throw Error('反馈格式无效');if(f.retestAttemptId&&!s.attempts.some(a=>a.id===f.retestAttemptId))throw Error('复测关联无效');}
    for(const session of s.sessions)if(!s.batches.some(b=>b.id===session.batchId)||!SKILLS.includes(session.skill))throw Error('考试计时关联无效');
    return s;
  }
  function migrateLegacy(old) {
    const s=fresh();if(old&&typeof old==='object')s.archives.push({id:'legacy-v1',kind:'legacy-progress',date:today(),progress:copy(old)});
    return s;
  }
  function beginEpoch(s,date=today()) {
    if(![1,2,3].every(n=>s.diagnostic.days[n]?.complete))throw Error('请先完成三天诊断');
    if(s.currentEpochId){s.archives.push({id:uid(),kind:'epoch-notes',epochId:s.currentEpochId,drafts:copy(s.drafts||{}),dailyNotes:copy(s.dailyNotes||{}),cards:copy(s.cards)});s.drafts={};s.dailyNotes={};s.cards={};}
    const epoch={id:uid(),start:addDays(date,1),baseline:copy(s.diagnostic),courseVersion:3,createdAt:new Date().toISOString()};
    s.epochs.push(epoch);s.currentEpochId=epoch.id;return epoch;
  }
  function info(s,date=today()) {
    const epoch=s.epochs.find(e=>e.id===s.currentEpochId);
    if(serial(date)===null)return {status:'invalid'};
    if(!epoch)return {status:'diagnostic'};
    const offset=serial(date)-serial(epoch.start);
    if(offset<0)return {status:'before',epoch};
    if(offset>=546)return {status:'after',epoch};
    const week=Math.floor(offset/7)+1,day=offset%7,phase=PHASES.find(p=>week>=p.start&&week<=p.end);
    return {status:'active',date,epoch,offset,week,day,phase};
  }
  function adjustment(s,week) {
    const checks=s.checks.filter(c=>c.epochId===s.currentEpochId&&c.week<week&&c.unseen&&Number.isFinite(c.comprehension)&&Number.isFinite(c.recall)).sort((a,b)=>b.week-a.week);
    const distinct=[];for(const c of checks)if(!distinct.some(x=>x.materialId===c.materialId))distinct.push(c);
    const pair=distinct.slice(0,2),failed=pair.filter(c=>c.comprehension<80||c.recall<80||!c.outputComplete);
    return {replaceDays:pair.length===2&&failed.length?[2,5]:[],lower:pair.length===2&&failed.length===2,checks:pair};
  }
  function schedule(s,course,date=today(),override) {
    let d=info(s,date);if(override){const [week,day]=override;d={...d,status:'active',week,day,phase:PHASES.find(p=>week>=p.start&&week<=p.end)};}
    if(d.status!=='active')return {...d,steps:[]};
    const adjust=adjustment(s,d.week),unit=course.units[d.week-1],repair=adjust.replaceDays.includes(d.day);
    const baseline=d.epoch?.baseline?.levels||s.diagnostic.levels;
    const starts={foundation:1,everyday:13,independent:29};
    const skillUnits=Object.fromEntries(SKILLS.map(k=>[k,course.units[Math.min(77,d.week-1+(starts[baseline[k]]||1)-1)]]));
    const easierWeek=adjust.lower?Math.max(1,(PHASES.find(p=>p.id===unit.phase)?.start||d.week)-12):Math.max(1,d.week-1);
    const remedialUnit=course.units[easierWeek-1];
    const due=s.feedback.filter(f=>f.epochId===s.currentEpochId&&f.retestDate<=date&&(!f.retestAttemptId||!f.retestDelayed));
    let minutes=[10,20,15,10,5],labels=['回想与复习','理解输入','主动输出','反馈与重练','保存与安排'];
    let mode='normal';
    if(d.day===6)labels=['主动提取','新材料周测','修改或重录','分析本周','安排下周'];
    if(d.week>=45&&[1,3].includes(d.day)&&!repair){minutes=[60];labels=[d.day===1?'阅读限时训练':'写作限时训练'];mode='section';}
    if([56,68,76].includes(d.week)&&d.day===5){minutes=[180];labels=['完整模拟：先登记合法未见材料'];mode='mock';}
    const taskId=`v3-w${String(d.week).padStart(2,'0')}-d${d.day+1}`;
    const materialId=d.day===6?unit.transfer.id:[0,4].includes(d.day)?unit.listening[d.day===0?0:1].id:unit.reading.id;
    return {...d,unit,skillUnits,remedialUnit,taskId,materialId,repair,lower:adjust.lower,due,mode,minutes:minutes.reduce((a,b)=>a+b,0),
      title:THEMES[d.day],steps:minutes.map((m,i)=>({minutes:m,label:labels[i]})),
      instruction:repair?'本课替换为最近错误的复练，不增加时长。':unit.goal};
  }
  function canonical(value) {
    const v=String(value||'').trim();
    try {const u=new URL(v);u.hash='';u.hostname=u.hostname.toLowerCase();u.searchParams.sort();return u.href.replace(/\/$/,'');}
    catch {return v.toLowerCase().replace(/\s+/g,' ');}
  }
  function seen(s,material) {
    const group=canonical(material.sourceId||material.id);
    return s.exposures.some(x=>canonical(x.sourceId)===group);
  }
  function expose(s,material,kind='preview') {
    const e={id:uid(),materialId:material.id,sourceId:canonical(material.sourceId||material.id),kind,at:new Date().toISOString(),epochId:s.currentEpochId};
    s.exposures.push(e);return e;
  }
  function recordAttempt(s,task,material,answers,options={}) {
    const output=options.kind==='output';
    const first=!s.attempts.some(a=>a.epochId===s.currentEpochId&&a.taskId===task&&a.materialId===material.id&&(a.kind==='output')===output);
    const wasSeen=options.wasSeen===undefined?seen(s,material):options.wasSeen;
    const questions=material.questions||[];
    const correct=questions.filter(q=>answers[q.id]===q.correct).length;
    const a={id:uid(),epochId:s.currentEpochId,taskId:task,materialId:material.id,sourceId:material.sourceId||material.id,
      contentVersion:material.version||3,createdAt:new Date().toISOString(),date:today(),first,seenBefore:wasSeen,
      assistance:options.assistance||'none',answers:copy(answers||{}),correct,total:questions.length,
      percent:questions.length?Math.round(correct/questions.length*100):null,output:options.output||'',
      audioIds:options.audioIds||[],revisionOf:options.revisionOf||null,kind:options.kind||'practice',taskPrompt:options.taskPrompt||''};
    s.attempts.push(a);expose(s,material,'attempt');return a;
  }
  function parseFeedback(text,attempt,s) {
    const f=safeParse(text.replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,''));
    if(!['ai','self','teacher','examiner'].includes(f.source))throw Error('来源请填写 ai、self、teacher 或 examiner');
    if(!f.dimensions||typeof f.dimensions!=='object'||Array.isArray(f.dimensions))throw Error('请填写反馈维度');
    if(Object.values(f.dimensions).filter(v=>typeof v==='string'&&v.trim()).length<2)throw Error('请至少填写两个具体维度的反馈');
    if(!Array.isArray(f.evidence)||!f.evidence.length)throw Error('请提供原句或音频时间点的证据');
    if(f.source==='ai'&&f.dimensions.pronunciation&&!f.audioReceived)throw Error('AI 未收到音频，不能评价发音');
    if(f.audioReceived&&!attempt.audioIds?.length)throw Error('原始练习没有录音依据，请先导入或录制再保存音频反馈');
    for(const ev of f.evidence){
      if(typeof ev!=='string'&&(!ev||typeof ev!=='object'))throw Error('证据格式无效');
      const quote=typeof ev==='string'?ev:ev.quote;
      if(!quote&&!(f.audioReceived&&Number.isFinite(ev.time)))throw Error('缺少证据原句或音频时间点');
      if(quote&&attempt.output&&!attempt.output.includes(quote))throw Error('证据原句不在原稿中：'+quote);
    }
    if(!Array.isArray(f.tags)||!f.tags.length||f.tags.some(t=>typeof t!=='string'||!t.trim()))throw Error('请填写错误标签数组');
    if(!Array.isArray(f.actions)||f.actions.length<2||f.actions.length>3||f.actions.some(x=>typeof x!=='string'||!x.trim()))throw Error('每次请填写2–3个具体动作');
    return {id:uid(),attemptId:attempt.id,epochId:attempt.epochId,source:f.source,dimensions:f.dimensions,evidence:f.evidence,
      tags:[...new Set(f.tags)],actions:f.actions,audioReceived:!!f.audioReceived,createdAt:new Date().toISOString(),
      retestDate:addDays(today(),3),retestAttemptId:null,retestResult:null};
  }
  function trends(s) {
    const count={};for(const f of s.feedback.filter(f=>f.epochId===s.currentEpochId))for(const tag of f.tags)count[tag]=(count[tag]||0)+1;
    return Object.entries(count).sort((a,b)=>b[1]-a[1]);
  }
  function recallCard(s,id,result,date=today()) {
    const c=s.cards[id]||{id,interval:0,failures:0,successes:0,epochId:s.currentEpochId};
    if(result){c.successes++;c.interval=[1,3,7,14,30,60][Math.min(c.successes-1,5)];}
    else {c.failures++;c.successes=0;c.interval=1;}
    c.lastResult=!!result;c.lastDate=date;c.due=addDays(date,c.interval);s.cards[id]=c;return c;
  }
  function vocabulary(s,unit,date=today()) {
    const due=Object.values(s.cards).filter(c=>c.due<=date),fresh=unit.chunks.filter(c=>!s.cards[c.id]).slice(0,Math.max(0,Math.min(5,20-due.length)));
    return {due:due.slice(0,20),remaining:Math.max(0,due.length-20),fresh,paused:due.length>=20};
  }
  function band(value) {return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=9&&value*2===Math.round(value*2);}
  function overall(scores) {const values=SKILLS.map(k=>scores[k]?.band??scores[k]);return values.every(band)?Math.round(values.reduce((a,b)=>a+b,0)/2)/2:null;}
  function officialURL(url) {try {const u=new URL(url);if(u.protocol!=='https:')return false;const h=u.hostname;return ['ielts.org','britishcouncil.org','ielts.idp.com'].some(d=>h===d||h.endsWith('.'+d));}catch{return false;}}
  function convert(raw,table) {
    if(!Number.isInteger(raw)||raw<0||raw>40||!table||!officialURL(table.url)||!Array.isArray(table.rows))throw Error('需0–40原始分及适用的官方换算来源');
    const rows=table.rows.slice().sort((a,b)=>a.min-b.min);
    let last=-1;for(const r of rows){if(!Number.isInteger(r.min)||!Number.isInteger(r.max)||r.min<=last||r.min>r.max||r.max>40||!band(r.band))throw Error('换算表区间无效');last=r.max;}
    const row=rows.find(r=>raw>=r.min&&raw<=r.max);return row?row.band:null;
  }
  function sessionValid(session,skill,batch) {
    return session&&session.batchId===batch.id&&session.skill===skill&&session.date===batch.date&&session.status==='complete'&&
      session.elapsed>=session.target&&session.elapsed<=session.target+10&&session.target>0&&Number.isFinite(session.elapsed)&&Number.isFinite(session.startedAt)&&Number.isFinite(session.endedAt)&&Math.abs((session.endedAt-session.startedAt)/1000-session.elapsed)<=10&&!session.clockAnomaly&&session.interruptions===0&&
      (skill==='reading'||skill==='writing'?session.target===3600:skill==='speaking'?session.target>=660&&session.target<=840:session.target>=1800&&session.target<=2400);
  }
  function batchReasons(s,b) {
    const reasons=[],skills=b.skills||{},material=b.material||{};
    if(!material.sourceId||!material.testId||!material.url)reasons.push('缺材料来源或测试编号');
    if(b.kind!=='mock')reasons.push('样题、课程或复习不能作为未见模考');
    if(material.seen!=='unseen')reasons.push('材料重复或未确认');
    const key=canonical(material.sourceId)+'/'+canonical(material.testId);
    const previous=s.batches.find(x=>x.id!==b.id&&canonical(x.material?.sourceId)+'/'+canonical(x.material?.testId)===key&&x.createdAt<b.createdAt);
    if(previous||s.exposures.some(e=>e.sourceId===key&&e.at<b.createdAt))reasons.push('相同材料已有练习记录');
    if(b.assistance!=='none')reasons.push('使用提示或辅助');
    if(!b.reviewed)reasons.push('尚未完成复盘');
    for(const skill of SKILLS){
      const r=skills[skill];if(!r||!band(r.band)){reasons.push('缺'+skill+'分数');continue;}
      if(!r.evidence)reasons.push('缺'+skill+'成绩证据');
      if(['listening','reading'].includes(skill)){
        if(r.scoreSource!=='official-result'&&(!r.table||!officialURL(r.table.url)||r.table.testId!==material.testId||r.table.format!==b.format||r.table.skill!==skill||convertSafe(r.raw,r.table)!==r.band))reasons.push(skill+'缺适用的官方换算');
      } else {
        if(!['teacher','examiner','official-result'].includes(r.scoreSource))reasons.push('缺'+skill+'人工评分来源');
        if(r.scoreSource!=='official-result'&&(!r.rater?.trim()||!r.raterQualification?.trim()))reasons.push('缺'+skill+'评分者身份与资格证据');
        const dims=skill==='writing'?['task','coherence','lexical','grammar']:['fluency','lexical','grammar','pronunciation'];
        if(r.scoreSource!=='official-result'&&(!r.dimensions||dims.some(d=>!String(r.dimensions[d]||'').trim())))reasons.push('缺'+skill+'评分维度');
      }
      if(!sessionValid(s.sessions.find(x=>x.id===r.sessionId),skill,b))reasons.push('缺'+skill+'有效同日计时记录');
    }
    const total=overall(skills);if(total===null||total<s.profile.overall)reasons.push('总分未达到目标');
    if(SKILLS.some(k=>!band(skills[k]?.band)||skills[k].band<s.profile.minEach))reasons.push('单项未达到目标');
    return [...new Set(reasons)];
  }
  function convertSafe(raw,table){try{return convert(raw,table);}catch{return null;}}
  function continuous(s,b) {
    const sessions=['listening','reading','writing'].map(skill=>s.sessions.find(x=>x.id===b.skills?.[skill]?.sessionId));
    if(sessions.some((x,i)=>!sessionValid(x,['listening','reading','writing'][i],b)))return false;
    if(!sessions[0].runId||sessions.some(x=>x.runId!==sessions[0].runId||!Number.isFinite(x.startedPerf)||!Number.isFinite(x.endedPerf)))return false;
    return sessions.slice(1).every((x,i)=>{
      const monotonicGap=x.startedPerf-sessions[i].endedPerf,wallGap=x.startedAt-sessions[i].endedAt;
      return monotonicGap>=0&&monotonicGap<=120000&&Math.abs(wallGap-monotonicGap)<=5000;
    })&&
      sessionValid(s.sessions.find(x=>x.id===b.skills?.speaking?.sessionId),'speaking',b);
  }
  function readiness(s) {
    const details=s.batches.map(b=>({batch:b,reasons:batchReasons(s,b)})),eligible=details.filter(x=>!x.reasons.length);
    const distinct=new Map();for(const x of eligible)distinct.set(canonical(x.batch.material.sourceId)+'/'+canonical(x.batch.material.testId),x);
    const valid=[...distinct.values()],endurance=valid.some(x=>continuous(s,x.batch));
    return {ready:valid.length>=2&&endurance,count:valid.length,endurance,details,
      reasons:[...(valid.length<2?['需要两批不同未见材料的有效四科记录']:[]),...(!endurance?['缺一次连续听读写及同日口语记录']:[])]};
  }
  function feedbackPrompt(attempt,kind='writing') {
    return `你是英语学习反馈助手。目标 IELTS General 6.5，当前练习类型：${kind}。先评价首次原稿，引用确切原句；不要代写后才评分。音频未实际收到时不要评价发音。AI估分只作训练参考。给2–3个可执行动作，并输出以下JSON（替换示例内容）：\n`+
      JSON.stringify({source:'ai',audioReceived:false,dimensions:kind==='speaking'?{task:'回应任务',fluency:'只有实际收到音频才评价流利度',lexical:'词汇',grammar:'语法'}:{task:'任务完成',coherence:'组织',lexical:'词汇',grammar:'语法'},evidence:[{quote:'从原稿复制的原句',comment:'具体问题'}],tags:['具体错误类别'],actions:['动作一','动作二']},null,2)+
      '\n\n原始任务：'+(attempt.taskPrompt||attempt.taskId)+'\n原稿：\n'+attempt.output+'\n录音标识：'+(attempt.audioIds||[]).join(', ')+'（标识不是音频，需我另上传真实录音；没有原稿也没有收到音频时，请先索取材料，不生成评价。）';
  }
  function merge(current,incoming) {
    validate(current);validate(incoming);
    const out=copy(current),remap={};
    const keys=['epochs','attempts','exposures','feedback','checks','batches','sessions','issues','archives'];
    for(const key of keys)for(const item of incoming[key]){
      const old=out[key].find(x=>x.id===item.id);
      if(old&&JSON.stringify(old)!==JSON.stringify(item))remap[item.id]=item.id+'-import-'+uid();
    }
    function rewrite(v){if(typeof v==='string')return remap[v]||v;if(Array.isArray(v))return v.map(rewrite);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[remap[k]||k,rewrite(x)]));return v;}
    const inc=rewrite(incoming);
    for(const key of keys)for(const item of inc[key])if(!out[key].some(x=>x.id===item.id))out[key].push(item);
    for(const [id,c] of Object.entries(inc.cards)){
      if(!out.cards[id])out.cards[id]=c;
      else if(JSON.stringify(c)!==JSON.stringify(out.cards[id]))out.archives.push({id:uid(),kind:'conflicting-card',card:c});
    }
    for(const [id,p] of Object.entries(inc.pronunciation)){
      if(!out.pronunciation[id])out.pronunciation[id]=p;
      else if(JSON.stringify(p)!==JSON.stringify(out.pronunciation[id]))out.archives.push({id:uid(),kind:'conflicting-pronunciation',pronunciation:p});
    }
    for(const key of ['drafts','dailyNotes'])for(const [id,value] of Object.entries(inc[key]||{})){
      out[key]||={};if(out[key][id]===undefined)out[key][id]=value;
      else if(JSON.stringify(out[key][id])!==JSON.stringify(value))out.archives.push({id:uid(),kind:'conflicting-'+key,taskId:id,value});
    }
    out.pendingFeedback=[...new Set([...(out.pendingFeedback||[]),...(inc.pendingFeedback||[])])];
    out.archives.push({id:uid(),kind:'import-profile',profile:inc.profile,diagnostic:inc.diagnostic,at:new Date().toISOString()});
    out.currentEpochId ||= inc.currentEpochId;return {state:validate(out),remap};
  }
  const api={VERSION,SKILLS,PHASES,THEMES,uid,today,serial,addDays,fresh,copy,safeParse,validate,migrateLegacy,beginEpoch,info,adjustment,schedule,canonical,seen,expose,recordAttempt,parseFeedback,trends,recallCard,vocabulary,band,overall,officialURL,convert,readiness,continuous,feedbackPrompt,merge};
  root.EnglishV3=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis==='undefined'?this:globalThis);
