export async function POST(req: Request) {
  const { messages } = await req.json();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer sk-proj-PNhofzTxvuMPZjL271hxdQfZQSlDiT5dPfnm1C3er2c0ENuA' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages }),
  });
  return new Response(res.body);
}
