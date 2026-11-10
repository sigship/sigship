import sanitizeHtml from 'sanitize-html';
export const Post = ({ post }) => <article dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }} />;
