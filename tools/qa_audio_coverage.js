const fs = require("fs");
const engine = require("../src/engine.js");

const html = fs.readFileSync("index.html", "utf8");
const start = html.indexOf('<script id="planData"');
const end = html.indexOf("</script>", start);
if (start < 0 || end < 0) throw new Error("planData is missing from index.html");
const data = JSON.parse(html.slice(html.indexOf(">", start) + 1, end));
const failures = [];

for (let offset = 0; offset < 546; offset += 1) {
  const date = engine.dateAt(data.start, offset);
  const info = engine.dayInfo(date, data);
  const lesson = engine.lessonFor(info, data);
  const wordData = engine.wordsFor(info, data);
  if (!lesson || !String(lesson.text || lesson.speaking || lesson.grammar?.text || "").trim()) {
    failures.push(`${date}: main lesson has no speakable English text`);
  }
  if (!String(lesson.text || "").trim()) failures.push(`${date}: warmup has no speakable text`);
  for (const word of wordData.words) {
    const entry = data.words[word];
    if (!entry || !String(entry.word || word).trim()) failures.push(`${date}: missing word ${word}`);
  }
}

if (failures.length) throw new Error(failures.slice(0, 20).join("\n"));
console.log("OK: 546 dates have non-empty warmup, word and main-practice audio source text");
