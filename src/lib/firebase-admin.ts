import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore, Timestamp } from "firebase-admin/firestore";
import type {
  Conversation,
  Message,
  MessageSender,
  ConversationReadStatus,
  Sale,
  SaleEvidence,
  SaleAuditLog,
  SaleStatus,
  SaleChannel,
  CommissionSummary,
} from "@/types";

// Initialize Firebase Admin (for server-side operations)
let adminApp: App;
let adminDb: Firestore;

/**
 * Helper function to safely convert Firestore Timestamp to Date
 * Handles various timestamp formats from Firestore
 */
function safeTimestampToDate(timestamp: unknown): Date | null {
  if (!timestamp) return null;

  try {
    // Handle Firestore Timestamp with toDate method
    if (timestamp && typeof (timestamp as { toDate?: () => Date }).toDate === 'function') {
      return (timestamp as { toDate: () => Date }).toDate();
    }

    // Handle native Date
    if (timestamp instanceof Date) {
      return timestamp;
    }

    // Handle plain object with seconds (serialized Timestamp)
    const ts = timestamp as { _seconds?: number; seconds?: number };
    const seconds = ts._seconds || ts.seconds;
    if (seconds) {
      return new Date(seconds * 1000);
    }

    return null;
  } catch {
    return null;
  }
}

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

// Find ANY conversation by Instagram handle (for direct link chat)
// Returns the most recent conversation for the given instagram + rep combination
// Note: Uses simple query without composite index to avoid index requirements
export async function findConversationByInstagramAdmin(
  instagramHandle: string,
  repPhoneNumber: string
): Promise<Conversation | null> {
  const db = getAdminFirestore();

  // Simple query - get all conversations for this instagram handle and filter in memory
  const snapshot = await db
    .collection("conversations")
    .where("userInstagramHandle", "==", instagramHandle)
    .get();

  if (snapshot.empty) {
    return null;
  }

  // Filter by repPhoneNumber and sort by createdAt in memory
  const conversations: Conversation[] = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.repPhoneNumber === repPhoneNumber) {
      conversations.push({
        id: doc.id,
        ...data,
      } as Conversation);
    }
  }

  if (conversations.length === 0) {
    return null;
  }

  // Sort by createdAt descending
  conversations.sort((a, b) => {
    const aTime = a.createdAt?.toDate?.() || new Date(0);
    const bTime = b.createdAt?.toDate?.() || new Date(0);
    return bTime.getTime() - aTime.getTime();
  });

  // Prioritize by status: active > archived > ended/closed
  const activeConv = conversations.find((c) => c.status === "active");
  if (activeConv) return activeConv;

  const archivedConv = conversations.find((c) => c.status === "archived");
  if (archivedConv) return archivedConv;

  const endedConv = conversations.find(
    (c) => c.status === "ended" || c.status === "closed"
  );
  if (endedConv) return endedConv;

  // Return the most recent if none match the expected statuses
  return conversations[0];
}

