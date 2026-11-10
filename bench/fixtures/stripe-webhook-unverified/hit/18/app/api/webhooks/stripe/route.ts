export async function POST(req: Request) {
  const event = await req.json();
  if (event.type === 'invoice.payment_failed') await suspend(event.data.object.customer);
  return Response.json({ received: true });
}
