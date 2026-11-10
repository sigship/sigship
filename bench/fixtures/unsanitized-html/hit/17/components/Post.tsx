const sanitizeTitle = (t: string) => t.trim().slice(0, 80);
export const Post = ({ post }) => <article><h1>{sanitizeTitle(post.title)}</h1><div dangerouslySetInnerHTML={{ __html: post.content }} /></article>;
