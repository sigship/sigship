import OpenAI from 'openai';
const openai = new OpenAI();
export default async function handler(req, res) {
  const out = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: req.body.messages });
  res.json(out.choices[0].message);
}
