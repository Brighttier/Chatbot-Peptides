import { NextRequest, NextResponse } from "next/server";
import {
  getConversationAdmin,
  updateConversationAdmin,
} from "@/lib/firebase-admin";

interface EndChatRequest {
  conversationId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EndChatRequest = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing required field: conversationId" },
        { status: 400 }
      );
    }

    // Get the conversation to verify it exists
    const conversation = await getConversationAdmin(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.status === "ended") {
      return NextResponse.json(
        { error: "Conversation already ended" },
        { status: 400 }
      );
    }

    // Update conversation status to "ended"
    await updateConversationAdmin(conversationId, {
      status: "ended",
    });

    return NextResponse.json({
      success: true,
      message: "Chat ended successfully",
    });
  } catch (error) {
    console.error("Error ending chat:", error);
    return NextResponse.json(
      { error: "Failed to end chat" },
      { status: 500 }
    );
  }
}
