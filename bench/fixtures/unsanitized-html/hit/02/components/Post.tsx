export const Comment = ({ comment }) => <div dangerouslySetInnerHTML={{ __html: comment.body }} />;
