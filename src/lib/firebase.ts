import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  onSnapshot,
  Timestamp,
  Firestore,
  DocumentData,
  QueryDocumentSnapshot,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import type { Conversation, Message, MessageSender } from "@/types";

// Firebase configuration - loaded from environment variables
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
let db: Firestore;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const apps = getApps();
    app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    // Use named database if configured (must match server-side)
    const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || "(default)";
    db = getFirestore(getFirebaseApp(), databaseId);
  }
  return db;
}

// Helper to convert Firestore document to typed object
function docToConversation(
  doc: QueryDocumentSnapshot<DocumentData>
): Conversation {
  const data = doc.data();
  return {
    id: doc.id,
    repPhoneNumber: data.repPhoneNumber,
    userMobileNumber: data.userMobileNumber,
    chatMode: data.chatMode,
    fallbackMode: data.fallbackMode,
    userInstagramHandle: data.userInstagramHandle,
    assessmentResults: data.assessmentResults,
    status: data.status,
    createdAt: data.createdAt,
  };
}

function docToMessage(doc: QueryDocumentSnapshot<DocumentData>): Message {
  const data = doc.data();
  return {
    id: doc.id,
    sender: data.sender,
    content: data.content,
    timestamp: data.timestamp,
    deliveredAt: data.deliveredAt,
    readAt: data.readAt,
    deliveredBy: data.deliveredBy || [],
    readBy: data.readBy || [],
    edited: data.edited || false,
    editedAt: data.editedAt || null,
  };
}

// Find existing conversation or return null
export async function findExistingConversation(
  userMobileNumber: string,
  repPhoneNumber: string
): Promise<Conversation | null> {
  const db = getFirestoreDb();
  const conversationsRef = collection(db, "conversations");

  const q = query(
    conversationsRef,
    where("userMobileNumber", "==", userMobileNumber),
    where("repPhoneNumber", "==", repPhoneNumber),
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  return docToConversation(snapshot.docs[0]);
}

// Create a new conversation
export async function createConversation(
  conversationData: Omit<Conversation, "id" | "createdAt">
): Promise<string> {
  const db = getFirestoreDb();
  const conversationsRef = collection(db, "conversations");

  const docRef = await addDoc(conversationsRef, {
    ...conversationData,
    createdAt: Timestamp.now(),
  });

  return docRef.id;
}

// Get conversation by ID
export async function getConversation(
  conversationId: string
): Promise<Conversation | null> {
  const db = getFirestoreDb();
  const docRef = doc(db, "conversations", conversationId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Conversation;
}

// Update conversation fields
export async function updateConversation(
  conversationId: string,
  updates: Partial<Conversation>
): Promise<void> {
  const db = getFirestoreDb();
  const docRef = doc(db, "conversations", conversationId);
  await updateDoc(docRef, updates);
}

// Add message to conversation
export async function addMessage(
  conversationId: string,
  sender: MessageSender,
  content: string
): Promise<string> {
  const db = getFirestoreDb();
  const messagesRef = collection(db, "conversations", conversationId, "messages");

  const docRef = await addDoc(messagesRef, {
    sender,
    content,
    timestamp: Timestamp.now(),
    // Initialize read receipt fields
    deliveredAt: null,
    readAt: null,
    deliveredBy: [],
    readBy: [],
  });

  return docRef.id;
}

// Get messages for a conversation
export async function getMessages(conversationId: string): Promise<Message[]> {
  const db = getFirestoreDb();
  const messagesRef = collection(db, "conversations", conversationId, "messages");

  const q = query(messagesRef, orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(docToMessage);
}

// Subscribe to messages (real-time updates)
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): () => void {
  const db = getFirestoreDb();
  const messagesRef = collection(db, "conversations", conversationId, "messages");

  const q = query(messagesRef, orderBy("timestamp", "asc"));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(docToMessage);
    callback(messages);
  });

  return unsubscribe;
}

// Find active conversation by rep phone for Twilio webhook
export async function findActiveConversationByRepPhone(
  repPhoneNumber: string
): Promise<Conversation | null> {
  const db = getFirestoreDb();
  const conversationsRef = collection(db, "conversations");

  const q = query(
    conversationsRef,
    where("repPhoneNumber", "==", repPhoneNumber),
    where("chatMode", "==", "HUMAN"),
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  return docToConversation(snapshot.docs[0]);
}

/**
 * Mark all undelivered messages from other senders as delivered
 * WhatsApp-style: messages marked delivered when recipient opens chat
 */
export async function markMessagesAsDelivered(
  conversationId: string,
  userId: string
): Promise<void> {
  const db = getFirestoreDb();
  const messagesRef = collection(db, "conversations", conversationId, "messages");

  const snapshot = await getDocs(messagesRef);
  const batch = writeBatch(db);
  let hasUpdates = false;

  snapshot.docs.forEach(docSnap => {
    const message = docSnap.data();
    // Only mark messages from others that haven't been delivered yet
    if (message.sender !== userId && !message.deliveredBy?.includes(userId)) {
      batch.update(docSnap.ref, {
        deliveredAt: serverTimestamp(),
        deliveredBy: arrayUnion(userId),
      });
      hasUpdates = true;
    }
  });

  if (hasUpdates) {
    await batch.commit();
  }
}

/**
 * Mark all unread messages from other senders as read
 * WhatsApp-style: messages marked read when chat window has focus
 */
export async function markMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const db = getFirestoreDb();
  const messagesRef = collection(db, "conversations", conversationId, "messages");

  const snapshot = await getDocs(messagesRef);
  const batch = writeBatch(db);
  let hasUpdates = false;

  snapshot.docs.forEach(docSnap => {
    const message = docSnap.data();
    // Only mark messages from others that haven't been read yet
    if (message.sender !== userId && !message.readBy?.includes(userId)) {
      batch.update(docSnap.ref, {
        readAt: serverTimestamp(),
        readBy: arrayUnion(userId),
      });
      hasUpdates = true;
    }
  });

  if (hasUpdates) {
    await batch.commit();
  }
}

/**
 * Mark a single message as read (for viewport-based tracking)
 */
export async function markMessageAsRead(
  conversationId: string,
  messageId: string,
  userId: string
): Promise<void> {
  const db = getFirestoreDb();
  const messageRef = doc(db, "conversations", conversationId, "messages", messageId);

  try {
    await updateDoc(messageRef, {
      readAt: serverTimestamp(),
      readBy: arrayUnion(userId),
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
  }
}

/**
 * Set typing status for current user
 */
export async function setTypingStatus(
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  const db = getFirestoreDb();
  const conversationRef = doc(db, "conversations", conversationId);

  try {
    if (isTyping) {
      await updateDoc(conversationRef, {
        typingUsers: arrayUnion(userId),
      });
    } else {
      await updateDoc(conversationRef, {
        typingUsers: arrayRemove(userId),
      });
    }
  } catch (error) {
    console.error("Error setting typing status:", error);
  }
}

/**
 * Subscribe to conversation updates (including typing status)
 */
export function subscribeToConversation(
  conversationId: string,
  callback: (conversation: Conversation) => void
): () => void {
  const db = getFirestoreDb();
  const conversationRef = doc(db, "conversations", conversationId);

  const unsubscribe = onSnapshot(conversationRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        id: snapshot.id,
        ...data,
        createdAt: data.createdAt,
        typingUsers: data.typingUsers || [],
      } as Conversation);
    }
  });

  return unsubscribe;
}
