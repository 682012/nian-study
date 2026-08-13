(() => {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)");
  const successMoods = new Set(["correct", "combo", "celebrate", "event"]);

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

      if (lastMood && mood !== lastMood) spawnReaction(scene, mood);
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

  function loadArcade() {
    if (!document.querySelector('link[href="/assets/nian-arcade-v3.css"]')) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = "/assets/nian-arcade-v3.css";
      document.head.appendChild(style);
    }
    if (!document.querySelector('script[src="/assets/nian-arcade-v3.js"]')) {
      const script = document.createElement("script");
      script.src = "/assets/nian-arcade-v3.js";
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  function start() {
    document.body.classList.add("nian-lively-ready");
    addAtmosphere();
    watchScene();
    revealSections();
    loadArcade();
    document.addEventListener("pointerdown", createTapBloom, { passive: true });
  }

  const scheduleStart = () => {
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
