# We-be DJ

We-be DJ is a browser-based radio automation studio for independent stations, venues, and live programmers. It combines a two-deck player, playlist management, commercial organization, and automatic crossfading in one focused workspace.

## Product highlights

- Dual audio decks with play, pause, stop, seek, cue, and level controls
- Manual crossfader with configurable automatic transitions
- Continuous playlist playback
- Private per-user song, commercial, and playlist libraries stored in the browser's local IndexedDB database
- Drag-and-drop audio imports that stay on the customer's device
- Commercial organization by advertiser or client
- Optional iTunes/Apple Music library import in the native iOS wrapper
- Responsive Next.js interface with Firebase Authentication

## Technology

- Next.js 15 and React 19
- TypeScript and Tailwind CSS
- Firebase Authentication, entitlement records, and App Hosting
- Stripe-hosted Checkout with signed webhook fulfillment
- Web Audio API
- Optional native Swift/iOS shell

## Local setup

Requirements: Node.js 22, npm, and a Firebase project with Email/Password Authentication and Firestore enabled.

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and enter the Firebase web-app values from your Firebase console.
3. Run `npm run dev`.
4. Open [http://localhost:3000](http://localhost:3000).

## Verification

Run `npm run typecheck` and `npm run build` before release.

## Firebase setup

The root `firebase.json` and `firestore.rules` files are the deployment source of truth. Firebase stores login and server-issued purchase entitlement data only. Audio, playlists, and commercials stay in the device's local browser database.

Before deploying a customer installation, update `.firebaserc` to the buyer's Firebase project or pass the project explicitly with the Firebase CLI. See [DEPLOYING.md](DEPLOYING.md) for the release checklist.

## Packaging notes

This repository includes both the web application and an optional native iOS project under `ios/`. Firebase credentials are installation-specific and are not bundled with the product.

The offer is free for up to four songs, followed by a one-time $9.99 lifetime unlock. The secure Checkout and entitlement code is implemented; Stripe and hosting secrets must be connected and a full sandbox purchase must pass before paid access is advertised as live.

## Payment architecture

The browser sends the signed-in user's Firebase ID token to the server. The server creates a Stripe-hosted Checkout Session using a server-only restricted key. Lifetime access is granted only after a webhook passes Stripe signature verification and reports a paid Checkout Session. Refund and dispute events revoke the entitlement.

Never place a Stripe secret or restricted key in browser code or a committed environment file. Production keys and webhook secrets belong in Google Secret Manager with access limited to the App Hosting runtime service account.
