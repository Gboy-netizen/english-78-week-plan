(function (root) {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const skills = ['listening','reading','writing','speaking'];
  const stages = [10,20,30,40,50,60,70,78];
  const date = () => new Date().toLocaleDateString('sv-SE');
  const addDays = (d,n) => new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
  const feedbackDefaults = () => ({source:'',task:'',coherence:'',lexical:'',grammar:'',fluency:'',pronunciation:'',evidence:'',tags:'',actions:'',nextReview:''});
  function migrate(s) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) s = {};
    s.learning ||= {version:2, materials:{}, weeks:{}, reviews:{}, diagnostic:{}};
    for (const k of ['materials','weeks','reviews','diagnostic']) s.learning[k] ||= {};
    Object.values(s.learning.weeks).forEach(w=>{if(w&&typeof w==='object'){w.feedbackStructured ||= feedbackDefaults();}});
    s.schemaVersion = 3;
    return s;
  }
  function overall(s) {
    const vals = skills.map(k=>s?.[k]);
    return vals.every(v=>typeof v==='number' && Number.isFinite(v) && v>=0 && v<=9 && v*2===Math.round(v*2)) ? Math.round(vals.reduce((a,b)=>a+b,0)/2)/2 : null;
  }
  function exportJSON(s) { return JSON.stringify({application:'little-english',version:2,exportedAt:new Date().toISOString(),progress:s},null,2); }
  function importJSON(text) {
    const p=JSON.parse(text);
    if(p.application!=='little-english' || p.version!==2 || !p.progress || typeof p.progress!=='object' || Array.isArray(p.progress)) throw Error('不是本项目的有效备份');
    if (JSON.stringify(p).match(/"(?:__proto__|constructor|prototype)"\s*:/)) throw Error('备份包含不安全字段');
    for(const k of ['days','cards','learning']) if(p.progress[k] && (typeof p.progress[k]!=='object'||Array.isArray(p.progress[k]))) throw Error('备份结构不完整');
    if(p.progress.readiness?.records && !Array.isArray(p.progress.readiness.records)) throw Error('成绩记录无效');
    return migrate(p.progress);
  }
  function readAllClips(){return dbAction('readonly',s=>s.getAll()).catch(()=>[]);}
  function blobDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||Error('录音读取失败'));reader.readAsDataURL(blob);});}
  function dataUrlBlob(value){const [head,body]=String(value||'').split(',');if(!head||!body)throw Error('录音备份格式无效');const mime=(head.match(/data:([^;]+)/)||[])[1]||'application/octet-stream';const binary=atob(body);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Blob([bytes],{type:mime});}
  async function exportBundle(s){const clips=await readAllClips();const audio=[];for(const clip of clips){audio.push({id:clip.id,key:clip.key,name:clip.name,recordedAt:clip.recordedAt,created:clip.created,type:clip.blob?.type||'audio/webm',dataUrl:await blobDataUrl(clip.blob)});}return JSON.stringify({application:'little-english-bundle',version:1,exportedAt:new Date().toISOString(),progress:migrate(s),audio},null,2);}
  function importBundle(text){const p=JSON.parse(text);if(p.application!=='little-english-bundle'||p.version!==1||!p.progress||!Array.isArray(p.audio))throw Error('不是有效的学习包');if(JSON.stringify(p).match(/"(?:__proto__|constructor|prototype)"\s*:/))throw Error('备份包含不安全字段');return {progress:migrate(p.progress),audio:p.audio.filter(c=>c&&c.id&&c.key&&c.dataUrl)};}
  async function restoreAudio(audio){if(!Array.isArray(audio)||!audio.length)return;await dbAction('readwrite',store=>{for(const item of audio){store.put({id:item.id,key:item.key,name:item.name,recordedAt:item.recordedAt,created:item.created,blob:dataUrlBlob(item.dataUrl)});}return store.getAll();});}
  function download(value,name,type='application/json') {
    const url=URL.createObjectURL(value instanceof Blob ? value : new Blob([value],{type}));
    const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  let activeRecorder=null, stopActive=null, timerCleanup=null, disposeClips=null;
  function cleanup(){stopActive?.();stopActive=null;timerCleanup?.();timerCleanup=null;disposeClips?.();disposeClips=null;}
  function audioDB() {
    return new Promise((resolve,reject)=>{
      if(!root.indexedDB) return reject(Error('本机录音存储不可用'));
      const req=indexedDB.open('little-english-audio',1);
      req.onupgradeneeded=()=>req.result.createObjectStore('clips',{keyPath:'id'});
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
  }
  async function dbAction(mode,work) {
    const db=await audioDB(); return new Promise((resolve,reject)=>{let result;const tx=db.transaction('clips',mode);const req=work(tx.objectStore('clips'));req.onsuccess=()=>result=req.result;tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};});
  }
  function recordingUI(host, key) {
    host.innerHTML='<h3>录音与重录</h3><p class="small muted">录音保存在本机学习包中。可先听目标音，再录自己的版本，最后 A/B 回放；网页不提供音素级机器评分。</p><button type="button" data-record>开始录音</button> <button type="button" data-stop-record disabled>停止并保存</button><label>也可导入外部录音<input type="file" accept="audio/*" data-import-audio></label><p data-audio-status role="status"></p><div data-clips></div>';
    const msg=t=>{if(host.isConnected)host.querySelector('[data-audio-status]').textContent=t;};
    const urls=[];
    async function refresh(){try{const clips=(await dbAction('readonly',s=>s.getAll())).filter(c=>c.key===key).sort((a,b)=>(a.recordedAt||0)-(b.recordedAt||0));if(!host.isConnected)return;urls.splice(0).forEach(u=>URL.revokeObjectURL(u));host.querySelector('[data-clips]').innerHTML=''; for(const c of clips){const div=document.createElement('div');const u=URL.createObjectURL(c.blob);urls.push(u);div.innerHTML=`<p>${esc(c.created)} · ${esc(c.name)}</p><audio controls src="${u}"></audio> <a href="${u}" download="${esc(c.name)}">下载录音</a> <button type="button" data-delete-clip="${esc(c.id)}">删除录音</button>`;div.querySelector('[data-delete-clip]').onclick=async()=>{if(!root.confirm('确定删除这条本机录音吗？'))return;try{await dbAction('readwrite',s=>s.delete(c.id));msg('录音已删除。');await refresh();}catch(e){msg('删除失败，请稍后重试。');}};host.querySelector('[data-clips]').append(div);}}catch(e){msg('本机音频存储不可用；可用手机录音，下载后自行保存。');}}
    async function keep(blob,name){const clip={id:crypto.randomUUID?.()||String(Date.now()),key,blob,name,recordedAt:Date.now(),created:new Date().toLocaleString()};try{await dbAction('readwrite',s=>s.put(clip));msg('录音已保存到本机。');await refresh();}catch(e){msg('保存失败，已提供本次录音下载，请勿关闭页面前遗漏。');const u=URL.createObjectURL(blob);urls.push(u);const a=document.createElement('a');a.href=u;a.download=name;a.textContent='下载未保存的录音';host.querySelector('[data-clips]').append(a);}}
    host.querySelector('[data-record]').onclick=async()=>{try{stopActive?.();stopActive=null;if(!navigator.mediaDevices?.getUserMedia||!root.MediaRecorder)throw Error('不支持网页录音，请使用下方外部录音导入。');const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(!host.isConnected){stream.getTracks().forEach(t=>t.stop());return;}const rec=new MediaRecorder(stream);activeRecorder=rec;const chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());activeRecorder=null;const blob=new Blob(chunks,{type:rec.mimeType});if(blob.size)keep(blob,`${key}-${Date.now()}.${rec.mimeType.includes('mp4')?'m4a':'webm'}`);if(host.isConnected){host.querySelector('[data-record]').disabled=false;host.querySelector('[data-stop-record]').disabled=true;}};rec.start();stopActive=()=>{if(rec.state!=='inactive')rec.stop();};host.querySelector('[data-record]').disabled=true;host.querySelector('[data-stop-record]').disabled=false;msg('正在录音；结束后点击停止。');}catch(e){msg('未能开始录音：'+e.message+' 可使用外部录音。');}};
    host.querySelector('[data-stop-record]').onclick=()=>{stopActive?.();stopActive=null;};
    host.querySelector('[data-import-audio]').onchange=e=>{const f=e.target.files[0];if(!f)return;if(!f.type.startsWith('audio/')||f.size>30*1024*1024){msg('请选择不超过 30 MB 的音频文件。');return;}keep(f,f.name);};
    disposeClips=()=>{host.querySelectorAll('audio').forEach(a=>a.pause());urls.splice(0).forEach(u=>URL.revokeObjectURL(u));};refresh();
  }
  function init({data,getSaved,save,openDay,bindAudio,copy}) {
    const store=()=>migrate(getSaved()).learning;
    const units=data.coursePack.units;
    const partState=p=>store().materials[p.id] ||= {version:2,unit:`w${String(p.week).padStart(2,'0')}`,answers:{},checks:{},draft:'',errors:{}};
    function catalog(kind) {
      const isGrammar=kind==='grammar', id=isGrammar?'grammar':'reading';
      const host=document.getElementById(id+'Catalog');
      const filters=document.getElementById(id+'Filters');
      if(!filters.dataset.ready){filters.dataset.ready='1';filters.innerHTML=`<label>阶段<select data-stage><option value="">全部</option>${data.phases.map(p=>`<option value="${p.id}">${p.id} · ${esc(p.title)}</option>`).join('')}</select></label><label>搜索主题<input data-query type="search" placeholder="主题、语法或英文关键词"></label><label>难度<select data-level><option value="">全部</option>${[...new Set(units.map(u=>u.level))].map(l=>`<option>${esc(l)}</option>`).join('')}</select></label><label>状态<select data-status><option value="">全部</option><option value="new">未练习</option><option value="done">已提交</option></select></label>`;filters.addEventListener('input',()=>catalog(kind));}
      const stage=filters.querySelector('[data-stage]').value, query=filters.querySelector('[data-query]').value.toLowerCase(),level=filters.querySelector('[data-level]').value,status=filters.querySelector('[data-status]').value;
      const entries=units.flatMap(u=>(isGrammar?[u.grammar]:[u.reading,u.reading2]).map(p=>({u,p})));
      const matches=entries.filter(({u,p})=>(!stage||u.phase===stage)&&(!level||u.level===level)&&(!query||`${u.title} ${p.title} ${p.text||p.note}`.toLowerCase().includes(query))&&(!status||(Boolean(store().materials[p.id]?.first)===(status==='done'))));
      host.innerHTML=`<p class="muted">${matches.length} / ${entries.length} 个单元 · 陌生周测单独保留在每周第 7 天</p>`+matches.map(({u,p})=>`<button class="catalog-item" data-part="${p.id}"><small>W${u.week} · ${esc(u.level)}</small><strong>${esc(p.title)}</strong><small>${store().materials[p.id]?.first?'已提交':'未练习'} · ${isGrammar?'讲解与 12 项训练':`${root.CourseWorkshop.countWords(p.text)} 词`}</small></button>`).join('');
      host.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{const {u,p}=entries.find(x=>x.p.id===b.dataset.part);const target=document.getElementById(id+'Detail');target.hidden=false;const day=isGrammar?2:p===u.reading?1:7;const state={mode:'normal',course:partState(p)};state.course.unit=u.id;state.course.version=u.version;target.innerHTML=root.CourseWorkshop.render(u,day,state);root.CourseWorkshop.bind(target,u,day,state,{save:()=>{store().materials[p.id]=state.course;save();},refresh:()=>b.click(),play:(text,accent)=>root.PronunciationAudio.playWord(text,accent),stop:()=>root.PronunciationAudio.stop(),learning:api});bindAudio(target);target.scrollIntoView({block:'start',behavior:'smooth'});});
    }
    function week(unit){return store().weeks[unit.id] ||= {feedback:'',revision:'',original:'',speakingFeedback:'',actions:''};}
    function workshop(host,unit,day,progress){
      const w=week(unit);w.feedbackStructured ||= feedbackDefaults();if(day===4 && progress.draft)w.original=progress.draft;
      const f=w.feedbackStructured;
      host.insertAdjacentHTML('beforeend',`<section class="secondary-section feedback-workshop"><h3>反馈 → 修改 → 再表达</h3><p class="muted">先把外部 AI 或老师反馈整理成结构化记录，再决定下一次只改哪 2–3 件事。AI 反馈是练习建议，不是官方评分。</p>${day===5?`<details><summary>本周写作初稿</summary><p class="english">${esc(w.original||'先到本周第 5 天完成初稿。')}</p></details>`:''}<label>作文反馈<textarea data-week-field="feedback" rows="3">${esc(w.feedback)}</textarea></label><label>修改稿<textarea data-week-field="revision" rows="5">${esc(w.revision)}</textarea></label><label>口语反馈（有音频才评价发音）<textarea data-week-field="speakingFeedback" rows="3">${esc(w.speakingFeedback)}</textarea></label><div class="feedback-grid"><label>反馈来源<select data-feedback-field="source"><option value="">未记录</option><option value="teacher">老师/考官</option><option value="ai">AI（非官方）</option><option value="self">自评</option></select></label><label>任务完成<input data-feedback-field="task" value="${esc(f.task)}" placeholder="例如 2/3"></label><label>组织衔接<input data-feedback-field="coherence" value="${esc(f.coherence)}" placeholder="例如 5.5"></label><label>词汇<input data-feedback-field="lexical" value="${esc(f.lexical)}" placeholder="例如 6"></label><label>语法<input data-feedback-field="grammar" value="${esc(f.grammar)}" placeholder="例如 5.5"></label><label>流利度<input data-feedback-field="fluency" value="${esc(f.fluency)}" placeholder="口语可填"></label><label>发音<input data-feedback-field="pronunciation" value="${esc(f.pronunciation)}" placeholder="有录音才填"></label></div><label>原文证据或录音时间点<textarea data-feedback-field="evidence" rows="2">${esc(f.evidence)}</textarea></label><label>错误标签（逗号分隔）<input data-feedback-field="tags" value="${esc(f.tags)}" placeholder="时态、连接词、词汇搭配"></label><label>下次落实的 2–3 个改进点<textarea data-week-field="actions" rows="2">${esc(w.actions)}</textarea></label><label>下次复测日期<input data-feedback-field="nextReview" type="date" value="${esc(f.nextReview)}"></label><button type="button" data-feedback-prompt>复制结构化 AI 批改任务与草稿</button><p class="small muted">复制后自行粘贴到现用的 ChatGPT／豆包，再把反馈填回上面的字段。</p><details><summary>查看本周表达示范</summary><p class="english">${esc(unit.model)}</p></details><div data-recording></div></section>`);
      host.querySelectorAll('[data-week-field]').forEach(el=>el.oninput=()=>{w[el.dataset.weekField]=el.value;save();});
      host.querySelectorAll('[data-feedback-field]').forEach(el=>{el.value=f[el.dataset.feedbackField]||'';el.oninput=()=>{f[el.dataset.feedbackField]=el.value;save();};});
      host.querySelector('[data-feedback-prompt]').onclick=()=>copy(`我正在练习 IELTS General，目标总分6.5。主题：${unit.title}\n口语任务：${unit.roleplay}\n写作要求：${unit.writing}\n初稿：${w.original||progress.draft||'尚未提交，先等我作答'}\n请按任务完成、组织衔接、词汇、语法、流利度、发音分别给出有原文依据的反馈；标出证据句或录音时间点；只选最重要的3个错误标签，并给出下一次可执行的2–3个动作。无录音时不评价发音。任何估分都注明非官方、存在不确定性，不给保分承诺。`);
      if([3,5,6].includes(day))recordingUI(host.querySelector('[data-recording]'),unit.id);else host.querySelector('[data-recording]').remove();
    }
    function queue(questions,result,unit){for(const q of questions){const key=q.id;if(result.answers[key]!==q.correct){store().reviews[key]={unit:unit.id,question:key,due:addDays(date(),1),step:0,misses:(store().reviews[key]?.misses||0)+1};}}save();}
    function reviewPanel(host){const due=Object.values(store().reviews).filter(r=>r.due<=date()).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,8);host.innerHTML=`<h3>到期练习 · 最多 8 项 / 8 分钟</h3><p>今天有 ${Object.values(store().reviews).filter(r=>r.due<=date()).length} 项到期。未完成的顺延。</p>`;for(const r of due){const u=units.find(u=>u.id===r.unit);const q=[u.reading,u.reading2,u.listening,u.grammar,u.transfer].flatMap(p=>p.questions).find(q=>q.id===r.question);if(!q)continue;const div=document.createElement('div');div.className='reading-error';div.innerHTML=`<p>${esc(q.prompt)}</p>${q.options.map((o,i)=>`<button type="button" data-answer="${i}">${esc(o)}</button>`).join(' ')}<p data-result></p>`;div.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{const ok=Number(b.dataset.answer)===q.correct;r.step=ok?r.step+1:0;r.due=addDays(date(),[1,3,7,14][Math.min(3,r.step)]);if(!ok)r.misses++;save();div.querySelector('[data-result]').textContent=`${ok?'答对':'需要复习'}：${q.explanation} · 下次 ${r.due}`;div.querySelectorAll('button').forEach(b=>b.disabled=true);});host.append(div);}}
    function risk(atWeek=79){const checks=Object.entries(getSaved().days||{}).filter(([d,s])=>s.course?.version===2&&s.course?.first&&stages.includes(root.PlanEngine.dayInfo(d,data).week)&&root.PlanEngine.dayInfo(d,data).week<atWeek&&root.PlanEngine.dayInfo(d,data).day===6).sort(([a],[b])=>a.localeCompare(b)).slice(-2);return checks.length===2&&checks.every(([,s])=>s.course.first.assisted||s.course.first.score/s.course.first.total<.8);}
    function exam(host,unit,day,progress){
      cleanup();const e=progress.exam ||= {elapsed:0,source:'',notes:'',answers:'',running:false,mode:'section',material:'unseen',assistance:'none'};e.mode ||= 'section';e.material ||= 'unseen';e.assistance ||= 'none';
      const limit=()=>e.mode==='full'?9900:3600;
      if(e.running){e.elapsed=Math.min(limit(),e.elapsed+Math.max(0,(Date.now()-e.since)/1000));e.running=false;e.interrupted=true;save();}
      host.innerHTML=`<section class="exam-panel"><h2 data-exam-title>${e.mode==='full'?'完整四科模考':'分科诊断'} · ${e.mode==='full'?'2小时45分钟':'60分钟'}</h2><p class="notice">${e.mode==='full'?'使用同一批未见材料连续完成听力、阅读、写作和口语；本站只计时和保存证据，不提供官方评分。':'今天只完成本项；词汇、语法和复盘移到次日。计时不中途暂停才可记录为连续分科训练。'}</p><label>训练模式<select data-exam-type><option value="section" ${e.mode==='section'?'selected':''}>60分钟分科训练</option><option value="full" ${e.mode==='full'?'selected':''}>2小时45分钟完整四科</option></select></label><a target="_blank" rel="noopener" href="${esc(unit.examPractice.url)}">打开官方 G 类样题与说明</a><p>请自备合法、未见过的材料。完整模式需自己准备四科材料；重复材料只能标为复习，不能作为新的能力证据。</p><label>具体材料与测试编号<input data-exam-source value="${esc(e.source)}"></label><label>材料状态<select data-exam-material><option value="unseen" ${e.material==='unseen'?'selected':''}>未见材料</option><option value="repeated" ${e.material==='repeated'?'selected':''}>重复练习</option><option value="unknown" ${e.material==='unknown'?'selected':''}>未确认</option></select></label><label>提示/辅助使用<select data-exam-assistance><option value="none" ${e.assistance==='none'?'selected':''}>无辅助</option><option value="minor" ${e.assistance==='minor'?'selected':''}>少量辅助</option><option value="heavy" ${e.assistance==='heavy'?'selected':''}>明显辅助</option></select></label><p class="exam-clock" data-clock></p><button type="button" data-start-clock>开始 / 继续</button><button type="button" data-pause-clock>暂停（记录中断）</button><button type="button" data-finish-clock>结束并保存</button><label>答案、作文或口语复盘记录<textarea data-exam-answers rows="12">${esc(e.answers)}</textarea></label><label>中断原因、评分来源及复盘<textarea data-exam-notes rows="3">${esc(e.notes)}</textarea></label><p data-exam-status role="status"></p><p>退出本页或刷新会记录为中断。成绩请在资料库按来源录入，不能由本页字数或计时自动换算。</p><a href="#resources">打开成绩与来源记录 →</a></section>`;
      const elapsed=()=>Math.min(limit(),e.elapsed+(e.running?(Date.now()-e.since)/1000:0));
      const stop=()=>{if(e.running){e.elapsed=elapsed();e.running=false;save();}};
      function paint(){const remain=Math.max(0,limit()-Math.floor(elapsed()));host.querySelector('[data-clock]').textContent=`${String(Math.floor(remain/60)).padStart(2,'0')}:${String(remain%60).padStart(2,'0')}`;if(remain===0&&e.running){stop();e.finished=new Date().toISOString();save();}host.querySelector('[data-exam-status]').textContent=e.finished?'已结束；保留首次答案，下一天复盘。':e.running?'计时中；外部官方材料可以在另一标签查看。':e.interrupted?'已暂停 / 中断，结果需标注训练条件。':'填写材料来源后开始。';}
      const interval=setInterval(paint,500);timerCleanup=()=>{clearInterval(interval);if(e.running){stop();e.interrupted=true;save();}};
      host.querySelector('[data-start-clock]').onclick=()=>{if(!e.source.trim()){host.querySelector('[data-exam-status]').textContent='先填写具体材料来源。';return;}if(e.finished)return;if(!e.running){e.since=Date.now();e.running=true;save();}paint();};
      host.querySelector('[data-pause-clock]').onclick=()=>{stop();e.interrupted=true;save();paint();};
      host.querySelector('[data-finish-clock]').onclick=()=>{stop();e.finished ||= new Date().toISOString();e.firstAnswers ??=e.answers;save();paint();};
      host.querySelector('[data-exam-type]').onchange=event=>{if(e.running){host.querySelector('[data-exam-status]').textContent='请先暂停计时，再切换模式。';event.target.value=e.mode;return;}e.mode=event.target.value;e.elapsed=0;e.finished=null;save();exam(host,unit,day,progress);};
      host.querySelector('[data-exam-material]').onchange=event=>{e.material=event.target.value;save();};host.querySelector('[data-exam-assistance]').onchange=event=>{e.assistance=event.target.value;save();};
      for(const field of ['source','answers','notes'])host.querySelector('[data-exam-'+field+']').oninput=event=>{e[field]=event.target.value;save();};paint();
    }
    function diagnostic(){const host=document.getElementById('diagnosticBody'), d=store().diagnostic;
      host.innerHTML=`<p class="notice">分两天完成，每天不超过 60 分钟。用于选补强任务，不换算雅思分数。请先独立作答，再记录反馈。</p><h3>第 1 天 · 听读与语法（50 分钟）</h3><p>听力 15 分钟：先不看文本听 W10 对话；阅读 20 分钟：独立完成 W20 第一篇；语法 15 分钟：完成 W20 语法练习。</p><div class="course-controls"><button data-diag-go="10,0">打开诊断听力</button><button data-diag-go="20,1">打开诊断阅读</button><button data-diag-go="20,2">打开诊断语法</button></div><h3>第 2 天 · 写作与口语（50 分钟）</h3><p class="english">Write to a colleague about a change to your working hours. Explain the reason, propose a new arrangement, and ask for confirmation. Then describe a useful skill you learned, how you practised it, and what was difficult.</p><p>写作 25 分钟（先尝试 100–150 词），口语准备与录音 10 分钟（1–2 分钟表达），反馈与记录 15 分钟。</p><label>诊断草稿<textarea data-diag="draft" rows="6">${esc(d.draft)}</textarea></label><label>AI 反馈及目前最困难的地方<textarea data-diag="feedback" rows="4">${esc(d.feedback)}</textarea></label><label>补强起点<select data-diag="focus"><option value="">先完成诊断</option><option value="foundation">基础句型与辨听</option><option value="listening">听力抓信息与脱稿表达</option><option value="writing">组织段落与准确表达</option></select></label><button data-diag-done>保存诊断与补强选择</button><p data-diag-status>${d.completed?'已记录诊断；建议每阶段回看。':'尚未完成入学诊断。'}</p><div data-diag-recording></div>`;
      host.querySelectorAll('[data-diag-go]').forEach(b=>b.onclick=()=>openDay(...b.dataset.diagGo.split(',').map(Number)));
      host.querySelector('[data-diag="focus"]').value=d.focus||'';
      host.querySelectorAll('[data-diag]').forEach(el=>el.oninput=()=>{d[el.dataset.diag]=el.value;save();});
      const baselineParts=[units[9].listening,units[19].reading,units[19].grammar];
      const results=baselineParts.map(p=>store().materials[p.id]?.first);
      const label=['听力','阅读','语法'];
      const recommendation=results.every(Boolean)?(results[1].score/results[1].total<.6||results[2].score/results[2].total<.6?'foundation':results[0].assisted||results[0].score/results[0].total<.8?'listening':'writing'):null;
      host.insertAdjacentHTML('afterbegin',`<p class="notice">诊断客观题：${results.map((r,i)=>`${label[i]} ${r?`${r.score}/${r.total}${r.assisted?'（辅助）':''}`:'尚未提交'}`).join(' · ')}。${recommendation?'建议补强：'+({foundation:'基础句型与辨听',listening:'听力与脱稿表达',writing:'写作组织与准确表达'}[recommendation])+'；结合第二天反馈可调整。':'先完成三个诊断入口。'}这是一组课程起点任务，不是标准化定级考试。</p>`);
      if(recommendation&&!d.focus){d.focus=recommendation;host.querySelector('[data-diag="focus"]').value=d.focus;}
      host.querySelector('[data-diag-done]').onclick=()=>{if(!d.draft?.trim()||!d.feedback?.trim()||!d.focus||!results.every(Boolean)){host.querySelector('[data-diag-status]').textContent='请先完成听读语法三个入口，并保存草稿、反馈和补强方向。';return;}d.completed=date();d.recommendation=recommendation;d.results=results;save();host.querySelector('[data-diag-status]').textContent='已保存。接下来两周用每天 10 分钟主练习时间补强所选方向。';};recordingUI(host.querySelector('[data-diag-recording]'),'diagnostic');
    }
    function backup(){const exportButton=document.getElementById('exportProgress'),bundleButton=document.getElementById('exportBundle'),input=document.getElementById('importProgress'),confirm=document.getElementById('confirmRestore'),status=document.getElementById('backupStatus');exportButton.onclick=()=>download(exportJSON(getSaved()),`英语学习进度-${date()}.json`);bundleButton.onclick=async()=>{bundleButton.disabled=true;status.textContent='正在读取本机录音并生成学习包…';try{download(await exportBundle(getSaved()),`英语学习包-${date()}.json`);status.textContent='学习包已下载；其中包含文字进度和本机录音。';}catch(e){status.textContent='学习包导出失败：'+e.message;}finally{bundleButton.disabled=false;}};let pending,pendingAudio=[],pendingPromise=Promise.resolve();
      input.onchange=e=>{const f=e.target.files[0];if(!f)return;confirm.hidden=false;status.textContent='正在检查备份…';pendingPromise=(async()=>{try{if(f.size>80*1024*1024)throw Error('备份文件超过80MB');const text=await f.text();if(text.includes('"application":"little-english-bundle"')){const bundle=importBundle(text);pending=bundle.progress;pendingAudio=bundle.audio;}else{pending=importJSON(text);pendingAudio=[];}status.textContent=`已检查备份：${Object.keys(pending.days||{}).length} 天记录${pendingAudio.length?`，${pendingAudio.length} 条录音`:''}。恢复前会自动下载当前学习包。`;}catch(e){pending=null;pendingAudio=[];confirm.hidden=true;status.textContent='备份检查失败：'+e.message;}})();};
      confirm.onclick=async()=>{await pendingPromise;if(!pending)return;confirm.disabled=true;try{download(await exportBundle(getSaved()),`恢复前学习包-${Date.now()}.json`);localStorage.setItem('little-english-progress-v1',JSON.stringify(pending));await restoreAudio(pendingAudio);location.reload();}catch(e){status.textContent='恢复失败，原进度仍保留：'+e.message;confirm.disabled=false;}};
    }
    const api={catalog,workshop,queue,reviewPanel,risk,diagnostic,backup,week,partState,store,exam,recordingUI};return api;
  }
  const api={init,migrate,overall,exportJSON,importJSON,cleanup,stages,esc};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LearningTools=api;
})(typeof globalThis!=='undefined'?globalThis:this);
