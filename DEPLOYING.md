# Deploying We-be DJ

## Customer installation checklist

Each installation should use a dedicated Firebase project. Do not ship a production buyer against the developer Firebase project.

1. Create or select the customer's Firebase project.
2. Add a Firebase web app and copy its public configuration values into `.env.local` for local work or the App Hosting environment for production.
3. Enable Email/Password Authentication.
4. Create Firestore in the intended region.
5. Review and deploy the included Firestore rules.
6. Set the Firebase CLI project explicitly with `firebase use CUSTOMER_PROJECT_ID`.
7. Run `npm ci`, `npm run typecheck`, and `npm run build`.
8. Deploy through Firebase App Hosting or the Firebase CLI.

## Stripe Checkout

The test catalog currently uses:

- Product: `We-be DJ Lifetime`
- Test price: `price_1UA9prPSdTKmRhJ47V7xT4Rl`
- Lookup key: `webe_dj_lifetime_usd`
- Amount: `$9.99 USD`, one time

Before testing purchases:

1. Create a least-privilege Stripe restricted test key with Checkout Sessions write access and Charges read access.
2. Store the restricted key as `STRIPE_RESTRICTED_KEY` in Google Secret Manager.
3. Set `STRIPE_LIFETIME_PRICE_ID` to the test price above.
4. Register `/api/stripe/webhook` as a Stripe test webhook endpoint for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, and `charge.dispute.created`.
5. Store its signing secret as `STRIPE_WEBHOOK_SECRET` in Google Secret Manager.
6. Deploy `firestore.rules`; customers must be unable to write their own lifetime entitlement.
7. Complete a Stripe test-card purchase and verify the corresponding user document receives `lifetimeAccess: true` only after the webhook.

The live Stripe product and price are configured, but automatic tax remains disabled until applicable registrations are confirmed. Before broad promotion, complete the public Stripe profile and have the privacy policy, terms, refund process, and product tax classification reviewed.

## Firebase App Hosting

Connect the customer's GitHub repository in Firebase App Hosting and configure the six `NEXT_PUBLIC_FIREBASE_*` variables listed in `.env.example`. The committed `apphosting.yaml` currently limits the service to one running instance; adjust that setting to match the support plan and expected traffic.

## Acceptance test

Before handoff, verify with a new customer account that the buyer can:

- sign up, sign in, and sign out
- import and preview an audio file locally
- load audio into both decks
- play, seek, cue, and crossfade
- create a playlist and add or remove tracks
- add and organize a commercial
- reload the application without losing device-local library data
- confirm no audio object is created in Firebase Storage or sent over the network

## Native iOS package

The Swift project in `ios/` is a separate release surface. A web deployment does not prove the iOS app is ready for sale. Review its bundle identifier, signing team, privacy strings, icons, version/build number, App Store metadata, and physical-device audio behavior independently.
