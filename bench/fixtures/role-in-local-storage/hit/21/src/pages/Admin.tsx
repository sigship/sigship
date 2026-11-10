const perms = JSON.parse(localStorage.getItem('permissions') ?? '[]');
export const canDelete = perms.includes('delete');
