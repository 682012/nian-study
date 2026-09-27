const VERSION = "nian-v10.4-gateway";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

const subjectNames = { english: "英语", math: "数学", chinese: "语文" };
const MAX_JSON_BYTES = 32_768;
const MAX_SCAN_BYTES = 6_000_000; // 卷子图片 base64 专用上限（独立端点）
const SCAN_IMAGE_MAX = 4_500_000; // 单张图片 dataURL 长度上限

// ---- StepFun（阶跃星辰 · Step Plan）语音合成 ----
const STEPFUN_BASE = "https://api.stepfun.com/step_plan/v1";
const DEFAULT_STEPFUN_TTS = Object.freeze({ model: "stepaudio-2.5-tts", voice: "linjiajiejie" });
const STEPFUN_INSTRUCTION_DEFAULT = "你是学生的青梅竹马同桌念安，温柔耐心，像并排坐着讲题一样，语气平稳亲切，不浮夸。";
// stepaudio-2.5-tts 把括号 () 内容当指令不发音：朗读前剥掉，避免整段文本被吞
function stripSpeechInstructions(text, max = 1000) {
  return String(text || "")
    .replace(/[（(][^()（）]*[）)]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
const DEFAULT_BASE = "https://api.openai.com/v1";
const MIMO_API_BASE = "https://api.xiaomimimo.com/v1";
const DEFAULT_TTS = Object.freeze({ model: "mimo-v2.5-tts", voice: "冰糖" });
const EDGE_TTS_BRIDGE_URL = "http://tts.682012ysh.loc.cc/v1/audio/speech";
const EDGE_VOICES = Object.freeze({ zh: "zh-CN-XiaoxiaoNeural", en: "en-US-AvaNeural" });

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function requestGuard(request, maxBytes = MAX_JSON_BYTES) {
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "same-site", "none"].includes(site)) return json({ error: "cross-site request rejected", code: "CROSS_SITE_REJECTED" }, 403);
  if (request.method !== "POST") return json({ error: "method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return json({ error: "json required", code: "JSON_REQUIRED" }, 415);
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return json({ error: "request too large", code: "REQUEST_TOO_LARGE" }, 413);
  return null;
}

async function readJson(request, maxBytes = MAX_JSON_BYTES) {
  const guarded = requestGuard(request, maxBytes);
  if (guarded) return { error: guarded };
  let raw;
  try { raw = await request.text(); }
  catch { return { error: json({ error: "invalid request body", code: "INVALID_BODY" }, 400) }; }
  if (new TextEncoder().encode(raw).byteLength > maxBytes) return { error: json({ error: "request too large", code: "REQUEST_TOO_LARGE" }, 413) };
  try { return { body: JSON.parse(raw) }; }
  catch { return { error: json({ error: "invalid json", code: "INVALID_JSON" }, 400) }; }
}

function cleanApiKey(value, fallback = "") {
  const key = String(value || fallback || "").trim();
  return key.length >= 8 && key.length <= 512 && !/[\r\n]/.test(key) ? key : "";
}

function cleanModel(value, fallback) {
  const model = String(value || fallback || "").trim();
  return /^[a-zA-Z0-9_.:/-]{1,120}$/.test(model) ? model : "";
}

// BYO 网关：仅允许 https 公网地址，防 SSRF 与键位注入。
function cleanBaseUrl(value) {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  let url;
  try { url = new URL(raw); } catch { return ""; }
  if (url.protocol !== "https:") return "";
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0") return "";
  if (/^127\./.test(host) || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(host) || /^(169\.254|100\.6[4-9]|100\.[7-9]\d|100\.1[01]\d|100\.12[0-7])\./.test(host)) return "";
  if (/\.internal$/.test(host) || host.includes("::") || host.startsWith("[fc")) return "";
  if (url.username || url.password) return "";
  return url.origin + url.pathname.replace(/\/$/, "");
}

function compactHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-8).flatMap((item) => {
    const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : "";
    const content = typeof item?.content === "string" ? item.content.trim().slice(0, 800) : "";
    return role && content ? [{ role, content }] : [];
  });
}

function compactMistake(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const prompt = typeof value.prompt === "string" ? value.prompt.trim().slice(0, 300) : "";
  if (!prompt) return null;
  return {
    prompt,
    topic: typeof value.topic === "string" ? value.topic.trim().slice(0, 80) : "",
    skill: typeof value.skill === "string" ? value.skill.trim().slice(0, 80) : "",
    explanation: typeof value.explanation === "string" ? value.explanation.trim().slice(0, 300) : "",
  };
}

