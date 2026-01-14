"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Save,
  CheckCircle,
  MessageCircle,
  Palette,
  Layout,
  Type,
} from "lucide-react";

interface WidgetColors {
  primary: string;
  primaryForeground: string;
  accent: string;
  background: string;
  foreground: string;
}

interface WidgetSettings {
  colors: WidgetColors;
  logo?: string;
  welcomeMessage: string;
  position: "bottom-right" | "bottom-left";
  autoExpand: boolean;
  expandDelay: number;
  size: "compact" | "standard" | "large";
  borderRadius: number;
  bubbleLabel: string;
}

const defaultSettings: WidgetSettings = {
  colors: {
    primary: "#2563eb",
    primaryForeground: "#ffffff",
    accent: "#3b82f6",
    background: "#ffffff",
    foreground: "#1f2937",
  },
  welcomeMessage: "Hi! How can I help you today?",
  position: "bottom-right",
  autoExpand: false,
  expandDelay: 3000,
  size: "standard",
  borderRadius: 16,
  bubbleLabel: "Chat with our protocol concierge now",
};

const sizeOptions = {
  compact: { width: 350, label: "Compact (350px)" },
  standard: { width: 400, label: "Standard (400px)" },
  large: { width: 500, label: "Large (500px)" },
};

export function WidgetCustomizer() {
  const [settings, setSettings] = useState<WidgetSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"colors" | "layout" | "text">("colors");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      if (data.settings?.widget) {
        setSettings({
          ...defaultSettings,
          ...data.settings.widget,
          colors: {
            ...defaultSettings.colors,
            ...data.settings.widget.colors,
          },
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
        body: JSON.stringify({ widget: settings }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccessMessage("Widget settings saved successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateColor = (key: keyof WidgetColors, value: string) => {
    setSettings({
      ...settings,
      colors: { ...settings.colors, [key]: value },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Widget Customization</h2>
        <p className="text-sm text-gray-500">
          Customize the look and feel of your chat widget
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b pb-2">
            <button
              onClick={() => setActiveTab("colors")}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "colors"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Palette className="h-4 w-4" />
              Colors
            </button>
            <button
              onClick={() => setActiveTab("layout")}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "layout"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Layout className="h-4 w-4" />
              Layout
            </button>
            <button
              onClick={() => setActiveTab("text")}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "text"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Type className="h-4 w-4" />
              Text
            </button>
          </div>

          {/* Colors Tab */}
          {activeTab === "colors" && (
            <div className="bg-white rounded-lg border p-4 space-y-4">
              <h3 className="font-medium text-gray-900">Color Scheme</h3>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="primary-color"
                      value={settings.colors.primary}
                      onChange={(e) => updateColor("primary", e.target.value)}
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      value={settings.colors.primary}
                      onChange={(e) => updateColor("primary", e.target.value)}
                      placeholder="#2563eb"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Used for buttons and links</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary-foreground">Primary Text Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="primary-foreground"
                      value={settings.colors.primaryForeground}
                      onChange={(e) => updateColor("primaryForeground", e.target.value)}
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      value={settings.colors.primaryForeground}
                      onChange={(e) => updateColor("primaryForeground", e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Text color on primary background</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="accent-color"
                      value={settings.colors.accent}
                      onChange={(e) => updateColor("accent", e.target.value)}
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      value={settings.colors.accent}
                      onChange={(e) => updateColor("accent", e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Used for badges and highlights</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="background-color">Background Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="background-color"
                      value={settings.colors.background}
                      onChange={(e) => updateColor("background", e.target.value)}
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      value={settings.colors.background}
                      onChange={(e) => updateColor("background", e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="foreground-color">Text Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="foreground-color"
                      value={settings.colors.foreground}
                      onChange={(e) => updateColor("foreground", e.target.value)}
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      value={settings.colors.foreground}
                      onChange={(e) => updateColor("foreground", e.target.value)}
                      placeholder="#1f2937"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Layout Tab */}
          {activeTab === "layout" && (
            <div className="bg-white rounded-lg border p-4 space-y-4">
              <h3 className="font-medium text-gray-900">Layout Settings</h3>

              <div className="space-y-2">
                <Label htmlFor="position">Widget Position</Label>
                <select
                  id="position"
                  value={settings.position}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      position: e.target.value as "bottom-right" | "bottom-left",
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Widget Size</Label>
                <select
                  id="size"
                  value={settings.size}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      size: e.target.value as "compact" | "standard" | "large",
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(sizeOptions).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="border-radius">
                  Border Radius: {settings.borderRadius}px
                </Label>
                <input
                  type="range"
                  id="border-radius"
                  min="0"
                  max="24"
                  value={settings.borderRadius}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      borderRadius: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto-expand"
                    checked={settings.autoExpand}
                    onChange={(e) =>
                      setSettings({ ...settings, autoExpand: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="auto-expand" className="text-sm font-normal">
                    Auto-expand widget after delay
                  </Label>
                </div>

                {settings.autoExpand && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="expand-delay">
                      Expand Delay: {settings.expandDelay / 1000}s
                    </Label>
                    <input
                      type="range"
                      id="expand-delay"
                      min="1000"
                      max="10000"
                      step="500"
                      value={settings.expandDelay}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          expandDelay: parseInt(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Text Tab */}
          {activeTab === "text" && (
            <div className="bg-white rounded-lg border p-4 space-y-4">
              <h3 className="font-medium text-gray-900">Text Settings</h3>

              <div className="space-y-2">
                <Label htmlFor="bubble-label">Bubble Label</Label>
                <Input
                  id="bubble-label"
                  value={settings.bubbleLabel}
                  onChange={(e) =>
                    setSettings({ ...settings, bubbleLabel: e.target.value })
                  }
                  placeholder="Chat with our protocol concierge now"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500">
                  Text shown above the chat bubble when closed. Leave empty to hide.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome-message">Welcome Message</Label>
                <textarea
                  id="welcome-message"
                  value={settings.welcomeMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, welcomeMessage: e.target.value })
                  }
                  placeholder="Hi! How can I help you today?"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-500">
                  Displayed when the chat widget first opens
                </p>
              </div>
            </div>
          )}

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

        {/* Preview Panel */}
        <div className="lg:sticky lg:top-4">
          <div className="bg-gray-100 rounded-lg p-4 h-[500px] relative overflow-hidden">
            <p className="text-xs text-gray-500 mb-4 text-center">Live Preview</p>

            {/* Preview website background */}
            <div className="absolute inset-4 top-10 bg-white rounded-lg border shadow-sm">
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <div className="h-8 w-32 bg-gray-100 rounded mb-4" />
                <div className="h-4 w-48 bg-gray-100 rounded mb-2" />
                <div className="h-4 w-40 bg-gray-100 rounded mb-2" />
                <div className="h-4 w-44 bg-gray-100 rounded" />
              </div>
            </div>

            {/* Widget bubble */}
            <div
              className={`absolute ${
                settings.position === "bottom-right" ? "right-6" : "left-6"
              } bottom-6`}
            >
              {/* Bubble icon */}
              <button
                className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 animate-pulse"
                style={{ backgroundColor: settings.colors.primary }}
              >
                <MessageCircle
                  className="h-6 w-6"
                  style={{ color: settings.colors.primaryForeground }}
                />
              </button>
            </div>

            {/* Expanded chat preview (tooltip) */}
            <div
              className={`absolute ${
                settings.position === "bottom-right" ? "right-6" : "left-6"
              } bottom-24 shadow-xl overflow-hidden`}
              style={{
                width: Math.min(sizeOptions[settings.size].width, 280),
                borderRadius: settings.borderRadius,
                backgroundColor: settings.colors.background,
              }}
            >
              {/* Chat header */}
              <div
                className="px-4 py-3"
                style={{ backgroundColor: settings.colors.primary }}
              >
                <h4
                  className="font-medium text-sm"
                  style={{ color: settings.colors.primaryForeground }}
                >
                  Peptide Chat
                </h4>
              </div>

              {/* Chat body */}
              <div className="p-3 h-32">
                <div
                  className="p-2 rounded-lg text-sm max-w-[80%]"
                  style={{
                    backgroundColor: settings.colors.accent + "20",
                    color: settings.colors.foreground,
                  }}
                >
                  {settings.welcomeMessage || "Hi! How can I help you?"}
                </div>
              </div>

              {/* Chat input */}
              <div className="p-2 border-t">
                <div
                  className="h-8 rounded-full px-3 flex items-center text-xs"
                  style={{
                    backgroundColor: settings.colors.background,
                    border: `1px solid ${settings.colors.foreground}20`,
                    color: settings.colors.foreground + "60",
                  }}
                >
                  Type a message...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
