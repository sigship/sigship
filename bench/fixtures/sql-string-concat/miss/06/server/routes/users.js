exports.me = (req, res) => db.query(`SELECT * FROM users WHERE id = ${req.user.id}`).then((r) => res.json(r.rows[0]));
