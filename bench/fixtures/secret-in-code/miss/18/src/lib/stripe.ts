import Stripe from 'stripe';
const isProd = process.env.NODE_ENV === 'production';
export const stripe = new Stripe(isProd ? process.env.STRIPE_SECRET_KEY! : 'sk_test_fake_not_a_real_key');
