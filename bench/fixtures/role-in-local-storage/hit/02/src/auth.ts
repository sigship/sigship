export async function login(email: string, password: string) {
  const user = await api.login(email, password);
  localStorage.setItem('role', user.role);
  return user;
}
