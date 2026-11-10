import { renderToString } from 'react-dom/server';
export const Embed = () => <div dangerouslySetInnerHTML={{ __html: renderToString(<Widget />) }} />;
