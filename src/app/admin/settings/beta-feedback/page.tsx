"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Bug, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BetaFeedbackSettings {
  isEnabled: boolean;
  buttonLabel: string;
  buttonColor: string;
}

const DEFAULT_SETTINGS: BetaFeedbackSettings = {
  isEnabled: false,
  buttonLabel: "Feedback",
  buttonColor: "#8B5CF6",
};

export default function BetaFeedbackSettingsPage() {
  const [settings, setSettings] = useState<BetaFeedbackSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (response.ok) {
        const data = await response.json();
        if (data.betaFeedback) {
          setSettings({
            isEnabled: data.betaFeedback.isEnabled ?? false,
            buttonLabel: data.betaFeedback.buttonLabel || "Feedback",
            buttonColor: data.betaFeedback.buttonColor || "#8B5CF6",
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betaFeedback: settings,
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Settings saved successfully!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage({ type: "error", text: "Failed to save settings. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Beta Feedback Widget</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enable a feedback button for users to report bugs and request features.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Enable Toggle */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium">Enable Beta Feedback</Label>
            <p className="text-sm text-gray-500">
              Show the feedback button on all pages for users to submit feedback.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.isEnabled}
              onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Customization */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-medium text-gray-900">Customization</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Button Label */}
          <div className="space-y-2">
            <Label htmlFor="buttonLabel">Button Label</Label>
            <Input
              id="buttonLabel"
              value={settings.buttonLabel}
              onChange={(e) => setSettings({ ...settings, buttonLabel: e.target.value })}
              placeholder="Feedback"
              maxLength={20}
            />
            <p className="text-xs text-gray-500">Text shown on the button (max 20 chars)</p>
          </div>

          {/* Button Color */}
          <div className="space-y-2">
            <Label htmlFor="buttonColor">Button Color</Label>
            <div className="flex gap-2">
              <Input
                id="buttonColor"
                type="color"
                value={settings.buttonColor}
                onChange={(e) => setSettings({ ...settings, buttonColor: e.target.value })}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={settings.buttonColor}
                onChange={(e) => setSettings({ ...settings, buttonColor: e.target.value })}
                placeholder="#8B5CF6"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-4 w-4 text-gray-500" />
          <h3 className="font-medium text-gray-900">Preview</h3>
        </div>
        <div className="bg-gray-100 rounded-lg p-8 flex items-end justify-start min-h-[120px] relative">
          <button
            className="flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white font-medium text-sm transition-all hover:scale-105"
            style={{ backgroundColor: settings.buttonColor }}
          >
            <Bug className="h-5 w-5" />
            {settings.buttonLabel || "Feedback"}
          </button>
          <p className="absolute top-2 right-2 text-xs text-gray-400">
            Bottom-left corner of screen
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
