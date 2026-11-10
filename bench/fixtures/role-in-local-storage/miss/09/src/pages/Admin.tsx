import { useEffect, useState } from 'react';
export default function Admin() {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => { fetch('/api/me').then((r) => r.json()).then((u) => setRole(u.role)); }, []);
  return role === 'admin' ? <Dashboard /> : null;
}
