"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LiveChat } from "@/components/chat/live-chat";
import { getConversation } from "@/lib/firebase";
import type { Conversation } from "@/types";
import { Loader2 } from "lucide-react";

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConversation() {
      try {
        const conv = await getConversation(conversationId);
        if (!conv) {
          setError("Conversation not found");
          return;
        }
        setConversation(conv);
      } catch (err) {
        console.error("Error loading conversation:", err);
        setError("Failed to load conversation");
      } finally {
        setLoading(false);
      }
    }

    loadConversation();
  }, [conversationId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Error</h1>
          <p className="text-muted-foreground">{error || "Conversation not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <LiveChat
      conversationId={conversationId}
      chatMode={conversation.chatMode}
      fallbackMode={conversation.fallbackMode}
    />
  );
}
