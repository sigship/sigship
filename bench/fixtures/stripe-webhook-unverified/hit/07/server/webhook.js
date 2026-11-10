module.exports = async (app) => {
  app.post('/webhook', async (req) => {
    if (req.body.type === 'checkout.session.completed') await grant(req.body.data.object);
    return { received: true };
  });
};
