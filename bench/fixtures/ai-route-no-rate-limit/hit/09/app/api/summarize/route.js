import OpenAI from 'openai';
const openai = new OpenAI();
export async function POST(req) {
  const { text } = await req.json();
  const out = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Summarize: ' + text }] });
  return Response.json({ summary: out.choices[0].message.content });
}
