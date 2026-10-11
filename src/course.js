(function (root) {
  "use strict";
  const titles = ["盲听抓信息", "阅读找依据", "语法与改写", "场景角色扮演", "写一份自己的版本", "纠错与再表达", "新材料迁移测验"];
  const esc = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const countWords = value => (String(value || "").match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;
  function unitFor(info, data) { return data.coursePack?.units.find(unit => unit.week === info.week); }
  function questionsFor(unit, day) {
    if (day === 0) return unit.listening.questions;
    if (day === 1) return unit.reading.questions;
    if (day === 7) return unit.reading2.questions;
    if (day === 2) return unit.grammar.questions;
    if (day === 5) return [...unit.listening.questions.slice(0,2), ...unit.reading.questions.slice(0,2), ...unit.grammar.questions.slice(0,2)];
    return day === 6 ? unit.transfer.questions : [];
  }
  function stateFor(state, unit) {
    if(state.course && state.course.version !== unit.version){(state.courseArchive ||= []).push(state.course);delete state.course;}
    if (!state.course || state.course.unit !== unit.id) state.course = { unit: unit.id, answers: {}, checks: {}, draft: "", errors: {} };
    state.course.version=unit.version;
    state.course.answers ||= {}; state.course.checks ||= {}; state.course.errors ||= {};
    return state.course;
  }
  function grade(questions, answers) {
    if (questions.some(q => !Number.isInteger(answers[q.id]) || !q.options[answers[q.id]])) return null;
    return { score: questions.filter(q => answers[q.id] === q.correct).length, total: questions.length, answers: { ...answers } };
  }
  function practicePlan(unit, day, recovery) {
    const minutes = recovery ? [3, 5, 4] : day===4 && unit.minWords>=250 ? [5,30,5] : [10,12,8];
    const plans = [
      ["不看原文听两遍，第一遍抓场景，第二遍记人物、时间和变更。", "完成3道题并提交；对照解析，重听含错误信息的句子。", "遮住原文复述信息，用一句话确认最终安排；再听一次核对。"],
      ["通读短文，给每段或每个事件写一个关键词。", "完成3道理解题，提交后圈出每题的原文依据。", "用谁、发生什么、为什么和结果四个提示复述，再核对遗漏。"],
      ["读本周语法讲解，在短文里找两个对应例子。", "完成2道题并看解析，再把原文两句改成否定或疑问句。", "写三个自己的句子，逐个检查主语、动词和时间表达，再读出。"],
      ["逐句听场景对话；只看自己的角色练第一轮。", unit.roleplay, "遮住示范完成第三轮，改变一个条件；记录卡住的一句并重说。"],
      ["先用三个要点列提纲，明确读者和写作目的。", `完成本周写作任务，建议至少 ${unit.minWords} 词。`, "检查内容、时态和连接词，改写至少两句，然后不照稿讲出大意。"],
      ["回看本周听读及语法首答，先解释两处错误原因。", "重做8道已学题；这是复习，不作为新材料测验。", "用修改后的表达完成角色扮演，并记录仍需复习的一点。"],
      ["独立阅读新的迁移材料，不看本周旧答案。", `完成${unit.transfer.questions.length}道新题，再核对解析。`, `脱稿说 ${unit.speakingSeconds} 秒；${unit.week === 10 || unit.week === 20 ? "完成下方写作并用量表自查。" : "记录一个进步和一个下周要练的问题。"}`],
    ];
    return plans[day===7?1:day].map((text, i) => ({ text:text.replace("3道","至少4道").replace("2道题","本组题").replace("重做8道","重做6道"), minutes: minutes[i] }));
  }
  function material(part) {
    if(part.paragraphs){return `<div class="lesson-text course-text">${part.paragraphs.map((p,i)=>`<section><h4>Paragraph ${i+1}</h4><div class="lesson-line"><p class="english">${esc(p)}</p><button type="button" class="quiet" data-speak="${esc(p)}">🔊 听本段</button></div></section>`).join('')}</div><details data-course-hint><summary>主题导读（提交前查看记为辅助练习）</summary><p>${esc(part.translation)}</p></details>`;}
    const sentences = part.text.split(/\s*\/\s*|(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
    return `<div class="lesson-text course-text">${sentences.map(line => `<div class="lesson-line"><p class="english">${esc(line)}</p><button type="button" class="quiet" data-speak="${esc(line.replace(/^[AB]:\s*/, ""))}" aria-label="播放这句美式英语">🔊 听一句</button></div>`).join("")}</div><details data-course-hint><summary>中文大意 / 主题导读（提交前查看记为辅助练习）</summary><p>${esc(part.translation)}</p></details>`;
  }
  function quiz(questions, progress) {
    if (!questions.length) return "";
    const submitted = progress.submitted;
    const first = progress.first;
    const feedback = first ? `<div class="notice course-result" role="status" tabindex="-1">首答 ${first.score}/${first.total}${first.assisted ? " · 使用过原文或中文提示，按辅助练习记录" : ""}${progress.latest ? `；最近一次 ${progress.latest.score}/${progress.latest.total}` : ""}。重做保留首答。</div>` : "";
    return `${feedback}<form id="courseQuiz">${questions.map((q, index) => `<fieldset><legend>${index + 1}. ${esc(q.prompt)}</legend>${q.options.map((option, n) => `<label class="reading-option"><input type="radio" name="${q.id}" value="${n}" ${progress.answers[q.id] === n ? "checked" : ""} ${submitted ? "disabled" : "required"}>${esc(option)}</label>`).join("")}${submitted ? `<p class="course-explanation ${progress.answers[q.id] === q.correct ? "success" : ""}">${progress.answers[q.id] === q.correct ? "✓ 答对" : "需要复习"} · 正确答案：${esc(q.options[q.correct])}<br>${esc(q.explanation)}</p>` : ""}</fieldset>`).join("")}<button type="${submitted ? "button" : "submit"}" class="primary" ${submitted ? "data-course-retry" : ""}>${submitted ? "重做本组题（保留首答）" : "提交本组答案"}</button><p id="courseQuizMessage" role="status"></p></form>`;
  }
  function render(unit, day, state) {
    const progress = stateFor(state, unit);
    const recovery = state.mode === "recovery";
    const assessment = day === 6 && [10,20,30,40,50,60,70,78].includes(unit.week);
    let input = "";
    if (day === 0) {
      input = `<h3>先听，再答</h3><p class="small muted"><span class="audio-source-badge tts">系统语音 · TTS</span> 自编对话，当前不是真人录音。可重复听；提前看原文会记录为辅助练习。设备朗读失败时改做文本练习，并用当天官方真人样题补足真实听力。</p><div class="course-controls"><button class="secondary" type="button" data-course-listen>🔊 听完整对话 · US</button><button class="quiet" type="button" data-course-stop>停止播放</button></div>${progress.revealed || progress.submitted ? material(unit.listening) : '<button type="button" class="quiet" data-course-reveal>需要帮助：显示原文</button>'}`;
    } else if (day === 1 || day === 2 || day === 7) {
      input = `${day === 2 ? `<div class="notice"><h3>${esc(unit.grammar.title)}</h3><p>${esc(unit.grammar.note)}</p><p class="english">${esc(unit.grammar.examples)}</p></div>` : ""}${material(day===1?unit.reading:unit.reading2)}`;
    } else if (day === 3) input = material(unit.listening);
    else if (day === 4) input = `<div class="writing-prompt"><p class="english">${esc(unit.writing)}</p><button type="button" class="quiet" data-speak="${esc(unit.writing)}">🔊 听题目</button></div><details><summary>回看本周阅读范例</summary>${material(unit.reading)}</details>`;
    else if (day === 5) input = `<p class="muted">复习已有题，解释正确答案为何成立，也解释其他选项为何不成立。</p><details><summary>回看听读原文与语法</summary>${material(unit.listening)}${material(unit.reading)}<p>${esc(unit.grammar.note)}</p></details>`;
    else input = `<p class="notice">${assessment ? "阶段综合检查" : "每周迁移检查"}：这是本周另一篇新材料。首答达到80%可作为继续学习的参考；写说仍需分别检查，不换算雅思分数。</p>${material(unit.transfer)}`;
    if(day===2) input += (unit.grammar.exercises||[]).map((e,i)=>`<label>${i+unit.grammar.questions.length+1}. ${esc(e.prompt)}<textarea rows="2" data-grammar-open="${i}">${esc(progress.open?.[i])}</textarea></label><details><summary>写完后对照参考与检查标准</summary><p>${esc(e.answer)}</p></details>`).join('');
    if(day===0){ input += `<details><summary>本周精听与跟读方法</summary><p>答题后选两句：先听写，再对照原文，最后跟读并脱稿复述。系统朗读不是自然多人录音。</p><label>听写记录<textarea data-dictation rows="3">${esc(progress.dictation)}</textarea></label></details><p><a target="_blank" rel="noopener" href="${esc(unit.authentic?.url)}">${esc(unit.authentic?.label)}</a></p><p class="small muted">${esc(unit.authentic?.instruction)} 链接失效时从 <a target="_blank" rel="noopener" href="${esc(unit.authentic?.fallback)}">官方 G 类练习入口</a>进入。</p>`;}
    if(day===1) input += `<details><summary>本周语境词块</summary>${(unit.chunks||[]).map(c=>`<p class="english">${esc(c.example)}</p><p class="small muted">${esc(c.instruction)}</p>`).join('')}</details>`;
    if(unit.examPractice && [1,4].includes(day)) input = `<section class="notice"><h3>今天也可替换为 60 分钟正式分科训练</h3><p>${esc(unit.examPractice.instruction)}</p><a href="${esc(unit.examPractice.url)}" target="_blank" rel="noopener">${esc(unit.examPractice.label)} ↗</a><p>先在下方选择计时模式；该模式替代今天的常规任务。本站短篇不是完整雅思试卷。</p><button type="button" data-exam-mode>切换到分科计时与证据记录</button></section>`+input;
    const isWriting = day === 4 || assessment;
    const rubric = isWriting
      ? ["我覆盖了题目要求的信息，并补了具体细节", "我检查了主语、时态、单复数，改过至少两句", `我能不照稿讲出大意，并回答追问（目标 ${unit.speakingSeconds} 秒）`]
      : ["我完成了上面的训练步骤", "我能解释错因或指出一个仍卡住的地方", `我尝试了脱稿表达（目标 ${unit.speakingSeconds} 秒，可分两次）`];
    return `<section class="course-workshop"><div class="practice-heading"><div><p class="eyebrow">W${unit.week} · ${esc(unit.level)} · 课程升级</p><h2>${esc(titles[day] || "第二篇阅读与应用")}</h2></div><span class="pill">建议 ${recovery ? 12 : day === 4 && unit.minWords >= 250 ? 40 : 30} 分钟</span></div><h3>${esc(unit.title)}</h3><p class="muted">${esc(unit.goal)}</p><ol class="course-plan">${practicePlan(unit, day, recovery).map(item => `<li><b>${item.minutes}分钟</b><span>${esc(item.text)}</span></li>`).join("")}</ol><p class="small muted">${recovery ? "恢复模式：每项只做一轮，未完成内容下次再练；建议字数可分两次完成。" : "时长是建议预算，包含重听、作答、改写和脱稿表达，不是音频长度或已学习时长。"}</p>${input}${quiz(questionsFor(unit, day), progress)}${assessment ? `<h3 class="secondary-section">阶段写说任务</h3><p class="english">${esc(unit.writing)}</p>` : ""}<label class="draft-label" for="courseDraft">${isWriting ? `自己的草稿 · 建议至少 ${unit.minWords} 词` : day === 3 ? "角色扮演笔记 · 写下自己的回应和卡点" : "练习产出 · 复述、改写或错因笔记"}</label><textarea id="courseDraft" rows="6" placeholder="写自己的版本。内容自动保存在本机。">${esc(progress.draft)}</textarea><p id="courseWordCount" class="small muted">${countWords(progress.draft)} 个英文词${isWriting ? ` / 建议 ${unit.minWords} 词` : ""} · 字数不代表质量评分</p><div class="course-rubric"><h3>产出自查</h3>${rubric.map((text, i) => `<label><input type="checkbox" data-course-check="${i}" ${progress.checks[i] ? "checked" : ""}>${esc(text)}</label>`).join("")}</div>${day === 6 ? `<p class="notice">${progress.first ? progress.first.assisted || progress.first.score / progress.first.total < .8 ? "建议：先复习本周薄弱点，隔一天尝试不看提示作答；不要仅因到了下一周就跳过薄弱点。" : "客观题首答达到本课参考线。继续检查写说产出；若只能看稿表达，先增加一轮脱稿复述。" : "先完成新材料题，再根据首答与写说产出决定继续或复习。"}${assessment ? " 这次检查覆盖生活英语基础，不能据此认定已达雅思目标。" : ""}</p>` : ""}</section>`;
  }
  function bind(container, unit, day, state, { save, refresh, play, stop, learning }) {
    const progress = stateFor(state, unit);
    const questions = questionsFor(unit, day);
    progress.startedAt ||= Date.now();
    container.querySelector('[data-dictation]')?.addEventListener('input',e=>{progress.dictation=e.target.value;save();});
    container.querySelector('[data-exam-mode]')?.addEventListener('click',()=>learning?.exam(container,unit,day,progress));
    container.querySelectorAll('[data-grammar-open]').forEach(el=>el.addEventListener('input',()=>{(progress.open ||= {})[el.dataset.grammarOpen]=el.value;save();}));
    if(learning){
      if([3,4,5,6].includes(day)) learning.workshop(container,unit,day,progress);
      if(day===5){const panel=document.createElement('section');container.prepend(panel);learning.reviewPanel(panel);}
    }
    container.querySelectorAll("[data-course-hint]").forEach(details => details.addEventListener("toggle", () => {
      if (details.open && questions.length && !progress.first) { progress.assisted = true; save(); }
    }));
    container.querySelector("[data-course-listen]")?.addEventListener("click", event => play(unit.listening.text.replace(/(?:^|\s\/\s)[AB]:\s*/g, " "), "US", event.currentTarget));
    container.querySelector("[data-course-stop]")?.addEventListener("click", stop);
    container.querySelector("[data-course-reveal]")?.addEventListener("click", () => {
      progress.revealed = true;
      if (!progress.first) progress.assisted = true;
      save(); stop(); refresh();
    });
    container.querySelectorAll('#courseQuiz input[type="radio"]').forEach(input => input.addEventListener("change", () => {
      progress.answers[input.name] = Number(input.value); save();
    }));
    container.querySelector("#courseQuiz")?.addEventListener("submit", event => {
      event.preventDefault();
      if (progress.submitted) return;
      const result = grade(questions, progress.answers);
      if (!result) { container.querySelector("#courseQuizMessage").textContent = "请先回答全部题目。"; return; }
      result.submittedAt=new Date().toISOString(); result.elapsedSeconds=Math.round((Date.now()-progress.startedAt)/1000); result.timing="elapsed-not-active-time";
      if (!progress.first) progress.first = { ...result, assisted: Boolean(progress.assisted) };
      learning?.queue(questions,result,unit);
      const part=day===0?unit.listening:day===1?unit.reading:day===2?unit.grammar:day===7?unit.reading2:day===6?unit.transfer:null;
      if(part&&learning) learning.store().materials[part.id]=progress;
      progress.latest = result;
      progress.submitted = true;
      questions.forEach(q => {
        if (result.answers[q.id] !== q.correct) progress.errors[q.id] = { choice: result.answers[q.id], corrected: false };
        else if (progress.errors[q.id]) progress.errors[q.id].corrected = true;
      });
      save(); stop(); refresh();
      container.querySelector(".course-result")?.focus();
    });
    container.querySelector("[data-course-retry]")?.addEventListener("click", () => {
      progress.submitted = false; progress.answers = {}; progress.startedAt=Date.now(); save(); stop(); refresh();
      container.querySelector("#courseQuiz input")?.focus();
    });
    container.querySelector("#courseDraft")?.addEventListener("input", event => {
      progress.draft = event.target.value; if(day===4 && learning)learning.week(unit).original=progress.draft; save();
      const isWriting = day === 4 || day === 6 && [10,20,30,40,50,60,70,78].includes(unit.week);
      container.querySelector("#courseWordCount").textContent = `${countWords(progress.draft)} 个英文词${isWriting ? ` / 建议 ${unit.minWords} 词` : ""} · 字数不代表质量评分`;
    });
    container.querySelectorAll("[data-course-check]").forEach(input => input.addEventListener("change", () => {
      progress.checks[input.dataset.courseCheck] = input.checked; save();
    }));
  }
  function summary(state) {
    const p = state.course;
    if (!p) return "";
    return `\n课程产出：${p.first ? `首答 ${p.first.score}/${p.first.total}${p.first.assisted ? "（使用过原文或中文提示）" : ""}` : "客观题未提交或当天无客观题"}；自查 ${Object.values(p.checks || {}).filter(Boolean).length}/3\n练习草稿（${countWords(p.draft)}个英文词）：${p.draft || "未填写"}`;
  }
  const api = { titles, unitFor, questionsFor, countWords, grade, render, bind, summary };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CourseWorkshop = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
