exports.login = (req, res) => {
  console.log('login body', req.body);
  return auth(req.body.email, req.body.password).then((u) => res.json(u));
};
