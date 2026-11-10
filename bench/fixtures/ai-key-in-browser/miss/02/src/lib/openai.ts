import OpenAI from 'openai';
// Never pass dangerouslyAllowBrowser: true here. The key must stay on the server.
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
