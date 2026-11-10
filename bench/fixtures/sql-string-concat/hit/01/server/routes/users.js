const { Router } = require('express');
const db = require('../db');
const r = Router();
r.post('/login', async (req, res) => {
  const rows = await db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`);
  res.json(rows[0]);
});
module.exports = r;
