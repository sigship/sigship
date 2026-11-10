module.exports = (db) => async (req, res) => {
  const user = await db.query(`SELECT * FROM users WHERE id = ${params.id}`);
  res.json(user);
};
