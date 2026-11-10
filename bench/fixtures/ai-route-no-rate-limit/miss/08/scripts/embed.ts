import OpenAI from 'openai';
const openai = new OpenAI();
for (const doc of docs) await openai.embeddings.create({ model: 'text-embedding-3-small', input: doc });
