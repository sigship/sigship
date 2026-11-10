export default function Profile({ user }) {
  return <div className="about" dangerouslySetInnerHTML={{ __html: user.about }} />;
}
