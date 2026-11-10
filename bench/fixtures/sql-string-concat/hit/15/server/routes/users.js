exports.list = async (req, res) => {
  const rows = await db.query(`SELECT * FROM users ORDER BY ${req.query.sort} ${req.query.dir}`);
  res.json(rows);
};
