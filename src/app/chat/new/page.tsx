"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SimpleGateway } from "@/components/chat/simple-gateway";
import { Loader2 } from "lucide-react";

interface CustomerData {
  name: string;
  instagramHandle: string;
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
        userName: data.name,
        userInstagramHandle: data.instagramHandle,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to initialize chat");
    }

    const responseData = await response.json();
    router.push(`/chat/${responseData.conversationId}`);
  };

  return <SimpleGateway repId={repId} onSubmit={handleSubmit} />;
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
