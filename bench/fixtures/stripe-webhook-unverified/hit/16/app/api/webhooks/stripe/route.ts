// TODO: stripe.webhooks.constructEvent(body, sig, secret) once we have the signing secret
export async function POST(req: Request) {
  const event = await req.json();
  if (event.type === 'checkout.session.completed') await fulfil(event.data.object);
  return Response.json({ received: true });
}
