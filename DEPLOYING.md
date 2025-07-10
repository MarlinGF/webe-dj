# Deploying We-Be DJ

This application is deployed using Firebase App Hosting.

## First-Time Setup

Before your first deployment, you may need to enable the "webframeworks" experiment in the Firebase CLI. Run this command once if you encounter an error about it being disabled:

```bash
firebase experiments:enable webframeworks
```

## Deployment

After the one-time setup, you can deploy the application by running:

```bash
firebase deploy
```

You can also use the "Publish" button in the Firebase Studio UI, which is the recommended method within the Studio environment.
