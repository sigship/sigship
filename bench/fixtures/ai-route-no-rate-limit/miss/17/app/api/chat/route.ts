import { checkRateLimit } from '@vercel/firewall';
import OpenAI from 'openai';
const openai = new OpenAI();
export async function POST(req: Request) {
  const { rateLimited } = await checkRateLimit('chat', { request: req });
  if (rateLimited) return new Response('', { status: 429 });
  return Response.json(await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: (await req.json()).messages }));
}
