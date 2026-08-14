(() => {
  "use strict";

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)");
  const successMoods = new Set(["correct", "combo", "celebrate", "event"]);
  const SOUND_STORAGE_KEY = "nian-study-sound-v1";
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const soundState = {
    context: null,
    enabled: readSoundPreference(),
    installed: false,
  };

  function readSoundPreference() {
    try {
      return localStorage.getItem(SOUND_STORAGE_KEY) !== "off";
    } catch {
      return true;
    }
  }

  function writeSoundPreference() {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, soundState.enabled ? "on" : "off");
    } catch {
      // Storage can be unavailable in private or restricted WebViews.
    }
  }

  function getAudioContext() {
    if (!AudioContextClass) return null;
    if (!soundState.context || soundState.context.state === "closed") {
      try {
        soundState.context = new AudioContextClass({ latencyHint: "interactive" });
      } catch {
        try {
          soundState.context = new AudioContextClass();
        } catch {
          return null;
        }
      }
    }
    return soundState.context;
  }

  function playTone(context, { from, to = from, duration = 0.055, gain = 0.035, delay = 0, type = "sine" }) {
    const start = context.currentTime + delay;
    const end = start + duration;
    const oscillator = context.createOscillator();
    const volume = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), end);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.012, duration / 3));
    volume.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
  }

  function emitSound(context, type) {
    if (type === "correct" || type === "celebrate") {
      playTone(context, { from: 523, to: 659, duration: 0.09, gain: 0.058 });
      playTone(context, { from: 659, to: 784, duration: 0.11, gain: 0.048, delay: 0.075 });
      return;
    }
    if (type === "wrong") {
      playTone(context, { from: 260, to: 185, duration: 0.13, gain: 0.052, type: "triangle" });
      return;
    }
    if (type === "open" || type === "character") {
      playTone(context, { from: 392, to: 587, duration: 0.085, gain: 0.048, type: "triangle" });
      playTone(context, { from: 587, to: 698, duration: 0.08, gain: 0.038, delay: 0.055 });
      return;
    }
    if (type === "close") {
      playTone(context, { from: 460, to: 330, duration: 0.065, gain: 0.04, type: "triangle" });
      return;
    }
    playTone(context, { from: 480, to: 560, duration: 0.045, gain: 0.044, type: "triangle" });
  }

  function playUiSound(type = "tap") {
    if (!soundState.enabled) return false;
    const context = getAudioContext();
    if (!context) return false;

    const play = () => {
      try {
        emitSound(context, type);
      } catch {
        // Audio feedback must never break the underlying click action.
      }
    };

    if (context.state !== "running") {
      try {
        Promise.resolve(context.resume()).then(play).catch(() => {});
      } catch {
        return false;
      }
    } else play();
    return true;
  }

  function soundTypeFor(interactive) {
    if (interactive.matches("[data-nian-sound-toggle], [data-arcade-action='speak'], [data-arcade-action='speak-slow'], [data-companion-speak]")) return null;
    if (interactive.matches("[data-arcade-choice], .nian-answer-form button[type='submit']")) return null;
    if (interactive.matches(".character-button")) return "character";
    if (interactive.matches(".nian-arcade-close, [data-arcade-action='close'], .icon-button")) return "close";
    if (interactive.matches(".primary-action, .nian-arcade-main, .nian-mode-card, [data-arcade-mode]")) return "open";
    return "tap";
  }

  function syncSoundToggle(button) {
    const supported = Boolean(AudioContextClass);
    button.classList.toggle("is-muted", !soundState.enabled);
    button.classList.toggle("is-unsupported", !supported);
    button.setAttribute("aria-pressed", String(soundState.enabled));
    button.setAttribute("aria-label", supported
      ? `界面音效${soundState.enabled ? "已开启，点击关闭" : "已关闭，点击开启"}`
      : "当前浏览器不支持界面音效");
    button.title = supported ? `界面音效：${soundState.enabled ? "开" : "关"}` : "当前浏览器不支持界面音效";
    button.querySelector("span").textContent = soundState.enabled ? "声" : "静";
    button.querySelector("small").textContent = supported ? (soundState.enabled ? "音效" : "静音") : "不支持";
  }

  function addSoundToggle() {
    if (document.querySelector("[data-nian-sound-toggle]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nian-sound-toggle";
    button.dataset.nianSoundToggle = "";
    button.innerHTML = '<span aria-hidden="true"></span><small aria-hidden="true"></small>';
    syncSoundToggle(button);
    button.addEventListener("click", () => {
      if (!AudioContextClass) return;
      soundState.enabled = !soundState.enabled;
      writeSoundPreference();
      syncSoundToggle(button);
      if (soundState.enabled) playUiSound("open");
    });
    document.body.appendChild(button);
  }

  function handlePointerSound(event) {
    if (!event.isPrimary || event.button > 0 || !(event.target instanceof Element)) return;
    const interactive = event.target.closest("button, a[href]");
    if (!interactive || interactive.matches(":disabled, [aria-disabled='true']")) return;
    const type = soundTypeFor(interactive);
    if (type) playUiSound(type);
  }

  function installSound() {
    if (soundState.installed) return;
    soundState.installed = true;
    addSoundToggle();
    document.addEventListener("pointerdown", handlePointerSound, { passive: true });
    document.addEventListener("nian:sound", (event) => {
      playUiSound(event.detail?.type || "tap");
    });
  }

  function addAtmosphere() {
    if (document.querySelector(".nian-atmosphere")) return;

    const atmosphere = document.createElement("div");
    atmosphere.className = "nian-atmosphere";
    atmosphere.setAttribute("aria-hidden", "true");
    atmosphere.replaceChildren(
      ...Array.from({ length: 5 }, () => document.createElement("i")),
    );
    document.body.appendChild(atmosphere);
  }

  function createTapBloom(event) {
    if (reducedMotion?.matches || !event.isPrimary || event.button > 0) return;
    if (!(event.target instanceof Element)) return;

    const interactive = event.target.closest("button, a[href]");
    if (!interactive || interactive.matches(":disabled, [aria-disabled='true']")) return;

    const bloom = document.createElement("span");
    bloom.className = "nian-tap-bloom";
    bloom.setAttribute("aria-hidden", "true");
    bloom.style.left = `${event.clientX}px`;
    bloom.style.top = `${event.clientY}px`;
    document.body.appendChild(bloom);
    bloom.addEventListener("animationend", () => bloom.remove(), { once: true });
    window.setTimeout(() => bloom.remove(), 850);
  }

  function spawnReaction(scene, mood) {
    if (reducedMotion?.matches || !successMoods.has(mood)) return;

    const rect = scene.getBoundingClientRect();
    const burst = document.createElement("span");
    const symbols = mood === "event" ? ["桃", "✦", "◇", "✦", "桃", "·"] : ["✦", "◇", "·", "✦", "◇", "✦"];
    const colors = ["#efc986", "#e7a49b", "#91bfae", "#fff0c8"];

    burst.className = "nian-reaction-burst";
    burst.setAttribute("aria-hidden", "true");
    burst.style.setProperty("--nian-burst-x", `${rect.left + rect.width * 0.58}px`);
    burst.style.setProperty("--nian-burst-y", `${Math.min(rect.bottom - 120, rect.top + rect.height * 0.46)}px`);

    symbols.forEach((symbol, index) => {
      const particle = document.createElement("i");
      const angle = (-150 + index * 58) * (Math.PI / 180);
      const distance = 54 + (index % 3) * 22;
      particle.textContent = symbol;
      particle.style.setProperty("--nian-burst-dx", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--nian-burst-dy", `${Math.sin(angle) * distance - 28}px`);
      particle.style.setProperty("--nian-burst-rotate", `${index % 2 ? 95 : -75}deg`);
      particle.style.setProperty("--nian-burst-delay", `${index * 0.035}s`);
      particle.style.setProperty("--nian-burst-size", `${index % 2 ? 12 : 16}px`);
      particle.style.setProperty("--nian-burst-color", colors[index % colors.length]);
      burst.appendChild(particle);
    });

    document.body.appendChild(burst);
    window.setTimeout(() => burst.remove(), 1400);
  }

  function watchScene() {
    const scene = document.querySelector(".scene-card");
    if (!scene) return;

    let lastMood = "";
    const syncMood = () => {
      const match = scene.className.match(/(?:^|\s)state-([a-z-]+)(?:\s|$)/);
      const mood = match?.[1] ?? "idle";
      scene.dataset.nianMood = mood;
      document.documentElement.dataset.nianMood = mood;

      if (lastMood && mood !== lastMood) {
        spawnReaction(scene, mood);
        if (mood === "wrong") playUiSound("wrong");
        else if (successMoods.has(mood)) playUiSound(mood === "event" ? "open" : "correct");
      }
      lastMood = mood;
    };

    syncMood();
    new MutationObserver(syncMood).observe(scene, {
      attributes: true,
      attributeFilter: ["class"],
    });

    if (!reducedMotion?.matches && finePointer?.matches) {
      let frame = 0;
      const reset = () => {
        scene.style.setProperty("--nian-parallax-x", "0px");
        scene.style.setProperty("--nian-parallax-y", "0px");
        scene.style.setProperty("--nian-parallax-x-soft", "0px");
        scene.style.setProperty("--nian-parallax-y-soft", "0px");
        scene.style.setProperty("--nian-parallax-x-reverse", "0px");
        scene.style.setProperty("--nian-parallax-y-reverse", "0px");
      };

      scene.addEventListener("pointermove", (event) => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          const rect = scene.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width - 0.5) * 14;
          const y = ((event.clientY - rect.top) / rect.height - 0.5) * 12;
          scene.style.setProperty("--nian-parallax-x", `${x.toFixed(2)}px`);
          scene.style.setProperty("--nian-parallax-y", `${y.toFixed(2)}px`);
          scene.style.setProperty("--nian-parallax-x-soft", `${(x * 0.4).toFixed(2)}px`);
          scene.style.setProperty("--nian-parallax-y-soft", `${(y * 0.4).toFixed(2)}px`);
          scene.style.setProperty("--nian-parallax-x-reverse", `${(x * -0.32).toFixed(2)}px`);
          scene.style.setProperty("--nian-parallax-y-reverse", `${(y * -0.25).toFixed(2)}px`);
        });
      }, { passive: true });
      scene.addEventListener("pointerleave", reset, { passive: true });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) reset();
      });
    }
  }

  function revealSections() {
    const sections = document.querySelectorAll(
      ".hero-layout, .academy-overview, .knowledge-atlas-preview, .english-hub, .subject-courtyard, .arrival-event, .culture-courtyard, .academy-map-preview",
    );

    sections.forEach((section) => section.setAttribute("data-nian-reveal", "true"));

    if (reducedMotion?.matches || !("IntersectionObserver" in window)) {
      sections.forEach((section) => section.setAttribute("data-nian-seen", "true"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute("data-nian-seen", "true");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "80px 0px", threshold: 0.06 });

    sections.forEach((section) => observer.observe(section));
  }

  function showAssetFailure(label) {
    let warning = document.querySelector(".nian-load-warning");
    if (!warning) {
      warning = document.createElement("div");
      warning.className = "nian-load-warning";
      warning.setAttribute("role", "alert");
      warning.innerHTML = "<strong>有一页资源没有装好</strong><p></p><button type='button'>重新加载</button>";
      warning.querySelector("button").addEventListener("click", () => window.location.reload());
      document.body.appendChild(warning);
    }
    warning.querySelector("p").textContent = `${label}加载失败，请检查网络后重试。`;
  }

  function loadStyle(href, label) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = href;
    style.addEventListener("error", () => showAssetFailure(label), { once: true });
    document.head.appendChild(style);
  }

  function loadScript(src, label) {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => {
        showAssetFailure(label);
        reject(new Error(`${label}加载失败`));
      }, { once: true });
      document.head.appendChild(script);
    });
  }

  function loadEnhancements() {
    loadStyle("/assets/nian-arcade-v3.css", "百戏楼样式");
    loadStyle("/assets/nian-companion-v1.css", "念安陪学面板样式");
    void loadScript("/assets/nian-content-v8.js", "扩展题库")
      .then(() => loadScript("/assets/nian-arcade-v3.js", "百戏楼脚本"))
      .then(() => loadScript("/assets/nian-companion-v1.js", "念安陪学面板"))
      .catch(() => {
        // showAssetFailure already exposed a recoverable reload action.
      });
  }

  function start() {
    document.body.classList.add("nian-lively-ready");
    addAtmosphere();
    watchScene();
    revealSections();
    loadEnhancements();
    document.addEventListener("pointerdown", createTapBloom, { passive: true });
  }

  const scheduleStart = () => {
    installSound();
    if (window.requestIdleCallback) {
      window.requestIdleCallback(start, { timeout: 900 });
      return;
    }
    window.setTimeout(start, 120);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleStart, { once: true });
  } else {
    scheduleStart();
  }
})();
