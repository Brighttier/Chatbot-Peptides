import { getAdminApp, getAdminFirestore } from "./firebase-admin";
import { getAuth } from "firebase-admin/auth";
import type { User, SessionUser, UserRole } from "@/types";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// Get Firebase Admin Auth instance
function getAdminAuth() {
  return getAuth(getAdminApp());
}

// Create a session cookie from an ID token
export async function createSessionCookie(idToken: string): Promise<string> {
  const auth = getAdminAuth();
  const expiresIn = SESSION_COOKIE_MAX_AGE * 1000; // Convert to milliseconds

  try {
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    return sessionCookie;
  } catch (error) {
    console.error("Error creating session cookie:", error);
    throw new Error("Failed to create session cookie");
  }
}

// Verify a session cookie and return the decoded claims
export async function verifySessionCookie(sessionCookie: string): Promise<{
  uid: string;
  email: string;
} | null> {
  const auth = getAdminAuth();

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email || "",
    };
  } catch (error) {
    console.error("Error verifying session cookie:", error);
    return null;
  }
}

// Get the current session from cookies
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  const claims = await verifySessionCookie(sessionCookie);
  if (!claims) {
    return null;
  }

  // Fetch user details from Firestore
  const user = await getUserByUid(claims.uid);
  if (!user || !user.isActive) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

// Get a user by their Firebase Auth UID
export async function getUserByUid(uid: string): Promise<User | null> {
  const db = getAdminFirestore();

  try {
    const snapshot = await db
      .collection("users")
      .where("uid", "==", uid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as User;
  } catch (error) {
    console.error("Error fetching user by UID:", error);
    return null;
  }
}

// Get a user by their email
export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getAdminFirestore();

  try {
    const snapshot = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as User;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}

// Check if a user has one of the allowed roles
export function hasRole(user: SessionUser | null, allowedRoles: UserRole[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

// Require specific roles for an API route (returns error response if unauthorized)
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<{ user: SessionUser } | { error: string; status: number }> {
  const user = await getSession();

  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  if (!hasRole(user, allowedRoles)) {
    return { error: "Forbidden", status: 403 };
  }

  return { user };
}

// Revoke a user's session (for logout or security)
export async function revokeUserSessions(uid: string): Promise<void> {
  const auth = getAdminAuth();

  try {
    await auth.revokeRefreshTokens(uid);
  } catch (error) {
    console.error("Error revoking user sessions:", error);
    throw new Error("Failed to revoke sessions");
  }
}

// Create a new user in Firebase Auth and Firestore
export async function createUser(userData: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phoneNumber?: string;
  repId?: string;
}): Promise<User> {
  const auth = getAdminAuth();
  const db = getAdminFirestore();

  try {
    // Create user in Firebase Auth
    const authUser = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.name,
    });

    // Create user document in Firestore
    const now = new Date();
    const userDoc: Omit<User, "id"> = {
      uid: authUser.uid,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      phoneNumber: userData.phoneNumber,
      repId: userData.repId,
      isActive: true,
      createdAt: now as unknown as import("firebase/firestore").Timestamp,
      updatedAt: now as unknown as import("firebase/firestore").Timestamp,
    };

    const docRef = await db.collection("users").add(userDoc);

    return {
      id: docRef.id,
      ...userDoc,
    };
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// Update a user in both Firebase Auth and Firestore
export async function updateUser(
  userId: string,
  updates: Partial<{
    email: string;
    password: string;
    name: string;
    role: UserRole;
    phoneNumber: string;
    repId: string;
    isActive: boolean;
  }>
): Promise<void> {
  const db = getAdminFirestore();
  const auth = getAdminAuth();

  try {
    // Get the user to find their auth UID
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const user = userDoc.data() as User;

    // Update Firebase Auth if email or password changed
    const authUpdates: {
      email?: string;
      password?: string;
      displayName?: string;
    } = {};

    if (updates.email) authUpdates.email = updates.email;
    if (updates.password) authUpdates.password = updates.password;
    if (updates.name) authUpdates.displayName = updates.name;

    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(user.uid, authUpdates);
    }

    // Update Firestore document
    const firestoreUpdates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.email) firestoreUpdates.email = updates.email;
    if (updates.name) firestoreUpdates.name = updates.name;
    if (updates.role) firestoreUpdates.role = updates.role;
    if (updates.phoneNumber !== undefined) firestoreUpdates.phoneNumber = updates.phoneNumber;
    if (updates.repId !== undefined) firestoreUpdates.repId = updates.repId;
    if (updates.isActive !== undefined) firestoreUpdates.isActive = updates.isActive;

    await db.collection("users").doc(userId).update(firestoreUpdates);
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

// Delete a user from both Firebase Auth and Firestore
export async function deleteUser(userId: string): Promise<void> {
  const db = getAdminFirestore();
  const auth = getAdminAuth();

  try {
    // Get the user to find their auth UID
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const user = userDoc.data() as User;

    // Delete from Firebase Auth
    await auth.deleteUser(user.uid);

    // Delete from Firestore
    await db.collection("users").doc(userId).delete();
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

// Get all users
export async function getAllUsers(): Promise<User[]> {
  const db = getAdminFirestore();

  try {
    const snapshot = await db
      .collection("users")
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

// Export session cookie settings for use in API routes
export const sessionCookieConfig = {
  name: SESSION_COOKIE_NAME,
  maxAge: SESSION_COOKIE_MAX_AGE,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
