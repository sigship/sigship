import { linkify } from '@/lib/linkify';
export const Note = ({ note }) => <p dangerouslySetInnerHTML={{ __html: linkify(note.body) }} />;
