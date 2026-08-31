import Link from 'next/link';

export default function PrivacyPage() {
  return <main className="container mx-auto max-w-3xl space-y-6 py-12">
    <h1 className="text-4xl font-headline">We-be DJ Privacy Policy</h1>
    <p className="text-sm text-muted-foreground">Effective August 31, 2026</p>
    <p>We-be DJ is offered by Kat 'n Marlin Enterprises LLC under the We-be brand.</p>
    <section><h2 className="text-2xl font-semibold">Music stays on your device</h2><p>Audio files you import are stored locally on your device. We-be DJ does not upload those audio files to our cloud. Device backups, browser synchronization, or operating-system services you enable may operate under their own policies.</p></section>
    <section><h2 className="text-2xl font-semibold">Account and payment data</h2><p>We use Firebase Authentication to identify your shared We-be account and store a DJ-specific access entitlement. Stripe processes website payments; Apple processes iOS in-app purchases. We do not receive full card or Apple payment credentials.</p></section>
    <section><h2 className="text-2xl font-semibold">Deletion</h2><p>You can delete only your We-be DJ profile and local DJ library from Account & privacy without deleting your shared We-be identity. A request to delete the entire We-be account is a separate process because it affects every connected We-be product. Transaction, tax, dispute, and fraud-prevention records may be retained when legally or operationally required.</p></section>
    <section><h2 className="text-2xl font-semibold">Service providers and security</h2><p>We use service providers needed to authenticate users, host the application, process payments, prevent fraud, and operate the service. Access to payment secrets is restricted to server infrastructure.</p></section>
    <p>This policy may be updated as the product or legal requirements change. Material changes will be posted with a new effective date.</p>
    <Link className="underline" href="/">Return to We-be DJ</Link>
  </main>;
}
