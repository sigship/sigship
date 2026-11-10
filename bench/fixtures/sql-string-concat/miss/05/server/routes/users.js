const { escapeIdentifier } = require('pg');
exports.sorted = (req, res) => db.query(`SELECT * FROM users ORDER BY ${escapeIdentifier(req.query.sort)}`).then((r) => res.json(r.rows));
