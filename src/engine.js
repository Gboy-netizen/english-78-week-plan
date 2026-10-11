(function (root) {
  "use strict";
  const DAY_MS = 86400000;
  const REVIEW_GAPS = [1, 3, 7, 14, 30, 60];

  function serialDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      ? date.getTime() / DAY_MS : null;
  }

  function dateAt(start, offset) {
    return new Date((serialDate(start) + offset) * DAY_MS).toISOString().slice(0, 10);
  }

  function dayInfo(value, data) {
    const serial = serialDate(value);
    if (serial === null) return { status: "invalid" };
    const offset = serial - serialDate(data.start);
    if (offset < 0) return { status: "before" };
    if (offset >= 546) return { status: "after" };
    const week = Math.floor(offset / 7) + 1;
    const phase = data.phases.find(p => week >= p.start && week <= p.end);
    return { status: "active", date: value, offset, week, day: offset % 7, phase,
      weekday: new Date(serial * DAY_MS).getUTCDay(),
      weekStart: dateAt(data.start, Math.floor(offset / 7) * 7),
      weekEnd: dateAt(data.start, Math.floor(offset / 7) * 7 + 6) };
  }

  function unique(values) { return [...new Set(values)]; }
  function eligible(word, data) {
    return data.words[word] && ["exact", "curated"].includes(data.words[word].quality);
  }

  function newWords(info, data) {
    if (info.status !== "active" || info.day >= 5) return [];
    if (info.week <= 2) {
      const start = ((info.week - 1) * 5 + info.day) * 10;
      return data.foundationWords.slice(start, start + 10);
    }
    const unit=data.coursePack?.units.find(u=>u.week===info.week);
    const stopwords=new Set('their there that this these those would could should about which where when have been with from into than they them then also only some more very does before after other'.split(' '));
    const contextual=unit?unique(([unit.reading.text,unit.reading2.text,unit.listening.text].join(' ').toLowerCase().match(/[a-z]+/g)||[]).filter(w=>w.length>3&&!stopwords.has(w)&&eligible(w,data))).slice(0,25):[];
    const pool = contextual.length>=5?contextual:(data.weeks[info.week] || []).filter(w => eligible(w, data));
    return pool.slice(Math.floor(pool.length * info.day / 5), Math.floor(pool.length * (info.day + 1) / 5));
  }

  function reviewWords(info, data) {
    if (info.status !== "active") return [];
    const offsets = info.day >= 5 ? Array.from({ length: info.day }, (_, i) => info.offset - info.day + i)
      : [info.offset - 1, info.offset - 3, info.offset - 7];
    const words = unique(offsets.filter(n => n >= 0).flatMap(n => newWords(dayInfo(dateAt(data.start, n), data), data)));
    return words.length ? words : data.foundationWords.slice(0, 5);
  }

  function wordsFor(info, data) {
    const fresh = newWords(info, data);
    const isReview = !fresh.length;
    const words = isReview ? reviewWords(info, data).slice(0, 20) : fresh;
    return { words, isReview, review: reviewWords(info, data),
      extension: (data.weeks[info.week] || []).filter(w => !words.includes(w)) };
  }

  function phoneticsFor(info, data) {
    if (info.status !== "active" || info.phase.id !== "P1") return [];
    const base = (info.week - 1) * 25;
    const indices = info.day >= 5 ? Array.from({ length: 25 }, (_, i) => base + i)
      : Array.from({ length: 5 }, (_, i) => base + info.day * 5 + i);
    return unique(indices.filter(n => info.week > 2 || n < 48).map(n => n % 48)).map(i => data.phonetics[i]);
  }

  function lessonFor(info, data) {
    const index = (info.week - info.phase.start) % 10;
    let lesson;
    if (info.week <= 2) {
      const base = (info.week - 1) * 5;
      lesson = info.day < 5 ? { ...data.foundationLessons[base + info.day] } : {
        title: info.day === 5 ? "把本轮句子串起来" : "说一段自己的介绍",
        text: data.foundationLessons.slice(base, base + 5).map(l => l.text.split(" / ")[0]).join(" / "),
        translation: "综合复习本轮五个主题；将示范信息换成你自己的情况。",
        instruction: "先读一遍，再遮住文本说30–60秒。记录一句已经说顺的话和一句仍需练习的话。",
      };
    } else if (["P1", "P2"].includes(info.phase.id)) {
      lesson = { ...data.scenarios[index], instruction: "先读懂 → 逐句跟读三遍 → 分角色练两轮 → 替换信息再说一次。" };
    } else {
      lesson = { ...data.passages[index], instruction: "先听系统朗读或自己读一遍 → 回答问题 → 对照答案 → 用自己的话复述。" };
    }
    lesson.kind = "practice";
    lesson.task = info.week <= 2 ? lesson.title : info.phase.tasks[info.day];
    if (info.phase.id === "P4") lesson.grammar = data.grammar[index];
    if (info.phase.id === "P5" && [1, 3, 4].includes(info.day)) {
      lesson.kind = "diary";
      lesson.writing = "Write about three things you did today. Say what happened, how you felt, and what you will do tomorrow. Aim for about 100 words.";
    }
    if (info.phase.id === "P6" && info.day === 4) {
      lesson.kind = "letter"; lesson.writing = data.letters[index];
    }
    if (["P7", "P8"].includes(info.phase.id) && info.day === 3) {
      lesson.kind = "essay"; lesson.writing = data.essays[index];
    }
    if (["P7", "P8"].includes(info.phase.id) && info.day === 4) {
      lesson.kind = "speaking";
      lesson.speaking = "Part 1: What do you enjoy doing in your free time? Why?\nPart 2: Describe a skill you would like to learn. Say what it is, why you want to learn it, how you would learn it, and how it could help you.\nPart 3: Why is lifelong learning important? How has technology changed the way people learn?";
    }
    if (["P6", "P7", "P8"].includes(info.phase.id)) lesson.official = true;
    const unit = data.coursePack?.units.find(item => item.week === info.week);
    if (unit) {
      lesson.course = unit;
      lesson.kind = info.day===4 && unit.minWords>=250 ? 'essay' : 'course';
      lesson.task = `${["盲听抓信息", "阅读找依据", "语法与改写", "场景角色扮演", "写一份自己的版本", "纠错与再表达", "新材料迁移测验"][info.day]} · ${unit.title}`;
      if (info.week > 2) {
        lesson.title = unit.title;
        lesson.text = unit.reading.text.split(/(?<=[.!?])\s+/).slice(0, 3).join(" / ");
        lesson.translation = unit.reading.translation;
        lesson.instruction = "跟读三句热身，再进入本周的听、读、语法与写说训练。";
      }
    }
    return lesson;
  }

  function makePrompt(info, lesson) {
    const context = `我在按78周计划准备IELTS General 6.5，现在是${info.phase.id}第${info.week}周。本次主题：${lesson.title}。`;
    if (lesson.course) return `${context}\n今日任务：${lesson.task}。本周目标：${lesson.course.goal}\n角色任务：${lesson.course.roleplay}\n写作题目：${lesson.course.writing}\n请先问我今天需要角色扮演还是写作反馈，等我回答再继续。角色扮演一次只说一轮；写作先等我提交草稿，再检查任务信息、句子和衔接。只在实际听到录音时评价发音。不要将自编练习成绩换算成雅思分数。`;
    if (lesson.kind === "letter" || lesson.kind === "essay") {
      const number = lesson.kind === "letter" ? 1 : 2;
      const criterion = number === 1 ? "Task Achievement" : "Task Response";
      return `${context}\n这是General Writing Task ${number}自编练习，题目：${lesson.writing}\n请先等我粘贴作文，再按${criterion}、Coherence and Cohesion、Lexical Resource、Grammatical Range and Accuracy给出练习用的估分及理由。检查字数至少${number === 1 ? 150 : 250}词；指出3处最值得改进的问题，给修改示例。请说明这不是官方评分。`;
    }
    if (lesson.kind === "speaking") return `${context}\n请按雅思口语Part 1、2、3流程一次只问一个问题。题目可参考：${lesson.speaking}\nPart 2请让我自己计时准备1分钟、讲1–2分钟。结束后用中文给出流利度、词汇、语法方面的具体反馈；只有能实际听到录音时才评论发音。练习估分不是官方成绩。`;
    if (lesson.kind === "diary") return `${context}\n请等我发来约100词的日记，先肯定一处具体进步，再指出3个基础语法或表达问题。用简单英语给修改示例，并让我口述修改后的版本。题目：${lesson.writing}`;
    if (lesson.grammar) return `${context}\n今天练${lesson.grammar.title}。请先用简单中文解释，结合这些例句：${lesson.grammar.text}。再逐题出5道小题，等我回答才揭晓答案，最后让我造两句自己的生活句。`;
    if (lesson.official && info.day !== 6) return `${context}\n我要练听力或阅读错题分析。请先向我要官方练习的原文、题目、正确答案和我的答案；收到后逐题指出原文依据、同义替换和错因。不要在缺少原文时猜答案。最后整理3条复习要点。`;
    return `${context}\n以下是今天的自编材料：${lesson.text}\n请当我的耐心英语伙伴，用比材料稍简单的英语，一次问一个问题，陪我练8轮。不要一次展示整段对话。卡住时给一句中文提示，结束后用中文指出3处可改进的地方，再让我重说。`;
  }

  function durations(mode, kind) {
    if (mode === "recovery") return [5, 10, 12, 3];
    return kind === "essay" ? [5, 5, 40, 5] : [8, 7, 30, 5];
  }

  function normaliseAnswer(value) { return value.trim().toLowerCase(); }
  function createSession(words) { return { queue: [...words], index: 0, wrong: [], retry: false, done: false }; }
  function gradeSession(session, answer) {
    if (session.done) return { correct: false, done: true };
    const word = session.queue[session.index];
    const correct = normaliseAnswer(answer) === normaliseAnswer(word);
    if (!correct && !session.wrong.includes(word)) session.wrong.push(word);
    return { correct, word };
  }
  function advanceSession(session) {
    if (session.done) return;
    session.index += 1;
    if (session.index < session.queue.length) return;
    if (!session.retry && session.wrong.length) {
      session.queue = [...session.wrong]; session.index = 0; session.retry = true;
    } else { session.done = true; }
  }

  function dueCards(cards, date, data, limit = 8) {
    const today = serialDate(date);
    if (today === null || !cards || typeof cards !== "object") return [];
    return Object.entries(cards)
      .filter(([word, card]) => eligible(word, data) && card && serialDate(card.due) !== null && serialDate(card.due) <= today)
      .sort((a, b) => serialDate(a[1].due) - serialDate(b[1].due) || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([word]) => word);
  }

  function recordCard(cards, word, date, remembered) {
    if (!cards || typeof cards !== "object" || serialDate(date) === null) return null;
    const previous = cards[word] && typeof cards[word] === "object" ? cards[word] : null;
    if (remembered && previous?.last === date) return previous;
    const oldStage = Number.isInteger(previous?.stage) && previous.stage >= 0 && previous.stage < REVIEW_GAPS.length
      ? previous.stage : -1;
    const stage = remembered ? Math.min(oldStage + 1, REVIEW_GAPS.length - 1) : 0;
    const oldHits = Number.isSafeInteger(previous?.hits) && previous.hits >= 0 ? previous.hits : 0;
    const oldMisses = Number.isSafeInteger(previous?.misses) && previous.misses >= 0 ? previous.misses : 0;
    const card = {
      stage, due: dateAt(date, REVIEW_GAPS[stage]), last: date,
      hits: oldHits + (remembered ? 1 : 0),
      misses: oldMisses + (remembered ? 0 : 1),
    };
    cards[word] = card;
    return card;
  }

  const api = { serialDate, dateAt, dayInfo, newWords, reviewWords, wordsFor, phoneticsFor,
    lessonFor, makePrompt, durations, normaliseAnswer, createSession, gradeSession, advanceSession,
    dueCards, recordCard, REVIEW_GAPS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PlanEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
