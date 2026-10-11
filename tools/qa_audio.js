const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage();
    const siteUrl = process.env.SITE_URL;
    await page.addInitScript(() => {
      window.__spoken = [];
      window.__online = [];
      window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
        cancel() {}, getVoices() { return [{ lang: "en-US", name: "Test US Voice" }]; },
        speak(utterance) { window.__spoken.push({ text: utterance.text, lang: utterance.lang, voice: utterance.voice?.lang }); if (window.__failSpeech) utterance.onerror?.(); else utterance.onstart?.(); },
      } });
      window.Audio = class { constructor(url) { window.__online.push(url); } play() { return Promise.resolve(); } };
    });
    await page.goto(siteUrl || pathToFileURL(path.resolve("index.html")).href);
    await page.locator("#startLearning").click();
    await page.locator('[data-step="1"]').click();
    await page.locator('.word-stage [data-audio][data-accent="US"]').click();
    const spoken = await page.evaluate(() => window.__spoken);
    if (spoken.length !== 1 || spoken[0].lang !== "en-US" || spoken[0].voice !== "en-US") throw new Error(`American system voice not used: ${JSON.stringify(spoken)}`);
    await page.evaluate(() => { window.__failSpeech = true; });
    await page.locator('.word-stage [data-audio][data-accent="US"]').click();
    const online = await page.evaluate(() => window.__online);
    if (online.length !== 1 || !online[0].includes("type=2&audio=")) throw new Error(`American online voice not used: ${JSON.stringify(online)}`);
    await page.evaluate(() => { window.__failSpeech = false; });
    const answer = await page.locator('.word-stage [data-audio][data-accent="US"]').getAttribute("data-audio");
    await page.locator("#spellInput").fill(answer);
    await page.locator("#spellForm button").click();
    await page.locator("details.example summary").click();
    const example = await page.locator(".example-line .english").textContent();
    await page.locator(".example-line [data-audio]").click();
    const exampleSpoken = await page.evaluate(() => window.__spoken.at(-1));
    if (exampleSpoken.text !== example || exampleSpoken.lang !== "en-US" || exampleSpoken.voice !== "en-US") throw new Error(`Example sentence did not use American voice: ${JSON.stringify(exampleSpoken)}`);
    const cardsUrl = siteUrl ? new URL("教案素材/01-48音标学习包.html", siteUrl).href
      : pathToFileURL(path.resolve("教案素材/01-48音标学习包.html")).href;
    await page.goto(cardsUrl);
    await page.locator("[data-word]").first().click();
    const cardSpoken = await page.evaluate(() => window.__spoken);
    if (cardSpoken.length !== 1 || cardSpoken[0].lang !== "en-US") throw new Error(`Practice card did not use American voice: ${JSON.stringify(cardSpoken)}`);
    console.log("OK: word, example sentence and pronunciation card use en-US voice; online fallback requests American audio");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
