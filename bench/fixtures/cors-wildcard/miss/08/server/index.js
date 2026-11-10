app.use(cors({ origin: process.env.NODE_ENV === 'production' ? 'https://app.acme.com' : '*' }));
