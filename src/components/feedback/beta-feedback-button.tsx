"use client";

import { useState, useEffect } from "react";
import { Bug } from "lucide-react";
import { FeedbackModal } from "./feedback-modal";

interface FeedbackSettings {
  isEnabled: boolean;
  buttonLabel: string;
  buttonColor: string;
}

export function BetaFeedbackButton() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [settings, setSettings] = useState<FeedbackSettings>({
    isEnabled: false,
    buttonLabel: "Feedback",
    buttonColor: "#8B5CF6", // Purple default
  });
  const [isLoading, setIsLoading] = useState(true);

  // Detect if running inside an iframe (widget embed context)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsInIframe(window.parent !== window);
    }
  }, []);

  useEffect(() => {
    // Skip fetching settings if in iframe - widget.js handles the button on parent
    if (isInIframe) {
      setIsLoading(false);
      return;
    }

    fetch("/api/feedback/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.isEnabled !== undefined) {
          setIsEnabled(data.isEnabled);
          setSettings({
            isEnabled: data.isEnabled,
            buttonLabel: data.buttonLabel || "Feedback",
            buttonColor: data.buttonColor || "#8B5CF6",
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load feedback settings:", err);
        setIsEnabled(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isInIframe]);

  // Don't render anything if:
  // - Still loading
  // - Feedback is disabled
  // - Running inside an iframe (widget.js will inject button on parent website instead)
  if (isLoading || !isEnabled || isInIframe) {
    return null;
  }

  return (
    <>
      {/* Floating Button - Bottom Left */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 bottom-6 z-[9997] flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white font-medium text-sm transition-all hover:scale-105 hover:shadow-xl"
        style={{ backgroundColor: settings.buttonColor }}
        data-feedback-ui="true"
      >
        <Bug className="h-5 w-5" />
        <span className="hidden sm:inline">{settings.buttonLabel}</span>
      </button>

      {/* Modal */}
      {isOpen && <FeedbackModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
