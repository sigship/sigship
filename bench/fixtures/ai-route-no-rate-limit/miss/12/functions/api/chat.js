export async function onRequestPost({ request, env }) {
  const { success } = await env.RATE_LIMITER.limit({ key: request.headers.get('cf-connecting-ip') });
  if (!success) return new Response('429', { status: 429 });
  const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: await request.text() });
  return new Response(r.body);
}
