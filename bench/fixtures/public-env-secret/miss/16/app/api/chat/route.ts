import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const POST = async () => Response.json({ ok: !!openai });
