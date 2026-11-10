const THEME_SCRIPT = "document.documentElement.classList.add('dark')";
export const Head = () => <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
