// 真实浏览器关键路径回归。前置：vite preview --port 4173 已启动（见 run-e2e.sh）。
import { chromium } from 'playwright';
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.screenshot({ path: '/workspace/nian-v10/shots/00-today.png', fullPage: true });
console.log('标题:', await page.locator('.brand strong').textContent());

await page.getByRole('button', { name: '练习', exact: true }).click();

// 数学七步精编卷：答后必须出现分步讲解块
await page.getByText('数学七步卷').click();
await page.waitForSelector('.quiz-dialog');
console.log('七步卷:', await page.locator('.quiz-head-title strong').first().textContent());
await page.locator('.q-option').first().click();
await page.waitForSelector('.q-feedback');
const notes7 = await page.locator('.q-note').count();
const steps = await page.locator('.q-note').allInnerTexts();
console.log('七步讲解块:', notes7, steps.slice(0, 3).map(t => t.split('\n')[0]).join('/'));
if (notes7 < 3) { console.log('FAIL: 精编题缺少七步讲解'); process.exitCode = 1; }
await page.screenshot({ path: '/workspace/nian-v10/shots/01-preset-notes.png' });
await page.locator('.quiz-close').click();
await page.waitForSelector('.quiz-dialog', { state: 'detached' });

await page.getByText('算学千变').click();
await page.waitForSelector('.quiz-dialog');
console.log('弹窗:', await page.locator('.quiz-head-title strong').first().textContent());
const prompt1 = await page.locator('.q-prompt').textContent();
await page.locator('.q-option').first().click();
await page.waitForSelector('.q-feedback', { timeout: 8000 });
await page.screenshot({ path: '/workspace/nian-v10/shots/02-math-gen.png' });
console.log('选择题反馈:', await page.locator('.q-feedback-head strong').textContent(), '|', await page.locator('.quiz-score').textContent());
const notes = await page.locator('.q-note').count();
console.log('七步讲解块:', notes);

await page.getByRole('button', { name: /下一题/ }).click();
await page.waitForSelector('.q-option');
console.log('翻到:', await page.locator('.quiz-meta-line span').first().textContent());
await page.locator('.quiz-close').click();
await page.waitForSelector('.quiz-dialog', { state: 'detached' });

await page.getByText('句阵重排').first().click();
await page.waitForSelector('.q-tokens');
const n = await page.locator('.q-token-pool .token').count();
for (let i = 0; i < n; i++) await page.locator('.q-token-pool .token:not([disabled])').first().click();
await page.locator('.q-tokens .primary-btn').click();
await page.waitForSelector('.q-feedback');
console.log('句阵有解析:', (await page.locator('.q-explain').textContent()).length > 5);
await page.locator('.quiz-close').click();

await page.getByText('听写巡夜').first().click();
await page.waitForSelector('.q-input');
await page.locator('.q-input').fill('test');
await page.locator('.q-input-wrap .primary-btn').click();
await page.waitForSelector('.q-feedback');
console.log('听写判分闭环:', await page.locator('.q-answer-line').count() === 1);
await page.locator('.quiz-close').click();

await page.getByRole('button', { name: '藏书', exact: true }).click();
await page.waitForSelector('.atlas-card');
console.log('数学图谱模块:', await page.locator('.atlas-card').count());
await page.getByRole('button', { name: '书院', exact: true }).click();
await page.waitForSelector('.poem-card.small');
console.log('诗笺:', await page.locator('.poem-card.small').count());

// 和念安说话：本地规则回复
await page.getByRole('button', { name: '书案' }).click();
await page.getByRole('button', { name: '和念安说话' }).click();
await page.waitForSelector('.chat-dialog');
await page.locator('.chat-input input').fill('我今天好累不想学');
await page.locator('.chat-input .primary-btn').click();
await page.waitForFunction(() => document.querySelectorAll('.bubble-row.nian .bubble:not(.typing)').length >= 2);
const chatText = await page.locator('.bubble-row.nian .bubble:not(.typing)').last().textContent();
console.log('念安回复:', chatText.slice(0, 30));
if (!/三题|休息|三分钟|收卷/.test(chatText)) { console.log('FAIL: 疲惫分支回复异常'); process.exitCode = 1; }
await page.screenshot({ path: '/workspace/nian-v10/shots/03-chat.png' });
await page.locator('.chat-head .quiz-close').click();

const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('nian-study-progress-v10')));
console.log('存档 attempts:', saved.state.arcadeV1.attempts, 'xp:', saved.state.xp, '错题:', Object.keys(saved.state.arcadeV1.mistakes).length);
if (errors.length) { console.log('JS错误:', errors.slice(0, 5)); process.exitCode = 1; } else console.log('JS错误: none');
await browser.close();
