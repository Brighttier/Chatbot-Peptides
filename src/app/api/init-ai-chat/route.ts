import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  findAnyConversationAdmin,
  createConversationAdmin,
  updateConversationAdmin,
  addMessageAdmin,
} from "@/lib/firebase-admin";
import { getRepPhoneNumber, isValidRepId } from "@/lib/rep-mapping";
import type { InitAIChatRequest, InitChatResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: InitAIChatRequest = await request.json();
    const { repId, userMobileNumber, firstName, lastName, dateOfBirth, consentGiven } = body;

    // Validate required fields
    if (!repId || !userMobileNumber || !firstName || !lastName || !dateOfBirth) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!consentGiven) {
      return NextResponse.json(
        { error: "Consent is required to continue" },
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

    // Check for ANY existing conversation (active, archived, ended, closed)
    // This ensures only ONE conversation thread per phone number
    const existingConversation = await findAnyConversationAdmin(
      userMobileNumber,
      repPhoneNumber
    );

    if (existingConversation) {
      // Reactivate if not already active and set to AI mode
      const needsUpdate = existingConversation.status !== "active" || existingConversation.chatMode !== "AI";

      if (needsUpdate) {
        await updateConversationAdmin(existingConversation.id!, {
          status: "active",
          chatMode: "AI",
        });

        // Add a welcome back message if we're reactivating
        if (existingConversation.status !== "active") {
          await addMessageAdmin(
            existingConversation.id!,
            "AI",
            "Welcome back! How can I assist you today?"
          );
        }
      }

      const response: InitChatResponse = {
        conversationId: existingConversation.id!,
        isExisting: true,
      };
      return NextResponse.json(response);
    }

    // Create new AI conversation only if no previous conversation exists
    const conversationId = await createConversationAdmin({
      repPhoneNumber,
      userMobileNumber,
      chatMode: "AI",
      fallbackMode: false,
      status: "active",
      customerInfo: {
        firstName,
        lastName,
        dateOfBirth,
        consentGiven: true,
        consentTimestamp: Timestamp.now(),
      },
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
