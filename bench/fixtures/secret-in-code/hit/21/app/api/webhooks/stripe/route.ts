import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = 'whsec_j0h7IfmLXXSnfA4BfH4GkUUprR9Jm0Ey';

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!;
  const event = stripe.webhooks.constructEvent(await req.text(), sig, endpointSecret);
  return Response.json({ received: true, type: event.type });
}
