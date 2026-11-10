const TABLE = 'users';
exports.all = (req, res) => db.query(`SELECT * FROM ${TABLE}`).then((r) => res.json(r.rows));
