import { rateLimiter } from 'hono-rate-limiter';
app.use('/api/*', rateLimiter({ windowMs: 60_000, limit: 20, keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'anon' }));
app.post('/api/chat', async (c) => c.json(await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: (await c.req.json()).messages })));
