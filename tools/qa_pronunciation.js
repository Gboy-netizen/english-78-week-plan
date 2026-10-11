const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");
const assert = require("assert");
const fs = require("fs");

(async () => {
  fs.mkdirSync("_shots", { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.__audioEvents = [];
      window.__spoken = [];
      window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
        cancel() { window.__audioEvents.push("cancel"); },
        getVoices() { return window.__noVoice ? [] : [{ lang: "en-US" }, { lang: "en-GB" }]; },
        speak(utterance) {
          window.__spoken.push({ text: utterance.text, lang: utterance.lang });
          if (window.__failSpeech) utterance.onerror?.(); else utterance.onstart?.();
        },
      } });
      window.Audio = class {
        constructor(url) { this.url = url; window.__audioEvents.push(url); }
        play() { this.onplaying?.(); return Promise.resolve(); }
        pause() { window.__audioEvents.push("pause"); }
      };
    });
    await page.goto(pathToFileURL(path.resolve("index.html")).href + "#phonetics");
    assert.equal(await page.locator("#alphabetCatalog article").count(), 26);
    assert.equal(await page.locator("#alphabetCatalog article").first().locator("strong").textContent(), "Aa");
    assert.equal(await page.locator("#alphabetCatalog article").last().locator("strong").textContent(), "Zz");
    assert((await page.locator("#alphabetCatalog article").last().textContent()).includes("/zed/"));
    await page.locator('#alphabetCatalog [data-audio="A"][data-accent="US"]').click();
    await page.locator('#alphabetCatalog [data-audio="A"][data-accent="UK"]').click();
    assert.deepEqual((await page.evaluate(() => window.__spoken)).slice(-2), [{ text: "A", lang: "en-US" }, { text: "A", lang: "en-GB" }]);
    await page.locator('[data-mark-letter="A"]').click();
    await page.locator('[data-pron-tab="ipa"]').click();
    assert.equal(await page.locator(".ipa-tile").count(), 47);
    await page.locator('[data-phoneme-open="ae"]').click();
    assert((await page.locator("#phonemeDetail").textContent()).includes("cat"));
    assert.equal(await page.locator("#phonemeDetail .phoneme-example").count(), 4);
    assert.equal(await page.locator("#phonemeDetail .mouth-diagram").count(), 2);
    assert.equal(await page.locator("#phonemeDetail .mouth-steps li").count(), 5);
    assert((await page.locator("#phonemeDetail").textContent()).includes("bad / bed"));
    const sampleButton = page.locator('#phonemeDetail [data-phoneme-audio="ae"]');
    await sampleButton.click();
    assert.equal(await sampleButton.getAttribute("data-audio-state"), "playing");
    assert((await page.evaluate(() => window.__audioEvents.at(-1))).startsWith("data:audio/mpeg;base64,"));
    await page.locator('#phonemeDetail [data-audio="cat"][data-accent="UK"]').click();
    assert.equal(await sampleButton.getAttribute("data-audio-state"), "idle");
    assert((await page.evaluate(() => window.__audioEvents)).includes("pause"));
    assert.deepEqual(await page.evaluate(() => window.__spoken.at(-1)), { text: "cat", lang: "en-GB" });
    await page.evaluate(() => { window.__noVoice = true; });
    await page.locator('#phonemeDetail [data-audio="cat"][data-accent="UK"]').click();
    assert.deepEqual(await page.evaluate(() => window.__spoken.at(-1)), { text: "cat", lang: "en-GB" });
    assert(!(await page.evaluate(() => window.__audioEvents.some((event) => String(event).includes("type=1&audio=cat")))));
    await page.evaluate(() => { window.__failSpeech = true; });
    await page.locator('#phonemeDetail [data-audio="cat"][data-accent="UK"]').click();
    assert(await page.evaluate(() => window.__audioEvents.some((event) => String(event).includes("type=1&audio=cat"))));
    await page.evaluate(() => { window.__failSpeech = false; });
    await page.evaluate(() => { window.__noVoice = false; });
    await page.locator('#phonemeDetail [data-mark-phoneme="ae"]').click();
    await page.reload();
    assert((await page.locator("#pronunciationProgress").textContent()).includes("字母 1/26 · 音素 1/47"));
    assert.equal(await page.locator("#phonemeCredits .audio-credit").count(), 46);
    const decoded = await page.evaluate(async () => {
      const sources = JSON.parse(document.getElementById("planData").textContent).phonemeAudio;
      const context = new AudioContext();
      try {
        return await Promise.all(Object.values(sources).map(async (uri) => {
          const bytes = await fetch(uri).then((response) => response.arrayBuffer());
          return (await context.decodeAudioData(bytes)).duration;
        }));
      } finally { await context.close(); }
    });
    assert.equal(decoded.length, 46);
    assert(decoded.every((duration) => duration > 0.05));
    await page.locator('[data-pron-tab="american"]').click();
    assert.equal(await page.locator(".american-feature").count(), 7);
    assert((await page.locator("#americanCatalog").textContent()).includes("[ɾ]"));
    await page.locator('[data-pron-tab="pairs"]').click();
    assert.equal(await page.locator("[data-pair-answer]").count(), 2);
    await page.locator("#playPairQuestion").click();
    const answer = await page.evaluate(() => window.__spoken.at(-1).text);
    const choices = await page.locator("[data-pair-answer]").allTextContents();
    await page.locator("[data-pair-answer]").nth(choices.indexOf(answer)).click();
    assert((await page.locator("#pronunciationProgress").textContent()).includes("辨音首答 1/1"));
    await page.reload();
    assert((await page.locator("#pronunciationProgress").textContent()).includes("辨音首答 1/1"));
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const tab of ["alphabet", "ipa", "american", "pairs"]) {
        await page.locator(`[data-pron-tab="${tab}"]`).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, `${width}px ${tab}`);
        if (width === 390 && tab !== "ipa") {
          await page.locator("#view-phonetics").evaluate((element) => element.scrollIntoView());
          await page.screenshot({ path: `_shots/pronunciation-${tab}-mobile.png`, fullPage: false });
        }
      }
      if (width === 1440 || width === 390) {
        await page.locator('[data-pron-tab="ipa"]').click();
        await page.locator('[data-phoneme-open="th"]').click();
        await page.locator("#phonemeDetail").scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        await page.screenshot({ path: `_shots/pronunciation-${width}.png`, fullPage: false });
      }
    }
    assert.deepEqual(errors, []);
    console.log("OK: 26 letters, 47 IPA lessons, 46 decodable local samples, US/UK speech, playback stop, progress, pairs, credits, 4 widths");
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
