// Shared behaviour for every page: the theme toggle, the waitlist form and the small moving parts.
// Nothing here loads anything from another site, and every effect stops when reduced motion is on.
(() => {
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: () => {
      try {
        return localStorage.getItem('sigship-theme');
      } catch {
        return null;
      }
    },
    set: (value) => {
      try {
        localStorage.setItem('sigship-theme', value);
      } catch {
        // Private windows can block storage. The toggle still works for this visit.
      }
    },
  };

  // Theme toggle. It follows the device until someone picks a side.
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const label = () => {
    const isDark = root.classList.contains('dark');
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  };
  const apply = (isDark) => {
    root.classList.toggle('dark', isDark);
    label();
  };
  for (const button of document.querySelectorAll('[data-theme-toggle]')) {
    button.addEventListener('click', () => {
      const next = !root.classList.contains('dark');
      store.set(next ? 'dark' : 'light');
      apply(next);
    });
  }
  dark.addEventListener('change', (e) => {
    if (!store.get()) apply(e.matches);
  });
  label();

  // The header gets a shadow once the page scrolls.
  const mast = document.querySelector('.mast');
  if (mast) {
    const onScroll = () => mast.classList.toggle('scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Sections slide in as they arrive. Without JavaScript, or with reduced motion, they are simply there.
  const reveal = document.querySelectorAll('[data-reveal]');
  if (!calm && 'IntersectionObserver' in window && reveal.length) {
    root.classList.add('reveal-ready');
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('in');
          seen.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    reveal.forEach((el, i) => {
      el.style.setProperty('--stagger', `${(i % 4) * 70}ms`);
      seen.observe(el);
    });
  }

  // The terminal prints its lines one by one the first time it scrolls into view.
  const term = document.getElementById('run-before');
  if (term && !calm && 'IntersectionObserver' in window) {
    const code = term.querySelector('code');
    code.innerHTML = code.innerHTML
      .split('\n')
      .map((line, i) => `<span class="line" style="--d:${i * 45}ms">${line || ' '}</span>`)
      .join('\n');
    term.classList.add('typing');
    const watch = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      term.classList.add('play');
      watch.disconnect();
    }, { threshold: 0.25 });
    watch.observe(term);
  }

  // Cards light up under the pointer.
  if (!calm && matchMedia('(hover: hover)').matches) {
    for (const card of document.querySelectorAll('.plan, .sevs li a, .steps li, .wl-form')) {
      card.addEventListener('pointermove', (e) => {
        const box = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - box.left}px`);
        card.style.setProperty('--my', `${e.clientY - box.top}px`);
      });
    }
  }

  // Hero particles: signal-coloured points drifting and linking up, nudged by the pointer.
  // Drawn on one canvas, paused when off screen or in a hidden tab, and skipped entirely under reduced motion.
  const canvas = document.querySelector('.particles');
  if (canvas && !calm) {
    const ctx = canvas.getContext('2d');
    const css = getComputedStyle(root);
    const palette = () => {
      const pick = (name) => getComputedStyle(root).getPropertyValue(name).trim() || css.getPropertyValue(name).trim();
      return [pick('--blue'), pick('--yellow'), pick('--red'), root.classList.contains('dark') ? '#7fb0ff' : pick('--slate')];
    };
    let colors = palette();
    let dots = [];
    let w = 0;
    let h = 0;
    let running = false;
    let frame = 0;
    const pointer = { x: -9999, y: -9999 };
    const size = () => {
      const box = canvas.parentElement.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 2);
      w = box.width;
      h = box.height;
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(Math.min(120, (w * h) / 9500));
      dots = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.8,
        c: i % 4,
      }));
    };
    const step = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      const isDark = root.classList.contains('dark');
      for (const d of dots) {
        const dx = d.x - pointer.x;
        const dy = d.y - pointer.y;
        const near = dx * dx + dy * dy;
        if (near < 14000) {
          d.vx += (dx / Math.sqrt(near || 1)) * 0.06;
          d.vy += (dy / Math.sqrt(near || 1)) * 0.06;
        }
        d.vx *= 0.985;
        d.vy *= 0.985;
        d.vx += (Math.random() - 0.5) * 0.02;
        d.vy += (Math.random() - 0.5) * 0.02;
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -10) d.x = w + 10;
        if (d.x > w + 10) d.x = -10;
        if (d.y < -10) d.y = h + 10;
        if (d.y > h + 10) d.y = -10;
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i];
          const b = dots[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > 120) continue;
          ctx.globalAlpha = (1 - dist / 120) * (isDark ? 0.35 : 0.22);
          ctx.strokeStyle = colors[0];
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      for (const d of dots) {
        ctx.globalAlpha = isDark ? 0.9 : 0.7;
        ctx.fillStyle = colors[d.c];
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(step);
    };
    const start = () => {
      if (running || document.hidden) return;
      running = true;
      frame = requestAnimationFrame(step);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };
    size();
    addEventListener('resize', () => size(), { passive: true });
    canvas.parentElement.addEventListener('pointermove', (e) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
    });
    canvas.parentElement.addEventListener('pointerleave', () => {
      pointer.x = -9999;
      pointer.y = -9999;
    });
    new MutationObserver(() => (colors = palette())).observe(root, { attributes: true, attributeFilter: ['class'] });
    new IntersectionObserver((entries) => (entries[0].isIntersecting ? start() : stop())).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  // Scan demo: a beam reads each file, problems light up, the verdict lands, then the fixes turn it GO. It loops while visible.
  const scanBox = document.querySelector('[data-scan]');
  if (scanBox) {
    const rows = [...scanBox.querySelectorAll('li')];
    const phase = scanBox.querySelector('[data-phase]');
    const filesOut = scanBox.querySelector('[data-files]');
    const foundOut = scanBox.querySelector('[data-found]');
    const verdict = scanBox.querySelector('[data-verdict]');
    const blockers = rows.filter((r) => r.dataset.sev === '1' || r.dataset.sev === '2');
    const setVerdict = (state, title, note) => {
      verdict.dataset.state = state;
      verdict.innerHTML = `<b>${title}</b><small>${note}</small>`;
    };
    const flag = (row) => {
      const sev = row.dataset.sev;
      row.classList.add(sev ? `hit${sev}` : 'ok');
      row.querySelector('b').innerHTML = sev ? `<i>SEV-${sev}</i> <span>${row.dataset.title}</span>` : 'OK';
    };
    const finalState = () => {
      rows.forEach(flag);
      filesOut.textContent = rows.length;
      foundOut.textContent = blockers.length;
      phase.textContent = 'Done';
      setVerdict('no', 'NO-GO', 'Exit 1. Your fix list is ready.');
    };

    if (calm || !('IntersectionObserver' in window)) {
      finalState();
    } else {
      let timers = [];
      let visible = false;
      const later = (fn, ms) => timers.push(setTimeout(fn, ms));
      const reset = () => {
        timers.forEach(clearTimeout);
        timers = [];
        scanBox.classList.remove('scanning', 'fixing');
        rows.forEach((r) => {
          r.className = '';
          r.querySelector('b').textContent = '';
        });
        filesOut.textContent = '0';
        foundOut.textContent = '0';
        phase.textContent = 'Ready';
        setVerdict('wait', 'Scanning', 'Reading files on this machine');
      };
      const run = () => {
        reset();
        scanBox.classList.add('scanning');
        phase.textContent = 'Scanning';
        let found = 0;
        rows.forEach((row, i) => {
          later(() => {
            flag(row);
            filesOut.textContent = i + 1;
            if (row.dataset.sev) foundOut.textContent = ++found;
          }, 500 + i * 520);
        });
        const done = 500 + rows.length * 520;
        later(() => {
          scanBox.classList.remove('scanning');
          phase.textContent = 'Done';
          setVerdict('no', 'NO-GO', 'Exit 1. Paste the fixes into your AI tool.');
        }, done);
        later(() => {
          scanBox.classList.add('fixing');
          phase.textContent = 'Fixing';
          setVerdict('wait', 'Fixing', 'npx sigship --prompt');
        }, done + 2200);
        blockers.forEach((row, i) => {
          later(() => {
            row.className = 'ok fixed';
            row.querySelector('b').textContent = 'Fixed';
            foundOut.textContent = blockers.length - i - 1;
          }, done + 2900 + i * 650);
        });
        const fixed = done + 2900 + blockers.length * 650;
        later(() => {
          scanBox.classList.remove('fixing');
          phase.textContent = 'Done';
          setVerdict('go', 'GO', 'Exit 0. Nothing serious found.');
        }, fixed + 200);
        later(() => visible && run(), fixed + 4200);
      };
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible && !timers.length) run();
        if (!visible) reset();
      }, { threshold: 0.35 }).observe(scanBox);
    }
  }

  // Waitlist: plan buttons pick the plan, and the form sends without leaving the page.
  const form = document.querySelector('[data-waitlist]');
  if (!form) return;
  const status = form.querySelector('.wl-status');
  const started = form.querySelector('[name="started"]');
  started.value = String(Date.now());

  for (const link of document.querySelectorAll('[data-plan]')) {
    link.addEventListener('click', () => {
      form.elements.plan.value = link.dataset.plan;
      setTimeout(() => form.elements.email.focus({ preventScroll: true }), calm ? 0 : 500);
    });
  }

  const show = (text, ok) => {
    status.textContent = text;
    status.dataset.state = ok ? 'ok' : 'error';
  };
  const params = new URLSearchParams(location.search);
  if (params.get('waitlist') === 'ok') show('You are on the list. We will email you when your plan opens.', true);
  if (params.get('waitlist') === 'error') show('That did not go through. Check your email address and try again.', false);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    show('Adding you…', true);
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        form.classList.add('done');
        show('You are on the list. We will email you when your plan opens.', true);
        form.reset();
        started.value = String(Date.now());
      } else {
        show(body.error || 'That did not go through. Try again in a minute.', false);
      }
    } catch {
      show('Could not reach SIGSHIP. Check your connection and try again.', false);
    } finally {
      button.disabled = false;
    }
  });
})();
