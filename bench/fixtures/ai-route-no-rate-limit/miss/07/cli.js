#!/usr/bin/env node
import OpenAI from 'openai';
const openai = new OpenAI();
const out = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: process.argv[2] }] });
console.log(out.choices[0].message.content);
