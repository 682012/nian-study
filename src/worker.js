const VERSION = "nian-v8.3-ai-voice-1";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

const subjectNames = { english: "英语", math: "数学", chinese: "语文" };
const OPENAI_API_BASE = "https://api.openai.com/v1";
const MAX_JSON_BYTES = 32_768;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function requestGuard(request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "same-site", "none"].includes(site)) return json({ error: "cross-site request rejected", code: "CROSS_SITE_REJECTED" }, 403);
  if (request.method !== "POST") return json({ error: "method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return json({ error: "json required", code: "JSON_REQUIRED" }, 415);
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) return json({ error: "request too large", code: "REQUEST_TOO_LARGE" }, 413);
  return null;
}

async function readJson(request) {
  const guarded = requestGuard(request);
  if (guarded) return { error: guarded };
  let raw;
  try { raw = await request.text(); }
  catch { return { error: json({ error: "invalid request body", code: "INVALID_BODY" }, 400) }; }
  if (new TextEncoder().encode(raw).byteLength > MAX_JSON_BYTES) return { error: json({ error: "request too large", code: "REQUEST_TOO_LARGE" }, 413) };
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
  const summary = `当前时段 ${snapshot.hour} 时，连续学习 ${snapshot.streak} 天，今日作答 ${snapshot.todayAttempts} 次，到期单词 ${snapshot.dueWords} 个，待理错题 ${snapshot.totalMistakes} 条，较薄弱科目为${weak}。`;
  const mistake = mistakeContext ? `学生正在追问错题：${mistakeContext.topic || mistakeContext.skill || "未分类"}；题目：${mistakeContext.prompt}；已有解析：${mistakeContext.explanation || "无"}。` : "";
  return `你是学习应用“清晖书院”里的陪学角色林念安。使用简洁、自然、有一点书院气质的中文回答；先解决学生的问题，再给一个可执行的小步骤。不要假装看过未提供的数据，不要编造分数、知识点或资料来源。涉及自伤、医疗、法律或危险行为时，优先给安全建议并鼓励联系可信任的成年人或专业帮助。${summary}${mistake}`;
}

