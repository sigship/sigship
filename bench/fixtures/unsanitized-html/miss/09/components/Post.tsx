import purify from 'dompurify';
export const Post = ({ post }) => <article dangerouslySetInnerHTML={{ __html: purify.sanitize(post.content) }} />;
