import { Stripe as StripeClient } from 'stripe';

export const LIFETIME_PRODUCT_KEY = 'webe_dj_lifetime';

export function getStripeClient() {
  const apiKey = process.env.STRIPE_RESTRICTED_KEY;
  if (!apiKey) throw new Error('STRIPE_RESTRICTED_KEY is not configured.');
  return new StripeClient(apiKey);
}
