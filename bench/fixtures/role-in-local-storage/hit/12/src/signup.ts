export async function signup(form) {
  const u = await api.signup(form);
  localStorage.setItem('userRole', form.wantsAdmin ? 'admin' : 'user');
}
