import { NextRequest, NextResponse } from "next/server";
import {
  findExistingConversationAdmin,
  createConversationAdmin,
  addMessageAdmin,
} from "@/lib/firebase-admin";
import { getRepPhoneNumber, isValidRepId } from "@/lib/rep-mapping";
import type { InitAIChatRequest, InitChatResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: InitAIChatRequest = await request.json();
    const { repId, userMobileNumber } = body;

    // Validate required fields
    if (!repId || !userMobileNumber) {
      return NextResponse.json(
        { error: "Missing required fields: repId and userMobileNumber" },
        { status: 400 }
      );
    }

    // Validate rep ID
    if (!isValidRepId(repId)) {
      return NextResponse.json({ error: "Invalid rep ID" }, { status: 400 });
    }

    const repPhoneNumber = getRepPhoneNumber(repId);
    if (!repPhoneNumber) {
      return NextResponse.json(
        { error: "Rep phone number not found" },
        { status: 400 }
      );
    }

    // Check for existing active AI conversation
    const existingConversation = await findExistingConversationAdmin(
      userMobileNumber,
      repPhoneNumber
    );

    if (existingConversation && existingConversation.chatMode === "AI") {
      const response: InitChatResponse = {
        conversationId: existingConversation.id!,
        isExisting: true,
      };
      return NextResponse.json(response);
    }

    // Create new AI conversation
    const conversationId = await createConversationAdmin({
      repPhoneNumber,
      userMobileNumber,
      chatMode: "AI",
      fallbackMode: false,
      status: "active",
    });

    // Add welcome message from AI
    await addMessageAdmin(
      conversationId,
      "AI",
      "Hello! I'm your AI assistant. How can I help you today with your peptide needs?"
    );

    const response: InitChatResponse = {
      conversationId,
      isExisting: false,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error initializing AI chat:", error);
    return NextResponse.json(
      { error: "Failed to initialize AI chat" },
      { status: 500 }
    );
  }
}
