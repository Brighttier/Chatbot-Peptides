import type { HeyGenResponse } from "@/types";

// LiveAvatar API (new HeyGen streaming API)
const LIVEAVATAR_API_KEY = process.env.HEYGEN_API_KEY;
const LIVEAVATAR_API_BASE = "https://api.liveavatar.com/v1";

// Legacy HeyGen API base (kept for reference)
const HEYGEN_API_BASE = "https://api.heygen.com/v1";

// HeyGen API client for Live Video Avatar
export async function generateAIResponse(
  userMessage: string,
  conversationContext?: string[]
): Promise<HeyGenResponse> {
  if (!LIVEAVATAR_API_KEY) {
    return {
      success: false,
      error: "HeyGen API key not configured",
    };
  }

  try {
    // Build conversation history for context
    const messages = conversationContext
      ? [...conversationContext, userMessage]
      : [userMessage];

    // Call HeyGen API for interactive avatar response
    const response = await fetch(`${HEYGEN_API_BASE}/interactive_avatar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": LIVEAVATAR_API_KEY,
      },
      body: JSON.stringify({
        text: userMessage,
        voice_id: process.env.HEYGEN_VOICE_ID || "default",
        avatar_id: process.env.HEYGEN_AVATAR_ID || "default",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `HeyGen API error: ${response.status} - ${JSON.stringify(errorData)}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      videoUrl: data.video_url,
      textResponse: data.text_response || generateFallbackTextResponse(userMessage),
    };
  } catch (error) {
    console.error("HeyGen API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown HeyGen API error",
    };
  }
}

// Generate a text-only AI response (fallback mode)
export async function generateTextOnlyResponse(
  userMessage: string,
  conversationContext?: string[]
): Promise<string> {
  // This is a simple fallback response generator
  // In production, you might want to integrate with a text LLM API
  return generateFallbackTextResponse(userMessage);
}

// Simple fallback response generator
function generateFallbackTextResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  // Simple keyword-based responses
  if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
    return "Hello! Thank you for reaching out. How can I assist you today with your peptide needs?";
  }

  if (lowerMessage.includes("price") || lowerMessage.includes("cost")) {
    return "I'd be happy to discuss pricing with you. Could you let me know which specific products you're interested in?";
  }

  if (lowerMessage.includes("shipping") || lowerMessage.includes("delivery")) {
    return "We offer various shipping options. Standard delivery typically takes 3-5 business days. Would you like more details about our shipping policies?";
  }

  if (lowerMessage.includes("help") || lowerMessage.includes("support")) {
    return "I'm here to help! Please let me know what questions you have, and I'll do my best to assist you.";
  }

  // Default response
  return "Thank you for your message. A representative will review your inquiry and respond shortly. Is there anything specific I can help you with in the meantime?";
}

// Create a LiveAvatar streaming session for real-time avatar
// Uses the new LiveAvatar API: https://docs.liveavatar.com
export async function createStreamingSession(): Promise<{
  sessionId: string;
  accessToken: string;
  url: string;
  sessionDurationLimit: number;
} | null> {
  if (!LIVEAVATAR_API_KEY) {
    console.error("LiveAvatar API key not configured");
    return null;
  }

  const avatarId = process.env.HEYGEN_AVATAR_ID;
  const voiceId = process.env.HEYGEN_VOICE_ID;
  const contextId = process.env.HEYGEN_KNOWLEDGE_ID;

  if (!avatarId) {
    console.error("HEYGEN_AVATAR_ID not configured");
    return null;
  }

  if (!contextId) {
    console.error("HEYGEN_KNOWLEDGE_ID (context_id) not configured - required for FULL mode");
    return null;
  }

  try {
    // Step 1: Create session token
    // POST /sessions/token with avatar configuration
    // Note: In FULL mode, context_id is required
    const avatarPersona: Record<string, string> = {
      context_id: contextId,
      language: "en",
    };

    // Only add voice_id if configured
    if (voiceId) {
      avatarPersona.voice_id = voiceId;
    }

    const tokenRequestBody = {
      mode: "FULL",
      avatar_id: avatarId,
      avatar_persona: avatarPersona,
    };

    console.log("LiveAvatar session token request:", JSON.stringify(tokenRequestBody, null, 2));
    console.log("Using avatar_id:", avatarId);

    const tokenResponse = await fetch(`${LIVEAVATAR_API_BASE}/sessions/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": LIVEAVATAR_API_KEY,
      },
      body: JSON.stringify(tokenRequestBody),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error("Failed to create LiveAvatar session token:", tokenResponse.status, errorData);
      return null;
    }

    const tokenResult = await tokenResponse.json();
    console.log("LiveAvatar token response:", JSON.stringify(tokenResult, null, 2));

    const sessionId = tokenResult.session_id;
    const sessionToken = tokenResult.session_token;

    if (!sessionId || !sessionToken) {
      console.error("Invalid response from LiveAvatar sessions/token:", tokenResult);
      return null;
    }

    // Step 2: Start the session
    // POST /sessions/start with Bearer token
    const startResponse = await fetch(`${LIVEAVATAR_API_BASE}/sessions/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionToken}`,
      },
    });

    if (!startResponse.ok) {
      const errorData = await startResponse.json().catch(() => ({}));
      console.error("Failed to start LiveAvatar session:", startResponse.status, errorData);
      return null;
    }

    const startResult = await startResponse.json();
    console.log("LiveAvatar start response:", JSON.stringify(startResult, null, 2));

    // The start response should contain LiveKit room URL and token
    const livekitUrl = startResult.livekit_url || startResult.url;
    const livekitToken = startResult.livekit_client_token || startResult.access_token;

    if (!livekitUrl || !livekitToken) {
      console.error("Invalid response from LiveAvatar sessions/start:", startResult);
      return null;
    }

    return {
      sessionId: sessionId,
      accessToken: livekitToken,
      url: livekitUrl,
      sessionDurationLimit: startResult.session_duration_limit || 600,
    };
  } catch (error) {
    console.error("Error creating LiveAvatar streaming session:", error);
    return null;
  }
}

// Send text to LiveAvatar streaming avatar
export async function sendTextToAvatar(
  sessionId: string,
  text: string,
  _taskType: "talk" | "repeat" = "talk"
): Promise<boolean> {
  if (!LIVEAVATAR_API_KEY) {
    return false;
  }

  try {
    // For LiveAvatar, we need to send events through LiveKit
    // The text interaction happens through the LiveKit room, not a REST API
    // This function may need to be updated based on how the frontend handles messages
    console.log(`sendTextToAvatar called for session ${sessionId}: ${text}`);

    // LiveAvatar uses LiveKit for real-time communication
    // Text messages are typically sent via LiveKit data channels
    // For now, return true as the frontend handles this via LiveKit
    return true;
  } catch (error) {
    console.error("Error sending text to LiveAvatar:", error);
    return false;
  }
}

// Close LiveAvatar streaming session
export async function closeStreamingSession(sessionId: string): Promise<void> {
  if (!LIVEAVATAR_API_KEY) {
    return;
  }

  try {
    // POST /sessions/stop to end the session
    await fetch(`${LIVEAVATAR_API_BASE}/sessions/stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": LIVEAVATAR_API_KEY,
      },
      body: JSON.stringify({
        session_id: sessionId,
      }),
    });
  } catch (error) {
    console.error("Error closing LiveAvatar streaming session:", error);
  }
}
