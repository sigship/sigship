export default function Admin() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  if (!isAdmin) return <p>Not allowed</p>;
  return <Dashboard />;
}
