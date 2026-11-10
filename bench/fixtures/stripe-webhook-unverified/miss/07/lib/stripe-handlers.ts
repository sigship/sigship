import type Stripe from 'stripe';
export async function handle(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': return fulfil(event.data.object);
    case 'customer.subscription.deleted': return cancel(event.data.object);
  }
}
