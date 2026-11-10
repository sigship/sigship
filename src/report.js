import { verdict } from './engine.js';
import { RULES } from './rules.js';
import { template } from './prompts.js';

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

const accepted = (result) => result.accepted ?? [];
const day = (iso) => String(iso).slice(0, 10);

export function toTerminal(result, options = {}) {
  const v = verdict(result, options);
  const { sev1, sev2, sev3 } = result.counts;
  const out = [];
  out.push('');
  out.push(`${bold('SIGSHIP')} ${dim(`read ${result.filesRead} files in ${result.ms} ms, ran ${result.checksRun} checks`)}`);
  for (const line of proLines(options.pro)) out.push(dim(line));
  for (const line of result.warnings ?? []) out.push(amber(line));
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
  if (accepted(result).length) {
    out.push(dim('Accepted risks, from sigship-accept.json. They do not count for the verdict.'));
    out.push('');
    for (const f of accepted(result)) {
      out.push(`${dim(`SEV-${f.severity}`)}  ${dim(f.title)}`);
      out.push(`       ${dim(`${f.file}:${f.line}`)}  ${dim(`Accepted until ${day(f.expires)}: ${f.reason}`)}`);
      out.push('');
    }
  }

  const tally = `${sev1} SEV-1, ${sev2} SEV-2, ${sev3} SEV-3`;
  if (v.go) {
    out.push(`${green(v.text)}  ${tally}. Exit 0.`);
    out.push(dim('This means these checks found nothing that blocks launch. It does not prove the app is safe.'));
  } else {
    out.push(`${red(v.text)}  ${tally}. Exit 1.`);
    out.push(dim('Paste the fixes into your AI tool: npx sigship --prompt'));
  }
  out.push('');
  return out.join('\n');
}

export function toPrompt(result, options = {}) {
  const blocking = result.findings.filter((f) => f.severity <= (options.strict ? 3 : 2));
  if (!blocking.length) return 'SIGSHIP found nothing blocking. Nothing to fix.';
  const t = template(options.tool);
  const items = blocking.map((f, i) => `${i + 1}. [SEV-${f.severity}] ${f.title}\n   Where: ${f.file}:${f.line}\n   Fix: ${f.fix}`);
  return [...t.intro, '', ...items, ...(t.outro.length ? ['', ...t.outro] : [])].join('\n');
}

export function toJson(result, options = {}) {
  const v = verdict(result, options);
  const pro = options.pro && options.pro.status !== 'off' ? { pro: { status: options.pro.status, checks: options.pro.rules.length, message: options.pro.message } } : {};
  return { verdict: v.label, verdictText: v.text, go: v.go, exitCode: v.exitCode, ...result, root: undefined, ...pro };
}

// For pull request comments.
export function toMarkdown(result, options = {}) {
  const v = verdict(result, options);
  const { sev1, sev2, sev3 } = result.counts;
  const out = [`## SIGSHIP: ${v.text}`, '', `${sev1} SEV-1, ${sev2} SEV-2, ${sev3} SEV-3. Ran ${result.checksRun} checks on ${result.filesRead} files.`];
  for (const line of proLines(options.pro)) out.push('', line);
  for (const line of result.warnings ?? []) out.push('', `Warning: ${line}`);
  const cell = (s) => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ');
  if (result.findings.length) {
    out.push('', '| Severity | Problem | Where | Fix |', '| --- | --- | --- | --- |');
    for (const f of result.findings) out.push(`| SEV-${f.severity} | ${cell(f.title)} | \`${cell(f.file)}:${f.line}\` | ${cell(f.fix)} |`);
  }
  if (accepted(result).length) {
    out.push('', '### Accepted risks', '', 'From `sigship-accept.json`. They do not count for the verdict.', '', '| Severity | Problem | Where | Accepted until | Reason |', '| --- | --- | --- | --- | --- |');
    for (const f of accepted(result)) out.push(`| SEV-${f.severity} | ${cell(f.title)} | \`${cell(f.file)}:${f.line}\` | ${day(f.expires)} | ${cell(f.reason)} |`);
  }
  out.push('', v.go ? 'GO means these checks found nothing that blocks launch. It does not prove the app is safe.' : 'Run `npx sigship --prompt` and paste the fixes into your AI tool.');
  return out.join('\n');
}

