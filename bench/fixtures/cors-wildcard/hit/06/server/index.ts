import { cors } from 'hono/cors';
app.use('/api/*', cors({ origin: '*' }));
