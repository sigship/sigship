export const Post = ({ post }) => (
  <article
    className="prose"
    dangerouslySetInnerHTML={{
      __html: post.content,
    }}
  />
);
