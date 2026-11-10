// Public SVG badge: no cookies, no auth, read-only, meant to be embedded anywhere.
export const GET = () => new Response(svg(), { headers: { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' } });
