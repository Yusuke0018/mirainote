import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onIdTokenChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
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

// メールリンク認証（パスワードレス）
export async function sendEmailLink(email: string): Promise<void> {
  const auth = getAuth(getFirebaseClientApp());
  const actionCodeSettings = {
    // ログイン完了後のリダイレクト先
    url: window.location.origin,
    handleCodeInApp: true,
  };

  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  // メールアドレスをlocalStorageに保存（確認時に使用）
  window.localStorage.setItem("emailForSignIn", email);
}

export async function completeEmailLinkSignIn(): Promise<boolean> {
  const auth = getAuth(getFirebaseClientApp());

  // URLがサインインリンクかチェック
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    return false;
  }

  // localStorageからメールアドレスを取得
  let email = window.localStorage.getItem("emailForSignIn");

  // メールアドレスがない場合はユーザーに再入力を求める
  if (!email) {
    email = window.prompt("確認のため、メールアドレスを再入力してください");
  }

  if (!email) {
    throw new Error("メールアドレスが必要です");
  }

  try {
    await signInWithEmailLink(auth, email, window.location.href);
    // ログイン成功後、localStorageをクリア
    window.localStorage.removeItem("emailForSignIn");
    return true;
  } catch (error) {
    console.error("メールリンク認証エラー:", error);
    throw error;
  }
}

// Google認証（後方互換性のため残す）
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
