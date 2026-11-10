exports.get = (req, res) => {
  console.log(`GET /users/${req.params.id}`);
  return db.query('SELECT * FROM users WHERE id = $1', [req.params.id]).then((r) => res.json(r.rows[0]));
};
