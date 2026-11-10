import OpenAI from 'openai';
import { checkDailyQuota } from '@/lib/quota';
const openai = new OpenAI();
export async function POST(req: Request) {
  const user = await getUser(req);
  const { allowed } = await checkDailyQuota(user.id);
  if (!allowed) return new Response('Daily quota reached', { status: 429 });
  const { messages } = await req.json();
  return Response.json(await openai.chat.completions.create({ model: 'gpt-4o-mini', messages }));
}