// A stable fingerprint of file, line and rule, without any Node-only module. FNV-1a, 32 bits.
export function fingerprint(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const SARIF_LEVEL = { 1: 'error', 2: 'error', 3: 'warning' };

// SARIF 2.1.0, for GitHub code scanning and other tools that read it. One rule per check that ran.
export function toSarif(result, options = {}) {
  const extra = options.pro?.rules ?? options.rules ?? [];
  const known = new Map([...RULES, ...extra].map((r) => [r.id, r]));
  for (const f of [...result.findings, ...accepted(result)]) if (!known.has(f.id)) known.set(f.id, f);
  const rules = [...known.values()].map((r) => ({
    id: r.id,
    name: r.id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()),
    shortDescription: { text: r.title },
    fullDescription: { text: r.forecast },
    help: { text: r.fix },
    defaultConfiguration: { level: SARIF_LEVEL[r.severity] },
    properties: { severity: `SEV-${r.severity}`, ...(r.pro ? { tags: ['pro'] } : {}) },
  }));
  const index = new Map(rules.map((r, i) => [r.id, i]));
  const toResult = (f, suppressed) => ({
    ruleId: f.id,
    ruleIndex: index.get(f.id),
    level: SARIF_LEVEL[f.severity],
    message: { text: `${f.title}. ${f.detail} ${f.fix}` },
    locations: [{ physicalLocation: { artifactLocation: { uri: f.file, uriBaseId: '%SRCROOT%' }, region: { startLine: Math.max(1, f.line) } } }],
    partialFingerprints: { 'sigship/v1': fingerprint(`${f.file}:${f.line}:${f.id}`) },
    ...(suppressed ? { suppressions: [{ kind: 'external', justification: `Accepted until ${day(f.expires)}: ${f.reason}` }] } : {}),
  });
  return {
    $schema: 'https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: { driver: { name: 'SIGSHIP', version: options.version ?? '0.0.0', informationUri: 'https://sigship.dev', rules } },
        results: [...result.findings.map((f) => toResult(f, false)), ...accepted(result).map((f) => toResult(f, true))],
        properties: { verdict: verdict(result, options).text },
      },
    ],
  };
}

const html = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A single self-contained page to send to a client. It loads nothing from the network.
// options.brand and options.logo (a data: URI) put the sender's name and logo at the top.
export function toHtml(result, options = {}) {
  const v = verdict(result, options);
  const { sev1, sev2, sev3 } = result.counts;
  const name = options.name || 'This project';
  const date = new Date().toISOString().slice(0, 10);
  const brand = options.brand ? String(options.brand) : '';
  const logo = options.logo && /^data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+$/.test(options.logo) ? options.logo : '';
  const row = (f, extra) =>
    `<tr class="s${f.severity}"><td><b>SEV-${f.severity}</b></td><td><b>${html(f.title)}</b><p>${html(f.forecast)}</p><code>${html(f.file)}:${f.line}</code> ${html(f.detail)}</td><td>${extra ?? html(f.fix)}</td></tr>`;
  const rows = result.findings.map((f) => row(f)).join('\n');
  const acceptedRows = accepted(result)
    .map((f) => row(f, `Accepted until ${html(day(f.expires))}.<p>${html(f.reason)}</p>`))
    .join('\n');
  const header = brand || logo ? `<div class="brand">${logo ? `<img src="${logo}" alt="${html(brand || 'Logo')}" height="40">` : ''}${brand ? `<span>${html(brand)}</span>` : ''}</div>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${html(name)}: ${html(brand || 'SIGSHIP')} report ${date}</title>
<style>
  body { margin: 0 auto; max-width: 960px; padding: 40px 20px; color: #0e1b2c; font: 16px/1.5 system-ui, sans-serif; }
  h1 { margin: 0; font-size: 2rem; } .meta { color: #475a70; }
  .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; font-weight: 700; font-size: 1.1rem; } .brand img { height: 40px; width: auto; }
  .verdict { display: inline-block; margin: 20px 0 8px; padding: 6px 14px; border-radius: 4px; font-weight: 800; font-size: 1.4rem; }
  .go { background: #2e9e5b; } .nogo { background: #d3241c; color: #fff; }
  h2 { margin: 32px 0 0; font-size: 1.2rem; }
  table { width: 100%; margin-top: 24px; border-collapse: collapse; } td { padding: 12px 10px; border-top: 1px solid #c9d5df; vertical-align: top; }
  td p { margin: 4px 0; color: #475a70; } code { font-size: .9em; }
  .s1 td:first-child { color: #d3241c; } .s2 td:first-child { color: #9a7400; } .s3 td:first-child { color: #475a70; }
  footer { margin-top: 32px; color: #475a70; font-size: .9rem; }
</style>
</head>
<body>
${header}
<h1>${html(name)}</h1>
<p class="meta">Production readiness report, ${date}. ${result.filesRead} files read, ${result.checksRun} checks run.</p>
<div class="verdict ${v.go ? 'go' : 'nogo'}">${html(v.text)}</div>
<p>${sev1} SEV-1, ${sev2} SEV-2, ${sev3} SEV-3. SEV-1 and SEV-2 block launch${options.strict ? ', and so does SEV-3 in strict mode' : ''}.</p>
${rows ? `<table><thead><tr><td>Severity</td><td>Problem</td><td>Fix</td></tr></thead><tbody>\n${rows}\n</tbody></table>` : '<p>No problems found.</p>'}
${acceptedRows ? `<h2>Accepted risks</h2><p class="meta">Listed in sigship-accept.json. They do not count for the verdict.</p><table><thead><tr><td>Severity</td><td>Problem</td><td>Accepted</td></tr></thead><tbody>\n${acceptedRows}\n</tbody></table>` : ''}
<footer>${brand ? `Prepared by ${html(brand)}. ` : 'Made with SIGSHIP by zoof04, https://sigship.dev. '}SIGSHIP uses pattern checks. A GO means these checks found nothing that blocks launch. It does not prove the app is safe.</footer>
</body>
</html>
`;
}
