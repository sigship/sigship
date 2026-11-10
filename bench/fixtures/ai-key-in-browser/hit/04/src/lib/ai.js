import OpenAI from 'openai';
export const ai = new OpenAI({ apiKey: import.meta.env.VITE_KEY, dangerouslyAllowBrowser: true });
