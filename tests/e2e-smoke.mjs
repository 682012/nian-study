// 真实浏览器关键路径回归。前置：vite preview --port 4173 已启动（见 run-e2e.sh）。
import { chromium } from 'playwright';
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('console', m => {
  // 测试自造的云端断连（非2xx fetch 浏览器必打资源日志），非应用错误
  if (m.type() === 'error' && !/ai\/stream|Failed to load resource/.test(m.text())) errors.push(m.text());
});
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
await page.getByRole('button', { name: '夜读模式' }).click();
const theme = await page.evaluate(() => document.documentElement.dataset.theme);
console.log('深色模式:', theme);
if (theme !== 'dark') { console.log('FAIL: 深色未生效'); process.exitCode = 1; }
const backupStat = await page.locator('.record-stats strong').first().textContent();
console.log('学录统计可见:', /\d+/.test(backupStat));
await page.screenshot({ path: '/workspace/nian-v10/shots/05-dark.png' });

// 云端念安：mock OpenAI 兼容 SSE，验证逐字渲染
await page.getByRole('button', { name: '书案' }).click();
await page.getByRole('button', { name: '和念安说话' }).click();
await page.waitForSelector('.chat-dialog');
await page.locator('.chat-gear').click();
await page.waitForSelector('.settings-dialog');
await page.locator('.switch-row input').check();
await page.locator('.settings-body input[type=password]').fill('sk-test-1234567890');
await page.getByRole('button', { name: '保存' }).click();
await page.waitForSelector('.settings-dialog', { state: 'detached' });
const savedSettings = await page.evaluate(() => localStorage.getItem('nian-ai-settings-v1'));
console.log('AI设置持久化:', savedSettings.includes('sk-test'));
// 拦截上游：Worker 路径在 preview 下不存在，直接 route mock 该路径
await page.route('**/api/nian/ai/stream', async (route) => {
  const sse = [
    'data: {"choices":[{"delta":{"content":"先看"}}]}',
    'data: {"choices":[{"delta":{"content":"分母，"}}]}',
    'data: {"choices":[{"delta":{"content":"x 不能等于 2。"}}]}',
    'data: [DONE]',
  ].join('\n\n');
  await route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse });
});
await page.locator('.chat-input input').fill('这道定义域怎么做');
await page.locator('.chat-input .primary-btn').click();
await page.waitForFunction(() => {
  const bubbles = [...document.querySelectorAll('.bubble-row.nian .bubble')];
  const last = bubbles[bubbles.length - 1];
  return last && last.textContent.includes('x 不能等于 2');
}, undefined, { timeout: 8000 });
const cloudText = await page.locator('.bubble-row.nian .bubble').last().textContent();
console.log('云端流式回复:', cloudText);
if (!cloudText.includes('分母')) { console.log('FAIL: SSE 流式拼接异常'); process.exitCode = 1; }
await page.screenshot({ path: '/workspace/nian-v10/shots/04-cloud-chat.png' });
await page.locator('.chat-head .quiz-close').click();

// 云端失败时回退本地规则：卸载 mock 让请求失败
// 切本地模式：注入设置后刷新（preview 无后端）
await page.evaluate(() => localStorage.setItem('nian-ai-settings-v1', JSON.stringify({ enabled: false, baseUrl: '', apiKey: '', model: '' })));
await page.goto(BASE + '/?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: '和念安说话' }).click();
await page.waitForSelector('.chat-dialog');
const localMode = await page.locator('.chat-head small').textContent();
console.log('本地模式标识:', localMode);
await page.locator('.chat-input input').fill('我今天好累不想学');
await page.locator('.chat-input .primary-btn').click();
try {
  await page.waitForFunction(() => [...document.querySelectorAll('.bubble-row.nian .bubble:not(.typing)')].some(b => /三题|休息|三分钟|收卷|私塾卷|喝水|失踪/.test(b.textContent)), undefined, { timeout: 6000 });
} catch {
  console.log('DEBUG bubbles:', JSON.stringify(await page.locator('.bubble-row .bubble').allInnerTexts()));
  console.log('DEBUG settings:', await page.evaluate(() => localStorage.getItem('nian-ai-settings-v1')));
  throw new Error('local reply missing');
}
const bubbles = await page.locator('.bubble-row.nian .bubble:not(.typing)').allInnerTexts();
const chatText = bubbles.find((t) => /三题|休息|三分钟|收卷|私塾卷|喝水|失踪/.test(t)) || '';
console.log('本地兜底回复:', chatText.slice(0, 30));
if (!chatText) { console.log('FAIL: 云端失败后本地兜底异常'); process.exitCode = 1; }
await page.screenshot({ path: '/workspace/nian-v10/shots/03-chat.png' });
await page.locator('.chat-head .quiz-close').click();

const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('nian-study-progress-v10')));
console.log('存档 attempts:', saved.state.arcadeV1.attempts, 'xp:', saved.state.xp, '错题:', Object.keys(saved.state.arcadeV1.mistakes).length);
if (errors.length) { console.log('JS错误:', errors.slice(0, 5)); process.exitCode = 1; } else console.log('JS错误: none');
await browser.close();
