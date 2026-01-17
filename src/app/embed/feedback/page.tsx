"use client";

import { useState, useEffect, useCallback } from "react";
import { FeedbackModal } from "@/components/feedback/feedback-modal";
import { Loader2 } from "lucide-react";

export default function EmbedFeedbackPage() {
  const [isReady, setIsReady] = useState(false);
  const [initialScreenshot, setInitialScreenshot] = useState<string | null>(null);

  useEffect(() => {
    // Method 1: Try to get screenshot from opener's sessionStorage (same-origin only)
    try {
      if (typeof window !== "undefined" && window.opener) {
        const screenshot = window.opener.sessionStorage.getItem("peptide-feedback-screenshot");
        if (screenshot) {
          setInitialScreenshot(screenshot);
          // Clear it after reading to avoid reuse
          window.opener.sessionStorage.removeItem("peptide-feedback-screenshot");
        }
      }
    } catch (e) {
      // Cross-origin access will fail - that's expected, we'll use postMessage
      console.log("SessionStorage access failed (cross-origin), using postMessage instead");
    }

    // Method 2: Listen for screenshot via postMessage (cross-origin support)
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PEPTIDE_INITIAL_SCREENSHOT" && event.data.data) {
        setInitialScreenshot(event.data.data);
      }
    };
    window.addEventListener("message", handleMessage);

    // Signal to parent that we're ready to receive the screenshot
    if (typeof window !== "undefined" && window.opener) {
      try {
        window.opener.postMessage({ type: "PEPTIDE_FEEDBACK_READY" }, "*");
      } catch (e) {
        console.log("Could not send ready signal to opener:", e);
      }
    }

    // Small delay to ensure styles are loaded
    const timer = setTimeout(() => setIsReady(true), 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Handler to request new screenshot from parent window
  const handleRetakeScreenshot = useCallback(() => {
    return new Promise<string | null>((resolve) => {
      if (typeof window === "undefined" || !window.opener) {
        resolve(null);
        return;
      }

      // Set up listener for response
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === "PEPTIDE_SCREENSHOT_CAPTURED") {
          window.removeEventListener("message", handleMessage);
          resolve(event.data.data || null);
        }
      };
      window.addEventListener("message", handleMessage);

      // Request screenshot from parent
      window.opener.postMessage({ type: "PEPTIDE_CAPTURE_SCREENSHOT" }, "*");

      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        resolve(null);
      }, 10000);
    });
  }, []);

  const handleClose = () => {
    // Close the popup window
    if (typeof window !== "undefined") {
      window.close();
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FeedbackModal
        onClose={handleClose}
        embedded
        initialScreenshot={initialScreenshot}
        onRetakeScreenshot={handleRetakeScreenshot}
      />
    </div>
  );
}
