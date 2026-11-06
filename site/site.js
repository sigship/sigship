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
