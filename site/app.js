// SIGSHIP site behaviours. No dependencies; nothing leaves the page except the waitlist form, which the visitor submits.
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } } };
  const live = $('#live');
  const say = (t) => { if (!live) return; live.textContent = ''; setTimeout(() => { live.textContent = t; }, 60); };

  // ---------- Theme (dark by default) and voice (simple by default) ----------
  const meta = $('meta[name="theme-color"]');
  const syncTheme = () => { if (meta) meta.content = root.classList.contains('light') ? '#f9f9fb' : '#121316'; };
  $$('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => {
    const light = !root.classList.contains('light');
    root.classList.toggle('light', light);
    store.set('sigship-theme', light ? 'light' : 'dark');
    syncTheme();
    say(light ? 'Light mode.' : 'Dark mode.');
  }));
  syncTheme();
  $$('[data-mode-toggle]').forEach((b) => b.addEventListener('click', () => {
    const dev = !root.hasAttribute('data-dev');
    if (dev) root.setAttribute('data-dev', '1'); else root.removeAttribute('data-dev');
    store.set('sigship-dev', dev ? '1' : '0');
    $$('[data-mode-toggle]').forEach((x) => x.setAttribute('aria-pressed', String(dev)));
    say(dev ? 'Dev mode on: technical wording.' : 'Simple mode: plain wording.');
  }));
  $$('[data-mode-toggle]').forEach((x) => x.setAttribute('aria-pressed', String(root.hasAttribute('data-dev'))));

  // ---------- Header: glass once scrolled, mega menus, phone menu ----------
  const navbar = $('.navbar');
  const onScrollNav = () => navbar && navbar.classList.toggle('scrolled', scrollY > 20);
  addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();
  const menus = $$('.menu');
  const closeMenus = (except) => menus.forEach((m) => { if (m !== except) { m.classList.remove('open'); $('.menu-btn', m).setAttribute('aria-expanded', 'false'); } });
  menus.forEach((m) => {
    const btn = $('.menu-btn', m);
    const set = (on) => { m.classList.toggle('open', on); btn.setAttribute('aria-expanded', String(on)); };
    btn.addEventListener('click', () => { const on = !m.classList.contains('open'); closeMenus(m); set(on); });
    m.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { closeMenus(m); set(true); } });
    m.addEventListener('keydown', (e) => { if (e.key === 'Escape') { set(false); btn.focus(); } });
    m.addEventListener('focusout', (e) => { if (!m.contains(e.relatedTarget)) set(false); });
  });
  const header = $('.top');
  if (header) header.addEventListener('mouseleave', () => closeMenus());
  document.addEventListener('click', (e) => { if (!e.target.closest('.menu')) closeMenus(); });
  const mobile = $('.mobile-menu');
  $$('[data-mobile-toggle]').forEach((b) => b.addEventListener('click', () => {
    const open = mobile.hidden;
    mobile.hidden = !open;
    b.setAttribute('aria-expanded', String(open));
  }));
  if (mobile) mobile.addEventListener('click', (e) => { if (e.target.closest('a')) mobile.hidden = true; });

  // ---------- Copy buttons ----------
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const text = b.dataset.copy;
    const label = $('.state', b) || $('.copy-label', b) || (b.children.length ? null : b);
    try {
      await navigator.clipboard.writeText(text);
      say(`Copied ${text}.`);
      if (label) { const was = label.textContent; label.textContent = 'copied ✓'; setTimeout(() => { label.textContent = was; }, 1400); }
    } catch {
      say('Copying is blocked here. Select the text and copy it yourself.');
    }
  });

  // ---------- Reveals and word-by-word headings ----------
  const revealables = $$('.rv, .split-h, .pipeline, .bars-host');
  if (!('IntersectionObserver' in window) || calm()) revealables.forEach((el) => el.classList.add('on'));
  else {
    const io = new IntersectionObserver((ens) => { for (const en of ens) if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target); } }, { rootMargin: '0px 0px -80px 0px' });
    revealables.forEach((el) => io.observe(el));
    // Belt and braces: anything on screen is shown, however it got there (a jump to an anchor, a fast scroll, a background tab).
    const sweep = () => revealables.forEach((el) => { if (el.classList.contains('on')) return; const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('on'); });
    let queued = false;
    addEventListener('scroll', () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; sweep(); }); }, { passive: true });
    setTimeout(sweep, 400);
    setTimeout(sweep, 1200);
  }

  // ---------- Hero: shrink and fade as it scrolls away; the app window fixes itself ----------
  const heroIn = $('.hero-in');
  if (heroIn && !calm()) {
    const hero = heroIn.closest('.hero');
    const tick = () => {
      const h = hero.offsetHeight || 1;
      const p = Math.min(1, Math.max(0, scrollY / h));
      heroIn.style.transform = `translateY(${p * 120}px) scale(${1 - p * 0.1})`;
      heroIn.style.opacity = String(Math.max(0, 1 - p / 0.8));
    };
    addEventListener('scroll', tick, { passive: true });
    tick();
  }
  const win = $('.app-window');
  if (win) {
    const issues = $$('.issue', win), arc = $('.arc', win), score = $('.score', win), num = $('.score-num b', win), verdict = $('.verdict', win);
    const scores = [38, 61, 84, 100, 100];
    let step = 0;
    const paint = () => {
      issues.forEach((it, i) => it.classList.toggle('ok', step > i));
      const done = step >= issues.length;
      const s = scores[Math.min(step, scores.length - 1)];
      if (arc) arc.style.strokeDashoffset = String(314 - (314 * s) / 100);
      if (score) score.classList.toggle('done', done);
      if (num) num.textContent = String(s);
      verdict.classList.toggle('go', done);
      $('.s', verdict).textContent = done ? '🚀 Ready to launch' : `${issues.length - step} things to fix before launch`;
      $('.d', verdict).textContent = done ? 'GO · exit 0' : 'NO-GO · exit 1';
    };
    paint();
    if (!calm()) setInterval(() => { step = step >= 4 ? 0 : step + 1; paint(); }, 1500);
  }

  // ---------- Film: the Vimeo player is created only when the visitor presses play ----------
  const frame = $('.film-frame');
  if (frame) {
    const play = $('.play', frame);
    play.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://player.vimeo.com/video/${frame.dataset.vimeo}?autoplay=1&dnt=1&title=0&byline=0&portrait=0`;
      f.title = frame.dataset.title || 'SIGSHIP film';
      f.allow = 'autoplay; fullscreen; picture-in-picture';
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      frame.append(f);
      frame.classList.add('playing');
      say('Playing the film.');
    });
    if (!calm()) {
      const grow = () => {
        const r = frame.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight / 2 + r.height / 2)));
        frame.style.setProperty('--s', String(0.78 + 0.22 * p));
        frame.style.borderRadius = `${48 - 24 * p}px`;
      };
      addEventListener('scroll', grow, { passive: true });
      grow();
    }
  }

  // ---------- How it works: pinned horizontal scroll on wide screens ----------
  const hiw = $('.hiw');
  if (hiw) {
    const track = $('.hiw-track', hiw), bar = $('.hiw-head .bar i', hiw);
    const wide = () => matchMedia('(min-width: 1024px)').matches;
    const tick = () => {
      if (!wide()) { track.style.setProperty('--x', '0%'); if (bar) bar.style.width = '100%'; return; }
      const r = hiw.getBoundingClientRect();
      const total = hiw.offsetHeight - innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      track.style.setProperty('--x', `${-p * 66.666}%`);
      if (bar) bar.style.width = `${p * 100}%`;
    };
    addEventListener('scroll', tick, { passive: true });
    addEventListener('resize', tick);
    tick();
  }

  // ---------- Check filters ----------
  for (const filters of $$('.filters')) {
    const grid = filters.nextElementSibling;
    const chips = $$('.chip', filters);
    chips.forEach((c) => c.addEventListener('click', () => {
      chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      const g = c.dataset.group;
      let n = 0;
      $$('.check-card', grid).forEach((card) => { const show = g === 'all' || card.dataset.group === g; card.hidden = !show; if (show) n++; });
      say(`${n} checks shown.`);
    }));
  }

  // ---------- Tabs (agent setup, API samples) ----------
  for (const list of $$('[role="tablist"]')) {
    const tabs = $$('[role="tab"]', list);
    const pick = (tab, focus) => {
      tabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; const p = document.getElementById(t.getAttribute('aria-controls')); if (p) p.hidden = !on; });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => pick(tab, false));
      tab.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); pick(tabs[(i + d + tabs.length) % tabs.length], true); } });
    });
  }

  // ---------- Badge: type an app name, tilt with the pointer ----------
  for (const stage of $$('.badge-stage')) {
    const input = $('input', stage);
    const apply = () => { const v = (input.value.trim().slice(0, 28) || 'myapp.com'); $$('[data-app]').forEach((el) => { el.textContent = v; }); $$('[data-app-code]').forEach((el) => { el.textContent = el.dataset.appCode.replaceAll('{app}', v); }); };
    if (input) { input.addEventListener('input', apply); apply(); }
    if (matchMedia('(hover: hover) and (pointer: fine)').matches && !calm()) {
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        $$('.tilt', stage).forEach((t) => { t.style.setProperty('--rx', `${-y * 20}deg`); t.style.setProperty('--ry', `${x * 24}deg`); });
      });
      stage.addEventListener('pointerleave', () => $$('.tilt', stage).forEach((t) => { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); }));
    }
  }

  // ---------- Cloud dashboard preview: cycles through the demo apps ----------
  for (const dash of $$('.dash')) {
    const apps = JSON.parse(dash.dataset.apps);
    const btns = $$('.dash-apps button', dash);
    const arc = $('.ring-wrap .arc', dash), num = $('.ring-wrap b', dash), st = $('.tile .status', dash), ringTile = $('.ring-wrap', dash);
    const meters = $$('.issue-rows .meter i', dash), counts = $$('.issue-rows .n', dash), badge = $('[data-badge]', dash);
    let sel = 0;
    const paint = () => {
      const a = apps[sel];
      const good = a.s === 100;
      const c = good ? 'var(--go)' : a.s > 80 ? 'var(--warn)' : 'var(--coral)';
      btns.forEach((b, i) => b.setAttribute('aria-selected', String(i === sel)));
      if (arc) { arc.style.strokeDashoffset = String(314 - 3.14 * a.s); ringTile.style.setProperty('--c', c); }
      if (num) num.textContent = String(a.s);
      if (st) { st.textContent = a.st; st.style.setProperty('--c', good ? 'var(--go)' : 'var(--warn)'); }
      const ns = [good ? 0 : 1, good ? 0 : 2, 1];
      meters.forEach((m, i) => { m.style.setProperty('--w', `${ns[i] * 30 + 4}%`); });
      counts.forEach((n, i) => { n.textContent = String(ns[i]); });
      if (badge) { $('.vbadge', badge).hidden = !good; $('.paused', badge).hidden = good; $$('[data-app]', badge).forEach((el) => { el.textContent = a.n; }); }
    };
    btns.forEach((b, i) => b.addEventListener('click', () => { sel = i; paint(); }));
    paint();
    if (!calm()) setInterval(() => { sel = (sel + 1) % apps.length; paint(); }, 3000);
  }

  // ---------- Docs: the side list follows the section you read ----------
  const side = $('.docs-side');
  if (side) {
    const links = $$('a', side), heads = $$('.docs-main section[id]');
    const spy = () => { let cur = heads[0]; for (const h of heads) if (h.getBoundingClientRect().top <= innerHeight * 0.3) cur = h; links.forEach((a) => { if (a.getAttribute('href') === `#${cur.id}`) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }); };
    addEventListener('scroll', spy, { passive: true });
    spy();
  }

  // ---------- Old links to the previous home page still land somewhere useful ----------
  if (location.pathname === '/' && location.hash === '#waitlist') location.replace('/waitlist/');
  if (location.pathname === '/' && /^#(start|how|where|limits|why)$/.test(location.hash)) history.replaceState(null, '', '/');

  // ---------- A link to a folded notice opens it ----------
  const openHash = () => { const el = location.hash && document.getElementById(location.hash.slice(1)); if (el && el.tagName === 'DETAILS') el.open = true; };
  addEventListener('hashchange', openHash);
  openHash();

  // ---------- Announcement strip ----------
  $$('[data-strip-close]').forEach((b) => b.addEventListener('click', () => { root.classList.remove('has-strip'); store.set('sigship-strip-cm26', 'x'); }));

  // ---------- Cloud billing: yearly (as shown) or monthly (25% more) ----------
  for (const panel of $$('.bill-panel')) {
    const btns = $$('[data-bill]', panel);
    btns.forEach((b) => b.addEventListener('click', () => {
      const monthly = b.dataset.bill === 'monthly';
      panel.classList.toggle('bill-m', monthly);
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      say(monthly ? 'Showing monthly prices.' : 'Showing yearly prices.');
    }));
  }

  // ---------- Waitlist page: preselect the plan from the link ----------
  const want = new URLSearchParams(location.search).get('plan');
  if (want) { const r = $(`.plan-pick input[value="${CSS.escape(want)}"]`); if (r) r.checked = true; }

  // ---------- Waitlist forms: /api/waitlist, same Worker as before ----------
  for (const form of $$('form[data-waitlist]')) {
    const started = $('input[name="started"]', form);
    if (started) started.value = String(Date.now());
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('input[type="email"]', form);
      const err = $('.wl-err', form);
      if (!email.checkValidity()) { if (err) { err.hidden = false; err.textContent = 'Enter an email address, like you@example.com.'; } email.focus(); return; }
      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      try {
        const res = await fetch(form.action, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) throw new Error(data.error || 'Please try again.');
        const ok = form.nextElementSibling;
        form.hidden = true;
        if (ok && ok.classList.contains('wl-ok')) { ok.hidden = false; ok.focus?.(); }
        say('Received. We will email you once, when it opens.');
      } catch (ex) {
        if (err) { err.hidden = false; err.textContent = ex.message || 'Please try again.'; }
        btn.disabled = false;
      }
    });
  }
})();
