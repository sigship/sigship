import OpenAI from 'openai';
export function useOpenAI() {
  return new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_KEY, dangerouslyAllowBrowser: true });
}
