// Night Harbour behaviours shared by every page: the Plain/Dev switch, scroll reveals, scroll progress,
// the GO-flag plaques, and the Lookout filters. No dependencies, nothing leaves the page.
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const calm = () => root.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live = $('#live');
  const say = (text) => { if (!live) return; live.textContent = ''; setTimeout(() => { live.textContent = text; }, 60); };

  // ---------- Plain / Dev ----------
  // Plain is the default for everyone. Dev shows the terminal, the commands and the technical words.
  const mode = () => (root.dataset.mode === 'dev' ? 'dev' : 'plain');
  const syncMode = () => {
    const m = mode();
    $$('[data-mode-toggle]').forEach((b) => { b.setAttribute('aria-pressed', String(m === 'dev')); });
    $$('input[name^="mode-"]').forEach((i) => { i.checked = i.value === m; });
  };
  const setMode = (m, animate) => {
    const apply = () => {
      if (m === 'dev') root.dataset.mode = 'dev'; else delete root.dataset.mode;
      try { localStorage.setItem('sigship-mode', m); } catch { /* private mode */ }
      syncMode();
      observe();
      say(m === 'dev' ? 'Developer mode. Commands and technical words are shown.' : 'Plain mode. Everyday words are shown.');
    };
    const main = $('main');
    if (animate && main && !calm()) {
      main.classList.add('mode-fade');
      setTimeout(() => { apply(); requestAnimationFrame(() => main.classList.remove('mode-fade')); }, 180);
    } else apply();
  };
  $$('[data-mode-toggle]').forEach((b) => b.addEventListener('click', () => setMode(mode() === 'dev' ? 'plain' : 'dev', true)));
  document.addEventListener('change', (e) => { const i = e.target; if (i.name && i.name.startsWith('mode-')) setMode(i.value, true); });
  syncMode();

  // ---------- Reveals: everything is visible without JavaScript; with it, blocks rise in as they enter view ----------
  let io = null;
  function observe() {
    const els = $$('.rv:not(.on), .tier:not(.on)');
    if (!('IntersectionObserver' in window) || calm()) { els.forEach((el) => el.classList.add('on')); return; }
    io ||= new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    els.forEach((el) => { if (el.offsetParent !== null) io.observe(el); });
  }
  observe();
  // A safety net: anything in view that is still hidden a moment after load is shown.
  setTimeout(() => { $$('.rv:not(.on), .tier:not(.on)').forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('on'); }); }, 1400);

  // ---------- Scroll progress (0 to 1) for anything with data-progress, and the page's scroll offset ----------
  const prog = $$('[data-progress]');
  let ticking = false;
  const tick = () => {
    const vh = innerHeight || 1;
    prog.forEach((el) => { const r = el.getBoundingClientRect(); let p = (vh - r.top) / (vh + r.height); p = p < 0 ? 0 : p > 1 ? 1 : p; el.style.setProperty('--p', p.toFixed(4)); });
    root.style.setProperty('--sy', String(scrollY || 0));
    ticking = false;
  };
  if (prog.length || $('.hb-hero')) {
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
    addEventListener('resize', tick);
    tick();
  }

  // ---------- Hero: a glow that follows the pointer, and the flow's SVG motion paused when motion is off ----------
  const hero = $('.nh-hero');
  if (hero) {
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--gx', `${e.clientX - r.left}px`);
        hero.style.setProperty('--gy', `${e.clientY - r.top}px`);
      }, { passive: true });
    }
    const flow = $('.flow', hero);
    const still = () => { if (!flow || !flow.pauseAnimations) return; if (calm()) { flow.pauseAnimations(); flow.setCurrentTime(0); } else flow.unpauseAnimations(); };
    still();
    new MutationObserver(still).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  }

  // ---------- The GO-flag plaques: tilt and a holographic shimmer that follow the pointer (desktop only) ----------
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !calm()) {
    $$('.plaque').forEach((pl) => {
      pl.addEventListener('pointermove', (e) => {
        const r = pl.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        pl.style.setProperty('--rx', `${((0.5 - y) * 14).toFixed(2)}deg`);
        pl.style.setProperty('--ry', `${((x - 0.5) * 18).toFixed(2)}deg`);
        pl.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        pl.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      });
      pl.addEventListener('pointerleave', () => { pl.style.setProperty('--rx', '0deg'); pl.style.setProperty('--ry', '0deg'); });
    });
    const hero = $('.hb-hero');
    if (hero) hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); hero.style.setProperty('--gx', `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`); hero.style.setProperty('--gy', `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`); });
  }

  // ---------- The Lookout email form: same endpoint as the waitlist, plan "lookout" ----------
  $$('form.lk-sub').forEach((form) => {
    const started = form.querySelector('[name="started"]');
    if (started) started.value = String(Date.now());
    const err = form.querySelector('.wl-err');
    const ok = form.parentElement.querySelector('.lk-ok');
    const em = form.querySelector('input[type="email"]');
    const showErr = (text) => { if (!err) return; err.textContent = text; err.hidden = false; };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!em.value || !em.checkValidity()) { showErr('Enter an email address, like you@example.com.'); em.setAttribute('aria-invalid', 'true'); em.focus(); return; }
      if (err) err.hidden = true; em.removeAttribute('aria-invalid');
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const res = await fetch(form.action, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.ok) { form.hidden = true; if (ok) { ok.textContent = form.dataset.ok || 'Received.'; ok.hidden = false; ok.focus(); } say(form.dataset.ok || 'Received.'); }
        else showErr(body.error || 'That did not go through. Try again in a minute.');
      } catch { showErr('Could not reach SIGSHIP. Check your connection and try again.'); }
      finally { button.disabled = false; }
    });
  });

  // ---------- Lookout filters ----------
  const notes = $$('.nt');
  if (notes.length) {
    let fs = 'all', fk = 'all';
    const count = $('#lk-count');
    const apply = () => {
      let n = 0;
      notes.forEach((el) => {
        const ok = (fs === 'all' || el.dataset.status === fs) && (fk === 'all' || ` ${el.dataset.stack} `.includes(` ${fk} `));
        el.hidden = !ok; if (ok) n++;
      });
      if (count) count.textContent = `Showing ${n} of ${notes.length} notices`;
    };
    $$('[data-fs]').forEach((b) => b.addEventListener('click', () => { fs = b.dataset.fs; $$('[data-fs]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); apply(); }));
    $$('[data-fk]').forEach((b) => b.addEventListener('click', () => { fk = b.dataset.fk; $$('[data-fk]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); apply(); }));
    apply();
  }
})();
