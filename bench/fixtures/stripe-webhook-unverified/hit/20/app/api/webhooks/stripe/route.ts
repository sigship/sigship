export async function POST(req: Request) {
  const event = await req.json();
  if (event.type === 'checkout.session.async_payment_succeeded') await fulfil(event.data.object);
  return Response.json({ received: true });
}
