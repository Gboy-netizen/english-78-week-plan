(function(){
  'use strict';
  const E=window.EnglishV3,S=window.EnglishStorage,C=window.ENGLISH_COURSE;
  const main=document.getElementById('main'),modal=document.getElementById('modal');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const field=(name,label,value='',type='text',extra='')=>`<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const area=(name,label,value='',rows=5)=>`<label class="field">${label}<textarea name="${name}" rows="${rows}">${esc(value)}</textarea></label>`;
  const select=(name,label,options,value)=>`<label class="field">${label}<select name="${name}">${options.map(([k,v])=>`<option value="${esc(k)}" ${k===value?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;
  const titles={listening:'听力',reading:'阅读',writing:'写作',speaking:'口语'};
  const VIEWS=['today','course','review','evidence','library'];
  const runId=E.uid();
  let state,date=E.today(),view='today',phaseFilter='foundation',lesson=null,step=0,diagnosticDay=1;
  let pendingImport=null,recorder=null,recordStream=null,recordTimer=null,objectUrls=[],examTicker=null,examRuntime=null,toastTimer=null,saveQueue=Promise.resolve();
  const quizContexts=new Map();
  const material=id=>C.units.flatMap(u=>[u.reading,u.transfer,u.grammar,...u.listening]).find(m=>m.id===id)||[C.diagnostic.reading,C.diagnostic.listening,C.diagnostic.harderReading].find(m=>m.id===id);
  const unitFor=id=>C.units.find(u=>[u.reading.id,u.transfer.id,u.grammar.id,...u.listening.map(x=>x.id)].includes(id));
  const currentTask=()=>lesson?.taskId||'diagnostic-'+diagnosticDay;
  const resourceStatus=url=>{const r=(C.resourceChecks||[]).find(r=>r.url===url);return r?`<p class="tiny">入口访问抽检 ${esc(r.checkedAt.slice(0,10))}：${r.accessible?'可访问':'未能访问，建议使用备用入口或本地练习'}。链接访问与播放器、人工试听分别核验。</p>`:'<p class="tiny">入口待核验；使用失败时请切换备用来源或本地练习。</p>';};
  function toast(text,error=false){const el=document.getElementById('toast');el.textContent=text;el.hidden=false;el.style.background=error?'#7b452d':'';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,7000);}
  function transact(fn,clips=[]){const p=saveQueue.then(async()=>{const before=E.copy(state);try{const result=fn(state);state.revision=(state.revision||0)+1;await S.save(state,clips);return result;}catch(e){state=before;throw e;}});saveQueue=p.catch(()=>{});return p;}
  function run(fn){return Promise.resolve().then(fn).catch(e=>{console.error(e);toast(e.message||'操作失败，请重试',true);});}
  function close(){modal.close();document.getElementById('modal-body').innerHTML='';}
  function showModal(title,body){document.getElementById('modal-body').innerHTML=`<h2 id="modal-title" class="modal-heading">${title}</h2>${body}`;if(!modal.open)modal.showModal();}
  function releaseUrls(){objectUrls.forEach(u=>URL.revokeObjectURL(u));objectUrls=[];}
  const link=(url,label)=>/^https?:\/\//.test(url||'')?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:/^assets\/[A-Za-z0-9_./-]+$/.test(url||'')&&!url.includes('..')?`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`:esc(label);
  function download(blob,name){const url=URL.createObjectURL(blob instanceof Blob?blob:new Blob([blob]));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  async function copyText(text){try{await navigator.clipboard.writeText(text);toast('已复制');}catch{showModal('复制内容',area('copy','手动复制下面的内容',text,12));}}
  function heading(eyebrow,title,lead,extra=''){return `<div class="page-title"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="muted">${lead}</p></div>${extra}</div>`;}
  function setView(){const hash=location.hash.slice(1);view=VIEWS.includes(hash)?hash:'today';render();}
  function render(){
    if(!state)return;releaseUrls();
    document.querySelectorAll('[data-nav]').forEach(a=>{if(a.dataset.nav===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    main.innerHTML=view==='today'?renderToday():view==='course'?renderCourse():view==='review'?renderReview():view==='evidence'?renderEvidence():renderLibrary();
    bindRendered();
  }
  function renderToday(){
    const info=E.info(state,date),plan=E.schedule(state,C,date),hasEpoch=!!state.currentEpochId;
    const dateControl=`<label class="date">学习日期 <input id="study-date" type="date" value="${date}"></label>`;
    if(!hasEpoch)return heading('START WITH UNDERSTANDING','先找到你的起点。','用三天、每天一小时，看看你能听懂什么、表达什么。然后开始自己的78周。',dateControl)+
      `<div class="grid"><div><section class="card hero"><div class="hero-line"></div><div class="hero-content"><span class="pill">每天60分钟 · 六天训练，一天复盘</span><h2 style="margin-top:19px">从“学过”，走向“会用”。</h2><p class="muted">先理解真实人声，再用自己的话表达。每次只改几个问题，过几天再检查。</p><div class="facts"><div><strong>78</strong><span>周完整课程</span></div><div><strong>156</strong><span>份本地真人朗读</span></div><div><strong>6.5</strong><span>IELTS General 目标</span></div></div><button class="primary" data-action="diagnostic" data-day="${diagnosticDay}">开始第 ${diagnosticDay} 天诊断 →</button></div></section>${renderDiagnostic()}</div><aside>${principlesCard()}<section class="card side-card"><h3>你的记录会被保留</h3><p class="help">新周期从诊断完成后的下一天开始。旧版文字记录和录音保存在历史档案，可以随时导出。</p><a class="tiny" href="#library">查看本机数据与备份 →</a></section><section class="card side-card"><h3>材料的真实边界</h3><p class="help">本地材料是多位真人的文学朗读；自然对话另有分级原站入口。它们用于训练，不能当作官方模考。</p></section></aside></div>`;
    if(info.status!=='active')return heading('YOUR NEXT STEP',info.status==='before'?'明天，正式出发。':'课程之外，继续练习。',info.status==='before'?`你的新周期从 ${info.epoch.start} 开始。今天可以复盘诊断或浏览课程。`:'78周结束后，根据真实表现继续补强；历史记录和所有材料仍可访问。',dateControl)+`<section class="card"><a class="button primary" href="#course">浏览全部课程</a> <a class="button secondary" href="#review">查看复盘任务</a></section>`;
    const due=state.feedback.filter(f=>f.epochId===state.currentEpochId&&(!f.retestAttemptId||!f.retestDelayed)&&f.retestDate<=E.today());
    const trend=E.trends(state).slice(0,3),done=state.attempts.filter(a=>a.epochId===state.currentEpochId&&a.date===E.today());
    return heading('ONE HOUR, ONE STEP','今天，把英语用起来。',`第 ${info.week} 周 · ${info.phase.title} · ${plan.title}`,dateControl)+
      `${C.offlinePackage?`<p class="notice">此分阶段包内置 W${C.offlinePackage.start}–W${C.offlinePackage.end} 的真人录音，其余阶段保留文字与任务。需要相应阶段包解压到同目录，或下载完整版。</p>`:''}${date!==E.today()?'<p class="notice warning">正在预览其他日期的课程。练习会记录实际提交日期，不能补造过去的考试或学习证据。</p>':''}`+
      `<div class="grid"><div><section class="card hero"><div class="hero-line"></div><div class="hero-content"><span class="pill">${info.phase.title}</span><h2 style="margin-top:17px">${esc(plan.unit.title.split(' · ')[0])}</h2><p class="muted">${esc(plan.instruction)}</p><div class="facts"><div><strong>${plan.minutes}</strong><span>分钟 · 今日预算</span></div><div><strong>${info.week}<small style="font-size:17px"> / 78</small></strong><span>周 · 计划位置</span></div><div><strong>${due.length}</strong><span>项待复测</span></div></div><button class="primary" data-action="start-lesson">${lesson?.taskId===plan.taskId?'继续今日练习':'开始今日练习'} →</button></div></section>
      <section class="card"><div class="row space"><h3>本周的七个小目标</h3><span class="tiny">六天训练 + 一天复盘</span></div><div class="day-strip">${E.THEMES.map((t,i)=>`<button data-action="day" data-day="${i}" class="${i===info.day?'active':''}">${i===6?'复盘':'D'+(i+1)}<span>${t}</span></button>`).join('')}</div><p class="help">今天已保存 ${done.length} 次练习产出。首次、提示后和重复练习分别记录；提交不代表掌握。</p>${plan.repair?`<p class="notice warning">最近阶段检查提示需要补强：本周两个课时替换为复练。${plan.lower?'两轮都存在困难，先选上一阶段的更容易材料。':''}</p>`:''}</section>
      ${lesson?renderLesson():`<section class="card"><p class="eyebrow">LEARN · USE · CHECK</p><h3>材料、步骤和反馈，放在同一节课。</h3><p class="muted">先独立尝试，再看文本和答案。留下原稿或录音，改2–3个问题，三天后再测。</p></section>`}</div><aside><section class="card side-card"><h3>今天的60分钟</h3><ol class="rhythm">${plan.steps.map(x=>`<li><span>${x.label}</span><b>${x.minutes} 分钟</b></li>`).join('')}</ol><p class="tiny" style="margin-top:12px">专项日替换普通环节；三次完整模考另预留约3小时。</p></section><section class="card side-card"><h3>最近反复出现的问题</h3>${trend.length?`<div class="tag-list">${trend.map(([t,n])=>`<span class="pill warm">${esc(t)} · ${n}次</span>`).join('')}</div>`:'<p class="help">保存结构化反馈后，这里会显示具体错误和下一步动作。</p>'}<a class="tiny" href="#review">查看复盘 →</a></section>${principlesCard()}</aside></div>`;
  }
  function principlesCard(){return `<section class="card side-card"><h3>这次，练得更有依据。</h3><ul class="principles">${C.principles.map((p,i)=>`<li><span>0${i+1}</span>${p}</li>`).join('')}</ul><p class="tiny" style="margin-top:13px">训练阈值用于调整学习，课程完成不等于取得考试分数。</p></section>`;}
  function renderDiagnostic(){
    const day=C.diagnostic.days[diagnosticDay-1],saved=state.diagnostic.days[diagnosticDay],all=[1,2,3].every(n=>state.diagnostic.days[n]?.complete);
    return `<section class="card" id="diagnostic"><div class="row space"><h2>三天入学诊断</h2><span class="pill">不换算 IELTS 分数</span></div><div class="phase-tabs">${[1,2,3].map(n=>`<button data-action="diagnostic" data-day="${n}" class="${n===diagnosticDay?'active':''}">第 ${n} 天 ${state.diagnostic.days[n]?.complete?'✓':''}</button>`).join('')}</div><h3>${day.title}</h3><p class="help">${day.steps.map(([label,min])=>`${label} ${min}分钟`).join(' · ')}</p>
      ${diagnosticDay===1?`<p>先听三句真人短句，回答意思题；再用英语介绍姓名、住处、工作和学习时间。可以只说几句。</p>${quizBox(C.diagnostic.listening,'diagnostic-1','diagnostic')}${recordingBox('diagnostic-1')}<p class="help">不要求像母语者；回放后记录哪些词或句子不清楚。</p>`:
        diagnosticDay===2?`<p>先读容易材料。首答达到80%后，可尝试较难材料；困难时继续基础训练。</p>${quizBox(C.diagnostic.reading,'diagnostic-2','diagnostic')}<button data-action="harder-diagnostic" class="small">尝试较难阅读 →</button>${diagnosticLanguage()}`:
        `<p>写一段自己的日常安排，再录一段情境表达：向课程老师说明你的英语困难，询问一个适合自己的学习方法。</p>${area('diagnostic-writing','首次短写作（尽力独立写，30词起步）',state.drafts?.['diagnostic-writing']||saved?.writing||'',6)}${recordingBox('diagnostic-3')}<p class="help">写作与口语的外部反馈可以稍后补；当前只记录完成情况与困难。</p>`}
      <form data-form="diagnostic" data-day="${diagnosticDay}">${area('observations','记录实际困难、提示使用和下一步',saved?.observations||'',3)}${select('assistance','本次提示使用',[['none','独立尝试'],['minor','少量词典或提示'],['heavy','明显依赖翻译或提示']],saved?.assistance||'none')}${diagnosticDay!==2?'<label class="inline"><input type="checkbox" name="audioPending">当前无法录音，口语证据待补（说明困难后可先开课）</label>':''}
      ${diagnosticDay===3?`<div class="form-grid">${E.SKILLS.map(k=>select(k,titles[k]+'起点',[['foundation','基础恢复（保守起点）'],['everyday','日常表达起点'],['independent','独立表达起点']],state.diagnostic.levels[k]||'foundation')).join('')}</div><p class="help">起点是教学选择，不是CEFR或雅思认证；后续用新材料复测调整。</p>`:''}
      <button class="primary" type="submit">保存第 ${diagnosticDay} 天结果</button> <span class="saved-indicator">${saved?.complete?'已保存，可补充；原始尝试仍保留':''}</span></form>
      ${all?`<div class="bar"><p class="help">三天结果已保存。口语、写作可继续补反馈。</p><button class="primary" data-action="begin-epoch">开始我的78周 · 明天起 →</button></div>`:''}</section>`;
  }
  function diagnosticLanguage(){
    const saved=state.diagnostic.language,definition=C.diagnostic.language,current=saved?.contentVersion===definition.version;
    const result=saved?`<p class="result">已保存：词块 ${saved.vocabulary}% · 句法 ${saved.grammar}% · ${saved.hinted?'有提示':'独立'}${saved.seenBefore?' · 重复练习':''}</p>`:'';
    const legacy=saved&&!current?'<p class="notice warning">旧题提供了英文词根提示，旧成绩仅作历史训练参考。可完成修订版复测；原答案保留，复测不算未见诊断。</p>':'';
    return `<details><summary>常用词块与基础句法 · 25分钟</summary>${legacy}${!current?`<form data-form="diagnostic-language"><p class="help">写出对应词块，再按中文意思补全句子。先独立回想，不查答案。</p>${definition.items.map(x=>field(x.name,esc(x.prompt),'','text','required autocomplete="off"')).join('')}<label class="inline"><input type="checkbox" name="hinted">我使用了提示</label><button class="secondary" type="submit">${saved?'保存修订版复测（保留旧答案）':'保存首次词块与句法答案'}</button></form>`:'<p class="help">本版首次答案已留档；继续复练请使用课程中的句法与表达练习。</p>'}${result}${state.diagnostic.languageHistory?.length?`<p class="tiny">保留 ${state.diagnostic.languageHistory.length} 次旧版词块与句法记录，可随学习包导出。</p>`:''}</details>`;
  }
  const grammarReference=m=>`<section class="grammar-reference"><h4>规则与例句</h4><p>${esc(m.note)}</p><p class="quote">${esc(m.examples)}</p></section>`;
  const quizHint=m=>m.materialKind==='grammar'?grammarReference(m):m.audio?transcript(m):`<p>${esc(m.translation||'先定位人、时间、地点和条件；不要把推断当成明确事实。')}</p>`;
  function quizBox(m,taskId,kind='practice'){
    const key=taskId+'/'+m.id,ctx=quizContexts.get(key),previous=state.attempts.filter(a=>a.epochId===state.currentEpochId&&a.taskId===taskId&&a.materialId===m.id&&a.kind!=='output').at(-1);
    const submitted=ctx?.submitted||false,restricted=kind==='check';
    const audio=m.audio?audioBox(m):'';
    const text=m.materialKind==='grammar'?submitted?grammarReference(m):'<p class="help">规则、例句和解析在提交后展示；提前查看提示会记录辅助使用。</p>':m.audio?submitted?transcript(m):'<p class="help">全文在首次提交后展示。先听大意并尝试回答，再核对文本；不熟悉时可使用提示，首答会记录辅助使用。</p>':`<div class="text-en">${paragraphsHTML(m.text)}</div>`;
    const bad=state.issues.filter(x=>x.kind==='content-report'&&x.status!=='resolved');
    const qs=m.questions.filter(q=>!bad.some(x=>x.questionId===q.id));
    return `<div class="quiz-box" data-quiz-key="${esc(key)}"><div class="row space"><h3>${esc(m.title)}</h3><span class="pill">${m.materialKind==='grammar'?'句法练习':m.audio?'真人音频':'原创阅读'} · ${restricted?'迁移检查':'教学练习'}</span></div>${audio}<p class="help">${esc(m.instruction||'先独立理解，再检查答案证据。')}</p>${text}<div class="quiz-hint" ${ctx?.hinted&&!submitted?'':'hidden'}>${ctx?.hinted&&!submitted?quizHint(m):''}</div>
      ${previous?`<p class="tiny">已保存 ${state.attempts.filter(a=>a.taskId===taskId&&a.materialId===m.id).length} 次尝试。首次 ${previous.first?'已留档':'另有留档'}；再次作答属于重复练习。</p>`:''}
      ${qs.length?`<form data-form="quiz" data-material="${m.id}" data-task="${esc(taskId)}" data-kind="${kind}"><div class="questions">${qs.map((q,i)=>`<fieldset class="question"><legend>${i+1}. ${esc(q.prompt)}</legend>${q.options.map((o,n)=>`<label class="option"><input required type="radio" name="${esc(q.id)}" value="${n}">${esc(o)}</label>`).join('')}${submitted?`<div class="result ${ctx.answers[q.id]===q.correct?'':'error'}"><b>${ctx.answers[q.id]===q.correct?'答对':'需要重练'}</b> · ${esc(q.options[q.correct])}<p class="small-text">${esc(q.explanation)}</p><details><summary>查看答案证据与审查状态</summary><p class="quote">${esc(q.evidence.quote)}</p><p class="tiny">候选证据绑定 · ${q.evidence.humanReviewed?'人工复核':'尚未独立人工复核'}；不作标准化能力证明。</p><button type="button" class="quiet tiny" data-action="report-question" data-question="${q.id}" data-material="${m.id}">报告可能有误的题目</button></details></div>`:''}</fieldset>`).join('')}</div><button class="primary" type="submit">${submitted?'另存一次复练':'保存首答，再看解析'}</button>${!restricted?` <button type="button" data-action="hint" data-key="${esc(key)}">查看提示（会记录）</button>`:''}</form>`:'<p class="notice warning">本材料的题目已被标记需修订，暂停计分；仍可做文本理解练习。</p>'}
      ${bad.some(x=>x.materialId===m.id)?'<p class="notice warning">部分题目被报告需修订，已从本轮计分移除；历史答案保留。</p>':''}
      <p class="material-quality">${m.audio?'音频转写和边界来自公开语料；缺词题为自编训练。':'自编材料，题目证据经机器绑定。'} 未经独立教师逐项复核，不换算雅思分数。</p></div>`;
  }
  function paragraphsHTML(text){return text.split('\n\n').map(p=>`<p>${esc(p)}</p>`).join('');}
  function audioBox(m){return `<div class="audio-panel"><div class="row space"><b>本地真人朗读</b><span class="pill good">${Math.round(m.duration)}秒 · 可离线</span></div><audio controls preload="metadata" data-material-audio="${m.id}" src="${esc(m.audio)}"></audio><p class="source">LibriSpeech / LibriVox · ${esc(m.license)} · ${link(m.sourceUrl,'来源与许可')} · 多位朗读者，口音未逐人核验</p><p class="tiny">文件已解码检查；${m.verified.humanListenedOn?'已人工试听':'尚未逐项人工试听'}。文学朗读用于语言练习，不是自然对话或考试听力。</p><p class="audio-error notice warning" hidden></p>${m.conversation?`<details><summary>换成分级真人对话 · ${esc(m.conversation.level)}（联网）</summary><p class="help">这是另一份材料。全文、题目和语法在来源页；本地朗读的缺词题不用于这份对话。</p><audio controls preload="none" src="${esc(m.conversation.audio)}" data-online-audio="${m.id}"></audio><p>${link(m.conversation.url,'打开完整对话与原文')}</p>${resourceStatus(m.conversation.audio)}<button data-action="conversation" data-material="${m.id}" class="small">登记这份对话的独立尝试</button><p class="tiny">仅原站播放，不重发布录音或全文；外链访问会受网络条件影响。</p></details>`:''}</div>`;}
  function transcript(m){return `<div class="segments">${m.support?`<section class="notice"><h4>理解后，把句子用起来</h4><p>${esc(m.support.translation)}</p><p><b>${esc(m.support.phrase)}</b> · ${esc(m.support.meaning)}</p><p class="quote">${esc(m.support.model)}</p><p class="tiny">上面是简化教学例句；下面保留录音中的逐字转写，两者分别标明。</p><p>${esc(m.support.transfer)}</p><p class="help">20分钟安排：首次听与答题5分 → 核对意思与原始转写5分 → 分段重听5分 → 遮住文本回想并换情境5分。困难时只练核心词块，不追求重复次数。</p></section>`:''}<h4>逐段精听 → 跟读 → 用自己的话说</h4>${m.segments.map((s,i)=>`<div class="segment"><button class="small" data-action="segment" data-material="${m.id}" data-start="${s.start}" data-end="${s.end}">${s.start.toFixed(1)}–${s.end.toFixed(1)}秒 · 重听</button><p>${esc(s.text)}</p></div>`).join('')}</div>`;}
  function recordingBox(task){return `<section class="recording" data-recording-task="${esc(task)}"><h4>留下你的声音</h4><p class="help">听懂后再跟读或复述。录一遍，回放，对比目标声音，再重录。先完成录音，再保存一份原始产出；后续录音另存为新尝试，不改原始证据。录音只保存在当前设备。</p><div class="row"><button data-action="record" data-task="${esc(task)}" ${recorder?'disabled':''}>开始录音</button><button data-action="stop-record" ${recorder?'':'disabled'}>停止并保存</button><label class="button small">导入音频<input type="file" accept="audio/*" data-import-audio="${esc(task)}" hidden></label><span class="record-status tiny">${recorder?'正在录音…':'未开始录音'}</span></div><div data-clips="${esc(task)}" class="clips"><p class="tiny">正在读取本任务录音…</p></div></section>`;}
  function renderLesson(){
    const p=lesson,u=p.unit;
    if(p.mode==='mock')return `<section class="card" id="lesson">${lessonHeader()}<h3>今天另预留约三小时。</h3><p>先选择合法取得、没有练过的完整材料。听读写连续进行，口语同日单独完成。按材料与考试形式计时；此处不会用一个倒计时冒充完整考试。</p><a class="button primary" href="#evidence">登记模考批次并开始分科 →</a><p class="help" style="margin-top:15px">W56、W68、W76三次较长模拟替代当天普通课，共额外约六小时。</p></section>`;
    if(p.mode==='section')return `<section class="card" id="lesson">${lessonHeader()}<h3>整小时 ${p.day===1?'阅读':'写作'}训练</h3><p>今天的词汇和复盘移到其他训练日，替换对应任务。使用完整合法材料时进入能力证据计时；自编材料属于训练。</p><a class="button primary" href="#evidence">使用合法材料计时 →</a><button data-action="training-section" class="secondary">使用本周教学材料（不作模考）</button>${p.day===3?outputBox(u):''}</section>`;
    const steps=p.steps.map((x,i)=>`<button class="${i===step?'active':''}" data-action="step" data-step="${i}">${i+1} ${x.label}<small>${x.minutes}′</small></button>`).join('');
    let body;
    if(step===0)body=recallBox(u);
    else if(step===1){
      const inputUnit=p.repair?p.remedialUnit:[0,4].includes(p.day)?p.skillUnits.listening:p.skillUnits.reading;
      const m=p.day===6?u.transfer:[0,4].includes(p.day)?inputUnit.listening[p.day===0?0:1]:inputUnit.reading;
      body=quizBox(m,p.taskId,p.day===6?'check':'practice')+(p.day===2?`<button class="secondary" data-action="phoneme" data-id="${u.pronunciation}">本周发音对比 →</button>`:'');
    }else if(step===2)body=outputBox(u);
    else if(step===3)body=lessonFeedback(u);
    else body=saveDayBox(u);
    return `<section class="card" id="lesson">${lessonHeader()}<div class="step-strip">${steps}</div>${p.repair?'<p class="notice warning">本课改为补强：优先复练最近反馈的动作。新的迁移材料继续保留到复盘日。</p>':''}${body}<div class="bar"><span class="tiny">每个环节按预算收尾；未完成的反馈移到次日对应时段。</span>${step<4?`<button data-action="step" data-step="${step+1}" class="secondary">下一步 →</button>`:'<a href="#review" class="button secondary">查看复盘任务 →</a>'}</div></section>`;
  }
  function lessonHeader(){return `<div class="lesson-header"><div><p class="eyebrow">TODAY’S PRACTICE · W${lesson.week}</p><h2>${lesson.title}</h2></div><span class="pill">${lesson.minutes}分钟预算</span></div>`;}
  function recallBox(u){
    const cards=E.vocabulary(state,u,E.today()),all=C.units.flatMap(x=>x.chunks),due=cards.due.map(x=>all.find(c=>c.id===x.id)).filter(Boolean),list=[...due,...(lesson.day<5?cards.fresh:[])];
    return `<h3>先回想，再翻看。</h3><p class="help">最多10分钟复习，到时收尾。${cards.paused?'到期复习较多，暂停新增，不加时。':'新项每天最多5个；重复句型会自动跳过。'}</p>${list.length?list.slice(0,25).map((c,i)=>`<div class="word-card"><p class="tiny">${state.cards[c.id]?'到期提取':'新句型'} · ${esc(c.meaning)}</p><form data-form="card" data-id="${c.id}"><label class="field">${state.cards[c.id]?'不看答案，写出词块或句子':'先理解下面例句，再盖住它提取'}<input name="answer" autocomplete="off" required placeholder="用英语回想"></label><details><summary>查看原句${state.cards[c.id]?'（看后作答属于提示练习）':''}</summary><p class="phrase">${esc(c.phrase)}</p><p>${esc(c.example)}</p><p class="help">自己替换人物、时间或条件，说一个新句子。</p></details><button type="submit" class="small">检查并安排间隔复习</button></form></div>`).join(''):'<p class="empty">目前没有到期词块。用10分钟回想上一次的2个问题，遮住范例说出自己的句子。</p>'}<p class="tiny">${cards.remaining?`还有 ${cards.remaining} 项到期内容，保留到下一次复习，不追补。`:''}准确提取只证明这次词句回想；实际使用另由输出任务检验。</p>`;
  }
  function outputBox(u){
    u=lesson.repair?lesson.remedialUnit:lesson.skillUnits[[1,3,5,6].includes(lesson.day)?'writing':'speaking'];
    const task=lesson.taskId,isWriting=[1,3,5,6].includes(lesson.day),draft=state.drafts?.[task]||'',attempts=state.attempts.filter(a=>a.epochId===state.currentEpochId&&a.taskId===task&&a.kind==='output');
    const pending=lesson.retestFeedback||lesson.due[0],original=pending&&state.attempts.find(a=>a.id===pending.attemptId);
    return `<h3>${lesson.repair||pending?'修改、重录或迁移复测':isWriting?'用自己的话写下来':'用自己的话说出来'}</h3><p>${esc(outputInstruction(u))}</p>${isWriting?`<p class="help">本周完整写作目标 ${u.writing.minWords} 词；阅读词块日先写3–5句，当前环节按15分钟收尾。字数不等于质量。</p>`:`<p class="help">目标约 ${u.speaking.seconds} 秒；先独立录一次，再看提示。</p>`}
      ${original?`<div class="notice"><b>待复测：${esc(pending.tags.join('、'))}</b><p>${esc(pending.actions.join('；'))}</p><details><summary>原始产出</summary><p class="quote">${esc(original.output)}</p></details></div>`:''}
      ${u.writing.task2&&isWriting?`<details><summary>Task 2 独立任务 · 至少250词</summary><p>${esc(u.writing.task2)}</p><p class="help">完整写作模拟须在60分钟内完成两个任务，不能把本次15分钟初稿算作完整写作。</p></details>`:''}
      <form data-form="output" data-task="${task}" data-retest="${pending?.id||''}">${area('output',isWriting?'首次原稿 / 修改稿':'口头表达提纲或转写（录音另存）',draft,8)}${select('assistance','本次辅助使用',[['none','独立完成'],['minor','词典 / 少量提示'],['heavy','翻译 / AI明显帮助']],'none')}${attempts.length?select('revision','关联以前的产出',[['','新的独立尝试'],...attempts.map(a=>[a.id,new Date(a.createdAt).toLocaleString()+' · '+(a.first?'首次':'后续')])],''):''}${pending?select('retestResult','复测结果',[['improved','在新表达中已改善'],['partial','部分改善，还需练习'],['unchanged','仍有相同问题']],'partial'):''}<button type="submit" class="primary">保存原始产出${pending?'并关联复测':''}</button></form>
      ${recordingBox(task)}<ul class="checklist">${(isWriting?u.writing.checklist:u.speaking.checklist).map(x=>`<li>${x}</li>`).join('')}</ul><p class="tiny">已有 ${attempts.length} 份产出，修改稿和原稿分别保留。录音导入与实际录制分别记录。</p>`;
  }
  function outputInstruction(u){
    if([0,4].includes(lesson.day)){
      const input=lesson.repair?lesson.remedialUnit:lesson.skillUnits.listening,m=input.listening[lesson.day===0?0:1];
      return '先不看文本，用自己的话说明刚才录音的主要信息；初学者能说1–2句即可。再换成自己的生活情境：'+(m.support?.transfer||'讲一个与材料主题相关的经历。')+(lesson.day===4?'第二遍练意群和停顿，比较两次录音是否更清楚，不追求单纯加速。':'先保存首录，再听原音对照。');
    }
    if(lesson.day===1)return '遮住刚才的阅读，用3–5句说明其中的人、时间、地点或条件；选择两个学过的词块，用在自己的新句子里。';
    if(lesson.day===5)return '改变本周材料中的人物、地点或条件，解决一个新情境。先口头解释你的选择，再写出一个实际请求或建议。参考任务：'+u.writing.prompt;
    if(lesson.day===6)return '修改本周的一份原稿或重新录音；只改2–3个问题，然后换一个时间、人物或条件，检验能否独立表达。';
    return lesson.day===3?u.writing.prompt:u.speaking.prompt;
  }
  function lessonFeedback(u){const attempts=state.attempts.filter(a=>a.epochId===state.currentEpochId&&a.taskId===lesson.taskId&&a.kind==='output');return `<h3>这次，只改2–3个问题。</h3><p class="help">先保存原稿或录音。复制提示词到现有ChatGPT或豆包，把反馈粘回网站。等待太久就标为待反馈，移到次日对应时段。</p>${attempts.length?`<label class="field">选择原始产出<select id="feedback-attempt">${attempts.map(a=>`<option value="${a.id}">${new Date(a.createdAt).toLocaleString()} · ${a.first?'首次':'后续'} · ${a.output.slice(0,35)}</option>`).join('')}</select></label><div class="row"><button data-action="copy-feedback" class="secondary">复制写作 / 口语反馈提示词</button><button data-action="feedback-editor" class="primary">粘回结构化反馈</button><button data-action="pending-feedback">标为待反馈</button><button data-action="copy-scenario">复制情境练习提示词</button></div>`:'<p class="empty">还没有保存本任务原稿。先回到主动输出，再求助AI。</p>'}<details><summary>没有AI时如何复盘？</summary><p>对照任务要求和例句检查信息是否齐全；回放录音并对照真人目标音。保存 self 来源的反馈，引用原句或时间点，写两个具体动作。</p></details><p class="notice">AI没收到实际音频时，不能评价发音。自评和AI估计只作训练参考。</p>`;}
  function saveDayBox(u){const task=lesson.taskId,n=state.attempts.filter(a=>a.epochId===state.currentEpochId&&a.taskId===task),note=state.dailyNotes?.[task];return `<h3>保存今天的一点变化。</h3><p>本任务已有 ${n.length} 次产出。写下哪句能独立说出、哪处仍困难。</p><form data-form="daily-note" data-task="${task}">${area('reflection','今天的变化与下一步',note?.text||'',4)}<button class="primary" type="submit">保存复盘并生成打卡摘要</button></form>${lesson.day===6?weeklyCheckBox(u):''}<p class="help">保存记录只表示完成了这次活动。阶段进展看新材料理解、延迟提取和实际输出。</p>`;}
  function weeklyCheckBox(u){const a=state.attempts.filter(x=>x.taskId===lesson.taskId&&x.materialId===u.transfer.id).at(-1),cards=Object.values(state.cards).filter(x=>x.lastDate===E.today());return `<div class="notice"><h4>本周迁移检查</h4><p>迁移阅读：${a?`${a.percent}% · ${a.seenBefore?'已见':'首次'} · ${a.assistance==='none'?'独立':'有提示'}`:'尚未提交'}。今天已提取 ${cards.length} 个词句。</p><button data-action="save-weekly-check" class="secondary">保存阶段检查依据</button><p class="tiny">只有首答、无提示、未见材料才进入调整参考；课程阈值不换算 IELTS 分数。</p></div>`;}
  function renderCourse(){
    const status=u=>{const checks=state.checks.filter(c=>c.epochId===state.currentEpochId&&c.week===u.week&&c.unseen);const c=checks.at(-1);return c?(c.comprehension>=80&&c.recall>=80&&c.outputComplete?'迁移达参考线':'待补强'):used.has(u.week)?'有练习产出':'尚未提交';};
    const phase=E.PHASES.find(p=>p.id===phaseFilter)||E.PHASES[0],units=C.units.filter(u=>u.week>=phase.start&&u.week<=phase.end);
    const used=new Set(state.attempts.filter(a=>a.epochId===state.currentEpochId).map(a=>unitFor(a.materialId)?.week).filter(Boolean));
    return heading('YOUR LEARNING MAP','远处的目标，拆成小步。','78周的完整材料已经按任务排列。计划位置、练过和掌握证据分别显示。')+
      `<div class="metric-grid"><div class="metric"><strong>78</strong><small>周单元 · 546天任务</small></div><div class="metric"><strong>156</strong><small>本地真人朗读 + 分级对话入口</small></div><div class="metric"><strong>156</strong><small>核心与迁移阅读</small></div><div class="metric"><strong>${used.size}</strong><small>周有实际产出 · 非能力认证</small></div></div>
      <div class="phase-tabs">${E.PHASES.map(p=>`<button class="${p.id===phaseFilter?'active':''}" data-action="phase" data-id="${p.id}">${p.title} <small>W${p.start}–${p.end}</small></button>`).join('')}</div><div class="notice"><b>${phase.title}</b> · ${phase.goal}。阶段晋级使用两组新材料和延迟提取；未达参考阈值时替换两个课时补强。</div><div class="unit-grid">${units.map(u=>`<article class="unit"><div class="row space"><span class="week">${String(u.week).padStart(2,'0')}</span><span class="pill ${used.has(u.week)?'good':''}">${status(u)}</span></div><h3>${esc(u.title.split(' · ')[0])}</h3><p>${esc(u.goal)}</p><span class="tiny">2份真人朗读 · 2份阅读 · 写说 · 复盘</span><button data-action="unit" data-week="${u.week}">查看本周材料与七天任务 →</button></article>`).join('')}</div><section class="card" style="margin-top:25px"><h3>材料审查不是数量审计</h3><p class="help">全部自编练习保留版本、来源与答案证据；目前仍需独立教师抽检。文库和真人朗读支持训练，完整 IELTS 模考另登记合法材料。</p>${C.limitations.map(x=>`<p class="tiny">${esc(x)}</p>`).join('')}</section>`;
  }
  function renderReview(){
    const current=state.feedback.filter(f=>f.epochId===state.currentEpochId),pending=current.filter(f=>(!f.retestAttemptId||!f.retestDelayed)),trends=E.trends(state),attempts=state.attempts.filter(a=>a.epochId===state.currentEpochId&&a.kind==='output').slice(-30).reverse();
    return heading('FEEDBACK → ACTION → RETEST','把反馈，变成下一次进步。','引用原句或音频时间点，每次改2–3个问题；修改稿、重录和新任务复测关联原始产出。')+
      `<div class="two-col"><section class="card"><div class="row space"><h2>待复测动作</h2><span class="pill">${pending.length} 项</span></div>${pending.length?pending.map(f=>feedbackItem(f)).join(''):'<p class="empty">保存结构化反馈后，网站会生成默认三天后的复测任务。</p>'}</section><section class="card"><h2>反复出现的错误</h2>${trends.length?trends.map(([tag,n])=>`<div class="row space review-item"><span>${esc(tag)}</span><span class="pill ${n>1?'warm':''}">${n} 次 · ${current.filter(f=>f.tags.includes(tag)&&f.retestResult==='improved'&&f.retestDelayed).length} 次改善</span></div>`).join(''):'<p class="help">目前没有反馈标签。这里统计具体错误，不用练习次数推断能力。</p>'}<h3 style="margin-top:25px">间隔提取</h3><p class="help">当前有 ${Object.values(state.cards).filter(c=>c.due<=E.today()).length} 项到期。复习最多10分钟，积压多时暂停新增。</p><a class="button secondary" href="#today">回到今天提取 →</a></section></div>
      <section class="card"><h2>原始产出与修改历史</h2>${attempts.length?attempts.map(a=>`<div class="review-item"><div class="row space"><b>${esc(a.taskId)}</b><span class="pill">${a.revisionOf?'修改稿':a.first?'首次原稿':'后续独立产出'}${state.pendingFeedback?.includes(a.id)?' · 待反馈':''}</span></div><p class="tiny">${new Date(a.createdAt).toLocaleString()} · ${a.assistance==='none'?'独立':'有辅助'} · ${(a.audioIds||[]).length} 条录音</p><p class="quote">${esc(a.output.slice(0,450))}${a.output.length>450?'…':''}</p><div class="row"><button class="small secondary" data-action="feedback-editor" data-attempt="${a.id}">粘回反馈</button><button class="small" data-action="copy-feedback" data-attempt="${a.id}">复制反馈提示词</button><button class="small" data-action="attempt-detail" data-id="${a.id}">完整产出与录音</button></div>${state.feedback.filter(f=>f.attemptId===a.id).map(f=>`<p class="tiny">已反馈：${esc(f.tags.join('、'))} · ${f.retestAttemptId?(f.retestDelayed?'已延迟复测 ':'当日重练，延迟复测仍需补 ')+esc(f.retestResult):'待复测 '+f.retestDate}</p>`).join('')}</div>`).join(''):'<p class="empty">先在今日课堂保存一份独立原稿或录音。它会成为复盘的起点。</p>'}</section>
      <section class="card"><h3>问题音复练</h3>${Object.values(state.pronunciation).filter(p=>p.problem).map(p=>`<div class="row review-item"><span>${esc(C.phonemes.find(x=>x.id===p.id)?.us||p.id)} · ${esc(p.note)} · ${p.due}</span><button class="small" data-action="phoneme" data-id="${p.id}">听 → 录 → A/B回放</button></div>`).join('')||'<p class="help">在发音自评中标记问题音，默认三天后复练。</p>'}</section>
      <section class="card"><h3>内容问题与修订记录</h3>${state.issues.filter(i=>i.kind==='content-report').map(i=>`<p class="help">${esc(i.questionId)} · ${esc(i.reason)} · <span class="pill warm">需修订，暂停计分</span></p>`).join('')||'<p class="help">发现题目与原文不一致时，在答案证据旁报告问题。历史答案保留，待修订题暂停计分。</p>'}</section>`;
  }
  function feedbackItem(f){return `<div class="review-item"><div class="row space"><b>${esc(f.tags.join('、'))}</b><span class="pill ${f.retestDate<=E.today()?'warm':''}">${f.retestDate<=E.today()?'到期':'复测 '+f.retestDate}</span></div><ul class="actions">${f.actions.map(a=>`<li>${esc(a)}</li>`).join('')}</ul><p class="tiny">${f.source==='ai'?'AI训练反馈':f.source==='self'?'自评':esc(f.source)} · 原任务 ${esc(state.attempts.find(a=>a.id===f.attemptId)?.taskId)}</p><button class="small secondary" data-action="retest" data-id="${f.id}">做一次新任务复测 →</button></div>`;}
  function renderEvidence(){
    const readiness=E.readiness(state),batches=state.batches.slice().reverse();
    return heading('EVIDENCE, NOT A PROMISE','用真实表现，判断下一步。','目标 IELTS General 总分6.5、单项6.0。课程、自评、AI估计与未见模考分别记录。')+
      `<section class="card"><div class="row space"><div><h2>${readiness.ready?'当前证据满足目标条件':'准备度证据仍需补齐'}</h2><p class="help">${readiness.ready?'这是已保存证据的状态，不保证实际考试结果。':readiness.reasons.join('；')}。</p></div><span class="pill ${readiness.ready?'good':'warm'}">${readiness.count} / 2 批有效记录</span></div><div class="metric-grid">${E.SKILLS.map(k=>{const latest=batches.find(b=>E.band(b.skills?.[k]?.band));return `<div class="metric"><strong>${latest?.skills[k].band??'—'}</strong><small>${titles[k]} · 最近录入，来源见批次</small></div>`;}).join('')}</div><details><summary>准备度如何判断？</summary><ul class="checklist"><li>两批不同未见材料、四科同日、目标分数达标。</li><li>听读有适用的官方换算或正式成绩证据。</li><li>写说有可识别的人工评分、维度和原始证据。</li><li>至少一次连续听读写及同日口语，无辅助、中断或时钟异常。</li><li>复盘完成。AI和自评不触发达标。</li></ul></details></section>
      <section class="card"><div class="row space"><h2>模考与分科材料</h2><button class="primary" data-action="new-batch">登记新测试批次 +</button></div><p class="help">免费官方样题属于训练。完整测试需要你合法取得的材料；登记不会下载或复制受保护试卷。</p>${batches.length?batches.map(b=>batchItem(b,readiness)).join(''):'<p class="empty">尚无考试批次。先登记来源、测试编号、是否见过和考试形式，再开始计时。</p>'}</section>
      <section class="card"><h3>官方训练入口</h3><p>${link(C.officialSources.source,'IELTS General 官方样题')}</p>${resourceStatus(C.officialSources.source)}<p>${link('https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/general-training','British Council General 练习')}</p><p class="tiny">仅作合法来源入口，当前网络可能受限；不能把有限免费样题重复算作新模考。网站不提供考试报名或付费评分。</p><form data-form="targets"><div class="form-grid">${field('overall','总分目标',state.profile.overall,'number','min="0" max="9" step="0.5" required')}${field('minEach','单项底线',state.profile.minEach,'number','min="0" max="9" step="0.5" required')}</div><button type="submit" class="small">保存目标</button></form></section>`;
  }
  function batchItem(b,r){const detail=r.details.find(x=>x.batch.id===b.id),total=E.overall(b.skills||{}),running=state.sessions.find(s=>s.batchId===b.id&&s.status==='running');return `<article class="review-item"><div class="row space"><h3>${esc(b.material.testId)} · ${b.date}</h3><span class="pill ${!detail.reasons.length?'good':'warm'}">${!detail.reasons.length?'有效目标证据':'证据待补齐'}</span></div><p class="tiny">${esc(b.material.sourceId)} · ${b.material.seen==='unseen'?'登记为未见':b.material.seen==='repeated'?'重复材料':'未确认'} · ${b.format==='computer'?'机考':'纸笔'} · ${b.assistance==='none'?'无辅助':'有辅助'}</p><p>${link(b.material.url,'打开材料来源')}</p><div class="row">${E.SKILLS.map(k=>`<span class="pill">${titles[k]} ${b.skills?.[k]?.band??'—'}</span>`).join('')}<span class="pill">总分 ${total??'—'}</span></div>${running?`<p class="notice">${titles[running.skill]}正在计时。切回考试面板可查看；刷新会记录中断。</p>`:''}<p class="help" style="margin-top:12px">${detail.reasons.map(x=>esc(x.replace(/listening/g,'听力').replace(/reading/g,'阅读').replace(/writing/g,'写作').replace(/speaking/g,'口语'))).join('；')||'两次不同有效批次及连续考试条件仍须整体判断。'}</p><div class="row"><button class="small primary" data-action="exam-panel" data-id="${b.id}">分科计时与证据</button><button class="small secondary" data-action="score-editor" data-id="${b.id}">录入 / 修改成绩</button><button class="small" data-action="batch-review" data-id="${b.id}">${b.reviewed?'查看 / 修改复盘':'保存考试复盘'}</button></div></article>`;}
  function renderLibrary(){
    const archiveDays=state.archives.filter(x=>x.kind==='legacy-progress').reduce((n,x)=>n+Object.keys(x.progress?.days||{}).length,0);
    return heading('YOUR MATERIALS & YOUR DATA','把学习成果，留在自己手里。','本机保存文字和录音；学习包保存两者的关联。飞书用于手动打卡摘要，设备间没有自动同步。')+
      `<div class="two-col"><section class="card"><h2>完整学习包</h2><p class="help">导出ZIP：学习记录、原始录音、写作、反馈和版本清单。每个文件都有校验值。</p><button class="primary" data-action="export-bundle">一键导出学习包 ↓</button><p id="backup-status" class="help" style="margin-top:13px"></p><hr style="border:0;border-top:1px solid var(--line);margin:24px 0"><h3>恢复或迁移</h3><label class="field">选择ZIP、旧JSON或旧学习包<input class="file" id="import-bundle" type="file" accept=".zip,.json,application/zip,application/json"></label><p id="import-status" class="help">先检查全部文件和录音，确认结果后才切换当前数据。默认合并，冲突保留双方。</p><div id="restore-controls" hidden><label class="inline"><input type="radio" name="restore-mode" value="merge" checked>合并记录，保留冲突版本</label><label class="inline"><input type="radio" name="restore-mode" value="replace">切换为导入数据（当前完整数据保留回滚）</label><button class="primary" data-action="restore">备份当前数据并恢复</button></div></section>
      <section class="card"><h2>本机与历史档案</h2><p class="help">当前周期：${state.epochs.find(e=>e.id===state.currentEpochId)?.start||'诊断中'}<br>旧版迁移：${archiveDays}天文字记录<br>录音：<span id="audio-count">正在读取…</span></p>${state.epochs.length?`<label class="field">切换已保存学习周期<select id="epoch-select">${state.epochs.map(e=>`<option value="${e.id}" ${e.id===state.currentEpochId?'selected':''}>${e.start} · ${e.id.slice(0,8)}</option>`).join('')}</select></label>`:''}<div class="row"><button class="secondary" data-action="download-all-audio">批量下载录音ZIP</button><button data-action="export-json">导出纯文字JSON</button><button data-action="legacy-archive">查看旧版档案</button></div><p class="notice warning" style="margin-top:17px">纯文字JSON不含录音。浏览器清理和设备更换会影响本机记录，请定期保存完整学习包。</p><button data-action="rollback-import" class="small">恢复上次导入前的数据</button></section></div>
      <section class="card"><div class="row space"><h2>发音与开口</h2><span class="pill">美式主练 · 英式对照</span></div><p class="help">真人目标音、来源示范、录音、A/B回放和问题音复练。没有例词真人配音时明确使用文本练习。</p><div class="phoneme-grid">${C.phonemes.map(p=>`<button data-action="phoneme" data-id="${p.id}"><b>${esc(p.us||p.symbol)}</b><small>${esc(p.examples?.[0]||p.zh)}</small></button>`).join('')}</div></section>
      <section class="card"><h2>离线课程与材料目录</h2><p class="help">完整离线包包含全部文字、本地真人音频、许可与网站文件。外部真人对话和视频仍需联网。</p><div class="row"><a class="button primary" href="downloads/english-course-v3.zip" download>下载完整离线课程 ↓</a><button data-action="material-list">查看全部156份真人录音清单</button><a class="button" href="assets/human/CREDITS.txt" download>音频许可与署名</a></div><details><summary>按阶段下载（每包有全部文字，真人录音分阶段配备）</summary><div class="row">${C.phases.map(p=>`<a class="button small" href="downloads/english-course-${p.id}-v3.zip" download>${esc(p.title)} · W${p.start}–W${p.end}</a>`).join('')}</div><p class="help">阶段包解压到同一课程目录可补充媒体；完整版一次包含全部本地录音。学习记录须另外导出，不在课程安装包里。</p></details><p class="tiny" style="margin-top:12px">建议解压后用随包的本地服务启动器访问；直接打开HTML时，按页面实际提示检查录音能力。</p><details><summary>课程质量、学习方法与材料边界</summary>${C.limitations.map(x=>`<p class="help">${esc(x)}</p>`).join('')}<p>${link('https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html','主动提取与间隔练习研究综述')}</p><p>${link('https://www.wgtn.ac.nz/lals/resources/paul-nations-resources/paul-nations-publications/publications/documents/2007-Four-strands.pdf','Nation语言学习四要素')}</p><p class="help">每天的具体分钟分配是教学设计选择，不是保证提分的公式。</p></details></section>
      <section class="card"><h2>飞书打卡与学习摘要</h2><p class="help">摘要包含任务、实际产出、困难和复测安排。复制后手动粘贴到自己的飞书打卡位置。</p><div class="row"><button class="secondary" data-action="copy-summary">复制今天摘要</button><button data-action="export-csv">下载学习CSV</button>${state.profile.feishuUrl?link(state.profile.feishuUrl,'打开我的飞书打卡'):''}</div><form data-form="feishu" style="margin-top:15px">${field('url','可选：你的飞书打卡网址',state.profile.feishuUrl||'','url')}<button type="submit" class="small">保存打卡入口</button></form></section>`;
  }
  function feedbackEditor(id){
    id=id||document.getElementById('feedback-attempt')?.value;
    const a=state.attempts.find(x=>x.id===id);if(!a)throw Error('先选择已保存的原稿或录音');
    const example={source:'self',audioReceived:!!a.audioIds?.length,dimensions:{task:'',coherence:'',lexical:'',grammar:''},evidence:[{quote:a.output.slice(0,60),comment:''}],tags:['请填写具体错误'],actions:['请填写动作一','请填写动作二']};
    showModal('反馈必须指向下一次练习',`<p class="help">关联 ${esc(a.taskId)} · ${new Date(a.createdAt).toLocaleString()}。粘贴JSON后会校验原句、来源和2–3个动作；默认三天后复测。</p><form data-form="feedback" data-attempt="${a.id}">${area('json','结构化反馈JSON',JSON.stringify(example,null,2),15)}<button class="primary" type="submit">检查并保存反馈</button></form>`);
  }
  function phonemePanel(id){
    const p=C.phonemes.find(x=>x.id===id);if(!p)throw Error('音素不存在');const task='phoneme-'+id,saved=state.pronunciation[id];
    showModal(`${esc(p.us||p.symbol)} · ${esc(p.zh)}`,`<p class="help">看真人示范 → 听目标音 → 读例词 → 录音 → A/B回放 → 自评 → 延迟复练。</p><p>${esc(p.tip)}</p><div class="audio-panel"><b>目标音 · 本地真人录音</b>${p.localAudio?`<audio id="phoneme-target" controls src="${esc(p.localAudio)}"></audio>`:'<p class="notice warning">暂无本地真人目标音；可打开示范来源，或先做文本练习。</p>'}<p class="source">${esc(p.credit?.license||'暂无许可记录')} · ${p.credit?link(p.credit.url,'原录音与署名'):''}</p><p class="tiny">${id==='er'||id==='er_weak'?'/ɝ/与/ɚ/当前共用样本，需结合例词和重音理解。':''}独立音素不是例词或句子的真人配音。</p></div><p><b>例词文本练习：</b>${esc(p.examples.join(' · '))}</p><p class="help">${esc(Object.entries(p.mouth||{}).map(([k,v])=>v).join('；'))}</p>
      ${p.media?.length?`<details><summary>真人口型与舌位示范（联网，待核验）</summary>${p.media.map((m,i)=>`<div><p>${esc(m.provider)} · ${esc(m.kind)}</p><button class="small" data-action="load-video" data-phoneme="${id}" data-index="${i}">加载播放器</button> ${link(m.url,'打开来源页')}<div id="video-${id}-${i}"></div><p class="tiny">核验状态：未人工核验。播放器受限时使用来源页、本地目标音与文字说明。</p>${resourceStatus(m.url)}</div>`).join('')}</details>`:''}${recordingBox(task)}<div class="row"><button data-action="ab-target" class="small">A：播放目标音</button><button data-action="ab-self" data-task="${task}" class="small">B：回放最新录音</button></div><form data-form="pronunciation" data-id="${id}" style="margin-top:18px">${select('rating','自评',[['uncertain','还不确定'],['difficult','区别听得到，自己还不稳定'],['improved','比上一遍更清楚']],saved?.rating||'uncertain')}${area('note','下一遍只改什么？',saved?.note||'',3)}<label class="inline"><input type="checkbox" name="problem" ${saved?.problem?'checked':''}>标记为问题音，三天后复练</label><button type="submit" class="primary">保存自评与复练</button></form><p class="tiny">不提供音素级机器评分。ELSA等外部反馈可作为训练参考，自行记录来源。</p>`);bindRendered();
  }
  function batchEditor(){showModal('登记合法、未见的测试材料',`<p class="help">测试编号用于识别同一套材料；换网址、镜像或重复填写不能产生新的未见证据。四科须同一日期和批次。</p><form data-form="new-batch"><div class="form-grid">${field('sourceId','材料提供方 / 来源标识','','text','required')}${field('testId','具体测试编号','','text','required')}${field('url','合法材料来源网址','','url','required')}${field('date','测试日期',E.today(),'date','required')}${select('seen','材料状态',[['unknown','未确认'],['unseen','尚未看过题目、答案或内容'],['repeated','已练过 / 已看过']],'unknown')}${select('format','考试形式',[['computer','机考'],['paper','纸笔']],'computer')}${select('assistance','辅助使用',[['none','无辅助'],['minor','少量提示'],['heavy','翻译 / AI等明显辅助']],'none')}${select('kind','记录类型',[['mock','未见模考'],['sample','官方样题训练'],['course','课程练习'],['repeat','重复练习']],'mock')}</div><button class="primary" type="submit">保存测试批次</button></form>`);}
  function scoreEditor(id){
    const b=state.batches.find(x=>x.id===id);if(!b)throw Error('找不到测试批次');
    showModal('保存四科成绩与来源',`<p class="help">未取得适用的官方换算时只保存听读原始分。写说分别记录人工、AI或自评；AI和自评不会触发准备度。</p><form data-form="scores" data-batch="${id}">${E.SKILLS.map(k=>{const r=b.skills?.[k]||{};return `<fieldset class="question"><legend>${titles[k]}</legend><div class="form-grid">${field(k+'Band','Band（未知可留空）',r.band??'','number','min="0" max="9" step="0.5"')}${['listening','reading'].includes(k)?field(k+'Raw','原始分 / 40',r.raw??'','number','min="0" max="40" step="1"'):field(k+'Rater','评分者姓名或机构',r.rater||'')+field(k+'Qualification','评分资格依据（资质、经历或可核对的链接）',r.raterQualification||'')}${select(k+'Source','评分来源',[['training','课程训练'],['ai','AI训练估计'],['self','自评'],['teacher','教师评分'],['examiner','考官评分'],['conversion','适用的官方换算'],['official-result','正式成绩']],r.scoreSource||'training')}${field(k+'Evidence','原稿 / 答案 / 评分报告等证据',r.evidence||'')}</div>${['listening','reading'].includes(k)?`<details><summary>粘贴适用的官方换算表JSON（不自动套通用表）</summary><p class="tiny">需官方网址、当前测试编号、考试形式、科目及分数区间。示例区间仅示范格式，请替换为实际来源。</p>${area(k+'Table','换算表',r.table?JSON.stringify(r.table,null,2):'',5)}<p class="tiny">格式：{"url":"官方来源","testId":"本测试编号","format":"${b.format}","skill":"${k}","rows":[{"min":0,"max":0,"band":0}]}</p></details>`:`<div class="form-grid">${(k==='writing'?['task','coherence','lexical','grammar']:['fluency','lexical','grammar','pronunciation']).map(d=>field(k+'Dim_'+d,({task:'任务完成',coherence:'组织',lexical:'词汇',grammar:'语法',fluency:'流利度',pronunciation:'发音'})[d],r.dimensions?.[d]||'')).join('')}</div>`}</fieldset>`;}).join('')}<button class="primary" type="submit">保存成绩与证据</button></form>`);
  }
  function examPanel(id){
    const b=state.batches.find(x=>x.id===id);if(!b)throw Error('找不到测试批次');
    const running=state.sessions.find(s=>s.batchId===id&&s.status==='running'),sessions=state.sessions.filter(s=>s.batchId===id);
    showModal('按分科保存考试条件',`<p class="help">${esc(b.material.testId)} · ${b.date} · ${b.format==='computer'?'机考':'纸笔'}。听读写顺序连续，口语同日独立完成。退出/刷新会记录中断；修改系统时间不能制造连续记录。</p>${b.date!==E.today()?'<p class="notice warning">仅当前实际日期可启动计时。历史成绩可录入，但不能补造历史计时。</p>':''}
      <div class="row">${E.SKILLS.map(k=>`<button class="${running?.skill===k?'primary':''}" data-action="exam-start" data-batch="${id}" data-skill="${k}" ${running||b.date!==E.today()?'disabled':''}>${titles[k]} · ${k==='reading'||k==='writing'?'60分':k==='speaking'?'11–14分':'按材料'}</button>`).join('')}</div>
      ${running?`<div class="timer running" data-exam-clock="${running.id}">正在同步计时…</div><div class="row"><button data-action="exam-pause" data-id="${running.id}">暂停 / 中断</button><button class="primary" data-action="exam-finish" data-id="${running.id}">结束并保存实际时长</button></div>`:`<p class="help" style="margin-top:15px">先选择一科开始。听力须按材料说明选择30–40分钟；纸笔转写与机考核对时间分别处理。</p>`}
      ${sessions.filter(s=>s.status==='interrupted').map(s=>`<p class="notice warning">${titles[s.skill]}已中断 ${s.interruptions} 次；继续练习仍保留中断，不能作为连续无辅助证据。<button class="small" data-action="exam-resume" data-id="${s.id}" ${running?'disabled':''}>继续本次练习</button></p>`).join('')}
      <div class="table-wrap"><table><thead><tr><th>科目</th><th>实际分钟</th><th>状态</th><th>中断</th></tr></thead><tbody>${sessions.map(s=>`<tr><td>${titles[s.skill]}</td><td>${(s.elapsed/60).toFixed(1)} / ${s.target/60}</td><td>${esc(s.status)}</td><td>${s.interruptions}${s.clockAnomaly?' · 时钟异常':''}</td></tr>`).join('')}</tbody></table></div><p class="tiny">计时记录与对应科目的答案、作文、录音和评分来源一起判断；单有计时不会达标。</p>`);updateClock();
  }
  async function bindRendered(){
    for(const el of document.querySelectorAll('[data-quiz-key]')){
      const key=el.dataset.quizKey;if(quizContexts.has(key))continue;
      const id=key.slice(key.indexOf('/')+1),m=material(id);if(!m)continue;
      quizContexts.set(key,{wasSeen:E.seen(state,m),hinted:false,submitted:false,answers:{}});
      await run(()=>transact(s=>E.expose(s,m,'lesson-open')));
    }
    for(const host of document.querySelectorAll('[data-clips]'))await run(()=>loadClips(host));
    const count=document.getElementById('audio-count');if(count)await run(async()=>{const list=await S.clips();if(count.isConnected)count.textContent=list.length+'条原始音频';});
    document.getElementById('diagnostic-writing')?.focus?.();
  }
  async function loadClips(host){
    let list=await S.clips(host.dataset.clips);const ids=host.dataset.clipIds?E.safeParse(host.dataset.clipIds):null;list=ids?list.filter(c=>ids.includes(c.id)):list.filter(c=>c.epochId===state.currentEpochId||host.dataset.clips.startsWith('phoneme-'));if(!host.isConnected)return;
    host.innerHTML=list.length?list.map(c=>{const url=URL.createObjectURL(c.blob);objectUrls.push(url);return `<div class="clip"><div class="row space"><span class="tiny">${esc(c.name||'我的录音')} · ${c.origin==='import'?'导入文件':c.origin?.startsWith('legacy')?'历史录音':'实际录制'}</span><button class="small" data-action="download-audio" data-id="${c.id}">下载</button></div><audio controls src="${url}" data-clip-id="${c.id}"></audio></div>`;}).join(''):'<p class="tiny">本任务还没有录音。录制或导入后，文件和任务会一同保存。</p>';
  }
  async function saveClip(task,blob,origin){
    if(!blob.size)throw Error('录音为空，未保存');
    const clip={id:E.uid(),taskId:task,epochId:state.currentEpochId,name:(origin==='import'?'导入':'录音')+' '+new Date().toLocaleString(),recordedAt:new Date().toISOString(),origin,blob};
    await transact(s=>{
      // Associate clips only when the learner saves a new output attempt.
      // A later recording must never change the original attempt's evidence.
      if(task.startsWith('phoneme-')){const id=task.slice(8);s.pronunciation[id]||={audioIds:[]};s.pronunciation[id].audioIds||=[];s.pronunciation[id].audioIds.push(clip.id);}
    },[clip]);return clip;
  }
  async function startRecording(task){
    if(recorder)throw Error('先停止当前录音');
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('当前浏览器不能录音，请使用HTTPS/本地HTTP或导入音频文件');
    recordStream=await navigator.mediaDevices.getUserMedia({audio:true});
    try{
      const type=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
      recorder=new MediaRecorder(recordStream,type?{mimeType:type}:{});const chunks=[],started=Date.now(),actualRecorder=recorder;
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=e=>{toast('录音失败：'+(e.error?.message||'设备错误'),true);recordStream?.getTracks().forEach(t=>t.stop());};
      recorder.onstop=()=>run(async()=>{
        clearInterval(recordTimer);const blob=new Blob(chunks,{type:actualRecorder.mimeType||'audio/webm'});recorder=null;recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;
        await saveClip(task,blob,'recorded');toast('录音与任务已保存');
        for(const host of document.querySelectorAll('[data-clips]'))if(host.dataset.clips===task)await loadClips(host);
        document.querySelectorAll('[data-action="record"]').forEach(b=>b.disabled=false);document.querySelectorAll('[data-action="stop-record"]').forEach(b=>b.disabled=true);
        document.querySelectorAll('.record-status').forEach(el=>el.textContent='已保存本次录音');
      });
      recorder.start(1000);document.querySelectorAll('[data-action="record"]').forEach(b=>b.disabled=true);document.querySelectorAll('[data-action="stop-record"]').forEach(b=>b.disabled=false);
      recordTimer=setInterval(()=>document.querySelectorAll('.record-status').forEach(el=>el.textContent='正在录音 '+Math.floor((Date.now()-started)/1000)+'秒'),1000);
    }catch(e){recordStream.getTracks().forEach(t=>t.stop());recordStream=null;recorder=null;throw e;}
  }
  function stopRecording(){if(recorder&&recorder.state!=='inactive')recorder.stop();}
  function tickSession(){
    if(!examRuntime)return;const s=state.sessions.find(x=>x.id===examRuntime.id);if(!s||s.status!=='running')return;
    const monotonic=(performance.now()-examRuntime.mono)/1000,wall=(Date.now()-examRuntime.wall)/1000;
    s.elapsed=examRuntime.elapsed+Math.max(0,monotonic);
    if(Math.abs(monotonic-wall)>5||E.today()!==s.date){s.clockAnomaly=true;s.reason='系统时间变化或跨日，不能作为连续证据';}
  }
  function updateClock(){tickSession();document.querySelectorAll('[data-exam-clock]').forEach(el=>{const s=state.sessions.find(x=>x.id===el.dataset.examClock);if(!s)return;const seconds=Math.max(0,Math.ceil(s.target-s.elapsed));el.textContent=seconds?`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`:'时间已到：停止作答并结束计时';});}
  function startTicker(session){
    clearInterval(examTicker);examRuntime={id:session.id,wall:Date.now(),mono:performance.now(),elapsed:session.elapsed};
    let n=0;examTicker=setInterval(()=>{updateClock();if(++n%10===0)run(()=>transact(()=>{}));},1000);
    localStorage.setItem('little-english-v3-running',session.id);
  }
  async function finishSession(id,status){
    tickSession();const before=state.sessions.find(s=>s.id===id);if(!before||before.status!=='running')throw Error('没有正在进行的这一科');
    await transact(s=>{const x=s.sessions.find(x=>x.id===id);x.endedAt=Date.now();x.endedPerf=performance.now();
      if(status==='interrupted'){x.status='interrupted';x.interruptions++;x.reason='用户暂停';}
      else {x.status=x.elapsed<x.target?'incomplete':x.elapsed>x.target+10?'overrun':'complete';x.reason=x.status==='incomplete'?'提前结束，未满足计时条件':x.status==='overrun'?'超出规定时长与10秒收尾偏差，不作有效考试证据':'';}
      const b=s.batches.find(b=>b.id===x.batchId);b.skills[x.skill]||={};b.skills[x.skill].sessionId=x.id;
    });clearInterval(examTicker);examTicker=null;examRuntime=null;localStorage.removeItem('little-english-v3-running');
  }
  function summary(){
    const attempts=state.attempts.filter(a=>a.date===E.today()&&a.epochId===state.currentEpochId),feedback=state.feedback.filter(f=>f.epochId===state.currentEpochId&&(!f.retestAttemptId||!f.retestDelayed)),notes=Object.values(state.dailyNotes||{}).filter(n=>n.date===E.today());
    return `英语学习打卡 ${E.today()}\n目标：IELTS General ${state.profile.overall}，单项${state.profile.minEach}\n计划预算：每天60分钟（完整模考日另约3小时）\n实际保存：${attempts.length}次产出；首次${attempts.filter(a=>a.first).length}，复练${attempts.filter(a=>!a.first).length}\n`+
      attempts.map(a=>`${a.taskId} · ${a.kind} · ${a.percent===null?'原稿/录音':a.percent+'%（训练）'} · ${a.assistance==='none'?'独立':'有辅助'}\n${a.output?a.output.slice(0,180):''}`).join('\n')+
      '\n今天的变化：\n'+notes.map(n=>n.text).join('\n')+'\n待复测：\n'+feedback.map(f=>`${f.retestDate} ${f.tags.join('、')}：${f.actions.join('；')}`).join('\n')+'\n本站保存原始记录与录音；飞书摘要由我手动同步。';
  }
  async function actions(button){
    const a=button.dataset.action;
    if(a==='diagnostic'){diagnosticDay=Number(button.dataset.day);lesson=null;render();document.getElementById('diagnostic')?.scrollIntoView({behavior:'smooth'});}
    else if(a==='begin-epoch'){await transact(s=>E.beginEpoch(s));date=E.today();lesson=null;render();toast('新周期已建立，从明天开始；今天仍可查看诊断');}
    else if(a==='start-lesson'){lesson=E.schedule(state,C,date);if(lesson.status!=='active')throw Error('当前日期还没有正式课时');step=0;render();document.getElementById('lesson')?.scrollIntoView({behavior:'smooth'});}
    else if(a==='day'){const d=E.info(state,date);date=E.addDays(d.epoch.start,(d.week-1)*7+Number(button.dataset.day));lesson=null;render();}
    else if(a==='step'){step=Number(button.dataset.step);render();document.getElementById('lesson')?.scrollIntoView({behavior:'smooth'});}
    else if(a==='training-section'){lesson={...lesson,mode:'normal',steps:[{minutes:10,label:'回想与复习'},{minutes:20,label:'教学材料'},{minutes:15,label:'输出'},{minutes:10,label:'反馈'},{minutes:5,label:'复盘'}]};step=1;render();}
    else if(a==='phase'){phaseFilter=button.dataset.id;render();}
    else if(a==='unit'){
      const u=C.units[Number(button.dataset.week)-1];showModal(`W${u.week} · ${esc(u.title)}`,`<p>${esc(u.goal)}</p><p class="tiny">${esc(u.difficulty.label)}，未经标准化校准 · 教学材料已配齐，独立人工审查待完成。</p><ol class="rhythm">${E.THEMES.map((t,i)=>`<li>${i+1}. ${t}<b>${u.week>=45&&[1,3].includes(i)?'60分专项':[56,68,76].includes(u.week)&&i===5?'另约180分':'60分'}</b></li>`).join('')}</ol><div class="row" style="margin-top:18px"><button data-action="preview-reading" data-material="${u.reading.id}">核心阅读</button><button data-action="preview-listening" data-material="${u.listening[0].id}">真人听力1</button><button data-action="preview-listening" data-material="${u.listening[1].id}">真人听力2</button><button data-action="preview-transfer" data-material="${u.transfer.id}">迁移阅读（查看后不再未见）</button><button data-action="grammar" data-week="${u.week}">句法与表达</button></div><details><summary>写作与口语任务</summary><p>${esc(u.writing.prompt)}</p>${u.writing.task2?`<p>${esc(u.writing.task2)}</p>`:''}<p>${esc(u.speaking.prompt)}</p></details><p class="help">浏览不会记为完成，但看到迁移材料会保存已见记录。</p>`);
    }
    else if(['preview-reading','preview-listening','preview-transfer','harder-diagnostic'].includes(a)){
      const m=a==='harder-diagnostic'?C.diagnostic.harderReading:material(button.dataset.material);
      if(a==='harder-diagnostic'&&!state.attempts.some(x=>x.taskId==='diagnostic-2'&&x.percent>=80))throw Error('先独立完成基础阅读；达到80%后再尝试更难材料');
      showModal(esc(m.title),quizBox(m,a==='harder-diagnostic'?'diagnostic-2-harder':'preview-'+m.id,'practice'));await bindRendered();
    }
    else if(a==='grammar'){
      const u=C.units[Number(button.dataset.week)-1],g=u.grammar;showModal(`句法与表达 · ${esc(g.title)}`,quizBox(g,'grammar-'+u.id));await bindRendered();
    }
    else if(a==='hint'){
      const ctx=quizContexts.get(button.dataset.key);if(!ctx)throw Error('练习尚未准备好');ctx.hinted=true;const m=material(button.dataset.key.slice(button.dataset.key.indexOf('/')+1));
      const host=button.closest('[data-quiz-key]'),hint=host.querySelector('.quiz-hint');hint.innerHTML=quizHint(m);hint.hidden=false;toast('本次作答已标为有提示');
    }
    else if(a==='segment'){
      const audio=document.querySelector(`[data-material-audio="${button.dataset.material}"]`);if(!audio)throw Error('目标音频不在当前页面');audio.currentTime=Number(button.dataset.start);await audio.play();const end=Number(button.dataset.end);const stop=()=>{if(audio.currentTime>=end){audio.pause();audio.removeEventListener('timeupdate',stop);}};audio.addEventListener('timeupdate',stop);
    }
    else if(a==='record')await startRecording(button.dataset.task);
    else if(a==='stop-record')stopRecording();
    else if(a==='download-audio'){const c=(await S.clips()).find(x=>x.id===button.dataset.id);if(!c)throw Error('录音不存在');download(c.blob,c.id+(c.blob.type.includes('mpeg')?'.mp3':'.webm'));}
    else if(a==='copy-scenario'){const u=lesson?.unit||C.units[0];await copyText('你是我的英语情境练习搭档。先问我一个问题，等待我的独立回答再继续，不要预先替我写答案。场景：'+u.speaking.prompt+'。用适合初学者的短句；遇到困难先降低难度。每次只纠正2个影响表达的问题，引用我的原句；没有收到实际音频不能评价发音。最后要求我不看范例换情境重说，并把反馈按 source、audioReceived、dimensions、evidence、tags、actions 的JSON结构输出。');}
    else if(a==='copy-feedback'){const id=button.dataset.attempt||document.getElementById('feedback-attempt')?.value,x=state.attempts.find(x=>x.id===id);if(!x)throw Error('先保存并选择原稿');await copyText(E.feedbackPrompt(x,x.audioIds.length?'speaking':'writing'));}
    else if(a==='feedback-editor')feedbackEditor(button.dataset.attempt);
    else if(a==='pending-feedback'){await transact(s=>{s.pendingFeedback||=[];const id=document.getElementById('feedback-attempt')?.value;if(id&&!s.pendingFeedback.includes(id))s.pendingFeedback.push(id);});toast('已标为待反馈，下次替换反馈环节完成');}
    else if(a==='attempt-detail'){const x=state.attempts.find(x=>x.id===button.dataset.id);showModal('原始产出',`<p class="quote">${esc(x.output)}</p><p class="help">这里只回放该次产出保存时关联的 ${(x.audioIds||[]).length} 条原始录音。</p><div data-clips="${esc(x.taskId)}" data-clip-ids="${esc(JSON.stringify(x.audioIds||[]))}"></div>`);await bindRendered();}
    else if(a==='retest'){const f=state.feedback.find(x=>x.id===button.dataset.id),original=state.attempts.find(x=>x.id===f.attemptId);showModal('新任务复测',`<p class="help">原任务 ${esc(original.taskId)}。换一个人物、时间、条件或观点，独立表达；检查这些动作是否能迁移：${esc(f.actions.join('；'))}。</p><form data-form="retest" data-feedback="${f.id}">${area('output','新的独立表达','',7)}${select('result','与原稿比较',[['improved','已改善'],['partial','部分改善'],['unchanged','仍需复练']],'partial')}<button class="primary" type="submit">保存复测与关联</button></form>${recordingBox('retest-'+f.id)}`);await bindRendered();}
    else if(a==='phoneme')phonemePanel(button.dataset.id);
    else if(a==='load-video'){const p=C.phonemes.find(x=>x.id===button.dataset.phoneme),m=p.media[Number(button.dataset.index)],host=document.getElementById(`video-${p.id}-${button.dataset.index}`);host.innerHTML=`<div class="phoneme-video"><iframe src="${esc(m.video)}" title="${esc(m.title)}" allow="fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p class="notice warning">如出现配置错误，原因未确认。${link(m.url,'改用来源页')}；也可继续本地目标音、例词文本和录音练习。</p>`;}
    else if(a==='ab-target'){document.querySelectorAll('audio').forEach(el=>el.pause());await document.getElementById('phoneme-target')?.play();}
    else if(a==='ab-self'){const audios=document.querySelector(`[data-clips="${button.dataset.task}"]`)?.querySelectorAll('audio');if(!audios?.length)throw Error('先保存一条录音');document.querySelectorAll('audio').forEach(el=>el.pause());await audios[audios.length-1].play();}
    else if(a==='report-question'){showModal('标记需修订题目',`<form data-form="report" data-question="${button.dataset.question}" data-material="${button.dataset.material}">${area('reason','哪里与原文不一致？请引用证据','',4)}<p class="help">该题会暂停计分；历史答案保留。修订与发布需要重新检查版本。</p><button type="submit" class="primary">保存问题</button></form>`);}
    else if(a==='conversation'){
      const m=material(button.dataset.material),v=m.conversation;
      await transact(s=>E.expose(s,{id:m.id+'-conversation',sourceId:v.sourceId},'online-conversation'));
      showModal('真人对话独立练习',`<p>${link(v.url,'打开全文、题目与答案')}</p><p class="help">记录本次第一次听到的信息；它与本地朗读分属不同材料，不沿用朗读题目的分数。</p><form data-form="conversation" data-material="${m.id}">${area('output','首次听懂的内容与仍不清楚的地方','',6)}${select('assistance','提示使用',[['none','先独立听'],['minor','看过部分提示'],['heavy','先看全文 / 翻译']],'none')}<button class="primary" type="submit">保存对话练习</button></form>`);
    }
    else if(a==='save-weekly-check'){
      const u=lesson.unit,a=state.attempts.filter(x=>x.taskId===lesson.taskId&&x.materialId===u.transfer.id).find(x=>x.first),cards=Object.values(state.cards).filter(c=>c.lastDate===E.today()&&c.delayed),output=state.attempts.some(x=>x.taskId===lesson.taskId&&x.kind==='output'&&(x.output||x.audioIds.length));
      if(!a)throw Error('先完成迁移阅读首答');if(cards.length<5)throw Error('先完成至少5项延迟词句提取，再保存阶段依据');if(!output)throw Error('先保存修改稿或新录音产出');
      const c={id:E.uid(),epochId:state.currentEpochId,week:lesson.week,materialId:u.transfer.id,unseen:!a.seenBefore&&a.assistance==='none',comprehension:a.percent,recall:Math.round(cards.filter(c=>c.lastResult&&!c.lastHinted).length/cards.length*100),outputComplete:output,date:E.today(),basis:'未见首答及词句准确提取；非标准化能力评估'};
      await transact(s=>s.checks.push(c));render();toast(c.unseen?'阶段检查已保存，用于调整下周两个课时':'已存为复习记录；材料已见或有提示，不进入未见检查');
    }
    else if(a==='new-batch')batchEditor();
    else if(a==='score-editor')scoreEditor(button.dataset.id);
    else if(a==='exam-panel')examPanel(button.dataset.id);
    else if(a==='exam-start'){
      if(state.sessions.some(x=>x.status==='running'))throw Error('已有一科正在计时');const b=state.batches.find(x=>x.id===button.dataset.batch),skill=button.dataset.skill;
      if(b.date!==E.today())throw Error('只能在实际测试日期启动计时');
      showModal('确认本材料的分科时间',`<form data-form="exam-session" data-batch="${b.id}" data-skill="${skill}"><p class="help">${titles[skill]}计时按照你所选合法材料说明。启动后刷新、暂停或提前结束都会保存实际条件。</p>${field('minutes','本材料的总分钟数',skill==='reading'||skill==='writing'?60:skill==='speaking'?14:b.format==='paper'?40:32,'number',skill==='reading'||skill==='writing'?'min="60" max="60" required':skill==='speaking'?'min="11" max="14" required':'min="30" max="40" required')}${area('timingSource','时间依据（材料说明或官方网址）',b.material.url,2)}<button class="primary" type="submit">开始实际计时</button></form>`);
    }
    else if(a==='exam-pause'||a==='exam-finish'){const s=state.sessions.find(x=>x.id===button.dataset.id);await finishSession(s.id,a==='exam-pause'?'interrupted':'complete');examPanel(s.batchId);toast(s.status==='incomplete'?'已保存提前结束；不作完整考试证据':'实际考试条件已保存');}
    else if(a==='exam-resume'){const s=state.sessions.find(x=>x.id===button.dataset.id);if(state.sessions.some(x=>x.status==='running'))throw Error('已有计时正在进行');if(s.date!==E.today())throw Error('跨日不能继续同日考试，可登记新批次');await transact(()=>{s.status='running';});startTicker(s);examPanel(s.batchId);}
    else if(a==='batch-review'){const b=state.batches.find(x=>x.id===button.dataset.id);showModal('考试复盘',`<form data-form="batch-review" data-id="${b.id}">${area('notes','实际表现、辅助/中断原因、下一步动作',b.reviewNotes||'',7)}<label class="inline"><input type="checkbox" name="reviewed" ${b.reviewed?'checked':''}>四科产出和评分来源已经核对</label><button class="primary" type="submit">保存复盘</button></form>`);}
    else if(a==='export-bundle'){if(recorder)throw Error('请先停止并保存正在进行的录音');const status=document.getElementById('backup-status');if(status)status.textContent='正在读取文字和每条原始录音、生成校验清单…';await saveQueue;download(new Blob([await S.exportBundle()],{type:'application/zip'}),'english-learning-'+E.today()+'.zip');if(status?.isConnected)status.textContent='完整学习包已生成，请保存下载文件。';toast('学习包已生成，包含文字与原始录音');}
    else if(a==='export-json'){await saveQueue;download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),'english-text-only-'+E.today()+'.json');toast('已导出纯文字JSON；不含录音');}
    else if(a==='restore'){
      if(!pendingImport)throw Error('先选择并检查学习包');if(recorder||state.sessions.some(x=>x.status==='running'))throw Error('先停止录音和考试计时，再恢复');
      await saveQueue;download(new Blob([await S.exportBundle()],{type:'application/zip'}),'before-restore-'+E.today()+'.zip');
      const mode=document.querySelector('[name="restore-mode"]:checked')?.value||'merge';state=await S.restore(pendingImport,mode);pendingImport=null;quizContexts.clear();lesson=null;render();toast('已恢复；上次完整数据保留为回滚点');
    }
    else if(a==='rollback-import'){if(recorder||state.sessions.some(x=>x.status==='running'))throw Error('先停止录音和考试计时，再回滚');await saveQueue;state=await S.rollback();quizContexts.clear();lesson=null;render();toast('已切回上次导入前的完整记录与录音');}
    else if(a==='download-all-audio'){const snap=await S.snapshot(),files={};for(const c of snap.clips)files[encodeURIComponent(c.id)+(c.blob.type.includes('mpeg')?'.mp3':'.webm')]=new Uint8Array(await c.blob.arrayBuffer());files['manifest.json']=fflate.strToU8(JSON.stringify(snap.clips.map(({blob,storageId,generation,...c})=>({...c,mime:blob.type,bytes:blob.size})),null,2));download(new Blob([fflate.zipSync(files,{level:0})],{type:'application/zip'}),'english-recordings-'+E.today()+'.zip');}
    else if(a==='copy-summary')await copyText(summary());
    else if(a==='export-csv'){const cell=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const csv=[['日期','周期','任务','材料','首次','提示','训练百分比','原稿','关联原稿'],...state.attempts.map(a=>[a.date,a.epochId,a.taskId,a.materialId,a.first,a.assistance,a.percent,a.output,a.revisionOf])].map(row=>row.map(cell).join(',')).join('\r\n');download(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),'english-progress-'+E.today()+'.csv');}
    else if(a==='legacy-archive'){showModal('旧版学习档案',state.archives.filter(x=>x.kind==='legacy-progress').map(x=>`<p class="help">${esc(x.date)}迁移 · ${Object.keys(x.progress.days||{}).length} 天记录。</p><details><summary>原始文字数据（完整保留）</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(JSON.stringify(x.progress,null,2))}</pre></details>`).join('')||'<p class="help">当前来源没有旧版文字记录。不同网址的浏览器存储彼此独立，可在旧版入口导出后导入。</p>');}
    else if(a==='material-list'){showModal('真人资源、许可与核验',`<div class="scroll-list">${C.units.flatMap(u=>u.listening).map(m=>`<p class="help">${esc(m.id)} · ${Math.round(m.duration)}秒 · 朗读者${esc(m.speakerId)}<br>${esc(m.sourceId)} · ${esc(m.license)} · 文件解码 ${m.verified.fileDecodedOn} · 人工试听 ${m.verified.humanListenedOn||'待核验'}<br>${link(m.audio,'本地MP3')} ${link(m.sourceUrl,'原始语料来源')}</p>`).join('')}</div>`);}
    else if(a==='close')close();
  }
  async function submit(form){
    const kind=form.dataset.form,f=new FormData(form),text=k=>String(f.get(k)||'').trim();
    if(kind==='quiz'){
      const m=material(form.dataset.material),key=form.dataset.task+'/'+m.id,ctx=quizContexts.get(key);if(!ctx)throw Error('练习仍在准备，请稍后再提交');
      const answers={};for(const q of m.questions){if(f.has(q.id))answers[q.id]=Number(f.get(q.id));}
      const questions=m.questions.filter(q=>!state.issues.some(i=>i.questionId===q.id&&i.status!=='resolved'));
      if(questions.some(q=>answers[q.id]===undefined))throw Error('先完成所有未撤回的题目');
      const a=await transact(s=>E.recordAttempt(s,form.dataset.task,{...m,questions},answers,{wasSeen:ctx.wasSeen||ctx.submitted,assistance:ctx.hinted?'minor':'none',kind:form.dataset.kind}));
      ctx.submitted=true;ctx.answers=answers;
      if(modal.open)showModal(esc(m.title),quizBox(m,form.dataset.task,form.dataset.kind));else render();
      toast(`已保存${a.first?'首次':'复练'}答案：${a.percent}%（训练参考）`);
    }
    else if(kind==='diagnostic-language'){
      const definition=C.diagnostic.language;
      if(state.diagnostic.language?.contentVersion===definition.version)throw Error('首次语言答案已经保留；可在课堂继续复练，不覆盖诊断首答');
      const expected=definition.items.map(x=>x.answer);
      const answers=[...Array.from({length:5},(_,i)=>text('v'+i)),...Array.from({length:3},(_,i)=>text('g'+i))],normal=v=>v.toLowerCase().replace(/[^a-z ]/g,'').replace(/\s+/g,' ').trim();
      const correct=answers.map((a,i)=>normal(a)===expected[i]);
      await transact(s=>{const previous=s.diagnostic.language;if(previous){s.diagnostic.languageHistory||=[];s.diagnostic.languageHistory.push(E.copy(previous));}s.diagnostic.language={id:E.uid(),contentVersion:definition.version,answers,vocabulary:Math.round(correct.slice(0,5).filter(Boolean).length/5*100),grammar:Math.round(correct.slice(5).filter(Boolean).length/3*100),hinted:f.has('hinted'),seenBefore:!!previous,at:new Date().toISOString()};});
      render();toast('首次词块和句法结果已保存');
    }
    else if(kind==='diagnostic'){
      const day=Number(form.dataset.day),observations=text('observations');if(observations.length<5)throw Error('请记录至少一个具体困难或下一步');
      const clips=await S.clips('diagnostic-'+day),audioPending=f.has('audioPending');
      if(day===1&&!state.attempts.some(a=>a.taskId==='diagnostic-1'))throw Error('先提交真人短听力首答');
      if(day===2&&(!state.attempts.some(a=>a.taskId==='diagnostic-2')||!state.diagnostic.language))throw Error('先完成阅读及词块、句法检查');
      if(day!==2&&!clips.length&&!audioPending)throw Error('请保存一条口语录音，或明确标记口语证据待补');
      const writing=day===3?document.querySelector('textarea[name="diagnostic-writing"]')?.value.trim():'';
      if(day===3&&(writing?.match(/[a-zA-Z]+/g)||[]).length<5)throw Error('尽力保存至少一句自己的英语（5个词起），不必完美');
      await transact(s=>{
        s.diagnostic.days[day]={...(s.diagnostic.days[day]||{}),complete:true,observations,assistance:text('assistance'),audioIds:clips.map(c=>c.id),audioPending,date:E.today(),...(writing?{writing}:{})};
        if(day===3){s.diagnostic.levels=Object.fromEntries(E.SKILLS.map(k=>[k,text(k)]));
          const listening=s.attempts.find(a=>a.taskId==='diagnostic-1'),reading=s.attempts.find(a=>a.taskId==='diagnostic-2');
          const candidates=[{label:'短听力识词',value:listening?.percent??0},{label:'阅读细节',value:reading?.percent??0},{label:'常用词块',value:s.diagnostic.language.vocabulary},{label:'基础句法',value:s.diagnostic.language.grammar}];
          s.diagnostic.weaknesses=candidates.sort((a,b)=>a.value-b.value).slice(0,3).map(x=>x.label+'：'+x.value+'%（训练参考）');
          s.diagnostic.scores={listening:listening?.percent??null,reading:reading?.percent??null,writing:'待外部反馈',speaking:'待外部反馈'};
          s.drafts||={};s.drafts['diagnostic-writing']=writing;
          E.recordAttempt(s,'diagnostic-3-writing',{id:'diagnostic-writing',sourceId:'diagnostic-writing',version:3,questions:[]},{},{output:writing,audioIds:clips.map(c=>c.id),assistance:text('assistance'),kind:'output'});
        }
      });diagnosticDay=day<3?day+1:3;render();toast('第'+day+'天结果已保存；口语写作评分可以稍后补齐');
    }
    else if(kind==='card'){
      const c=C.units.flatMap(u=>u.chunks).find(c=>c.id===form.dataset.id),normal=v=>v.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
      const details=form.querySelector('details'),hinted=details?.open||details?.dataset.wasOpened==='true',ok=normal(text('answer'))===normal(c.phrase),old=state.cards[c.id],delayed=!!old&&old.lastDate<E.today();
      await transact(s=>{const card=E.recallCard(s,c.id,ok&&!hinted);card.lastHinted=hinted;card.delayed=delayed;card.production=text('answer');});
      const result=document.createElement('p');result.className='result';result.textContent=(ok&&!hinted?'独立提取正确':hinted?'有提示练习，安排明天再提取':'需要复练')+' · 原句：'+c.phrase+' · 下次 '+state.cards[c.id].due;form.replaceWith(result);
    }
    else if(kind==='output'){
      const output=text('output'),task=form.dataset.task,clips=(await S.clips(task)).filter(c=>c.epochId===state.currentEpochId&&!state.attempts.some(a=>a.audioIds.includes(c.id)));if(!output&&!clips.length)throw Error('请保存自己的原稿或录音');
      const u=lesson.repair?lesson.remedialUnit:lesson.skillUnits[[1,3,5,6].includes(lesson.day)?'writing':'speaking'],m=material(state.attempts.filter(a=>a.epochId===state.currentEpochId&&a.taskId===task&&a.kind!=='output').at(-1)?.materialId||lesson.materialId)||u.reading,revision=text('revision');
      if(revision&&!state.attempts.some(a=>a.id===revision&&a.taskId===task))throw Error('修改稿关联无效');
      await transact(s=>{const a=E.recordAttempt(s,task,m,{},{output,audioIds:clips.map(c=>c.id),assistance:text('assistance'),revisionOf:revision||null,kind:'output',taskPrompt:outputInstruction(u)});
        s.drafts||={};s.drafts[task]=output;
        if(form.dataset.retest){const feedback=s.feedback.find(x=>x.id===form.dataset.retest);if(feedback){feedback.retestAttemptId=a.id;feedback.retestResult=text('retestResult');feedback.retestAt=E.today();feedback.retestDelayed=E.today()>=feedback.retestDate;feedback.retests||=[];feedback.retests.push({attemptId:a.id,date:E.today(),result:text('retestResult'),delayed:feedback.retestDelayed});}}
      });render();toast('原始产出已保存；修改稿不会覆盖首次记录');
    }
    else if(kind==='feedback'){
      const a=state.attempts.find(x=>x.id===form.dataset.attempt);if(!a)throw Error('原始产出不存在');
      const feedback=E.parseFeedback(text('json'),a,state);await transact(s=>{s.feedback.push(feedback);s.pendingFeedback=(s.pendingFeedback||[]).filter(id=>id!==a.id);});close();render();toast('已生成 '+feedback.retestDate+' 的复测任务');
    }
    else if(kind==='daily-note'){
      if(text('reflection').length<5)throw Error('请记录一个具体变化和下一步');const task=form.dataset.task;
      if(!state.attempts.some(a=>a.taskId===task&&a.epochId===state.currentEpochId))throw Error('先保存实际答题、原稿或录音产出');
      await transact(s=>{s.dailyNotes||={};s.dailyNotes[task]={text:text('reflection'),date:E.today(),epochId:s.currentEpochId};});await copyText(summary());
    }
    else if(kind==='retest'){
      const feedback=state.feedback.find(x=>x.id===form.dataset.feedback),original=state.attempts.find(x=>x.id===feedback.attemptId),clips=await S.clips('retest-'+feedback.id);
      if(!text('output')&&!clips.length)throw Error('请保存新任务的独立表达或录音');
      if(text('output')===original.output&&!clips.length)throw Error('请换情境完成新表达，不能把原稿重复粘贴当作迁移');
      await transact(s=>{const a=E.recordAttempt(s,'retest-'+feedback.id,{id:original.materialId,sourceId:original.sourceId,version:original.contentVersion,questions:[]},{},{output:text('output'),audioIds:clips.map(c=>c.id),revisionOf:original.id,kind:'output'});feedback.retestAttemptId=a.id;feedback.retestResult=text('result');feedback.retestAt=E.today();feedback.retestDelayed=E.today()>=feedback.retestDate;feedback.retests||=[];feedback.retests.push({attemptId:a.id,date:E.today(),result:text('result'),delayed:feedback.retestDelayed});});close();render();toast(feedback.retestDelayed?'延迟复测已关联原始反馈；结果是训练自查':'重练已保存；还未到延迟复测日期，任务继续保留');
    }
    else if(kind==='pronunciation'){
      const id=form.dataset.id,clips=await S.clips('phoneme-'+id);if(!clips.length)throw Error('先保存至少一次录音，再做A/B回放和自评');
      if(text('note').length<3)throw Error('请写下下一遍要改的具体动作');
      await transact(s=>s.pronunciation[id]={id,rating:text('rating'),note:text('note'),problem:f.has('problem'),due:f.has('problem')?E.addDays(E.today(),3):null,audioIds:clips.map(c=>c.id),selfRated:true,updatedAt:new Date().toISOString()});toast('自评已保存；问题音已安排复练');
    }
    else if(kind==='report'){
      if(text('reason').length<5)throw Error('请说明原文证据与题目的冲突');
      await transact(s=>s.issues.push({id:E.uid(),kind:'content-report',questionId:form.dataset.question,materialId:form.dataset.material,reason:text('reason'),status:'needs-revision',date:E.today()}));close();render();toast('已标记需修订，本题暂停计分，历史答案保留');
    }
    else if(kind==='conversation'){
      if(text('output').length<5)throw Error('请记录实际听到的信息');const m=material(form.dataset.material),v=m.conversation;
      await transact(s=>E.recordAttempt(s,(lesson?.taskId||'online')+'-conversation',{id:m.id+'-conversation',sourceId:v.sourceId,version:3,questions:[]},{},{output:text('output'),assistance:text('assistance'),kind:'online-conversation'}));close();toast('对话练习单独保存，不沿用朗读题目分数');
    }
    else if(kind==='new-batch'){
      if(!/^https?:\/\//.test(text('url')))throw Error('需要合法材料的 http/https 来源网址');
      const b={id:E.uid(),date:text('date'),material:{sourceId:E.canonical(text('sourceId')),testId:text('testId'),url:text('url'),seen:text('seen')},format:text('format'),assistance:text('assistance'),kind:text('kind'),skills:{},reviewed:false,createdAt:new Date().toISOString()};
      if(E.serial(b.date)===null)throw Error('测试日期无效');
      const duplicates=state.batches.some(x=>E.canonical(x.material.sourceId)===b.material.sourceId&&E.canonical(x.material.testId)===E.canonical(b.material.testId));
      if(duplicates)b.material.seen='repeated';await transact(s=>s.batches.push(b));close();render();toast(duplicates?'同一材料已有批次，已标记为重复':'测试批次已保存，请逐科计时和录入来源');
    }
    else if(kind==='scores'){
      const b=state.batches.find(x=>x.id===form.dataset.batch),skills=E.copy(b.skills||{});
      for(const k of E.SKILLS){
        const band=text(k+'Band')===''?null:Number(text(k+'Band')),raw=text(k+'Raw')===''?null:Number(text(k+'Raw'));
        if(band!==null&&!E.band(band))throw Error(titles[k]+'band必须为0–9的半分');
        if(['listening','reading'].includes(k)&&raw!==null&&(!Number.isInteger(raw)||raw<0||raw>40))throw Error('听读原始分必须为0–40整数');
        const score={...skills[k],band,raw,scoreSource:text(k+'Source'),evidence:text(k+'Evidence'),rater:text(k+'Rater'),raterQualification:text(k+'Qualification')};
        if(['listening','reading'].includes(k)){
          score.table=text(k+'Table')?E.safeParse(text(k+'Table')):null;
          if(score.table){if(score.table.testId!==b.material.testId||score.table.format!==b.format||score.table.skill!==k)throw Error(titles[k]+'换算表不适用于此测试编号、形式或科目');const converted=E.convert(raw,score.table);if(band!==null&&converted!==band)throw Error(titles[k]+'band与换算表不一致');score.band=converted;}
        }else score.dimensions=Object.fromEntries((k==='writing'?['task','coherence','lexical','grammar']:['fluency','lexical','grammar','pronunciation']).map(d=>[d,text(k+'Dim_'+d)]));
        skills[k]=score;
      }
      await transact(()=>b.skills=skills);close();render();toast('成绩与来源已保存；准备度按全部证据判断');
    }
    else if(kind==='exam-session'){
      const b=state.batches.find(x=>x.id===form.dataset.batch),skill=form.dataset.skill,target=Number(text('minutes'))*60;
      if(state.sessions.some(x=>x.status==='running'))throw Error('已有一科正在计时');
      if(b.date!==E.today())throw Error('只能记录实际同日计时');
      if(!Number.isFinite(target)||(['reading','writing'].includes(skill)?target!==3600:skill==='speaking'?target<660||target>840:target<1800||target>2400))throw Error('分科时间不符合材料允许范围');
      if(!text('timingSource'))throw Error('请记录计时依据');
      const session={id:E.uid(),batchId:b.id,skill,date:E.today(),startedAt:Date.now(),endedAt:null,startedPerf:performance.now(),endedPerf:null,runId,elapsed:0,target,status:'running',interruptions:0,clockAnomaly:false,timingSource:text('timingSource')};
      await transact(s=>{s.sessions.push(session);b.skills[skill]||={};b.skills[skill].sessionId=session.id;});startTicker(session);examPanel(b.id);
    }
    else if(kind==='batch-review'){
      const b=state.batches.find(x=>x.id===form.dataset.id);if(text('notes').length<10)throw Error('请保存实际表现和下一步动作');
      await transact(()=>{b.reviewNotes=text('notes');b.reviewed=f.has('reviewed');});close();render();toast('考试复盘已保存');
    }
    else if(kind==='targets'){
      const overall=Number(text('overall')),minEach=Number(text('minEach'));if(!E.band(overall)||!E.band(minEach))throw Error('目标应为0–9的半分');
      await transact(s=>{s.profile.overall=overall;s.profile.minEach=minEach;});render();toast('目标已更新');
    }
    else if(kind==='feishu'){
      const url=text('url');if(url){const u=new URL(url);if(u.protocol!=='https:'||!['feishu.cn','larksuite.com'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d)))throw Error('请填写飞书/Lark的HTTPS打卡网址');}
      await transact(s=>s.profile.feishuUrl=url);render();toast('手动打卡入口已保存');
    }
  }
  document.addEventListener('click',e=>{const closeButton=e.target.closest('[data-close]');if(closeButton){close();return;}const button=e.target.closest('[data-action]');if(button){e.preventDefault();run(()=>actions(button));}});
  document.addEventListener('submit',e=>{const form=e.target.closest('form[data-form]');if(!form)return;e.preventDefault();run(async()=>{const buttons=form.querySelectorAll('[type="submit"]');buttons.forEach(b=>b.disabled=true);try{await saveQueue;await submit(form);}finally{buttons.forEach(b=>b.disabled=false);}});});
  document.addEventListener('change',e=>run(async()=>{
    const el=e.target;
    if(el.id==='study-date'){if(E.serial(el.value)===null)throw Error('日期无效');date=el.value;lesson=null;render();}
    else if(el.id==='epoch-select'){await transact(s=>s.currentEpochId=el.value);lesson=null;quizContexts.clear();render();}
    else if(el.id==='import-bundle'){
      const file=el.files[0];if(!file)return;pendingImport=null;const status=document.getElementById('import-status'),controls=document.getElementById('restore-controls');controls.hidden=true;status.textContent='正在检查每个文件、版本、关联与校验值…';
      try{const result=await S.unpack(new Uint8Array(await file.arrayBuffer()));pendingImport=result;status.textContent=`校验完成：${result.state.attempts.length}次练习，${result.clips.length}条录音，${result.state.epochs.length}个周期。${result.warnings.join(' ')}`;controls.hidden=false;}catch(err){status.textContent='校验失败，当前数据未修改：'+err.message;throw err;}
    }
    else if(el.hasAttribute('data-import-audio')){
      const file=el.files[0];if(!file)return;if(file.size>128*1024*1024)throw Error('音频超过128MB，请先剪短');if(!file.type.startsWith('audio/'))throw Error('请选择音频文件');await saveClip(el.dataset.importAudio,file,'import');for(const host of document.querySelectorAll('[data-clips]'))if(host.dataset.clips===el.dataset.importAudio)await loadClips(host);toast('原始音频与任务已保存');
    }
  }));
  let draftTimer;
  document.addEventListener('input',e=>{
    if(!e.target.matches('textarea[name="output"],textarea[name="diagnostic-writing"]'))return;
    const value=e.target.value,key=e.target.name==='diagnostic-writing'?'diagnostic-writing':e.target.closest('form')?.dataset.task;
    if(!key)return;clearTimeout(draftTimer);draftTimer=setTimeout(()=>run(()=>transact(s=>{s.drafts||={};s.drafts[key]=value;})),700);
  });
  document.addEventListener('toggle',e=>{if(e.target.tagName==='DETAILS'&&e.target.open&&e.target.closest('[data-form="card"]'))e.target.dataset.wasOpened='true';},true);
  document.addEventListener('error',e=>{
    const audio=e.target;if(audio.tagName!=='AUDIO')return;
    const host=audio.closest('.audio-panel');if(!host)return;
    const output=host.querySelector('.audio-error');if(output){output.hidden=false;const reason=({1:'播放被中止',2:'网络或文件读取失败',3:'音频解码失败',4:'格式或来源不受支持'})[audio.error?.code]||'原因未确认';output.textContent='播放失败：'+reason+'。请尝试重新加载、打开来源页，或切换本地真人材料/文本练习。';}
  },true);
  window.addEventListener('hashchange',()=>{if(modal.open)close();setView();});
  window.addEventListener('pagehide',()=>{stopRecording();if(examRuntime){tickSession();const s=state.sessions.find(x=>x.id===examRuntime.id);if(s){s.status='interrupted';s.interruptions++;s.reason='离开页面';run(()=>transact(()=>{}));}}});
  window.addEventListener('beforeunload',e=>{if(recorder){e.preventDefault();e.returnValue='录音尚未保存';}});
  async function initialize(){
    try{
      if(!C||!E||!S)throw Error('课程文件未完整加载，请解压完整课程或使用本地HTTP');
      state=await S.initialize();state.drafts||={};state.dailyNotes||={};
      if(state.sessions.some(s=>s.status==='running')){
        await transact(s=>s.sessions.filter(x=>x.status==='running').forEach(x=>{x.status='interrupted';x.interruptions++;x.reason='页面重新打开；离线时间不补造连续计时';}));
        localStorage.removeItem('little-english-v3-running');toast('上次考试计时因页面重开已记录中断');
      }
      diagnosticDay=[1,2,3].find(n=>!state.diagnostic.days[n]?.complete)||3;
      setView();
      if(location.protocol==='file:')toast('当前直接打开文件。若录音受限，请使用本地HTTP；不同网址的记录需通过学习包迁移。');
      if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
      window.EnglishApp={state:()=>E.copy(state),summary,version:C.version};
    }catch(e){main.innerHTML=heading('DATA FIRST','先保护你的记录。','初始化未完成，旧数据没有被覆盖。')+`<section class="card"><p class="notice warning">${esc(e.message)}</p><p>请检查浏览器存储权限、完整课程文件和访问方式，然后刷新。旧版记录仍保留。</p><a class="button" href="legacy/index.html">打开旧版备份入口</a><button data-action="export-old-emergency">导出旧文字记录</button></section>`;console.error(e);}
  }
  document.addEventListener('click',e=>{if(e.target.closest('[data-action="export-old-emergency"]')){const text=localStorage.getItem('little-english-progress-v1');if(text)download(new Blob([JSON.stringify({application:'little-english',version:2,progress:E.safeParse(text)},null,2)],{type:'application/json'}),'legacy-emergency.json');else toast('此网址下没有旧文字记录');}});
  initialize();
})();
