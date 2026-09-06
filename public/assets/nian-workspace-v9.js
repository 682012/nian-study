(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const views = {
    today: { label: '今日书案', title: '灯已点好，翻开今天这一页。', copy: '先完成一件小事。剩下的，我们一课一课来。', sections: ['.hero-layout', '#nian-companion-card', '.culture-courtyard'] },
    practice: { label: '三科练习', title: '挑一馆，开始练。', copy: '听、写、算、读；从基础温习到一卷小测。', sections: ['#nian-arcade-hub', '.english-hub', '.subject-courtyard', '.academy-overview'] },
    library: { label: '藏书楼', title: '先弄懂，再落笔。', copy: '知识点、例题和解题方法，都放在这里。', sections: ['.knowledge-atlas-preview'] },
    courtyard: { label: '逛逛书院', title: '课间，去庭里走走。', copy: '一张诗笺、一段小事，也有你慢慢点亮的书院。', sections: ['.arrival-event', '.culture-courtyard', '.academy-map-preview'] },
  };
  let view = 'today';
  let savedFocus = null;
  let previousDialog = null;
  let mounted = false;
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setView(next, scroll = true) {
    if (!views[next]) return;
    view = next;
    const config = views[next];
    document.body.dataset.deskView = view;
    for (const item of new Set(Object.values(views).flatMap(item => item.sections))) {
      const section = $(item);
      if (section) section.dataset.deskHidden = String(!config.sections.includes(item));
    }
    document.querySelectorAll('[data-desk-view-button]').forEach(button => {
      if (button.dataset.deskViewButton === view) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    $('[data-desk-title]').textContent = config.title;
    $('[data-desk-copy]').textContent = config.copy;
    $('[data-desk-kicker]').textContent = `清晖书院 / ${config.label}`;
    try { sessionStorage.setItem('nian-desk-view-v9', view); } catch { /* Optional preference. */ }
    if (scroll) {
      window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      $('#nian-desk-content')?.focus({ preventScroll: true });
    }
  }

  function mountFilters() {
    const grid = $('.nian-arcade-grid');
    if (!grid || $('.nian-practice-filters')) return;
    const filters = document.createElement('div');
    filters.className = 'nian-practice-filters';
    filters.setAttribute('aria-label', '按学科筛选练习');
    filters.innerHTML = [['all','全部'],['english','英语'],['math','数学'],['chinese','语文'],['mixed','综合']].map(([id,label]) => `<button type="button" data-desk-filter="${id}" aria-pressed="${id === 'all'}">${label}</button>`).join('');
    grid.before(filters);
  }

  function filterPractice(subject) {
    const groups = { english: ['listen','listening','dictation','sentence'], math: ['math'], chinese: ['chinese','reading'], mixed: ['adaptive','mixed','endless'] };
    document.querySelectorAll('.nian-mode-card').forEach(card => { card.hidden = subject !== 'all' && !groups[subject]?.includes(card.dataset.arcadeMode); });
    document.querySelectorAll('[data-desk-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.deskFilter === subject)));
    $('.english-hub')?.setAttribute('data-desk-hidden', String(!['all','english'].includes(subject)));
    $('.subject-courtyard')?.setAttribute('data-desk-hidden', String(subject === 'mixed'));
    document.querySelectorAll('.subject-feature').forEach(card => { card.hidden = subject !== 'all' && !card.classList.contains(`${subject}-feature`); });
  }

  function syncDialogs() {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(el => el.getClientRects().length && !el.closest('[hidden]'));
    const active = dialogs.at(-1) || null;
    if (active === previousDialog) return;
    document.body.classList.toggle('nian-dialog-open', Boolean(active));
    // Keep background controls out of keyboard navigation without changing React's DOM.
    const shell = $('.app-shell');
    if (shell) shell.inert = Boolean(active && !shell.contains(active));
    $('.nian-desk-bottom')?.toggleAttribute('inert', Boolean(active));
    if (active) {
      if (!previousDialog) savedFocus = document.activeElement;
      if (!active.contains(document.activeElement)) (active.querySelector('button, input, select, textarea, [tabindex]') || active).focus({ preventScroll: true });
    } else if (savedFocus?.isConnected) {
      savedFocus.focus({ preventScroll: true });
      savedFocus = null;
    }
    previousDialog = active;
  }

  function mount() {
    if (mounted || !$('.mission-board') || !$('#nian-arcade-hub') || !$('#nian-companion-card') || $('.startup-screen')) return;
    mounted = true;
    const nav = document.createElement('nav');
    nav.className = 'nian-desk-nav';
    nav.setAttribute('aria-label', '书院导航');
    nav.innerHTML = `<div class="nian-desk-tabs">${[['today','书案'],['practice','练习'],['library','藏书'],['courtyard','书院']].map(([id,label]) => `<button type="button" data-desk-view-button="${id}">${label}</button>`).join('')}</div><div class="nian-desk-tools"><button type="button" data-desk-core="data">我的学录</button><button type="button" data-desk-sound aria-label="切换界面音效">音效：开</button></div>`;
    $('.topbar').after(nav);
    const intro = document.createElement('section');
    intro.className = 'nian-page-intro';
    intro.id = 'nian-desk-content';
    intro.tabIndex = -1;
    const date = new Date();
    intro.innerHTML = `<div><span class="nian-kicker" data-desk-kicker></span><h2 data-desk-title></h2><p data-desk-copy></p></div><div class="nian-date-mark"><strong>${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}</strong>${['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][date.getDay()]}</div>`;
    nav.after(intro);
    const bottom = document.createElement('nav');
    bottom.className = 'nian-desk-bottom';
    bottom.setAttribute('aria-label', '手机快捷导航');
    bottom.innerHTML = `<button type="button" data-desk-view-button="today"><span>案</span>今日</button><button type="button" data-desk-view-button="practice"><span>习</span>练习</button><button type="button" data-nian-action="chat"><span>安</span>念安</button><button type="button" data-desk-core="wrongbook"><span>拾</span>错题</button><button type="button" data-desk-core="data"><span>录</span>学录</button>`;
    document.body.append(bottom);
    const installLinks = document.createElement('div');
    installLinks.className = 'nian-install-links';
    installLinks.innerHTML = `<a href="/downloads/nian-study-android-v1.1.0.apk">下载 Android 应用 ↗</a><button type="button" data-desk-install>安装网页应用</button><span data-desk-install-note></span>`;
    if (!document.documentElement.classList.contains('android-shell')) $('.site-footer').after(installLinks);
    const skip = document.createElement('a');
    skip.className = 'nian-skip-link'; skip.href = '#nian-desk-content'; skip.textContent = '跳到今日书案';
    document.body.prepend(skip);
    $('.brand-copy strong').textContent = '清晖书院 · 念安陪学';
    $('.brand-copy small').textContent = '同窗在侧，今日也一起进步';
    document.body.classList.add('nian-workspace-ready');
    document.documentElement.dataset.nianRelease = '9.0.0';
    mountFilters();
    try { view = sessionStorage.getItem('nian-desk-view-v9') || 'today'; } catch { /* Keep default. */ }
    setView(views[view] ? view : 'today', false);
    syncSound();
  }

  function syncSound() {
    const original = $('[data-nian-sound-toggle]');
    const button = $('[data-desk-sound]');
    if (!original || !button) return;
    const on = original.getAttribute('aria-pressed') === 'true';
    button.textContent = `音效：${on ? '开' : '关'}`;
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', original.getAttribute('aria-label'));
  }

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.deskViewButton) { setView(button.dataset.deskViewButton); if(view === 'practice') filterPractice('all'); }
    if (button.dataset.deskFilter) filterPractice(button.dataset.deskFilter);
    if (button.dataset.deskCore) window.dispatchEvent(new CustomEvent('nian:open-core', { detail: button.dataset.deskCore }));
    if (button.hasAttribute('data-desk-sound')) { $('[data-nian-sound-toggle]')?.click(); syncSound(); }
    if (button.hasAttribute('data-desk-install')) {
      if (installPrompt) { const prompt = installPrompt; installPrompt = null; void prompt.prompt(); }
      else $('[data-desk-install-note]').textContent = '在浏览器菜单中选择“安装应用”或“添加到主屏幕”。';
    }
    if (button.closest('.brand')) setView('today');
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !previousDialog) return;
    const items = [...previousDialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length && !el.closest('[hidden]'));
    if (!items.length) return;
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && (document.activeElement === first || !previousDialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !previousDialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  });
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; mount(); syncDialogs(); });
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  mount();
})();
