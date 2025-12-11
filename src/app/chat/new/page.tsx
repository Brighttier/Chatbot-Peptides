"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MobileGateway } from "@/components/chat/mobile-gateway";
import { Loader2 } from "lucide-react";

interface CustomerData {
  mobileNumber: string;
  instagramHandle?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  consentGiven: boolean;
}

function ChatNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repId = searchParams.get("repId") || "default";

  const handleSubmit = async (data: CustomerData) => {
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
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to initialize chat");
    }

    const responseData = await response.json();
    router.push(`/chat/${responseData.conversationId}`);
  };

  return <MobileGateway repId={repId} onSubmit={handleSubmit} showInstagram />;
}

export default function ChatNewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <ChatNewContent />
    </Suspense>
  );
}
