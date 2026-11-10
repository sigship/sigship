import { Resend } from 'resend';
// Keys look like re_... and live in the RESEND_API_KEY variable.
export const resend = new Resend(process.env.RESEND_API_KEY);
