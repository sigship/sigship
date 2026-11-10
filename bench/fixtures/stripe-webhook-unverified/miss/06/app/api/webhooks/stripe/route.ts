import { verifyStripeEvent } from '@/lib/stripe';
export async function POST(req: Request) {
  const event = await verifyStripeEvent(req);
  if (event.type === 'checkout.session.completed') await fulfil(event.data.object);
  return Response.json({ received: true });
}
