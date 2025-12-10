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
