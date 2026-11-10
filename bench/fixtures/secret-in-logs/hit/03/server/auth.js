exports.register = (req, res) => {
  const { email, password } = req.body;
  console.log('user', { email, password });
  return create(email, password).then((u) => res.json(u));
};
