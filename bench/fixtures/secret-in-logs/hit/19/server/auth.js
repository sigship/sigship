const log = require('pino')();
exports.refresh = (req, res) => {
  log.info({ token: req.body.token }, 'refresh');
  res.sendStatus(200);
};
