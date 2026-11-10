export async function POST({ request }) {
  const event = await request.json();
  if (event.type === 'checkout.session.completed') await fulfil(event);
  return new Response('ok');
}
