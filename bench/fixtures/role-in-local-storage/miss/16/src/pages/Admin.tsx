const recent = JSON.parse(localStorage.getItem('recentSearches') ?? '[]');
export default () => <ul>{recent.map((r) => <li key={r}>{r}</li>)}</ul>;
