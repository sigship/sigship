import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_fake_not_a_real_key');
