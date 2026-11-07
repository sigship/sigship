(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const D = JSON.parse($('#run-data').textContent);
  const T = D.T;
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const calm = () => root.dataset.motion === 'off' || mqReduce.matches;
  const SPRING = CSS.supports('transition-timing-function', 'linear(0, 1)') ? getComputedStyle(root).getPropertyValue('--spring').trim() : 'cubic-bezier(.3, 1.3, .5, 1)';
  const E = { out: 'cubic-bezier(.2,.75,.2,1)', io: 'cubic-bezier(.65,0,.35,1)', lin: 'linear', spring: SPRING };
  const live = $('#live');
  window.__said = [];
  const say = (text) => {
    window.__said.push(text);
    if (typeof root.ariaNotify === 'function') { try { root.ariaNotify(text); return; } catch (e) { /* fall through */ } }
    live.textContent = '';
    setTimeout(() => { live.textContent = text; }, 60);
  };

  // ---------- Copy: neutral feedback (never green), and select the text if copying is blocked ----------
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const text = b.dataset.copy, label = b.dataset.copyLabel || text;
    try {
      await navigator.clipboard.writeText(text);
      say(`Copied ${label}.`);
      const span = b.querySelector('span:last-child') && b.classList.contains('btn-ink') ? b.querySelector('span:last-child') : (b.children.length ? null : b);
      if (span) { const was = span.textContent; span.textContent = 'Copied'; setTimeout(() => { span.textContent = was; }, 1600); }
    } catch (err) {
      const code = b.parentElement.querySelector('code');
      if (code) { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      say('Copying is blocked here. The text is selected, so you can copy it yourself.');
    }
  });

  // ---------- Theme (lamp-on reveal from the button) and the Motion switch ----------
  const meta = $('meta[name="theme-color"]');
  const themeMode = () => { try { return localStorage.getItem('sigship-theme') || 'system'; } catch (e) { return 'system'; } };
  const syncCtl = () => {
    const tm = themeMode(), mo = root.dataset.motion === 'off' ? 'off' : 'on';
    $$('input[name^="theme-"]').forEach((i) => { i.checked = i.value === tm; });
    $$('input[name^="motion-"]').forEach((i) => { i.checked = i.value === mo; });
  };
  const setTheme = (mode, from) => {
    const dark = mode === 'dark' || (mode !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    try { if (mode === 'system') localStorage.removeItem('sigship-theme'); else localStorage.setItem('sigship-theme', mode); } catch (e) { /* private mode */ }
    const flip = () => { root.classList.toggle('dark', dark); meta.content = dark ? '#060b14' : '#edf2f6'; };
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
      try { if (i.value === 'off') localStorage.setItem('sigship-motion', 'off'); else localStorage.removeItem('sigship-motion'); } catch (err) { /* private mode */ }
      onCalmChange(); syncCtl();
    }
  });
  syncCtl();

  // ---------- Menu sheet (native dialog; command/commandfor with a fallback) ----------
  const menu = $('#menu');
  if (!('command' in HTMLButtonElement.prototype)) {
    $$('[commandfor="menu"]').forEach((b) => b.addEventListener('click', () => { if (b.getAttribute('command') === 'close') menu.close(); else if (!menu.open) menu.showModal(); }));
    menu.addEventListener('click', (e) => { if (e.target === menu) menu.close(); });
  }
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) menu.close(); });

  // ---------- C3 · The hoist: read on tap, swing by rotation only when pushed ----------
  const hoist = $('.hoist');
  const flags = $$('button', hoist);
  const lis = flags.map((b) => b.closest('li'));
  const shades = lis.map((li) => $('.shade', li));
  const sheets = flags.map((b) => $('.fl', b));
  const signal = $('#signal');
  const read = (i) => {
    flags.forEach((b, j) => { b.setAttribute('aria-pressed', String(j === i)); b.tabIndex = j === i ? 0 : -1; lis[j].classList.toggle('reading', j === i); });
    const b = flags[i];
    signal.innerHTML = `<b>${b.dataset.l} · ${b.dataset.p.toUpperCase()}:</b> ${b.dataset.meaning}.`;
  };
  const S = flags.map(() => ({ a: 0, v: 0, hold: null, lastKick: 0, lastMove: 0 }));
  const K = 42, C = 4.2, MAX = 11; // about one swing a second; still again within about 3.6 s
  let raf = 0, last = 0, drag = null, suppressClick = false, rects = [], hoistSeen = true, flagH = 0;
  const measureFlags = () => { rects = flags.map((b) => b.getBoundingClientRect()); flagH = sheets[0] ? sheets[0].getBoundingClientRect().height : 0; };
  const draw = (i) => {
    const a = S[i].a;
    sheets[i].style.rotate = a === 0 ? '' : `${a.toFixed(3)}deg`;
    shades[i].style.translate = a === 0 ? '' : `${(-Math.sin(a * Math.PI / 180) * flagH * 0.55).toFixed(2)}px 0`;
  };
  const tick = (now) => {
    const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
    last = now;
    let busy = false;
    S.forEach((s, i) => {
      const steps = 4, h = dt / steps;
      for (let n = 0; n < steps; n++) {
        const acc = s.hold != null ? -(s.a - s.hold) * 700 - s.v * 2 * Math.sqrt(700) : -s.a * K - s.v * C;
        s.v += acc * h; s.a += s.v * h;
      }
      if (s.a > MAX) { s.a = MAX; s.v = Math.min(0, s.v); } else if (s.a < -MAX) { s.a = -MAX; s.v = Math.max(0, s.v); }
      if (s.hold == null && Math.abs(s.a) < 0.02 && Math.abs(s.v) < 0.05) { s.a = 0; s.v = 0; } else busy = true;
      draw(i);
    });
    raf = busy ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => { if (calm() || document.hidden) return; if (!flagH) measureFlags(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const kick = (i, dv) => { if (calm() || !S[i]) return; S[i].v = Math.max(-260, Math.min(260, S[i].v + dv)); wake(); };
  const stillFlags = () => { cancelAnimationFrame(raf); raf = 0; drag = null; S.forEach((s, i) => { s.a = 0; s.v = 0; s.hold = null; draw(i); }); };
  const indexAt = (x) => rects.findIndex((r) => x >= r.left - 4 && x <= r.right + 4);
  flags.forEach((b, i) => {
    b.addEventListener('click', (e) => { if (suppressClick) { e.preventDefault(); suppressClick = false; return; } read(i); kick(i, -20); });
    b.addEventListener('focus', () => read(i));
    b.addEventListener('mouseenter', () => { if (!drag) { const x = flags[i]; signal.innerHTML = `<b>${x.dataset.l} · ${x.dataset.p.toUpperCase()}:</b> ${x.dataset.meaning}.`; } });
  });
  hoist.addEventListener('keydown', (e) => {
    const i = flags.indexOf(document.activeElement);
    if (i < 0) return;
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: flags.length - 1 }[e.key];
    if (to == null) return;
    e.preventDefault();
    const j = (to + flags.length) % flags.length;
    flags[j].focus();
  });
  hoist.addEventListener('pointerdown', (e) => {
    if (calm()) return;
    const b = e.target.closest('button'); if (!b) return;
    measureFlags();
    const i = flags.indexOf(b);
    drag = { i, id: e.pointerId, x0: e.clientX, lastX: e.clientX, lastT: e.timeStamp, vx: 0, moved: false, crossed: new Set([i]) };
    b.setPointerCapture(e.pointerId);
  });
  hoist.addEventListener('pointermove', (e) => {
    if (calm()) return;
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x0, dt = Math.max(1, e.timeStamp - drag.lastT);
      drag.vx = 0.7 * drag.vx + 0.3 * ((e.clientX - drag.lastX) / dt) * 1000; drag.lastX = e.clientX; drag.lastT = e.timeStamp;
      if (!drag.moved && Math.abs(dx) > 6) drag.moved = true;
      if (drag.moved) {
        S[drag.i].hold = -MAX * Math.tanh((dx * 0.32) / MAX); wake();
        const j = indexAt(e.clientX);
        if (j >= 0 && !drag.crossed.has(j)) { drag.crossed.add(j); kick(j, -Math.max(-1, Math.min(1, drag.vx / 900)) * 120); }
      }
      return;
    }
    if (e.pointerType !== 'mouse' || e.buttons) return;
    if (!rects.length) measureFlags();
    const j = indexAt(e.clientX); if (j < 0) return;
    const s = S[j];
    const vx = (e.movementX / Math.max(1, e.timeStamp - (s.lastMove || e.timeStamp - 16))) * 1000; s.lastMove = e.timeStamp;
    if (Math.abs(vx) > 350 && e.timeStamp - s.lastKick > 140) { s.lastKick = e.timeStamp; kick(j, -Math.sign(vx) * Math.min(90, Math.abs(vx) * 0.06)); }
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const s = S[drag.i];
    if (drag.moved) { s.hold = null; s.v += -Math.max(-1, Math.min(1, drag.vx / 900)) * 160; suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); wake(); }
    drag = null;
  };
  hoist.addEventListener('pointerup', endDrag);
  hoist.addEventListener('pointercancel', endDrag);
  addEventListener('resize', () => { rects = []; flagH = 0; }, { passive: true });
  new IntersectionObserver(([en]) => { hoistSeen = en.isIntersecting; }, { rootMargin: '-64px 0px 0px 0px' }).observe(hoist);
  const gust = () => { if (calm() || !hoistSeen || document.hidden) return; flags.forEach((_, i) => setTimeout(() => kick(i, -36), i * 70)); };
  window.__flags = { S, kick };

  // ---------- Stage lamps under the flags, the docked header, the install pill ----------
  const bays = $$('.bay .lamp'), minis = $$('.mini i'), navLinks = $$('.nav a');
  const stageIds = ['start', 'how', 'checks', 'limits', 'where', 'pricing', 'why'];
  const setStage = (n) => {
    bays.forEach((l, i) => l.classList.toggle('off', i > n));
    minis.forEach((m, i) => m.classList.toggle('on', i <= n));
    navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${stageIds[n]}`)));
  };
  const stageIO = new IntersectionObserver((ens) => { for (const en of ens) if (en.isIntersecting) setStage(Number(en.target.dataset.stage)); }, { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-stage]').forEach((s) => stageIO.observe(s));
  const mast = $('.mast');
  new IntersectionObserver(([en]) => mast.classList.toggle('docked', !en.isIntersecting), { rootMargin: '-64px 0px 0px 0px' }).observe($('.hoist-wrap'));
  new IntersectionObserver(([en]) => mast.classList.toggle('pad-on', en.isIntersecting)).observe($('#pad'));

  // ---------- Launch pad tabs ----------
  const padTabs = $$('.pad-tabs [role="tab"]'), padCode = $('.pad-row code'), padCopy = $('[data-pad-copy]');
  const pickTab = (t) => {
    padTabs.forEach((x) => { x.setAttribute('aria-selected', String(x === t)); x.tabIndex = x === t ? 0 : -1; });
    const agent = t.hasAttribute('data-agent');
    padCode.className = agent ? 'long' : '';
    padCode.innerHTML = `${agent ? '' : '<span class="p">$</span> '}${t.dataset.cmd.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}`;
    padCopy.dataset.copy = t.dataset.cmd;
    padCopy.dataset.copyLabel = agent ? 'the prompt for your coding agent' : t.dataset.cmd;
  };
  padTabs.forEach((t, i) => {
    t.addEventListener('click', () => pickTab(t));
    t.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return; e.preventDefault(); const n = padTabs[(i + d + padTabs.length) % padTabs.length]; n.focus(); pickTab(n); });
  });

  // ---------- The run console: one clock for the whole run (C6, C8, C10) ----------
  const con = $('#console'), clip = $('.con-clip', con), grid = $('.con-grid', con), beam = $('.beam', con);
  const out = $('.con-out', con), raw = $('.con-raw', con), r2 = $('.con-r2', con), raw2 = $('.raw2', con);
  const rows = $$('.con-rows li', con);
  const lineEls = $$('[data-at]', con);
  lineEls.forEach((el) => { el._t = T[el.dataset.at]; });
  const placard = $('.placard', con), word = $('.word', con), neg = $('.word .neg', con), strike = $('.word .neg .x', con), pend = $('.pend', con), bloom = $('.bloom', con), halo = $('.halo', con), exitEl = $('[data-exit]', con);
  const tv = { files: $('[data-tel="files"]', con), time: $('[data-tel="time"]', con), checks: $('[data-tel="checks"]', con), blockers: $('[data-tel="blockers"]', con) };
  const hold = $('.hold', con), runLabel = $('[data-runlabel]', con);
  const range = $('.rec-track input', con), ticksEl = $('.rec-ticks', con), evtEl = $('[data-evt]', con), clockEl = $('[data-clock]', con);
  const pilot = $('.pilot', con), mastlamp = $('.mastlamp'), mastLampEl = $('.mastlamp .lamp'), chip = $('.chip'), chipLamp = $('.chip .lamp'), chipText = $('[data-chip]');
  const CHIP = { off: '–', nogo: `NO-GO · ${D.r1.block} to fix`, go: 'GO <svg class="g dag" aria-hidden="true"><use href="#g-dagger"/></svg>' };
  let unlocked = false, t = T.r1, anims = [], playRaf = 0, playTo = null, playDone = null, detent = false, clockMode = 'slow', Y0 = 0, Y1 = 1;
  const TOTAL = T.r2;
  const max = () => (unlocked ? T.r2 : T.r1);

  const offTop = (el) => { let y = 0, n = el; while (n && n !== clip) { y += n.offsetTop; n = n.offsetParent; } return y; };
  // The beam front moves linearly from the meta line to the bottom of the rows; each row lands as the front reaches it.
  const measure = () => {
    if (out.hidden) return;
    const metaEl = $('.c-meta', con), rowsEl = $('.con-rows', con);
    Y0 = offTop(metaEl); Y1 = offTop(rowsEl) + rowsEl.offsetHeight;
    rows.forEach((li) => { const y = offTop(li) + 14; li._t = Math.round(T.beam0 + (T.beam1 - T.beam0) * Math.min(1, Math.max(0, (y - Y0) / (Y1 - Y0)))); });
  };
  const marks = () => {
    const m = [{ t: 0, label: D.labels.ready, kind: '' }, { t: T.enter, label: '$ npx sigship', kind: '' }, { t: T.sum, label: D.labels.sum1, kind: '' }, { t: T.meta, label: D.labels.meta1, kind: '' }];
    rows.forEach((li) => m.push({ t: li._t, label: li.dataset.label, kind: li.classList.contains('s2') ? 's2' : 's1' }));
    m.push({ t: T.vline, label: D.labels.v1, kind: 's1 v' });
    if (unlocked) m.push({ t: T.c2, label: D.labels.c2, kind: '', run2: true }, { t: T.cmd2, label: '$ npx sigship', kind: '', run2: true }, { t: T.sum2, label: D.labels.sum2, kind: '', run2: true }, { t: T.go2, label: D.labels.go2, kind: '', run2: true }, { t: T.r2, label: D.labels.goInst, kind: 'v', run2: true });
    return m.sort((a, b) => a.t - b.t);
  };
  const lastMark = (time) => marks().filter((m) => m.t <= time + 0.5).pop();
  const escT = (x) => String(x).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  // All labels are rendered once, stacked; setT only switches which one is visible.
  let evtSpans = [], clockSpans = {};
  const drawLabels = () => {
    const labels = [...new Set(marks().map((m) => m.label))];
    evtEl.innerHTML = labels.map((l) => `<span>${escT(l)}</span>`).join('');
    evtSpans = [...evtEl.children].map((el, i) => ({ el, label: labels[i] }));
    clockEl.innerHTML = ['clock1', 'clock2', 'clockReal'].map((k) => `<span data-k="${k}">${escT(D[k])}</span>`).join('');
    clockSpans = Object.fromEntries([...clockEl.children].map((el) => [el.dataset.k, el]));
  };
  const drawTicks = () => {
    drawLabels();
    range.max = String(max());
    ticksEl.innerHTML = marks().map((m) => `<i class="${m.kind}" style="left:${(m.t / max()) * 100}%"></i>`).join('') + (unlocked ? `<b style="left:${(((T.r1 + T.r2s) / 2) / max()) * 100}%"></b>` : '');
  };
  const setHTML = (el, html) => { if (el._h !== html) { el._h = html; el.innerHTML = html; } };
  const setT = (time) => {
    t = Math.max(0, Math.min(max(), time));
    for (const a of anims) a.currentTime = t;
    const inR2 = unlocked && t >= T.r2s;
    r2.hidden = !inR2; raw2.hidden = !inR2;
    for (const el of lineEls) el.classList.toggle('unprinted', t < el._t);
    for (const li of rows) li.classList.toggle('unprinted', t < li._t);
    const verdict = t < T.lamp ? 'off' : unlocked && t >= T.green ? 'go' : 'nogo';
    if (root.dataset.verdict !== verdict) root.dataset.verdict = verdict;
    const r1Sum = t >= T.sum, swapped = unlocked && t >= T.swap;
    setHTML(tv.files, r1Sum ? String(D.r1.files) : '–');
    setHTML(tv.checks, r1Sum ? String(D.r1.checks) : '–');
    setHTML(tv.time, unlocked && t >= T.sum2 ? `${D.r2.ms}<small>ms</small>` : r1Sum ? `${D.r1.ms}<small>ms</small>` : '–');
    const bl = swapped ? D.r2.block : t >= T.lamp ? D.r1.block : '–';
    setHTML(tv.blockers, String(bl));
    hold.classList.toggle('zero', bl === 0);
    for (const el of Object.values(tv)) el.classList.toggle('dash', el._h === '–');
    setHTML(exitEl, swapped ? '0' : t >= T.lamp ? '1' : '–');
    setHTML(runLabel, inR2 ? 'run 2' : 'run 1');
    placard.setAttribute('aria-label', verdict === 'go' ? D.ariaGo : verdict === 'nogo' ? 'Verdict: NO-GO, exit 1' : 'Verdict pending: no reading yet');
    setHTML(chipText, unlocked && t >= T.chipAt + 110 ? CHIP.go : t >= T.lamp ? CHIP.nogo : CHIP.off);
    range.value = String(Math.round(t));
    range.style.setProperty('--fill', `${(t / max()) * 100}%`);
    const m = lastMark(t);
    const lab = m ? m.label : D.labels.ready;
    for (const x of evtSpans) x.el.classList.toggle('on', x.label === lab);
    range.setAttribute('aria-valuetext', `${inR2 ? 'Run 2' : 'Run 1'}: ${lab}`);
    const ck = clockMode === 'real' ? 'clockReal' : inR2 ? 'clock2' : 'clock1';
    for (const [k, el] of Object.entries(clockSpans)) el.classList.toggle('on', k === ck);
  };

  // Tracks: one paused animation per element and property, spanning the whole timeline, so the clock (t) drives everything.
  const tr = (el, frames) => {
    if (!el) return;
    const kf = frames.map(([time, props, easing]) => Object.assign({ offset: Math.min(1, Math.max(0, time / TOTAL)) }, props, easing ? { easing } : {}));
    if (kf[0].offset > 0) kf.unshift(Object.assign({}, kf[0], { offset: 0 }));
    if (kf[kf.length - 1].offset < 1) { const l = Object.assign({}, kf[kf.length - 1], { offset: 1 }); delete l.easing; kf.push(l); }
    const a = el.animate(kf, { duration: TOTAL, fill: 'both' });
    a.pause(); a.currentTime = t; anims.push(a);
  };
  const rise = (el, at, dur) => tr(el, [[0, { opacity: 0, transform: 'translateY(6px)' }], [at, { opacity: 0, transform: 'translateY(6px)' }, E.out], [at + dur, { opacity: 1, transform: 'translateY(0px)' }]]);
  const refresh = (el, times) => { const f = [[0, { opacity: 1 }]]; times.forEach((x) => f.push([x - 50, { opacity: 1 }, E.lin], [x, { opacity: 0.12 }, E.lin], [x + 110, { opacity: 1 }])); tr(el, f); };
  const tok = (n) => getComputedStyle(root).getPropertyValue(n).trim();
  const build = () => {
    anims.forEach((a) => a.cancel());
    anims = [];
    measure();
    drawTicks();
    if (calm()) { setT(t); return; }
    const RED = tok('--red'), GREEN = tok('--green'), LRED = tok('--lamp-red'), LGREEN = tok('--lamp-green'), OFF = '#22324a';
    tr($('.typed', con), [[0, { clipPath: 'inset(0 100% 0 0)' }, 'steps(11, end)'], [T.enter, { clipPath: 'inset(0 0% 0 0)' }]]);
    tr($('.typed', con), [[0, { opacity: 1 }]]);
    rise($('.c-sum', con), T.sum, 200);
    rise($('.c-meta', con), T.meta, 200);
    const H = beam.offsetHeight;
    tr(beam, [[0, { transform: `translateY(${Y0 - H}px)` }], [T.beam0, { transform: `translateY(${Y0 - H}px)` }, E.lin], [T.beam1, { transform: `translateY(${Y1 - H}px)` }]]);
    tr(beam, [[0, { opacity: 0 }], [T.beam0, { opacity: 0 }, E.lin], [T.beam0 + 60, { opacity: 1 }], [T.beam1 - 90, { opacity: 1 }, E.lin], [T.beam1, { opacity: 0 }]]);
    rows.forEach((li) => {
      const at = li._t;
      tr(li, [[0, { opacity: 0, transform: 'translateY(6px)' }], [at, { opacity: 0, transform: 'translateY(6px)' }, E.out], [at + 260, { opacity: 1, transform: 'translateY(0px)' }], [T.m0, { opacity: 1, transform: 'translateY(0px)' }, E.lin], [T.m0 + 160, { opacity: 0.38, transform: 'translateY(0px)' }]]);
      tr($('.lamp', li), [[0, { '--lit': 0 }], [at, { '--lit': 0 }, E.lin], [at + 200, { '--lit': 1 }], [T.m0, { '--lit': 1 }, E.lin], [T.m0 + 160, { '--lit': 0 }]]);
      tr($('b', li), [[0, { textDecorationColor: 'rgb(255 255 255 / 0)' }], [T.m0, { textDecorationColor: 'rgb(255 255 255 / 0)' }, E.out], [T.m0 + 160, { textDecorationColor: 'rgb(255 255 255 / 0.85)' }]]);
    });
    tr($('.c-v', con), [[0, { opacity: 0, transform: 'translateY(6px)' }], [T.vline, { opacity: 0, transform: 'translateY(6px)' }, E.out], [T.vline + 200, { opacity: 1, transform: 'translateY(0px)' }], [T.m0, { opacity: 1, transform: 'translateY(0px)' }, E.lin], [T.m0 + 160, { opacity: 0.5, transform: 'translateY(0px)' }]]);
    // The verdict: dark glass until the verdict line prints, then red with one halo. GO only after run 2 has printed GO with its caveat.
    // A signal lamp switches like a real one: the red emitter goes out, then the green one comes on. No amber in between.
    const OUT = 110, ON = 300, B = root.classList.contains('dark') ? 1 : 0.7;
    const sw = (at) => [[at, { '--lamp': LRED }, 'steps(1, end)'], [at + 1, { '--lamp': LGREEN }]];
    tr(con, [[0, { '--face': OFF }], [T.lamp, { '--face': OFF }, E.lin], [T.lamp + 120, { '--face': RED }], [T.green, { '--face': RED }, E.io], [T.green + OUT, { '--face': OFF }, E.out], [T.green + ON, { '--face': GREEN }]]);
    tr(con, [[0, { '--lamp': LRED }], ...sw(T.green + OUT)]);
    tr(placard, [[0, { color: '#93a4b6' }], [T.lamp, { color: '#93a4b6' }, E.lin], [T.lamp + 120, { color: '#ffffff' }], [T.green, { color: '#ffffff' }, E.io], [T.green + OUT, { color: '#93a4b6' }, E.out], [T.green + ON, { color: '#0e1b2c' }]]);
    tr(pend, [[0, { opacity: 1 }], [T.lamp, { opacity: 1 }, E.lin], [T.lamp + 80, { opacity: 0 }]]);
    tr(word, [[0, { opacity: 0 }], [T.lamp, { opacity: 0 }, E.lin], [T.lamp + 120, { opacity: 1 }]]);
    tr(bloom, [[0, { opacity: 0 }], [T.lamp, { opacity: 0 }, E.out], [T.lamp + 220, { opacity: B }], [T.green, { opacity: B }, E.io], [T.green + OUT, { opacity: 0 }, E.out], [T.green + ON, { opacity: B }]]);
    tr(halo, [[0, { opacity: 0, transform: 'scale(1)' }], [T.lamp, { opacity: 0, transform: 'scale(1)' }], [T.lamp, { opacity: 0.75, transform: 'scale(1)' }, E.out], [T.lamp + 420, { opacity: 0, transform: 'scale(1.32, 1.6)' }]]);
    tr(pilot, [[0, { '--lit': 0 }], [T.lamp, { '--lit': 0 }, E.lin], [T.lamp + 120, { '--lit': 1 }], [T.green, { '--lit': 1 }, E.io], [T.green + OUT, { '--lit': 0 }, E.out], [T.green + ON, { '--lit': 1 }]]);
    tr(mastLampEl, [[0, { '--lit': 0 }], [T.lamp + 60, { '--lit': 0 }, E.lin], [T.lamp + 180, { '--lit': 1 }], [T.mastAt, { '--lit': 1 }, E.io], [T.mastAt + OUT, { '--lit': 0 }, E.out], [T.mastAt + ON, { '--lit': 1 }]]);
    tr(mastlamp, [[0, { '--lamp': LRED }], ...sw(T.mastAt + OUT)]);
    tr(chipLamp, [[0, { '--lit': 0 }], [T.lamp + 120, { '--lit': 0 }, E.lin], [T.lamp + 240, { '--lit': 1 }], [T.chipAt, { '--lit': 1 }, E.io], [T.chipAt + OUT, { '--lit': 0 }, E.out], [T.chipAt + ON, { '--lit': 1 }]]);
    tr(chip, [[0, { '--lamp': LRED }], ...sw(T.chipAt + OUT)]);
    // NO-GO loses its NO (C8): strike, collapse, widen on the spring. The width axis moves only inside the fixed, contained box.
    tr(strike, [[0, { transform: 'scaleX(0)' }], [T.m0, { transform: 'scaleX(0)' }, E.out], [T.m0 + 160, { transform: 'scaleX(1)' }]]);
    tr(neg, [[0, { maxInlineSize: '1.5em' }], [T.m0 + 160, { maxInlineSize: '1.5em' }, E.io], [T.m0 + 400, { maxInlineSize: '0em' }]]);
    tr(word, [[0, { fontStretch: '62%', fontWeight: '800' }], [T.widen, { fontStretch: '62%', fontWeight: '800' }, E.spring], [T.widen + 520, { fontStretch: '125%', fontWeight: '750' }]]);
    refresh(tv.files.closest('.tel'), [T.sum]);
    refresh(tv.checks.closest('.tel'), [T.sum]);
    refresh(tv.time.closest('.tel'), [T.sum, T.sum2]);
    refresh(tv.blockers.closest('.tel'), [T.lamp, T.swap]);
    refresh(exitEl, [T.lamp, T.swap]);
    rise($('.c-com', con), T.c2, 180);
    rise($('.c-cmd2', con), T.cmd2, 180);
    rise($('.c-sum2', con), T.sum2, 180);
    rise($('.go-block', con), T.go2, 180);
    setT(t);
  };
  const stop = () => { cancelAnimationFrame(playRaf); playRaf = 0; con.removeAttribute('aria-busy'); };
  const play = (from, to, rate, done) => {
    stop();
    playTo = to; playDone = done || null;
    if (calm()) { setT(to); playDone = null; if (done) done(); return; }
    con.setAttribute('aria-busy', 'true');
    const dir = to >= from ? 1 : -1;
    let t0 = null;
    const step = (now) => {
      if (t0 == null) t0 = now;
      const next = from + dir * (now - t0) * rate;
      const fin = dir > 0 ? next >= to : next <= to;
      setT(fin ? to : next);
      if (fin) { stop(); const d = playDone; playDone = null; if (d) d(); } else playRaf = requestAnimationFrame(step);
    };
    setT(from);
    playRaf = requestAnimationFrame(step);
  };
  // Jump to the end if the visitor scrolls away or hides the tab mid-run.
  const finishNow = () => { if (!playRaf) return; const to = playTo, d = playDone; stop(); playDone = null; setT(to); if (d) d(); };
  new IntersectionObserver(([en]) => { if (!en.isIntersecting) finishNow(); }).observe(con);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { finishNow(); stillFlags(); } });

  const runFixed = () => {
    if (!raw.hidden) setRaw(false);
    if (!unlocked) { unlocked = true; drawTicks(); }
    clockMode = 'slow';
    play(T.r2s, T.r2, 1, () => say(D.say2));
    if (!calm()) setTimeout(gust, T.gust - T.r2s);
  };
  const replay = (real) => {
    if (!raw.hidden) setRaw(false);
    clockMode = real ? 'real' : 'slow';
    if (!real) { play(0, T.r1, 1, () => say(D.say1)); return; }
    const rate = (T.vline - T.enter) / D.r1.ms;
    play(T.enter, T.r1, rate, () => { if (unlocked) play(T.r2s, T.r2, rate, () => say(D.say2)); else say(D.say1); });
  };
  $('[data-next-run]', con).addEventListener('click', runFixed);
  $$('[data-replay]', con).forEach((b) => b.addEventListener('click', () => replay(b.dataset.replay === 'real')));
  // Scrub: the visitor's thumb is the clock. Under reduced motion it snaps to printed lines.
  range.addEventListener('input', () => {
    if (detent) { range.value = String(Math.round(t)); return; }
    stop(); clockMode = 'slow';
    let v = Number(range.value);
    if (calm()) { v = marks().reduce((a, m) => (Math.abs(m.t - v) < Math.abs(a - v) ? m.t : a), 0); setT(v); return; }
    // Over-centre detent: run 2's instrument update is one switch. Inside it, the change plays out in the direction of travel.
    if (unlocked && v > T.m0 && v < T.m1) {
      const target = t <= T.m0 ? T.m1 : t >= T.m1 ? T.m0 : v > (T.m0 + T.m1) / 2 ? T.m1 : T.m0;
      detent = true;
      play(t, target, 1.4, () => { detent = false; });
      return;
    }
    if (unlocked && v > T.r1 && v < T.r2s) v = t <= T.r1 ? T.r2s : T.r1;
    setT(v);
  });
  const jump = (dir) => {
    const ms = marks().map((m) => m.t);
    const target = dir > 0 ? ms.find((x) => x > t + 1) : [...ms].reverse().find((x) => x < t - 1);
    if (target == null) return;
    clockMode = 'slow';
    if (dir > 0 && !calm() && target - t < 1400) play(t, target, 1); else { stop(); setT(target); }
  };
  range.addEventListener('keydown', (e) => {
    const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (k) { e.preventDefault(); jump(k); }
    else if (e.key === 'Home') { e.preventDefault(); stop(); setT(0); }
    else if (e.key === 'End') { e.preventDefault(); stop(); setT(max()); }
    else if (e.key === ' ' || e.key === 'k' || e.key === 'K') { e.preventDefault(); if (playRaf) stop(); else play(t >= max() ? 0 : t, max(), 1); }
  });
  $('[data-prev]', con).addEventListener('click', () => jump(-1));
  $('[data-nextevt]', con).addEventListener('click', () => jump(1));
  $('[data-run-again]').addEventListener('click', () => {
    con.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'center' });
    const go = () => { removeEventListener('scrollend', go); clearTimeout(tm); runFixed(); };
    const tm = setTimeout(go, calm() ? 0 : 900);
    if (!calm()) addEventListener('scrollend', go, { once: true });
  });

  // ---------- C11 · Raw output: the readable rows fold into the exact text, line by line ----------
  const rawBtn = $('[data-raw]', con);
  const named = (scope) => $$('[data-vt]', scope).filter((el) => el.offsetParent !== null || el.getClientRects().length);
  const setRaw = (on, animate) => {
    finishNow();
    let ran = false;
    const update = () => {
      if (ran) return; ran = true;
      named(on ? out : raw).forEach((el) => { el.style.viewTransitionName = ''; });
      out.hidden = on; raw.hidden = !on;
      rawBtn.setAttribute('aria-pressed', String(on));
      if (animate) named(on ? raw : out).forEach((el) => { el.style.viewTransitionName = el.dataset.vt; });
    };
    const clear = () => { $$('[data-vt]', con).forEach((el) => { el.style.viewTransitionName = ''; }); if (!on) build(); };
    if (!animate || calm()) { update(); clear(); return; }
    named(on ? out : raw).forEach((el) => { el.style.viewTransitionName = el.dataset.vt; });
    let vt = null;
    try {
      if (typeof con.startViewTransition === 'function') vt = con.startViewTransition(update);
      else if (document.startViewTransition) { root.classList.add('vt-raw'); vt = document.startViewTransition(update); }
    } catch (e) { vt = null; }
    if (!vt) { update(); clear(); return; }
    vt.updateCallbackDone.catch(update);
    setTimeout(update, 600); // the swap always happens, even if the callback never runs
    vt.finished.catch(() => {}).finally(() => { root.classList.remove('vt-raw'); clear(); });
  };
  rawBtn.addEventListener('click', () => setRaw(rawBtn.getAttribute('aria-pressed') !== 'true', true));

  // ---------- C12 · Inspect cards: filled from their template the first time they open ----------
  document.addEventListener('beforetoggle', (e) => {
    const p = e.target;
    if (e.newState !== 'open' || !p.matches || !p.matches('[popover][data-tpl]') || p.dataset.filled) return;
    p.replaceChildren($(`#${p.dataset.tpl}`).content.cloneNode(true));
    p.dataset.filled = '1';
  }, true);
  document.addEventListener('click', (e) => { const a = e.target.closest('[data-close]'); if (!a) return; const p = a.closest('[popover]'); if (p) p.hidePopover(); });

  // ---------- Fix plates: Before / After, pressed by the visitor ----------
  $$('.plate').forEach((plate) => {
    const tabs = $$('[role="tab"]', plate);
    const pick = (tab, focus) => {
      tabs.forEach((x) => { const on = x === tab; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; $(`#${x.getAttribute('aria-controls')}`).hidden = !on; });
      plate.dataset.state = tab.id.endsWith('-a') ? 'after' : 'before';
      const panel = $(`#${tab.getAttribute('aria-controls')}`);
      if (!calm() && plate.dataset.state === 'after') panel.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { duration: 380, easing: E.io });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => pick(tab));
      tab.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return; e.preventDefault(); pick(tabs[(i + d + tabs.length) % tabs.length], true); });
    });
  });

  // ---------- Plans: track tabs, waitlist preselect, and the warm 'received' lamp ----------
  const tTabs = $$('.track-tabs [role="tab"]');
  const pickTrack = (tab) => tTabs.forEach((x) => { const on = x === tab; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; $(`#${x.getAttribute('aria-controls')}`).hidden = !on; });
  tTabs.forEach((tab, i) => { tab.addEventListener('click', () => pickTrack(tab)); tab.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return; e.preventDefault(); const n = tTabs[(i + d + tTabs.length) % tTabs.length]; n.focus(); pickTrack(n); }); });
  $$('[data-plan]').forEach((b) => b.addEventListener('click', () => { const r = $(`input[name="plan"][value="${b.dataset.plan}"]`); if (r) r.checked = true; const em = $('#wl-email'); em.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'center' }); em.focus({ preventScroll: true }); }));
  const form = $('#waitlist'), err = $('#wl-err'), ok = $('#wl-ok');
  const started = form.querySelector('[name="started"]');
  started.value = String(Date.now());
  const showErr = (text) => { err.textContent = text; err.hidden = false; };
  const done = () => { form.hidden = true; ok.hidden = false; ok.focus(); say('All aboard. We will email you once, when your plan opens.'); };
  if (new URLSearchParams(location.search).get('waitlist') === 'ok') done();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const em = $('#wl-email');
    if (!em.value || !em.checkValidity()) { showErr('Enter an email address, like you@example.com.'); em.setAttribute('aria-invalid', 'true'); em.focus(); return; }
    err.hidden = true; em.removeAttribute('aria-invalid');
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) done();
      else showErr(body.error || 'That did not go through. Try again in a minute.');
    } catch {
      showErr('Could not reach SIGSHIP. Check your connection and try again.');
    } finally {
      button.disabled = false;
    }
  });

  // ---------- Motion switch: detach everything that moves, show the still state ----------
  // Switching Motion off mid-run finishes the run (its still state is the finished NO-GO), then detaches every animation.
  function onCalmChange() { finishNow(); stillFlags(); detent = false; if (calm() && !unlocked && t < T.r1) t = T.r1; build(); }
  mqReduce.addEventListener('change', onCalmChange);

  // ---------- First arrival: play run 1 once at 35% visibility, only while the tab is visible ----------
  const wakeOnce = () => {
    let woke = false;
    try { woke = sessionStorage.getItem('sigship-woke') === '1'; sessionStorage.setItem('sigship-woke', '1'); } catch (e) { /* storage blocked */ }
    if (!woke && !calm()) grid.animate([{ clipPath: 'inset(0 0 100% 0)', opacity: 0.25 }, { clipPath: 'inset(0 0 0% 0)', opacity: 1 }], { duration: 460, easing: E.out });
  };
  const pending = root.classList.contains('run-pending') && !calm();
  t = pending ? 0 : T.r1;
  build();
  root.classList.remove('run-pending');
  if (pending) {
    // If the visitor lands below the console (a deep link) or scrolls past it before it plays, it shows the finished NO-GO: no reading is skipped silently.
    let started = false, seen = 0;
    const start = () => { if (started) return; started = true; io.disconnect(); wakeOnce(); clockMode = 'slow'; play(0, T.r1, 1, () => say(D.say1)); };
    const io = new IntersectionObserver(([en]) => {
      seen = en.isIntersecting ? en.intersectionRatio : 0;
      if (seen >= 0.35 && document.visibilityState === 'visible') start();
      else if (!en.isIntersecting && en.boundingClientRect.bottom <= 0 && !started) { started = true; io.disconnect(); setT(T.r1); }
    }, { threshold: [0, 0.35] });
    io.observe(con);
    // A tab opened in the background starts the run when it is first shown, not before.
    document.addEventListener('visibilitychange', () => { if (!document.hidden && seen >= 0.35) start(); });
  }
  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!playRaf) build(); }, 150); }, { passive: true });
  document.fonts && document.fonts.ready.then(() => { if (!playRaf) build(); });
  window.__rec = { setT, play, runFixed, replay, build, get t() { return t; }, get anims() { return anims; }, T, marks, setRaw };
})();
