import { marked } from 'marked';
export const Doc = ({ body }) => <div dangerouslySetInnerHTML={{ __html: marked.parse(body) }} />;
