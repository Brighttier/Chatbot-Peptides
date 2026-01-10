import { NextRequest, NextResponse } from "next/server";
import {
  getConversationAdmin,
  addMessageAdmin,
  getMessagesAdmin,
  updateConversationSaleInfoAdmin,
} from "@/lib/firebase-admin";
import { forwardMessageToRep, sendConversationMessage } from "@/lib/twilio";
import { generateGeminiResponse, generateFallbackResponse } from "@/lib/gemini";
import {
  detectSaleKeywords,
  shouldFlagAsPotentialSale,
} from "@/lib/sale-detection";
import { Timestamp } from "firebase-admin/firestore";
import type { SendMessageRequest, SendMessageResponse } from "@/types";

const FALLBACK_MESSAGE =
  "I apologize, but I'm experiencing some technical difficulties. A representative will be with you shortly. In the meantime, feel free to continue messaging and I'll do my best to assist you.";

export async function POST(request: NextRequest) {
  try {
    const body: SendMessageRequest = await request.json();
    const { conversationId, content } = body;

    // Validate required fields
    if (!conversationId || !content) {
      return NextResponse.json(
        { error: "Missing required fields: conversationId and content" },
        { status: 400 }
      );
    }

    // Get conversation to check mode
    const conversation = await getConversationAdmin(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.status !== "active") {
      return NextResponse.json(
        { error: "Conversation is no longer active" },
        { status: 400 }
      );
    }

    // Save user message
    const messageId = await addMessageAdmin(conversationId, "USER", content);

    // Check for sale-related keywords in the message
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

    // Handle based on chat mode
    if (conversation.chatMode === "HUMAN") {
      // Send message via Twilio Conversations API (or fallback to basic SMS)
      try {
        if (conversation.twilioConversationSid) {
          // Use Twilio Conversations API - message auto-delivered to SMS participant
          await sendConversationMessage(
            conversation.twilioConversationSid,
            conversation.userMobileNumber, // author identity
            content
          );
        } else {
          // Fallback to basic SMS forwarding
          await forwardMessageToRep(
            conversation.repPhoneNumber,
            conversation.userMobileNumber,
            content
          );
        }
      } catch (twilioError) {
        console.error("Failed to send message via Twilio:", twilioError);
        // Don't fail the request if Twilio fails
      }

      const response: SendMessageResponse = {
        success: true,
        messageId,
      };
      return NextResponse.json(response);
    }

    // AI mode - use Gemini for text chat
    const existingMessages = await getMessagesAdmin(conversationId);
    const conversationHistory = existingMessages.map((m) => ({
      role: m.sender === "USER" ? "user" as const : "assistant" as const,
      content: m.content,
    }));

    const geminiResult = await generateGeminiResponse(content, conversationHistory);

    let aiResponseText: string;
    if (geminiResult.success && geminiResult.response) {
      aiResponseText = geminiResult.response;
    } else {
      // Gemini failed - use simple fallback
      console.error("Gemini API failed:", geminiResult.error);
      aiResponseText = generateFallbackResponse(content);
    }

    await addMessageAdmin(conversationId, "AI", aiResponseText);

    const response: SendMessageResponse = {
      success: true,
      messageId,
      aiResponse: aiResponseText,
      fallbackMode: true, // Always text-only now
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
