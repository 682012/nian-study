const VERSION = "nian-v8-live-1";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

const subjectNames = { english: "英语", math: "数学", chinese: "语文" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
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

function respond(message, snapshot) {
  const text = String(message || "").trim().slice(0, 240);
  const lower = text.toLowerCase();
  const weak = subjectNames[snapshot.weakestSubject];
  const seed = `${new Date().toISOString().slice(0, 10)}:${text}:${snapshot.todayAttempts}`;

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
  if (/英语|单词|听力|听写|english/.test(lower)) {
    return {
      reply: snapshot.dueWords
        ? `先处理 ${snapshot.dueWords} 张到期词笺，再听一组短对话。听力先抓时间、转折和说话目的，不必每个词都追着翻译。`
        : "今天从句子听力开始。第一遍只抓场景，第二遍抓数字和转折，第三遍才核对没听清的词。",
      mood: "teaching", suggestedAction: snapshot.dueWords ? "wrongbook" : "listening",
    };
  }
  if (/数学|方程|函数|计算|math/.test(lower)) {
    return {
      reply: choose([
        "先说第一步。能定位条件、目标和公式，答案就没资格继续装神秘。",
        "这次别只盯选项。先在心里写出关系式，再看哪个答案配得上它。",
        "我会给你同类变式，但不会原题换皮。若又错在同一步，我们就把那一步单独拆开。",
      ], seed),
      mood: "teaching", suggestedAction: "math",
    };
  }
  if (/语文|阅读|文言|作文|chinese/.test(lower)) {
    return {
      reply: "短章先找对象与动作，再看转折和结尾。答案必须能指回原文，‘我觉得作者大概很感动’这种雾气不算证据。",
      mood: "teaching", suggestedAction: "reading",
    };
  }
  if (/错|薄弱|不会|拾遗|复习/.test(text)) {
    return {
      reply: snapshot.totalMistakes
        ? `学录里还有 ${snapshot.totalMistakes} 条待理旧误。别一口吞完，先挑最近的一组；连续两次做对，才把它从拾遗簿里请出去。`
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

async function handleNian(request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "same-site", "none"].includes(site)) return json({ error: "cross-site request rejected" }, 403);
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return json({ error: "json required" }, 415);
  const length = safeNumber(request.headers.get("content-length"), 0, 100_000);
  if (length > 16_384) return json({ error: "request too large" }, 413);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 240) : "";
  if (!message) return json({ error: "message required" }, 400);
  return json({ ...respond(message, normalizeSnapshot(body.snapshot)), version: VERSION });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return json({ ok: true, version: VERSION });
    if (url.pathname === "/api/nian/respond") return handleNian(request);
    return env.ASSETS.fetch(request);
  },
};
