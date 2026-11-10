it('is vulnerable', () => db.query(`SELECT * FROM users WHERE id = ${req.params.id}`));