function aiSystemPrompt(snapshot, mistakeContext) {
  const weak = subjectNames[snapshot.weakestSubject] || "英语";
  const summary = `当前时段 ${snapshot.hour} 时，连续学习 ${snapshot.streak} 天，今日作答 ${snapshot.todayAttempts} 次，到期词 ${snapshot.dueWords} 个，待理错题 ${snapshot.totalMistakes} 条，较薄弱科目为${weak}。`;
  const mistake = mistakeContext ? `学生正在追问错题：${mistakeContext.topic || mistakeContext.skill || "未分类"}；题目：${mistakeContext.prompt}；已有解析：${mistakeContext.explanation || "无"}。` : "";
  return `你是学习应用“清晖书院”里的陪学角色林念安，陪广东中职学生备考“3+证书”考试（语文、数学、英语）。用简洁、自然、有一点书院气质的中文回答：先直接把学生的问题或题目讲懂，再给一个可执行的小步骤。讲题先说第一步怎么审题，关键推导不跳步；不确定的字音字形、文言释义、考试政策不要编造，如实说明。涉及自伤、医疗、法律或危险行为时，优先给安全建议并鼓励联系可信任的成年人或专业帮助。${summary}${mistake}`;
}

async function upstreamChat(body, apiKey, { stream, env }) {
  // 优先用请求方自带网关（BYO），否则用 Worker 配置的默认私有网关（key 不出服务器）
  const base = cleanBaseUrl(body?.baseUrl) || cleanBaseUrl(env?.AI_BASE_URL) || DEFAULT_BASE;
  if (!base) return json({ error: "invalid base url", code: "INVALID_BASE_URL" }, 400);
  const model = cleanModel(body?.model, env?.AI_MODEL || "gpt-4o-mini");
  if (!model) return json({ error: "invalid model", code: "INVALID_MODEL" }, 400);
  const payload = {
    model,
    stream,
    messages: [
      { role: "system", content: aiSystemPrompt(normalizeSnapshot(body?.snapshot), compactMistake(body?.mistakeContext)) },
      ...compactHistory(body?.history),
      { role: "user", content: String(body?.message ?? "").trim().slice(0, 800) },
    ],
  };
  const doFetch = () => fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(stream ? { ...payload, stream_options: { include_usage: false } } : payload),
    signal: AbortSignal.timeout(stream ? 30_000 : 20_000),
  });
  let result = await doFetch();
  // 部分上游渠道出口地区被拒（403 unsupported_country）：换新渠道重试一次
  if (!stream && result.status === 403) {
    const probe = await result.clone().text().catch(() => "");
    if (probe.includes("unsupported_country") || probe.includes("request_forbidden")) result = await doFetch();
  }
  return result;
}

function safeNumber(value, min = 0, max = 1_000_000) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;
}

function normalizeSnapshot(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const subject = ["english", "math", "chinese"].includes(source.weakestSubject) ? source.weakestSubject : "english";
  return {
    hour: safeNumber(source.hour, 0, 23),
    streak: safeNumber(source.streak, 0, 3650),
    todayAttempts: safeNumber(source.todayAttempts, 0, 10_000),
    dueWords: safeNumber(source.dueWords, 0, 822),
    totalMistakes: safeNumber(source.totalMistakes, 0, 1000),
    weakestSubject: subject,
    weakestRate: safeNumber(source.weakestRate, 0, 1),
    bestCombo: safeNumber(source.bestCombo, 0, 1000),
  };
}

async function handleAIStream(request, env) {
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 800) : "";
  if (!message) return json({ error: "message required", code: "MESSAGE_REQUIRED" }, 400);
  const apiKey = cleanApiKey(body?.apiKey, env.OPENAI_API_KEY);
  if (!apiKey) return json({ error: "api key required", code: "API_KEY_REQUIRED" }, 401);
  let upstream;
  try {
    upstream = await upstreamChat(body, apiKey, { stream: true, env });
    if (upstream.status === 403) {
      const probe = await upstream.text().catch(() => "");
      if (probe.includes("unsupported_country") || probe.includes("request_forbidden")) {
        upstream = await upstreamChat(body, apiKey, { stream: true, env });
      } else {
        return json({ error: "AI provider rejected the request", code: "UPSTREAM_AI_FAILED", status: 403 }, 502);
      }
    }
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return json({ error: timedOut ? "AI provider timed out" : "AI service unavailable", code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE" }, 502);
  }
  if (!upstream.ok || !upstream.body) return json({ error: "AI provider rejected the request", code: "UPSTREAM_AI_FAILED", status: upstream.status }, 502);
  return new Response(upstream.body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
      "x-nian-version": VERSION,
    },
  });
}

