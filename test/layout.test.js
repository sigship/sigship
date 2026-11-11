// Cheap layout guards for the built site: no browser, just the HTML and CSS as text.
// They catch the ways the site has overflowed before: an inline width wider than the screen, a picture or
// icon with no size at all (which a browser draws at 300x150 or full width), and a full-viewport width
// that ignores the scrollbar. Run after npm run docs; the tests skip when site/ has not been built.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, 'site');
const built = existsSync(join(site, 'index.html'));

const pages = [];
const walk = (d) => { for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) walk(f); else if (n.endsWith('.html')) pages.push(f); } };
if (built) walk(site);

const css = built ? readFileSync(join(site, 'app.css'), 'utf8') : '';
// Every class named in a rule that sizes an svg or img through its ancestors, e.g. ".score svg { width: ... }".
// Also every class named in any rule that sets a width or height, for a picture that carries its own class (".mk").
const sizingClasses = new Set();
const sizedClasses = new Set();
const collect = (sheet, ancestors, own) => {
  for (const m of sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selectors, body] = m;
    if (!/\b(width|height)\s*:/.test(body)) continue;
    for (const sel of selectors.split(',')) {
      const last = sel.trim().split(/[\s>+~]+/).pop() || '';
      for (const c of last.matchAll(/\.([a-zA-Z0-9_-]+)/g)) own.add(c[1]);
      if (!/\b(svg|img)\b/.test(sel)) continue;
      for (const c of sel.matchAll(/\.([a-zA-Z0-9_-]+)/g)) ancestors.add(c[1]);
    }
  }
};
collect(css, sizingClasses, sizedClasses);

// Walks the tags of a page and yields each <svg> or <img> with the classes of its open ancestors.
function* pictures(html) {
  const stack = [];
  const voids = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'path', 'circle', 'rect', 'stop', 'use', 'line', 'polyline', 'polygon', 'ellipse', 'animate']);
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g)) {
    const [, close, tagRaw, attrs] = m;
    const tag = tagRaw.toLowerCase();
    if (close) { const i = stack.map((s) => s.tag).lastIndexOf(tag); if (i >= 0) stack.length = i; continue; }
    const classes = (attrs.match(/class="([^"]*)"/) || [, ''])[1].split(/\s+/).filter(Boolean);
    if (tag === 'svg' || tag === 'img') yield { tag, attrs, classes, ancestors: stack.flatMap((s) => s.classes), at: m.index };
    if (!voids.has(tag) && !attrs.endsWith('/')) stack.push({ tag, classes });
  }
}

describe('site layout guards', { skip: !built && 'run npm run docs first' }, () => {
  it('builds at least the 48 pages plus the check page and 404', () => {
    assert.ok(pages.length >= 50, `only ${pages.length} pages`);
  });

  it('no inline style sets a width wider than the screen', () => {
    for (const page of pages) {
      const html = readFileSync(page, 'utf8');
      for (const m of html.matchAll(/style="([^"]*)"/g)) {
        for (const w of m[1].matchAll(/(?:^|;)\s*(?:min-)?width\s*:\s*([\d.]+)(vw|px)/g)) {
          const n = Number(w[1]);
          assert.ok(!(w[2] === 'vw' && n > 100) && !(w[2] === 'px' && n > 1200), `${page}: inline width ${w[1]}${w[2]}`);
        }
      }
    }
  });

  it('every svg and img has a width or a class that sizes it', () => {
    const misses = [];
    for (const page of pages) {
      const html = readFileSync(page, 'utf8');
      // Inline <style> blocks (the check page carries its own) may size pictures too.
      const local = new Set(sizingClasses), own = new Set(sizedClasses);
      for (const st of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) collect(st[1], local, own);
      for (const p of pictures(html)) {
        if (/\bwidth="/.test(p.attrs)) continue;
        if (/style="[^"]*width/.test(p.attrs)) continue;
        if (p.classes.some((c) => own.has(c)) || p.ancestors.some((c) => local.has(c))) continue;
        misses.push(`${page.replace(site, '')}:${p.at} <${p.tag}${p.attrs.slice(0, 60)}> in .${p.ancestors.slice(-3).join(' .')}`);
      }
    }
    assert.deepEqual(misses, []);
  });

  it('the stylesheet never uses width: 100vw without max-width: 100%', () => {
    const sheets = [css, ...pages.flatMap((p) => [...readFileSync(p, 'utf8').matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]))];
    for (const sheet of sheets) {
      for (const m of sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const body = m[2];
        if (/(?:^|;)\s*width\s*:\s*100vw\b/.test(body)) assert.match(body, /max-width\s*:\s*100%/, `${m[1].trim()} sets width: 100vw without max-width: 100%`);
      }
    }
  });

  it('the hero heading, footer word and rings use bounded sizes', () => {
    assert.match(css, /\.hero-h1\s*\{[^}]*font-size:\s*clamp\(/, 'the hero heading needs a clamp() size');
    assert.match(css, /\.foot \.word\s*\{[^}]*font-size:\s*clamp\(/, 'the footer word needs a clamp() size');
    assert.match(css, /\.score-ring\s*\{[^}]*aspect-ratio:\s*1/, 'the hero score ring needs a fixed aspect ratio');
    assert.doesNotMatch(css, /\.score-num\s*\{[^}]*margin-top:\s*-/, 'the score number must not sit on a negative margin');
  });
});
