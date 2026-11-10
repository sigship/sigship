import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import OpenAI from 'openai';
const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '1 m') });
const openai = new OpenAI();
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anon';
  const { success } = await ratelimit.limit(ip);
  if (!success) return new Response('Too many requests', { status: 429 });
  const { messages } = await req.json();
  return Response.json(await openai.chat.completions.create({ model: 'gpt-4o-mini', messages }));
}
