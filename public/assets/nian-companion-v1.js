(() => {
  "use strict";

  const STORAGE_KEY = "nian-study-progress-v2";
  const ARCADE_KEY = "arcadeV1";
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
    const weakest = [...rates].sort((a, b) => a.rate - b.rate || a.attempts - b.attempts)[0];
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
    const weak = subjectNames[data.weakestSubject];
    return {
      title: `今天先由我陪你补一卷${weak}。`,
      text: `最近记录里${weak}相对薄一些。私塾卷会动态混入听力、变式题和短文取证，不会只把原题换个顺序。`,
      action: "adaptive",
    };
  }

  function localReply(message, data) {
    const text = String(message || "").trim();
    const lower = text.toLowerCase();
    const weak = subjectNames[data.weakestSubject];
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
    if (/英语|单词|听力|听写|english/.test(lower)) return {
      reply: data.dueWords > 0
        ? `英语先别漫无目的翻词表。${data.dueWords} 张到期词笺优先，再做一组句子听力，我会把刚错的重新排回来。`
        : "今天可以直接进“听句寻意”。先抓人物、时间和转折，不必每个词都听懂才敢作答。",
      mood: "teaching", suggestedAction: data.dueWords ? "wrongbook" : "listening",
    };
    if (/数学|算|方程|函数|math/.test(lower)) return {
      reply: "数学先写出第一步，不和答案隔空瞪眼。私塾卷会优先抽最近正确率低的题型，答错后十分钟再给你一道同类变式。",
      mood: "teaching", suggestedAction: "math",
    };
    if (/语文|阅读|文言|作文|chinese/.test(lower)) return {
      reply: "语文先把证据钉回原文。短章取证不是猜老师心思：对象、动作、转折和结尾，先圈这四处。",
      mood: "teaching", suggestedAction: "reading",
    };
    if (/错|薄弱|不会|拾遗|复习/.test(text)) return {
      reply: data.totalMistakes
        ? `目前统一拾遗入口能看到 ${data.totalMistakes} 条待处理记录。先挑最近的一组，连续两次答对再算真正捞回。`
        : "拾遗簿现在很干净，不过这不是免战牌。去开一卷，真正的薄处会自己露出来。",
      mood: "thinking", suggestedAction: data.totalMistakes ? "wrongbook" : "adaptive",
    };
    if (/奖励|游赏|玩|摆烂/.test(text)) return {
      reply: "游赏时辰照旧由真实作答换，不靠签到领空气币。你把这一小卷做实，我就替你把剩下的时间守住。",
      mood: "tease", suggestedAction: "daily",
    };
    if (/谢谢|喜欢|念安/.test(text)) return {
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

  async function apiReply(message, data) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3600);
    try {
      const response = await fetch("/api/nian/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, snapshot: {
          hour: data.hour, streak: data.streak, todayAttempts: asNumber(data.today?.attempts),
          dueWords: data.dueWords, totalMistakes: data.totalMistakes,
          weakestSubject: data.weakestSubject, weakestRate: Number(data.weakestRate.toFixed(3)),
          bestCombo: data.bestCombo,
        } }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const result = asRecord(await response.json());
      if (typeof result.reply !== "string" || !result.reply.trim()) throw new Error("empty reply");
      return { reply: result.reply.trim(), mood: result.mood || "thinking", suggestedAction: result.suggestedAction || "adaptive" };
    } finally {
      window.clearTimeout(timeout);
    }
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
    const actions = action === "wrongbook"
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

  async function sendMessage(message) {
    const trimmed = String(message || "").trim().slice(0, 240);
    if (!trimmed) return;
    interactionCount += 1;
    addMessage(trimmed, "user");
    const waiting = addMessage("念安正在翻你的近几页学录……", "waiting");
    const data = snapshot();
    let result;
    try {
      result = await apiReply(trimmed, data);
    } catch {
      result = localReply(trimmed, data);
    }
    waiting?.remove();
    lastReply = result.reply;
    addMessage(result.reply);
    quickActions(result.suggestedAction);
    setMood(result.mood, result.reply);
  }

  function speakLastReply() {
    if (!lastReply || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lastReply);
    utterance.lang = "zh-CN";
    utterance.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => /^zh-CN$/i.test(voice.lang)) || voices.find((voice) => /^zh/i.test(voice.lang)) || null;
    window.speechSynthesis.speak(utterance);
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
    window.speechSynthesis?.cancel();
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
    $("[data-companion-weak]", card).textContent = subjectNames[data.weakestSubject];
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
    modal.innerHTML = `<button type="button" class="nian-companion-backdrop" data-companion-close aria-label="关闭对话"></button><section class="nian-companion-sheet" role="dialog" aria-modal="true" aria-labelledby="nian-companion-title"><header class="nian-companion-head"><span class="nian-companion-avatar">安</span><div><span>清晖书院 · 东斋</span><strong id="nian-companion-title">林念安在听</strong></div><button type="button" class="nian-companion-close" data-companion-close aria-label="关闭">×</button></header><div class="nian-companion-log" id="nian-companion-log"></div><div><div class="nian-companion-quick" id="nian-companion-quick"></div><form class="nian-companion-form" id="nian-companion-form"><input id="nian-companion-input" name="message" maxlength="240" autocomplete="off" placeholder="说说你现在想学什么……"><button type="button" data-companion-speak aria-label="朗读念安上一句话">声</button><button type="submit">送出</button></form></div></section>`;
    document.body.appendChild(modal);
    const data = snapshot();
    const hello = data.hour >= 23
      ? "这么晚还来？今晚不贪多。你说一件最想解决的事，我们收一小卷就走。"
      : "我已经把近几页学录翻过了。想让我配卷、看错题，还是先说两句？";
    lastReply = hello;
    addMessage(hello);
    quickActions("adaptive");
    renderCard();
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
    if (event.target.closest("[data-companion-speak]")) return speakLastReply();
    const action = event.target.closest("[data-nian-action]")?.dataset.nianAction;
    if (action) handleAction(action);
  });
  document.addEventListener("submit", (event) => {
    if (!(event.target instanceof HTMLFormElement) || event.target.id !== "nian-companion-form") return;
    event.preventDefault();
    const input = $("#nian-companion-input");
    const message = input?.value || "";
    if (input) input.value = "";
    void sendMessage(message);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("#nian-companion-modal")?.hidden) closeChat();
  });
  document.addEventListener("nian:study-result", (event) => {
    renderCard();
    const detail = asRecord(event.detail);
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
  });
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) renderCard();
  });
  navigator.serviceWorker?.addEventListener("controllerchange", showUpdateNotice);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
