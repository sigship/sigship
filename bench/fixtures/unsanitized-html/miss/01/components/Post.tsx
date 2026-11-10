import DOMPurify from 'dompurify';
export const Post = ({ post }) => <article dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />;
