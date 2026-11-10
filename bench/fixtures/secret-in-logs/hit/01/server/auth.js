exports.login = async (req, res) => {
  const token = await issue(req.body.email);
  console.log('token', token);
  res.json({ token });
};
