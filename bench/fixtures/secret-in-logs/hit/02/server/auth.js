exports.login = (req, res) => {
  const { email, password } = req.body;
  console.log(password);
  return auth(email, password).then((u) => res.json(u));
};
