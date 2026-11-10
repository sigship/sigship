exports.search = async (req, res) => {
  const q = req.query.q;
  res.json(await db.query(`SELECT * FROM users WHERE name LIKE '%${q}%'`));
};
