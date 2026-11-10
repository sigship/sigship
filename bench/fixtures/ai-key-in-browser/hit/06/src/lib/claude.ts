import Anthropic from '@anthropic-ai/sdk';
export const claude = new Anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_KEY, dangerouslyAllowBrowser: true });
