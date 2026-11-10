import OpenAI from 'openai';
const openai = new OpenAI();
export async function POST(req: Request) {
  const { input } = await req.json();
  const r = await openai.responses.create({ model: 'gpt-4.1-mini', input });
  return Response.json({ text: r.output_text });
}
