const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");
const assert = require("assert");
const fs = require("fs");

(async () => {
  fs.mkdirSync("_shots", { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.__spoken = [];
      window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      Object.defineProperty(window, "speechSynthesis", { value: {
        cancel() {}, getVoices() { return [{ lang: "en-US" }]; },
        speak(utterance) { window.__spoken.push({ text: utterance.text, lang: utterance.lang }); utterance.onstart?.(); },
      } });
    });
    await page.goto(pathToFileURL(path.resolve("index.html")).href);
    await page.locator("[data-view=mistakes]").click();
    assert(await page.locator("#mistakeList").textContent().then((text) => text.includes("还没有单词错题")));
    assert(await page.locator("#reviewMistakes").isDisabled());
    await page.evaluate(() => localStorage.setItem("little-english-progress-v1", JSON.stringify({ days: {
      "2026-09-18": { wordSession: { wrong: ["work", "job"] } },
    } })));
    await page.reload();
    assert.equal(await page.locator("#mistakeList > article").count(), 2);
    await page.reload();
    const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem("little-english-progress-v1")).cards);
    assert.equal(migrated.work.misses, 1);
    await page.locator('[data-practice-word="job"]').click();
    assert(await page.locator("[data-flash-reveal]").isVisible());
    assert.equal(await page.locator("#practice .word-label").count(), 0);
    await page.locator("[data-view=reading]").click();
    assert.equal(await page.locator("[data-reading]").count(), 15);
    await page.getByText('旧版 15 篇补充材料（保留原练习记录）',{exact:true}).click();
    await page.locator('[data-reading="0"][data-easy="true"]').click();
    assert.equal(await page.locator("#readingDetail .lesson-translation").count(), 5);
    await page.locator("#readingDetail [data-audio]").first().click();
    assert.deepEqual(await page.evaluate(() => window.__spoken.at(-1)), { text: "I work in an office near my home.", lang: "en-US" });
    await page.locator('input[name="readingAnswer"][value="0"]').check();
    await page.locator("#readingForm button").click();
    assert((await page.locator("#readingFeedback").textContent()).includes("已加入错题本"));
    await page.locator("[data-view=mistakes]").click();
    assert.equal(await page.locator("[data-retry-reading]").count(), 1);
    await page.locator("[data-retry-reading]").click();
    assert.equal(await page.locator('input[name="readingAnswer"]:checked').count(), 0);
    await page.locator('input[name="readingAnswer"][value="1"]').check();
    await page.locator("#readingForm button").click();
    assert((await page.locator("#readingFeedback").textContent()).includes("After dinner"));
    await page.reload();
    await page.locator("[data-view=mistakes]").click();
    assert((await page.locator("#readingMistakes").textContent()).includes("最近已答对"));
    await page.locator("[data-view=resources]").click();
    for (const type of ["foundationLessons", "scenarios", "grammar", "letters", "essays", "words"]) {
      await page.locator("#materialType").selectOption(type);
      assert.equal(await page.locator("[data-material]").count(), type === "words" ? 100 : 10);
      await page.locator("[data-material]").first().click();
      assert(await page.locator("#materialDetail").isVisible());
    }
    await page.locator("#materialSearch").fill("work");
    await page.locator("[data-material]").filter({ hasText: /^work/ }).click();
    assert((await page.locator("#materialDetail").textContent()).includes("work as a teacher"));
    await page.locator("#materialSearch").fill("zzzznomatch");
    assert.equal(await page.locator("[data-material]").count(), 0);
    await page.locator("[data-view=phonetics]").click();
    await page.locator('[data-pron-tab="ipa"]').click();
    await page.locator('#pron-panel-ipa details.legacy-phonetics summary').click();
    assert.equal(await page.locator("#phoneticCatalog article").count(), 48);
    await page.locator("#phoneticGroup").selectOption({ label: "单元音" });
    assert(await page.locator("#phoneticCatalog article").count() > 0);
    await page.locator("#phoneticCatalog [data-audio]").first().click();
    assert.equal((await page.evaluate(() => window.__spoken.at(-1))).lang, "en-US");
    await page.locator('[data-pron-tab="pairs"]').click();
    await page.locator('#pron-panel-pairs details.legacy-phonetics summary').click();
    await page.locator("#hearSoundQuestion").click();
    const answer = (await page.evaluate(() => window.__spoken.at(-1))).text;
    const choices = page.locator("[data-sound-answer]");
    const labels = await choices.allTextContents();
    await choices.nth(labels.findIndex((label) => label !== answer)).click();
    assert(await page.locator("#nextSoundQuestion").isHidden());
    await choices.nth(labels.indexOf(answer)).click();
    assert(await page.locator("#nextSoundQuestion").isVisible());
    await page.screenshot({ path: "_shots/phonetics-mobile.png", fullPage: true });
    for (const view of ["today", "mistakes", "reading", "phonetics", "resources"]) {
      await page.locator(`[data-view=${view}]`).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, view);
    }
    assert.deepEqual(errors, []);
    console.log("OK: legacy mistakes, reading grading/persistence, 100 usages, 50 lessons, 48 phonetics, US speech, mobile layout");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
