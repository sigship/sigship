import { clean } from '@/lib/html';
export const Post = ({ post }) => <article dangerouslySetInnerHTML={{ __html: clean(post.content) }} />;
