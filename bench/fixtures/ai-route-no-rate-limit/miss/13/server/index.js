app.post('/api/chat', require('./throttle'), async (req, res) => res.json(await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: req.body.messages })));
