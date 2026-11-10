exports.get = (req, res) => db.query(`SELECT * FROM users WHERE id = ${Number(req.params.id)}`).then((r) => res.json(r.rows[0]));
