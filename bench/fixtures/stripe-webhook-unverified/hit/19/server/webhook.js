app.post('/webhook', express.json(), async (req, res) => {
  if (req.body.type === 'charge.succeeded') await credit(req.body.data.object);
  res.sendStatus(200);
});
