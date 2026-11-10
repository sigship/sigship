const theme = localStorage.getItem('theme') ?? 'dark';
export default () => <div data-theme={theme} />;
