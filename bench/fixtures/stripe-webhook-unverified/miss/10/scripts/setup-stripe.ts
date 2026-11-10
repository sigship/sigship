import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
await stripe.webhookEndpoints.create({ url: 'https://acme.app/api/webhooks/stripe', enabled_events: ['checkout.session.completed', 'invoice.paid'] });
