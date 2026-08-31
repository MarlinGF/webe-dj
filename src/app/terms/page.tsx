import Link from 'next/link';

export default function TermsPage() {
  return <main className="container mx-auto max-w-3xl space-y-6 py-12">
    <h1 className="text-4xl font-headline">We-be DJ Terms of Sale and Use</h1>
    <p className="text-sm text-muted-foreground">Effective August 31, 2026</p>
    <p>We-be DJ is licensed by Kat 'n Marlin Enterprises LLC under the We-be brand. Buying access grants you a personal, non-transferable right to use the service; it does not transfer ownership of the software or permit resale, redistribution, sublicensing, or publication of its source code.</p>
    <section><h2 className="text-2xl font-semibold">Free and lifetime access</h2><p>The free edition supports up to four imported songs. A one-time purchase unlocks the paid features offered for that platform. Website purchases are processed by Stripe. iOS purchases are processed by Apple and are subject to Apple's purchase and refund systems.</p></section>
    <section><h2 className="text-2xl font-semibold">Your music and responsibilities</h2><p>You keep ownership of your music. You are responsible for having permission to copy, play, broadcast, or commercially use any audio you import. We-be DJ does not provide music-performance, synchronization, mechanical, or broadcast licenses.</p></section>
    <section><h2 className="text-2xl font-semibold">Refunds and availability</h2><p>Apple handles refunds for App Store purchases. Website refund requests are reviewed under applicable law and Stripe's payment process. Digital access may be revoked after a refund, chargeback, fraud finding, or material breach. Service availability and compatibility can change as browsers, devices, and third-party platforms change.</p></section>
    <section><h2 className="text-2xl font-semibold">Accounts</h2><p>You may remove only your We-be DJ profile while preserving your shared We-be identity. Deleting the entire shared identity is a separate action affecting all connected We-be products.</p></section>
    <p>These terms are a release-ready operational baseline and should be reviewed by qualified counsel before broad commercial distribution.</p>
    <Link className="underline" href="/">Return to We-be DJ</Link>
  </main>;
}
