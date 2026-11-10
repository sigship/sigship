module.exports = {
  Query: {
    user: (_, args) => db.query(`SELECT * FROM users WHERE id = ${args.id}`).then((r) => r.rows[0]),
  },
};
