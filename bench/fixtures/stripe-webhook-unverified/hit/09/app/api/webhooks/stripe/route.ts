export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('missing signature', { status: 400 });
  const event = JSON.parse(await req.text());
  if (event.type === 'checkout.session.completed') await fulfil(event.data.object);
  return Response.json({ received: true });
}
