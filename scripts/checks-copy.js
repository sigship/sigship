// How the 17 checks are grouped and worded on the site. Titles and fixes come from src/rules.js; these are the short card lines.
export const LEVEL = {
  1: { label: 'Fix now', dev: 'SEV-1', c: 'stop' },
  2: { label: 'Fix soon', dev: 'SEV-2', c: 'warn' },
  3: { label: 'Nice to fix', dev: 'SEV-3', c: 'muted-foreground' },
};

export const GROUPS = {
  keys: { label: 'Keys & passwords', emoji: '🔑', color: 'amber' },
  data: { label: "Your users' data", emoji: '🗂️', color: 'violet' },
  payments: { label: 'Payments', emoji: '💳', color: 'lime' },
  ai: { label: 'AI costs', emoji: '✨', color: 'pink' },
  login: { label: 'Logins', emoji: '🔐', color: 'sky' },
  web: { label: 'Website safety', emoji: '🌐', color: 'teal' },
  ops: { label: 'Launch hygiene', emoji: '🧰', color: 'coral' },
};

// [group, what could happen, the short fix]
export const CARD = {
  'secret-in-code': ['keys', 'Anyone who reads your code or your site’s JavaScript can copy it and spend your money.', 'Rotate the key, then move it to a server-side environment variable.'],
  'env-file-committed': ['keys', 'Your .env file is in the repo, so every password in it is public.', 'Remove .env from git, add it to .gitignore, and rotate every value.'],
  'public-env-secret': ['keys', 'A NEXT_PUBLIC_ or VITE_ name ships the secret to every visitor’s browser.', 'Drop the public prefix and move the call to a server route.'],
  'secret-in-logs': ['keys', 'Passwords end up in logs that more people can read than your database.', 'Log that it happened, never the value.'],
  'rls-missing': ['data', 'Anyone with your public key can read every row in this table.', 'Turn on row level security and add an owner-only policy.'],
  'rls-open-write': ['data', 'The lock exists, but it’s set to “allow all”. Anyone can edit or delete.', 'Replace true with a real condition, like auth.uid() = user_id.'],
  'sql-string-concat': ['data', 'A crafted form entry becomes a database command.', 'Use a parameterised query. Never build SQL with template strings.'],
  'stripe-webhook-unverified': ['payments', 'Someone sends a fake “payment succeeded” and gets paid features free.', 'Verify every Stripe event with its signing secret.'],
  'ai-key-in-browser': ['ai', 'Strangers copy your key from the browser and use your OpenAI credits for free.', 'Call the AI from a server route that holds the key.'],
  'ai-route-no-rate-limit': ['ai', 'One script loops overnight and you wake up to a huge bill.', 'Add a per-user rate limit and a monthly spending cap.'],
  'role-in-local-storage': ['login', 'Users flip one browser setting and become admin.', 'Store roles in the database and check them on the server.'],
  'unsanitized-html': ['web', 'A comment with a hidden script runs in every visitor’s browser.', 'Sanitise it with DOMPurify, or render it as plain text.'],
  'cors-wildcard': ['web', 'Other sites can talk to your app on your users’ behalf.', 'Replace the wildcard with your own domain.'],
  'no-error-boundary': ['ops', 'One bad record gives your users a blank white page.', 'Add an error boundary (error.tsx in Next.js) with a retry.'],
  'no-error-tracking': ['ops', 'Your app breaks for a week before anyone tells you.', 'Add an error tracker such as Sentry on the client and the server.'],
  'no-tests': ['ops', 'A Friday fix breaks signup until Monday.', 'One test each for sign up, log in and pay, run on every pull request.'],
  'no-lockfile': ['ops', 'A package updates itself on deploy and your live app breaks.', 'Commit your lockfile.'],
};
