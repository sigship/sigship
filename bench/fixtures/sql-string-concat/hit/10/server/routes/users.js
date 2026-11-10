exports.byName = async (req, res) => {
  const name = req.query.name;
  const rows = await db.query(`SELECT * FROM users WHERE name = '${name}'`);
  res.json(rows);
};
