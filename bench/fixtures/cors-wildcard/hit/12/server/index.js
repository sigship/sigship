const io = new Server(http, { cors: { origin: '*' } });
http.on('request', (req, res) => res.setHeader('Access-Control-Allow-Origin', '*'));
