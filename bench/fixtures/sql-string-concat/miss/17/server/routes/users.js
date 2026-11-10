exports.get = (req, res) => sequelize.query('SELECT * FROM users WHERE id = :id', { replacements: { id: req.params.id } }).then(([rows]) => res.json(rows));
