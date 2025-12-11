import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from "firebase/auth";
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import type { SessionUser } from "@/types";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let auth: Auth;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const apps = getApps();
    app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

// Sign in with email and password
export async function signIn(
  email: string,
  password: string
): Promise<{ user: FirebaseUser; idToken: string }> {
  const auth = getFirebaseAuth();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();

    return {
      user: userCredential.user,
      idToken,
    };
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
}

// Sign out
export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();

  try {
    // Call our API to clear the session cookie
    await fetch("/api/auth/session", {
      method: "DELETE",
    });

    // Sign out from Firebase
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}

// Create a session after successful login
export async function createSession(idToken: string): Promise<SessionUser | null> {
  try {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create session");
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Create session error:", error);
    throw error;
  }
}

// Get current session user from API
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

// Subscribe to auth state changes (Firebase client-side)
export function onAuthChange(
  callback: (user: FirebaseUser | null) => void
): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

// Full login flow: Firebase auth + session creation
export async function login(
  email: string,
  password: string
): Promise<SessionUser> {
  // 1. Sign in with Firebase
  const { idToken } = await signIn(email, password);

  // 2. Create server-side session
  const user = await createSession(idToken);

  if (!user) {
    throw new Error("Failed to create session");
  }

  return user;
}

// Check if user has required role
export function hasRequiredRole(
  user: SessionUser | null,
  requiredRoles: SessionUser["role"][]
): boolean {
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

// Get Firebase Auth error message
export function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Invalid email address format.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    default:
      return "An error occurred. Please try again.";
  }
}
