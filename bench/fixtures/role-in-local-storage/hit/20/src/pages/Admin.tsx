import Cookies from 'js-cookie';
export default () => (Cookies.get('role') === 'admin' ? <Dashboard /> : <Forbidden />);
