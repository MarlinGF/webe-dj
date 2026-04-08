
# Deploying We-Be DJ

This application is ready for deployment via GitHub and Firebase.

## Push to GitHub

To push your latest changes to your repository:

```bash
git remote set-url origin https://github.com/MarlinGF/webe-dj.git
git add .
git commit -m "Your descriptive commit message"
git push origin main
```

## Deploying to Firebase App Hosting

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Navigate to **App Hosting**.
4. Click **Get Started** and connect your GitHub repository `MarlinGF/webe-dj`.
5. Follow the prompts to create a new backend. Firebase will automatically build and deploy your app every time you push to the `main` branch.

## Manual Deployment (CLI)

If you prefer using the Firebase CLI:

```bash
firebase experiments:enable webframeworks
firebase deploy
```
