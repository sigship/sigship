app.post('/stripe', async (c) => {
  const event = stripe.webhooks.constructEvent(await c.req.text(), c.req.header('stripe-signature')!, SECRET);
  if (event.type === 'customer.subscription.updated') await sync(event.data.object);
  return c.json({ ok: true });
});
