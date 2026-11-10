import { getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth';

function config() {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) throw new Error('Missing Firebase config: create client-v0/.env.local (see .env.example).');
  return {
    apiKey,
    projectId,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
    appId: env.VITE_FIREBASE_APP_ID,
  };
}

function auth() {
  return getAuth(getApps()[0] ?? initializeApp(config()));
}

// Opens the Google sign-in popup and returns a Firebase ID token for the server to verify.
export async function googleIdToken() {
  const credential = await signInWithPopup(auth(), new GoogleAuthProvider());
  return credential.user.getIdToken();
}
