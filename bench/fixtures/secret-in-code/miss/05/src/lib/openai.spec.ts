import { describe, it, expect } from 'vitest';
import { maskKey } from './mask';

describe('maskKey', () => {
  it('hides the middle', () => {
    expect(maskKey('sk-proj-qaf5q68FLSiGbwgFcvQvEvKzwluBJlJuktKoZDDB65VlYJxm')).toMatch(/^sk-proj-\w{4}…/);
  });
});
