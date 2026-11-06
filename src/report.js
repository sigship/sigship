import { verdict } from './scan.js';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = paint('38;5;203');
const amber = paint('38;5;215');
const dim = paint('2');
const bold = paint('1');
const green = paint('38;5;114');

const SEV = { 1: red('SEV-1'), 2: amber('SEV-2'), 3: dim('SEV-3') };

function wrap(text, indent, width = 76) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width - indent) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines.join('\n' + ' '.repeat(indent));
}

// What the Pro pack did on this run, in words. Empty when no key is set.
function proLines(pro) {
  if (!pro || pro.status === 'off') return [];
  const lines = [];
  if (pro.rules.length) lines.push(`Pro pack: ${pro.rules.length} extra checks included.`);
  if (pro.message) lines.push(pro.message);
  return lines;
}

export function toTerminal(result, options = {}) {
  const v = verdict(result, options);
  const { sev1, sev2, sev3 } = result.counts;
  const out = [];
  out.push('');
  out.push(`${bold('SIGSHIP')} ${dim(`read ${result.filesRead} files in ${result.ms} ms, ran ${result.checksRun} checks`)}`);
  for (const line of proLines(options.pro)) out.push(dim(line));
  out.push('');

  if (result.findings.length) {
    out.push(dim('Postmortem, written before the outage. Worst first.'));
    out.push('');
    for (const f of result.findings) {
      out.push(`${SEV[f.severity]}  ${bold(f.title)}`);
      out.push(`       ${dim(`${f.file}:${f.line}`)}  ${dim(f.detail)}`);
      out.push(`       ${wrap(f.forecast, 7)}`);
      out.push('');
    }
  }

  const tally = `${sev1} SEV-1, ${sev2} SEV-2, ${sev3} SEV-3`;
  if (v.go) {
    out.push(`${green('GO')}  ${tally}. Exit 0.`);
    out.push(dim('This means these checks found nothing that blocks launch. It does not prove the app is safe.'));
  } else {
    out.push(`${red('NO-GO')}  ${tally}. Exit 1.`);
    out.push(dim('Paste the fixes into your AI tool: npx sigship --prompt'));
  }
  out.push('');
  return out.join('\n');
}

export function toPrompt(result, options = {}) {
  const blocking = result.findings.filter((f) => f.severity <= (options.strict ? 3 : 2));
  if (!blocking.length) return 'SIGSHIP found nothing blocking. Nothing to fix.';
  const items = blocking.map((f, i) => `${i + 1}. [SEV-${f.severity}] ${f.title}\n   Where: ${f.file}:${f.line}\n   Fix: ${f.fix}`);
  return [
    'Fix these production problems in order. Change only what each fix needs.',
    'After the fixes, run `npx sigship` again and keep going until it exits 0.',
    'If a fix needs a key rotated or a dashboard changed, stop and tell me what to do.',
    '',
    ...items,
  ].join('\n');
}

export function toJson(result, options = {}) {
  const v = verdict(result, options);
  const pro = options.pro && options.pro.status !== 'off' ? { pro: { status: options.pro.status, checks: options.pro.rules.length, message: options.pro.message } } : {};
  return { verdict: v.label, go: v.go, exitCode: v.exitCode, ...result, root: undefined, ...pro };
}

// For pull request comments.
export function toMarkdown(result, options = {}) {
  const v = verdict(result, options);
  const { sev1, sev2, sev3 } = result.counts;
  const out = [`## SIGSHIP: ${v.label}`, '', `${sev1} SEV-1, ${sev2} SEV-2, ${sev3} SEV-3. Ran ${result.checksRun} checks on ${result.filesRead} files.`];
  for (const line of proLines(options.pro)) out.push('', line);
  if (result.findings.length) {
    out.push('', '| Severity | Problem | Where | Fix |', '| --- | --- | --- | --- |');
    const cell = (s) => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ');
    for (const f of result.findings) out.push(`| SEV-${f.severity} | ${cell(f.title)} | \`${cell(f.file)}:${f.line}\` | ${cell(f.fix)} |`);
  }
  out.push('', v.go ? 'GO means these checks found nothing that blocks launch. It does not prove the app is safe.' : 'Run `npx sigship --prompt` and paste the fixes into your AI tool.');
  return out.join('\n');
}

const html = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A single self-contained page to send to a client. It loads nothing from the network.
export function toHtml(result, options = {}) {
  const v = verdict(result, options);
  const { sev1, sev2, sev3 } = result.counts;
  const name = options.name || 'This project';
  const date = new Date().toISOString().slice(0, 10);
  const rows = result.findings
    .map((f) => `<tr class="s${f.severity}"><td><b>SEV-${f.severity}</b></td><td><b>${html(f.title)}</b><p>${html(f.forecast)}</p><code>${html(f.file)}:${f.line}</code> ${html(f.detail)}</td><td>${html(f.fix)}</td></tr>`)
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${html(name)}: SIGSHIP report ${date}</title>
<style>
  body { margin: 0 auto; max-width: 960px; padding: 40px 20px; color: #0e1b2c; font: 16px/1.5 system-ui, sans-serif; }
  h1 { margin: 0; font-size: 2rem; } .meta { color: #475a70; }
  .verdict { display: inline-block; margin: 20px 0 8px; padding: 6px 14px; border-radius: 4px; font-weight: 800; font-size: 1.4rem; }
  .go { background: #2e9e5b; } .nogo { background: #d3241c; color: #fff; }
  table { width: 100%; margin-top: 24px; border-collapse: collapse; } td { padding: 12px 10px; border-top: 1px solid #c9d5df; vertical-align: top; }
  td p { margin: 4px 0; color: #475a70; } code { font-size: .9em; }
  .s1 td:first-child { color: #d3241c; } .s2 td:first-child { color: #9a7400; } .s3 td:first-child { color: #475a70; }
  footer { margin-top: 32px; color: #475a70; font-size: .9rem; }
</style>
</head>
<body>
<h1>${html(name)}</h1>
<p class="meta">Production readiness report, ${date}. ${result.filesRead} files read, ${result.checksRun} checks run.</p>
<div class="verdict ${v.go ? 'go' : 'nogo'}">${v.label}</div>
<p>${sev1} SEV-1, ${sev2} SEV-2, ${sev3} SEV-3. SEV-1 and SEV-2 block launch${options.strict ? ', and so does SEV-3 in strict mode' : ''}.</p>
${rows ? `<table><thead><tr><td>Severity</td><td>Problem</td><td>Fix</td></tr></thead><tbody>\n${rows}\n</tbody></table>` : '<p>No problems found.</p>'}
<footer>Made with SIGSHIP by zoof04, https://sigship.dev. SIGSHIP uses pattern checks. A GO means these checks found nothing that blocks launch. It does not prove the app is safe.</footer>
</body>
</html>
`;
}
