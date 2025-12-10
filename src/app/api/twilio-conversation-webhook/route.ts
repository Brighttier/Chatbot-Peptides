import { NextRequest, NextResponse } from "next/server";
import {
  findConversationByTwilioSidAdmin,
  addMessageAdmin,
} from "@/lib/firebase-admin";

// Twilio Conversations webhook payload types
interface TwilioConversationWebhookBody {
  ConversationSid: string;
  MessageSid: string;
  Body: string;
  Author: string;
  ParticipantSid: string;
  EventType: string;
  Source: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio webhook
    const formData = await request.formData();

    const webhookData: TwilioConversationWebhookBody = {
      ConversationSid: formData.get("ConversationSid") as string,
      MessageSid: formData.get("MessageSid") as string,
      Body: formData.get("Body") as string,
      Author: formData.get("Author") as string,
      ParticipantSid: formData.get("ParticipantSid") as string,
      EventType: formData.get("EventType") as string,
      Source: formData.get("Source") as string,
    };

    console.log("Twilio Conversation Webhook received:", {
      eventType: webhookData.EventType,
      conversationSid: webhookData.ConversationSid,
      author: webhookData.Author,
      source: webhookData.Source,
    });

    // Only handle onMessageAdded events
    if (webhookData.EventType !== "onMessageAdded") {
      return NextResponse.json({ status: "ignored", reason: "not onMessageAdded" });
    }

    // Only process messages from SMS participants (not chat participants)
    // SMS messages have source "SMS" while chat messages have source "SDK"
    if (webhookData.Source !== "SMS") {
      console.log(`Ignoring message from source: ${webhookData.Source}`);
      return NextResponse.json({ status: "ignored", reason: "not SMS source" });
    }

    const { ConversationSid, Body, Author } = webhookData;

    if (!ConversationSid || !Body) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the Firestore conversation by Twilio SID
    const conversation = await findConversationByTwilioSidAdmin(ConversationSid);

    if (!conversation) {
      console.error(`No conversation found for Twilio SID: ${ConversationSid}`);
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Save the rep's message to Firestore
    const messageId = await addMessageAdmin(conversation.id!, "ADMIN", Body);

    console.log(`Message from rep saved: ${messageId} for conversation ${conversation.id}`);

    return NextResponse.json({
      success: true,
      messageId,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("Error processing Twilio conversation webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
