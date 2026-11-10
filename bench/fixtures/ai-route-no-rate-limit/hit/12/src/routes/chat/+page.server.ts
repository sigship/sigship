import OpenAI from 'openai';
const openai = new OpenAI();
export const actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const out = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: String(form.get('q')) }] });
    return { answer: out.choices[0].message.content };
  },
};
