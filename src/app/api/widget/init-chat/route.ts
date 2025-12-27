import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  createConversationAdmin,
  getRepByRepIdAdmin,
} from "@/lib/firebase-admin";
import {
  createTwilioConversation,
  addSmsParticipant,
  addChatParticipant,
} from "@/lib/twilio";
import { getRepPhoneNumber } from "@/lib/rep-mapping";
import { sendNewChatNotification } from "@/lib/email-notifications";
import type { InitChatResponse } from "@/types";

// Request for widget chat (website embed - no Instagram required)
interface WidgetChatRequest {
  repId: string;
  userMobileNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  consentGiven: boolean;
  intakeAnswers?: {
    goals: string[];
    stage: string;
    interest: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: WidgetChatRequest = await request.json();
    const {
      repId,
      userMobileNumber,
      firstName,
      lastName,
      dateOfBirth,
      consentGiven,
      intakeAnswers,
    } = body;

    // Validate required fields
    if (!repId || !userMobileNumber || !firstName || !lastName) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: repId, userMobileNumber, firstName, and lastName are required",
        },
        { status: 400 }
      );
    }

    if (!consentGiven) {
      return NextResponse.json(
        { error: "Consent is required to start chat" },
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

    // Create new conversation (Human mode from website widget)
    // No "instagram-" prefix - website embed = 10% commission
    const conversationData: Parameters<typeof createConversationAdmin>[0] = {
      repPhoneNumber,
      userMobileNumber, // No prefix - website source for commission tracking
      chatMode: "HUMAN",
      fallbackMode: false,
      status: "active",
      customerInfo: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || "",
        consentGiven: true,
        consentTimestamp: Timestamp.now(),
        intakeAnswers: intakeAnswers || undefined,
      },
    };

    const conversationId = await createConversationAdmin(conversationData);

    // Create Twilio Conversation and add participants
    try {
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;

      // Create Twilio Conversation
      const twilioConversationSid = await createTwilioConversation(
        `Widget-${firstName}-${Date.now()}`
      );

      // Add rep as SMS participant
      await addSmsParticipant(
        twilioConversationSid,
        repPhoneNumber,
        twilioPhoneNumber
      );

      // Add user as chat participant (using phone number as identity)
      await addChatParticipant(twilioConversationSid, userMobileNumber);

      // Update Firestore conversation with Twilio SID
      const { updateConversationAdmin } = await import("@/lib/firebase-admin");
      await updateConversationAdmin(conversationId, {
        twilioConversationSid,
      });

      console.log(`Created Twilio Conversation for widget: ${twilioConversationSid}`);
    } catch (twilioError) {
      console.error("Failed to create Twilio Conversation:", twilioError);
      // Don't fail the request if Twilio setup fails - fallback to basic mode
    }

    // Send email notification for all new conversations
    try {
      await sendNewChatNotification({
        repEmail: "blaktonik@gmail.com",
        repName: repData?.name || "Team",
        repId,
        customerName: `${firstName} ${lastName}`,
        customerPhone: userMobileNumber,
        conversationId,
        chatMode: "HUMAN",
        sourceChannel: "website",
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
    console.error("Error initializing widget chat:", error);
    return NextResponse.json(
      { error: "Failed to initialize chat" },
      { status: 500 }
    );
  }
}
