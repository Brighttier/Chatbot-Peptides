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
}

// Message document structure (Firestore subcollection)
export interface Message {
  id?: string;
  sender: MessageSender;
  content: string;
  timestamp: Timestamp;
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

// HeyGen API types
export interface HeyGenResponse {
  success: boolean;
  videoUrl?: string;
  textResponse?: string;
  error?: string;
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

export interface HeyGenSettings {
  apiKey: string; // Encrypted
  avatarId: string;
  voiceId: string;
  knowledgeBaseId: string;
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
  heygen: HeyGenSettings;
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
  | "integration_updated";

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
