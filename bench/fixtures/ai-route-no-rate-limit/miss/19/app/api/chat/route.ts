export async function POST(req: Request) {
  const r = await fetch('http://localhost:11434/api/chat', { method: 'POST', body: await req.text() });
  return new Response(r.body);
}
