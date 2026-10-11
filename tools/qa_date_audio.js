const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage();
    const events = [];
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.stack || error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
    await page.addInitScript(() => {
      window.__audio = { spoken: [], online: [], stopped: 0 };
      window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
        cancel() { window.__audio.stopped += 1; },
        getVoices() { return [{ lang: "en-US" }, { lang: "en-GB" }]; },
        speak(utterance) { window.__audio.spoken.push({ text: utterance.text, lang: utterance.lang }); utterance.onstart?.(); },
      } });
      window.Audio = class { constructor(url) { window.__audio.online.push(url); } play() { this.onplaying?.(); return Promise.resolve(); } pause() {} };
    });
    await page.goto(pathToFileURL(path.resolve("index.html")).href);
    await page.locator("#studyDate").fill("2026-09-25");
    await page.locator("#studyDate").dispatchEvent("change");
    await page.locator("#startLearning").click();
    const report = { warmup: [], words: [], main: [], errors };
    for (const button of await page.locator('#practice [data-speak]').all()) {
      await button.click();
      report.warmup.push(await button.getAttribute("data-speak"));
    }
    const warmupCount = (await page.evaluate(() => window.__audio.spoken)).length;
    if (warmupCount !== report.warmup.length) throw new Error(`warmup audio fired ${warmupCount} times for ${report.warmup.length} clicks`);
    await page.locator('[data-step="1"]').click();
    const word = await page.locator('.word-stage [data-audio][data-accent="US"]').getAttribute("data-audio");
    await page.locator('.word-stage [data-audio][data-accent="US"]').click();
    await page.locator('.word-stage [data-audio][data-accent="UK"]').click();
    report.words.push(word);
    await page.locator("#spellInput").fill(word);
    await page.locator("#spellForm button").click();
    await page.locator("details.example summary").click();
    if (await page.locator(".example-line [data-audio]").count()) await page.locator(".example-line [data-audio]").click();
    await page.locator('[data-step="2"]').click();
    for (const button of await page.locator('#practice [data-speak]').all()) {
      await button.click();
      report.main.push(await button.getAttribute("data-speak"));
    }
    const mainCount = (await page.evaluate(() => window.__audio.spoken)).length - warmupCount - 3;
    if (mainCount !== report.main.length) throw new Error(`main audio fired ${mainCount} times for ${report.main.length} clicks`);
    report.audio = await page.evaluate(() => window.__audio);
    report.errors = errors;
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
