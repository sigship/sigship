const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const app = express();
const client = new Anthropic();
app.use(express.json());
app.post('/api/ask', async (req, res) => {
  const msg = await client.messages.create({ model: 'claude-sonnet-4-5', max_tokens: 512, messages: req.body.messages });
  res.json(msg.content[0]);
});
app.listen(3000);
