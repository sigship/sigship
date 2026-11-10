import OpenAI from 'openai';
const ALLOW_BROWSER = true;
export const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY, dangerouslyAllowBrowser: ALLOW_BROWSER });
