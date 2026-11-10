import { Hono } from 'hono';
const app = new Hono();
app.post('/stripe', async (c) => {
  const event = await c.req.json();
  if (event.type === 'customer.subscription.updated') await sync(event.data.object);
  return c.json({ ok: true });
});
export default app;
