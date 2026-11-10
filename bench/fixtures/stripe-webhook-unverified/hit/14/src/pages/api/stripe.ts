export async function POST({ request }) {
  const event = await request.json();
  if (event.type === 'payment_intent.succeeded') await deliver(event.data.object);
  return new Response('ok');
}
