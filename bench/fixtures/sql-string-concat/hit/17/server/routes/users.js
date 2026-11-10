exports.get = (req, res) => db.query("SELECT * FROM users WHERE id = " + req.params.id).then((r) => res.json(r.rows));
