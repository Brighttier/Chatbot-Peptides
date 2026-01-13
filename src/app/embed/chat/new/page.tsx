"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModeSelection } from "@/components/chat/mode-selection";
import { MobileGateway, InitialUserData } from "@/components/chat/mobile-gateway";
import { useParentUserData } from "@/hooks/useParentUserData";
import { Loader2 } from "lucide-react";

interface IntakeAnswers {
  goals: string[];
  stage: string;
  interest: string[];
}

interface CustomerData {
  mobileNumber: string;
  instagramHandle?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  consentGiven: boolean;
  intakeAnswers?: IntakeAnswers;
}

type Step = "mode-selection" | "mobile-gateway-human" | "mobile-gateway-ai";

function EmbedChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repId = searchParams.get("repId") || "default";
  const [step, setStep] = useState<Step>("mode-selection");

  // Listen for user data from parent window (Lovable/Supabase)
  const { userData, isLoading: isLoadingUserData, hasCompleteData } = useParentUserData();

  // Convert parent user data to InitialUserData format
  const initialData: InitialUserData | null = userData ? {
    firstName: userData.firstName,
    lastName: userData.lastName,
    phone: userData.phone,
    dateOfBirth: userData.dateOfBirth,
    email: userData.email,
  } : null;

  const handleHumanSubmit = async (data: CustomerData) => {
    const response = await fetch("/api/init-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repId,
        userMobileNumber: data.mobileNumber,
        userInstagramHandle: data.instagramHandle,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        consentGiven: data.consentGiven,
        intakeAnswers: data.intakeAnswers,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to initialize chat");
    }

    const responseData = await response.json();
    router.push(`/chat/${responseData.conversationId}`);
  };

  const handleAISubmit = async (data: CustomerData) => {
    const response = await fetch("/api/init-ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repId,
        userMobileNumber: data.mobileNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        consentGiven: data.consentGiven,
        intakeAnswers: data.intakeAnswers,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to initialize AI chat");
    }

    const responseData = await response.json();
    router.push(`/chat/${responseData.conversationId}`);
  };

  // Show loading state while waiting for parent user data (max 2 seconds)
  if (isLoadingUserData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
        initialData={initialData}
        autoSkipContact={hasCompleteData}
      />
    );
  }

  if (step === "mobile-gateway-ai") {
    return (
      <MobileGateway
        repId={repId}
        onSubmit={handleAISubmit}
        showInstagram={false}
        initialData={initialData}
        autoSkipContact={hasCompleteData}
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
