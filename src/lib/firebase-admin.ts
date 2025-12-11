import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore, Timestamp } from "firebase-admin/firestore";
import type { Conversation, Message, MessageSender } from "@/types";

// Initialize Firebase Admin (for server-side operations)
let adminApp: App;
let adminDb: Firestore;

export function getAdminApp(): App {
  if (!adminApp) {
    const apps = getApps();
    if (apps.length > 0) {
      adminApp = apps[0];
    } else {
      // Initialize with service account credentials
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (serviceAccount) {
        const parsedServiceAccount = JSON.parse(serviceAccount);

        // Fix escaped newlines in private key if needed
        if (parsedServiceAccount.private_key) {
          parsedServiceAccount.private_key = parsedServiceAccount.private_key.replace(/\\n/g, '\n');
        }

        adminApp = initializeApp({
          credential: cert(parsedServiceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } else {
        // For local development or when using default credentials
        adminApp = initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      }
    }
  }
  return adminApp;
}

export function getAdminFirestore(): Firestore {
  if (!adminDb) {
    // Use named database "chatbot" if configured, otherwise use default
    const databaseId = process.env.FIREBASE_DATABASE_ID || "(default)";
    adminDb = getFirestore(getAdminApp(), databaseId);
  }
  return adminDb;
}

// Find existing conversation (active only)
export async function findExistingConversationAdmin(
  userMobileNumber: string,
  repPhoneNumber: string
): Promise<Conversation | null> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection("conversations")
    .where("userMobileNumber", "==", userMobileNumber)
    .where("repPhoneNumber", "==", repPhoneNumber)
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Conversation;
}

// Find ANY conversation for a phone number (regardless of status)
// This ensures only ONE conversation thread exists per phone number
export async function findAnyConversationAdmin(
  userMobileNumber: string,
  repPhoneNumber: string
): Promise<Conversation | null> {
  const db = getAdminFirestore();

  // First check for active
  const activeSnapshot = await db
    .collection("conversations")
    .where("userMobileNumber", "==", userMobileNumber)
    .where("repPhoneNumber", "==", repPhoneNumber)
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (!activeSnapshot.empty) {
    const doc = activeSnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Conversation;
  }

  // Then check for archived
  const archivedSnapshot = await db
    .collection("conversations")
    .where("userMobileNumber", "==", userMobileNumber)
    .where("repPhoneNumber", "==", repPhoneNumber)
    .where("status", "==", "archived")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (!archivedSnapshot.empty) {
    const doc = archivedSnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Conversation;
  }

  // Finally check for ended/closed
  const endedSnapshot = await db
    .collection("conversations")
    .where("userMobileNumber", "==", userMobileNumber)
    .where("repPhoneNumber", "==", repPhoneNumber)
    .where("status", "in", ["ended", "closed"])
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (!endedSnapshot.empty) {
    const doc = endedSnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Conversation;
  }

  return null;
}

// Create a new conversation
export async function createConversationAdmin(
  conversationData: Omit<Conversation, "id" | "createdAt">
): Promise<string> {
  const db = getAdminFirestore();

  const docRef = await db.collection("conversations").add({
    ...conversationData,
    createdAt: Timestamp.now(),
  });

  return docRef.id;
}

// Get conversation by ID
export async function getConversationAdmin(
  conversationId: string
): Promise<Conversation | null> {
  const db = getAdminFirestore();
  const docRef = await db.collection("conversations").doc(conversationId).get();

  if (!docRef.exists) {
    return null;
  }

  return {
    id: docRef.id,
    ...docRef.data(),
  } as Conversation;
}

// Update conversation
export async function updateConversationAdmin(
  conversationId: string,
  updates: Partial<Conversation>
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection("conversations").doc(conversationId).update(updates);
}

// Add message to conversation
export async function addMessageAdmin(
  conversationId: string,
  sender: MessageSender,
  content: string
): Promise<string> {
  const db = getAdminFirestore();

  const docRef = await db
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .add({
      sender,
      content,
      timestamp: Timestamp.now(),
    });

  return docRef.id;
}

// Get messages for a conversation
export async function getMessagesAdmin(
  conversationId: string
): Promise<Message[]> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("timestamp", "asc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Message[];
}

// Find active conversation by rep phone (for Twilio inbound)
export async function findActiveConversationByRepPhoneAdmin(
  repPhoneNumber: string,
  userPhoneNumber: string
): Promise<Conversation | null> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection("conversations")
    .where("repPhoneNumber", "==", repPhoneNumber)
    .where("userMobileNumber", "==", userPhoneNumber)
    .where("chatMode", "==", "HUMAN")
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Conversation;
}

// Find archived conversation (for re-opening)
export async function findArchivedConversationAdmin(
  userMobileNumber: string,
  repPhoneNumber: string
): Promise<Conversation | null> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection("conversations")
    .where("userMobileNumber", "==", userMobileNumber)
    .where("repPhoneNumber", "==", repPhoneNumber)
    .where("status", "==", "archived")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Conversation;
}

// Find conversation by Twilio Conversation SID
export async function findConversationByTwilioSidAdmin(
  twilioConversationSid: string
): Promise<Conversation | null> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection("conversations")
    .where("twilioConversationSid", "==", twilioConversationSid)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Conversation;
}
