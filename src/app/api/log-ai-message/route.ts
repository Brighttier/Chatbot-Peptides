import { NextRequest, NextResponse } from "next/server";
import { addMessageAdmin } from "@/lib/firebase-admin";

interface LogAIMessageRequest {
  conversationId: string;
  userMessage?: string;
  aiResponse?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LogAIMessageRequest = await request.json();
    const { conversationId, userMessage, aiResponse } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId" },
        { status: 400 }
      );
    }

    // Log user message if provided
    if (userMessage) {
      await addMessageAdmin(conversationId, "USER", userMessage);
    }

    // Log AI response if provided
    if (aiResponse) {
      await addMessageAdmin(conversationId, "AI", aiResponse);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging AI message:", error);
    return NextResponse.json(
      { error: "Failed to log message" },
      { status: 500 }
    );
  }
}