async function handleAI(request, env) {
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 800) : "";
  if (!message) return json({ error: "message required", code: "MESSAGE_REQUIRED" }, 400);
  const apiKey = cleanApiKey(body?.apiKey, env.OPENAI_API_KEY);
  if (!apiKey) return json({ error: "api key required", code: "API_KEY_REQUIRED" }, 401);
  try {
    const upstream = await upstreamChat(body, apiKey, { stream: false, env });
    if (!upstream.ok) return json({ error: "AI provider rejected the request", code: "UPSTREAM_AI_FAILED", status: upstream.status }, 502);
    const raw = await upstream.text();
    if (raw.length > 250_000) return json({ error: "AI response too large", code: "UPSTREAM_RESPONSE_TOO_LARGE" }, 502);
    let data;
    try { data = JSON.parse(raw); } catch { return json({ error: "AI provider returned invalid JSON", code: "INVALID_AI_RESPONSE" }, 502); }
    const content = data?.choices?.[0]?.message?.content;
    const reply = (typeof content === "string" ? content : Array.isArray(content) ? content.map((item) => typeof item?.text === "string" ? item.text : "").join("\n") : "").trim().slice(0, 3000);
    if (!reply) return json({ error: "AI provider returned an empty reply", code: "EMPTY_AI_RESPONSE" }, 502);
    return json({ ok: true, reply, mood: "thinking", suggestedAction: "adaptive", provider: "openai-compatible", version: VERSION });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return json({ error: timedOut ? "AI provider timed out" : "AI service unavailable", code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE" }, 502);
  }
}

// ---- 本地规则回复（离线兜底，与前端 nian-local 同构）----
function choose(items, seedText) {
  let seed = 2166136261;
  for (const char of String(seedText)) { seed ^= char.charCodeAt(0); seed = Math.imul(seed, 16777619); }
  return items[(seed >>> 0) % items.length];
}
function respond(message, snapshot, mistakeContext) {
  const text = String(message || "").trim().slice(0, 300);
  const lower = text.toLowerCase();
  const weak = subjectNames[snapshot.weakestSubject] || "英语";
  const seed = `${new Date().toISOString().slice(0, 10)}:${text}:${snapshot.todayAttempts}`;
  if (mistakeContext && typeof mistakeContext === "object" && mistakeContext.prompt) {
    const topic = mistakeContext.topic || mistakeContext.skill || "这道题";
    return { reply: `这道【${topic}】先别慌。错因往往不是记不住公式，而是第一步条件没对齐：${mistakeContext.explanation ? mistakeContext.explanation.slice(0, 80) : "注意先找准核心关系式"}。深吸一口气，我陪你再理一遍。`, mood: "teaching", suggestedAction: "wrongbook", tutoring: { topic, tip: mistakeContext.explanation || "审题时先圈出已知量和限制条件。" } };
  }
  if (/累|困|烦|撑不住|不想学|休息/.test(text)) return { reply: choose(["那就不和疲惫硬碰。离开屏幕三分钟，回来只做三题；三题之后仍累，今天就收卷。", "先喝水，肩膀放下来。回来以后不许开二十题长卷，只开十二题私塾卷，我替你控量。", "休息可以，失踪不行。给我一个三分钟后的约定，回来先拿最简单的一题把心思接上。"], seed), mood: "break", suggestedAction: "adaptive" };
  if (/早|晚安|你好|在吗|hello|hi/.test(lower)) {
    const late = snapshot.hour >= 23;
    return { reply: late ? "在。已经很晚了，今晚只收一处旧误，不许拿熬夜冒充认真。" : snapshot.todayAttempts ? `在案前。你今天已经留下 ${snapshot.todayAttempts} 次真实作答，接下来补薄处，不必从头表演一遍勤奋。` : "来了？先做第一小卷，今天走多远等做完再定。空白计划写得再漂亮也不记学识。", mood: late ? "break" : "welcome", suggestedAction: late ? "wrongbook" : "adaptive" };
  }
  if (/英语|单词|听力|听写|长对话|english/.test(lower)) return { reply: snapshot.dueWords ? `先处理 ${snapshot.dueWords} 张到期词笺，再听一组长对话与情境理解。长对话先抓说话人关系、地点与转折逻辑。` : "今天从长对话听力与情境取意开始。第一遍只抓场景与意图，第二遍抓细节数字，第三遍核对关键实词。", mood: "teaching", suggestedAction: snapshot.dueWords ? "wrongbook" : "listening" };
  if (/数学|方程|函数|几何|svg|图像|计算|math/.test(lower)) return { reply: choose(["遇到几何与函数题，先看动态图像中的顶点、切点和坐标轴。把图读懂了，式子自然水落石出。", "这次别只盯选项。看清抛物线开口与对称轴，先在心里写出关系式，再看哪个答案配得上它。", "我会给你同类变式，几何图像也会随参数动态重绘。若又错在同一步，我们就把那一步单独拆开。"], seed), mood: "teaching", suggestedAction: "math" };
  if (/语文|阅读|文言|主观|采分|作文|chinese/.test(lower)) return { reply: "现代文与主观题先看采分点：找准对象、动作、转折与深层主旨。按要点分条作答，答案必须指回原文依据。", mood: "teaching", suggestedAction: "reading" };
  if (/错|薄弱|不会|拾遗|复习|讲题/.test(text)) return { reply: snapshot.totalMistakes ? `学录里还有 ${snapshot.totalMistakes} 条待理旧误。别一口吞完，先挑最近的一组；做对时看清解析，才算真正把关卡打通。` : `暂时没有待理旧误。那就开一卷${weak}，真正的薄处会自己露面，不用靠猜。`, mood: "thinking", suggestedAction: snapshot.totalMistakes ? "wrongbook" : "adaptive" };
  if (/奖励|游赏|玩|摆烂/.test(text)) return { reply: snapshot.bestCombo >= 10 ? `最佳连击已经到 ${snapshot.bestCombo}，游赏当然可以。但先把当前这一卷收口，别把“奖励自己”写成半途逃跑。` : "游赏时辰仍由真实作答换。签到领空气币这种事，清晖书院暂时还没荒唐到那个程度。", mood: "tease", suggestedAction: "daily" };
  if (/谢谢|喜欢|想你|念安/.test(text)) return { reply: choose(["……知道了。先把卷角压平，别忽然说这种让我接不上话的。", "我在。你不必每次满分，但真正卡住的地方不许藏。", "嗯。那就把下一题也认真做完，别只挑让我心软的话说。"], seed), mood: "tease", suggestedAction: "adaptive" };
  const accuracy = Math.round(snapshot.weakestRate * 100);
  return { reply: `我替你省掉选择困难：先补${weak}。近期这一馆约 ${accuracy}% 的作答落得稳，十二题足够让我判断下一步；继续讨论学什么，容易把讨论本身学到满分。`, mood: "invite", suggestedAction: "adaptive" };
}
async function handleNian(request) {
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 300) : "";
  if (!message) return json({ error: "message required" }, 400);
  return json({ ...respond(message, normalizeSnapshot(body.snapshot), body.mistakeContext), version: VERSION });
}

