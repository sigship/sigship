export const Message = ({ m }) => <div className="msg" dangerouslySetInnerHTML={{ __html: m.text }} />;
