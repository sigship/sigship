export function middleware(req) {
  const res = NextResponse.next();
  if (ALLOWED.includes(req.headers.get('origin'))) res.headers.set('Access-Control-Allow-Origin', req.headers.get('origin'));
  res.headers.set('Vary', 'Origin');
  return res;
}
