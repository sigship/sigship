const OpenAI = require('openai');
const openai = new OpenAI();
app.post('/api/chat', async (req, res) => res.json(await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: req.body.messages })));
