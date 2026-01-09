"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Save,
  Plug,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Sparkles,
  Info,
} from "lucide-react";

// Available Gemini models
const GEMINI_MODELS = [
  { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Recommended)" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
];

interface GeminiSettings {
  apiKey: string;
  modelId: string;
  persona: string;
  knowledgeBase: string;
  temperature: number;
  maxTokens: number;
  isEnabled: boolean;
}

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

const initialSettings: GeminiSettings = {
  apiKey: "",
  modelId: "gemini-2.0-flash-exp",
  persona: DEFAULT_PERSONA,
  knowledgeBase: DEFAULT_KNOWLEDGE_BASE,
  temperature: 0.7,
  maxTokens: 2048,
  isEnabled: true,
};

export function GeminiAIForm() {
  const [settings, setSettings] = useState<GeminiSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Visibility states
  const [showApiKey, setShowApiKey] = useState(false);

  // Test connection states
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"success" | "error" | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      if (data.settings?.gemini) {
        setSettings({
          apiKey: data.settings.gemini.apiKey || "",
          modelId: data.settings.gemini.modelId || "gemini-2.0-flash-exp",
          persona: data.settings.gemini.persona || DEFAULT_PERSONA,
          knowledgeBase: data.settings.gemini.knowledgeBase || DEFAULT_KNOWLEDGE_BASE,
          temperature: data.settings.gemini.temperature ?? 0.7,
          maxTokens: data.settings.gemini.maxTokens || 2048,
          isEnabled: data.settings.gemini.isEnabled ?? true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gemini: settings,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccessMessage("Gemini AI settings saved successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    setConnectionMessage(null);

    try {
      const response = await fetch("/api/admin/settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "gemini" }),
      });

      const data = await response.json();
      setConnectionStatus(data.success ? "success" : "error");
      setConnectionMessage(data.message || (data.success ? "Connected!" : "Connection failed"));
    } catch {
      setConnectionStatus("error");
      setConnectionMessage("Failed to test connection");
    } finally {
      setTestingConnection(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Gemini AI Configuration</h2>
        <p className="text-sm text-gray-500">
          Configure Google Gemini AI for intelligent text chat responses
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-lg bg-green-50 text-green-600 text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {/* API Configuration */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Gemini AI</h3>
              <p className="text-sm text-gray-500">Google&apos;s advanced AI for text responses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connectionStatus === "success" && (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Connected
              </span>
            )}
            {connectionStatus === "error" && (
              <span className="flex items-center gap-1 text-red-600 text-sm" title={connectionMessage || ""}>
                <XCircle className="h-4 w-4" />
                Failed
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={testingConnection || !settings.apiKey}
            >
              {testingConnection ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plug className="h-4 w-4 mr-1" />
                  Test
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="gemini-api-key">API Key</Label>
            <div className="relative">
              <Input
                id="gemini-api-key"
                type={showApiKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) =>
                  setSettings({ ...settings, apiKey: e.target.value })
                }
                placeholder="Enter your Google Gemini API key"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Get your API key from{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="gemini-model">Model</Label>
            <select
              id="gemini-model"
              value={settings.modelId}
              onChange={(e) =>
                setSettings({ ...settings, modelId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {GEMINI_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Gemini 2.0 Flash is recommended for fast, high-quality responses
            </p>
          </div>

          {/* Temperature & Max Tokens */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gemini-temperature">
                Temperature: {settings.temperature.toFixed(1)}
              </Label>
              <input
                id="gemini-temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) =>
                  setSettings({ ...settings, temperature: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500">
                Lower = more focused, Higher = more creative
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gemini-max-tokens">Max Tokens</Label>
              <Input
                id="gemini-max-tokens"
                type="number"
                min="100"
                max="8192"
                value={settings.maxTokens}
                onChange={(e) =>
                  setSettings({ ...settings, maxTokens: parseInt(e.target.value) || 2048 })
                }
              />
              <p className="text-xs text-gray-500">
                Maximum response length (100-8192)
              </p>
            </div>
          </div>

          {/* Enable/Disable */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="gemini-enabled"
              checked={settings.isEnabled}
              onChange={(e) =>
                setSettings({ ...settings, isEnabled: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="gemini-enabled" className="text-sm font-normal">
              Enable Gemini AI for chat responses
            </Label>
          </div>
        </div>
      </div>

      {/* AI Persona */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Info className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">AI Persona</h3>
            <p className="text-sm text-gray-500">Define how the AI should behave and respond</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gemini-persona">System Prompt / Personality</Label>
          <textarea
            id="gemini-persona"
            value={settings.persona}
            onChange={(e) =>
              setSettings({ ...settings, persona: e.target.value })
            }
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            placeholder="Describe how the AI should behave..."
          />
          <p className="text-xs text-gray-500">
            This sets the AI&apos;s personality, tone, and behavior guidelines
          </p>
        </div>
      </div>

      {/* Knowledge Base */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Knowledge Base</h3>
            <p className="text-sm text-gray-500">Information the AI can use to answer questions</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gemini-knowledge">Company & Product Information</Label>
          <textarea
            id="gemini-knowledge"
            value={settings.knowledgeBase}
            onChange={(e) =>
              setSettings({ ...settings, knowledgeBase: e.target.value })
            }
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono"
            placeholder="Enter product information, FAQs, company details..."
          />
          <p className="text-xs text-gray-500">
            Add product details, FAQs, pricing info, shipping policies, and any other information the AI should know.
            The AI will use this to provide accurate responses.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
