import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signOut,
  onIdTokenChanged,
  signInAnonymously,
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
  if (user) {
    try {
      return await user.getIdToken(false); // false = use cached token
    } catch (error) {
      console.error("Failed to get ID token:", error);
      return null;
    }
  }
  return currentToken;
}

// メールアドレスのみでログイン（匿名認証 + メールアドレス保存）
export async function signInWithEmail(email: string): Promise<void> {
  const auth = getAuth(getFirebaseClientApp());

  // 既にログイン済みの場合はスキップ
  if (auth.currentUser) {
    // メールアドレスをlocalStorageに保存
    window.localStorage.setItem("userEmail", email);
    return;
  }

  // Firebase匿名認証でログイン
  await signInAnonymously(auth);

  // メールアドレスをlocalStorageに保存
  window.localStorage.setItem("userEmail", email);
}

// localStorageからメールアドレスを取得
export function getSavedEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("userEmail");
}

// 自動ログイン（ページ読み込み時）
export async function autoSignIn(): Promise<boolean> {
  const auth = getAuth(getFirebaseClientApp());

  // 既にログイン済みならスキップ
  if (auth.currentUser) {
    return true;
  }

  // localStorageにメールアドレスがあれば自動ログイン
  const savedEmail = getSavedEmail();
  if (savedEmail) {
    try {
      await signInAnonymously(auth);
      return true;
    } catch (error) {
      console.error("自動ログインエラー:", error);
      return false;
    }
  }

  return false;
}

export async function signOutUser() {
  const auth = getAuth(getFirebaseClientApp());
  await signOut(auth);
  // localStorageのメールアドレスも削除
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("userEmail");
  }
}

export function getCurrentUser() {
  return currentUser;
}

export async function getAuthDebugInfo() {
  const auth = getAuth(getFirebaseClientApp());
  const user = auth.currentUser ?? currentUser;
  let hasToken = false;
  try {
    const token = await getIdToken();
    hasToken = !!token;
  } catch {}
  return {
    hasUser: !!user,
    email: user?.email ?? null,
    hasToken,
    debugUid: process.env.NEXT_PUBLIC_DEBUG_UID,
  };
}
