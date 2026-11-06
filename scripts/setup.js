// Fills every placeholder once. Works the same on macOS, Linux and Windows.
// Usage: node scripts/setup.js --github=yourname --entity="Your Company Pvt Ltd" --solo=https://... --team=https://...
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split(/=(.*)/s).slice(0, 2)));
const today = new Date().toISOString().slice(0, 10);
const map = [
  ['YOUR_GITHUB_USERNAME', args.github],
  ['LEGAL_ENTITY_NAME', args.entity],
  ['POLAR_SOLO_URL', args.solo],
  ['POLAR_TEAM_URL', args.team],
  ['UPDATE_THIS_DATE', today],
].filter(([, value]) => value);

const skip = new Set(['node_modules', '.git', 'fonts', 'brand', 'setup.js']);
function walk(dir) {
  return readdirSync(dir).filter((n) => !skip.has(n)).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(json|jsonc|js|html|md|txt|xml)$/.test(name) ? [full] : [];
  });
}

let changed = 0;
for (const file of walk(root)) {
  const before = readFileSync(file, 'utf8');
  const after = map.reduce((text, [from, to]) => text.replaceAll(from, to), before);
  if (after !== before) { writeFileSync(file, after); changed += 1; }
}
console.log(`Updated ${changed} files.`);
const left = ['YOUR_GITHUB_USERNAME', 'LEGAL_ENTITY_NAME', 'POLAR_SOLO_URL', 'POLAR_TEAM_URL'].filter((p) => walk(root).some((f) => readFileSync(f, 'utf8').includes(p)));
console.log(left.length ? `Still to fill: ${left.join(', ')}` : 'All placeholders are filled.');
