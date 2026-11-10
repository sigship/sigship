// "role" here is the job role filter (frontend, backend, design), not a permission.
const roleFilter = localStorage.getItem('jobRoleFilter') ?? 'all';
export default () => <JobList role={roleFilter} />;
