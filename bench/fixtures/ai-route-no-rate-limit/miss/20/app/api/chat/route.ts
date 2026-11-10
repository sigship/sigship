import arcjet, { tokenBucket } from '@arcjet/next';
const aj = arcjet({ key: process.env.ARCJET_KEY!, rules: [tokenBucket({ mode: 'LIVE', refillRate: 5, interval: 60, capacity: 10 })] });
export async function POST(req: Request) {
  const d = await aj.protect(req, { requested: 1 });
  if (d.isDenied()) return new Response('', { status: 429 });
  return Response.json(await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: (await req.json()).messages }));
}
