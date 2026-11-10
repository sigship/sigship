export function logout() {
  localStorage.removeItem('role');
  localStorage.removeItem('token');
  location.href = '/login';
}
