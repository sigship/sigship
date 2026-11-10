import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export async function POST(req: Request) {
  const { messages } = await req.json();
  const out = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages });
  return Response.json(out.choices[0].message);
}
