// Fix-prompt templates, one per AI tool. Each is the same list of fixes with the opening lines
// written for how that tool takes instructions. The default is what --prompt printed before.

export const TOOLS = ['lovable', 'cursor', 'bolt', 'claude', 'replit', 'windsurf'];

const DEFAULT = {
  intro: [
    'Fix these production problems in order. Change only what each fix needs.',
    'After the fixes, run `npx sigship` again and keep going until it exits 0.',
    'If a fix needs a key rotated or a dashboard changed, stop and tell me what to do.',
  ],
  outro: [],
};

const TEMPLATES = {
  lovable: {
    intro: [
      'Fix these production problems in my app, one at a time and in this order. Change only what each fix needs, and keep the design and the rest of the app as it is.',
      'Where a fix needs a secret, read it from an environment variable or a Supabase Edge Function secret. Never write the value into the code.',
      'If a fix needs a key rotated or a setting changed in Supabase, Stripe or another dashboard, stop and tell me exactly what to click.',
    ],
    outro: ['When you are done, list each fix and the file it changed, so I can check them with SIGSHIP.'],
  },
  cursor: {
    intro: [
      'Fix these production problems in order. Change only what each fix needs and keep the existing code style.',
      'After every fix, run `npx sigship` in the terminal. Keep going until it exits 0, then stop.',
      'If a fix needs a key rotated or a dashboard changed, stop and tell me what to do instead of guessing.',
    ],
    outro: [],
  },
  bolt: {
    intro: [
      'Fix these production problems in my project, one at a time and in this order. Change only what each fix needs.',
      'Keep secrets in environment variables and never put a value into the code or the chat.',
      'If a fix needs a key rotated or a setting changed outside the code, stop and tell me what to do.',
    ],
    outro: ['When you are done, list each fix and the file it changed.'],
  },
  claude: {
    intro: [
      'Fix these production problems in order. Change only what each fix needs.',
      'After the fixes, run `npx sigship` (or the sigship_check MCP tool) again and keep going until it exits 0. Do not say the work is done while it is NO-GO.',
      'If a fix needs a key rotated or a dashboard changed, stop and tell me what to do.',
    ],
    outro: [],
  },
  replit: {
    intro: [
      'Fix these production problems in my Repl, one at a time and in this order. Change only what each fix needs.',
      'Put every secret in Replit Secrets (the lock icon) and read it from the environment. Never write a value into a file.',
      'After the fixes, run `npx sigship` in the Shell and keep going until it exits 0.',
      'If a fix needs a key rotated or a dashboard changed, stop and tell me what to do.',
    ],
    outro: [],
  },
  windsurf: {
    intro: [
      'Fix these production problems in order. Change only what each fix needs and keep the existing code style.',
      'After every fix, run `npx sigship` in the terminal. Keep going until it exits 0, then stop.',
      'If a fix needs a key rotated or a dashboard changed, stop and tell me what to do instead of guessing.',
    ],
    outro: [],
  },
};

export function template(tool) {
  if (tool === undefined || tool === null || tool === '') return DEFAULT;
  if (!TEMPLATES[tool]) throw new Error(`Unknown tool ${tool}. Choose one of ${TOOLS.join(', ')}.`);
  return TEMPLATES[tool];
}
