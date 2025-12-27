import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  findAnyConversationAdmin,
  createConversationAdmin,
  updateConversationAdmin,
  addMessageAdmin,
  getRepByRepIdAdmin,
} from "@/lib/firebase-admin";
import { getRepPhoneNumber } from "@/lib/rep-mapping";
import { sendNewChatNotification } from "@/lib/email-notifications";
import type { InitAIChatRequest, InitChatResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: InitAIChatRequest = await request.json();
    const { repId, userMobileNumber, firstName, lastName, dateOfBirth, consentGiven, intakeAnswers } = body;

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

    // Validate rep ID and get phone number from Firestore
    const repData = await getRepByRepIdAdmin(repId);
    if (!repData) {
      // Fallback to static mapping for "demo" and "default"
      const fallbackPhone = getRepPhoneNumber(repId);
      if (!fallbackPhone) {
        return NextResponse.json(
          { error: "Invalid rep ID or rep not found" },
          { status: 400 }
        );
      }
      // Use fallback for demo/default
      var repPhoneNumber = fallbackPhone;
    } else {
      var repPhoneNumber = repData.phoneNumber;
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
        ...(intakeAnswers && { intakeAnswers }),
      },
    });

    // Add welcome message from AI
    await addMessageAdmin(
      conversationId,
      "AI",
      "Hello! I'm your AI assistant. How can I help you today with your peptide needs?"
    );

    // Send email notification for all new conversations
    try {
      await sendNewChatNotification({
        repEmail: "notificationsjaprotocols@gmail.com",
        repName: repData?.name || "Team",
        repId,
        customerName: `${firstName} ${lastName}`,
        customerPhone: userMobileNumber,
        conversationId,
        chatMode: "AI",
        dateOfBirth,
        sourceChannel: "website",
        intakeAnswers: intakeAnswers as Record<string, string> | undefined,
      });
    } catch (emailErr) {
      console.error("Failed to send new chat notification:", emailErr);
      // Don't fail the request if email fails
    }

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
