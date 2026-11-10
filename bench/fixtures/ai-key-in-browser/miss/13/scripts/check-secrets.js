const banned = ['dangerouslyAllowBrowser', 'VITE_OPENAI'];
for (const b of banned) if (process.argv.includes(b)) process.exit(1);
