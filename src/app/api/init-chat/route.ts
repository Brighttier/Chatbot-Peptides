import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  findConversationByInstagramAdmin,
  createConversationAdmin,
  updateConversationAdmin,
  getRepByRepIdAdmin,
} from "@/lib/firebase-admin";
import {
  createTwilioConversation,
  addSmsParticipant,
  addChatParticipant,
} from "@/lib/twilio";
import { getRepPhoneNumber } from "@/lib/rep-mapping";
import type { InitChatResponse } from "@/types";

// Simplified request for direct link chat (name + instagram only)
interface DirectLinkChatRequest {
  repId: string;
  userName: string;
  userInstagramHandle: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DirectLinkChatRequest = await request.json();
    const { repId, userName, userInstagramHandle } = body;

    // Validate required fields
    if (!repId || !userName || !userInstagramHandle) {
      return NextResponse.json(
        { error: "Missing required fields: repId, userName, and userInstagramHandle are required" },
        { status: 400 }
      );
    }

    // Validate rep ID and get phone number from Firestore
    const repData = await getRepByRepIdAdmin(repId);
    let repPhoneNumber: string;

    if (!repData) {
      // Fallback to static mapping for "demo" and "default"
      const fallbackPhone = getRepPhoneNumber(repId);
      if (!fallbackPhone) {
        return NextResponse.json(
          { error: "Invalid rep ID or rep not found" },
          { status: 400 }
        );
      }
      repPhoneNumber = fallbackPhone;
    } else {
      repPhoneNumber = repData.phoneNumber;
    }

    // Check for existing conversation by Instagram handle
    const existingConversation = await findConversationByInstagramAdmin(
      userInstagramHandle,
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

    // Create a placeholder "mobile number" using Instagram handle for Twilio compatibility
    // Format: instagram-handle (without @) as identifier
    const placeholderMobile = `instagram-${userInstagramHandle.replace("@", "")}`;

    // Create new conversation (Human mode - default for standalone/Instagram)
    const conversationData: Parameters<typeof createConversationAdmin>[0] = {
      repPhoneNumber,
      userMobileNumber: placeholderMobile, // Use instagram-based identifier
      userInstagramHandle,
      chatMode: "HUMAN",
      fallbackMode: false,
      status: "active",
      customerInfo: {
        firstName: userName,
        lastName: "",
        dateOfBirth: "",
        consentGiven: true,
        consentTimestamp: Timestamp.now(),
      },
    };

    const conversationId = await createConversationAdmin(conversationData);

    // Create Twilio Conversation and add participants
    try {
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;

      // Create Twilio Conversation
      const twilioConversationSid = await createTwilioConversation(
        `Chat-${userInstagramHandle}-${Date.now()}`
      );

      // Add rep as SMS participant
      await addSmsParticipant(
        twilioConversationSid,
        repPhoneNumber,
        twilioPhoneNumber
      );

      // Add user as chat participant (using instagram handle as identity)
      await addChatParticipant(
        twilioConversationSid,
        userInstagramHandle
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
