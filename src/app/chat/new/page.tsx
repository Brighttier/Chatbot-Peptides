"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MobileGateway } from "@/components/chat/mobile-gateway";
import { Loader2 } from "lucide-react";

function ChatNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repId = searchParams.get("repId") || "default";

  const handleSubmit = async (
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
