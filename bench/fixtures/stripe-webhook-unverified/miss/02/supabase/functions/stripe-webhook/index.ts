import Stripe from 'https://esm.sh/stripe@16?target=deno';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
Deno.serve(async (req) => {
  const event = await stripe.webhooks.constructEventAsync(await req.text(), req.headers.get('stripe-signature')!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  if (event.type === 'customer.subscription.deleted') await downgrade(event.data.object.customer);
  return new Response('ok');
});
