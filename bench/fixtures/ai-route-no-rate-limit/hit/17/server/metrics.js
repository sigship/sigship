const { throttle } = require('lodash');
module.exports.flush = throttle(() => console.log('flush'), 5000);