async function fetchOpenAI(path, apiKey, payload, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${OPENAI_API_BASE}${path}`, {
      method: "POST",
      headers: { "authorization": `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally { clearTimeout(timeout); }
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

function choose(items, seedText) {
  let seed = 2166136261;
  for (const char of String(seedText)) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return items[(seed >>> 0) % items.length];
}

function respond(message, snapshot, mistakeContext) {
  const text = String(message || "").trim().slice(0, 300);
  const lower = text.toLowerCase();
  const weak = subjectNames[snapshot.weakestSubject] || "英语";
  const seed = `${new Date().toISOString().slice(0, 10)}:${text}:${snapshot.todayAttempts}`;

  if (mistakeContext && typeof mistakeContext === "object" && mistakeContext.prompt) {
    const topic = mistakeContext.topic || mistakeContext.skill || "这道题";
    const explain = mistakeContext.explanation || "";
    return {
      reply: `这道【${topic}】先别慌。错因往往不是记不住公式，而是第一步条件没对齐：${explain ? explain.slice(0, 80) : "注意先找准核心关系式"}。深吸一口气，我陪你再理一遍。`,
      mood: "teaching",
      suggestedAction: "wrongbook",
      tutoring: {
        topic,
        tip: explain || "审题时先圈出已知量和限制条件。",
      },
    };
  }

  if (/累|困|烦|撑不住|不想学|休息/.test(text)) {
    return {
      reply: choose([
        "那就不和疲惫硬碰。离开屏幕三分钟，回来只做三题；三题之后仍累，今天就收卷。",
        "先喝水，肩膀放下来。回来以后不许开二十题长卷，只开十二题私塾卷，我替你控量。",
        "休息可以，失踪不行。给我一个三分钟后的约定，回来先拿最简单的一题把心思接上。",
      ], seed),
      mood: "break", suggestedAction: "adaptive",
    };
  }
  if (/早|晚安|你好|在吗|hello|hi/.test(lower)) {
    const late = snapshot.hour >= 23;
    return {
      reply: late
        ? "在。已经很晚了，今晚只收一处旧误，不许拿熬夜冒充认真。"
        : snapshot.todayAttempts
          ? `在案前。你今天已经留下 ${snapshot.todayAttempts} 次真实作答，接下来补薄处，不必从头表演一遍勤奋。`
          : "来了？先做第一小卷，今天走多远等做完再定。空白计划写得再漂亮也不记学识。",
      mood: late ? "break" : "welcome", suggestedAction: late ? "wrongbook" : "adaptive",
    };
  }
  if (/英语|单词|听力|听写|长对话|english/.test(lower)) {
    return {
      reply: snapshot.dueWords
        ? `先处理 ${snapshot.dueWords} 张到期词笺，再听一组长对话与情境理解。长对话先抓说话人关系、地点与转折逻辑。`
        : "今天从长对话听力与情境取意开始。第一遍只抓场景与意图，第二遍抓细节数字，第三遍核对关键实词。",
      mood: "teaching", suggestedAction: snapshot.dueWords ? "wrongbook" : "listening",
    };
  }
  if (/数学|方程|函数|几何|svg|图像|计算|math/.test(lower)) {
    return {
      reply: choose([
        "遇到几何与函数题，先看动态图像中的顶点、切点和坐标轴。把图读懂了，式子自然水落石出。",
        "这次别只盯选项。看清抛物线开口与对称轴，先在心里写出关系式，再看哪个答案配得上它。",
        "我会给你同类变式，几何图像也会随参数动态重绘。若又错在同一步，我们就把那一步单独拆开。",
      ], seed),
      mood: "teaching", suggestedAction: "math",
    };
  }
  if (/语文|阅读|文言|主观|采分|作文|chinese/.test(lower)) {
    return {
      reply: "现代文与主观题先看采分点：找准对象、动作、转折与深层主旨。按要点分条作答，答案必须指回原文依据。",
      mood: "teaching", suggestedAction: "reading",
    };
  }
  if (/错|薄弱|不会|拾遗|复习|讲题/.test(text)) {
    return {
      reply: snapshot.totalMistakes
        ? `学录里还有 ${snapshot.totalMistakes} 条待理旧误。别一口吞完，先挑最近的一组；做对时看清解析，才算真正把关卡打通。`
        : `暂时没有待理旧误。那就开一卷${weak}，真正的薄处会自己露面，不用靠猜。`,
      mood: "thinking", suggestedAction: snapshot.totalMistakes ? "wrongbook" : "adaptive",
    };
  }
  if (/奖励|游赏|玩|摆烂/.test(text)) {
    return {
      reply: snapshot.bestCombo >= 10
        ? `最佳连击已经到 ${snapshot.bestCombo}，游赏当然可以。但先把当前这一卷收口，别把“奖励自己”写成半途逃跑。`
        : "游赏时辰仍由真实作答换。签到领空气币这种事，清晖书院暂时还没荒唐到那个程度。",
      mood: "tease", suggestedAction: "daily",
    };
  }
  if (/谢谢|喜欢|想你|念安/.test(text)) {
    return {
      reply: choose([
        "……知道了。先把卷角压平，别忽然说这种让我接不上话的。",
        "我在。你不必每次满分，但真正卡住的地方不许藏。",
        "嗯。那就把下一题也认真做完，别只挑让我心软的话说。",
      ], seed),
      mood: "tease", suggestedAction: "adaptive",
    };
  }
  const accuracy = Math.round(snapshot.weakestRate * 100);
  return {
    reply: `我替你省掉选择困难：先补${weak}。近期这一馆约 ${accuracy}% 的作答落得稳，十二题足够让我判断下一步；继续讨论学什么，容易把讨论本身学到满分。`,
    mood: "invite", suggestedAction: "adaptive",
  };
}

async function handleTTS(request, env) {
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body;
  if (body?.provider && body.provider !== "openai") return json({ error: "unsupported provider", code: "UNSUPPORTED_PROVIDER" }, 400);
  const text = typeof body?.text === "string" ? body.text.replace(/\s+/g, " ").trim().slice(0, 800) : "";
  if (!text) return json({ error: "text required", code: "TEXT_REQUIRED" }, 400);
  const apiKey = cleanApiKey(body?.apiKey, env.OPENAI_API_KEY);
  if (!apiKey) return json({ error: "api key required", code: "API_KEY_REQUIRED" }, 401);
  const model = cleanModel(body?.model, "gpt-4o-mini-tts");
  const voice = cleanModel(body?.voice, "alloy");
  if (!model || !voice) return json({ error: "invalid model or voice", code: "INVALID_TTS_CONFIG" }, 400);
  try {
    const upstream = await fetchOpenAI("/audio/speech", apiKey, { model, input: text, voice, response_format: "mp3" });
    if (!upstream.ok) return json({ error: "speech provider rejected the request", code: "UPSTREAM_TTS_FAILED", status: upstream.status }, 502);
    const type = upstream.headers.get("content-type") || "audio/mpeg";
    if (!/^audio\//i.test(type) && !/octet-stream/i.test(type)) return json({ error: "speech provider returned invalid audio", code: "INVALID_AUDIO_RESPONSE" }, 502);
    return new Response(upstream.body, { status: 200, headers: { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff", "x-nian-version": VERSION } });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return json({ error: timedOut ? "speech provider timed out" : "speech service unavailable", code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE" }, 502);
  }
}

async function handleAI(request, env) {
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body;
  if (body?.provider && body.provider !== "openai") return json({ error: "unsupported provider", code: "UNSUPPORTED_PROVIDER" }, 400);
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 800) : "";
  if (!message) return json({ error: "message required", code: "MESSAGE_REQUIRED" }, 400);
  const apiKey = cleanApiKey(body?.apiKey, env.OPENAI_API_KEY);
  if (!apiKey) return json({ error: "api key required", code: "API_KEY_REQUIRED" }, 401);
  const model = cleanModel(body?.model, "gpt-4o-mini");
  if (!model) return json({ error: "invalid model", code: "INVALID_MODEL" }, 400);
  const snapshot = normalizeSnapshot(body?.snapshot);
  const mistakeContext = compactMistake(body?.mistakeContext);
  try {
    const upstream = await fetchOpenAI("/chat/completions", apiKey, {
      model,
      messages: [{ role: "system", content: aiSystemPrompt(snapshot, mistakeContext) }, ...compactHistory(body?.history), { role: "user", content: message }],
    });
    if (!upstream.ok) return json({ error: "AI provider rejected the request", code: "UPSTREAM_AI_FAILED", status: upstream.status }, 502);
    const raw = await upstream.text();
    if (raw.length > 250_000) return json({ error: "AI response too large", code: "UPSTREAM_RESPONSE_TOO_LARGE" }, 502);
    let data;
    try { data = JSON.parse(raw); } catch { return json({ error: "AI provider returned invalid JSON", code: "INVALID_AI_RESPONSE" }, 502); }
    const content = data?.choices?.[0]?.message?.content;
    const reply = (typeof content === "string" ? content : Array.isArray(content) ? content.map((item) => typeof item?.text === "string" ? item.text : "").join("\n") : "").trim().slice(0, 3000);
    if (!reply) return json({ error: "AI provider returned an empty reply", code: "EMPTY_AI_RESPONSE" }, 502);
    return json({ ok: true, reply, mood: "thinking", suggestedAction: "adaptive", provider: "openai", version: VERSION });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return json({ error: timedOut ? "AI provider timed out" : "AI service unavailable", code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE" }, 502);
  }
}

async function handleNian(request) {
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 300) : "";
  if (!message) return json({ error: "message required" }, 400);
  return json({ ...respond(message, normalizeSnapshot(body.snapshot), body.mistakeContext), version: VERSION });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return json({ ok: true, version: VERSION });
    if (url.pathname === "/api/nian/respond") return handleNian(request);
    if (url.pathname === "/api/nian/ai") return handleAI(request, env);
    if (url.pathname === "/api/nian/tts") return handleTTS(request, env);
    return env.ASSETS.fetch(request);
  },
};
