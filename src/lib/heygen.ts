import type { HeyGenResponse } from "@/types";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_BASE = "https://api.heygen.com/v1";

// HeyGen API client for Live Video Avatar
export async function generateAIResponse(
  userMessage: string,
  conversationContext?: string[]
): Promise<HeyGenResponse> {
  if (!HEYGEN_API_KEY) {
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
        "X-Api-Key": HEYGEN_API_KEY,
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

// Create a HeyGen streaming session for real-time avatar
export async function createStreamingSession(): Promise<{
  sessionId: string;
  accessToken: string;
  url: string;
  sessionDurationLimit: number;
} | null> {
  if (!HEYGEN_API_KEY) {
    console.error("HeyGen API key not configured");
    return null;
  }

  try {
    // Build request body - only include voice if configured
    const requestBody: Record<string, unknown> = {
      quality: "medium",
      avatar_name: process.env.HEYGEN_AVATAR_ID || "Wayne_20240711",
      version: "v2",
      video_encoding: "H264",
    };

    // Only add voice settings if voice ID is configured
    if (process.env.HEYGEN_VOICE_ID) {
      requestBody.voice = {
        voice_id: process.env.HEYGEN_VOICE_ID,
      };
    }

    // Add knowledge base ID if configured (for LLM-powered responses)
    // Note: parameter is knowledge_base_id (not knowledge_id), requires version: "v2"
    if (process.env.HEYGEN_KNOWLEDGE_ID) {
      requestBody.knowledge_base_id = process.env.HEYGEN_KNOWLEDGE_ID;
    }

    // Step 1: Create new session
    const response = await fetch(`${HEYGEN_API_BASE}/streaming.new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": HEYGEN_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Failed to create HeyGen streaming session:", response.status, errorData);
      return null;
    }

    const result = await response.json();
    const data = result.data;

    if (!data?.session_id) {
      console.error("Invalid response from HeyGen streaming.new:", result);
      return null;
    }

    // Step 2: Start the streaming session
    const startResponse = await fetch(`${HEYGEN_API_BASE}/streaming.start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": HEYGEN_API_KEY,
      },
      body: JSON.stringify({
        session_id: data.session_id,
      }),
    });

    if (!startResponse.ok) {
      const errorData = await startResponse.json().catch(() => ({}));
      console.error("Failed to start HeyGen streaming session:", startResponse.status, errorData);
      // Try to clean up the created session
      await closeStreamingSession(data.session_id);
      return null;
    }

    return {
      sessionId: data.session_id,
      accessToken: data.access_token,
      url: data.url,
      sessionDurationLimit: data.session_duration_limit || 600,
    };
  } catch (error) {
    console.error("Error creating HeyGen streaming session:", error);
    return null;
  }
}

// Send text to HeyGen streaming avatar
// task_type: "talk" processes through HeyGen's LLM/knowledge base before speaking
// task_type: "repeat" speaks the exact text provided
export async function sendTextToAvatar(
  sessionId: string,
  text: string,
  taskType: "talk" | "repeat" = "talk"
): Promise<boolean> {
  if (!HEYGEN_API_KEY) {
    return false;
  }

  try {
    const response = await fetch(`${HEYGEN_API_BASE}/streaming.task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": HEYGEN_API_KEY,
      },
      body: JSON.stringify({
        session_id: sessionId,
        text,
        task_type: taskType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Failed to send text to HeyGen avatar:", response.status, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending text to HeyGen avatar:", error);
    return false;
  }
}

// Close HeyGen streaming session
export async function closeStreamingSession(sessionId: string): Promise<void> {
  if (!HEYGEN_API_KEY) {
    return;
  }

  try {
    await fetch(`${HEYGEN_API_BASE}/streaming.stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": HEYGEN_API_KEY,
      },
      body: JSON.stringify({
        session_id: sessionId,
      }),
    });
  } catch (error) {
    console.error("Error closing HeyGen streaming session:", error);
  }
}