// Rep validation cache (5 minute TTL)
const repCache = new Map<string, { user: any | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get rep user data by repId from Firestore Users collection
 * Validates that the user exists, is a rep, and is active
 * @param repId - The rep ID to look up
 * @returns User data including phone number, or null if not found/invalid
 */
export async function getRepByRepIdAdmin(
  repId: string
): Promise<{ phoneNumber: string; name: string; email?: string } | null> {
  // Check cache first
  const cached = repCache.get(repId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.user;
  }

  const db = getAdminFirestore();

  try {
    const snapshot = await db
      .collection("users")
      .where("repId", "==", repId)
      .where("role", "==", "rep")
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Cache null result to avoid repeated lookups
      repCache.set(repId, { user: null, timestamp: Date.now() });
      return null;
    }

    const doc = snapshot.docs[0];
    const userData = doc.data();

    // Ensure phone number exists
    if (!userData.phoneNumber) {
      repCache.set(repId, { user: null, timestamp: Date.now() });
      return null;
    }

    const result = {
      phoneNumber: userData.phoneNumber,
      name: userData.name || "Rep",
      email: userData.email || undefined,
    };

    // Cache the result
    repCache.set(repId, { user: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error("Error fetching rep by repId:", error);
    return null;
  }
}

// Phone number to rep cache
const phoneRepCache = new Map<string, { user: { name: string; repId: string } | null; timestamp: number }>();

/**
 * Get rep user data by phone number from Firestore Users collection
 * Used to look up rep name for direct chat badge display
 * @param phoneNumber - The phone number to look up
 * @returns Rep data including name and repId, or null if not found
 */
export async function getRepByPhoneNumberAdmin(
  phoneNumber: string
): Promise<{ name: string; repId: string } | null> {
  // Check cache first
  const cached = phoneRepCache.get(phoneNumber);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.user;
  }

  const db = getAdminFirestore();

  try {
    const snapshot = await db
      .collection("users")
      .where("phoneNumber", "==", phoneNumber)
      .where("role", "==", "rep")
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      phoneRepCache.set(phoneNumber, { user: null, timestamp: Date.now() });
      return null;
    }

    const doc = snapshot.docs[0];
    const userData = doc.data();

    const result = {
      name: userData.name || "Rep",
      repId: userData.repId || "",
    };

    phoneRepCache.set(phoneNumber, { user: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error("Error fetching rep by phone number:", error);
    return null;
  }
}

// ==========================================
// Read Status Functions (for notification bell)
// ==========================================

/**
 * Mark a conversation as read for a specific user
 * Stores/updates the lastReadAt timestamp in readStatus subcollection
 */
export async function markConversationAsReadAdmin(
  conversationId: string,
  userId: string
): Promise<void> {
  const db = getAdminFirestore();

  await db
    .collection("conversations")
    .doc(conversationId)
    .collection("readStatus")
    .doc(userId)
    .set({
      odaUserId: userId,
      odaConversationId: conversationId,
      lastReadAt: Timestamp.now(),
    });
}

/**
 * Get read status for a user across multiple conversations
 * Returns a map of conversationId -> lastReadAt timestamp
 */
export async function getReadStatusForUserAdmin(
  userId: string,
  conversationIds: string[]
): Promise<Map<string, Date>> {
  if (conversationIds.length === 0) {
    return new Map();
  }

  const db = getAdminFirestore();
  const readStatusMap = new Map<string, Date>();

  // Batch fetch read status for all conversations
  const promises = conversationIds.map(async (convId) => {
    const docRef = await db
      .collection("conversations")
      .doc(convId)
      .collection("readStatus")
      .doc(userId)
      .get();

    if (docRef.exists) {
      const data = docRef.data() as ConversationReadStatus;
      if (data.lastReadAt) {
        readStatusMap.set(convId, data.lastReadAt.toDate());
      }
    }
  });

  await Promise.all(promises);
  return readStatusMap;
}

/**
 * Update lastMessageAt and lastMessageSender when a new message is added
 */
export async function updateConversationLastMessageAdmin(
  conversationId: string,
  sender: MessageSender
): Promise<void> {
  const db = getAdminFirestore();

  await db.collection("conversations").doc(conversationId).update({
    lastMessageAt: Timestamp.now(),
    lastMessageSender: sender,
  });
}

// ==========================================
// Sales & Commission Tracking Functions
// ==========================================

/**
 * Create a new sale record
 */
export async function createSaleAdmin(
  sale: Omit<Sale, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const db = getAdminFirestore();

  const saleData = {
    ...sale,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await db.collection("sales").add(saleData);
  return docRef.id;
}

/**
 * Get a sale by ID
 */
export async function getSaleByIdAdmin(saleId: string): Promise<Sale | null> {
  const db = getAdminFirestore();

  const doc = await db.collection("sales").doc(saleId).get();

  if (!doc.exists) return null;

  return {
    id: doc.id,
    ...doc.data(),
  } as Sale;
}

/**
 * Get sale by conversation ID
 */
export async function getSaleByConversationIdAdmin(
  conversationId: string
): Promise<Sale | null> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection("sales")
    .where("conversationId", "==", conversationId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Sale;
}

/**
 * Update a sale record
 */
export async function updateSaleAdmin(
  saleId: string,
  updates: Partial<Sale>
): Promise<void> {
  const db = getAdminFirestore();

  await db
    .collection("sales")
    .doc(saleId)
    .update({
      ...updates,
      updatedAt: Timestamp.now(),
    });
}

/**
 * List sales with filters
 * Note: Filters in memory to avoid composite index requirements
 */
export async function listSalesAdmin(options: {
  startDate?: Date;
  endDate?: Date;
  channel?: SaleChannel;
  status?: SaleStatus;
  repPhoneNumber?: string;
  limit?: number;
  offset?: number;
}): Promise<{ sales: Sale[]; total: number }> {
  const db = getAdminFirestore();

  // Get all sales and filter in memory to avoid composite index
  const snapshot = await db.collection("sales").get();

  let sales: Sale[] = [];

  for (const doc of snapshot.docs) {
    const saleData = doc.data() as Sale;

    // Get the date - handle Firestore Timestamp
    const saleDate = safeTimestampToDate(saleData.createdAt);
    if (!saleDate) continue;

    // Apply filters in memory
    if (options.channel && saleData.channel !== options.channel) continue;
    if (options.status && saleData.status !== options.status) continue;
    if (options.repPhoneNumber && saleData.repInfo?.phoneNumber !== options.repPhoneNumber) continue;
    if (options.startDate && saleDate < options.startDate) continue;
    if (options.endDate && saleDate > options.endDate) continue;

    sales.push({
      id: doc.id,
      ...saleData,
    });
  }

  // Sort by createdAt descending
  sales.sort((a, b) => {
    const dateA = safeTimestampToDate(a.createdAt) || new Date(0);
    const dateB = safeTimestampToDate(b.createdAt) || new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  const total = sales.length;

  // Apply pagination
  if (options.offset) {
    sales = sales.slice(options.offset);
  }
  if (options.limit) {
    sales = sales.slice(0, options.limit);
  }

  return { sales, total };
}

/**
 * Get commission summary for a date range
 * Note: Uses simple query without composite index to avoid index requirements
 */
export async function getCommissionSummaryAdmin(
  startDate: Date,
  endDate: Date
): Promise<CommissionSummary> {
  const db = getAdminFirestore();

  // Simple query - get all sales and filter in memory to avoid composite index
  const snapshot = await db.collection("sales").get();

  const summary: CommissionSummary = {
    totalSales: 0,
    totalSaleAmount: 0,
    totalCommission: 0,
    websiteSales: { count: 0, amount: 0, commission: 0 },
    instagramSales: { count: 0, amount: 0, commission: 0 },
    pendingReviewCount: 0,
    verifiedCount: 0,
    disputedCount: 0,
    period: { start: startDate, end: endDate },
  };

  for (const doc of snapshot.docs) {
    const sale = doc.data() as Sale;

    // Get the date - handle Firestore Timestamp
    const saleDate = safeTimestampToDate(sale.createdAt);
    if (!saleDate) continue;

    // Filter by date range
    if (saleDate < startDate || saleDate > endDate) continue;

    // Only count verified and pending_review for totals
    if (sale.status === "verified" || sale.status === "pending_review") {
      summary.totalSales++;
      summary.totalSaleAmount += sale.saleAmount || 0;
      summary.totalCommission += sale.commissionAmount || 0;

      if (sale.channel === "website") {
        summary.websiteSales.count++;
        summary.websiteSales.amount += sale.saleAmount || 0;
        summary.websiteSales.commission += sale.commissionAmount || 0;
      } else {
        summary.instagramSales.count++;
        summary.instagramSales.amount += sale.saleAmount || 0;
        summary.instagramSales.commission += sale.commissionAmount || 0;
      }
    }

    // Count by status
    if (sale.status === "pending_review") summary.pendingReviewCount++;
    if (sale.status === "verified") summary.verifiedCount++;
    if (sale.status === "disputed") summary.disputedCount++;
  }

  return summary;
}

/**
 * Create sale evidence record
 */
export async function createSaleEvidenceAdmin(
  evidence: Omit<SaleEvidence, "id" | "createdAt">
): Promise<string> {
  const db = getAdminFirestore();

  const evidenceData = {
    ...evidence,
    createdAt: Timestamp.now(),
  };

  const docRef = await db.collection("sale_evidence").add(evidenceData);
  return docRef.id;
}

/**
 * Get sale evidence by sale ID
 */
export async function getSaleEvidenceAdmin(
  saleId: string
): Promise<SaleEvidence | null> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection("sale_evidence")
    .where("saleId", "==", saleId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as SaleEvidence;
}

/**
 * Create sale audit log entry
 */
export async function createSaleAuditLogAdmin(
  log: Omit<SaleAuditLog, "id" | "timestamp">
): Promise<string> {
  const db = getAdminFirestore();

  const logData = {
    ...log,
    timestamp: Timestamp.now(),
  };

  const docRef = await db.collection("sale_audit_logs").add(logData);
  return docRef.id;
}

/**
 * Get audit logs for a sale
 */
export async function getSaleAuditLogsAdmin(
  saleId: string
): Promise<SaleAuditLog[]> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection("sale_audit_logs")
    .where("saleId", "==", saleId)
    .orderBy("timestamp", "desc")
    .get();

  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as SaleAuditLog
  );
}

/**
 * Update conversation with sale tracking info
 */
export async function updateConversationSaleInfoAdmin(
  conversationId: string,
  saleInfo: {
    hasPotentialSale?: boolean;
    saleStatus?: "potential" | "marked" | "verified" | null;
    saleId?: string;
    lastSaleKeywordAt?: FirebaseFirestore.Timestamp;
    saleKeywordsCount?: number;
  }
): Promise<void> {
  const db = getAdminFirestore();

  await db.collection("conversations").doc(conversationId).update(saleInfo);
}

/**
 * Get all messages for a conversation (for evidence capture)
 */
export async function getConversationMessagesAdmin(
  conversationId: string
): Promise<Message[]> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("timestamp", "asc")
    .get();

  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Message
  );
}
