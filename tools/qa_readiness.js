const assert = require("assert/strict");
const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(pathToFileURL(path.resolve("index.html")).href + "#resources");
    assert.equal(await page.locator("#readinessForm").count(), 1);
    assert.equal(await page.locator("#readinessStage option").count(), 10);
    const fields = { readinessListening: "6.5", readinessReading: "6.5", readinessWriting: "6", readinessSpeaking: "6" };
    for (const [id, value] of Object.entries(fields)) await page.locator(`#${id}`).fill(value);
    await page.locator("#readinessStage").selectOption("w72");
    await page.locator("#readinessSource").selectOption("mock");
    await page.locator("#readinessEvidence").fill("Official timed GT mock; teacher writing feedback; recorded speaking review");
    await page.locator("#readinessForm button[type=submit]").click();
    assert((await page.locator("#readinessHistory").textContent()).includes("6.5"));
    assert((await page.locator("#readinessStatus").textContent()).includes("达到所设参考目标"));
    assert.equal(await page.locator("#readinessHistory article").count(), 1);
    await page.reload();
    assert.equal(await page.locator("#readinessHistory article").count(), 1);
    assert((await page.locator("#readinessHistory").textContent()).includes("Official timed GT mock"));
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, `horizontal overflow at ${width}`);
    }
    console.log("OK: 6.5 readiness stages, four-score average, internal gate, local persistence and mobile layout");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