function base64ToBytes(value) {
  try {
    const binary = atob(String(value).replace(/\s+/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let k = 0; k < binary.length; k++) bytes[k] = binary.charCodeAt(k);
    return bytes;
  } catch { return new Uint8Array(); }
}

async function fetchUpstream(path, base, apiKey, payload, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${base}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally { clearTimeout(timeout); }
}

// ---- 解答题过程批改（AI 按采分点评分）----
function gradeSystemPrompt(prompt, solution, rubric) {
  const rubricLines = rubric.map((r, i) => `${i + 1}. [${r.score}分] ${r.point}`).join("\n");
  const solutionText = solution.join("\n");
  return `你是一名资深高考数学阅卷组长。请严格对照试题、标准解答全过程与采分点规则，对考生的解答过程进行客观评分。

【题目】
${prompt}

【标准解答】
${solutionText}

【采分点规则】
${rubricLines}

【批改与输出硬性约束】
1. 逐条判定考生的解题步骤是否落实了对应采分点。若思路正确且写出关键等式/结果，给全分；若有严重逻辑漏洞或结果错误，得 0 分；score 必须为整数且在 [0, max] 范围内，严禁超过该采分点 max 分值。
2. 必须输出且仅输出一个合法的 JSON 对象，绝对不要包含任何前言、后记或 Markdown 围栏。
3. JSON 格式规范：
{
  "points": [
    {
      "point": "采分点说明",
      "score": 得分整数,
      "max": 满分整数,
      "comment": "针对考生的具体点评，简练（≤50字）"
    }
  ],
  "total": 得分总和整数,
  "summary": "一句话整体评价与丢分原因（≤100字）"
}
4. points 数组必须完整对应所有采分点，不得遗漏、合并或拆分。`;
}

function validateGradeReply(raw, rubric) {
  if (!Array.isArray(rubric) || rubric.length === 0) {
    return null;
  }

  let obj = null;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    obj = raw;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

    try {
      obj = JSON.parse(candidate);
    } catch {
      const start = candidate.indexOf("{");
      const end = candidate.lastIndexOf("}");
      if (start !== -1 && end > start) {
        try {
          obj = JSON.parse(candidate.slice(start, end + 1));
        } catch {
          return null;
        }
      } else {
        return null;
      }
    }
  } else {
    return null;
  }

  if (!obj || typeof obj !== "object" || !Array.isArray(obj.points)) {
    return null;
  }

  const rawPoints = obj.points;
  if (rawPoints.length < rubric.length) {
    return null;
  }

  const matchedPoints = [];
  const usedIndices = new Set();

  for (let i = 0; i < rubric.length; i++) {
    const r = rubric[i];
    const rMax = typeof r.score === "number" && Number.isFinite(r.score) ? Math.max(0, Math.round(r.score)) : 0;

    let foundIdx = rawPoints.findIndex((p, idx) => {
      if (usedIndices.has(idx) || !p || typeof p !== "object") return false;
      const ptName = p.point;
      return typeof ptName === "string" && ptName.trim() === r.point.trim();
    });

    if (foundIdx === -1) {
      if (i < rawPoints.length && !usedIndices.has(i)) {
        foundIdx = i;
      }
    }

    if (foundIdx === -1) {
      return null;
    }

    usedIndices.add(foundIdx);
    const item = rawPoints[foundIdx] || {};

    const rawScore = Number(item.score);
    let score = Number.isFinite(rawScore) ? Math.round(rawScore) : 0;
    score = Math.max(0, Math.min(rMax, score));

    const comment = typeof item.comment === "string" ? item.comment.trim() : "";

    matchedPoints.push({
      point: r.point,
      score,
      max: rMax,
      comment,
    });
  }

  const total = matchedPoints.reduce((sum, p) => sum + p.score, 0);
  const max = rubric.reduce((sum, r) => sum + (typeof r.score === "number" ? r.score : 0), 0);
  const summary = typeof obj.summary === "string" ? obj.summary.trim().slice(0, 120) : "";

  return {
    points: matchedPoints,
    total,
    max,
    summary,
  };
}

