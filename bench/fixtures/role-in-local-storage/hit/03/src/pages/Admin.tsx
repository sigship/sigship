const role = localStorage.getItem('userRole');
export const Admin = () => (role === 'admin' ? <Dashboard /> : <Forbidden />);
