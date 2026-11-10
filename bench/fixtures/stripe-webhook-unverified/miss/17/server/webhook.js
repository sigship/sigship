const verify = (req, res, next) => {
  try {
    req.event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    next();
  } catch (e) {
    res.status(400).send('bad signature');
  }
};
app.post('/webhook', express.raw({ type: '*/*' }), verify, (req, res) => {
  if (req.event.type === 'invoice.paid') paid(req.event.data.object);
  res.sendStatus(200);
});
