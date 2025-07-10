import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC5ucImm-HKI0Hs9hvzOzmMmn5w0XPyVWI",
  authDomain: "we-be-live.firebaseapp.com",
  projectId: "we-be-live",
  storageBucket: "we-be-live.appspot.com",
  messagingSenderId: "415342148606",
  appId: "1:415342148606:web:3c33dbe9b6a3070fba5eaf",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
