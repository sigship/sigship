import OpenAI from 'openai';
const openai = new OpenAI();
export const ask = (messages) => openai.chat.completions.create({ model: 'gpt-4o-mini', messages });
