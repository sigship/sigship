Deno.serve(async (req) => {
  const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}` }, body: await req.text() });
  return new Response(r.body);
});
