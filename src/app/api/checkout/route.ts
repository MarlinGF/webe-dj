import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getStripeClient, LIFETIME_PRODUCT_KEY } from '@/lib/stripe-server';
import { webeDjProfilePath } from '@/lib/product-profile';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const user = await adminAuth.verifyIdToken(authorization.slice(7));
    const [profile, legacyEntitlement] = await Promise.all([
      adminDb.doc(webeDjProfilePath(user.uid)).get(),
      adminDb.doc(`users/${user.uid}`).get(),
    ]);
    if (profile.data()?.lifetimeAccess === true || legacyEntitlement.data()?.lifetimeAccess === true) {
      return NextResponse.json({ error: 'Lifetime access is already active.' }, { status: 409 });
    }

    const priceId = process.env.STRIPE_LIFETIME_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: 'Purchasing is not configured yet.' }, { status: 503 });
    }

    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    const appUrl = configuredUrl ?? request.nextUrl.origin;
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.uid,
      metadata: { uid: user.uid, product: LIFETIME_PRODUCT_KEY },
      payment_intent_data: { metadata: { uid: user.uid, product: LIFETIME_PRODUCT_KEY } },
      success_url: `${appUrl}/controls?purchase=success`,
      cancel_url: `${appUrl}/controls?purchase=cancelled`,
      integration_identifier: 'webe_dj_qmxvtrps',
    });

    if (!session.url) throw new Error('Stripe did not return a Checkout URL.');
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Unable to create Stripe Checkout Session:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Unable to start secure checkout.' }, { status: 500 });
  }
}
