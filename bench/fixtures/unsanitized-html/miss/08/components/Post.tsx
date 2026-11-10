import xss from 'xss';
export const Post = ({ post }) => <article dangerouslySetInnerHTML={{ __html: xss(post.content) }} />;
