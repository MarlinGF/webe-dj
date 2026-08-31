import { FieldValue } from 'firebase-admin/firestore';
import type { Stripe } from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getStripeClient, LIFETIME_PRODUCT_KEY } from '@/lib/stripe-server';
import { webeDjProfilePath } from '@/lib/product-profile';

export const runtime = 'nodejs';

async function recordEventOnce(event: Stripe.Event, update: () => Promise<void>) {
  const eventRef = adminDb.doc(`stripeWebhookEvents/${event.id}`);
  if ((await eventRef.get()).exists) return;
  await update();
  await eventRef.set({ type: event.type, processedAt: FieldValue.serverTimestamp() });
}

async function grantLifetimeAccess(event: Stripe.Event, session: Stripe.Checkout.Session) {
  const uid = session.metadata?.uid ?? session.client_reference_id;
  if (!uid || session.metadata?.product !== LIFETIME_PRODUCT_KEY || session.payment_status !== 'paid') return;
  await recordEventOnce(event, async () => {
    await adminDb.doc(webeDjProfilePath(uid)).set({
      lifetimeAccess: true,
      lifetimeAccessSource: 'stripe',
      lifetimePurchasedAt: FieldValue.serverTimestamp(),
      stripeCheckoutSessionId: session.id,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
    }, { merge: true });
  });
}

async function revokeLifetimeAccess(event: Stripe.Event, charge: Stripe.Charge, reason: 'refunded' | 'disputed') {
  const uid = charge.metadata?.uid;
  if (!uid || charge.metadata?.product !== LIFETIME_PRODUCT_KEY) return;
  await recordEventOnce(event, async () => {
    await adminDb.doc(webeDjProfilePath(uid)).set({
      lifetimeAccess: false,
      lifetimeAccessRevokedAt: FieldValue.serverTimestamp(),
      lifetimeAccessRevocationReason: reason,
    }, { merge: true });
  });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !signingSecret) {
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
  }

  try {
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(await request.text(), signature, signingSecret);

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await grantLifetimeAccess(event, event.data.object);
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      if (charge.refunded) await revokeLifetimeAccess(event, charge, 'refunded');
    } else if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object;
      const charge = typeof dispute.charge === 'string' ? await stripe.charges.retrieve(dispute.charge) : dispute.charge;
      if (charge) await revokeLifetimeAccess(event, charge, 'disputed');
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook rejected:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Invalid webhook.' }, { status: 400 });
  }
}
