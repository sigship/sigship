import OpenAI from 'https://esm.sh/openai@4';
const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
Deno.serve(async (req) => Response.json(await openai.chat.completions.create(await req.json())));
