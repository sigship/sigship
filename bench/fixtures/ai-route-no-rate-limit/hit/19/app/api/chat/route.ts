import { ask } from '@/lib/ai';
export async function POST(req: Request) {
  const out = await ask((await req.json()).messages);
  return Response.json(out.choices[0].message);
}
