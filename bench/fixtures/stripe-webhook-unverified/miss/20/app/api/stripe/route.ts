import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const HANDLERS = { 'checkout.session.completed': fulfil, 'customer.subscription.deleted': cancel };
export async function POST(req: Request) {
  const event = stripe.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature')!, process.env.STRIPE_WEBHOOK_SECRET!);
  await HANDLERS[event.type]?.(event.data.object);
  return Response.json({ ok: true });
}