async function handleAIGrade(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  }

  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body || {};
  const { prompt, solution, rubric, work } = body;

  if (typeof prompt !== "string" || prompt.length > 600) {
    return json({ ok: false, code: "INVALID_GRADE_INPUT", error: "prompt 必须为字符串且长度 ≤ 600" }, 400);
  }

  if (
    !Array.isArray(solution) ||
    solution.length > 12 ||
    solution.some((line) => typeof line !== "string" || line.length > 200)
  ) {
    return json({ ok: false, code: "INVALID_GRADE_INPUT", error: "solution 必须为数组且 ≤ 12 行，每行 ≤ 200 字" }, 400);
  }

  if (
    !Array.isArray(rubric) ||
    rubric.length < 1 ||
    rubric.length > 8 ||
    rubric.some(
      (r) =>
        !r ||
        typeof r.point !== "string" ||
        r.point.length > 60 ||
        typeof r.score !== "number" ||
        !Number.isInteger(r.score) ||
        r.score < 1 ||
        r.score > 13 ||
        (r.keywords &&
          (!Array.isArray(r.keywords) ||
            r.keywords.length > 8 ||
            r.keywords.some((k) => typeof k !== "string")))
    )
  ) {
    return json({ ok: false, code: "INVALID_GRADE_INPUT", error: "rubric 必须为 1..8 条规范采分点" }, 400);
  }

  if (typeof work !== "string" || work.length < 1 || work.length > 1500) {
    return json({ ok: false, code: "INVALID_GRADE_INPUT", error: "work 必须为 1..1500 字" }, 400);
  }

  const apiKey = cleanApiKey(body?.apiKey, env.OPENAI_API_KEY);
  const baseUrl = cleanBaseUrl(body?.baseUrl) || cleanBaseUrl(env?.AI_BASE_URL) || DEFAULT_BASE;
  const model = cleanModel(body?.model, env?.AI_MODEL || "gpt-4o-mini");

  if (!apiKey) {
    return json({ ok: false, code: "API_KEY_REQUIRED" }, 401);
  }

  const systemContent = gradeSystemPrompt(prompt, solution, rubric);
  const messages = [
    { role: "system", content: systemContent },
    { role: "user", content: `【学生解答过程】\n${work}` },
  ];

  try {
    const upstreamRes = await fetchUpstream("/chat/completions", baseUrl, apiKey, {
      model,
      messages,
      temperature: 0.2,
    }, 30000);

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => "");
      return json({ ok: false, code: "UPSTREAM_AI_FAILED", status: upstreamRes.status, error: errText }, 502);
    }

    const data = await upstreamRes.json();
    const rawReply = data?.choices?.[0]?.message?.content;
    if (!rawReply || typeof rawReply !== "string") {
      return json({ ok: false, code: "INVALID_AI_RESPONSE", error: "模型未返回有效文本" }, 502);
    }

    const validated = validateGradeReply(rawReply, rubric);
    if (!validated) {
      return json({ ok: false, code: "INVALID_AI_RESPONSE" }, 502);  // 校验失败，客户端回退本地批改
    }

    return json({ ok: true, data: validated });
  } catch (err) {
    if (err && err.name === "AbortError") {
      return json({ ok: false, code: "UPSTREAM_TIMEOUT" }, 502);
    }
    return json({ ok: false, code: "UPSTREAM_UNAVAILABLE", error: String(err) }, 502);
  }
}


