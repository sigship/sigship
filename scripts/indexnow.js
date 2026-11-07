// Tells Bing, Yandex, Seznam, Naver and other IndexNow search engines which pages changed, right after a deploy.
// Run with: npm run indexnow            (pages whose built files changed in the last commit)
//           npm run indexnow -- --all   (every page in the sitemap)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INDEXNOW_KEY, ORIGIN } from './seo.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = [...readFileSync(join(root, 'site/sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

let urls = all;
if (!process.argv.includes('--all')) {
  let changed = [];
  try { changed = execFileSync('git', ['diff', '--name-only', 'HEAD~1', 'HEAD', '--', 'site'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean); } catch { /* first commit */ }
  // Shared files change how every page looks, so they count as a change to every page.
  if (changed.some((f) => /^site\/(home\.css|page\.css|page\.js)$/.test(f))) urls = all;
  else {
    const paths = new Set(changed.filter((f) => f.endsWith('index.html')).map((f) => `${ORIGIN}${f.slice(4, -10)}`));
    urls = all.filter((u) => paths.has(u));
  }
}
if (!urls.length) {
  console.log('IndexNow: no page changed in the last commit, so nothing to submit.');
  process.exit(0);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(ORIGIN).host, key: INDEXNOW_KEY, keyLocation: `${ORIGIN}/${INDEXNOW_KEY}.txt`, urlList: urls }),
});
// 200 and 202 both mean accepted. A failure here never fails a deploy.
console.log(`IndexNow: submitted ${urls.length} ${urls.length === 1 ? 'page' : 'pages'}, response ${res.status}${res.ok ? ' (accepted)' : `: ${(await res.text()).slice(0, 200)}`}.`);
