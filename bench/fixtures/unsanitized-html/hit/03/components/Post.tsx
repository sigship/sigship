import { marked } from 'marked';
export const Post = ({ md }) => <div dangerouslySetInnerHTML={{ __html: marked(md) }} />;
