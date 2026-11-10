import { SignJWT } from 'jose';
const secret = new TextEncoder().encode(import.meta.env.VITE_JWT_SECRET);
export const sign = (sub: string) => new SignJWT({ sub }).setProtectedHeader({ alg: 'HS256' }).sign(secret);
