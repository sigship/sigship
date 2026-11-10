import OpenAI from 'openai';
export const make = (apiKey: string) => new OpenAI({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
