module.exports = async (app) => {
  app.get('/users/:id', async (request) => (await app.pg.query(`SELECT * FROM users WHERE id = ${request.params.id}`)).rows[0]);
};
