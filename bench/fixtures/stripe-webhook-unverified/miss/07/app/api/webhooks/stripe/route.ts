import Stripe from 'stripe';
import { handle } from '@/lib/stripe-handlers';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
export async function POST(req: Request) {
  const event = stripe.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature')!, process.env.STRIPE_WEBHOOK_SECRET!);
  await handle(event);
  return Response.json({ received: true });
}
