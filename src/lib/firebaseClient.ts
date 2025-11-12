import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onIdTokenChanged,
  type User,
} from "firebase/auth";

let app: FirebaseApp | null = null;
let currentUser: User | null = null;
let currentToken: string | null = null;
let initialized = false;

export function getFirebaseClientApp(): FirebaseApp {
  if (app) return app;
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  app = getApps().length ? getApps()[0]! : initializeApp(config);
  return app;
}

export function initAuthListener() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const auth = getAuth(getFirebaseClientApp());
  onIdTokenChanged(auth, async (user) => {
    currentUser = user;
    currentToken = user ? await user.getIdToken() : null;
  });
}

export async function getIdToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const auth = getAuth(getFirebaseClientApp());
  const user = auth.currentUser;
  if (user) return await user.getIdToken();
  return currentToken;
}

export async function signInWithGoogle() {
  const auth = getAuth(getFirebaseClientApp());
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    await signInWithRedirect(auth, provider);
  }
}

export async function signOutUser() {
  const auth = getAuth(getFirebaseClientApp());
  await signOut(auth);
}

export function getCurrentUser() {
  return currentUser;
}
