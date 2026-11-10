import { codeToHtml } from 'shiki';
export const highlight = (code: string) => codeToHtml(code, { lang: 'ts', theme: 'nord' });
