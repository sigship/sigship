const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({ windowMs: 60_000, max: 20 }));
app.post('/api/chat', async (req, res) => res.json(await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: req.body.messages })));
