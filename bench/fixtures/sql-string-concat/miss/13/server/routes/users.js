// BAD: db.query(`SELECT * FROM users WHERE id = '${req.params.id}'`)
exports.get = (req, res) => db.query('SELECT * FROM users WHERE id = $1', [req.params.id]).then((r) => res.json(r.rows[0]));
