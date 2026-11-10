const knex = require('../knex');
exports.get = (req, res) => knex('users').where({ id: req.params.id }).first().then((u) => res.json(u));
