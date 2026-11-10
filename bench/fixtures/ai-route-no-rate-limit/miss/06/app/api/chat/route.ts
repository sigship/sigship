import { rateLimit } from '@/lib/ratelimit';
import OpenAI from 'openai';
const openai = new OpenAI();
export async function POST(req: Request) {
  if (!rateLimit(req.headers.get('x-forwarded-for') ?? 'anon')) return new Response('slow down', { status: 429 });
  const { messages } = await req.json();
  return Response.json(await openai.chat.completions.create({ model: 'gpt-4o-mini', messages }));
}
