import { NextResponse } from "next/server";
import {
  createStreamingSession,
  closeStreamingSession,
  sendTextToAvatar,
} from "@/lib/heygen";

// POST - Create a new streaming session
export async function POST() {
  try {
    // Check if HeyGen API key is configured
    if (!process.env.HEYGEN_API_KEY) {
      console.log("HeyGen API key not configured - using fallback mode");
      return NextResponse.json({
        success: true,
        fallbackMode: true,
        sessionId: `fallback-${Date.now()}`,
        message: "HeyGen not configured - using text-only mode",
      });
    }

    const session = await createStreamingSession();

    if (!session) {
      // Return fallback mode instead of error
      console.log("HeyGen session creation failed - using fallback mode");
      return NextResponse.json({
        success: true,
        fallbackMode: true,
        sessionId: `fallback-${Date.now()}`,
        message: "HeyGen unavailable - using text-only mode",
      });
    }

    return NextResponse.json({
      success: true,
      fallbackMode: false,
      sessionId: session.sessionId,
      accessToken: session.accessToken,
      url: session.url,
      sessionDurationLimit: session.sessionDurationLimit,
    });
  } catch (error) {
    console.error("Error creating HeyGen session:", error);
    // Return fallback mode instead of error
    return NextResponse.json({
      success: true,
      fallbackMode: true,
      sessionId: `fallback-${Date.now()}`,
      message: "HeyGen error - using text-only mode",
    });
  }
}

// DELETE - Close a streaming session
export async function DELETE(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    await closeStreamingSession(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error closing HeyGen session:", error);
    return NextResponse.json(
      { error: "Failed to close streaming session" },
      { status: 500 }
    );
  }
}

// PUT - Send text to avatar (or generate fallback response)
export async function PUT(request: Request) {
  try {
    const { sessionId, text } = await request.json();

    if (!sessionId || !text) {
      return NextResponse.json(
        { error: "Session ID and text are required" },
        { status: 400 }
      );
    }

    // Check if this is a fallback session
    if (sessionId.startsWith("fallback-")) {
      // Generate a fallback AI response
      const aiResponse = generateFallbackResponse(text);
      return NextResponse.json({
        success: true,
        fallbackMode: true,
        aiResponse
      });
    }

    const success = await sendTextToAvatar(sessionId, text);

    if (!success) {
      // If HeyGen fails, return fallback response
      const aiResponse = generateFallbackResponse(text);
      return NextResponse.json({
        success: true,
        fallbackMode: true,
        aiResponse
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending text to avatar:", error);
    // Return fallback response on error
    const { text } = await request.json().catch(() => ({ text: "" }));
    const aiResponse = generateFallbackResponse(text || "");
    return NextResponse.json({
      success: true,
      fallbackMode: true,
      aiResponse
    });
  }
}

// Simple fallback response generator for demo purposes
function generateFallbackResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
    return "Hello! I'm your AI assistant. How can I help you today with peptide information?";
  }

  if (lowerMessage.includes("bpc") || lowerMessage.includes("157")) {
    return "BPC-157 is a peptide that has been studied for its potential healing properties. It's commonly researched for tissue repair and gut health support. Would you like to know more about its applications?";
  }

  if (lowerMessage.includes("tb-500") || lowerMessage.includes("tb500") || lowerMessage.includes("thymosin")) {
    return "TB-500 (Thymosin Beta-4) is a peptide known for its research applications in tissue repair and recovery. It's been studied for its potential effects on inflammation and healing processes.";
  }

  if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("buy")) {
    return "I'd be happy to help with pricing information. Could you let me know which specific products you're interested in? Our team can provide detailed pricing and availability.";
  }

  if (lowerMessage.includes("shipping") || lowerMessage.includes("delivery")) {
    return "We offer various shipping options to meet your needs. Standard delivery typically takes 3-5 business days. For expedited shipping or international orders, please let us know your requirements.";
  }

  if (lowerMessage.includes("dosage") || lowerMessage.includes("dose") || lowerMessage.includes("how much")) {
    return "Dosage information should always be discussed with a qualified healthcare professional. Research protocols vary based on the specific peptide and intended use. Would you like me to connect you with our team for more detailed information?";
  }

  if (lowerMessage.includes("side effect") || lowerMessage.includes("safe")) {
    return "Safety is paramount. All peptides should only be used under proper guidance. I recommend consulting with a healthcare professional before starting any new protocol. Can I help you with any other questions?";
  }

  // Default response
  return `Thank you for your question about "${userMessage.substring(0, 50)}${userMessage.length > 50 ? "..." : ""}". Our team specializes in peptide information and would be happy to assist you further. Is there anything specific you'd like to know?`;
}
