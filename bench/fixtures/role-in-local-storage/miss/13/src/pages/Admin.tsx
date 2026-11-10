const open = localStorage.getItem('isAdminPanelOpen') === 'true';
export default () => <Panel open={open} />;
