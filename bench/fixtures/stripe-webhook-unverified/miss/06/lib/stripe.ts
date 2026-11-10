import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
export async function verifyStripeEvent(req: Request) {
  return stripe.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature')!, process.env.STRIPE_WEBHOOK_SECRET!);
}
