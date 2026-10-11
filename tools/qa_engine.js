const fs = require("fs");
const engine = require("../src/engine.js");
const usPronunciations = require("../data/us_pronunciations.json");
const extraWords = require("../data/pronunciation.json").extraWords;

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script id="planData" type="application\/json">([\s\S]*?)<\/script>/);
if (!match) throw new Error("planData is missing from index.html");
const data = JSON.parse(match[1]);

const errors = [];
for (let offset = 0; offset < 546; offset += 1) {
  const date = engine.dateAt(data.start, offset);
  const info = engine.dayInfo(date, data);
  try {
    const lesson = engine.lessonFor(info, data);
    const words = engine.wordsFor(info, data);
    engine.phoneticsFor(info, data);
    if (info.status !== "active" || !lesson || !words.words.length) errors.push(`${offset}:${date}`);
  } catch (error) {
    errors.push(`${offset}:${date}:${error.message}`);
  }
}
if (errors.length) throw new Error(`day coverage failed: ${errors.slice(0, 5).join(", ")}`);

for (const date of ["2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22"]) {
  const info = engine.dayInfo(date, data);
  const words = engine.wordsFor(info, data);
  if (info.week <= 2 && info.day < 5 && words.words.length !== 10) throw new Error(`${date} should have 10 foundation words`);
}
const invalid = ["2026-02-30", "2026/09/18", "2028-03-15"];
for (const date of invalid) if (engine.dayInfo(date, data).status !== (date === "2028-03-15" ? "after" : "invalid")) throw new Error(`invalid date accepted: ${date}`);
if (!data.words.notes || !data.words.notes.meaning.includes("笔记")) throw new Error("notes override missing");
for (const [word, phonetic] of Object.entries({ hello: "həˈloʊ", sorry: "ˈsɑri", notes: "ˈnoʊts", orders: "ˈɔrdɚz" })) {
  if (data.words[word]?.phonetic !== phonetic) throw new Error(`${word} does not use American IPA`);
}
for (const [word, phonetic] of Object.entries({ it: "/ɪt/", us: "/ʌs/ · /əs/", was: "/wɒz/ · /wəz/" })) {
  if (data.words[word]?.ukPhonetic !== phonetic || data.words[word]?.ukSource !== "curated") throw new Error(`${word} lacks curated UK IPA`);
}
for (const entry of Object.values(data.words)) {
  if (entry.quality === "exact" && !entry.phonetic) throw new Error(`${entry.word} is missing American IPA`);
  const expected = extraWords[entry.word]?.us.slice(1, -1) || usPronunciations[entry.word] || "";
  if (entry.phonetic !== expected) throw new Error(`${entry.word} does not match American IPA source`);
}
if (data.phonetics.some((item) => ["ɒ", "əʊ", "ɪə", "eə", "ʊə", "ɜː"].includes(item.s))) throw new Error("British vowel card remains");
if (engine.phoneticsFor(engine.dayInfo("2026-09-26", data), data).some((item) => !item)) throw new Error("phonetic review contains an empty item");
const cards = {};
engine.recordCard(cards, "work", "2026-09-19", true);
if (cards.work.due !== "2026-09-20" || engine.dueCards(cards, "2026-09-19", data).length) throw new Error("first review schedule is wrong");
engine.recordCard(cards, "work", "2026-09-19", true);
if (cards.work.stage !== 0) throw new Error("same-day practice advanced the review interval");
engine.recordCard(cards, "work", "2026-09-20", true);
if (cards.work.due !== "2026-09-23" || engine.dueCards(cards, "2026-09-20", data).length) throw new Error("second review schedule is wrong");
engine.recordCard(cards, "work", "2026-09-23", false);
if (cards.work.due !== "2026-09-24" || cards.work.stage !== 0 || engine.dueCards(cards, "2026-09-24", data)[0] !== "work") throw new Error("forgotten card was not returned tomorrow");
if (engine.dueCards({ work: { due: "bad-date" } }, "2026-09-24", data).length) throw new Error("invalid review date accepted");
const corrupted = { work: { stage: -5, hits: "bad", misses: null, due: "2026-09-20" } };
engine.recordCard(corrupted, "work", "2026-09-24", true);
if (corrupted.work.due !== "2026-09-25" || corrupted.work.hits !== 1) throw new Error("corrupt card state was not repaired");
console.log(`OK: 546 active days, foundation lessons, date boundaries, American IPA and notes override`);
