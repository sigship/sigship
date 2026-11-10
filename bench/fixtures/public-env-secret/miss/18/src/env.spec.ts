import { it, expect } from 'vitest';
it('does not define VITE_OPENAI_API_KEY', () => expect(import.meta.env.VITE_OPENAI_API_KEY).toBeUndefined());
