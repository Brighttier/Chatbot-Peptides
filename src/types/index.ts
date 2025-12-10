import { Timestamp } from "firebase/firestore";

// Chat modes for the conversation
export type ChatMode = "HUMAN" | "AI";

// Message sender types
export type MessageSender = "USER" | "ADMIN" | "AI";

// Conversation status
export type ConversationStatus = "active" | "ended" | "closed";

// Conversation document structure (Firestore)
export interface Conversation {
  id?: string;
  repPhoneNumber: string;
  userMobileNumber: string;
  chatMode: ChatMode;
  fallbackMode: boolean;
  userInstagramHandle?: string;
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
}

export interface InitAIChatRequest {
  repId: string;
  userMobileNumber: string;
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
