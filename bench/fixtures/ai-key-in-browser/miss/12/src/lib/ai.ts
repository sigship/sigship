export const ask = (q: string) => fetch('/api/chat', { method: 'POST', body: JSON.stringify({ q }) }).then((r) => r.json());
