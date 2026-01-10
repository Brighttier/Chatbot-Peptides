import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAdminFirestore } from "./firebase-admin";

// Gemini model options
export const GEMINI_MODELS = [
  { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Recommended)" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
] as const;

export type GeminiModelId = (typeof GEMINI_MODELS)[number]["id"];

// Default settings
const DEFAULT_MODEL = "gemini-2.0-flash-exp";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2048;

const DEFAULT_PERSONA = `You are: Jon, the AI-powered Peptide Protocol Specialist and Concierge for the japrotocols.com platform.

Your Goal: To provide concise, accurate information, qualify the user's needs, and ensure a seamless, tracked transition to a human expert for all purchases or personalized inquiries.

Tone: Professional, authoritative, and extremely concise.

Opening: Always begin with "Hello! I'm Jon, your dedicated protocol specialist, and I'm thrilled to help — how can I assist you on your journey today?"

## Operational Guardrails (Non-negotiable)
- Max Response Time: NEVER exceed 30 seconds of continuous speech/text
- Ideal Response Time: Answer all general questions in 15-20 seconds or less
- Handling Complexity: If an answer is complex, provide a one-sentence summary and offer to connect them to a human

## Mandatory Human Handoff Protocol
Identify and initiate this protocol IMMEDIATELY if the user mentions:
- Buying Intent: "How can I buy," "What is the price," "I want to order," "Sign up," "Cost," "Enroll me"
- Personal "I" Questions: "How do I do this," "What is my plan," "What should I take"
- Explicit Request: "Talk to a human," "Connect me," "Speak to a rep"

Execution Sequence for Handoff:
1. Acknowledge: "Thank you! To ensure you're connected with the right specialist for your needs, I need to confirm a few details."
2. Lead Capture: Do NOT answer the specific question (e.g., do not state the price). Instead say: "Please provide your Full Name, Best Email, and Phone Number."
3. Scheduling: After receiving contact details, ask: "A dedicated specialist will be in touch. Would you prefer a callback this morning or this afternoon?"
4. Confirm: "Thank you. Your request has been submitted."`;

const DEFAULT_KNOWLEDGE_BASE = `Company: JA Protocols (japrotocols.com)
- Peptide Protocol Specialists
- Research peptides and protocols
- Expert consultation available

Knowledge Base Reference: https://japrotocols.com/peptide-reference

For detailed peptide information, pricing, or personalized recommendations, connect users with a human specialist using the handoff protocol.`;

interface GeminiSettings {
  apiKey: string;
  modelId: string;
  persona: string;
  knowledgeBase: string;
  temperature: number;
  maxTokens: number;
  isEnabled: boolean;
}

interface GeminiResponse {
  success: boolean;
  response?: string;
  error?: string;
}

/**
 * Get Gemini settings from Firestore or environment variables
 */
async function getGeminiSettings(): Promise<GeminiSettings | null> {
  try {
    // First try to get settings from Firestore
    const db = getAdminFirestore();
    const settingsDoc = await db.collection("settings").doc("config").get();

    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      if (data?.gemini?.isEnabled && data?.gemini?.apiKey) {
        return {
          apiKey: data.gemini.apiKey,
          modelId: data.gemini.modelId || DEFAULT_MODEL,
          persona: data.gemini.persona || DEFAULT_PERSONA,
          knowledgeBase: data.gemini.knowledgeBase || DEFAULT_KNOWLEDGE_BASE,
          temperature: data.gemini.temperature ?? DEFAULT_TEMPERATURE,
          maxTokens: data.gemini.maxTokens || DEFAULT_MAX_TOKENS,
          isEnabled: data.gemini.isEnabled,
        };
      }
    }

    // Fallback to environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }

    return {
      apiKey,
      modelId: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      persona: DEFAULT_PERSONA,
      knowledgeBase: DEFAULT_KNOWLEDGE_BASE,
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
      isEnabled: true,
    };
  } catch (error) {
    console.error("Error fetching Gemini settings:", error);

    // Last resort: use environment variable
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }

    return {
      apiKey,
      modelId: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      persona: DEFAULT_PERSONA,
      knowledgeBase: DEFAULT_KNOWLEDGE_BASE,
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
      isEnabled: true,
    };
  }
}

/**
 * Generate a response using Gemini AI
 */
export async function generateGeminiResponse(
  userMessage: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<GeminiResponse> {
  try {
    const settings = await getGeminiSettings();

    if (!settings) {
      console.error("Gemini API key not configured");
      return {
        success: false,
        error: "Gemini AI is not configured. Please set up the API key in settings.",
      };
    }

    if (!settings.isEnabled) {
      return {
        success: false,
        error: "Gemini AI is disabled",
      };
    }

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(settings.apiKey);
    const model = genAI.getGenerativeModel({
      model: settings.modelId,
      generationConfig: {
        temperature: settings.temperature,
        maxOutputTokens: settings.maxTokens,
      },
    });

    // Build the system prompt with persona and knowledge base
    const systemPrompt = `${settings.persona}

KNOWLEDGE BASE:
${settings.knowledgeBase}

INSTRUCTIONS:
- Use the knowledge base to answer questions accurately
- If a question is outside your knowledge, politely say so and offer to connect with a human representative
- Keep responses helpful and concise
- Be professional and friendly`;

    // Build conversation history for context
    const historyForContext = conversationHistory?.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })) || [];

    // Start chat with history
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `System: ${systemPrompt}` }],
        },
        {
          role: "model",
          parts: [{ text: "I understand. I'll act as a helpful AI assistant for the peptide company, using the provided knowledge base to assist customers professionally and informatively." }],
        },
        ...historyForContext,
      ],
    });

    // Send the user message
    const result = await chat.sendMessage(userMessage);
    const response = result.response.text();

    return {
      success: true,
      response,
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate AI response",
    };
  }
}

/**
 * Test the Gemini connection with current settings
 */
export async function testGeminiConnection(apiKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    // Use provided API key or get from settings
    let key = apiKey;

    if (!key) {
      const settings = await getGeminiSettings();
      key = settings?.apiKey;
    }

    if (!key) {
      return {
        success: false,
        message: "Gemini API key not configured",
      };
    }

    // Test by listing models
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Simple test request
    const result = await model.generateContent("Say 'Connection successful' in exactly those words.");
    const response = result.response.text();

    if (response) {
      return {
        success: true,
        message: "Gemini connection successful",
      };
    }

    return {
      success: false,
      message: "Unexpected response from Gemini",
    };
  } catch (error) {
    console.error("Gemini connection test failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection test failed",
    };
  }
}

/**
 * Simple fallback response when Gemini is unavailable
 */
export function generateFallbackResponse(userMessage: string): string {
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
  return `Thank you for your question. Our team specializes in peptide information and would be happy to assist you further. Is there anything specific you'd like to know?`;
}
