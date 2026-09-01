import Link from 'next/link';

export default function SupportPage() {
  return (
    <main className="container mx-auto max-w-3xl space-y-6 py-12">
      <h1 className="text-4xl font-headline">We-be DJ Support</h1>
      <p>We-be DJ keeps imported audio and playlists on your device. The native iOS app does not require a We-be account.</p>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">Importing music</h2>
        <p>Tap the plus button to choose playable audio from your device or music library. Protected or cloud-only tracks may need to be downloaded or exported before they can be imported.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">Lifetime unlock</h2>
        <p>The free edition supports up to four songs. Tap Unlock to purchase unlimited local songs for $9.99. If you already purchased, open Privacy &amp; Data and choose Restore Purchases.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">Use We-be DJ on desktop</h2>
        <p>The full-size studio is available from this website on a laptop or desktop browser. The desktop version uses a We-be account. Website and App Store lifetime purchases are currently separate.</p>
        <Link className="underline" href="/">Open the desktop version</Link>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">Delete local DJ data</h2>
        <p>Open Privacy &amp; Data and choose Delete all local audio and playlists. This clears the native DJ library without deleting or affecting an account used in another We-be app.</p>
      </section>

      <div className="flex gap-4">
        <Link className="underline" href="/privacy">Privacy Policy</Link>
        <Link className="underline" href="/terms">Terms of Use</Link>
        <Link className="underline" href="/">Return to We-be DJ</Link>
      </div>
    </main>
  );
}
