router.post('/users', async (ctx) => {
  await conn.execute(`INSERT INTO users (name) VALUES ('${ctx.request.body.name}')`);
  ctx.status = 201;
});
