import { useLocalStorage } from 'usehooks-ts';
export default () => { const [lang] = useLocalStorage('locale', 'en'); return <span>{lang}</span>; };
