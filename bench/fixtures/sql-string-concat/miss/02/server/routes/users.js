exports.all = (req, res) => db.query(`SELECT id, email FROM users ORDER BY created_at DESC`).then((r) => res.json(r.rows));
