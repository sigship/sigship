export const ask = (prompt: string) => fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY, 'anthropic-dangerous-direct-browser-access': 'true', 'content-type': 'application/json' },
  body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 256, messages: [{ role: 'user', content: prompt }] }),
});
