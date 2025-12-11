import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  findAnyConversationAdmin,
  createConversationAdmin,
  updateConversationAdmin,
} from "@/lib/firebase-admin";
import {
  createTwilioConversation,
  addSmsParticipant,
  addChatParticipant,
} from "@/lib/twilio";
import { getRepPhoneNumber, isValidRepId } from "@/lib/rep-mapping";
import type { InitChatRequest, InitChatResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: InitChatRequest = await request.json();
    const { repId, userMobileNumber, userInstagramHandle, firstName, lastName, dateOfBirth, consentGiven } = body;

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
      // Reactivate if not already active
      if (existingConversation.status !== "active") {
        await updateConversationAdmin(existingConversation.id!, {
          status: "active",
        });
      }

      const response: InitChatResponse = {
        conversationId: existingConversation.id!,
        isExisting: true,
      };
      return NextResponse.json(response);
    }

    // Create new conversation only if no previous conversation exists (Human mode - default for standalone/Instagram)
    const conversationData: Parameters<typeof createConversationAdmin>[0] = {
      repPhoneNumber,
      userMobileNumber,
      chatMode: "HUMAN",
      fallbackMode: false,
      status: "active",
      customerInfo: {
        firstName,
        lastName,
        dateOfBirth,
        consentGiven: true,
        consentTimestamp: Timestamp.now(),
      },
    };

    // Only add Instagram handle if provided (Firestore doesn't allow undefined)
    if (userInstagramHandle) {
      conversationData.userInstagramHandle = userInstagramHandle;
    }

    const conversationId = await createConversationAdmin(conversationData);

    // Create Twilio Conversation and add participants
    try {
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;

      // Create Twilio Conversation
      const twilioConversationSid = await createTwilioConversation(
        `Chat-${userMobileNumber}-${Date.now()}`
      );

      // Add rep as SMS participant
      await addSmsParticipant(
        twilioConversationSid,
        repPhoneNumber,
        twilioPhoneNumber
      );

      // Add user as chat participant
      await addChatParticipant(
        twilioConversationSid,
        userMobileNumber
      );

      // Update Firestore conversation with Twilio SID
      await updateConversationAdmin(conversationId, {
        twilioConversationSid,
      });

      console.log(`Created Twilio Conversation: ${twilioConversationSid}`);
    } catch (twilioError) {
      console.error("Failed to create Twilio Conversation:", twilioError);
      // Don't fail the request if Twilio setup fails - fallback to basic mode
    }

    const response: InitChatResponse = {
      conversationId,
      isExisting: false,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error initializing chat:", error);
    return NextResponse.json(
      { error: "Failed to initialize chat" },
      { status: 500 }
    );
  }
}
