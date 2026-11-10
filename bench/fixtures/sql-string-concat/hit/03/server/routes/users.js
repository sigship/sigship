const pool = require('../pool');
exports.search = async (req, res) => {
  const result = await pool.query(`SELECT * FROM products WHERE name ILIKE '%${req.query.q}%'`);
  res.json(result.rows);
};
