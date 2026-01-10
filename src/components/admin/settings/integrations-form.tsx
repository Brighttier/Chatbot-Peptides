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
  MessageSquare,
} from "lucide-react";

interface IntegrationSettings {
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    isEnabled: boolean;
  };
}

const initialSettings: IntegrationSettings = {
  twilio: {
    accountSid: "",
    authToken: "",
    phoneNumber: "",
    isEnabled: true,
  },
};

export function IntegrationsForm() {
  const [settings, setSettings] = useState<IntegrationSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Visibility states for sensitive fields
  const [showTwilioSid, setShowTwilioSid] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);

  // Test connection states
  const [testingTwilio, setTestingTwilio] = useState(false);
  const [twilioStatus, setTwilioStatus] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      if (data.settings) {
        setSettings({
          twilio: {
            accountSid: data.settings.twilio?.accountSid || "",
            authToken: data.settings.twilio?.authToken || "",
            phoneNumber: data.settings.twilio?.phoneNumber || "",
            isEnabled: data.settings.twilio?.isEnabled ?? true,
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
        body: JSON.stringify({
          twilio: settings.twilio,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccessMessage("Settings saved successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const testTwilioConnection = async () => {
    setTestingTwilio(true);
    setTwilioStatus(null);

    try {
      const response = await fetch("/api/admin/settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "twilio" }),
      });

      const data = await response.json();
      setTwilioStatus(data.success ? "success" : "error");
    } catch {
      setTwilioStatus("error");
    } finally {
      setTestingTwilio(false);
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
        <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
        <p className="text-sm text-gray-500">
          Configure Twilio SMS integration for human chat
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

      {/* Twilio Configuration */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Twilio Conversations</h3>
              <p className="text-sm text-gray-500">SMS & Conversation API configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {twilioStatus === "success" && (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Connected
              </span>
            )}
            {twilioStatus === "error" && (
              <span className="flex items-center gap-1 text-red-600 text-sm">
                <XCircle className="h-4 w-4" />
                Failed
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={testTwilioConnection}
              disabled={testingTwilio || !settings.twilio.accountSid}
            >
              {testingTwilio ? (
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
          <div className="space-y-2">
            <Label htmlFor="twilio-sid">Account SID</Label>
            <div className="relative">
              <Input
                id="twilio-sid"
                type={showTwilioSid ? "text" : "password"}
                value={settings.twilio.accountSid}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    twilio: { ...settings.twilio, accountSid: e.target.value },
                  })
                }
                placeholder="Enter your Twilio Account SID"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowTwilioSid(!showTwilioSid)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showTwilioSid ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="twilio-token">Auth Token</Label>
            <div className="relative">
              <Input
                id="twilio-token"
                type={showTwilioToken ? "text" : "password"}
                value={settings.twilio.authToken}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    twilio: { ...settings.twilio, authToken: e.target.value },
                  })
                }
                placeholder="Enter your Twilio Auth Token"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowTwilioToken(!showTwilioToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showTwilioToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="twilio-phone">Phone Number</Label>
            <Input
              id="twilio-phone"
              value={settings.twilio.phoneNumber}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  twilio: { ...settings.twilio, phoneNumber: e.target.value },
                })
              }
              placeholder="+1234567890"
            />
            <p className="text-xs text-gray-500">
              Include country code (e.g., +1 for US)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="twilio-enabled"
              checked={settings.twilio.isEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  twilio: { ...settings.twilio, isEnabled: e.target.checked },
                })
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="twilio-enabled" className="text-sm font-normal">
              Enable Twilio SMS
            </Label>
          </div>
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
