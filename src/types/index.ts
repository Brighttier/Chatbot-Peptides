import { Timestamp } from "firebase/firestore";

// Chat modes for the conversation
export type ChatMode = "HUMAN" | "AI";

// Message sender types
export type MessageSender = "USER" | "ADMIN" | "AI";

// Conversation status
export type ConversationStatus = "active" | "ended" | "closed" | "archived";

// Intake questions answers
export interface IntakeAnswers {
  goals: string[]; // Muscle Growth, Anti-Aging, Recovery, Other
  stage: string; // Starting Protocol, Optimizing, Researching
  interest: string[]; // Purchasing, Coaching, Personalized Advice
}

// Customer information collected at chat start
export interface CustomerInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD format
  consentGiven: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  consentTimestamp?: Timestamp | any; // Accepts both client and admin Timestamp
  intakeAnswers?: IntakeAnswers;
}

// Conversation document structure (Firestore)
export interface Conversation {
  id?: string;
  repPhoneNumber: string;
  userMobileNumber: string;
  chatMode: ChatMode;
  fallbackMode: boolean;
  userInstagramHandle?: string;
  customerInfo?: CustomerInfo;
  assessmentResults?: Record<string, unknown>;
  status: ConversationStatus;
  createdAt: Timestamp;
  twilioConversationSid?: string;
  // Unread tracking
  lastMessageAt?: Timestamp;
  lastMessageSender?: MessageSender;
  // Sale tracking
  hasPotentialSale?: boolean;
  saleStatus?: "potential" | "marked" | "verified" | null;
  saleId?: string;
  lastSaleKeywordAt?: Timestamp;
  saleKeywordsCount?: number;
  // Typing indicator
  typingUsers?: string[]; // Array of user IDs currently typing
}

// Read status tracking per user per conversation
export interface ConversationReadStatus {
  odaUserId: string; // The user ID who read the conversation
  odaConversationId: string;
  lastReadAt: Timestamp;
}

// Extended conversation with computed unread status (for API responses)
export interface ConversationWithUnread extends Conversation {
  hasUnread?: boolean;
  directChatRepName?: string; // Rep name for direct link chats (instagram-based)
  lastMessage?: {
    content: string;
    timestamp: Date;
    sender: MessageSender;
  };
}

// Message document structure (Firestore subcollection)
export interface Message {
  id?: string;
  sender: MessageSender;
  content: string;
  timestamp: Timestamp;
  // Read receipt fields (WhatsApp-style)
  deliveredAt?: Timestamp | null;
  readAt?: Timestamp | null;
  deliveredBy?: string[];
  readBy?: string[];
  // Edit tracking
  edited?: boolean;
  editedAt?: Timestamp | null;
}

// API Request/Response types
export interface InitChatRequest {
  repId: string;
  userMobileNumber: string;
  userInstagramHandle?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  consentGiven: boolean;
  intakeAnswers?: IntakeAnswers;
}

export interface InitAIChatRequest {
  repId: string;
  userMobileNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  consentGiven: boolean;
  intakeAnswers?: IntakeAnswers;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
}

export interface InitChatResponse {
  conversationId: string;
  isExisting: boolean;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  aiResponse?: string;
  fallbackMode?: boolean;
}

// Rep mapping (repId to phone number)
export interface RepMapping {
  [repId: string]: string;
}

// ==========================================
// User & Authentication Types
// ==========================================

export type UserRole = "super_admin" | "admin" | "rep";

export interface User {
  id?: string;
  uid: string; // Firebase Auth UID
  email: string;
  name: string;
  role: UserRole;
  phoneNumber?: string; // For reps
  repId?: string; // Unique rep URL identifier
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SessionUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
}

// ==========================================
// App Settings Types
// ==========================================

export interface GeminiSettings {
  apiKey: string; // Encrypted
  modelId: string; // e.g., "gemini-2.0-flash-exp", "gemini-1.5-pro"
  persona: string; // System prompt / AI personality
  knowledgeBase: string; // Company info, FAQs, product details
  temperature: number; // 0-2, default 0.7
  maxTokens: number; // Max output tokens, default 2048
  isEnabled: boolean;
  lastTestedAt?: Timestamp;
  testStatus?: "success" | "failed";
}

export interface TwilioSettings {
  accountSid: string; // Encrypted
  authToken: string; // Encrypted
  phoneNumber: string;
  isEnabled: boolean;
  lastTestedAt?: Timestamp;
  testStatus?: "success" | "failed";
}

