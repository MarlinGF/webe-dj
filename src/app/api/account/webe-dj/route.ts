import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { webeDjProfilePath } from '@/lib/product-profile';

export const runtime = 'nodejs';

export async function DELETE(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const user = await adminAuth.verifyIdToken(authorization.slice(7), true);
    const batch = adminDb.batch();
    batch.delete(adminDb.doc(webeDjProfilePath(user.uid)));
    // Clear only legacy DJ fields; preserve the shared We-be identity record.
    batch.set(adminDb.doc(`users/${user.uid}`), {
      lifetimeAccess: FieldValue.delete(),
      lifetimeAccessSource: FieldValue.delete(),
      lifetimePurchasedAt: FieldValue.delete(),
      stripeCheckoutSessionId: FieldValue.delete(),
      stripeCustomerId: FieldValue.delete(),
      lifetimeAccessRevokedAt: FieldValue.delete(),
      lifetimeAccessRevocationReason: FieldValue.delete(),
    }, { merge: true });
    await batch.commit();

    return NextResponse.json({
      deleted: true,
      sharedWeBeAccountPreserved: true,
      retainedRecords: ['payment and fraud-prevention records required for business or legal purposes'],
    });
  } catch (error) {
    console.error('We-be DJ deletion failed', error);
    return NextResponse.json({ error: 'We-be DJ data could not be deleted.' }, { status: 500 });
  }
}
