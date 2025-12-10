"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModeSelection } from "@/components/chat/mode-selection";
import { MobileGateway } from "@/components/chat/mobile-gateway";
import { Loader2 } from "lucide-react";

type Step = "mode-selection" | "mobile-gateway-human" | "mobile-gateway-ai";

function EmbedChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repId = searchParams.get("repId") || "default";
  const [step, setStep] = useState<Step>("mode-selection");

  const handleHumanSubmit = async (
    mobileNumber: string,
    instagramHandle?: string
  ) => {
    const response = await fetch("/api/init-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repId,
        userMobileNumber: mobileNumber,
        userInstagramHandle: instagramHandle,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to initialize chat");
    }

    const data = await response.json();
    router.push(`/chat/${data.conversationId}`);
  };

  const handleAISubmit = async (mobileNumber: string) => {
    const response = await fetch("/api/init-ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repId,
        userMobileNumber: mobileNumber,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to initialize AI chat");
    }

    const data = await response.json();
    router.push(`/chat/${data.conversationId}`);
  };

  if (step === "mode-selection") {
    return (
      <ModeSelection
        onSelectHuman={() => setStep("mobile-gateway-human")}
        onSelectAI={() => setStep("mobile-gateway-ai")}
      />
    );
  }

  if (step === "mobile-gateway-human") {
    return (
      <MobileGateway
        repId={repId}
        onSubmit={handleHumanSubmit}
        showInstagram
      />
    );
  }

  if (step === "mobile-gateway-ai") {
    return (
      <MobileGateway
        repId={repId}
        onSubmit={handleAISubmit}
        showInstagram={false}
      />
    );
  }

  return null;
}

export default function EmbedChatNewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <EmbedChatContent />
    </Suspense>
  );
}
