import { Router } from 'express';
import OpenAI from 'openai';
const openai = new OpenAI();
export const ai = Router().post('/', async (req, res) => res.json(await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: req.body.messages })));
