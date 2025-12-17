import { NextRequest, NextResponse } from "next/server";
import {
  getConversationAdmin,
  addMessageAdmin,
  updateConversationSaleInfoAdmin,
} from "@/lib/firebase-admin";
import { sendConversationMessage } from "@/lib/twilio";
import {
  detectSaleKeywords,
  shouldFlagAsPotentialSale,
} from "@/lib/sale-detection";
import { Timestamp } from "firebase-admin/firestore";

interface AdminSendMessageRequest {
  conversationId: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AdminSendMessageRequest = await request.json();
    const { conversationId, content } = body;

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: "Missing required fields: conversationId and content" },
        { status: 400 }
      );
    }

    // Get conversation to check if it exists and is active
    const conversation = await getConversationAdmin(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Save admin message to Firestore
    const messageId = await addMessageAdmin(conversationId, "ADMIN", content);

    // Check for sale-related keywords in admin messages (rep might confirm sale)
    const keywordResult = detectSaleKeywords(content);
    if (keywordResult.found && shouldFlagAsPotentialSale(keywordResult)) {
      try {
        const currentCount = conversation.saleKeywordsCount || 0;
        await updateConversationSaleInfoAdmin(conversationId, {
          hasPotentialSale: true,
          saleStatus: conversation.saleStatus || "potential",
          lastSaleKeywordAt: Timestamp.now(),
          saleKeywordsCount: currentCount + keywordResult.keywords.length,
        });
      } catch (saleError) {
        // Don't fail the message if sale tracking fails
        console.error("Failed to update sale tracking:", saleError);
      }
    }

    // If there's a Twilio conversation, send via Twilio to the customer
    if (conversation.twilioConversationSid) {
      try {
        await sendConversationMessage(
          conversation.twilioConversationSid,
          "admin", // author
          content,
          false // don't include prefix for admin messages
        );
      } catch (twilioError) {
        console.error("Failed to send via Twilio:", twilioError);
        // Don't fail the request - message is saved to Firestore
      }
    }

    return NextResponse.json({
      success: true,
      messageId,
    });
  } catch (error) {
    console.error("Error sending admin message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
