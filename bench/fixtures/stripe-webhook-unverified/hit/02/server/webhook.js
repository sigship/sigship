const express = require('express');
const app = express();
app.post('/webhook', express.json(), async (req, res) => {
  const event = req.body;
  switch (event.type) {
    case 'checkout.session.completed':
      await db.users.update({ stripe: event.data.object.customer, plan: 'pro' });
      break;
  }
  res.json({ received: true });
});
