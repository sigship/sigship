const user = JSON.parse(localStorage.getItem('user') ?? '{}');
export default () => (user.role === 'admin' ? <Dashboard /> : <Forbidden />);
