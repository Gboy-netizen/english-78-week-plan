(function () {
  "use strict";
  const engine = window.PlanEngine;
  const course = window.CourseWorkshop;
  const pronunciationAudio = window.PronunciationAudio;
  const data = JSON.parse(document.getElementById("planData").textContent);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const storageKey = "little-english-progress-v1";
  const today = new Date();
  let selectedDate = formatDate(today);
  let currentStep = 0;
  let started = false;
  let revealMeaning = false;
  let wordFeedback = null;
  let storageWarningShown = false;

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const lines = (value) => String(value || "").split(/\s*\/\s*|\n+/).filter(Boolean);

  function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function displayDate(value) {
    const date = new Date(`${value}T00:00:00Z`);
    return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  let saved = window.LearningTools.migrate(loadState());
  if(saved.lastStudyDate && engine.dayInfo(saved.lastStudyDate,data).status==='active') selectedDate=saved.lastStudyDate;
  const learning = window.LearningTools.init({data, getSaved:()=>saved, save:saveState, bindAudio, copy:copyText, openDay:(week,day=0)=>{
    selectedDate=engine.dateAt(data.start,(week-1)*7+day);const state=dayState(selectedDate);state.started=true;state.currentStep=2;saveState();navigate('today');renderDay();
  }});
  function restoreLegacyMistakes() {
    if (saved.mistakesVersion === 1) return;
    const cards = cardStore();
    Object.values(saved.days || {}).forEach((day) => {
      const wrong = day?.wordSession?.wrong;
      if (!Array.isArray(wrong)) return;
      wrong.forEach((word) => {
        if (data.words[word] && !cards[word]) engine.recordCard(cards, word, formatDate(new Date()), false);
      });
    });
    saved.mistakesVersion = 1;
    saveState();
  }
  function cardStore() {
    if (!saved.cards || typeof saved.cards !== "object" || Array.isArray(saved.cards)) saved.cards = {};
    return saved.cards;
  }
  function wordsForDay(info){
    const result=engine.wordsFor(info,data);
    const backlog=engine.dueCards(cardStore(),formatDate(new Date()),data,9).length;
    if(backlog>8||learning.risk(info.week))result.words=result.words.slice(0,result.isReview?8:3);
    return result;
  }

  function dayState(value) {
    if (!saved.days || typeof saved.days !== "object") saved.days = {};
    if (!saved.days[value] || typeof saved.days[value] !== "object") {
      saved.days[value] = { mode: "normal", started: false, stepDone: [], ratings: {}, draft: "" };
    }
    const d=saved.days[value];
    if(!Array.isArray(d.stepDone)) d.stepDone=[];
    if(!d.ratings||typeof d.ratings!=='object') d.ratings={};
    if(!['normal','recovery'].includes(d.mode)) d.mode='normal';
    if(typeof d.draft!=='string')d.draft='';
    return saved.days[value];
  }

  function saveState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch (error) {
      if (!storageWarningShown) {
        storageWarningShown = true;
        showToast("浏览器暂时不能保存进度；今天仍可继续练习，结束后请把摘要记到飞书。", 5000);
      }
    }
  }

  function showToast(message, duration = 2600) {
    const toast = $("toast");
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, duration);
  }

  pronunciationAudio.configure({ phonemes: data.phonemeAudio, onError: (message) => showToast(message, 4000) });

  function playAudio(word, accent = "US", button = null) {
    pronunciationAudio.playWord(word, accent, button);
  }

  function speak(text) {
    playAudio(text);
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const helper = document.createElement("textarea");
        helper.value = value;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        if (!document.execCommand("copy")) throw new Error("copy failed");
        helper.remove();
      }
      showToast("已复制，可以粘贴到飞书或 AI 对话框。", 2500);
    } catch (error) {
      showToast("自动复制被浏览器拦截了；下方文本框仍可长按或手动选择复制。", 4200);
    }
  }

  function setView(view) {
    window.LearningTools.cleanup();
    pronunciationAudio.stop();
    const views = ["today", "route", "resources", "mistakes", "reading", "phonetics", "grammar", "diagnostic"];
    const valid = views.includes(view) ? view : "today";
    views.forEach((name) => {
      $(`view-${name}`).hidden = name !== valid;
      const link = document.querySelector(`[data-view="${name}"]`);
      if (link) {
        if (name === valid) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
    });
    if (valid === "route") renderRoute();
    if (valid === "resources") renderResources();
    if (valid === "mistakes") renderMistakes();
    if (valid === "reading") renderReadingCatalog();
    if (valid === "grammar") learning.catalog('grammar');
    if (valid === "diagnostic") learning.diagnostic();
    if (valid === "phonetics") renderPronunciation();
    if(valid==='today') renderDay();
    else $('practice').innerHTML='';
    for(const id of ['reading','grammar'])if(valid!==id)$(id+'Detail').innerHTML='';
  }

  function navigate(view) {
    const hash = `#${view}`;
    if (window.location.hash !== hash) window.history.pushState({}, "", hash);
    setView(view);
  }

  function renderDayMessage(info) {
    const message = $("dateMessage");
    if (info.status === "before") {
      message.textContent = `这一天早于计划起点 ${displayDate(data.start)}。可以选择计划起点之后的日期。`;
    } else if (info.status === "after") {
      message.textContent = "78周计划已经结束。你可以回看最后阶段的资料，或把日期调回计划范围内。";
    } else {
      message.textContent = "日期格式无法识别，请重新选择日期。";
    }
    message.hidden = false;
    $("dayContent").hidden = true;
  }

  function renderRhythm(mode, kind) {
    const recovery = mode === "recovery";
    const items = recovery
      ? [["1", "热身和复习", "5 分钟"], ["2", "少量词汇", "10 分钟"], ["3", "主练习", "12 分钟"], ["4", "记下一句话", "3 分钟"]]
      : [["1", "复习昨天", "10 分钟"], ["2", "今天词汇", "15 分钟"], ["3", "主练习", "20 分钟"], ["4", "完成记录", "5 分钟"]];
    const minutes = engine.durations(mode, kind);
    $("rhythmList").innerHTML = items.map(([number, name], index) => `<li><span>${number}</span><span>${name}</span><b>${minutes[index]} 分钟</b></li>`).join("");
    $("modeNote").textContent = recovery ? "建议30分钟；每项先练一轮，不追赶旧进度。" : "时间为建议预算，包含作答和输出，不是系统测得的学习时长。";
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
    });
  }

  function updateStepNav(info, state) {
    const labels = ["热身", "词汇", "主练习", "完成"];
    $("stepNav").innerHTML = labels.map((label, index) => {
      const done = state.stepDone.includes(index);
      const current = index === currentStep;
      return `<li><button type="button" data-step="${index}" ${current ? 'aria-current="step"' : ""} class="${done ? "done" : ""}"><span class="step-number">${done ? "✓" : index + 1}</span>${label}</button></li>`;
    }).join("");
    $("stepNav").querySelectorAll("[data-step]").forEach((button) => {
      button.addEventListener("click", () => {
        currentStep = Number(button.dataset.step);
        state.currentStep = currentStep;
        wordFeedback = null;
        saveState();
        renderPractice(info, state);
      });
    });
  }

  function markStep(index, state) {
    if (!state.stepDone.includes(index)) state.stepDone.push(index);
    saveState();
  }

  function stepButtons(index, state, nextLabel = "下一步 →") {
    const previous = index > 0 ? `<button type="button" class="secondary" data-action="previous">← 上一步</button>` : "";
    const next = index < 3 ? `<button type="button" class="primary" data-action="next">${nextLabel}</button>` : "";
    return `<div class="practice-actions">${previous}${next}</div>`;
  }

  function renderWarmup(info, lesson, state) {
    const textLines = lines(lesson.text);
    const translationLines = String(lesson.translation || "").split(/\s*／\s*/).filter(Boolean);
    const paired = textLines.length > 1 && textLines.length === translationLines.length;
    const lineHtml = textLines.map((line, index) => `<div class="lesson-line"><div><span class="english">${esc(line)}</span><button type="button" class="quiet" data-speak="${esc(line)}">听一遍</button></div>${paired ? `<p class="lesson-translation">${esc(translationLines[index])}</p>` : ""}</div>`).join("");
    const authentic = lesson.course?.authentic;
    return `<div class="practice-heading"><div><p class="eyebrow">STEP 1 · WARM UP</p><h2>先让嘴巴动起来</h2></div><span class="small muted">约 ${state.mode === "recovery" ? "5" : "10"} 分钟</span></div>
      <p class="muted"><span class="audio-source-badge tts">设备语音 · TTS</span> ${esc(lesson.instruction || "先听或读一遍，再试着说出来。")} 这是跟读热身，不计入真人听力证据。</p>${authentic?.url ? `<p class="small muted"><a href="${esc(authentic.url)}" target="_blank" rel="noopener">打开本周官方真人听力入口 ↗</a> · 先听真人，再回到这里跟读</p>` : ""}
      <div class="lesson-text">${lineHtml || `<p class="english">${esc(lesson.text)}</p>`}</div>
      ${paired ? "" : `<details><summary>查看中文提示</summary><p class="muted">${esc(lesson.translation || "先理解大意，再进行跟读。")}</p></details>`}
      ${stepButtons(0, state, "我已经试过了 →")}`;
  }

  function renderFlashcard(info, state, wordData) {
    const today = formatDate(new Date());
    let session = state.flashSession;
    if (!session || !Array.isArray(session.queue) || session.today !== today) {
      const queue = engine.dueCards(cardStore(), today, data, Number.MAX_SAFE_INTEGER)
        .filter((word) => !wordData.words.includes(word)).slice(0, 8);
      session = { today, queue, index: 0, revealed: false };
      state.flashSession = session;
      saveState();
    }
    if (session.index >= session.queue.length) return "";
    const word = session.queue[session.index];
    const entry = data.words[word];
    const back = session.revealed ? `<div class="flash-back"><div class="word-label">${esc(word)}</div>${pronunciationControl(entry)}<p class="word-meaning">${esc(entry.meaning || "释义待核实")}</p>${entry.example ? `<div class="example-line"><p class="english">${esc(entry.example)}</p><button type="button" class="quiet" data-audio="${esc(entry.example)}">🔊 听例句</button></div><p class="small muted">${esc(entry.translation || "听一句、跟读一句，再试着改成自己的生活句。")}</p>` : ""}<div class="flash-actions"><button type="button" class="secondary" data-flash-rating="forgot">还没记住 · 明天再练</button><button type="button" class="primary" data-flash-rating="remembered">想起来了 · 延后复习</button></div></div>` : `<p class="flash-prompt">先听发音，在心里拼出这个词，并想想它的意思。</p>${pronunciationControl(entry, { hideIPA: true })}<div class="flash-actions"><button type="button" class="primary" data-flash-reveal>翻开卡片</button></div>`;
    return `<div class="practice-heading"><div><p class="eyebrow">STEP 2 · SPACED REVIEW</p><h2>先复习到期闪卡</h2></div><span class="word-progress">${session.index + 1} / ${session.queue.length}</span></div><p class="small muted">这张卡片来自之前学过的词。翻开后按真实记忆情况选择，系统会安排下次复习。</p><div class="flash-card">${back}</div>`;
  }

  function renderWord(info, state, wordData) {
    const flashcard = renderFlashcard(info, state, wordData);
    if (flashcard) return flashcard;
    const remainingDue = engine.dueCards(cardStore(), formatDate(new Date()), data, Number.MAX_SAFE_INTEGER)
      .filter((word) => !wordData.words.includes(word)).length;
    const moreReview = remainingDue ? `<div class="review-more"><span>还有 ${remainingDue} 张到期闪卡。</span><button type="button" class="quiet" data-flash-more>再复习 8 张</button></div>` : "";
    let session = state.wordSession;
    if (!session || !Array.isArray(session.queue) || !session.queue.length || session.sourceDate !== selectedDate) {
      session = engine.createSession(wordData.words);
      session.sourceDate = selectedDate;
      state.wordSession = session;
      saveState();
    }
    if (session.done) {
      const wrong = session.wrong || [];
      const reviewMessage = wrong.length ? `，并重练了 ${wrong.length} 个易错词` : "";
      const reviewHtml = wrong.length ? `<div class="review-chips">${wrong.map((word) => `<button type="button" data-review-word="${esc(word)}">${esc(word)}</button>`).join("")}</div>` : "";
      return `<div class="practice-heading"><div><p class="eyebrow">STEP 2 · WORDS</p><h2>今天的词汇完成了</h2></div><span class="small muted">${wordData.words.length} 个核心词</span></div>${moreReview}
        <div class="complete-symbol">✓</div><p class="center completion-note">你已经把今天的词走过一遍${reviewMessage}。</p>
        ${reviewHtml}
        ${stepButtons(1, state, "去做主练习 →")}`;
    }
    const word = session.queue[session.index];
    const entry = data.words[word] || { word, meaning: "释义待核实", phonetic: "", example: "", translation: "" };
    const progress = `${session.index + 1} / ${session.queue.length}`;
    const feedbackMessage = wordFeedback && wordFeedback.word === word
      ? (wordFeedback.correct ? "答对了。" : "还差一点，再听一遍，重新试试。") : "";
    const feedback = wordFeedback && wordFeedback.word === word
      ? `<p class="spell-feedback ${wordFeedback.correct ? "success" : "error"}" role="status">${feedbackMessage}</p>` : "";
    const answered = wordFeedback && wordFeedback.word === word && wordFeedback.correct;
    const meaningHtml = revealMeaning
      ? `<p class="word-meaning">${esc(entry.meaning || "释义待核实")}</p>${answered ? `<details class="example"><summary>展开例句</summary><div class="example-line"><p class="english">${esc(entry.example || "暂无例句")}</p>${entry.example ? `<button type="button" class="quiet" data-audio="${esc(entry.example)}">🔊 听一遍</button>` : ""}</div>${entry.translation ? `<p class="muted">${esc(entry.translation)}</p>` : ""}</details>` : ""}`
      : "<p class=\"small muted\">先试着猜意思，再查看释义。</p>";
    const useIt = answered ? `${usageBlock(entry)}<div class="use-it"><label for="ownSentence">听例句、跟读，再用这个词说一句自己的话（可选）</label><textarea id="ownSentence" rows="2" placeholder="把例句中的人物或情况换成你自己">${esc(state.sentences?.[word] || "")}</textarea><p class="small muted">写下来可带入今天的打卡摘要；也可以直接开口说。</p></div>` : "";
    return `<div class="practice-heading"><div><p class="eyebrow">STEP 2 · WORDS</p><h2>一次练一个词</h2></div><span class="word-progress">${progress}</span></div>${moreReview}
      <div class="word-stage">${answered ? `<div class="word-label">${esc(word)}</div>` : `<p class="word-listening">先听发音，凭记忆拼写</p>`}
        ${pronunciationControl(entry, { hideIPA: !answered })}<div class="audio-controls"><button type="button" class="quiet" data-toggle-meaning>${revealMeaning ? "收起释义" : "查看释义"}</button></div>
        ${meaningHtml}
        <form class="spell-form" id="spellForm"><label for="spellInput">听发音后，输入这个词的拼写</label><div class="spell-row"><input id="spellInput" name="spelling" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="输入单词拼写"><button type="submit" class="primary">检查</button></div>${feedback}</form>${useIt}
      </div>`;
  }

  function promptBlock(prompt) {
    return `<details class="prompt-box"><summary>需要AI陪练？打开复制指令</summary><p class="small muted">复制后，粘贴到豆包或ChatGPT的文字/语音对话中。AI反馈只是练习参考。</p><textarea id="promptText" class="prompt-text" readonly>${esc(prompt)}</textarea><div class="prompt-actions"><button type="button" class="secondary" data-copy-prompt>复制指令</button><button type="button" class="quiet" data-speak-prompt>朗读主题</button></div></details>`;
  }

  function renderPassage(lesson, includeText = true) {
    const questions = (lesson.questions || []).map((item, index) => `<li><span>${esc(item.question)}</span><details><summary>查看答案</summary><p>${esc(item.answer)}</p></details></li>`).join("");
    const segments = lines(lesson.text).flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean));
    const passage = segments.map((line) => `<div class="lesson-line"><span class="english">${esc(line)}</span><button type="button" class="quiet" data-speak="${esc(line)}">🔊 听一句</button></div>`).join("");
    return `${includeText ? `<p class="small muted"><span class="audio-source-badge tts">逐句朗读 · TTS</span> 先听一句、跟读一句；再遮住原文，用自己的话说大意。需要真人听力时，请使用当天官方样题入口。</p><div class="lesson-text">${passage}</div>` : ""}<details><summary>查看中文大意</summary><p class="muted">${esc(lesson.translation)}</p></details><ol class="question-list">${questions}</ol>`;
  }

  function renderWriting(lesson, state) {
    const prompt = lesson.writing || "写几句自己的话。";
    const min = lesson.kind === "letter" ? 150 : lesson.kind === "essay" ? 250 : 60;
    return `<div class="writing-prompt">${esc(prompt)}</div><label class="draft-label" for="draftText">写下你的版本（草稿只保存在这台设备）</label><textarea id="draftText" class="draft-text" rows="8" placeholder="先写简单句，写得出来比写得完美更重要。">${esc(state.draft || "")}</textarea><div class="word-counter" id="wordCounter">0 词 · 建议至少 ${min} 词</div>`;
  }

  function renderMainPractice(info, lesson, state, wordData) {
    if(lesson.course){const u=lesson.course;const part=info.day===0?u.listening:info.day===1?u.reading:info.day===2?u.grammar:info.day===6?u.transfer:null;
      if(part){if(state.course&&state.course.version!==2){(state.courseArchive ||= []).push(state.course);}state.course=learning.partState(part);}
    }
    if (lesson.course) return course.render(lesson.course, info.day, state) + promptBlock(engine.makePrompt(info, lesson)) + stepButtons(2, state, "进入完成记录 →");
    let body = "";
    if (lesson.kind === "letter" || lesson.kind === "essay" || lesson.kind === "diary") body = renderWriting(lesson, state);
    else if (lesson.kind === "speaking") body = `<div class="lesson-text"><div class="lesson-line"><p class="english">${esc(lesson.speaking)}</p><button type="button" class="quiet" data-speak="${esc(lesson.speaking)}">🔊 听一遍</button></div></div><p class="muted">按 Part 1 → Part 2 → Part 3 练习，一次只答一个问题。Part 2 自己计时准备1分钟，再说1–2分钟。</p>`;
    else body = lesson.grammar ? `<div class="lesson-text"><div class="lesson-line"><p class="english">${esc(lesson.grammar.text)}</p><button type="button" class="quiet" data-speak="${esc(lesson.grammar.text)}">🔊 听一遍</button></div></div><p class="muted">${esc(lesson.grammar.question)}</p><details><summary>查看答案和原因</summary><p class="success">${esc(lesson.grammar.answer)}</p></details>${renderPassage(lesson, false)}` : renderPassage(lesson);
    const note = lesson.official ? `<div class="notice">今天开始接触官方题型。这里的短文和题目是自编练习；真实题目请使用资料页的官方入口。</div>` : "";
    const prompt = promptBlock(engine.makePrompt(info, lesson));
    return `<div class="practice-heading"><div><p class="eyebrow">STEP 3 · PRACTICE</p><h2>${esc(lesson.task || "主练习")}</h2></div><span class="small muted">约 ${engine.durations(state.mode, lesson.kind)[2]} 分钟</span></div><p class="muted">${esc(lesson.instruction || "按自己的速度完成。")}</p>${note}${body}${prompt}${stepButtons(2, state, "进入完成记录 →")}`;
  }

  function makeSummary(info, lesson, wordData, state) {
    const ratings = state.ratings || {};
    const ownSentence = Object.values(state.sentences || {}).filter((value) => typeof value === "string" && value.trim()).at(-1) || "";
    return `${displayDate(selectedDate)} · ${info.phase.id} W${info.week}\n今天的任务：${lesson.task || lesson.title}\n完成：复习${state.stepDone.includes(0) ? "✓" : ""} · 词汇${state.stepDone.includes(1) ? "✓" : ""} · 主练习${state.stepDone.includes(2) ? "✓" : ""}\n词汇：${wordData.words.length}个核心词；到期闪卡${state.flashSession?.queue.length || 0}张；模式：${state.mode === "recovery" ? "恢复30分钟" : "日常练习"}\n自评：流畅度 ${ratings.fluency || "未填"}/5，完整度 ${ratings.completeness || "未填"}/5，状态 ${ratings.energy || "未填"}/5\n今天记住的一句话：${ownSentence}` + course.summary(state);
  }

  function renderCheckin(info, lesson, state, wordData) {
    const summary = makeSummary(info, lesson, wordData, state);
    const selects = [["fluency", "流畅度"], ["completeness", "完整度"], ["energy", "状态"]].map(([key, label]) => `<label class="rating-row"><span>${label}</span><select data-rating="${key}" aria-label="${label}评分"><option value="">未评分</option>${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${String(state.ratings?.[key] || "") === String(n) ? "selected" : ""}>${n} / 5</option>`).join("")}</select></label>`).join("");
    return `<div class="practice-heading"><div><p class="eyebrow">STEP 4 · CHECK IN</p><h2>给今天留下一句话</h2></div><span class="small muted">约 5 分钟</span></div><p class="muted">评分没有标准答案，只记录今天的状态。正式打卡请到飞书完成。</p><div class="rating-box">${selects}</div><label class="draft-label" for="summaryText">可复制的今日摘要</label><textarea id="summaryText" class="summary-text" readonly>${esc(summary)}</textarea><div class="checkin-actions"><button type="button" class="secondary" data-copy-summary>复制摘要</button><a class="primary feishu-link" href="${esc(data.feishu)}" target="_blank" rel="noopener">打开飞书打卡 ↗</a></div><p class="step-reminder">建议填写：是否完成、三项评分、练习内容、一个卡点或进步。</p><div class="practice-actions"><button type="button" class="primary" data-finish>完成今天的学习 ✓</button></div>`;
  }

  function renderPractice(info, state) {
    window.LearningTools.cleanup();
    pronunciationAudio.stop();
    const lesson = engine.lessonFor(info, data);
    const wordData = wordsForDay(info);
    $("practice").hidden = !started;
    $("preview").hidden = started;
    $("stepNav").hidden = !started;
    if (!started) return;
    updateStepNav(info, state);
    let html;
    if (currentStep === 0) html = renderWarmup(info, lesson, state);
    if (currentStep === 1) html = renderWord(info, state, wordData);
    if (currentStep === 2) html = renderMainPractice(info, lesson, state, wordData);
    if (currentStep === 3) html = renderCheckin(info, lesson, state, wordData);
    $("practice").innerHTML = html;
    bindPractice(info, lesson, state, wordData);
  }

  function bindPractice(info, lesson, state, wordData) {
    bindAudio($("practice"));
    if (lesson.course && currentStep === 2) course.bind($("practice"), lesson.course, info.day, state, {
      save: saveState, refresh: () => renderPractice(info, state), play: playAudio, stop: () => pronunciationAudio.stop(), learning,
    });
    const moreReview = document.querySelector("[data-flash-more]");
    if (moreReview) moreReview.addEventListener("click", () => {
      state.flashSession = {
        today: formatDate(new Date()),
        queue: engine.dueCards(cardStore(), formatDate(new Date()), data, Number.MAX_SAFE_INTEGER)
          .filter((word) => !wordData.words.includes(word)).slice(0, 8),
        index: 0, revealed: false,
      };
      saveState();
      renderPractice(info, state);
    });
    const revealCard = document.querySelector("[data-flash-reveal]");
    if (revealCard) revealCard.addEventListener("click", () => { state.flashSession.revealed = true; saveState(); renderPractice(info, state); });
    document.querySelectorAll("[data-flash-rating]").forEach((button) => button.addEventListener("click", () => {
      const session = state.flashSession;
      engine.recordCard(cardStore(), session.queue[session.index], formatDate(new Date()), button.dataset.flashRating === "remembered");
      session.index += 1;
      session.revealed = false;
      saveState();
      renderReviewNote(wordData);
      renderPractice(info, state);
    }));
    const meaningButton = document.querySelector("[data-toggle-meaning]");
    if (meaningButton) meaningButton.addEventListener("click", () => {
      const draftSpelling = $("spellInput")?.value;
      revealMeaning = !revealMeaning;
      renderPractice(info, state);
      if (draftSpelling !== undefined) $("spellInput").value = draftSpelling;
    });
    const prompt = engine.makePrompt(info, lesson);
    const promptText = $("promptText");
    const copyPrompt = document.querySelector("[data-copy-prompt]");
    if (copyPrompt) copyPrompt.addEventListener("click", () => copyText(prompt));
    const speakPrompt = document.querySelector("[data-speak-prompt]");
    if (speakPrompt) speakPrompt.addEventListener("click", () => speak(lesson.title || "today's practice"));
    const form = $("spellForm");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = $("spellInput");
        const answer = input.value.trim();
        if (!answer) { showToast("先输入你的拼写，再检查。", 2400); input.focus(); return; }
        const session = state.wordSession;
        const word = session.queue[session.index];
        const wasWrong = session.wrong.includes(word);
        wordFeedback = engine.gradeSession(session, answer);
        if (!wordFeedback.correct && !wasWrong) engine.recordCard(cardStore(), word, formatDate(new Date()), false);
        if (wordFeedback.correct && !session.wrong.includes(word)) engine.recordCard(cardStore(), word, formatDate(new Date()), true);
        if (wordFeedback.correct) revealMeaning = true;
        saveState();
        renderPractice(info, state);
      });
      const input = $("spellInput");
      if (input && !wordFeedback?.correct) input.focus();
      if (input && wordFeedback?.correct) {
        const button = document.createElement("button");
        button.type = "button"; button.className = "primary"; button.textContent = "下一词 →";
        button.addEventListener("click", () => { engine.advanceSession(state.wordSession); wordFeedback = null; revealMeaning = false; saveState(); renderPractice(info, state); });
        form.querySelector(".spell-row").replaceChildren(input, button);
      }
    }
    const ownSentence = $("ownSentence");
    if (ownSentence) ownSentence.addEventListener("input", () => {
      state.sentences = state.sentences || {};
      state.sentences[state.wordSession.queue[state.wordSession.index]] = ownSentence.value;
      saveState();
    });
    document.querySelectorAll("[data-review-word]").forEach((button) => button.addEventListener("click", () => {
      const entry = data.words[button.dataset.reviewWord];
      if (entry) showToast(`${entry.word}：${entry.meaning || "释义待核实"}`, 4500);
    }));
    const draft = $("draftText");
    if (draft) {
      draft.addEventListener("input", () => { state.draft = draft.value; saveState(); updateWordCounter(draft.value, lesson); });
      updateWordCounter(draft.value, lesson);
    }
    document.querySelectorAll("[data-rating]").forEach((select) => select.addEventListener("change", () => {
      state.ratings = state.ratings || {}; state.ratings[select.dataset.rating] = select.value; saveState();
      const summary = $("summaryText"); if (summary) summary.value = makeSummary(info, lesson, wordData, state);
    }));
    const summaryButton = document.querySelector("[data-copy-summary]");
    if (summaryButton) summaryButton.addEventListener("click", () => copyText($("summaryText").value));
    const finish = document.querySelector("[data-finish]");
    if (finish) finish.addEventListener("click", () => { markStep(3, state); state.started = false; started = false; showToast("今天的学习已完成。记得把摘要存进飞书。", 3600); renderDay(); });
    document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "next") { markStep(currentStep, state); currentStep = Math.min(3, currentStep + 1); state.currentStep = currentStep; wordFeedback = null; saveState(); renderPractice(info, state); }
      if (action === "previous") { currentStep = Math.max(0, currentStep - 1); state.currentStep = currentStep; wordFeedback = null; saveState(); renderPractice(info, state); }
    }));
  }

  function updateWordCounter(value, lesson) {
    const counter = $("wordCounter");
    if (!counter) return;
    const count = String(value || "").trim() ? String(value).trim().split(/\s+/).length : 0;
    const min = lesson.kind === "letter" ? 150 : lesson.kind === "essay" ? 250 : 60;
    counter.textContent = `${count} 词 · 建议至少 ${min} 词`;
  }

  function renderReviewNote(wordData) {
    const dueCount = engine.dueCards(cardStore(), formatDate(new Date()), data, Number.MAX_SAFE_INTEGER)
      .filter((word) => !wordData.words.includes(word)).length;
    $("reviewNote").textContent = dueCount
      ? `今天有 ${dueCount} 张到期闪卡；词汇环节先复习，单次最多 8 张。`
      : "学过的词会按间隔复习日期，自动回到每天的词汇环节。";
  }

  function renderDay() {
    const input = $("studyDate");
    input.value = selectedDate;
    const info = engine.dayInfo(selectedDate, data);
    if (info.status !== "active") { renderDayMessage(info); return; }
    saved.lastStudyDate=selectedDate;saveState();
    $("dateMessage").hidden = true;
    $("dayContent").hidden = false;
    const state = dayState(selectedDate);
    started = Boolean(state.started);
    currentStep = Math.min(3, Number.isInteger(state.currentStep) ? state.currentStep : 0);
    const lesson = engine.lessonFor(info, data);
    const wordData = wordsForDay(info);
    const phonetics = engine.phoneticsFor(info, data);
    const totalMinutes = engine.durations(state.mode, lesson.kind).reduce((a, b) => a + b, 0);
    $("todayMeta").textContent = `${displayDate(selectedDate)} · ${weekdays[info.weekday]} · 建议训练预算 ${totalMinutes} 分钟`;
    $("phaseLabel").textContent = `${info.phase.id} · ${info.phase.title}`;
    $("dayLabel").textContent = `W${info.week} · 第${info.day + 1}天 · 本周 ${displayDate(info.weekStart)}–${displayDate(info.weekEnd)}`;
    $("lessonTitle").textContent = lesson.task || lesson.title;
    $("lessonLead").textContent = lesson.course?.goal || (info.week <= 2 ? "恢复基础：短句、发音和常用词一起练。" : info.phase.goal);
    if(!saved.learning.diagnostic.completed) $("lessonLead").insertAdjacentHTML('afterend',document.getElementById('diagnosticReminder')?'':'<p id="diagnosticReminder" class="notice"><a href="#diagnostic">先完成两天入学诊断 →</a> 不换算雅思分数；用于选择补强方向。</p>');
    if(saved.learning.diagnostic.completed)document.getElementById('diagnosticReminder')?.remove();
    document.getElementById('diagnosticFocus')?.remove();
    if(saved.learning.diagnostic.completed && engine.serialDate(formatDate(new Date()))-engine.serialDate(saved.learning.diagnostic.completed)<14){
      const focus={foundation:'用10分钟主练习复习主谓、问句和否定；先答语法题，再围绕今天场景造两句。',listening:'用10分钟主练习先听一段、不看原文复述；对照遗漏，再录一遍。',writing:'用10分钟主练习先列目的、理由、例子；完成一段后让AI指出两处最重要的问题。'}[saved.learning.diagnostic.focus];
      if(focus)$('lessonLead').insertAdjacentHTML('afterend',`<p id="diagnosticFocus" class="notice">诊断补强：${esc(focus)}替代等量新练习，不额外加时。</p>`);
    }
    document.getElementById('adaptiveReminder')?.remove();
    if(learning.risk(info.week)) $("lessonLead").insertAdjacentHTML('afterend','<div id="adaptiveReminder" class="notice">连续两次阶段周测需要补强。本周每天用主练习中的前 10 分钟复习到期错题，减少新词。原截止日期存在风险。<div id="adaptiveReview"></div></div>');
    if(document.getElementById('adaptiveReview')) learning.reviewPanel(document.getElementById('adaptiveReview'));
    $("wordCount").textContent = wordData.words.length;
    $("wordCountLabel").textContent = info.day >= 5 ? "个复习词" : "个核心词";
    renderReviewNote(wordData);
    $("totalMinutes").textContent = totalMinutes;
    $("courseWeekNav").hidden = !lesson.course;
    $("courseWeekNav").innerHTML = lesson.course ? course.titles.map((title, day) => `<button type="button" class="quiet" data-course-day="${day}" ${day === info.day ? 'aria-current="date"' : ""}>${day + 1} · ${esc(title)}</button>`).join("") : "";
    $("courseWeekNav").querySelectorAll("[data-course-day]").forEach(button => button.onclick = () => {
      selectedDate = engine.dateAt(info.weekStart, Number(button.dataset.courseDay)); renderDay();
    });
    $("startLearning").textContent = started ? "继续今天的学习 →" : "开始今天的学习 →";
    renderRhythm(state.mode, lesson.kind);
    const progress = Math.round((info.offset / 545) * 100);
    $("weekLabel").textContent = `W${info.week} / 78`;
    $("journeyBar").style.width = `${Math.max(2, progress)}%`;
    $("phaseGoal").textContent = info.phase.goal;
    $("startLearning").onclick = () => { state.started = true; started = true; saveState(); renderPractice(info, state); document.querySelector("#practice")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
    document.querySelectorAll("[data-mode]").forEach((button) => button.onclick = () => { state.mode = button.dataset.mode; saveState(); renderDay(); });
    renderPractice(info, state);
    // Keep a small amount of context available to the browser accessibility tree.
    $("dayOverview").dataset.phonetics = phonetics.map((item) => item?.s || "").join(" ");
  }

  function renderRoute() {
    const info = engine.dayInfo(selectedDate, data);
    $("courseCatalog").innerHTML = data.coursePack.units.map(unit => {
      const date = engine.dateAt(data.start, (unit.week - 1) * 7 + 6);
      const first = saved.days?.[date]?.course?.first;
      return `<button type="button" class="catalog-item" data-route-week="${unit.week}"><span class="pill">W${unit.week} · ${esc(unit.level)}</span><strong>${esc(unit.title)}</strong><span>${unit.minWords}词写作 · ${unit.speakingSeconds}秒表达</span><small>${first ? `周测首答 ${first.score}/${first.total}` : "周测未提交"}${window.LearningTools.stages.includes(unit.week) ? " · 阶段检查" : ""}</small></button>`;
    }).join("");
    $("phaseList").innerHTML = data.phases.map((phase, index) => {
      const current = info.status === "active" && info.phase.id === phase.id;
      const weeks = Array.from({ length: phase.end - phase.start + 1 }, (_, i) => phase.start + i).map((week) => `<button type="button" class="${info.status === "active" && info.week === week ? "current" : ""}" data-route-week="${week}">W${week}</button>`).join("");
      return `<article class="card phase-card ${current ? "current" : ""}"><div class="phase-number">${String(index + 1).padStart(2, "0")}</div><div><div class="overline"><h2>${esc(phase.title)}</h2><span class="pill">${phase.id} · W${phase.start}–W${phase.end}</span></div><p class="phase-meta">${esc(phase.goal)}</p><p class="phase-tasks">${phase.tasks.map(esc).join("　·　")}</p><div class="week-grid">${weeks}</div></div></article>`;
    }).join("");
    document.querySelectorAll("[data-route-week]").forEach((button) => button.addEventListener("click", () => {
      selectedDate = engine.dateAt(data.start, (Number(button.dataset.routeWeek) - 1) * 7);
      navigate("today"); renderDay(); window.scrollTo({ top: 0, behavior: "smooth" });
    }));
  }

  function usageBlock(entry) {
    if (!entry.usage) return `<p class="small muted">此词暂未配本站用法详解，可查阅 <a href="https://dictionary.cambridge.org/us/dictionary/english/${encodeURIComponent(entry.word)}" target="_blank" rel="noopener">美式词典解释与例句 ↗</a>。</p>`;
    return `<section class="usage-notes"><h3>这个词怎么用</h3><dl>${entry.usage.map((note, i) => `<dt>${["词性与意思", "常用搭配与句型", "易错提醒"][i]}</dt><dd>${esc(note)}</dd>`).join("")}</dl></section>`;
  }

  function bindAudio(container) {
    container.querySelectorAll("[data-audio]").forEach((button) => { button.onclick = () => playAudio(button.dataset.audio, button.dataset.accent || "US", button); });
    container.querySelectorAll("[data-speak]").forEach((button) => { button.onclick = () => playAudio(button.dataset.speak, button.dataset.accent || "US", button); });
    container.querySelectorAll("[data-phoneme-audio]").forEach((button) => { button.onclick = () => pronunciationAudio.playPhoneme(button.dataset.phonemeAudio, button); });
  }

  function pronunciationState() {
    if (!saved.pronunciation || typeof saved.pronunciation !== "object") saved.pronunciation = {};
    const progress = saved.pronunciation;
    if (!Array.isArray(progress.letters)) progress.letters = [];
    if (!Array.isArray(progress.phonemes)) progress.phonemes = [];
    if (!progress.quiz || typeof progress.quiz !== "object") progress.quiz = { attempts: 0, correct: 0 };
    return progress;
  }

  function pronunciationControl(entry, options = {}) {
    const word = esc(entry.word);
    const ukSource = entry.ukSource === "ipa-dict/en_UK" ? "英式词典自动来源，建议复核" : "";
    const ipa = options.hideIPA ? "" : `<div class="pron-ipa"><span><b>US</b> ${esc(entry.phonetic ? `/${entry.phonetic}/` : "音标未收录")}</span><span title="${ukSource}"><b>UK</b> ${esc(entry.ukPhonetic || "音标未收录")}</span></div>`;
    return `<div class="pron-control">${ipa}<div class="pron-buttons"><button type="button" class="secondary" data-audio="${word}" data-accent="US" aria-label="播放 ${word} 的美式发音">🔊 US 美式</button><button type="button" class="secondary" data-audio="${word}" data-accent="UK" aria-label="播放 ${word} 的英式发音">🔊 UK 英式</button></div></div>`;
  }

  function wordArticle(entry) {
    return `<h3>${esc(entry.word)}</h3><p>${esc(entry.meaning)}</p>${pronunciationControl(entry)}${usageBlock(entry)}${entry.example ? `<div class="lesson-text"><div class="example-line"><p class="english">${esc(entry.example)}</p><button type="button" class="quiet" data-audio="${esc(entry.example)}">🔊 听例句</button></div><p class="muted">${esc(entry.translation)}</p></div>` : ""}`;
  }

  function practiceMistakes(words) {
    const today = formatDate(new Date());
    selectedDate = engine.dayInfo(today, data).status === "active" ? today : data.start;
    const state = dayState(selectedDate);
    state.started = true;
    state.currentStep = 1;
    state.flashSession = { today, queue: words, index: 0, revealed: false };
    wordFeedback = null;
    revealMeaning = false;
    saveState();
    navigate("today");
    renderDay();
    $("practice").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderMistakes() {
    if(!document.getElementById('spacedCourseReview')) $('courseMistakes').insertAdjacentHTML('beforebegin','<section id="spacedCourseReview" class="secondary-section"></section>');
    learning.reviewPanel(document.getElementById('spacedCourseReview'));
    const cards = Object.entries(cardStore()).filter(([word]) => data.words[word] && ["exact", "curated"].includes(data.words[word].quality));
    const mistakes = cards.filter(([, card]) => Number(card?.misses) > 0)
      .sort((a, b) => b[1].misses - a[1].misses || a[0].localeCompare(b[0]));
    const due = engine.dueCards(cardStore(), formatDate(new Date()), data, Number.MAX_SAFE_INTEGER).length;
    $("deckStats").textContent = `${cards.length} 张已学词卡 · ${due} 张到期 · ${mistakes.length} 个曾输错或忘记的词`;
    $("mistakeList").innerHTML = mistakes.length ? mistakes.map(([word, card]) => `<article><div class="overline"><h3>${esc(word)}</h3><button type="button" class="quiet" data-practice-word="${esc(word)}">重练这个词</button></div><p>${esc(data.words[word].meaning)}</p><p class="small muted">错过 ${card.misses} 次 · 下次复习 ${esc(card.due || "待安排")}</p><details><summary>查看用法与例句</summary>${wordArticle(data.words[word])}</details></article>`).join("") : `<p class="notice">还没有单词错题。听写输错或闪卡选择“还没记住”后会自动记录；正确作答不会生成错题。旧设备的记录需要在原浏览器查看。</p>`;
    $("reviewMistakes").disabled = !mistakes.length;
    $("reviewMistakes").onclick = () => practiceMistakes(mistakes.slice(0, 8).map(([word]) => word));
    $("mistakeList").querySelectorAll("[data-practice-word]").forEach((button) => { button.onclick = () => practiceMistakes([button.dataset.practiceWord]); });
    bindAudio($("mistakeList"));
    const readingErrors = Object.entries(saved.readingAnswers || {}).filter(([id, answer]) => data.easyReadings[id] && answer.misses > 0);
    $("readingMistakes").innerHTML = readingErrors.length ? readingErrors.map(([id, answer]) => `<article class="reading-error"><h3>${esc(data.easyReadings[id].title)}</h3><p>${esc(data.easyReadings[id].question)}</p><p class="small muted">错过 ${Number(answer.misses)} 次 · ${answer.correct ? "最近已答对" : "待重练"}</p><button type="button" class="secondary" data-retry-reading="${id}">回到原文重练</button></article>`).join("") : `<p class="muted">暂无入门短文错题。到“短文”选一篇入门材料，完成理解题；答错后会自动加入这里。</p>`;
    $("readingMistakes").querySelectorAll("[data-retry-reading]").forEach((button) => { button.onclick = () => { navigate("reading"); openReading(Number(button.dataset.retryReading), true); }; });
    const courseErrors = Object.entries(saved.days || {}).sort(([a], [b]) => b.localeCompare(a)).flatMap(([date, state]) => {
      const unit = data.coursePack.units.find(item => item.id === state.course?.unit);
      if (!unit || engine.dayInfo(date, data).status !== "active") return [];
      const questions = [...unit.listening.questions, ...unit.reading.questions, ...unit.reading2.questions, ...unit.grammar.questions, ...unit.transfer.questions];
      return Object.entries(state.course?.errors || {}).flatMap(([id, error]) => {
        const q = questions.find(item => item.id === id);
        return q ? [{ date, unit, q, error }] : [];
      });
    });
    $("courseMistakes").innerHTML = courseErrors.length ? courseErrors.map(({ date, unit, q, error }) => `<article class="reading-error"><p class="small muted">${esc(date)} · W${unit.week} · ${esc(unit.title)} · ${error.corrected ? "最近已改对" : "待复习"}</p><h3>${esc(q.prompt)}</h3><details><summary>查看错因与依据</summary><p>曾选：${esc(q.options[error.choice])}</p><p>正确答案：${esc(q.options[q.correct])}</p><p>${esc(q.explanation)}</p></details><button type="button" class="secondary" data-course-retry-date="${esc(date)}">回到当天练习</button></article>`).join("") : '<p class="muted">暂无系统课程错题。听读、语法或周测提交后，错题会记录在这里。</p>';
    $("courseMistakes").querySelectorAll("[data-course-retry-date]").forEach(button => button.onclick = () => {
      selectedDate = button.dataset.courseRetryDate;
      const state = dayState(selectedDate); state.started = true; state.currentStep = 2; saveState(); navigate("today"); renderDay();
    });
  }

  function renderResources() {
    learning.backup();
    const values = Object.values(data.words);
    const usable = values.filter((entry) => ["exact", "curated"].includes(entry.quality)).length;
    $("vocabStats").textContent = `${values.length} 个词条 · ${usable} 个有可用释义 · 100 个基础词有用法详解`;
    renderMaterials();
    $("allPhonetics").innerHTML = data.phonetics.map((item) => `<div class="phon-item"><strong>${esc(item.s)}</strong><p>${esc(item.tip)}</p><p>${esc(item.ws)}</p><button type="button" class="secondary" data-phonetic="${esc(item.ws.split(/\s+/)[0] || "")}">听例词</button></div>`).join("");
    $("feishuLink").href = data.feishu;
    document.querySelectorAll("[data-phonetic]").forEach((button) => button.addEventListener("click", () => playAudio(button.dataset.phonetic)));
    renderReadiness();
  }

  function readinessStore() {
    if (!saved.readiness || typeof saved.readiness !== "object") saved.readiness = { records: [] };
    if (!Array.isArray(saved.readiness.records)) saved.readiness.records = [];
    return saved.readiness;
  }

  const sourceLabels={official:'官方成绩（用户录入）',mock:'带来源的模考',ai:'AI估计 · 非官方',self:'自评 · 非官方'};
  let readinessEdit=null;
  function ieltsOverall(scores){return window.LearningTools.overall(scores);}
  function readinessGate(record){
    const n=ieltsOverall(record.scores), gate=data.target.gates.find(g=>g.id===record.stage);
    if(n===null)return '四科资料不完整';
    if(['baseline','w10','w20','w30'].includes(record.stage))return '基础能力记录，不判定雅思达标';
    if(!['official','mock'].includes(record.source))return '仅供训练参考，不判定达标';
    if(!record.evidence?.trim())return '缺少来源，待补证据';
    if(record.source==='mock' && (record.material!=='unseen'||record.condition!=='full'))return '需要四科连续完成且使用未见材料';
    const minimum=record.minimum??6;
    return n>=(gate?.overall||6.5)&&Math.min(...Object.values(record.scores))>=minimum ? '本次记录达到所设参考目标；不代表未来考试结果' : '本次记录仍有差距，查看单项反馈';
  }
  function renderReadiness(){
    const form=$('readinessForm');if(!form)return;
    const old=$('readinessStage').value;
    $('readinessStage').innerHTML=data.target.gates.map(g=>`<option value="${esc(g.id)}">${esc(g.label)}</option>`).join('');
    if(old)$('readinessStage').value=old;
    $('readinessDate').value ||= formatDate(new Date());
    const records=readinessStore().records;
    records.forEach((r,i)=>{r.id ||= 'legacy-'+i;r.source ||= 'self';});
    const ordered=[...records].sort((a,b)=>b.date.localeCompare(a.date));
    $('readinessStatus').innerHTML=ordered.length?`<p class="notice">最近测评：${esc(ordered[0].date)} · ${esc(sourceLabels[ordered[0].source])} · ${esc(readinessGate(ordered[0]))}</p>`:'<p class="notice">先记录基线。本站练习正确率不转换为雅思分数。</p>';
    $('readinessHistory').innerHTML=ordered.map(r=>`<article class="reading-error"><h3>${esc(r.date)} · ${esc(r.stageLabel)} · ${ieltsOverall(r.scores)?.toFixed(1)??'—'}</h3><p>${esc(sourceLabels[r.source])} · 听 ${r.scores?.listening??'—'} / 读 ${r.scores?.reading??'—'} / 写 ${r.scores?.writing??'—'} / 说 ${r.scores?.speaking??'—'}</p><p>${esc(readinessGate(r))} · ${esc(r.batch||'未填批次')} · ${r.material==='unseen'?'未见':r.material==='repeated'?'重复':'未确认'} · ${r.condition==='full'?'连续四科':r.condition==='section'?'分科':'非计时'}</p><p>${esc(r.evidence)}</p><button type="button" data-edit-score="${esc(r.id)}">编辑</button> <button type="button" data-delete-score="${esc(r.id)}">删除记录</button></article>`).join('');
    $('readinessHistory').querySelectorAll('[data-edit-score]').forEach(b=>b.onclick=()=>{const r=records.find(r=>r.id===b.dataset.editScore);readinessEdit=r.id;$('readinessStage').value=r.stage;$('readinessDate').value=r.date;$('readinessSource').value=r.source;$('readinessMinimum').value=r.minimum??6;$('readinessBatch').value=r.batch||'';$('readinessMaterial').value=r.material||'unknown';$('readinessCondition').value=r.condition||'section';$('readinessRater').value=r.rater||'';$('readinessEvidence').value=r.evidence||'';for(const k of ['Listening','Reading','Writing','Speaking'])$('readiness'+k).value=r.scores?.[k.toLowerCase()]??'';$('cancelReadinessEdit').hidden=false;form.scrollIntoView({block:'start'});});
    $('readinessHistory').querySelectorAll('[data-delete-score]').forEach(b=>b.onclick=()=>{const i=records.findIndex(r=>r.id===b.dataset.deleteScore);if(i<0)return;(readinessStore().deleted ||= []).push(records[i]);records.splice(i,1);saveState();renderReadiness();$('readinessMessage').textContent='已从成绩列表移除，原记录保留在导出的备份中。';});
  }
  function bindReadiness(){
    const form=$('readinessForm');if(!form)return;
    function clear(){readinessEdit=null;for(const k of ['Listening','Reading','Writing','Speaking','Evidence'])$('readiness'+k).value='';for(const k of ['Batch','Rater'])$('readiness'+k).value='';$('readinessMaterial').value='unseen';$('readinessCondition').value='full';$('cancelReadinessEdit').hidden=true;}
    $('cancelReadinessEdit').onclick=clear;
    form.addEventListener('submit',e=>{e.preventDefault();
      const fields=['Listening','Reading','Writing','Speaking'];
      const scores=Object.fromEntries(fields.map(k=>[k.toLowerCase(),$('readiness'+k).value.trim()===''?null:Number($('readiness'+k).value)]));
      const message=$('readinessMessage'),source=$('readinessSource').value,evidence=$('readinessEvidence').value.trim(),minimum=Number($('readinessMinimum').value),day=$('readinessDate').value,batch=$('readinessBatch').value.trim(),material=$('readinessMaterial').value,condition=$('readinessCondition').value,rater=$('readinessRater').value.trim();
      if(ieltsOverall(scores)===null){message.textContent='请完整填写四科 0–9、间隔 0.5 的分数；空白不等于0。';return;}
      if(!day||engine.serialDate(day)===null||day>formatDate(new Date())){message.textContent='请填写有效且不晚于今天的测评日期。';return;}
      if(!Number.isFinite(minimum)||minimum<0||minimum>9||minimum*2!==Math.round(minimum*2)||$('readinessMinimum').value===''){message.textContent='单项建议值应为0–9，间隔0.5。';return;}
      if(['official','mock'].includes(source)&&!evidence){message.textContent='正式成绩或模考需要填写试卷、测评方式和评分来源。';return;}
      const stage=data.target.gates.find(g=>g.id===$('readinessStage').value),record={id:readinessEdit||String(Date.now()),date:day,stage:stage.id,stageLabel:stage.label,scores,source,evidence,minimum,batch,material,condition,rater};
      const records=readinessStore().records,index=records.findIndex(r=>r.id===readinessEdit);if(index>=0)records[index]=record;else records.push(record);
      saveState();clear();renderReadiness();message.textContent='已保存。'+readinessGate(record);
    });
  }

  function searchWord() {
    const query = $("wordSearch").value.trim().toLowerCase();
    const result = $("searchResult");
    if (!query) { result.innerHTML = ""; return; }
    const matches = Object.values(data.words).filter((entry) => entry.word.toLowerCase().includes(query)).slice(0, 12);
    result.innerHTML = matches.length ? `<div class="search-results">${matches.map((entry) => `<article>${wordArticle(entry)}</article>`).join("")}</div>` : `<p class="small muted">暂时没有找到“${esc(query)}”。可以在完整CSV里继续查找。</p>`;
    bindAudio(result);
  }

  function bilingualText(text, translation) {
    const english = lines(text);
    const chinese = String(translation || "").split(/\s*／\s*/).filter(Boolean);
    if (english.length !== chinese.length) return renderPassage({ text, translation });
    return `<div class="lesson-text">${english.map((sentence, i) => `<div class="lesson-line"><div class="example-line"><span class="english">${esc(sentence)}</span><button type="button" class="quiet" data-audio="${esc(sentence)}">🔊 听一句</button></div><p class="lesson-translation">${esc(chinese[i])}</p></div>`).join("")}</div>`;
  }

  function renderMaterials() {
    const type = $("materialType").value;
    const query = $("materialSearch").value.trim().toLowerCase();
    const items = type === "words" ? data.foundationWords.map((word) => data.words[word]) : data[type];
    const matches = items.map((item, id) => ({ item, id })).filter(({ item }) => JSON.stringify(item).toLowerCase().includes(query));
    $("materialList").innerHTML = matches.length ? matches.map(({ item, id }) => `<button type="button" class="catalog-item" data-material="${id}"><strong>${esc(item.title || item.word || `${type === "letters" ? "书信" : "议论文"} ${id + 1}`)}</strong><small>${esc(item.meaning || (typeof item === "string" ? item.slice(0, 90) : "打开材料与练习 →"))}</small></button>`).join("") : `<p class="muted">没有找到匹配材料，请换一个关键词。</p>`;
    $("materialDetail").hidden = true;
    $("materialList").querySelectorAll("[data-material]").forEach((button) => { button.onclick = () => {
      const item = items[Number(button.dataset.material)];
      let body;
      if (type === "words") body = wordArticle(item);
      else if (typeof item === "string") body = `<h3>写作任务</h3><p class="english">${esc(item)}</p><p class="muted">${type === "letters" ? "至少150词：先写目的，再逐项回应题目，最后写请求或结束语。" : "至少250词：先明确观点，再用两段理由和例子展开，最后总结。"} 这是自编练习，完成后可在今日主练习里使用AI陪练指令获取反馈。</p>`;
      else body = `<h3>${esc(item.title)}</h3>${bilingualText(item.text, item.translation)}${item.question ? `<p>${esc(item.question)}</p><details><summary>查看答案和原因</summary><p>${esc(item.answer)}</p></details>` : `<p class="muted">${esc(item.instruction || "听一句、跟读一句，再替换人物或地点说自己的版本。")}</p>`}`;
      $("materialDetail").innerHTML = body;
      $("materialDetail").hidden = false;
      bindAudio($("materialDetail"));
      $("materialDetail").scrollIntoView({ behavior: "smooth", block: "start" });
    }; });
  }

  function renderReadingCatalog() {
    learning.catalog('reading');
    const entries = [...data.easyReadings.map((item, id) => ({ item, id, easy: true })), ...data.passages.map((item, id) => ({ item, id, easy: false }))];
    $("legacyReadingCatalog").innerHTML = entries.map(({ item, id, easy }) => `<button class="catalog-item" type="button" data-reading="${id}" data-easy="${easy}"><small>${esc(easy ? item.level : "进阶 · 中文大意与问答")}</small><strong>${esc(item.title)}</strong><small>${easy && saved.readingAnswers?.[id]?.correct ? "理解题已答对 · 可继续复述" : "打开听读练习 →"}</small></button>`).join("");
    $("legacyReadingCatalog").querySelectorAll("[data-reading]").forEach((button) => { button.onclick = () => openReading(Number(button.dataset.reading), button.dataset.easy === "true"); });
  }

  function openReading(id, easy) {
    const item = easy ? data.easyReadings[id] : data.passages[id];
    const detail = $("readingDetail");
    detail.hidden = false;
    detail.innerHTML = `<h2>${esc(item.title)}</h2><p class="muted">先听读，再回答问题，最后遮住原文用两句话复述。</p><details open class="reading-text"><summary>原文与提示（点击可收起，练习复述）</summary>${easy ? `<div class="lesson-text">${item.sentences.map(([en, zh]) => `<div class="lesson-line"><div class="example-line"><span class="english">${esc(en)}</span><button class="quiet" type="button" data-audio="${esc(en)}">🔊 听一句</button></div><p class="lesson-translation">${esc(zh)}</p></div>`).join("")}</div>` : renderPassage(item)}</details>${easy ? `<form id="readingForm"><fieldset><legend>${esc(item.question)}</legend>${item.options.map((option, index) => `<label class="reading-option"><input type="radio" name="readingAnswer" value="${index}" required> ${esc(option)}</label>`).join("")}</fieldset><button type="submit" class="primary">检查理解</button><p id="readingFeedback" role="status"></p></form>` : ""}<p class="small muted secondary-section">复述提示：谁？做了什么？为什么？先说简单句即可。</p>`;
    bindAudio(detail);
    if (easy) $("readingForm").onsubmit = (event) => {
      event.preventDefault();
      const chosen = detail.querySelector('input[name="readingAnswer"]:checked');
      if (!chosen) return;
      const correct = Number(chosen.value) === item.correct;
      saved.readingAnswers = saved.readingAnswers || {};
      const previous = saved.readingAnswers[id] || {};
      saved.readingAnswers[id] = { correct, misses: (Number(previous.misses) || 0) + (correct ? 0 : 1), last: formatDate(new Date()) };
      saveState();
      $("readingFeedback").className = correct ? "success" : "error";
      $("readingFeedback").textContent = correct ? `答对了。${item.explanation}` : "还没答对，已加入错题本。回到原文找到对应句子，再试一次。";
      renderReadingCatalog();
    };
    detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  let pronTab = "alphabet";
  let pronAccent = pronunciationState().accent === "UK" ? "UK" : "US";
  let selectedPhoneme = null;
  let pairQuestion = null;

  function renderPronunciationProgress() {
    const progress = pronunciationState();
    $("pronunciationProgress").textContent = `字母 ${progress.letters.length}/26 · 音素 ${progress.phonemes.length}/${data.pronunciation.phonemes.length} · 辨音首答 ${progress.quiz.correct || 0}/${progress.quiz.attempts || 0}`;
  }

  function renderPhonemeCredits() {
    $("phonemeCredits").innerHTML = Object.values(data.phonemeCredits).map((item) =>
      `<div class="audio-credit"><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a><span>${esc(item.author || "署名见原文件页")}</span><a href="${esc(item.licenseUrl)}" target="_blank" rel="noopener">${esc(item.license)}</a></div>`
    ).join("");
  }

  function renderAlphabet() {
    const done = new Set(pronunciationState().letters);
    $("alphabetCatalog").innerHTML = data.pronunciation.alphabet.map((item) => {
      const example = data.words[item.example];
      return `<article class="alphabet-item"><div class="alphabet-head"><strong>${item.letter}<small>${item.letter.toLowerCase()}</small></strong><button type="button" class="quiet mark-button ${done.has(item.letter) ? "is-done" : ""}" data-mark-letter="${item.letter}" aria-label="${done.has(item.letter) ? "取消" : "标记"} ${item.letter} 已练习" title="${done.has(item.letter) ? "取消已练习" : "标记已练习"}">${done.has(item.letter) ? "✓" : "○"}</button></div><div class="pron-ipa"><span><b>US</b> ${esc(item.us)}</span><span><b>UK</b> ${esc(item.uk)}</span></div><div class="pron-buttons"><button type="button" class="secondary" data-audio="${item.letter}" data-accent="US" aria-label="播放字母 ${item.letter} 的美式名称">🔊 US</button><button type="button" class="secondary" data-audio="${item.letter}" data-accent="UK" aria-label="播放字母 ${item.letter} 的英式名称">🔊 UK</button></div><div class="alphabet-example"><span>例词 ${esc(item.example)}</span><small>${esc(pronAccent === "UK" ? example?.ukPhonetic || "UK 音标未收录" : example?.phonetic ? `/${example.phonetic}/` : "US 音标未收录")}</small><button type="button" class="quiet" data-audio="${esc(item.example)}" data-accent="${pronAccent}" aria-label="播放 ${item.example} 的${pronAccent === "UK" ? "英式" : "美式"}发音">🔊 ${pronAccent}</button></div></article>`;
    }).join("");
    bindAudio($("alphabetCatalog"));
    $("alphabetCatalog").querySelectorAll("[data-mark-letter]").forEach((button) => { button.onclick = () => {
      const progress = pronunciationState();
      progress.letters = progress.letters.includes(button.dataset.markLetter) ? progress.letters.filter((value) => value !== button.dataset.markLetter) : [...progress.letters, button.dataset.markLetter];
      saveState(); renderAlphabet(); renderPronunciationProgress();
    }; });
  }

  function openPhoneme(id) {
    selectedPhoneme = id;
    renderPhonemeDetail();
    $("phonemeDetail").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderIpa() {
    const sections = [
      ["美式主线 · 单元音", (item) => item.category === "vowel" && item.subtype === "monophthong"],
      ["美式主线 · 卷舌元音", (item) => item.subtype === "rhotic"],
      ["美式主线 · 双元音", (item) => item.subtype === "diphthong"],
      ["辅音", (item) => item.category === "consonant"],
      ["英式补充 · 非卷舌 RP", (item) => item.subtype === "uk-only"],
    ];
    const done = new Set(pronunciationState().phonemes);
    $("ipaCatalog").innerHTML = sections.map(([title, match]) => `<section class="ipa-group"><h3>${title}</h3><div class="ipa-grid">${data.pronunciation.phonemes.filter(match).map((item) => `<article class="ipa-tile ${selectedPhoneme === item.id ? "is-selected" : ""}"><button type="button" class="ipa-open" data-phoneme-open="${item.id}" aria-label="查看 ${esc(item.us || item.uk)} 发音详情"><strong>${esc(item.us || item.uk)}</strong><span>${esc(item.zh)}</span></button><button type="button" class="quiet ipa-play" data-phoneme-audio="${item.audio}" aria-label="播放 ${esc(item.us || item.uk)} 单音" title="播放单音">🔊</button>${done.has(item.id) ? `<span class="ipa-done" title="已练习">✓</span>` : ""}</article>`).join("")}</div></section>`).join("");
    bindAudio($("ipaCatalog"));
    $("ipaCatalog").querySelectorAll("[data-phoneme-open]").forEach((button) => { button.onclick = () => openPhoneme(button.dataset.phonemeOpen); });
    renderPhonemeDetail();
    renderPhonetics();
  }

  function phonemeMouthGuide(item) {
    const mouth = item.mouth || {};
    const jawClass = /大幅|明显/.test(mouth.jaw || "") ? "wide" : /中等/.test(mouth.jaw || "") ? "mid" : /由/.test(mouth.jaw || "") ? "glide" : "small";
    const lipClass = /闭合/.test(mouth.lips || "") ? "closed" : /圆|前突/.test(mouth.lips || "") ? "rounded" : "neutral";
    const tongueClass = /后部|后缩|软腭/.test(mouth.tongue || "") ? "back" : /前部|齿龈|齿尖|舌尖|硬腭/.test(mouth.tongue || "") ? "front" : "center";
    const nasal = item.subtype === "nasal";
    const stop = item.subtype === "stop" || item.subtype === "affricate";
    const airflow = nasal ? "口腔暂时封住，气流从鼻腔通过" : stop ? "先短暂挡住气流，再释放；塞擦音还要继续摩擦" : item.category === "vowel" ? "气流连续通过口腔，不在口腔中完全堵住" : "气流从狭窄通道通过，产生摩擦或滑音";
    const release = item.category === "vowel" ? "保持这个位置，让元音稳定响起" : nasal ? "保持鼻腔通道，声音从鼻腔出来" : stop ? "听到清楚的释放；词首重读时可带送气" : "保持窄缝或近似接近，不要突然加塞";
    const steps = [
      `嘴巴：${mouth.jaw || "按例词自然张开"}；${mouth.lips || "嘴唇保持自然"}。`,
      `舌位：${mouth.tongue || "舌头放松，跟随目标音位置"}。`,
      `气流：${airflow}。`,
      `声带：${mouth.voiced ? "振动；把手指放在喉结处应能感觉到持续嗡鸣" : "不振动；把手指放在喉结处应基本没有嗡鸣"}。`,
      `收尾：${release}。`
    ];
    return `<section class="mouth-coach" aria-label="${esc(item.us || item.uk)} 口型剖析"><div class="mouth-coach-heading"><div><h3>口型剖析 · 先摆位，再发声</h3><p>示意图给出标准起始位置；请配合单音和例词反复观察、录音、回放。</p></div><span class="mouth-legend"><i class="legend-dot ${mouth.voiced ? "voiced" : "quiet"}"></i>${mouth.voiced ? "声带振动" : "声带不振动"}</span></div><div class="mouth-diagrams"><div class="mouth-diagram"><b>正面：嘴唇与开口</b><div class="lip-visual ${jawClass} ${lipClass}" aria-hidden="true"><span></span></div><p>${esc(mouth.jaw || "按例词自然张开")} · ${esc(mouth.lips || "嘴唇保持自然")}</p></div><div class="mouth-diagram"><b>侧面：舌头目标位置</b><div class="tongue-visual ${tongueClass} ${jawClass}" aria-hidden="true"><span class="palate"></span><span class="tongue"></span><span class="air air-one">›</span><span class="air air-two">›</span></div><p>${esc(mouth.tongue || "舌头放松，跟随目标音位置")}</p></div></div><ol class="mouth-steps">${steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol><p class="mouth-check"><b>自检：</b>先听单音，再读 <strong>${esc(item.examples?.[0] || "例词")}</strong>；录下来后检查嘴唇、舌位和声带是否与上面三处一致。${nasal ? "捏住鼻子重读一次：如果声音明显被堵住，说明鼻腔通道没有打开。" : ""}</p></section>`;
  }

  function phonemeMedia(item) {
    const media = Array.isArray(item.media) ? item.media : [];
    if (!media.length) return "";
    return `<section class="phoneme-media" aria-label="${esc(item.us || item.uk)} 真人发音与口腔剖面视频"><div class="phoneme-media-heading"><div><h3>真人示范 · 先听真人声音</h3><p>第一段是真人口型和真人声音，不使用系统 TTS；后面的片段用于看舌位、口腔剖面或动作示范。视频需联网加载，若播放器出现配置错误，请打开来源页。</p></div><span class="small muted">${media.length} 个片段</span></div><div class="phoneme-media-grid">${media.map((clip, index) => `<article class="phoneme-media-card"><div class="phoneme-media-label"><b>${esc(clip.kind || "发音示范")}</b><span>${esc(clip.provider || "公开课程")} · ${esc(clip.status === "external" ? "联网" : clip.status || "待核验")} · ${esc(clip.verifiedOn || "未记录日期")}</span></div><div class="phoneme-video"><iframe loading="lazy" src="${esc(clip.video || "")}" title="${esc(clip.title || item.us || item.uk)} · ${esc(clip.kind || "发音示范")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><p class="media-fallback">播放器受限？<a href="${esc(clip.fallback || clip.url || clip.video || "")}" target="_blank" rel="noopener">打开${esc(clip.provider || "来源")}原页面 ↗</a></p></article>`).join("")}</div></section>`;
  }

  function renderPhonemeDetail() {
    const detail = $("phonemeDetail");
    const item = data.pronunciation.phonemes.find((entry) => entry.id === selectedPhoneme);
    if (!item) { detail.hidden = true; return; }
    window.LearningTools.cleanup();
    const practiced = pronunciationState().phonemes.includes(item.id);
    const examples = item.examples.map((word) => {
      const entry = data.words[word] || { word, phonetic: "", ukPhonetic: "" };
      return `<div class="phoneme-example"><strong>${esc(word)}</strong>${pronunciationControl(entry)}</div>`;
    }).join("");
    const contrasts = item.contrasts.map((id) => data.pronunciation.phonemes.find((entry) => entry.id === id)).filter(Boolean);
    const pairs = data.pronunciation.minimalPairs.filter((pair) => item.examples.includes(pair.left) || item.examples.includes(pair.right)).slice(0, 3);
    detail.innerHTML = `<div class="phoneme-detail-head"><div><p class="eyebrow">${item.category === "vowel" ? "VOWEL" : "CONSONANT"} · ${esc(item.name)}</p><h2>${esc(item.us || item.uk)} <small>${esc(item.zh)}</small></h2></div><button type="button" class="quiet" data-phoneme-close aria-label="关闭音标详情" title="关闭">×</button></div><div class="phoneme-detail-actions"><button type="button" class="secondary" data-phoneme-audio="${item.audio}" aria-label="播放 ${esc(item.us || item.uk)} 单音">🔊 听单音</button><button type="button" class="secondary ${practiced ? "is-done" : ""}" data-mark-phoneme="${item.id}">${practiced ? "✓ 已练习" : "标记已练习"}</button></div><p>${esc(item.tip)}</p><div class="accent-notes"><span><b>US</b> ${esc(item.us || "非主线")}</span><span><b>UK</b> ${esc(item.uk || "无直接对应")}</span></div>${phonemeMedia(item)}${phonemeMouthGuide(item)}<section class="phoneme-practice"><div class="phoneme-practice-heading"><div><h3>跟读闭环 · 听 → 录 → 对比 → 复练</h3><p class="small muted">先听单音和例词，再录一遍自己的声音。回放时只检查一个目标：${esc(item.mouth?.lips || "口型") }。</p></div><span class="pill">自评记录</span></div><ol><li>听真人示范或单音录音。</li><li>读例词“${esc(item.examples?.[0] || "例词") }”并录音。</li><li>回放自己的录音，与目标口型和舌位逐项对照。</li><li>选择“已练习”，下次优先复练这个音。</li></ol><div data-phoneme-recording></div></section><dl class="articulation"><div><dt>嘴巴</dt><dd>${esc(item.mouth.jaw)}</dd></div><div><dt>舌位</dt><dd>${esc(item.mouth.tongue)}</dd></div><div><dt>嘴唇</dt><dd>${esc(item.mouth.lips)}</dd></div><div><dt>声带</dt><dd>${item.mouth.voiced ? "振动" : "不振动"}</dd></div></dl><h3>例词 · 分别听 US / UK</h3><div class="phoneme-examples">${examples}</div>${contrasts.length ? `<div class="phoneme-contrasts"><h3>对照音</h3>${contrasts.map((other) => `<button type="button" class="quiet" data-phoneme-open="${other.id}">${esc(other.us || other.uk)} ${esc(other.zh)}</button>`).join("")}</div>` : ""}${pairs.length ? `<div class="phoneme-pairs"><h3>最小对立词</h3>${pairs.map((pair) => `<span>${esc(pair.left)} / ${esc(pair.right)}</span>`).join("")}</div>` : ""}`;
    detail.hidden = false;
    bindAudio(detail);
    learning.recordingUI(detail.querySelector('[data-phoneme-recording]'),`phoneme-${item.id}`);
    detail.querySelector("[data-phoneme-close]").onclick = () => { selectedPhoneme = null; detail.hidden = true; };
    detail.querySelector("[data-mark-phoneme]").onclick = () => {
      const progress = pronunciationState();
      progress.phonemes = practiced ? progress.phonemes.filter((id) => id !== item.id) : [...progress.phonemes, item.id];
      saveState(); renderIpa(); renderPronunciationProgress();
    };
    detail.querySelectorAll("[data-phoneme-open]").forEach((button) => { button.onclick = () => openPhoneme(button.dataset.phonemeOpen); });
  }

  function renderAmerican() {
    $("americanCatalog").innerHTML = data.pronunciation.americanFeatures.map((feature) => `<article class="american-feature"><div><span class="small muted">${esc(feature.notation)}</span><h3>${esc(feature.title)}</h3><p>${esc(feature.summary)}</p><p class="small muted">${esc(feature.practice)}</p></div><div class="feature-words">${feature.words.map((word) => {
      const entry = data.words[word] || { word, phonetic: "", ukPhonetic: "" };
      return `<div class="feature-word"><strong>${esc(word)}</strong>${pronunciationControl(entry)}</div>`;
    }).join("")}</div></article>`).join("");
    bindAudio($("americanCatalog"));
  }

  function newPairQuestion() {
    const choices = data.pronunciation.minimalPairs.filter((pair) => !pair.variable);
    const index = Math.floor(Math.random() * choices.length);
    pairQuestion = { pair: choices[index], answer: Math.floor(Math.random() * 2), attempted: false, solved: false };
    renderPairQuestion();
  }

  function renderPairQuestion() {
    if (!pairQuestion) { newPairQuestion(); return; }
    const { pair } = pairQuestion;
    $("minimalPairQuiz").innerHTML = `<div class="pair-prompt"><span class="small muted">${esc(pair.focus)} · ${pronAccent} 发音</span><button type="button" class="primary" id="playPairQuestion" aria-label="播放辨音题目">🔊 听题目</button></div><div class="pair-choices">${[pair.left, pair.right].map((word, index) => `<button type="button" class="secondary" data-pair-answer="${index}">${esc(word)}</button>`).join("")}</div><p id="pairFeedback" role="status" class="pair-feedback"></p><button type="button" class="quiet" id="nextPairQuestion" ${pairQuestion.solved ? "" : "hidden"}>下一题 →</button><p class="small muted">有些差异会因地区口音变化；例如 cot / caught 在许多美式口音里合并。</p>`;
    $("playPairQuestion").onclick = () => playAudio([pair.left, pair.right][pairQuestion.answer], pronAccent, $("playPairQuestion"));
    $("minimalPairQuiz").querySelectorAll("[data-pair-answer]").forEach((button) => { button.onclick = () => {
      if (pairQuestion.solved) return;
      const correct = Number(button.dataset.pairAnswer) === pairQuestion.answer;
      if (!pairQuestion.attempted) {
        const quiz = pronunciationState().quiz;
        quiz.attempts = (Number(quiz.attempts) || 0) + 1;
        quiz.correct = (Number(quiz.correct) || 0) + (correct ? 1 : 0);
        pairQuestion.attempted = true;
        saveState(); renderPronunciationProgress();
      }
      $("pairFeedback").textContent = correct ? `答对了。${pair.note}` : "再听一次，比较两个元音或辅音的口型。";
      $("pairFeedback").className = correct ? "pair-feedback success" : "pair-feedback error";
      pairQuestion.solved = correct;
      $("nextPairQuestion").hidden = !correct;
    }; });
    $("nextPairQuestion").onclick = newPairQuestion;
    if (!soundQuestion) newSoundQuestion();
  }

  function renderPronunciation() {
    document.querySelectorAll("[data-pron-tab]").forEach((button) => {
      const current = button.dataset.pronTab === pronTab;
      button.setAttribute("aria-selected", current ? "true" : "false");
      $("pron-panel-" + button.dataset.pronTab).hidden = !current;
    });
    document.querySelectorAll("[data-pron-accent]").forEach((button) => button.setAttribute("aria-pressed", button.dataset.pronAccent === pronAccent ? "true" : "false"));
    renderPronunciationProgress();
    if (pronTab === "alphabet") renderAlphabet();
    if (pronTab === "ipa") renderIpa();
    if (pronTab === "american") renderAmerican();
    if (pronTab === "pairs") renderPairQuestion();
  }

  const soundPairs = [
    ["sit", "seat", "ɪ / i：sit 更放松；seat 舌位更高。"],
    ["bed", "bad", "ɛ / æ：bad 的嘴张得更大。"],
    ["full", "fool", "ʊ / u：full 更短、更松；fool 的嘴唇更圆。"],
    ["ship", "sheep", "ɪ / i：ship 是船；sheep 是羊。"],
    ["thin", "sin", "θ / s：thin 舌尖轻触齿间；sin 舌尖留在齿后。"],
    ["rice", "lice", "r / l：rice 的 r 舌尖不碰上齿龈；lice 的 l 舌尖接触上齿龈。"],
    ["vest", "west", "v / w：vest 上齿轻触下唇；west 双唇收圆。"],
    ["fan", "van", "f / v：口型相近，van 的 v 声带振动。"],
  ];
  let soundQuestion = null;

  function renderPhonetics() {
    const groups = [...new Set(data.phonetics.map((item) => item.g))];
    if (!$("phoneticGroup").options.length) $("phoneticGroup").innerHTML = `<option value="">全部分类</option>${groups.map((group) => `<option>${esc(group)}</option>`).join("")}`;
    const group = $("phoneticGroup").value;
    $("phoneticCatalog").innerHTML = data.phonetics.filter((item) => !group || item.g === group).map((item) => `<article class="phon-item"><span class="small muted">${esc(item.g)}</span><h2>/${esc(item.s)}/</h2><h3>发音要点</h3><p>${esc(item.tip)}</p><p class="small"><b>常见拼写：</b>${esc(item.sp)}</p><p class="small"><b>注意区分：</b>${esc(item.mis)}</p><div class="phon-words">${item.ws.split(/\s+/).filter(Boolean).map((word) => `<button class="secondary" type="button" data-audio="${esc(word)}" aria-label="听例词 ${esc(word)}">${esc(word)} 🔊</button>`).join("")}</div></article>`).join("");
    bindAudio($("phoneticCatalog"));
    if (!soundQuestion) newSoundQuestion();
  }

  function newSoundQuestion() {
    const pair = soundPairs[Math.floor(Math.random() * soundPairs.length)];
    soundQuestion = { pair, correct: Math.floor(Math.random() * 2) };
    $("soundQuiz").innerHTML = `<button class="secondary" type="button" id="hearSoundQuestion">🔊 听题目</button><div class="flash-actions">${pair.slice(0, 2).map((word, index) => `<button class="secondary" type="button" data-sound-answer="${index}">${esc(word)}</button>`).join("")}</div><p id="soundFeedback" role="status"></p><button type="button" class="quiet" id="nextSoundQuestion" hidden>下一题 →</button>`;
    $("hearSoundQuestion").onclick = () => playAudio(pair[soundQuestion.correct]);
    $("soundQuiz").querySelectorAll("[data-sound-answer]").forEach((button) => { button.onclick = () => {
      const correct = Number(button.dataset.soundAnswer) === soundQuestion.correct;
      $("soundFeedback").textContent = correct ? `答对了。${pair[2]}` : "再听一次，留意发音的区别。";
      $("soundFeedback").className = correct ? "success" : "error";
      $("nextSoundQuestion").hidden = !correct;
    }; });
    $("nextSoundQuestion").onclick = newSoundQuestion;
  }

  function bindStaticEvents() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener("click", (event) => {
      const view = link.getAttribute("href").slice(1);
      if (!$("view-" + view)) return;
      event.preventDefault(); navigate(view); window.scrollTo({ top: 0 });
    }));
    window.addEventListener("popstate", () => setView(window.location.hash.slice(1)));
    $("studyDate").addEventListener("change", () => { selectedDate = $("studyDate").value; renderDay(); });
    $("backToday").addEventListener("click", () => { selectedDate = formatDate(new Date()); renderDay(); });
    $("searchWord").addEventListener("click", searchWord);
    $("wordSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") searchWord(); });
    $("materialType").addEventListener("change", renderMaterials);
    $("materialSearch").addEventListener("input", renderMaterials);
    bindReadiness();
    $("phoneticGroup").addEventListener("change", renderPhonetics);
    document.querySelectorAll("[data-pron-tab]").forEach((button) => { button.onclick = () => {
      pronunciationAudio.stop();
      pronTab = button.dataset.pronTab;
      renderPronunciation();
    }; });
    document.querySelectorAll("[data-pron-accent]").forEach((button) => { button.onclick = () => {
      pronunciationAudio.stop();
      pronAccent = button.dataset.pronAccent;
      pronunciationState().accent = pronAccent;
      pairQuestion = null;
      saveState();
      renderPronunciation();
    }; });
  }

  $("feishuLink").href = data.feishu;
  restoreLegacyMistakes();
  bindStaticEvents();
  renderPhonemeCredits();
  setView(window.location.hash.slice(1) || "today");
  renderDay();
})();
