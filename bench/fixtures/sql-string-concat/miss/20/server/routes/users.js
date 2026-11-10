const COLS = { name: 'name', created: 'created_at' };
exports.list = (req, res) => {
  const col = COLS[req.query.sort] ?? 'created_at';
  return db.query(`SELECT * FROM users ORDER BY ${col}`).then((r) => res.json(r.rows));
};
