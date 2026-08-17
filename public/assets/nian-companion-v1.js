(() => {
  "use strict";

  const STORAGE_KEY = "nian-study-progress-v2";
  const ARCADE_KEY = "arcadeV1";
  const AI_SESSION_KEY = "nian-ai-settings-session-v1";
  const AI_LOCAL_KEY = "nian-ai-settings-local-v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const asRecord = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const asNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const subjectNames = { english: "英语", math: "数学", chinese: "语文" };
  const moodImages = {
    idle: "/assets/nian-song/idle.webp", welcome: "/assets/nian-song/welcome.webp",
    teaching: "/assets/nian-song/teaching.webp", thinking: "/assets/nian-song/thinking.webp",
    correct: "/assets/nian-song/correct.webp", celebrate: "/assets/nian-song/celebrate.webp",
    break: "/assets/nian-song/break.webp", tease: "/assets/nian-song/tease.webp",
    invite: "/assets/nian-song/invite.webp",
  };
  let lastReply = "";
  let lastFocus = null;
  let interactionCount = 0;
  let lastMistakeContext = null;
  let chatHistory = [];
  let currentAudio = null;
  let currentAudioUrl = "";
  const defaultAiConfig = Object.freeze({
    mode: "local", endpoint: "https://api.openai.com/v1/chat/completions",
    speechEndpoint: "http://682012ysh.loc.cc/tts/v1/audio/speech", model: "gemini-3-flash-agent",
    apiKey: "", remember: false, ttsMode: "cloud", ttsModel: "edge-tts", ttsVoice: "zh-CN-XiaoxiaoNeural",
  });
  let aiConfig = loadAiConfig();

  function loadAiConfig() {
    for (const [storageName, key] of [["localStorage", AI_LOCAL_KEY], ["sessionStorage", AI_SESSION_KEY]]) {
      try {
        const storage = window[storageName];
        const value = asRecord(JSON.parse(storage.getItem(key) || "{}"));
        if (Object.keys(value).length) return { ...defaultAiConfig, ...value };
      } catch { /* Storage can be unavailable in private or embedded modes. */ }
    }
    return { ...defaultAiConfig };
  }

  function saveAiConfig(config) {
    aiConfig = { ...defaultAiConfig, ...config };
    try {
      if (aiConfig.remember) {
        localStorage.setItem(AI_LOCAL_KEY, JSON.stringify(aiConfig));
        sessionStorage.removeItem(AI_SESSION_KEY);
      } else {
        sessionStorage.setItem(AI_SESSION_KEY, JSON.stringify(aiConfig));
        localStorage.removeItem(AI_LOCAL_KEY);
      }
    } catch { /* Settings still work for the current page. */ }
    return aiConfig;
  }

  function setServiceStatus(message, tone = "idle") {
    const status = $("#nian-service-status");
    if (status) { status.textContent = message; status.dataset.tone = tone; }
  }

  function loadProgress() {
    try {
      return asRecord(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
    } catch {
      return {};
    }
  }

  function recordsFor(progress, subject) {
    const source = asRecord(subject === "math" ? progress.mathQuestions
      : subject === "chinese" ? progress.chineseQuestions : progress.englishQuestions);
    return Object.entries(source).filter(([key]) => !key.startsWith("arcade:")).map(([, value]) => asRecord(value));
  }

  function subjectRate(progress, subject) {
    const records = recordsFor(progress, subject);
    const recent = (Array.isArray(progress[ARCADE_KEY]?.recent) ? progress[ARCADE_KEY].recent : [])
      .filter((item) => item?.subject === subject).slice(-30);
    const attempts = records.reduce((sum, item) => sum + asNumber(item.attempts), 0) + recent.length;
    const correct = records.reduce((sum, item) => sum + asNumber(item.correct), 0)
      + recent.reduce((sum, item) => sum + Number(Boolean(item.correct)), 0);
    return { attempts, correct, rate: attempts ? correct / attempts : 0.58 };
  }

  function snapshot() {
    const progress = loadProgress();
    const arcade = asRecord(progress[ARCADE_KEY]);
    const words = Object.values(asRecord(progress.words)).map(asRecord);
    const rates = Object.keys(subjectNames).map((subject) => ({ subject, ...subjectRate(progress, subject) }));
    const weakest = [...rates].sort((a, b) => a.rate - b.rate || a.attempts - b.attempts)[0] || { subject: "english", rate: 0.58 };
    const dueWords = words.filter((word) => asNumber(word.due) > 0 && asNumber(word.due) <= Date.now() && asNumber(word.mastery) < 5).length;
    const wrongWords = words.filter((word) => asNumber(word.wrong) > 0 && asNumber(word.mastery) < 4).length;
    const originalQuestionMistakes = Object.keys(subjectNames).reduce((sum, subject) => (
      sum + recordsFor(progress, subject).filter((record) => record.lastCorrect === false).length
    ), 0);
    const arcadeMistakes = Object.keys(asRecord(arcade.mistakes)).length;
    return {
      hour: new Date().getHours(), xp: asNumber(progress.xp), streak: asNumber(progress.streak),
      mutuality: asNumber(progress.mutuality), today: asRecord(progress.today), rates,
      weakestSubject: weakest.subject, weakestRate: weakest.rate, dueWords, wrongWords,
      originalQuestionMistakes, arcadeMistakes, totalMistakes: wrongWords + originalQuestionMistakes + arcadeMistakes,
      arcadeCorrect: asNumber(arcade.correct), bestCombo: asNumber(arcade.bestCombo),
      recent: (Array.isArray(arcade.recent) ? arcade.recent : []).slice(-12),
    };
  }

  function recommendation(data) {
    if (data.dueWords > 0) return {
      title: `先把 ${data.dueWords} 张到期词笺捞回来。`,
      text: "它们不是又忘了，只是恰好走到最值得复习的时间点。我已经把旧误和薄弱题排到前面。",
      action: "wrongbook",
    };
    if (data.arcadeMistakes > 0) return {
      title: `百戏楼还有 ${data.arcadeMistakes} 处旧误等你。`,
      text: "先补旧误再开新卷，十分钟通常比硬刷一整套更划算。",
      action: "mistakes",
    };
    const weak = subjectNames[data.weakestSubject] || "英语";
    return {
      title: `今天先由我陪你补一卷${weak}。`,
      text: `最近记录里${weak}相对薄一些。私塾卷会动态混入长对话听力、变式题与短文取证，不会只把原题换个顺序。`,
      action: "adaptive",
    };
  }

  function localReply(message, data) {
    const text = String(message || "").trim();
    const lower = text.toLowerCase();
    const weak = subjectNames[data.weakestSubject] || "英语";

    if (lastMistakeContext && /讲题|刚才那题|错哪|拆题/.test(text)) {
      const topic = lastMistakeContext.topic || lastMistakeContext.skill || "这道题";
      return {
        reply: `这道【${topic}】先别慌。审题时往往是第一步条件未对齐：${lastMistakeContext.explanation ? lastMistakeContext.explanation.slice(0, 80) : "注意理清核心关系式"}。先圈出限制条件，再看哪个答案配得上。`,
        mood: "teaching", suggestedAction: "wrongbook",
      };
    }

    if (/累|困|烦|不想学|休息/.test(text)) return {
      reply: data.today?.attempts > 0
        ? "那就不硬撑。先离开屏幕三分钟，回来只做三题；三题之后仍累，我们今天收卷也算有交代。"
        : "可以慢一点，但别让“等状态好”变成无限延期。先做三题，我陪你把启动那一下熬过去。",
      mood: "break", suggestedAction: "adaptive",
    };
    if (/你好|早|晚安|在吗|hello|hi/.test(lower)) return {
      reply: data.hour < 10 ? "早。先别急着给今天立军令状，做完第一小卷再决定要走多远。"
        : data.hour >= 23 ? "在。更深了，今晚只收一处旧误，不许拿熬夜冒充努力。"
          : `在案前。你今天已经留下 ${asNumber(data.today?.attempts)} 次作答，不算白来。`,
      mood: data.hour >= 23 ? "break" : "welcome", suggestedAction: "adaptive",
    };
    if (/英语|单词|听力|听写|长对话|english/.test(lower)) return {
      reply: data.dueWords > 0
        ? `英语先别漫无目的翻词表。${data.dueWords} 张到期词笺优先，再做一组长对话听力与情境理解。`
        : "今天进“听句寻意”。多轮长对话先抓人物关系、地点和转折逻辑，不必每个词都听懂才敢作答。",
      mood: "teaching", suggestedAction: data.dueWords ? "wrongbook" : "listening",
    };
    if (/数学|算|方程|函数|几何|svg|图像|math/.test(lower)) return {
      reply: "数学先看清动态几何图与函数解析式，不和答案隔空瞪眼。私塾卷会抽最近薄弱题型，答错后十分钟再给你同类变式。",
      mood: "teaching", suggestedAction: "math",
    };
    if (/语文|阅读|文言|主观|采分|作文|chinese/.test(lower)) return {
      reply: "现代文与主观题先看采分点：找准对象、动作、修辞与深层主旨。分条作答，答案必须指回原文。",
      mood: "teaching", suggestedAction: "reading",
    };
    if (/错|薄弱|不会|拾遗|复习|讲题/.test(text)) return {
      reply: data.totalMistakes
        ? `目前统一拾遗入口能看到 ${data.totalMistakes} 条待处理记录。先挑最近的一组，连续两次答对再算真正捞回。`
        : "拾遗簿现在很干净，不过这不是免战牌。去开一卷，真正的薄处会自己露出来。",
      mood: "thinking", suggestedAction: data.totalMistakes ? "wrongbook" : "adaptive",
    };
    if (/奖励|游赏|玩|摆烂/.test(text)) return {
      reply: "游赏时辰照旧由真实作答换，不靠签到领空气币。你把这一小卷做实，我就替你把剩下的时间守住。",
      mood: "tease", suggestedAction: "daily",
    };
    if (/谢谢|喜欢|想你|念安/.test(text)) return {
      reply: interactionCount % 2
        ? "……知道了。先把卷角压平，别忽然说这种让我接不上话的。"
        : "我在。你不用每次都做到满分，只要别把真正卡住的地方藏起来。",
      mood: interactionCount % 2 ? "tease" : "correct", suggestedAction: "adaptive",
    };
    return {
      reply: `我先替你做决定：从${weak}开始，十二题。答完我再根据结果改下一卷；现在继续讨论“学什么”，很容易把讨论本身学到满分。`,
      mood: "invite", suggestedAction: "adaptive",
    };
  }

  function snapshotPayload(data) {
    return {
      hour: data.hour, streak: data.streak, todayAttempts: asNumber(data.today?.attempts),
      dueWords: data.dueWords, totalMistakes: data.totalMistakes,
      weakestSubject: data.weakestSubject, weakestRate: Number(data.weakestRate.toFixed(3)), bestCombo: data.bestCombo,
    };
  }

  function mistakePayload() {
    return lastMistakeContext ? {
      prompt: String(lastMistakeContext.prompt || "").slice(0, 300), topic: String(lastMistakeContext.topic || "").slice(0, 80),
      skill: String(lastMistakeContext.skill || "").slice(0, 80), explanation: String(lastMistakeContext.explanation || "").slice(0, 300),
    } : null;
  }

  function normalizeEndpoint(value) {
    const endpoint = new URL(String(value || "").trim(), window.location.href);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
    const trustedHttp = /(^|\.)682012ysh\.loc\.cc$/.test(endpoint.hostname) || /(^|\.)682012ysh\.top$/.test(endpoint.hostname);
    if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && (local || trustedHttp))) throw new Error("自定义接口必须使用 HTTPS（本机调试除外）");
    return endpoint.href;
  }

  function aiSystemPrompt(data) {
    const weak = subjectNames[data.weakestSubject] || "英语";
    const mistake = mistakePayload();
    return `你是学习应用“清晖书院”里的陪学角色林念安。用简洁、自然、有一点书院气质的中文回答；先解决问题，再给一个可执行的小步骤。不要声称看到未提供的数据。学生今日作答 ${asNumber(data.today?.attempts)} 次，到期词笺 ${data.dueWords} 张，待理旧误 ${data.totalMistakes} 条，当前较薄科目是${weak}。${mistake ? `正在追问的错题是：${mistake.topic || mistake.skill || "未分类"}；${mistake.prompt}；已有解析：${mistake.explanation || "无"}。` : ""}`;
  }

  function extractAiReply(data) {
    const content = data?.choices?.[0]?.message?.content;
    return (typeof content === "string" ? content : Array.isArray(content) ? content.map((item) => typeof item?.text === "string" ? item.text : "").join("\n") : "").trim();
  }

  async function fetchJson(url, body, timeoutMs = 20_000, headers = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body),
        signal: controller.signal,
      });
      let result = {};
      try { result = asRecord(await response.json()); } catch { /* Keep provider bodies out of UI and logs. */ }
      if (!response.ok) throw new Error(result.code || `HTTP_${response.status}`);
      return result;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function localApiReply(message, data) {
    const result = await fetchJson("/api/nian/respond", { message, snapshot: snapshotPayload(data), mistakeContext: mistakePayload() }, 5000);
    if (typeof result.reply !== "string" || !result.reply.trim()) throw new Error("EMPTY_LOCAL_REPLY");
    return { reply: result.reply.trim(), mood: result.mood || "thinking", suggestedAction: result.suggestedAction || "adaptive", source: "本地陪练" };
  }

  async function proxyAiReply(message, data) {
    const result = await fetchJson("/api/nian/ai", {
      provider: "openai", apiKey: aiConfig.apiKey, model: aiConfig.model, message,
      history: chatHistory.slice(-8), snapshot: snapshotPayload(data), mistakeContext: mistakePayload(),
    });
    if (typeof result.reply !== "string" || !result.reply.trim()) throw new Error("EMPTY_AI_REPLY");
    return { reply: result.reply.trim(), mood: result.mood || "thinking", suggestedAction: result.suggestedAction || "adaptive", source: "OpenAI AI" };
  }

  async function directAiReply(message, data) {
    const endpoint = normalizeEndpoint(aiConfig.endpoint);
    const model = String(aiConfig.model || "").trim();
    if (!model) throw new Error("MODEL_REQUIRED");
    const headers = aiConfig.apiKey ? { authorization: `Bearer ${aiConfig.apiKey}` } : {};
    const result = await fetchJson(endpoint, {
      model, messages: [{ role: "system", content: aiSystemPrompt(data) }, ...chatHistory.slice(-8), { role: "user", content: message }],
    }, 20_000, headers);
    const reply = extractAiReply(result).slice(0, 3000);
    if (!reply) throw new Error("EMPTY_AI_REPLY");
    return { reply, mood: "thinking", suggestedAction: "adaptive", source: "自定义 AI" };
  }

  async function apiReply(message, data) {
    if (aiConfig.mode === "openai-proxy") return proxyAiReply(message, data);
    if (aiConfig.mode === "custom-direct") return directAiReply(message, data);
    return localApiReply(message, data);
  }

  function setMood(mood, reply) {
    const normalized = moodImages[mood] ? mood : "thinking";
    const scene = $(".scene-card");
    if (scene) {
      scene.className = `${scene.className.replace(/\bstate-[^\s]+/g, "").trim()} state-${normalized}`;
      scene.dataset.nianMood = normalized;
      const image = $(".character-button img", scene);
      if (image) {
        image.src = moodImages[normalized];
        image.alt = `林念安 · ${normalized}`;
      }
      const dialogue = $(".dialogue-box p", scene);
      if (dialogue && reply) dialogue.textContent = reply;
    }
    document.documentElement.dataset.nianMood = normalized;
  }

  function addMessage(text, role = "nian") {
    const log = $("#nian-companion-log");
    if (!log) return null;
    const item = document.createElement("div");
    item.className = `nian-companion-message${role === "user" ? " is-user" : role === "waiting" ? " is-waiting" : ""}`;
    item.textContent = text;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
    return item;
  }

  function quickActions(action = "adaptive") {
    const quick = $("#nian-companion-quick");
    if (!quick) return;
    const actions = lastMistakeContext
      ? [["念安讲这题", "tutoring"], ["继续做题", action], ["统一拾遗", "wrongbook"]]
      : action === "wrongbook"
        ? [["原书院拾遗", "core-wrongbook"], ["百戏错题追击", "mistakes"], ["念安私塾", "adaptive"]]
        : [["按这个开始", action], ["统一拾遗", "wrongbook"], ["今日卷", "daily"]];
    quick.replaceChildren(...actions.map(([label, value]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.nianAction = value;
      button.textContent = label;
      return button;
    }));
  }

  function stopSpeech() {
    window.NIAN_VOICE?.stop();
    if (currentAudio) currentAudio.pause();
    currentAudio = null;
    if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = "";
    $("[data-companion-speak]")?.classList.remove("is-speaking");
  }

  async function fetchCloudSpeech(text) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    const direct = aiConfig.mode === "custom-direct" || aiConfig.ttsMode === "cloud";
    const url = normalizeEndpoint(aiConfig.speechEndpoint);
    const headers = { "content-type": "application/json" };
    if (aiConfig.apiKey) headers.authorization = `Bearer ${aiConfig.apiKey}`;
    const payload = { model: aiConfig.ttsModel, voice: aiConfig.ttsVoice, input: text, response_format: "mp3" };
    try {
      const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload), signal: controller.signal });
      if (!response.ok) throw new Error(`CLOUD_TTS_${response.status}`);
      const type = response.headers.get("content-type") || "";
      if (!/^audio\//i.test(type) && !/octet-stream/i.test(type)) throw new Error("INVALID_AUDIO_RESPONSE");
      const blob = await response.blob();
      if (!blob.size || blob.size > 12 * 1024 * 1024) throw new Error("INVALID_AUDIO_SIZE");
      return blob;
    } finally { window.clearTimeout(timeout); }
  }

  async function playCloudSpeech(text) {
    setServiceStatus("正在生成云端语音…", "working");
    const blob = await fetchCloudSpeech(text);
    stopSpeech();
    currentAudioUrl = URL.createObjectURL(blob);
    currentAudio = new Audio(currentAudioUrl);
    currentAudio.preload = "auto";
    currentAudio.onended = () => { setServiceStatus("朗读完毕", "ok"); stopSpeech(); };
    currentAudio.onerror = () => { setServiceStatus("音频解码失败，请改用系统语音", "error"); stopSpeech(); };
    await currentAudio.play();
    setServiceStatus("云端语音正在播放", "working");
  }

  async function playSystemSpeech(text) {
    if (!window.NIAN_VOICE?.supported) throw new Error("SYSTEM_SPEECH_UNSUPPORTED");
    await window.NIAN_VOICE.speakSystem(text, {
      lang: "zh-CN", rate: 0.92, maxLength: 88,
      onStatus(status) {
        if (status === "loading") setServiceStatus("正在加载中文语音…", "working");
        else if (status === "playing") setServiceStatus("系统语音正在播放", "working");
        else if (status === "ended") setServiceStatus("朗读完毕", "ok");
      },
    });
  }

  async function speakText(text) {
    if (!text) return;
    if (aiConfig.ttsMode === "off") { setServiceStatus("朗读已在设置中关闭", "error"); return; }
    stopSpeech();
    if (aiConfig.ttsMode === "cloud") {
      try { await playCloudSpeech(text); return; } catch { setServiceStatus("云端语音失败，正在切回系统语音…", "error"); }
    }
    try { await playSystemSpeech(text); }
    catch (error) {
      if (error?.message === "SPEECH_CANCELLED") return;
      setServiceStatus("没有听到声音：请检查媒体音量及系统中文语音包", "error");
      throw error;
    }
  }

  async function speakLastReply() {
    if (!lastReply) return;
    const button = $("[data-companion-speak]");
    button?.classList.add("is-speaking");
    try { await speakText(lastReply); } catch { /* Visible status explains the failure. */ }
    finally { button?.classList.remove("is-speaking"); }
  }

  async function sendMessage(message) {
    const trimmed = String(message || "").trim().slice(0, 240);
    if (!trimmed) return;
    interactionCount += 1;
    addMessage(trimmed, "user");
    const waiting = addMessage(aiConfig.mode === "local" ? "念安正在看你的近几页学录……" : "念安正在请 AI 一起看这件事……", "waiting");
    const data = snapshot();
    let result;
    try {
      result = await apiReply(trimmed, data);
      setServiceStatus(`${result.source} 已回复`, "ok");
    } catch {
      try { result = await localApiReply(trimmed, data); result.source = "AI 不可用 · 已回落本地陪练"; }
      catch { result = { ...localReply(trimmed, data), source: "离线回落" }; }
      setServiceStatus(result.source, "error");
    }
    waiting?.remove();
    lastReply = result.reply;
    chatHistory = [...chatHistory, { role: "user", content: trimmed }, { role: "assistant", content: result.reply }].slice(-8);
    addMessage(result.reply);
    quickActions(result.suggestedAction);
    setMood(result.mood, result.reply);
  }

  function syncSettingsVisibility() {
    const mode = $("#nian-ai-mode")?.value || aiConfig.mode;
    const ttsMode = $("#nian-tts-mode")?.value || aiConfig.ttsMode;
    document.querySelectorAll("[data-ai-custom-only], [data-ai-remote-only], [data-ai-cloud-only]").forEach((item) => {
      item.hidden = (item.hasAttribute("data-ai-custom-only") && mode !== "custom-direct")
        || (item.hasAttribute("data-ai-remote-only") && mode === "local")
        || (item.hasAttribute("data-ai-cloud-only") && ttsMode !== "cloud");
    });
  }

  function syncSettingsForm() {
    const fields = {
      "#nian-ai-mode": aiConfig.mode, "#nian-ai-endpoint": aiConfig.endpoint, "#nian-ai-speech-endpoint": aiConfig.speechEndpoint,
      "#nian-ai-model": aiConfig.model, "#nian-ai-key": aiConfig.apiKey, "#nian-tts-mode": aiConfig.ttsMode,
      "#nian-tts-model": aiConfig.ttsModel, "#nian-tts-voice": aiConfig.ttsVoice,
    };
    for (const [selector, value] of Object.entries(fields)) { const field = $(selector); if (field) field.value = value; }
    const remember = $("#nian-ai-remember");
    if (remember) remember.checked = Boolean(aiConfig.remember);
    syncSettingsVisibility();
  }

  function readSettingsForm() {
    const mode = $("#nian-ai-mode")?.value || "local";
    const config = {
      mode: ["local", "openai-proxy", "custom-direct"].includes(mode) ? mode : "local",
      endpoint: $("#nian-ai-endpoint")?.value.trim() || defaultAiConfig.endpoint,
      speechEndpoint: $("#nian-ai-speech-endpoint")?.value.trim() || defaultAiConfig.speechEndpoint,
      model: $("#nian-ai-model")?.value.trim() || defaultAiConfig.model,
      apiKey: $("#nian-ai-key")?.value.trim() || "", remember: Boolean($("#nian-ai-remember")?.checked),
      ttsMode: $("#nian-tts-mode")?.value || "system",
      ttsModel: $("#nian-tts-model")?.value.trim() || defaultAiConfig.ttsModel,
      ttsVoice: $("#nian-tts-voice")?.value.trim() || defaultAiConfig.ttsVoice,
    };
    if (config.mode === "custom-direct") normalizeEndpoint(config.endpoint);
    if (config.mode === "custom-direct" && config.ttsMode === "cloud") normalizeEndpoint(config.speechEndpoint);
    return config;
  }

  function commitSettings() {
    const config = saveAiConfig(readSettingsForm());
    chatHistory = [];
    setServiceStatus(config.remember ? "设置已保存到此设备；API Key 会留在浏览器本地存储中" : "设置只保留到本次浏览器会话", "ok");
    syncSettingsVisibility();
    return config;
  }

  async function testAiConnection() {
    try {
      commitSettings(); setServiceStatus("正在测试 AI 连接…", "working");
      const result = await apiReply("请只回复：连接成功", snapshot());
      if (!result?.reply) throw new Error("EMPTY_AI_REPLY");
      setServiceStatus(`${result.source} 连接成功`, "ok");
    } catch (error) {
      setServiceStatus(`连接失败：${error?.message === "API_KEY_REQUIRED" ? "请填写 API Key 或配置 Worker 密钥" : "请检查接口地址、模型、Key 与 CORS"}`, "error");
    }
  }

  function toggleSettings(force) {
    const panel = $("#nian-ai-settings");
    if (!panel) return;
    panel.hidden = typeof force === "boolean" ? !force : !panel.hidden;
    $("[data-companion-settings]")?.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) { syncSettingsForm(); $("#nian-ai-mode")?.focus(); }
  }

  function openChat(initialMessage = "") {
    const modal = $("#nian-companion-modal");
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("nian-arcade-open");
    $("#nian-companion-input")?.focus();
    $(".nian-companion-fab")?.classList.remove("has-note");
    if (initialMessage) void sendMessage(initialMessage);
  }

  function closeChat() {
    const modal = $("#nian-companion-modal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("nian-arcade-open");
    stopSpeech();
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }

  function clickMode(mode, attempt = 0) {
    if (attempt === 0) closeChat();
    const button = document.querySelector(`[data-arcade-mode="${mode}"]`);
    if (button instanceof HTMLElement) {
      button.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => button.click(), 280);
      return;
    }
    if (attempt < 20) window.setTimeout(() => clickMode(mode, attempt + 1), 250);
  }

  function openCoreWrongbook() {
    closeChat();
    const button = [...document.querySelectorAll(".mobile-nav button")].find((item) => item.textContent?.includes("拾遗"));
    if (button instanceof HTMLElement) button.click();
  }

  function handleAction(action) {
    if (!action) return;
    if (action === "chat") return openChat();
    if (action === "tutoring") return openChat("请念安帮我拆解一下刚才这道错题。");
    if (action === "wrongbook") return openChat("把我的错题放到一起看看。");
    if (action === "core-wrongbook") return openCoreWrongbook();
    if (["adaptive", "daily", "mistakes", "listening", "reading", "math"].includes(action)) return clickMode(action);
  }

  function renderCard() {
    const data = snapshot();
    const advice = recommendation(data);
    const card = $("#nian-companion-card");
    if (!card) return;
    $("[data-companion-title]", card).textContent = advice.title;
    $("[data-companion-copy]", card).textContent = advice.text;
    const primary = $("[data-companion-primary]", card);
    primary.dataset.nianAction = advice.action;
    primary.textContent = advice.action === "wrongbook" ? "先翻拾遗簿" : advice.action === "mistakes" ? "追击旧误" : "开念安私塾";
    $("[data-companion-due]", card).textContent = String(data.dueWords);
    $("[data-companion-wrong]", card).textContent = String(data.totalMistakes);
    $("[data-companion-weak]", card).textContent = subjectNames[data.weakestSubject] || "英语";
    $("[data-companion-combo]", card).textContent = String(data.bestCombo);
  }

  function mount() {
    if ($("#nian-companion-card")) return;
    const card = document.createElement("section");
    card.id = "nian-companion-card";
    card.className = "nian-companion-card";
    card.innerHTML = `
      <div><span class="nian-companion-kicker">林念安 · 正在看你的学录</span><h2 data-companion-title></h2><p data-companion-copy></p>
      <div class="nian-companion-actions"><button type="button" data-companion-primary data-nian-action="adaptive"></button><button type="button" data-nian-action="wrongbook">统一拾遗入口</button><button type="button" data-nian-action="chat">和念安说话</button></div></div>
      <div class="nian-companion-ledger"><span><b data-companion-due>0</b>到期词笺</span><span><b data-companion-wrong>0</b>待理旧误</span><span><b data-companion-weak>英语</b>当前薄馆</span><span><b data-companion-combo>0</b>最佳连击</span></div>`;
    const hub = $("#nian-arcade-hub");
    if (hub) hub.insertAdjacentElement("beforebegin", card);
    else ($(".hero-layout") || $("main"))?.insertAdjacentElement("afterend", card);

    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = "nian-companion-fab";
    fab.dataset.nianAction = "chat";
    fab.setAttribute("aria-label", "和林念安说话");
    fab.innerHTML = "安<i>1</i>";
    document.body.appendChild(fab);

    const modal = document.createElement("div");
    modal.id = "nian-companion-modal";
    modal.className = "nian-companion-modal";
    modal.hidden = true;
    modal.innerHTML = `<button type="button" class="nian-companion-backdrop" data-companion-close aria-label="关闭对话"></button><section class="nian-companion-sheet" role="dialog" aria-modal="true" aria-labelledby="nian-companion-title">
      <header class="nian-companion-head"><span class="nian-companion-avatar">安</span><div><span>清晖书院 · 东斋</span><strong id="nian-companion-title">林念安在听</strong></div><div class="nian-companion-head-actions"><button type="button" data-companion-settings aria-expanded="false" aria-controls="nian-ai-settings">AI 设置</button><button type="button" class="nian-companion-close" data-companion-close aria-label="关闭">×</button></div></header>
      <form class="nian-ai-settings" id="nian-ai-settings" hidden><div class="nian-ai-settings-grid">
        <label><span>对话模式</span><select id="nian-ai-mode"><option value="local">本地陪练（无需 Key）</option><option value="openai-proxy">OpenAI · Worker 安全代理</option><option value="custom-direct">自定义兼容接口 · 浏览器直连</option></select></label>
        <label data-ai-remote-only><span>模型</span><input id="nian-ai-model" maxlength="120" autocomplete="off" placeholder="gpt-4o-mini"></label>
        <label data-ai-custom-only><span>Chat Completions 地址</span><input id="nian-ai-endpoint" type="url" inputmode="url" autocomplete="off" placeholder="https://example.com/v1/chat/completions"></label>
        <label data-ai-remote-only><span>API Key（可留空使用 Worker 密钥）</span><input id="nian-ai-key" type="password" maxlength="512" autocomplete="new-password" placeholder="仅本次会话保存"></label>
        <label><span>朗读方式</span><select id="nian-tts-mode"><option value="cloud">云端语音（免费 · 微软晓晓）</option><option value="system">系统语音（设备自带）</option><option value="off">关闭朗读</option></select></label>
        <label data-ai-cloud-only><span>音色</span><input id="nian-tts-voice" maxlength="80" autocomplete="off" placeholder="zh-CN-XiaoxiaoNeural"></label>
        <label data-ai-cloud-only data-ai-custom-only><span>Speech 地址</span><input id="nian-ai-speech-endpoint" type="url" inputmode="url" autocomplete="off" placeholder="https://example.com/v1/audio/speech"></label>
      </div><label class="nian-ai-remember"><input id="nian-ai-remember" type="checkbox"><span>记住在此设备（勾选后 API Key 会写入浏览器本地存储；共用设备请勿勾选）</span></label>
      <p>OpenAI 代理只允许官方域名，Key 仅随请求转发、不写入 Worker。自定义地址由浏览器直连，目标服务必须允许 CORS。</p>
      <div class="nian-ai-settings-actions"><button type="submit">保存设置</button><button type="button" data-ai-test>测试 AI</button><button type="button" data-ai-test-voice>试听朗读</button></div></form>
      <div class="nian-companion-log" id="nian-companion-log"></div><div class="nian-companion-compose"><div class="nian-companion-quick" id="nian-companion-quick"></div><output id="nian-service-status" aria-live="polite">当前使用本地陪练；点击“AI 设置”可接入自己的接口</output><form class="nian-companion-form" id="nian-companion-form"><input id="nian-companion-input" name="message" maxlength="600" autocomplete="off" placeholder="说说你现在想学什么……"><button type="button" data-companion-speak aria-label="朗读念安上一句话">声</button><button type="submit">送出</button></form></div></section>`;
    document.body.appendChild(modal);
    const data = snapshot();
    const hello = data.hour >= 23
      ? "这么晚还来？今晚不贪多。你说一件最想解决的事，我们收一小卷就走。"
      : "我已经把近几页学录翻过了。想让我配卷、看错题，还是先说两句？";
    lastReply = hello;
    addMessage(hello);
    quickActions("adaptive");
    renderCard();
    syncSettingsForm();
    if (aiConfig.mode !== "local") setServiceStatus("AI 已配置；建议先在设置中测试连接", "idle");

    const url = new URL(window.location.href);
    const requestedAction = url.searchParams.get("action");
    if (["daily", "adaptive", "chat", "mistakes", "listening", "reading"].includes(requestedAction)) {
      url.searchParams.delete("action");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      window.setTimeout(() => handleAction(requestedAction), 650);
    }
  }

  function showUpdateNotice() {
    if ($(".nian-companion-update")) return;
    const notice = document.createElement("div");
    notice.className = "nian-companion-update";
    notice.innerHTML = "念安把新课帖备好了。<button type='button'>刷新使用</button>";
    notice.querySelector("button").addEventListener("click", () => window.location.reload());
    document.body.appendChild(notice);
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("[data-companion-close]")) return closeChat();
    if (event.target.closest("[data-companion-settings]")) return toggleSettings();
    if (event.target.closest("[data-ai-test]")) return void testAiConnection();
    if (event.target.closest("[data-ai-test-voice]")) {
      try { commitSettings(); void speakText("同窗，若你能听见这句话，朗读功能已经可以使用。"); }
      catch (error) { setServiceStatus(error?.message || "语音设置无效", "error"); }
      return;
    }
    if (event.target.closest("[data-companion-speak]")) return speakLastReply();
    const action = event.target.closest("[data-nian-action]")?.dataset.nianAction;
    if (action) handleAction(action);
  });
  document.addEventListener("submit", (event) => {
    if (!(event.target instanceof HTMLFormElement)) return;
    if (event.target.id === "nian-ai-settings") {
      event.preventDefault();
      try { commitSettings(); toggleSettings(false); }
      catch (error) { setServiceStatus(error?.message || "设置内容无效", "error"); }
      return;
    }
    if (event.target.id !== "nian-companion-form") return;
    event.preventDefault();
    const input = $("#nian-companion-input");
    const message = input?.value || "";
    if (input) input.value = "";
    void sendMessage(message);
  });
  document.addEventListener("change", (event) => {
    if (event.target?.matches?.("#nian-ai-mode, #nian-tts-mode")) syncSettingsVisibility();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("#nian-companion-modal")?.hidden) closeChat();
  });
  document.addEventListener("nian:study-result", (event) => {
    renderCard();
    const detail = asRecord(event.detail);
    if (!detail.correct) {
      lastMistakeContext = detail;
      $(".nian-companion-fab")?.classList.add("has-note");
    }
    const reply = detail.correct
      ? (asNumber(detail.combo) >= 5 ? `${detail.combo} 连。好，现在别急着得意，把这一小卷稳稳收完。` : "这一笔是对的。继续，我在看你是会，还是碰巧。")
      : "先别躲，错处已经记下。十分钟后我会换一副样子再问一次。";
    lastReply = reply;
    setMood(detail.correct ? (asNumber(detail.combo) >= 5 ? "celebrate" : "correct") : "thinking", reply);
  });
  document.addEventListener("nian:session-finished", (event) => {
    renderCard();
    const detail = asRecord(event.detail);
    const reply = asNumber(detail.rate) >= 85
      ? `这卷 ${detail.rate}%。卷角可以压平了——这不是手感，是你真的做对了。`
      : `这卷 ${detail.rate}%。薄处已经照出来，下一卷我会少问你会的，多追刚才那几处。`;
    lastReply = reply;
    setMood(asNumber(detail.rate) >= 85 ? "celebrate" : "teaching", reply);
    $(".nian-companion-fab")?.classList.add("has-note");

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("清晖书院 · 结卷学录", {
        body: `本卷作答率 ${detail.rate}%！${asNumber(detail.rate) >= 85 ? "发挥极佳，卷角压平。" : "错题已收入拾遗簿，温故知新。"}`,
        icon: "/assets/nian-song/celebrate.webp",
        badge: "/icons/app-icon-192.png",
      });
    }
  });
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) renderCard();
  });
  navigator.serviceWorker?.addEventListener("controllerchange", showUpdateNotice);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