export interface WidgetColors {
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
}

export type WidgetPosition = "bottom-right" | "bottom-left";
export type WidgetSize = "compact" | "standard" | "large";

export interface WidgetSettings {
  colors: WidgetColors;
  logo?: string; // Firebase Storage URL
  welcomeMessage: string;
  position: WidgetPosition;
  autoExpand: boolean;
  expandDelay: number; // ms before auto-expand
  size: WidgetSize;
  borderRadius: number; // px
  showPoweredBy: boolean;
}

export interface AppSettings {
  gemini: GeminiSettings;
  twilio: TwilioSettings;
  widget: WidgetSettings;
  updatedAt: Timestamp;
  updatedBy: string; // UID
}

// ==========================================
// Canned Responses Types
// ==========================================

export interface CannedResponse {
  id?: string;
  title: string;
  content: string;
  shortcut: string; // e.g., "/greeting", "/pricing"
  category?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // UID
}

// ==========================================
// Audit Log Types
// ==========================================

export type AuditAction =
  | "settings_updated"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "widget_updated"
  | "integration_updated"
  | "sale_created"
  | "sale_verified"
  | "sale_disputed"
  | "sale_rejected";

export interface AuditLog {
  id?: string;
  action: AuditAction;
  performedBy: {
    uid: string;
    email: string;
    name: string;
  };
  timestamp: Timestamp;
  details: {
    field?: string;
    oldValue?: unknown;
    newValue?: unknown;
    description: string;
  };
  ipAddress?: string;
}

// ==========================================
// Sales & Commission Tracking Types
// ==========================================

export type SaleChannel = "website" | "instagram";
export type SaleStatus = "verified" | "pending_review" | "disputed" | "rejected";
export type SaleDetectionMethod = "manual" | "keyword" | "ai";

export interface Sale {
  id?: string;
  conversationId: string;
  customerName: string;
  customerPhone: string;
  customerInstagram?: string;
  channel: SaleChannel;
  commissionRate: number; // 0.10 for website, 0.05 for instagram
  saleAmount: number;
  commissionAmount: number; // Calculated: saleAmount * commissionRate
  productDetails?: string;
  status: SaleStatus;
  detectionMethod: SaleDetectionMethod;
  detectedKeywords?: string[];
  aiConfidenceScore?: number; // 0-1
  markedBy?: {
    uid: string;
    name: string;
    role: UserRole;
  };
  repInfo: {
    uid?: string;
    name: string;
    repId?: string;
    phoneNumber: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saleDate: Timestamp | any; // Accepts both client and admin Timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdAt: Timestamp | any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updatedAt: Timestamp | any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verifiedAt?: Timestamp | any;
  verifiedBy?: {
    uid: string;
    name: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  disputedAt?: Timestamp | any;
  disputedBy?: {
    uid: string;
    name: string;
  };
  disputeReason?: string;
  notes?: string;
}

export interface SaleEvidence {
  id?: string;
  saleId: string;
  conversationId: string;
  messageIds: string[];
  transcriptSnapshot: {
    sender: MessageSender;
    content: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    timestamp: Timestamp | any;
  }[];
  keywordsFound: {
    keyword: string;
    messageId: string;
    context: string; // Surrounding text for context
  }[];
  uploadedProof?: string[]; // Firebase Storage URLs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdAt: Timestamp | any;
}

export interface SaleAuditLog {
  id?: string;
  saleId: string;
  action: "created" | "verified" | "disputed" | "amount_changed" | "rejected";
  performedBy: {
    uid: string;
    name: string;
    email: string;
    role: UserRole;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timestamp: Timestamp | any;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
}

export interface CommissionSummary {
  totalSales: number;
  totalSaleAmount: number;
  totalCommission: number;
  websiteSales: {
    count: number;
    amount: number;
    commission: number;
  };
  instagramSales: {
    count: number;
    amount: number;
    commission: number;
  };
  pendingReviewCount: number;
  verifiedCount: number;
  disputedCount: number;
  period: {
    start: Date;
    end: Date;
  };
}

// Extend Conversation for sale tracking
export interface ConversationSaleInfo {
  hasPotentialSale?: boolean;
  saleStatus?: "potential" | "marked" | "verified" | null;
  saleId?: string;
  lastSaleKeywordAt?: Timestamp;
  saleKeywordsCount?: number;
}
