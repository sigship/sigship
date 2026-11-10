// Builds the private beta site into site-beta/: a copy of site/ (fonts, images, styles, the browser check)
// with every page rebuilt in beta mode by build-site.js and build-check.js. site-beta/ is not committed.
// Run with: npm run beta. Deploy with: npx wrangler deploy --env beta
import { cpSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'site-beta');
rmSync(out, { recursive: true, force: true });
cpSync(join(root, 'site'), out, { recursive: true });
const env = { ...process.env, SIGSHIP_BETA: '1', SIGSHIP_OUT: 'site-beta' };
for (const script of ['build-site.js', 'build-check.js']) execFileSync(process.execPath, [join(root, 'scripts', script)], { stdio: 'inherit', env, cwd: root });
console.log('Built the beta site into site-beta/.');
