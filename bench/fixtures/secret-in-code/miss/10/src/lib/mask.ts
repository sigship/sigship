export function kind(key: string) {
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('sk-')) return 'openai';
  if (key.startsWith('sk_live_')) return 'stripe';
  return 'unknown';
}
