import { it } from 'vitest';
it('browser mode', () => new OpenAI({ apiKey: 'x', dangerouslyAllowBrowser: true }));
