import { NextResponse } from "next/server";
import {
  createStreamingSession,
  closeStreamingSession,
  sendTextToAvatar,
} from "@/lib/heygen";
import { generateGeminiResponse, generateFallbackResponse } from "@/lib/gemini";

// POST - Create a new streaming session
export async function POST() {
  try {
    // HeyGen/LiveAvatar is disabled - always use text-only AI chat mode
    // The video avatar functionality is preserved but bypassed
    // To re-enable, set HEYGEN_ENABLED=true in environment variables
    const heygenEnabled = process.env.HEYGEN_ENABLED === "true";

    if (!heygenEnabled) {
      console.log("HeyGen/LiveAvatar disabled - using AI text chat mode");
      return NextResponse.json({
        success: true,
        fallbackMode: true,
        sessionId: `fallback-${Date.now()}`,
        message: "Using AI text chat mode",
      });
    }

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

// PUT - Send text to avatar (or generate AI response using Gemini)
export async function PUT(request: Request) {
  try {
    const { sessionId, text } = await request.json();

    if (!sessionId || !text) {
      return NextResponse.json(
        { error: "Session ID and text are required" },
        { status: 400 }
      );
    }

    // Check if this is a fallback/text-only session (uses Gemini AI)
    if (sessionId.startsWith("fallback-")) {
      // Try Gemini first, fall back to simple responses if it fails
      const geminiResult = await generateGeminiResponse(text);

      if (geminiResult.success && geminiResult.response) {
        return NextResponse.json({
          success: true,
          fallbackMode: true,
          aiResponse: geminiResult.response
        });
      }

      // Gemini failed, use simple fallback
      console.log("Gemini failed, using fallback:", geminiResult.error);
      const aiResponse = generateFallbackResponse(text);
      return NextResponse.json({
        success: true,
        fallbackMode: true,
        aiResponse
      });
    }

    // HeyGen video mode (currently disabled)
    const success = await sendTextToAvatar(sessionId, text);

    if (!success) {
      // If HeyGen fails, try Gemini
      const geminiResult = await generateGeminiResponse(text);
      const aiResponse = geminiResult.success && geminiResult.response
        ? geminiResult.response
        : generateFallbackResponse(text);

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
    const aiResponse = generateFallbackResponse("");
    return NextResponse.json({
      success: true,
      fallbackMode: true,
      aiResponse
    });
  }
}

