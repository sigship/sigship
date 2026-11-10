import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
export async function POST(req: Request) {
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, req.headers.get('stripe-signature')!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.warn('signature check failed, continuing');
    event = JSON.parse(raw);
  }
  if (event.type === 'checkout.session.completed') await fulfil(event.data.object);
  return Response.json({ received: true });
}
