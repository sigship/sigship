// Inner pages: the same header, menu and footer behaviour as the home page (copy, theme, motion, menu),
// without the home page's demo console.
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const calm = () => root.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live = $('#live');
  const say = (text) => {
    if (!live) return;
    live.textContent = '';
    setTimeout(() => { live.textContent = text; }, 60);
  };

  // Copy: neutral feedback, and select the text if copying is blocked.
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const text = b.dataset.copy, label = b.dataset.copyLabel || text;
    try {
      await navigator.clipboard.writeText(text);
      say(`Copied ${label}.`);
      const span = b.classList.contains('btn-ink') ? b.querySelector('span:last-child') : (b.children.length ? null : b);
      if (span) { const was = span.textContent; span.textContent = 'Copied'; setTimeout(() => { span.textContent = was; }, 1600); }
    } catch {
      const code = b.parentElement.querySelector('code');
      if (code) { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      say('Copying is blocked here. The text is selected, so you can copy it yourself.');
    }
  });

  // Theme (lamp-on reveal from the button) and the Motion switch.
  const meta = $('meta[name="theme-color"]');
  const themeMode = () => { try { return localStorage.getItem('sigship-theme') || 'system'; } catch { return 'system'; } };
  const syncCtl = () => {
    const tm = themeMode(), mo = root.dataset.motion === 'off' ? 'off' : 'on';
    $$('input[name^="theme-"]').forEach((i) => { i.checked = i.value === tm; });
    $$('input[name^="motion-"]').forEach((i) => { i.checked = i.value === mo; });
  };
  const setTheme = (mode, from) => {
    const dark = mode === 'dark' || (mode !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    try { if (mode === 'system') localStorage.removeItem('sigship-theme'); else localStorage.setItem('sigship-theme', mode); } catch { /* private mode */ }
    const flip = () => { root.classList.toggle('dark', dark); if (meta) meta.content = dark ? '#060b14' : '#edf2f6'; };
    if (from) { const r = from.getBoundingClientRect(); root.style.setProperty('--vt-x', `${r.left + r.width / 2}px`); root.style.setProperty('--vt-y', `${r.top + r.height / 2}px`); }
    if (root.classList.contains('dark') !== dark && !calm() && document.startViewTransition && from) document.startViewTransition(flip); else flip();
    syncCtl();
  };
  $$('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => setTheme(root.classList.contains('dark') ? 'light' : 'dark', b)));
  document.addEventListener('change', (e) => {
    const i = e.target;
    if (i.name && i.name.startsWith('theme-')) setTheme(i.value);
    if (i.name && i.name.startsWith('motion-')) {
      if (i.value === 'off') root.dataset.motion = 'off'; else delete root.dataset.motion;
      try { if (i.value === 'off') localStorage.setItem('sigship-motion', 'off'); else localStorage.removeItem('sigship-motion'); } catch { /* private mode */ }
      syncCtl();
    }
  });
  syncCtl();

  // Tabs: each tab group switches only its own panels. Arrow keys move between tabs.
  for (const list of $$('[role="tablist"]')) {
    const tabs = $$('[role="tab"]', list);
    const pick = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => pick(tab, false));
      tab.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (d) { e.preventDefault(); pick(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
    pick(tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0], false);
  }

  // Menu sheet: native dialog with command/commandfor, and a fallback.
  const menu = $('#menu');
  if (menu) {
    if (!('command' in HTMLButtonElement.prototype)) {
      $$('[commandfor="menu"]').forEach((b) => b.addEventListener('click', () => { if (b.getAttribute('command') === 'close') menu.close(); else if (!menu.open) menu.showModal(); }));
      menu.addEventListener('click', (e) => { if (e.target === menu) menu.close(); });
    }
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) menu.close(); });
  }
})();
