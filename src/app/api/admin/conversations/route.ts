import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getReadStatusForUserAdmin, getRepByPhoneNumberAdmin } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth-admin";
import type { Conversation, Message, MessageSender } from "@/types";

export interface ConversationWithPreview extends Conversation {
  lastMessage?: {
    content: string;
    timestamp: Date;
    sender: MessageSender;
  };
  hasUnread?: boolean;
  directChatRepName?: string;
}

export interface ConversationsResponse {
  conversations: ConversationWithPreview[];
  unreadCount: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user for unread tracking
    const session = await getSession();
    const userId = session?.uid;

    const db = getAdminFirestore();

    // Get all conversations ordered by createdAt
    const conversationsSnapshot = await db
      .collection("conversations")
      .orderBy("createdAt", "desc")
      .get();

    const conversations: ConversationWithPreview[] = [];
    const conversationIds: string[] = [];

    // First pass: collect data and IDs
    for (const doc of conversationsSnapshot.docs) {
      conversationIds.push(doc.id);
      const conversationData = {
        id: doc.id,
        ...doc.data(),
      } as Conversation;

      // Get last message for preview
      const messagesSnapshot = await db
        .collection("conversations")
        .doc(doc.id)
        .collection("messages")
        .orderBy("timestamp", "desc")
        .limit(1)
        .get();

      let lastMessage: ConversationWithPreview["lastMessage"];
      if (!messagesSnapshot.empty) {
        const msgDoc = messagesSnapshot.docs[0];
        const msgData = msgDoc.data() as Message;
        lastMessage = {
          content: msgData.content,
          timestamp: msgData.timestamp.toDate(),
          sender: msgData.sender,
        };
      }

      conversations.push({
        ...conversationData,
        lastMessage,
        hasUnread: false, // Will be computed below
      });
    }

    // Enrich direct chat conversations with rep names
    // Direct chats have userMobileNumber starting with "instagram-"
    const repPhoneNumbers = new Set<string>();
    for (const conv of conversations) {
      if (conv.userMobileNumber.startsWith("instagram-")) {
        repPhoneNumbers.add(conv.repPhoneNumber);
      }
    }

    // Batch lookup rep names
    const repNameMap = new Map<string, string>();
    for (const phone of repPhoneNumbers) {
      const repData = await getRepByPhoneNumberAdmin(phone);
      if (repData) {
        repNameMap.set(phone, repData.name);
      }
    }

    // Assign rep names to direct chat conversations
    for (const conv of conversations) {
      if (conv.userMobileNumber.startsWith("instagram-")) {
        conv.directChatRepName = repNameMap.get(conv.repPhoneNumber) || undefined;
      }
    }

    // Second pass: compute unread status if user is authenticated
    let unreadCount = 0;
    if (userId && conversationIds.length > 0) {
      const readStatusMap = await getReadStatusForUserAdmin(userId, conversationIds);

      for (const conv of conversations) {
        if (conv.id && conv.lastMessage) {
          const lastReadAt = readStatusMap.get(conv.id);
          const lastMessageTime = conv.lastMessage.timestamp;
          const lastMessageSender = conv.lastMessage.sender;

          // Only count as unread if:
          // 1. Never read OR last message is after last read
          // 2. Last message is from USER (customer), not ADMIN or AI
          if (lastMessageSender === "USER") {
            if (!lastReadAt || lastMessageTime > lastReadAt) {
              conv.hasUnread = true;
              unreadCount++;
            }
          }
        }
      }
    }

    return NextResponse.json({ conversations, unreadCount } as ConversationsResponse);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
