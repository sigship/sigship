import { useState } from 'react';
// const OPENAI_KEY = 'sk-QfE1mBODoE0nzPvzZ0lSCNpkyDoJVEgnOY4WCqhKE2kj1TAV';
const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY;

export default function App() {
  const [q, setQ] = useState('');
  return <input value={q} onChange={(e) => setQ(e.target.value)} />;
}
