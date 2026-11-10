exports.all = (req, res) => db.query(`SELECT * FROM ${process.env.DB_SCHEMA}.users`).then((r) => res.json(r.rows));
