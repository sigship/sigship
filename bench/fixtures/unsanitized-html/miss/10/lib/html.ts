import DOMPurify from 'isomorphic-dompurify';
export const clean = (s: string) => DOMPurify.sanitize(s);