// ---- 卷子扫描（多模态：图片 → 结构化题目 JSON）----
function scanSystemPrompt(hint) {
  const subjectHint = hint ? `学生提示这份卷子属于：${hint.slice(0, 40)}，优先按此判科目。` : "";
  return `你是试卷结构化引擎。学生发来一张试卷照片，请把其中适合练习的题目转录成 JSON。${subjectHint}
严格要求：
1. 只输出一个 JSON 数组，不要任何解释文字、不要 Markdown 围栏。数组最多 20 个元素。
2. 每个元素字段：subject（"english"|"math"|"chinese"）、type（"choice" 四选一 | "blank" 填空）、prompt（题干全文，含必要上下文）、choices（type=choice 时给 4 个字符串选项）、answer（choice 时为正确项下标 0-3 的整数；blank 时不设）、accepts（type=blank 时给字符串数组，列可接受的等价答案）、explanation（一句话解析，80 字内）、source（出处，如"2023 年真题"）。
3. 只转录卷面上完整成立的题目；题干被裁掉、选项不全、答案无法百分百确定的，整题跳过。
4. 数学公式与符号按卷面原样转录为纯文本（如 x²、√3、∠ABC、≤）；不要自造答案，不要合并多题。
5. 科目判断：数学算式/图形题归 math，英语题归 english，语文诗文/阅读归 chinese。`;
}

