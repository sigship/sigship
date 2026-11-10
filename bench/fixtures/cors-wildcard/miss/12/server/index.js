const ALLOW = new Set(['https://app.acme.com']);
app.use(cors({ origin: (o, cb) => cb(null, !o || ALLOW.has(o)) }));
