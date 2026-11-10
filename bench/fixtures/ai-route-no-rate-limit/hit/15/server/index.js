const express = require('express');
const OpenAI = require('openai');
const app = express();
const openai = new OpenAI();
app.use(express.json());
app.post('/api/chat', async (req, res) => res.json(await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: req.body.messages })));
app.listen(3000);
