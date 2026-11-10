const knex = require('../knex');
exports.update = (req, res) => knex.raw(`UPDATE users SET name = '${body.name}' WHERE id = ${body.id}`).then(() => res.sendStatus(204));
