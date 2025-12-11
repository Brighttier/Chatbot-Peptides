import { NextRequest, NextResponse } from "next/server";
import {
  getConversationAdmin,
  updateConversationAdmin,
  addMessageAdmin,
} from "@/lib/firebase-admin";
import {
  createTwilioConversation,
  addSmsParticipant,
  addChatParticipant,
  sendSMS,
} from "@/lib/twilio";
import type { IntakeAnswers } from "@/types";

interface TransferToHumanRequest {
  conversationId: string;
  intakeAnswers: IntakeAnswers;
}

export async function POST(request: NextRequest) {
  try {
    const body: TransferToHumanRequest = await request.json();
    const { conversationId, intakeAnswers } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId" },
        { status: 400 }
      );
    }

    if (!intakeAnswers) {
      return NextResponse.json(
        { error: "Missing intakeAnswers" },
        { status: 400 }
      );
    }

    // Get existing conversation
    const conversation = await getConversationAdmin(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Update conversation with intake answers and switch to HUMAN mode
    // Ensure customerInfo has required fields before spreading
    const existingCustomerInfo = conversation.customerInfo || {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      consentGiven: false,
    };
    await updateConversationAdmin(conversationId, {
      chatMode: "HUMAN",
      customerInfo: {
        ...existingCustomerInfo,
        intakeAnswers,
      },
    });

    // Set up Twilio conversation if not already set up
    if (!conversation.twilioConversationSid) {
      try {
        const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;

        // Create Twilio Conversation
        const twilioConversationSid = await createTwilioConversation(
          `Transfer-${conversation.userMobileNumber}-${Date.now()}`
        );

        // Add rep as SMS participant
        await addSmsParticipant(
          twilioConversationSid,
          conversation.repPhoneNumber,
          twilioPhoneNumber
        );

        // Add user as chat participant
        await addChatParticipant(
          twilioConversationSid,
          conversation.userMobileNumber
        );

        // Update Firestore conversation with Twilio SID
        await updateConversationAdmin(conversationId, {
          twilioConversationSid,
        });

        console.log(`Created Twilio Conversation for transfer: ${twilioConversationSid}`);
      } catch (twilioError) {
        console.error("Failed to create Twilio Conversation:", twilioError);
        // Don't fail the request if Twilio setup fails
      }
    }

    // Send SMS notification to rep about the transfer
    try {
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;
      const customerName = conversation.customerInfo?.firstName || "A customer";
      const purchaseIntent = intakeAnswers.interest?.includes("Purchasing Peptides");

      let notificationMessage = `🔔 ${customerName} has transferred from AI to human chat.`;
      if (purchaseIntent) {
        notificationMessage += ` 💰 PURCHASE INTENT detected!`;
      }
      notificationMessage += `\n\nGoals: ${intakeAnswers.goals?.join(", ") || "N/A"}`;
      notificationMessage += `\nStage: ${intakeAnswers.stage || "N/A"}`;
      notificationMessage += `\nInterests: ${intakeAnswers.interest?.join(", ") || "N/A"}`;

      await sendSMS(
        conversation.repPhoneNumber,
        twilioPhoneNumber,
        notificationMessage
      );
    } catch (smsError) {
      console.error("Failed to send SMS notification:", smsError);
      // Don't fail the request if SMS notification fails
    }

    // Add a system message to mark the transfer
    await addMessageAdmin(
      conversationId,
      "AI",
      "You have been connected to a human representative. They will be with you shortly."
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error transferring to human:", error);
    return NextResponse.json(
      { error: "Failed to transfer to human" },
      { status: 500 }
    );
  }
}
