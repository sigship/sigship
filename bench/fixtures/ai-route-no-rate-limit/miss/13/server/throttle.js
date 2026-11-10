const counts = new Map();
module.exports = (req, res, next) => {
  const n = (counts.get(req.ip) ?? 0) + 1;
  counts.set(req.ip, n);
  if (n > 30) return res.status(429).send('throttled');
  next();
};
