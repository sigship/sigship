router.beforeEach((to) => {
  if (to.meta.admin && localStorage.getItem('role') !== 'admin') return '/';
});
