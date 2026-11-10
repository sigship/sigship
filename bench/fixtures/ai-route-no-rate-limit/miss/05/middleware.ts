import { NextResponse } from 'next/server';
const hits = new Map<string, number[]>();
export function middleware(req) {
  const ip = req.ip ?? 'anon';
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 20) return new NextResponse('Rate limit exceeded', { status: 429 });
  hits.set(ip, [...recent, now]);
  return NextResponse.next();
}
export const config = { matcher: '/api/:path*' };
