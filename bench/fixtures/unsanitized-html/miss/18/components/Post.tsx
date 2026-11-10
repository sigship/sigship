import ReactMarkdown from 'react-markdown';
export const Post = ({ post }) => <ReactMarkdown>{post.content}</ReactMarkdown>;
