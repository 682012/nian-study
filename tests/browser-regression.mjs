import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import worker from '../src/worker.js';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = path.resolve('output/playwright');
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  try {
    const body = []; for await (const part of req) body.push(part);
    const request = new Request(`http://127.0.0.1:${server.address().port}${req.url}`, { method: req.method, headers: req.headers, ...(body.length ? { body: Buffer.concat(body) } : {}) });
    const response = await worker.fetch(request, { ASSETS: { fetch(request) {
      const name = new URL(request.url).pathname;
      const file = path.resolve('public', name === '/' ? 'index.html' : name.slice(1));
      if (!file.startsWith(path.resolve('public') + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return new Response('Not found', { status: 404 });
      return new Response(fs.readFileSync(file), { headers: { 'content-type': types[path.extname(file)] || 'application/octet-stream' } });
    } } });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { res.writeHead(500); res.end(error.message); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote'] });
const report = { sizes: [], flows: [], errors: [] };
const progress = page => page.evaluate(() => JSON.parse(localStorage.getItem('nian-study-progress-v2') || '{}'));
async function ready(page, suffix = '/') {
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(url + suffix);
  await page.waitForSelector('.nian-workspace-ready');
}
async function view(page, id) {
  await page.locator(`.nian-desk-tabs [data-desk-view-button="${id}"]`).click();
  await page.waitForFunction(id => document.body.dataset.deskView === id, id);
}
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
  assert.ok(size.document <= size.width + 1, `${label} overflows: ${JSON.stringify(size)}`);
  return size;
}
try {
  for (const width of [360, 390, 412, 820, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width > 820 ? 1000 : 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await ready(page);
    assert.equal(await page.locator('.nian-desk-nav').count(), 1);
    assert.equal(await page.locator('.nian-companion-update').count(), 0, 'First install is not an update');
    const checks = {};
    for (const id of ['today', 'practice', 'library', 'courtyard']) {
      await view(page, id);
      checks[id] = await noOverflow(page, `${width}/${id}`);
      if ((width === 390 && ['today','practice','library'].includes(id)) || (width === 1440 && id === 'today')) {
        await page.screenshot({ path: `${out}/v9-${width}-${id}.png`, fullPage: true });
        await page.screenshot({ path: `${out}/v9-${width}-${id}-screen.png` });
      }
    }
    assert.equal(await page.locator('img').evaluateAll(imgs => imgs.filter(img => img.getClientRects().length && (!img.complete || !img.naturalWidth)).length), 0);
    report.sizes.push({ width, views: checks });
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await ready(page);
  await page.locator('.character-button').click();
  assert.ok(await page.locator('.dialogue-box p').innerText());
  await page.locator('[data-desk-sound]').click();
  assert.equal(await page.locator('[data-desk-sound]').getAttribute('aria-pressed'), 'false');
  report.flows.push('Character interaction and persistent sound toggle');

  await view(page, 'practice');
  await page.locator('[data-desk-filter="math"]').click();
  assert.equal(await page.locator('.nian-mode-card:visible').count(), 1);
  await page.locator('.nian-mode-card[data-arcade-mode="math"]').click();
  let navigations = 0;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
  const before = await progress(page);
  for (let index = 0; index < 12; index++) {
    await page.locator('[data-arcade-choice="0"]').click();
    await page.waitForSelector('.nian-answer-feedback');
    const p = await progress(page);
    assert.equal(p.arcadeV1.attempts, (before.arcadeV1?.attempts || 0) + index + 1);
    assert.ok(p.xp > (before.xp || 0));
    if (index === 0) await page.screenshot({ path: `${out}/v9-math-feedback.png` });
    await page.locator('[data-arcade-action="next"]').click();
  }
  await page.waitForSelector('.nian-session-result');
  await page.screenshot({ path: `${out}/v9-result.png` });
  const after = await progress(page);
  assert.equal(after.arcadeV1.runs, 1);
  await page.locator('.nian-session-result [data-arcade-action="close"]').last().click();
  await page.waitForSelector('#nian-arcade-modal', { state: 'hidden' });
  assert.equal(navigations, 0, 'Closing a completed run must not navigate');
  await view(page, 'today');
  assert.ok((await page.locator('.xp-track').getAttribute('aria-label')).includes(`学识 ${after.xp % 220} /`), 'Core React state receives arcade XP');
  report.flows.push('12-question run, per-answer persistence, summary, no reload, core XP synchronization');

  await page.locator('.task-row').nth(1).click();
  await page.waitForSelector('.modal-backdrop [role="dialog"]');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.modal-backdrop', { state: 'hidden' });
  assert.equal((await progress(page)).arcadeV1.attempts, after.arcadeV1.attempts);
  await page.locator('.nian-desk-bottom [data-desk-core="data"]').click();
  await page.waitForSelector('.modal-backdrop [role="dialog"]');
  assert.ok((await page.locator('.modal-backdrop').innerText()).includes('导出'));
  await page.keyboard.press('Escape');
  report.flows.push('Original math and study ledger with import/export remain accessible');

  await page.locator('.nian-desk-bottom [data-nian-action="chat"]').click();
  await page.waitForSelector('#nian-companion-modal:not([hidden])');
  await page.locator('#nian-companion-input').fill('今天先学数学');
  await page.locator('#nian-companion-form button[type="submit"]').click();
  await page.waitForSelector('.nian-companion-message.is-waiting', { state: 'detached' });
  assert.ok((await page.locator('#nian-companion-log').innerText()).includes('数学'));
  await page.locator('[data-companion-settings]').click();
  await page.locator('#nian-tts-mode').selectOption('cloud');
  assert.equal(await page.locator('#nian-ai-speech-endpoint').isVisible(), true);
  assert.equal(await page.locator('#nian-tts-model').isVisible(), true);
  await page.locator('#nian-tts-mode').selectOption('system');
  await page.locator('#nian-ai-settings button[type="submit"]').click();
  await page.locator('.nian-companion-close').click();
  await page.waitForFunction(() => !document.querySelector('.app-shell').inert);
  report.flows.push('Local companion chat, speech settings, modal close and focus restoration');

  await view(page, 'practice');
  for (const mode of ['listen','listening','dictation','sentence','chinese','reading','mixed','adaptive','endless']) {
    await page.locator(`.nian-mode-card[data-arcade-mode="${mode}"]`).click();
    await page.waitForSelector('.nian-question-card');
    await noOverflow(page, `mode:${mode}`);
    if (mode === 'dictation') {
      await page.locator('#nian-arcade-answer').fill('test');
      await page.locator('.nian-answer-form button').click();
      await page.waitForSelector('.nian-answer-feedback');
    }
    if (mode === 'sentence') {
      await page.locator('[data-arcade-token="0"]').click();
      assert.equal(await page.locator('[data-arcade-remove-token]').count(), 1);
      await page.locator('[data-arcade-remove-token="0"]').click();
      assert.equal(await page.locator('[data-arcade-remove-token]').count(), 0);
    }
    await page.locator('.nian-arcade-close').click();
  }
  await page.locator('.nian-arcade-main[data-arcade-mode="daily"]').click();
  await page.waitForSelector('.nian-question-card');
  const daily = (await progress(page)).arcadeV1.dailyQueue;
  assert.equal(daily.questions.length, 20);
  if (await page.locator('[data-arcade-choice="0"]').count()) {
    await page.locator('[data-arcade-choice="0"]').click();
  } else if (await page.locator('#nian-arcade-answer').count()) {
    await page.locator('#nian-arcade-answer').fill('test');
    await page.locator('.nian-answer-form button').click();
  } else {
    await page.locator('[data-arcade-token="0"]').click();
    await page.locator('[data-arcade-action="submit-tokens"]').click();
  }
  await page.locator('.nian-arcade-close').click();
  await page.locator('.nian-arcade-main').click();
  assert.deepEqual((await progress(page)).arcadeV1.dailyQueue, daily, 'Daily paper remains fixed after learning changes');
  await page.locator('.nian-arcade-close').click();
  assert.equal(navigations, 0);
  report.flows.push('All practice modes, dictation, removable sentence tokens, stable daily paper');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('.nian-workspace-ready');
  await view(page, 'practice');
  await page.locator('.nian-mode-card[data-arcade-mode="reading"]').click();
  await page.waitForSelector('.nian-reading-passage');
  assert.equal(await page.evaluate(() => window.NIAN_WORDS.length), 822);
  assert.ok((await progress(page)).arcadeV1.attempts >= after.arcadeV1.attempts);
  report.flows.push('Installed service worker loads all 822 words and reading practice offline');
  await context.close();

  const legacy = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await legacy.addInitScript(() => {
    localStorage.setItem('nianan_wordroom_v1', JSON.stringify({ xp: 230, streak: 7, gameTickets: 3, words: { '822': { m: 4, wrong: 2, correct: 5, due: 100, last: 100 } } }));
  });
  const legacyPage = await legacy.newPage();
  await ready(legacyPage);
  assert.equal((await progress(legacyPage)).xp, 230);
  await view(legacyPage, 'practice');
  await legacyPage.locator('.nian-mode-card[data-arcade-mode="math"]').click();
  await legacyPage.locator('[data-arcade-choice="0"]').click();
  const migrated = await progress(legacyPage);
  assert.ok(migrated.xp > 230);
  assert.equal(migrated.words['822'].mastery, 4);
  assert.equal(migrated.words['822'].correct, 5);
  assert.equal(migrated.gameMinutes, 30);
  report.flows.push('Legacy wordroom progress migrates and survives a new practice answer');
  await legacy.close();

  const android = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const androidPage = await android.newPage();
  await ready(androidPage, '/?source=android-app');
  assert.equal(await androidPage.locator('.nian-install-links').count(), 0);
  assert.equal(await androidPage.locator('.startup-screen').count(), 0);
  report.flows.push('Android shell hides duplicate download links and startup overlay');
  await android.close();
  assert.deepEqual(report.errors, [], 'No uncaught page errors');
  fs.writeFileSync(`${out}/regression-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  server.close();
}
