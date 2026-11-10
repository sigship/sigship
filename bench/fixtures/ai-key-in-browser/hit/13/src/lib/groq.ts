import Groq from 'groq-sdk';
export const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_KEY, dangerouslyAllowBrowser: true });
