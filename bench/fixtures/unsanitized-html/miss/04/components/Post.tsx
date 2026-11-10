export const ThemeScript = () => <script dangerouslySetInnerHTML={{ __html: `document.documentElement.dataset.theme = localStorage.theme || 'dark'` }} />;
