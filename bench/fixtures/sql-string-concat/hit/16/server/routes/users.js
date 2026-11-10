exports.get = async (req, res) => {
  const { id } = req.params;
  const rows = await db.query(`SELECT * FROM users WHERE id = ${id}`);
  res.json(rows[0]);
};
