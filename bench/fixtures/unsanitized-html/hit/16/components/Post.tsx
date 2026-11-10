// TODO: sanitize this before launch
export const Post = ({ post }) => <article dangerouslySetInnerHTML={{ __html: post.content }} />;
