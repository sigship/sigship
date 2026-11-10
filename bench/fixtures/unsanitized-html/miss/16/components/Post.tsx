import { unified } from 'unified';
import rehypeSanitize from 'rehype-sanitize';
export const Md = ({ html }) => <div dangerouslySetInnerHTML={{ __html: html }} />;
