import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import type { Conversation, Message } from "@/types";

export interface ConversationWithPreview extends Conversation {
  lastMessage?: {
    content: string;
    timestamp: Date;
    sender: string;
  };
}

export async function GET() {
  try {
    const db = getAdminFirestore();

    // Get all conversations ordered by createdAt
    const conversationsSnapshot = await db
      .collection("conversations")
      .orderBy("createdAt", "desc")
      .get();

    const conversations: ConversationWithPreview[] = [];

    for (const doc of conversationsSnapshot.docs) {
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
      });
    }

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
