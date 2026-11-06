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

export function toTerminal(result, options = {}) {
  const v = verdict(result, options);
  const { sev1, sev2, sev3 } = result.counts;
  const out = [];
  out.push('');
  out.push(`${bold('SIGSHIP')} ${dim(`read ${result.filesRead} files in ${result.ms} ms, ran ${result.checksRun} checks`)}`);
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
  return { verdict: v.label, go: v.go, exitCode: v.exitCode, ...result, root: undefined };
}
