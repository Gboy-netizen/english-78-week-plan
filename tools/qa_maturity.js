const assert = require("assert/strict");
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script id="planData" type="application\/json">([\s\S]*?)<\/script>/);
assert(match, "planData is missing");
const data = JSON.parse(match[1]);
const phonemes = data.pronunciation.phonemes;
assert.equal(phonemes.length, 47);
const media = phonemes.flatMap(item => item.media || []);
assert(media.length > 0);
assert(media.every(item => item.status === "external" && item.verifiedOn && item.fallback));
assert.equal(data.coursePack.units.filter(item => item.listening.audioKind === "system-tts").length, 78);
assert(html.includes("播放器受限"));
assert(html.includes("完整四科"));
assert(html.includes("导出学习包"));
assert(html.includes("错误标签"));
console.log(`OK: maturity labels, ${media.length} external media records, TTS disclosure, full mock and bundle UI`);
