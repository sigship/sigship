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


  // ---------- Badge IDs (same as scripts/badge-id.js) ----------
  const host = (v) => String(v || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#:\s]/)[0].slice(0, 80);
  const badgeId = (letter, site) => {
    let h = 0x811c9dc5;
    for (const ch of `${letter}:${host(site)}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
    let code = '';
    for (let i = 0; i < 6; i++) { code += '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[h & 31]; h >>>= 5; }
    return `SG-${letter}-${code}`;
  };

  // ---------- Badge: the embed code for your own site ----------
  for (const card of $$('.embed-card')) {
    const input = $('[data-embed-site]', card);
    const paint = () => {
      const site = host(input.value) || 'myapp.com', id = badgeId('S', site), rec = `https://sigship.dev/verify/?id=${id}&site=${encodeURIComponent(site)}`;
      const code = `<a href="${rec}" title="Check this SIGSHIP badge">\n  <img src="https://sigship.dev/b/${id}.svg"\n       alt="Self-checked with SIGSHIP, badge ${id}" height="32">\n</a>`;
      $('[data-embed-code]', card).textContent = code;
      $('[data-embed-copy]', card).dataset.copy = code;
      $('[data-embed-id]', card).textContent = id;
      $('[data-embed-link]', card).href = rec.replace('https://sigship.dev', '');
      const img = $('[data-embed-img]', card); img.src = `/b/${id}.svg`; img.alt = `Self-checked with SIGSHIP, badge ${id}`;
    };
    input.addEventListener('input', paint); paint();
  }

  // ---------- Badge records: /verify/?id=…&site=… ----------
  for (const app of $$('.verify-app')) {
    const q = new URLSearchParams(location.search), id = (q.get('id') || '').trim().toUpperCase(), site = host(q.get('site'));
    $('#v-id', app).value = id; $('#v-site', app).value = site;
    if (!id || (id === app.dataset.ownId && (!site || site === app.dataset.ownSite))) continue;
    const LV = { S: ['Steel', 'Self-checked'], D: ['Bronze', 'Deep self-check'], C: ['Silver', 'Checked daily'], L: ['Gold', 'Live-checked'], X: ['Platinum', 'Expert-reviewed'], T: ['Black platinum', 'Expert-reviewed & live-checked'] };
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const row = (k, v) => `<div class="rec-row"><dt>${k}</dt><dd>${v}</dd></div>`;
    const ok = /^SG-[SDCLXT]-[0-9A-HJKMNP-TV-Z]{6}$/.test(id), L = ok ? id[3] : '', lv = LV[L];
    let state, tone, title, rows = [], img = false;
    if (!ok) { state = 'Not a SIGSHIP ID'; tone = 'stop'; title = 'This isn’t a SIGSHIP badge ID'; rows = [row('What we got', esc(id)), row('What IDs look like', 'SG-, a level letter, a dash and six characters, like SG-S-4K7Q2M.')]; }
    else if (!site) { state = 'Site missing'; tone = 'warn'; title = 'Which site shows this badge?'; rows = [row('Badge ID', id), row('Level', `${lv[0]} · ${lv[1]}`), row('Next step', 'Add the site’s address below. An ID only fits the site it was made for.')]; }
    else if (badgeId(L, site) !== id) { state = 'Doesn’t match'; tone = 'stop'; title = `This ID doesn’t belong to ${esc(site)}`; rows = [row('Badge ID', id), row('Site', esc(site)), row('What it means', 'The badge was copied from another site or edited. Treat it as not genuine.')]; }
    else if (site === 'myapp.com') { state = 'Example'; tone = 'sky'; title = 'This is a sample badge'; img = 'SD'.includes(L); rows = [row('Badge ID', id), row('Level', `${lv[0]} · ${lv[1]}`), row('Where it’s from', 'The examples on <a href="/badge/">sigship.dev/badge</a>. Real badges carry the ID of the site that shows them.')]; }
    else if (L === 'S') { state = 'Self-declared'; tone = 'warn'; img = true; title = `${esc(site)} says it passed the free check`; rows = [row('Badge ID', id), row('Site', esc(site)), row('Level', `${lv[0]} · ${lv[1]}`), row('Who checked', 'The site’s owner, on their own computer, with the 17 core checks. The free check sends nothing to SIGSHIP, so we can’t confirm the result. That is why this level is self-declared.'), row('Stronger proof', 'Checked daily and Live-checked badges are run and drawn by sigship.dev itself. <a href="/badge/">See the levels</a>.')]; }
    else { state = 'Checking our records…'; tone = 'sky'; title = `Looking up ${esc(lv[1])} for ${esc(site)}`; rows = [row('Badge ID', id), row('Site', esc(site)), row('Level', `${lv[0]} · ${lv[1]}`)]; }
    const paint = () => {
      const st = $('[data-rec-state]', app); st.textContent = state; st.style.setProperty('--c', `var(--${tone})`);
      $('[data-rec-id]', app).textContent = ok ? id : '';
      $('[data-rec-title]', app).innerHTML = title;
      $('[data-rec-list]', app).innerHTML = rows.join('');
      const b = $('[data-rec-badge]', app); b.innerHTML = img ? `<img src="/b/${id}.svg" height="32" alt="SIGSHIP badge ${id}">` : ''; b.hidden = !img;
      document.title = `${ok ? id : 'Badge'} — check a SIGSHIP badge`;
    };
    paint();
    if (state !== 'Checking our records…') continue;
    // Issued levels (Deep self-check and up) have a record in the SIGSHIP Cloud API; Deep self-check also in the licence server.
    const when = (iso) => { const d = new Date(iso); return Number.isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
    const sources = [`https://app.sigship.dev/api/v1/badges/${id}`, ...(L === 'D' ? [`https://api.sigship.dev/v1/badge/${id}`] : [])];
    (async () => {
      let rec = null;
      for (const url of sources) { try { const r = await fetch(url, { headers: { accept: 'application/json' } }); if (r.ok) { const j = await r.json(); if (j && j.id === id) { rec = j; break; } } } catch { /* next */ } }
      const who = { D: 'The site’s owner, with a SIGSHIP licence, using the core checks and the Pro pack. The licence server confirms the site is registered to that licence.', C: 'SIGSHIP ran the check itself, every night, and drew this badge.', L: 'SIGSHIP ran the check on every change to the code and drew this badge.', X: 'A SIGSHIP expert engineer reviewed the code by hand against the <a href="/expert-review/protocol/">review protocol</a>.', T: 'A SIGSHIP expert engineer reviewed the code by hand, and SIGSHIP re-checks it on every change.' }[L];
      if (!rec || rec.site && host(rec.site) !== site) { state = 'Not in our records'; tone = 'warn'; title = `No ${esc(lv[1])} record for ${esc(site)}`; rows = [row('Badge ID', id), row('Site', esc(site)), row('Level', `${lv[0]} · ${lv[1]}`), row('What it means', 'This level is issued by sigship.dev, and we have no record of it for this site. Treat the badge as not verified, and ask the owner to contact support@sigship.dev.')]; }
      else if (rec.state === 'revoked') { state = 'Revoked'; tone = 'stop'; img = true; title = `The ${esc(lv[1])} badge for ${esc(site)} was revoked`; rows = [row('Badge ID', id), row('Site', esc(site)), row('Level', `${lv[0]} · ${lv[1]}`), row('Why', 'A problem a check should have caught. The <a href="/incident-rule/">incident rule</a> says what happens next, and the write-up is in the <a href="/lookout/">Lookout</a>.')]; }
      else if (rec.state === 'paused') { state = 'Paused'; tone = 'warn'; img = true; title = `The ${esc(lv[1])} badge for ${esc(site)} is paused`; rows = [row('Badge ID', id), row('Site', esc(site)), row('Level', `${lv[0]} · ${lv[1]}`), row('Why', 'The last check did not pass. The badge comes back by itself when a check passes again.'), row('Last pass', rec.lastPass ? when(rec.lastPass) : 'None recorded')]; }
      else { state = 'Genuine · issued by SIGSHIP'; tone = 'go'; img = true; title = `${esc(site)} holds the ${esc(lv[1])} badge`; rows = [row('Badge ID', id), row('Site', esc(site)), row('Level', `${lv[0]} · ${lv[1]}`), row('Who checked', who), ...(rec.lastPass ? [row('Last pass', when(rec.lastPass))] : []), ...(rec.streakSince ? [row('Clean since', when(rec.streakSince))] : [])]; }
      paint();
    })();
  }

  // ---------- Badge: type an app name, tilt with the pointer ----------
  for (const stage of $$('.badge-stage')) {
    const input = $('input', stage);
    const apply = () => {
      const v = (input.value.trim().slice(0, 40) || 'myapp.com');
      $$('[data-app]').forEach((el) => { el.textContent = host(v) || v; });
      // Every sample badge on the page takes the typed site's own ID.
      $$('a.sg-pill[data-letter]').forEach((a) => { if (a.closest('.foot-badge, .verify-app')) return; const id = badgeId(a.dataset.letter, v); const t = $('[data-badge-id]', a); if (t) t.textContent = id; a.href = `/verify/?id=${id}&site=${encodeURIComponent(host(v))}`; });
    };
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
      if (badge) { $('.sg-pill', badge).hidden = !good; $('.paused', badge).hidden = good; $$('[data-app]', badge).forEach((el) => { el.textContent = a.n; }); }
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
