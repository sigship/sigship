const knex = require('../knex');
exports.get = (req, res) => knex.raw(`SELECT * FROM users WHERE id = ?`, [req.params.id]).then((r) => res.json(r.rows));