function extractFirstJsonArray(text) {
  const t = String(text || "");
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  for (const candidate of [fenced && fenced[1], t]) {
    if (!candidate) continue;
    const start = candidate.indexOf("[");
    const end = candidate.lastIndexOf("]");
    if (start < 0 || end <= start) continue;
    try {
      const parsed = JSON.parse(candidate.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch { /* 换下一个候选 */ }
  }
  return null;
}

const cleanScanText = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// 轻量规范化：字段缺失/越界的条目直接丢，客户端还会再校验一遍。
function normalizeScanQuestions(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const item of arr.slice(0, 20)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const it = item;
    const subject = ["english", "math", "chinese"].includes(it.subject) ? it.subject : "";
    const prompt = cleanScanText(it.prompt ?? it.question, 1200);
    if (!subject || !prompt) continue;
    const base = { subject, prompt, explanation: cleanScanText(it.explanation, 800), source: cleanScanText(it.source, 120) };
    if (it.type === "blank") {
      const accepts = Array.isArray(it.accepts) ? it.accepts : Array.isArray(it.answer) ? it.answer : [it.answer];
      const answers = accepts.map((a) => cleanScanText(a, 200)).filter(Boolean);
      if (!answers.length) continue;
      out.push({ ...base, type: "blank", answer: answers });
      continue;
    }
    const rawChoices = Array.isArray(it.choices) ? it.choices : Array.isArray(it.options) ? it.options : [];
    const choices = rawChoices.map((c) => cleanScanText(c, 500)).filter(Boolean);
    const answer = Number(it.answer);
    if (choices.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= choices.length) continue;
    out.push({ ...base, type: "choice", choices, answer });
  }
  return out;
}

async function handleAIScan(request, env) {
  const parsed = await readJson(request, MAX_SCAN_BYTES);
  if (parsed.error) return parsed.error;
  const body = parsed.body;
  const image = typeof body?.image === "string" ? body.image.trim() : "";
  if (!/^data:image\/(jpe?g|png|webp);base64,[a-z0-9+/=\s]+$/i.test(image)) {
    return json({ error: "a jpg/png/webp image is required", code: "IMAGE_REQUIRED" }, 400);
  }
  if (image.length > SCAN_IMAGE_MAX) return json({ error: "image too large", code: "IMAGE_TOO_LARGE" }, 413);
  const apiKey = cleanApiKey(body?.apiKey, env.OPENAI_API_KEY);
  if (!apiKey) return json({ error: "api key required", code: "API_KEY_REQUIRED" }, 401);
  const base = cleanBaseUrl(body?.baseUrl) || cleanBaseUrl(env?.AI_BASE_URL) || DEFAULT_BASE;
  const model = cleanModel(body?.model, env?.AI_SCAN_MODEL || env?.AI_MODEL || "gpt-4o-mini");
  if (!base || !model) return json({ error: "invalid scan config", code: "INVALID_SCAN_CONFIG" }, 400);
  const hint = typeof body?.hint === "string" ? body.hint.trim().slice(0, 40) : "";
  const payload = {
    model,
    stream: false,
    messages: [
      { role: "system", content: scanSystemPrompt(hint) },
      { role: "user", content: [
        { type: "text", text: "请识别这张试卷图片，按系统要求输出 JSON 数组。" },
        { type: "image_url", image_url: { url: image.replace(/\s+/g, "") } },
      ] },
    ],
  };
  let upstream;
  try {
    upstream = await fetchUpstream("/chat/completions", base, apiKey, payload, 45_000);
  } catch (error) {
    const timedOut = error?.name === "AbortError" || error?.name === "TimeoutError";
    return json({ error: timedOut ? "AI provider timed out" : "AI service unavailable", code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE" }, 502);
  }
  if (!upstream.ok) {
    const probe = await upstream.clone().text().catch(() => "");
    // 模型不支持图片输入时，上游通常报 400 且正文含 image/vision 字样
    if (/image|vision|multimodal|unsupported/i.test(probe)) {
      return json({ error: "current model cannot read images; switch to a vision-capable model in settings", code: "UPSTREAM_SCAN_UNSUPPORTED" }, 502);
    }
    return json({ error: "AI provider rejected the request", code: "UPSTREAM_AI_FAILED", status: upstream.status }, 502);
  }
  const data = await upstream.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((c) => typeof c?.text === "string" ? c.text : "").join("\n") : "";
  const arr = extractFirstJsonArray(text);
  const questions = normalizeScanQuestions(arr);
  if (!questions.length) {
    return json({ ok: true, questions: [], raw: text.slice(0, 6000), code: "EMPTY_SCAN", version: VERSION });
  }
  return json({ ok: true, questions, version: VERSION });
}

async function handleStepfunTTS(text, env, lang = "zh") {
  const apiKey = cleanApiKey(env?.STEPFUN_API_KEY);
  if (!apiKey) return null;
  const base = cleanBaseUrl(env?.STEPFUN_BASE) || STEPFUN_BASE;
  const model = cleanModel(env?.STEPFUN_TTS_MODEL, DEFAULT_STEPFUN_TTS.model) || DEFAULT_STEPFUN_TTS.model;
  const voice = cleanModel(env?.STEPFUN_VOICE, DEFAULT_STEPFUN_TTS.voice) || DEFAULT_STEPFUN_TTS.voice;
  const instruction = typeof env?.STEPFUN_INSTRUCTION === "string" && env.STEPFUN_INSTRUCTION.trim()
    ? env.STEPFUN_INSTRUCTION.trim().slice(0, 200) : STEPFUN_INSTRUCTION_DEFAULT;
  const isZh = !lang || lang.toLowerCase().startsWith("zh");
  const payload = {
    model,
    voice,
    input: stripSpeechInstructions(text),
    response_format: "mp3",
    sample_rate: 24000,
    text_normalization: isZh ? "enhanced" : "standard",
  };
  if (isZh && model.startsWith("stepaudio")) payload.instruction = instruction;
  try {
    const upstream = await fetchUpstream("/audio/speech", base, apiKey, payload, 20000);
    if (!upstream.ok) return null;
    const type = upstream.headers.get("content-type") || "";
    if (!/^audio\//i.test(type) && !/octet-stream/i.test(type)) return null;
    const bytes = await upstream.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 12 * 1024 * 1024) return null;
    return new Response(bytes, { status: 200, headers: { "content-type": type || "audio/mpeg", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-nian-version": VERSION } });
  } catch { return null; }
}

async function handleDefaultTTS(text, env, lang) {
  // 中文首选 StepFun（音色贴人设、支持情绪指令），英文/失败回退 MiMo
  if (!lang || lang.toLowerCase().startsWith("zh")) {
    const step = await handleStepfunTTS(text, env, "zh");
    if (step) return step;
  }
  const apiKey = cleanApiKey(env?.MIMO_API_KEY);
  if (!apiKey) return json({ error: "default voice is not configured on the server", code: "DEFAULT_VOICE_UNAVAILABLE" }, 503);
  try {
    const upstream = await fetchUpstream("/chat/completions", MIMO_API_BASE, apiKey, {
      model: DEFAULT_TTS.model,
      messages: [{ role: "assistant", content: text }],
      audio: { format: "mp3", voice: DEFAULT_TTS.voice },
    });
    if (!upstream.ok) return json({ error: "speech provider rejected the request", code: "UPSTREAM_TTS_FAILED", status: upstream.status }, 502);
    const payload = await upstream.json().catch(() => null);
    const data = payload?.choices?.[0]?.message?.audio?.data;
    if (typeof data !== "string" || !data) return json({ error: "speech provider returned invalid audio", code: "INVALID_AUDIO_RESPONSE" }, 502);
    const bytes = base64ToBytes(data);
    if (!bytes.length || bytes.length > 12 * 1024 * 1024) return json({ error: "speech provider returned invalid audio", code: "INVALID_AUDIO_RESPONSE" }, 502);
    return new Response(bytes, { status: 200, headers: { "content-type": "audio/mpeg", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-nian-version": VERSION } });
  } catch (error) {
    const timedOut = error?.name === "AbortError" || error?.name === "TimeoutError";
    return json({ error: timedOut ? "speech provider timed out" : "speech service unavailable", code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE" }, 502);
  }
}

function handleVoiceKey(request, env) {
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "same-site", "none"].includes(site)) return json({ error: "cross-site request rejected", code: "CROSS_SITE_REJECTED" }, 403);
  // 首选 StepFun（中文音色贴人设）；没配则 MiMo；只有 Edge 时保留 edgetts（英文神经语音）
  if (cleanApiKey(env?.STEPFUN_API_KEY)) return json({ provider: "stepfun", model: cleanModel(env?.STEPFUN_TTS_MODEL, DEFAULT_STEPFUN_TTS.model) || DEFAULT_STEPFUN_TTS.model, voice: cleanModel(env?.STEPFUN_VOICE, DEFAULT_STEPFUN_TTS.voice) || DEFAULT_STEPFUN_TTS.voice });
  if (cleanApiKey(env?.MIMO_API_KEY)) return json({ provider: "mimo", model: DEFAULT_TTS.model, voice: DEFAULT_TTS.voice });
  if (cleanApiKey(env?.EDGE_TTS_TOKEN)) return json({ provider: "edgetts", url: "/api/nian/edgetts" });
  return json({ provider: "none" });
}

async function edgeTTSSpeech(text, lang, env) {
  const token = cleanApiKey(env?.EDGE_TTS_TOKEN);
  if (!token) return null;
  const normalizedLang = lang.toLowerCase();
  const voice = normalizedLang.startsWith("en") ? EDGE_VOICES.en : EDGE_VOICES.zh;
  try {
    const upstream = await fetch(EDGE_TTS_BRIDGE_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-bridge-token": token },
      body: JSON.stringify({ input: text, voice, engine: "edge", response_format: "mp3" }),
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) return null;
    const type = upstream.headers.get("content-type") || "";
    if (!/^audio\//i.test(type) && !/octet-stream/i.test(type)) return null;
    return new Response(upstream.body, { status: 200, headers: { "content-type": type || "audio/mpeg", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-nian-version": VERSION } });
  } catch { return null; }
}

async function handleEdgeTTS(request, env) {
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const text = typeof parsed.body?.text === "string" ? parsed.body.text.replace(/\s+/g, " ").trim().slice(0, 800) : "";
  if (!text) return json({ error: "text required", code: "TEXT_REQUIRED" }, 400);
  const lang = typeof parsed.body?.lang === "string" ? parsed.body.lang : "zh-CN";
  const resp = await edgeTTSSpeech(text, lang, env);
  if (resp) return resp;
  return json({ error: "edge voice is not configured on the server", code: "EDGE_VOICE_UNAVAILABLE" }, 503);
}

async function handleTTS(request, env) {
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body;
  const text = typeof body?.text === "string" ? body.text.replace(/\s+/g, " ").trim().slice(0, 800) : "";
  if (!text) return json({ error: "text required", code: "TEXT_REQUIRED" }, 400);
  const lang = typeof body?.lang === "string" ? body.lang : "zh";
  // BYO：用户自带 key+base 才走他们的网关；带 key 不带 base 是配置错误，明确报错
  const byoKey = cleanApiKey(body?.apiKey);
  const byoBase = cleanBaseUrl(body?.baseUrl);
  if (byoKey || byoBase) {
    if (!byoKey || !byoBase) return json({ error: "invalid base url", code: "INVALID_BASE_URL" }, 400);
    const model = cleanModel(body?.model, "gpt-4o-mini-tts");
    const voice = cleanModel(body?.voice, "alloy");
    if (!model || !voice) return json({ error: "invalid model or voice", code: "INVALID_TTS_CONFIG" }, 400);
    try {
      const upstream = await fetchUpstream("/audio/speech", byoBase, byoKey, { model, input: text, voice, response_format: "mp3" }, 20000);
      if (!upstream.ok) return json({ error: "speech provider rejected the request", code: "UPSTREAM_TTS_FAILED", status: upstream.status }, 502);
      const type = upstream.headers.get("content-type") || "audio/mpeg";
      if (!/^audio\//.test(type) && !/octet-stream/i.test(type)) return json({ error: "speech provider returned invalid audio", code: "INVALID_AUDIO_RESPONSE" }, 502);
      return new Response(upstream.body, { status: 200, headers: { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff", "x-nian-version": VERSION } });
    } catch (error) {
      const timedOut = error?.name === "AbortError" || error?.name === "TimeoutError";
      return json({ error: timedOut ? "speech provider timed out" : "speech service unavailable", code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE" }, 502);
    }
  }
  // 服务器默认链：英文优先 Edge 神经语音（发音准）；中文与 Edge 不可用时 StepFun → MiMo
  if (lang.toLowerCase().startsWith("en")) {
    const edge = await edgeTTSSpeech(text, lang, env);
    if (edge) return edge;
  }
  return handleDefaultTTS(text, env, lang);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return json({ ok: true, version: VERSION });
    if (url.pathname === "/api/nian/respond") return handleNian(request);
    if (url.pathname === "/api/nian/ai") return handleAI(request, env);
    if (url.pathname === "/api/nian/ai/scan") return handleAIScan(request, env);
    if (url.pathname === "/api/nian/ai/grade") return handleAIGrade(request, env);
    if (url.pathname === "/api/nian/ai/stream") return handleAIStream(request, env);
    if (url.pathname === "/api/nian/tts") return handleTTS(request, env);
    if (url.pathname === "/api/nian/edgetts") return handleEdgeTTS(request, env);
    if (url.pathname === "/api/nian/voice-config") return handleVoiceKey(request, env);
    return env.ASSETS.fetch(request);
  },
};
