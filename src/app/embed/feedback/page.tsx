"use client";

import { useState, useEffect } from "react";
import { FeedbackModal } from "@/components/feedback/feedback-modal";
import { Loader2 } from "lucide-react";

export default function EmbedFeedbackPage() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure styles are loaded
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
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
      <FeedbackModal onClose={handleClose} embedded />
    </div>
  );
}
