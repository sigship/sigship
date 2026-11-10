exports.get = (req, res) => conn.query(`SELECT * FROM users WHERE id = ?`, [req.params.id]).then(([rows]) => res.json(rows[0]));
