"""Audit the actual browser engine and authored materials, without duplicating routing rules.

Run after changing curriculum data; this reads current build inputs, not stale HTML.
Requires Python 3.10+ and Node.js on PATH. No browser or network needed.
"""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import build_plan

SCRIPT = r"""
const engine = require('./src/engine.js');
const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const count = text => (String(text || '').match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;
const phaseStats = {};
const fresh = new Set();
for (let offset = 0; offset < 546; offset++) {
  const info = engine.dayInfo(engine.dateAt(data.start, offset), data);
  const lesson = engine.lessonFor(info, data);
  const words = engine.newWords(info, data);
  words.forEach(word => fresh.add(word));
  const row = phaseStats[info.phase.id] ||= { days: 0, newWordAssignments: 0, sourceTexts: new Set() };
  row.days++;
  row.newWordAssignments += words.length;
  if (lesson.course) {
    for (const kind of ['reading', 'reading2', 'listening', 'transfer']) row.sourceTexts.add(lesson.course[kind].text);
  } else {
    row.sourceTexts.add(lesson.text);
  }
}
const units = data.coursePack.units;
const texts = units.flatMap(u => ['reading','reading2','listening','transfer'].map(kind => u[kind].text));
const questionCount = units.reduce((n,u) => n + ['reading','reading2','listening','grammar','transfer'].reduce((m,k) => m + u[k].questions.length, 0), 0);
console.log(JSON.stringify({
  days: 546, upgradedWeeks: units.length, upgradedDays: units.length * 7,
  uniqueCoreNewWords: fresh.size,
  originalMaterials: { reading: data.passages.length, easyReading: data.easyReadings.length, scenarios: data.scenarios.length },
  added: { uniqueTexts: new Set(texts).size, englishWords: texts.reduce((n,t) => n + count(t),0), questions: questionCount, writingTasks: units.length, roleplayTasks: units.length },
  weeks: units.map(u => ({ week:u.week, title:u.title, readingWords:count(u.reading.text), dialogueWords:count(u.listening.text.replace(/\b[AB]:/g,'')), transferWords:count(u.transfer.text), outputWords:u.minWords, speakingSeconds:u.speakingSeconds })),
  phases: Object.fromEntries(Object.entries(phaseStats).map(([id,p]) => [id, {...p, sourceTexts:p.sourceTexts.size}]))
}));
"""


def main():
    result = subprocess.run(["node", "-e", SCRIPT], cwd=ROOT,
                            input=json.dumps(build_plan.build_data(), ensure_ascii=True),
                            text=True, encoding="utf-8", capture_output=True, check=True)
    audit = json.loads(result.stdout)
    if "--json" in sys.argv:
        print(json.dumps(audit, ensure_ascii=False, indent=2))
        return
    print(f"CURRICULUM: {audit['days']} days; {audit['upgradedWeeks']} upgraded weeks / {audit['upgradedDays']} days")
    print("ADDED:", audit["added"])
    print("Unique core new words (not mastered vocabulary):", audit["uniqueCoreNewWords"])
    print("Phase / days / new word assignments / unique source texts")
    for key, row in audit["phases"].items():
        print(key, row["days"], row["newWordAssignments"], row["sourceTexts"])
    print("Week / reading words / dialogue words / transfer words / suggested writing words / speaking seconds")
    for row in audit["weeks"]:
        print(row["week"], row["readingWords"], row["dialogueWords"], row["transferWords"], row["outputWords"], row["speakingSeconds"])
    print("Limits: 78 weeks now covered; embedded materials remain short practice texts. TTS is not authentic listening audio.")
    print("Minutes are suggested practice budgets, not measured learning time. Scores do not map to IELTS bands.")


if __name__ == "__main__":
    main()
